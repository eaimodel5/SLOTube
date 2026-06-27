import express from "express";
import path from "path";
import fs from "fs/promises";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import { normalizeSloData } from "./src/lib/slo/normalizeSloGoals";
import { runDiscoveryForGoal } from "./src/lib/discovery/discoveryService";
import { runAiAssessment } from "./src/lib/matching/optionalAiMatcher";
import { matchVideoToGoal } from "./src/lib/matching/localGoalMatcher";
import { NormalizedSloGoal } from "./src/lib/slo/sloTypes";
import { generateStableId, canonicalizeUrl } from "./src/lib/media/urlUtils";
import { googleGroundedProvider } from "./src/lib/search/providers/googleGroundedProvider";
import { tavilyProvider } from "./src/lib/search/providers/tavilyProvider";
import { serperProvider } from "./src/lib/search/providers/serperProvider";
import { legacyDuckDuckGoProvider } from "./src/lib/search/providers/legacyDuckDuckGoProvider";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Utility to format ISO 8601 duration
function formatISO8601Duration(duration: string) {
  const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
  if (!match) return "0:00";
  
  const hours = match[1] ? parseInt(match[1], 10) : 0;
  const minutes = match[2] ? parseInt(match[2], 10) : 0;
  const seconds = match[3] ? parseInt(match[3], 10) : 0;
  
  const formattedMinutes = hours > 0 ? String(minutes).padStart(2, '0') : String(minutes);
  const formattedSeconds = String(seconds).padStart(2, '0');
  
  if (hours > 0) {
    return `${hours}:${formattedMinutes}:${formattedSeconds}`;
  }
  return `${formattedMinutes}:${formattedSeconds}`;
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT || 3000);

  app.use(express.json());

  // Load and parse SLO Goals in memory
  let rawSloData: any = {};
  let flattenedGoals: NormalizedSloGoal[] = [];

  try {
    const dataPath = path.join(process.cwd(), 'src', 'data', 'slo-goals.json');
    const rawData = await fs.readFile(dataPath, 'utf-8');
    rawSloData = JSON.parse(rawData);
    flattenedGoals = normalizeSloData(rawSloData);
  } catch (error) {
    console.error("Error loading SLO data:", error);
  }

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Get all goals
  app.get("/api/goals", (req, res) => {
    // Voeg de "Algemene info" tag toe acter aan
    res.json([{
      id: "algemeen",
      subject: "Algemeen",
      domain: "Algemeen Lesmateriaal",
      sentence: "Algemene Educatieve Informatie – Niet specifiek gebonden aan een bepaald kerndoel.",
      description: "Generiek lesmateriaal dat niet goed past binnen 1 specifiek kerndoel maar wel algemeen educatief inzetbaar is."
    }, ...flattenedGoals]);
  });

  // Get raw SLO data for richer domain/subject hierarchy
  app.get("/api/slo-data", (req, res) => {
    // Only send essential parts to avoid payload bloat
    const subjectsSummary = rawSloData.subjects?.map((s: any) => ({
      code: s.meta.subject_code,
      title: s.meta.subject,
      domains: s.domains?.map((d: any) => ({
        title: d.title,
        id: d.fo_domein_ref
      })) || []
    })) || [];
    res.json({ subjects: subjectsSummary });
  });

  // YouTube Search API Integration & URL fallback
  app.post("/api/scrape", async (req, res) => {
    const { url, goal } = req.body;
    if (!url) {
      return res.status(400).json({ error: "No URL provided." });
    }
    try {
      // Need dynamic import for cheerio since it's ESM/CommonJS flexible
      const cheerio = await import('cheerio');
      const response = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } });
      if (!response.ok) {
        return res.status(response.status).json({ error: "Kan de webpagina niet inladen." });
      }
      
      const html = await response.text();
      const $ = cheerio.load(html);
      
      const title = $('meta[property="og:title"]').attr('content') || $('title').text() || "Onbekende Titel";
      const description = $('meta[property="og:description"]').attr('content') || $('meta[name="description"]').attr('content') || "";
      const thumbnailUrl = $('meta[property="og:image"]').attr('content') || "";
      let domain = "";
      try { domain = new URL(url).hostname; } catch(e){}

      const canonicalUrl = canonicalizeUrl(url);

      const sourceId =
        domain.includes("schooltv.nl") ? "schooltv" :
        domain.includes("hetklokhuis.nl") ? "het-klokhuis" :
        domain.includes("wikiwijs.nl") ? "wikiwijs" :
        domain.includes("openleermateriaal.nl") ? "openleermateriaal" :
        domain.includes("npo.nl") ? "npo" :
        domain.includes("wikipedia.org") ? "wikipedia" :
        "web";

      const sourceName =
        sourceId === "schooltv" ? "Schooltv" :
        sourceId === "het-klokhuis" ? "Het Klokhuis" :
        sourceId === "wikiwijs" ? "Wikiwijs" :
        sourceId === "openleermateriaal" ? "Openleermateriaal" :
        sourceId === "npo" ? "NPO" :
        sourceId === "wikipedia" ? "Wikipedia" :
        domain || "Externe Bron";

      const safeId = generateStableId(sourceId, canonicalUrl);

      const finalThumbnailUrl =
        thumbnailUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(domain || "Web")}&background=ffffff&color=000000&size=512`;

      let matchScore = 0;
      let matchReason = "";
      let matchEvidence: string[] = [];

      if (goal) {
          const raw = {
              sourceId,
              sourceName,
              sourceUrl: url,
              canonicalUrl,
              title: title,
              description: description,
              thumbnailUrl: finalThumbnailUrl,
              channelTitle: sourceName,
              duration: "Web/Bron",
              publishedAt: new Date().toISOString()
          };
          const match = matchVideoToGoal(raw, goal);
          matchScore = match.score;
          matchReason = match.reason;
          matchEvidence = match.evidence;
      }

      // create a generic video object format to reuse the UI
      const result = {
        id: safeId,
        videoId: url,
        title: title,
        channelTitle: sourceName,
        description: description,
        duration: "Web/Bron",
        publishedAt: new Date().toISOString(),
        status: "pending",
        origin: "manual",
        provider: "web",
        sourceType: "website",
        sourceId,
        sourceName,
        sourceUrl: url,
        canonicalUrl,
        matchScore: matchScore,
        matchReason: matchReason,
        matchEvidence: matchEvidence,
        thumbnailUrl: finalThumbnailUrl,
        thumbnailStatus: thumbnailUrl ? "opengraph" : "fallback",
        viewCount: "-"
      };
      
      res.json([result]);
    } catch (error) {
      console.error("Scraping error:", error);
      res.status(500).json({ error: "Faalde met pre-scrapen van deze link by server." });
    }
  });

  app.post("/api/youtube/search", async (req, res) => {
    const { goalId, queries, maxResultsPerQuery = 5, sources = { youtube: true, wiki: true, npo: true, wikiwijs: true, general: true }, goal } = req.body;
    const apiKey = process.env.YOUTUBE_API_KEY || process.env.YOUT_API_KEY || process.env.VITE_YOUTUBE_API_KEY;

    if (!queries || !Array.isArray(queries) || queries.length === 0) {
      return res.status(400).json({ error: "Please provide an array of search queries." });
    }

    try {
      const allVideos = new Map(); // Use Map to deduplicate by videoId
      
      for (const query of queries) {
        let videoIds = "";

        // URL parsing: Check if the provided query is a direct YouTube URL
        const youtubeRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
        const match = query.match(youtubeRegex);

        if (match && match[1]) {
           // User pasted a URL. Grab the specific video ID.
           videoIds = match[1];

           if (!apiKey) {
             return res.status(500).json({ error: "De YOUTUBE_API_KEY is niet ingesteld. Voeg de sleutel toe via Secrets." });
           }

         } else {
           // User typed a keyword.
           if (!apiKey) {
             return res.status(500).json({ error: "De YOUTUBE_API_KEY is niet ingesteld. Je moet de YouTube API sleutel toevoegen via het sleutel-icoontje (Secrets) in de instellingen van AI Studio voordat je kunt zoeken." });
           }

           // Youtube Search
           let searchData: any = { items: [] };
           if (sources.youtube) {
             const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&safeSearch=moderate&videoEmbeddable=true&maxResults=${maxResultsPerQuery}&q=${encodeURIComponent(query)}&key=${apiKey}`;
             
             console.log(`[YouTube API] Fetching search for query: ${query}`);
             const searchResponse = await fetch(searchUrl);
             
             if (!searchResponse.ok) {
               const errorData = await searchResponse.text();
               console.error(`[YouTube API Error] Status: ${searchResponse.status}, Error:`, errorData);
               return res.status(searchResponse.status).json({ error: `YouTube API Fout: ${searchResponse.statusText}. Controleer of je API sleutel geldig is.` });
             }
             
             searchData = await searchResponse.json();
           }
           
           // Fetch Wikipedia articles for same query
           if (sources.wiki) {
             try {
               const wikiRes = await fetch(`https://nl.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&utf8=&format=json&srlimit=2`);
               if (wikiRes.ok) {
                 const wikiData = await wikiRes.json();
                 if (wikiData.query && wikiData.query.search) {
                   for (const item of wikiData.query.search) {
                     const wikiId = `wiki_${item.pageid}`;
                     if (!allVideos.has(wikiId)) {
                       const cleanDesc = (item.snippet || "").replace(/<[^>]*>?/gm, '');
                       allVideos.set(wikiId, {
                          id: wikiId,
                          videoId: `https://nl.wikipedia.org/wiki/${encodeURIComponent(item.title.replace(/ /g, '_'))}`,
                          title: item.title,
                          channelTitle: "Wikipedia NL",
                          description: cleanDesc + "...",
                          duration: "Web/Bron",
                          publishedAt: item.timestamp,
                          status: "pending",
                           origin: "web_search",
                           matchScore: 0,
                          thumbnailUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/80/Wikipedia-logo-v2.svg/512px-Wikipedia-logo-v2.svg.png",
                          viewCount: "-",
                          sourceType: "website"
                       });
                     }
                   }
                 }
               }
             } catch(err) {
               console.error("Wikipedia search failed:", err);
             }
           }
           
           // Fetch web results via DDG (for NPO, Wikiwijs, Open Leermateriaal, General)
           if (sources.npo || sources.wikiwijs || sources.general) {
             try {
               const terms = [];
               if (sources.npo) terms.push("npo");
               if (sources.wikiwijs) terms.push("wikiwijs");
               
               let webQuery = query;
               if (terms.length > 0 && !sources.general) {
                 webQuery = `${query} (${terms.join(" OR ")})`;
               } else if (terms.length > 0 && sources.general) {
                 // If both specific sources and general are selected, we might want to just search broadly, 
                 // but add priority to the query, or do multiple queries. 
                 // Since DDG limits requests, we will just use the broad query if general is checked, 
                 // and append the terms as optional if possible. DuckDuckGo handles regular queries well.
                 webQuery = `${query}`;
               }

               const ddgRes = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(webQuery)}`, {
                  headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
               });
               
               if (ddgRes.ok) {
                 const html = await ddgRes.text();
                 const cheerio = await import('cheerio');
                 const $ = cheerio.load(html);
                 
                 $('.result').slice(0, 5).each((i, el) => {
                    const title = $(el).find('.result__title').text().trim();
                    const snippet = $(el).find('.result__snippet').text().trim();
                    let url = $(el).find('.result__url').attr('href');
                    
                    if (title && url && !url.includes('google.com/url')) {
                      if (url.startsWith('//')) url = 'https:' + url;
                      
                      const origin = url.includes('npo') ? 'NPO' : url.includes('wikiwijs') ? 'Wikiwijs' : 'Web';
                      
                      // Filter if general is false, we only want URLs from selected sources
                      let isValidSource = sources.general;
                      if (!isValidSource) {
                         if (sources.npo && url.includes('npo')) isValidSource = true;
                         if (sources.wikiwijs && url.includes('wikiwijs')) isValidSource = true;
                      }

                      if (isValidSource) {
                        const webId = `web_${Date.now()}_${i}`;
                        if (!allVideos.has(webId)) {
                            allVideos.set(webId, {
                                id: webId,
                                videoId: url,
                                title: title,
                                description: snippet,
                                matchScore: 0,
                                thumbnailUrl: `https://s0.wordpress.com/mshots/v1/${encodeURIComponent(url)}?w=1280`,
                                channelTitle: `${origin} Bron`,
                                publishedAt: new Date().toISOString(),
                                status: "pending",
                                origin: "web_search",
                                viewCount: "-",
                                sourceType: "website"
                            });
                        }
                      }
                    }
                 });
               }
             } catch(e) {
               console.error("DDG search failed:", e);
             }
           }
           
           if (!searchData.items || searchData.items.length === 0) continue;

           videoIds = searchData.items
             .map((item: any) => item.id.videoId)
             .filter(Boolean)
             .join(',');
        }

        if (!videoIds || !apiKey) continue;
        
        // Fetch full details
        const detailsUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,statistics&id=${videoIds}&key=${apiKey}`;
        const detailsResponse = await fetch(detailsUrl);
        
        if (!detailsResponse.ok) {
           const errorData = await detailsResponse.text();
           console.error(`[YouTube API Details Error] Status: ${detailsResponse.status}, Error:`, errorData);
           return res.status(detailsResponse.status).json({ error: `YouTube API Details Fout: ${detailsResponse.statusText}.` });
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
                  duration: formatISO8601Duration(item.contentDetails.duration),
                  publishedAt: item.snippet.publishedAt,
                  status: "pending",
                   origin: "youtube_search",
                   matchScore: 0, // Will be overridden if goal is provided
                  thumbnailUrl: item.snippet.thumbnails?.maxres?.url || item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url,
                  viewCount: item.statistics.viewCount,
                  sourceType: "youtube"
               });
             }
           }
        }
      }

      let results = Array.from(allVideos.values());

      results = results.map(video => {
         const sourceUrl = video.videoId.startsWith('http') ? video.videoId : `https://youtube.com/watch?v=${video.videoId}`;
         return {
            ...video,
            sourceUrl,
            canonicalUrl: sourceUrl
         };
      });
      
      if (goal) {
          results = results.map(video => {
              const raw = {
                  sourceId: video.sourceType === "website" ? "web" : "youtube",
                  sourceName: video.channelTitle,
                  sourceUrl: video.videoId.startsWith('http') ? video.videoId : `https://youtube.com/watch?v=${video.videoId}`,
                  title: video.title,
                  description: video.description || "",
                  thumbnailUrl: video.thumbnailUrl,
                  channelTitle: video.channelTitle,
                  duration: video.duration,
                  publishedAt: video.publishedAt
              };
              const match = matchVideoToGoal(raw, goal);
              return { ...video, sourceUrl: raw.sourceUrl, canonicalUrl: raw.sourceUrl, matchScore: match.score, matchReason: match.reason, matchEvidence: match.evidence };
          });
      }
      
      results.sort((a, b) => b.matchScore - a.matchScore);
      res.json(results);

    } catch (error) {
      console.error("Error executing YouTube search:", error);
      res.status(500).json({ error: "Failed to execute YouTube search" });
    }
  });

  // Legacy fallback endpoint
  app.get("/api/goals/:goalId/videos", (req, res) => {
    res.json([]);
  });

  // Search API
  app.post("/api/search", async (req, res) => {
    try {
      const params = req.body;
      const providerName = process.env.SEARCH_PROVIDER || "google";
      let results = [];
      
      try {
        if (providerName === "tavily") {
          results = await tavilyProvider.search(params);
        } else if (providerName === "serper") {
          results = await serperProvider.search(params);
        } else if (providerName === "google") {
          results = await googleGroundedProvider.search(params);
        } else {
          results = await legacyDuckDuckGoProvider.search(params);
        }
      } catch (providerError) {
        console.error(`Error in search provider ${providerName}, falling back to duckduckgo:`, providerError);
        results = await legacyDuckDuckGoProvider.search(params);
      }
      
      res.json({ results });
    } catch (error) {
      console.error("Error executing search API:", error);
      res.status(500).json({ error: "Failed to execute search API" });
    }
  });

  // AI Assessment API
  app.post("/api/ai/assess", async (req, res) => {
    try {
      const { video, goal } = req.body;
      const geminiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
      if (!geminiKey) {
        return res.status(500).json({ error: "GEMINI_API_KEY missing" });
      }

      const assessment = await runAiAssessment(video, goal);
      if (!assessment) {
        return res.status(500).json({ error: "De AI kon de video niet beoordelen." });
      }
      
      res.json({
        score: assessment.score,
        feedback: assessment.reasonShort,
        fullAssessment: assessment
      });
    } catch (error) {
      console.error("AI assessment failed:", error);
      res.status(500).json({ error: "De AI kon de video niet beoordelen." });
    }
  });

  // Discovery Endpoint
  app.post("/api/discovery/goal", async (req, res) => {
    const { goal, options = {} } = req.body;
    if (!goal || !goal.id) {
      return res.status(400).json({ error: "Geen kerndoel meegestuurd." });
    }

    try {
      const result = await runDiscoveryForGoal(goal, options);
      res.json(result);
    } catch (error) {
      console.error("Discovery error:", error);
      res.status(500).json({ error: "Fout tijdens zoeken naar nieuwe video's." });
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
    // Determine the absolute path to the 'dist' folder reliably
    const distPath = path.join(process.cwd(), "dist");
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
