import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, BadgeInfo, ShieldCheck, Video as VideoIcon } from 'lucide-react';
import { db } from '../../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';

interface VideoData {
  videoId: string;
  title: string;
  channelTitle: string;
  description: string;
  status: string;
  assessedGoals?: {goalId: string, matchScore: number, aiFeedback?: string}[];
}

export default function VideoDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [video, setVideo] = useState<VideoData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const fetchVideo = async () => {
      try {
        const d = await getDoc(doc(db, "videos", id));
        if (d.exists()) {
          setVideo(d.data() as VideoData);
        }
      } catch (e) {
        console.error("Error fetching video detail", e);
      } finally {
        setLoading(false);
      }
    }
    fetchVideo();
  }, [id]);

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
          {/* YouTube Player */}
          <div className="aspect-video bg-zinc-900 rounded-xl flex items-center justify-center text-zinc-500 relative overflow-hidden">
            {id && id.length > 5 ? (
              <iframe 
                width="100%" 
                height="100%" 
                src={`https://www.youtube.com/embed/${id}`} 
                title="YouTube video player" 
                frameBorder="0" 
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                allowFullScreen>
              </iframe>
            ) : (
              <div className="flex flex-col items-center justify-center space-y-2">
                 <BadgeInfo className="w-6 h-6 text-zinc-400" />
                 <span className="text-zinc-400">Ongeldig Video ID</span>
              </div>
            )}
          </div>

          <div>
             <h1 className="text-xl font-semibold text-zinc-900 leading-tight">
              {video ? video.title : "Video laden..."}
            </h1>
            {video && (
              <div className="mt-2 text-sm text-zinc-500 font-medium">Kanaal: {video.channelTitle}</div>
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
              <h2 className="text-sm font-mono uppercase tracking-widest text-zinc-500">Onderwijskwalificaties</h2>
              {video?.status === 'approved' && <ShieldCheck className="w-4 h-4 text-emerald-500 ml-auto" />}
            </div>
            
            <div className="space-y-4">
              {loading ? (
                <div className="text-sm text-zinc-500">Beoordeling laden...</div>
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
                        "{assessment.aiFeedback || "Goedgekeurd door administrator."}"
                      </p>
                   </div>
                ))
              ) : (
                <div className="text-sm text-zinc-500">
                  <p>Er zijn nog geen SLO-kerndoelen gekoppeld of beoordeeld voor deze video.</p>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
