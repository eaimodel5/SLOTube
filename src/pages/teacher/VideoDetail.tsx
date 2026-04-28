import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, BadgeInfo, ShieldCheck, Video as VideoIcon, Database, Loader2, Clock } from 'lucide-react';
import { db } from '../../lib/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { FALLBACK_THUMBNAIL } from '../../lib/media/thumbnailResolver';

interface VideoData {
  id: string;
  videoId: string;
  title: string;
  channelTitle: string;
  description: string;
  status: string;
  duration?: string;
  publishedAt?: string;
  thumbnailUrl?: string;
  matchScore?: number;
  sourceType?: string;
  provider?: string;
  sourceUrl?: string;
  sourceName?: string;
  assessedGoals?: {goalId: string, matchScore: number, aiFeedback?: string}[];
}

export default function VideoDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [video, setVideo] = useState<VideoData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isProposing, setIsProposing] = useState(false);
  const [proposed, setProposed] = useState(false);

  useEffect(() => {
    if (!id) return;
    const fetchVideo = async () => {
      try {
        const d = await getDoc(doc(db, "videos", id));
        if (d.exists()) {
          const vData = d.data() as VideoData;
          setVideo(vData);
          if (vData.status === 'pending') setProposed(true);
        } else {
          // Check session storage for live results
          const liveDataStr = sessionStorage.getItem('live_search_results');
          if (liveDataStr) {
            const liveData = JSON.parse(liveDataStr);
            const found = liveData.find((v: any) => v.id === id || v.videoId === id);
            if (found) {
              setVideo({
                ...found,
                status: 'live_preview' // indicating it's not yet officially approved
              });
            }
          }
        }
      } catch (e) {
        console.error("Error fetching video detail", e);
      } finally {
        setLoading(false);
      }
    }
    fetchVideo();
  }, [id]);

  const handlePropose = async () => {
    if (!video || !id) return;
    setIsProposing(true);
    try {
      await import('../../lib/firebase/videoRepository').then(({ proposeVideo }) => {
        return proposeVideo({
          id: video.id || id,
          videoId: video.videoId || id,
          title: video.title,
          channelTitle: video.channelTitle || video.sourceName || "Onbekend",
          description: video.description || "",
          duration: video.duration || "",
          publishedAt: video.publishedAt || new Date().toISOString(),
          thumbnailUrl: video.thumbnailUrl || "",
          matchScore: video.matchScore || 0,
          provider: video.provider || video.sourceType || "youtube",
          sourceUrl: video.sourceUrl || `https://www.youtube.com/watch?v=${video.videoId || id}`,
          sourceName: video.sourceName || video.channelTitle || ""
        } as any);
      });
      
      setProposed(true);
    } catch (e) {
      console.error(e);
      alert("Fout bij voorstellen aan beheerder.");
    } finally {
      setIsProposing(false);
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8 pb-24">
      {/* Back nav */}
      <button 
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-sm font-medium text-zinc-500 hover:text-zinc-900 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Terug
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Main Column - Video & Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Player/Preview */}
          <div className="aspect-video bg-zinc-900 rounded-xl flex items-center justify-center text-zinc-500 relative overflow-hidden">
            {video?.provider === 'web' || video?.sourceType === 'website' || video?.duration === 'Web/Bron' ? (
              <div className="absolute inset-0 bg-zinc-100 flex flex-col items-center justify-center p-8 text-center text-zinc-900">
                <img 
                  src={video.thumbnailUrl || FALLBACK_THUMBNAIL} 
                  onError={(e) => { e.currentTarget.src = FALLBACK_THUMBNAIL; }}
                  className="absolute inset-0 w-full h-full object-cover opacity-20" 
                  alt=""
                />
                <h3 className="font-semibold text-lg z-10 mb-2">Dit is een externe webpagina</h3>
                <p className="text-zinc-600 text-sm z-10 mb-6 max-w-sm">Klik op de onderstaande knop om direct naar het bijbehorende artikel of platform ({video.sourceName}) te gaan.</p>
                <a href={video.sourceUrl || video.videoId} target="_blank" rel="noopener noreferrer" className="z-10 px-6 py-3 bg-zinc-900 text-white rounded-lg font-medium hover:bg-zinc-800 transition-colors shadow-sm">
                  Open Lesmateriaal
                </a>
              </div>
            ) : id && id.length > 5 ? (
              <>
                <iframe 
                  width="100%" 
                  height="100%" 
                  src={`https://www.youtube.com/embed/${id?.includes('youtube.com') || id?.includes('youtu.be') ? (id.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i)?.[1] || id) : (video?.videoId || id)}?origin=${window.location.origin}`} 
                  title="YouTube video player" 
                  frameBorder="0" 
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                  allowFullScreen>
                </iframe>
                <div className="absolute bottom-4 right-4 z-10">
                  <a href={video?.sourceUrl || `https://www.youtube.com/watch?v=${video?.videoId || id}`} target="_blank" rel="noopener noreferrer" className="px-4 py-2 bg-black/80 hover:bg-black text-white text-xs rounded shadow-lg backdrop-blur flex items-center gap-2">
                    Open Bron
                  </a>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center space-y-2">
                 <BadgeInfo className="w-6 h-6 text-zinc-400" />
                 <span className="text-zinc-400">Ongeldig ID</span>
              </div>
            )}
          </div>

          <div>
             <h1 className="text-xl font-semibold text-zinc-900 leading-tight">
              {video ? video.title : "Video laden..."}
            </h1>
            {video && (
              <div className="mt-2 text-sm text-zinc-500 font-medium">Kanaal / Bron: {video.channelTitle || video.sourceName}</div>
            )}
            
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-zinc-900 mb-2">Videobeschrijving</h3>
              <p className="text-zinc-600 leading-relaxed text-sm whitespace-pre-wrap">
                {loading ? "Laden..." : (video?.description || "Geen beschrijving beschikbaar.")}
              </p>
            </div>
          </div>
        </div>

        {/* Sidebar Column - Pedagogical info */}
        <div className="space-y-6">
          <div className="bg-white border border-zinc-200 rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-sm font-mono uppercase tracking-widest text-zinc-500">Beoordeling</h2>
              {video?.status === 'approved' && <ShieldCheck className="w-4 h-4 text-emerald-500 ml-auto" />}
            </div>
            
            <div className="space-y-4">
              {loading ? (
                <div className="text-sm text-zinc-500">Beoordeling laden...</div>
              ) : video?.status === 'live_preview' ? (
                <div className="flex flex-col gap-4">
                  <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 p-4 rounded-lg">
                    <p className="font-semibold mb-1">Online gevonden bron</p>
                    <p>Deze bron is gevonden via de geselecteerde platformen en is nog niet beoordeeld door een reviewer of beheerder.</p>
                  </div>
                  
                  <button 
                    onClick={handlePropose}
                    disabled={isProposing || proposed}
                    className="w-full flex justify-center items-center gap-2 px-4 py-3 bg-zinc-900 text-white rounded-lg text-sm font-medium hover:bg-zinc-800 disabled:opacity-50 transition-colors shadow-sm"
                  >
                    {isProposing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
                    {proposed ? 'Ter beoordeling ingestuurd' : 'Ter beoordeling insturen'}
                  </button>
                  
                  {proposed && (
                    <p className="text-xs text-emerald-600 font-medium text-center">
                       Succes! De bron staat in de wachtrij.
                    </p>
                  )}
                </div>
              ) : video?.status === 'pending' ? (
                <div className="text-sm text-blue-700 bg-blue-50 border border-blue-200 p-4 rounded-lg">
                  <p className="flex items-center gap-2 font-semibold mb-1">
                    <Clock className="w-4 h-4" /> Wacht op beoordeling
                  </p>
                  <p>Deze bron is voorgesteld en wacht nog op goedkeuring van een beheerder.</p>
                </div>
              ) : video?.status === 'rejected' ? (
                <div className="text-sm text-red-700 bg-red-50 border border-red-200 p-4 rounded-lg">
                  <p className="flex items-center gap-2 font-semibold mb-1">
                    Afgekeurd
                  </p>
                  <p>Deze bron is afgekeurd en zal niet worden getoond.</p>
                </div>
              ) : video?.assessedGoals && video.assessedGoals.length > 0 ? (
                video.assessedGoals.map((assessment, i) => (
                   <div key={i} className="p-4 bg-zinc-50 border border-zinc-200 rounded-lg">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-bold text-zinc-900 bg-white px-2 py-0.5 rounded border border-zinc-200">
                          Doel {assessment.goalId}
                        </span>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded ${assessment.matchScore > 70 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                          {assessment.matchScore}% Match
                        </span>
                      </div>
                      <p className="text-xs text-zinc-600 mt-2 leading-relaxed italic border-l-2 border-zinc-300 pl-2">
                        "{assessment.aiFeedback || "Goedgekeurd door beheerder."}"
                      </p>
                   </div>
                ))
              ) : (
                <div className="text-sm text-zinc-500">
                  <p>Er zijn nog geen SLO-kerndoelen gekoppeld of beoordeeld voor dit materiaal.</p>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
