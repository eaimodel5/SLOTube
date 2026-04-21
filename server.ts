import express from "express";
import path from "path";
import fs from "fs/promises";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Load and parse SLO Goals in memory
  let sloData: any = {};
  let flattenedGoals: any[] = [];

  try {
    const dataPath = path.join(__dirname, 'src', 'data', 'slo-goals.json');
    const rawData = await fs.readFile(dataPath, 'utf-8');
    sloData = JSON.parse(rawData);
    
    // Flatten the complex nested structure for easier front-end consumption
    if (sloData.subjects) {
      sloData.subjects.forEach((subject: any) => {
        if (subject.domains) {
          subject.domains.forEach((domain: any) => {
            if (domain.kerns) {
              domain.kerns.forEach((kern: any) => {
                if (kern.goals) {
                  kern.goals.forEach((goal: any) => {
                    flattenedGoals.push({
                      id: goal.item_code,
                      subject: subject.meta.subject,
                      domain: domain.title,
                      sentence: goal.sentence || goal.title || goal.item_code,
                      description: goal.description,
                      subjectCode: subject.meta.subject_code,
                    });
                  });
                }
              });
            }
          });
        }
      });
      
      // Sorteer op doelnummer (item_code zoals '21-A' -> 21)
      flattenedGoals.sort((a, b) => {
        const numA = parseInt(a.id.split('-')[0]) || 0;
        const numB = parseInt(b.id.split('-')[0]) || 0;
        if (numA !== numB) return numA - numB;
        return a.id.localeCompare(b.id); // '21-A' vs '21-B'
      });
    }
  } catch (error) {
    console.error("Error loading SLO data:", error);
  }

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Get all goals
  app.get("/api/goals", (req, res) => {
    res.json(flattenedGoals);
  });

  // YouTube Search API Integration
  app.post("/api/youtube/search", async (req, res) => {
    const { goalId, queries, maxResultsPerQuery = 5 } = req.body;

    if (!process.env.YOUTUBE_API_KEY) {
      return res.status(500).json({ error: "YOUTUBE_API_KEY is not configured." });
    }

    if (!queries || !Array.isArray(queries) || queries.length === 0) {
      return res.status(400).json({ error: "Please provide an array of search queries." });
    }

    try {
      const apiKey = process.env.YOUTUBE_API_KEY;
      const allVideos = new Map(); // Use Map to deduplicate by videoId
      
      // Execute searches sequentially to respect quotas, or use Promise.all if safe
      for (const query of queries) {
        let videoIds = "";

        // URL parsing: Check if the provided query is a direct YouTube URL
        const youtubeRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
        const match = query.match(youtubeRegex);

        if (match && match[1]) {
           // 1a. User pasted a URL. Skip the expensive 'Search API' and directly grab this specific video ID.
           videoIds = match[1];
        } else {
           // 1b. User typed a keyword. Use the 'Search API' to find related video IDs.
           const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&relevanceLanguage=nl&safeSearch=moderate&videoEmbeddable=true&maxResults=${maxResultsPerQuery}&q=${encodeURIComponent(query)}&key=${apiKey}`;
           
           const searchResponse = await fetch(searchUrl);
           if (!searchResponse.ok) {
              console.error("YouTube API Search Error:", await searchResponse.text());
              continue; // Skip this query on error, try the next
           }
           
           const searchData = await searchResponse.json();
           
           if (!searchData.items || searchData.items.length === 0) continue;

           videoIds = searchData.items.map((item: any) => item.id.videoId).join(',');
        }

        if (!videoIds) continue;
        
        // 2. Fetch full details for the discovered (or pasted) video IDs
        const detailsUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,statistics&id=${videoIds}&key=${apiKey}`;
        const detailsResponse = await fetch(detailsUrl);
        
        if (!detailsResponse.ok) {
          console.error("YouTube API Details Error:", await detailsResponse.text());
          continue;
        }

        const detailsData = await detailsResponse.json();
        
        if (detailsData.items) {
           for (const item of detailsData.items) {
             if (!allVideos.has(item.id)) {
               allVideos.set(item.id, {
                  id: item.id,
                  videoId: item.id,
                  title: item.snippet.title,
                  channelTitle: item.snippet.channelTitle,
                  description: item.snippet.description,
                  duration: item.contentDetails.duration, // Will need ISO 8601 parsing later
                  publishedAt: item.snippet.publishedAt,
                  status: "pending",
                  matchScore: Math.floor(Math.random() * (95 - 40 + 1) + 40), // Mock algorithm score for now
                  thumbnailUrl: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url,
                  viewCount: item.statistics.viewCount
               });
             }
           }
        }
      }

      res.json(Array.from(allVideos.values()));

    } catch (error) {
      console.error("Error executing YouTube search:", error);
      res.status(500).json({ error: "Failed to execute YouTube search" });
    }
  });

  // Mock API: Get videos for a goal (Falls back to mock data if not searched)
  app.get("/api/goals/:goalId/videos", (req, res) => {
    res.json([]);
  });

  // AI Assessment API
  app.post("/api/ai/assess", async (req, res) => {
    try {
      const { video, goal } = req.body;
      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({ error: "GEMINI_API_KEY missing" });
      }

      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const prompt = `Je bent een onderwijsexpert in Nederland. Beoordeel hoe goed deze YouTube-video aansluit bij het gespecificeerde SLO kerndoel.
      
      Video Titel: ${video.title}
      Video Beschrijving: ${video.description || "Geen beschrijving."}
      Kanaal: ${video.channelTitle}
      
      SLO Kerndoel:
      Zin: ${goal.sentence}
      Extra Omschrijving/Kader: ${goal.description}
      
      Beoordeel deze video en wees daarbij redelijk streng; voegt de video echt iets educatiefs toe aan dit doel?
      Geef je beoordeling als een JSON object (en niets anders dan JSON) met EXACT deze structuur:
      {
        "score": (geheel getal tussen 0 en 100 representing match percentage),
        "feedback": (een doeltreffende, professionele, didactische onderbouwing van max 3-4 zinnen)
      }`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json"
        }
      });

      const aiText = response.text || "{}";
      const result = JSON.parse(aiText);
      res.json(result);
    } catch (error) {
      console.error("AI assessment failed:", error);
      res.status(500).json({ error: "De AI kon de video niet beoordelen." });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
