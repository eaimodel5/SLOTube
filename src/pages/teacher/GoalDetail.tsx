import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PlayCircle, ShieldCheck, Clock, ShieldX, Youtube } from 'lucide-react';
import { db } from '../../lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

interface Goal {
  id: string;
  title: string;
  domain: string;
  sentence: string;
  description: string;
}

interface Video {
  id: string;
  videoId: string;
  title: string;
  channelTitle: string;
  duration: string;
  publishedAt: string;
  status: string;
  assessedGoals?: {goalId: string, matchScore: number}[];
  thumbnailUrl: string;
}

export default function GoalDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [goal, setGoal] = useState<Goal | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Fetch specific goal
    fetch('/api/goals')
      .then(res => res.json())
      .then((data: Goal[]) => setGoal(data.find(g => g.id === id) || null));
      
    // 2. Fetch approved videos that match this goal (we do a generic approved fetch and filter locally since assessedGoals is an array of objects)
    const fetchVideos = async () => {
      try {
        const q = query(
          collection(db, "videos"),
          where("status", "==", "approved")
        );
        const snap = await getDocs(q);
        const matchedVideos: Video[] = [];
        
        snap.forEach(doc => {
          const data = doc.data() as Video;
          if (data.assessedGoals && data.assessedGoals.some(g => g.goalId === id)) {
            matchedVideos.push(data);
          }
        });
        
        setVideos(matchedVideos);
      } catch(e) {
        console.error("Error fetching firebase videos for goal", e);
      } finally {
        setLoading(false);
      }
    };
    fetchVideos();
  }, [id]);

  if (!goal) return <div className="p-8 text-center text-zinc-500">Laden...</div>;

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      {/* Goal Header */}
      <div className="bg-white border border-zinc-200 rounded-xl p-8 shadow-sm">
        <div className="text-xs font-mono uppercase tracking-widest text-zinc-500 mb-4">
          Kerndoel {goal.id} • {goal.domain}
        </div>
        <h1 className="text-2xl font-semibold text-zinc-900 leading-tight">
          {goal.sentence}
        </h1>
        <p className="mt-4 text-zinc-600 leading-relaxed">
          {goal.description}
        </p>
      </div>

      {/* Videos Section */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-zinc-900">Videomateriaal</h2>
            <p className="text-sm text-zinc-500 mt-1">Gedownload via YouTube, beoordeeld op relevantie.</p>
          </div>
          <div className="text-sm font-mono text-zinc-400">
            {videos.length} RESULTATEN
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {videos.map((video) => (
            <div 
              key={video.id} 
              onClick={() => navigate(`/teacher/videos/${video.id}`)}
              className="flex gap-6 p-4 bg-white border border-zinc-200 rounded-xl hover:shadow-md cursor-pointer transition-all group"
            >
              {/* Thumbnail */}
              <div className="relative w-64 aspect-video rounded-lg overflow-hidden bg-zinc-100 shrink-0">
                <img src={video.thumbnailUrl} alt={video.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                <div className="absolute bottom-2 right-2 bg-zinc-900/80 backdrop-blur-sm px-1.5 py-0.5 rounded text-[10px] font-mono text-white">
                  {video.duration}
                </div>
              </div>

              {/* Data */}
              <div className="flex flex-col flex-1 py-1">
                <h3 className="text-lg font-semibold text-zinc-900 line-clamp-2 leading-tight">{video.title}</h3>
                
                <div className="mt-2 flex items-center gap-2 text-sm text-zinc-500">
                  <Youtube className="w-4 h-4 text-zinc-400" />
                  <span>{video.channelTitle}</span>
                  <span>•</span>
                  <span>{new Date(video.publishedAt).getFullYear()}</span>
                </div>

                <div className="mt-auto flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {video.status === 'approved' ? (
                       <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium border border-emerald-200">
                         <ShieldCheck className="w-3.5 h-3.5" />
                         Goedgekeurd door docent
                       </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-medium border border-amber-200">
                         <Clock className="w-3.5 h-3.5" />
                         Nog niet beoordeeld
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-zinc-500">MATCH:</span>
                    <span className={`text-sm font-semibold ${(video.assessedGoals?.find(g => g.goalId === id)?.matchScore || 0) > 80 ? 'text-emerald-600' : 'text-zinc-700'}`}>
                      {video.assessedGoals?.find(g => g.goalId === id)?.matchScore || 0}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
          {videos.length === 0 && (
            <div className="p-8 text-center bg-zinc-50 border border-zinc-200 rounded-xl rounded-dashed text-zinc-500">
              Er zijn nog geen video's gevonden voor dit kerndoel.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
