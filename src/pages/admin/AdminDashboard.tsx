import { useState, useEffect } from 'react';
import { BarChart, Video, ShieldCheck, Search, Database, Loader2, Save } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { db } from '../../lib/firebase';
import { collection, doc, setDoc, getDocs, query, where, serverTimestamp } from 'firebase/firestore';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [isCrawling, setIsCrawling] = useState(false);
  const [crawlQuery, setCrawlQuery] = useState("");
  const [crawlResults, setCrawlResults] = useState<any[]>([]);
  const [savedCount, setSavedCount] = useState(0);

  // Real stats can be calculated by fetching counts, for now we show '-' to avoid false data
  const STATS = [
    { label: 'Geïndexeerde Video\'s', value: '-', icon: Video, color: 'text-blue-500', bg: 'bg-blue-50' },
    { label: 'In Review Queue', value: '-', icon: ShieldCheck, color: 'text-amber-500', bg: 'bg-amber-50' },
    { label: 'Kerndoelen Gekoppeld', value: '-', icon: Database, color: 'text-emerald-500', bg: 'bg-emerald-50' },
    { label: 'API Quota (Vandaag)', value: 'N/A', icon: Search, color: 'text-purple-500', bg: 'bg-purple-50' },
  ];

  const handleCrawl = async () => {
    if (!crawlQuery) return;
    setIsCrawling(true);
    setCrawlResults([]);
    try {
      const resp = await fetch('/api/youtube/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          queries: [crawlQuery],
          maxResultsPerQuery: 5
        })
      });
      if (resp.ok) {
        const data = await resp.json();
        setCrawlResults(data);
      } else {
        alert("Fout bij het ophalen van YouTube data. Controleer de API key.");
      }
    } catch (e) {
      console.error(e);
      alert("Error: " + e);
    }
    setIsCrawling(false);
  };

  const saveToDatabase = async (video: any) => {
    try {
      const docRef = doc(db, "videos", video.videoId);
      await setDoc(docRef, {
        videoId: video.videoId,
        title: video.title,
        channelTitle: video.channelTitle,
        description: video.description || "",
        duration: video.duration || "",
        publishedAt: video.publishedAt || new Date().toISOString(),
        thumbnailUrl: video.thumbnailUrl || "",
        status: "pending",
        addedAt: serverTimestamp(),
        addedBy: "admin", 
        matchScore: video.matchScore || 0,
      }, { merge: true });
      
      setSavedCount(c => c + 1);
      
      // Remove from visual list
      setCrawlResults(prev => prev.filter(v => v.videoId !== video.videoId));
    } catch (e) {
      console.error(e);
      alert("Fout bij opslaan in Firebase: " + e);
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">Beheerdashboard</h1>
        <p className="text-zinc-500 mt-1">Overzicht en integraties van SLOTube.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {STATS.map(stat => (
          <div key={stat.label} className="bg-white p-6 border border-zinc-200 rounded-2xl shadow-sm">
            <div className={`w-10 h-10 ${stat.bg} ${stat.color} rounded-lg flex items-center justify-center mb-4`}>
              <stat.icon className="w-5 h-5" />
            </div>
            <div className="text-3xl font-light text-zinc-900">{stat.value}</div>
            <div className="text-sm font-medium text-zinc-500 mt-1">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Scraper / Crawl Tool */}
        <div className="bg-white border border-zinc-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
          <div className="p-6 border-b border-zinc-200">
            <h2 className="font-semibold text-zinc-900">YouTube URL Scraper & Zoekmachine</h2>
            <p className="text-sm text-zinc-500 mt-1">
              Plak een directe YouTube Video URL om deze 'pre-api' op te halen (kostenbesparend), óf gebruik een zoekterm om de YouTube Data API resultaten te laten zoeken.
            </p>
          </div>
          <div className="p-6 space-y-4 bg-zinc-50 flex-1">
            <div className="flex gap-2">
              <input 
                type="text" 
                placeholder="Plak een YouTube URL of typ 'Basisprincipes wiskunde'" 
                value={crawlQuery}
                onChange={e => setCrawlQuery(e.target.value)}
                className="flex-1 px-4 py-2 border border-zinc-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
              />
              <button 
                onClick={handleCrawl}
                disabled={isCrawling || !crawlQuery}
                className="px-4 py-2 bg-zinc-900 text-white rounded-lg text-sm font-medium hover:bg-zinc-800 disabled:opacity-50 flex items-center gap-2"
              >
                {isCrawling && <Loader2 className="w-4 h-4 animate-spin" />}
                Zoek YouTube API
              </button>
            </div>

            {savedCount > 0 && (
              <div className="p-3 bg-emerald-50 text-emerald-700 text-sm rounded-lg border border-emerald-100 flex items-center gap-2">
                <Save className="w-4 h-4" />
                {savedCount} video('s) succesvol opgeslagen in de eigen database.
              </div>
            )}

            <div className="space-y-3 mt-4">
              {crawlResults.map(video => (
                <div key={video.videoId} className="bg-white p-4 rounded-lg border border-zinc-200 shadow-sm flex gap-4 items-start">
                  <img src={video.thumbnailUrl} alt="thumbnail" className="w-24 h-auto rounded object-cover" />
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-zinc-900 truncate">{video.title}</h3>
                    <p className="text-xs text-zinc-500 mt-1 truncate">{video.channelTitle}</p>
                    <button 
                      onClick={() => saveToDatabase(video)}
                      className="mt-3 text-xs font-medium text-blue-600 hover:text-blue-700 underline flex items-center gap-1"
                    >
                      <Database className="w-3 h-3" /> Opslaan in Database
                    </button>
                  </div>
                </div>
              ))}
            </div>

          </div>
        </div>

        {/* Review Queue Overview */}
        <div className="bg-white border border-zinc-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
          <div className="p-6 border-b border-zinc-200 flex justify-between items-center">
            <div>
              <h2 className="font-semibold text-zinc-900">Naar Review Queue</h2>
              <p className="text-sm text-zinc-500 mt-1">Bekijk video's die de status 'pending' hebben.</p>
            </div>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center p-8 bg-zinc-50">
             <p className="text-sm text-zinc-500 mb-4">Er staan video's klaar om gekeurd te worden.</p>
             <button 
                onClick={() => navigate('/admin/review')}
                className="px-4 py-2 bg-white border border-zinc-200 rounded-lg text-sm font-medium hover:bg-zinc-50 shadow-sm"
             >
               Ga naar Review Queue
             </button>
          </div>
        </div>
      </div>

      <div className="pt-8 border-t border-zinc-200">
        <p className="text-[10px] font-mono text-zinc-400 text-center uppercase tracking-widest">
          Gehoste Oplossing & Concept door H. Visser EAI Analyse & Advies
        </p>
      </div>
    </div>
  );
}
