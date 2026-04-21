import { useState, useEffect } from 'react';
import { Search, ChevronRight, PlayCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { db } from '../../lib/firebase';
import { collection, getDocs, orderBy, query, limit, where } from 'firebase/firestore';

interface Goal {
  id: string;
  subject: string;
  domain: string;
  sentence: string;
  description: string;
}

export default function TeacherHome() {
  const navigate = useNavigate();
  const [subjects, setSubjects] = useState<{title: string, count: number}[]>([]);
  const [dbVideos, setDbVideos] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/goals')
      .then(res => res.json())
      .then((data: Goal[]) => {
        const counts = new Map<string, number>();
        data.forEach(g => {
          counts.set(g.subject, (counts.get(g.subject) || 0) + 1);
        });
        const subjectList = Array.from(counts.entries()).map(([title, count]) => ({
          title,
          count
        }));
        setSubjects(subjectList.sort((a,b) => a.title.localeCompare(b.title)));
      })
      .catch(err => console.error("Could not fetch goals", err));

    const fetchVideos = async () => {
      try {
        const q = query(
          collection(db, "videos"), 
          where("status", "==", "approved"),
          orderBy("addedAt", "desc"), 
          limit(6)
        );
        const snap = await getDocs(q);
        const vids: any[] = [];
        snap.forEach(doc => vids.push(doc.data()));
        setDbVideos(vids);
      } catch(e) {
        console.error("Error fetching firebase videos", e);
      }
    };
    fetchVideos();
  }, []);

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-12">
      {/* Header section with Search */}
      <section className="space-y-6">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">Vind lesmateriaal</h1>
          <p className="text-zinc-500 mt-1">Zoek in onze eigen goedgekeurde database op kerndoel of onderwerp.</p>
        </div>
        
        <div className="relative max-w-2xl">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
          <input 
            type="text" 
            placeholder="Bijv. 'Digitale geletterdheid' of 'Kerndoel 21'" 
            className="w-full pl-12 pr-4 py-4 bg-white border border-zinc-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition-shadow text-base"
          />
        </div>
      </section>

      {/* Internal DB Videos */}
      <section className="space-y-4">
        <h2 className="text-lg font-medium text-zinc-900">Recente Toevoegingen in de Educatieve Bibliotheek</h2>
        {dbVideos.length === 0 ? (
          <div className="p-8 text-center bg-zinc-50 border border-zinc-200 rounded-xl border-dashed">
            <p className="text-zinc-500 text-sm">Onze interne videodatabase is nog leeg. De beheerder moet video's toevoegen via de pre-scraper.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {dbVideos.map(vid => (
               <div key={vid.videoId} onClick={() => navigate(`/teacher/videos/${vid.videoId}`)} className="cursor-pointer group">
                  <div className="relative aspect-video rounded-xl overflow-hidden bg-zinc-100 border border-zinc-200">
                    <img src={vid.thumbnailUrl} alt={vid.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                      <PlayCircle className="w-12 h-12 text-white/90 drop-shadow-lg" />
                    </div>
                  </div>
                  <div className="mt-3">
                    <h3 className="font-semibold text-zinc-900 line-clamp-2 group-hover:text-blue-600 transition-colors">{vid.title}</h3>
                    <p className="text-sm text-zinc-500 mt-1 truncate">{vid.channelTitle}</p>
                  </div>
               </div>
            ))}
          </div>
        )}
      </section>

      {/* Subjects Grid */}
      <section className="space-y-4 mt-12">
        <h2 className="text-lg font-medium text-zinc-900">Blader op Vak</h2>
        {subjects.length === 0 ? (
           <div className="text-sm text-zinc-500">Vakken laden vanuit de database...</div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {subjects.map(subject => (
                <button 
                  key={subject.title}
                  onClick={() => navigate(`/teacher/goals?subject=${encodeURIComponent(subject.title)}`)}
                  className="p-5 text-left bg-white border border-zinc-200 rounded-2xl hover:border-zinc-400 hover:shadow-sm transition-all group"
                >
                  <h3 className="font-medium text-zinc-900 line-clamp-2">{subject.title}</h3>
                  <div className="mt-4 flex items-center justify-between text-sm text-zinc-500">
                    <span>{subject.count} kerndoelen</span>
                    <ChevronRight className="w-4 h-4 text-zinc-300 group-hover:text-zinc-600 transition-colors" />
                  </div>
                </button>
              ))}
            </div>
        )}
      </section>

      <div className="pt-12 border-t border-zinc-100">
        <p className="text-[10px] font-mono text-zinc-400 text-center uppercase tracking-widest leading-loose">
          Analyse & Concept door H. Visser<br/>
          EAI Analyse & Advies
        </p>
      </div>
    </div>
  );
}
