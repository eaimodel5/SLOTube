import { useState, useEffect, FormEvent } from 'react';
import { Search, ChevronRight, PlayCircle, Loader2, Youtube } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { db } from '../../lib/firebase';
import { collection, getDocs, orderBy, query, limit, where } from 'firebase/firestore';
import { PasswordModal } from '../../components/PasswordModal';
import { isTextSimilar } from '../../lib/textUtils';

interface Goal {
  id: string;
  subject: string;
  domain: string;
  sentence: string;
  description: string;
  examples?: string[];
  elaborations?: string[];
}

export default function TeacherHome() {
  const navigate = useNavigate();
  const [subjects, setSubjects] = useState<{title: string, count: number}[]>([]);
  const [dbVideos, setDbVideos] = useState<any[]>([]);
  const [allGoals, setAllGoals] = useState<Goal[]>([]);
  const [matchedGoals, setMatchedGoals] = useState<Goal[] | null>(null);
  
  // Live search states
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [liveResults, setLiveResults] = useState<any[] | null>(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  
  // Toggles for sources
  const [activeSources, setActiveSources] = useState({
    youtube: true,
    wiki: true,
    npo: true,
    wikiwijs: true,
    openleermateriaal: true
  });

  // Collapsible states
  const [isRecentExpanded, setIsRecentExpanded] = useState(false);
  const [isSubjectsExpanded, setIsSubjectsExpanded] = useState(false);

  useEffect(() => {
    fetch('/api/goals')
      .then(res => res.json())
      .then((data: Goal[]) => {
        setAllGoals(data);
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
          limit(6)
        );
        const snap = await getDocs(q);
        const vids: any[] = [];
        snap.forEach(doc => vids.push(doc.data()));
        
        vids.sort((a, b) => {
          if (!a.addedAt || !b.addedAt) return 0;
          return b.addedAt.toMillis() - a.addedAt.toMillis();
        });
        
        setDbVideos(vids);
      } catch(e) {
        console.error("Error fetching firebase videos", e);
      }
    };
    fetchVideos();
  }, []);

  const [dbVideoResults, setDbVideoResults] = useState<any[] | null>(null);

  const handleLiveSearch = async () => {
    if (!searchQuery.trim()) return;
    
    if (sessionStorage.getItem('eai_auth') !== 'true') {
      setShowPasswordModal(true);
      return;
    }

    setIsSearching(true);
    
    // Check locally for goals that match the search query
    const lowerQuery = searchQuery.toLowerCase();
    const searchTerms = lowerQuery.split(' ').filter(t => t.length > 2);

    const matches = allGoals.filter(
      (g) => {
        const textToSearch = [
          g.subject,
          g.domain,
          g.sentence,
          g.description || '',
          ...(g.examples || []),
          ...(g.elaborations || [])
        ].join(' ').toLowerCase();

        return searchTerms.some(term => textToSearch.includes(term));
      }
    );
    
    // Group matches by subject and pick the best representation
    const topMatches = matches.slice(0, 3);
    setMatchedGoals(topMatches);

    // Search own database
    try {
      const q = query(collection(db, "videos"), where("status", "==", "approved"));
      const snap = await getDocs(q);
      const matchedDbVids: any[] = [];
      
      snap.forEach(doc => {
        const data = doc.data();
        const textToSearch = `${data.title} ${data.description}`.toLowerCase();
        if (searchTerms.some(term => textToSearch.includes(term))) {
          matchedDbVids.push(data);
        }
      });
      setDbVideoResults(matchedDbVids);
    } catch(e) {
      console.error("Error searching db videos:", e);
    }

    try {
      const isGenericUrl = (searchQuery.startsWith('http://') || searchQuery.startsWith('https://')) && !(searchQuery.includes('youtube.com') || searchQuery.includes('youtu.be'));
      
      const endpoint = isGenericUrl ? '/api/scrape' : '/api/youtube/search';
      
      let effectiveQueries = [searchQuery];
      if (!isGenericUrl && topMatches.length > 0) {
        // Enkel keyword toevoegen (vak of domein) in plaats van hele lange zinnen, anders 0 resultaten
        const top = topMatches[0];
        effectiveQueries = [
          searchQuery,
          `${searchQuery} ${top.subject}`,
        ];
      }

      const bodyData = isGenericUrl 
        ? { url: searchQuery }
        : { queries: effectiveQueries, maxResultsPerQuery: 5, sources: activeSources };

      const resp = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyData)
      });
      const data = await resp.json();
      if (resp.ok) {
        // Safe live results
        setLiveResults(data);
        // Save to session so VideoDetail can read title/desc if it's not in db
        sessionStorage.setItem('live_search_results', JSON.stringify(data));
      } else {
        alert(data.error || "Fout bij YouTube zoeken.");
      }
    } catch (e) {
      console.error(e);
      alert("Er is iets misgegaan bij het zoeken.");
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-12">
      {/* Header section with Search */}
      <section className="space-y-6">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">Lesmateriaal vinden</h1>
          <p className="text-zinc-500 mt-1">Zoek in de actuele lesdatabase of zoek live online bronnen via YouTube of weblinks.</p>
        </div>
        
        <form 
          onSubmit={(e) => { e.preventDefault(); handleLiveSearch(); }}
          className="relative max-w-2xl flex flex-col gap-3"
        >
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
              <input 
                type="text" 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Zoek met een onderwerp, de URL, etc..." 
                className="w-full pl-12 pr-4 py-4 bg-white border border-zinc-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition-shadow text-base text-zinc-900"
              />
            </div>
            <button 
              type="submit"
              disabled={isSearching || !searchQuery}
              className="px-6 py-4 bg-zinc-900 text-white rounded-xl font-medium hover:bg-zinc-800 disabled:opacity-50 flex items-center gap-2 transition-colors whitespace-nowrap shadow-sm shrink-0"
            >
              {isSearching ? <Loader2 className="w-5 h-5 animate-spin" /> : <Youtube className="w-5 h-5" />}
              Live zoeken
            </button>
          </div>
          
          <div className="flex flex-wrap items-center gap-4 px-2 mt-1">
            <span className="text-xs font-medium text-zinc-500 tracking-wide">Bronnen:</span>
            {Object.keys(activeSources).map((sourceKey) => (
              <label key={sourceKey} className="flex items-center gap-2 cursor-pointer group">
                <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                  activeSources[sourceKey as keyof typeof activeSources] 
                    ? 'bg-blue-600 border-blue-600' 
                    : 'bg-white border-zinc-300 group-hover:border-blue-400'
                }`}>
                  {activeSources[sourceKey as keyof typeof activeSources] && (
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <input 
                  type="checkbox" 
                  className="hidden" 
                  checked={activeSources[sourceKey as keyof typeof activeSources]}
                  onChange={(e) => setActiveSources(prev => ({ ...prev, [sourceKey]: e.target.checked }))}
                />
                <span className="text-sm text-zinc-700 capitalize font-medium select-none group-hover:text-zinc-900">
                  {sourceKey === 'wiki' ? 'Wikipedia' : sourceKey === 'wikiwijs' ? 'Wikiwijs' : sourceKey === 'npo' ? 'NPO' : sourceKey === 'openleermateriaal' ? 'Openleermateriaal' : 'YouTube'}
                </span>
              </label>
            ))}
          </div>
        </form>
      </section>

      {/* Matched Kerndoelen */}
      {matchedGoals && matchedGoals.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-lg font-medium text-zinc-900 flex items-center gap-2">
            <span className="w-5 h-5 flex items-center justify-center bg-blue-100 text-blue-700 rounded text-xs font-bold font-mono">KR</span>
            Gerelateerde kerndoelen
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {matchedGoals.map(goal => (
              <div 
                key={goal.id} 
                onClick={() => navigate(`/teacher/goals/${goal.id}`)} 
                className="bg-white border border-zinc-200 rounded-xl p-5 hover:border-blue-400 hover:shadow-md cursor-pointer transition-all group flex flex-col"
              >
                <div className="text-[10px] uppercase font-mono font-bold tracking-widest text-zinc-500 mb-2">{goal.subject}</div>
                <h3 className="font-semibold text-zinc-900 line-clamp-3 group-hover:text-blue-600 transition-colors">{goal.sentence}</h3>
                {goal.description && !isTextSimilar(goal.sentence, goal.description) && (
                  <p className="mt-2 text-xs text-zinc-500 line-clamp-2">{goal.description}</p>
                )}
                <div className="mt-auto pt-4 text-xs font-medium text-blue-600 flex items-center justify-between">
                  <span>Kerndoel {goal.id}</span>
                  <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Database Matches */}
      {dbVideoResults && dbVideoResults.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-lg font-medium text-zinc-900 flex items-center gap-2">
            <span className="w-5 h-5 flex items-center justify-center bg-green-100 text-green-700 rounded text-xs font-bold font-mono">DB</span>
            Gevonden in eigen bibliotheek
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {dbVideoResults.map(vid => (
               <div key={vid.youtubeId} onClick={() => navigate(`/teacher/videos/${vid.youtubeId}`)} className="cursor-pointer group">
                  <div className="relative aspect-video rounded-xl overflow-hidden bg-zinc-100 border border-zinc-200">
                    <img src={vid.thumbnailUrl} onError={(e) => { e.currentTarget.src = "https://images.unsplash.com/photo-1610484826967-09c57207009e?auto=format&fit=crop&q=80&w=800"; }} alt={vid.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-colors flex items-center justify-center">
                      <PlayCircle className="w-12 h-12 text-white/90 drop-shadow-lg" />
                    </div>
                  </div>
                  <div className="mt-3">
                    <h3 className="font-semibold text-zinc-900 line-clamp-2 group-hover:text-blue-600 transition-colors">{vid.title}</h3>
                    <p className="text-sm text-zinc-500 mt-1 truncate">{vid.channelTitle} • In Database</p>
                  </div>
               </div>
            ))}
          </div>
        </section>
      )}

      {/* Live YouTube Results */}
      {liveResults && (
        <section className="space-y-4">
          <h2 className="text-lg font-medium text-zinc-900 flex items-center gap-2">
            <Search className="w-5 h-5 text-amber-600" />
            Live resultaten voor "{searchQuery}"
          </h2>
          {liveResults.length === 0 ? (
            <div className="text-sm text-zinc-500 p-8 text-center bg-zinc-50 border border-zinc-200 rounded-xl">
              <p className="mb-4">Geen educatief materiaal gevonden voor deze term op YouTube of NPO/Wiki bronnen.</p>
              {matchedGoals && matchedGoals.length > 0 && (
                <div className="mt-6 flex flex-col items-center">
                  <span className="font-semibold text-zinc-700 mb-3">Suggesties op basis van gevonden kerndoelen:</span>
                  <div className="flex flex-wrap gap-2 justify-center max-w-2xl">
                    {matchedGoals.slice(0, 2).flatMap(g => [...(g.examples || []), ...(g.elaborations || [])]).slice(0, 4).map((q, i) => (
                      <button 
                        key={i} 
                        onClick={() => {
                          setSearchQuery(q);
                          setTimeout(() => { document.querySelector('form')?.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true })) }, 10);
                        }}
                        className="px-3 py-1.5 bg-white border border-zinc-200 hover:border-blue-300 hover:bg-blue-50 text-blue-600 rounded-full text-xs transition-colors text-left"
                      >
                        "{q.substring(0, 60)}{q.length > 60 ? '...' : ''}"
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {liveResults.map(vid => (
                 <div key={vid.id} onClick={() => navigate(`/teacher/videos/${vid.id}`)} className="cursor-pointer group">
                    <div className="relative aspect-video rounded-xl overflow-hidden bg-zinc-100 border border-zinc-200">
                      <img src={vid.thumbnailUrl} onError={(e) => { e.currentTarget.src = "https://images.unsplash.com/photo-1610484826967-09c57207009e?auto=format&fit=crop&q=80&w=800"; }} alt={vid.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      
                      {vid.sourceType === 'website' || vid.duration === 'Web/Bron' ? (
                        <div className="absolute inset-0 bg-white/60 group-hover:bg-white/40 transition-colors flex items-center justify-center">
                           <span className="bg-zinc-900 text-white text-xs px-3 py-1.5 rounded-full font-medium shadow-sm">Externe bron</span>
                        </div>
                      ) : (
                        <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                          <PlayCircle className="w-12 h-12 text-white/90 drop-shadow-lg" />
                        </div>
                      )}

                      <div className="absolute bottom-2 right-2 bg-black/80 text-white text-[10px] font-mono px-2 py-1 rounded">
                        {vid.duration}
                      </div>
                    </div>
                    <div className="mt-3">
                      <h3 className="font-semibold text-zinc-900 line-clamp-2 group-hover:text-blue-600 transition-colors">{vid.title}</h3>
                      <p className="text-sm text-zinc-500 mt-1 truncate">{vid.channelTitle} {vid.sourceType === 'website' || vid.duration === 'Web/Bron' ? '• Website / artikel' : '• Live YouTube'}</p>
                    </div>
                 </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Internal DB Videos */}
      <section className="space-y-4">
        <button 
          type="button"
          onClick={() => setIsRecentExpanded(!isRecentExpanded)}
          className="flex items-center justify-between w-full hover:bg-zinc-50 p-2 -ml-2 rounded-lg transition-colors group"
        >
          <h2 className="text-lg font-medium text-zinc-900">Recente toevoegingen in de educatieve bibliotheek</h2>
          <ChevronRight className={`w-5 h-5 text-zinc-400 transition-transform ${isRecentExpanded ? 'rotate-90' : ''}`} />
        </button>
        {isRecentExpanded && (
          <>
          {dbVideos.length === 0 ? (
            <div className="p-8 text-center bg-zinc-50 border border-zinc-200 rounded-xl border-dashed">
              <p className="text-zinc-500 text-sm">Onze interne videodatabase is nog leeg. De beheerder moet video's toevoegen via de pre-scraper.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-2">
              {dbVideos.map(vid => (
                 <div key={vid.videoId} onClick={() => navigate(`/teacher/videos/${vid.videoId}`)} className="cursor-pointer group">
                    <div className="relative aspect-video rounded-xl overflow-hidden bg-zinc-100 border border-zinc-200">
                      <img src={vid.thumbnailUrl} onError={(e) => { e.currentTarget.src = "https://images.unsplash.com/photo-1610484826967-09c57207009e?auto=format&fit=crop&q=80&w=800"; }} alt={vid.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      {vid.sourceType === 'website' || vid.duration === 'Web/Bron' ? (
                        <div className="absolute inset-0 bg-white/60 group-hover:bg-white/40 transition-colors flex items-center justify-center">
                           <span className="bg-zinc-900 text-white text-xs px-3 py-1.5 rounded-full font-medium shadow-sm">Externe bron</span>
                        </div>
                      ) : (
                        <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                          <PlayCircle className="w-12 h-12 text-white/90 drop-shadow-lg" />
                        </div>
                      )}
                    </div>
                    <div className="mt-3">
                      <h3 className="font-semibold text-zinc-900 line-clamp-2 group-hover:text-blue-600 transition-colors">{vid.title}</h3>
                      <p className="text-sm text-zinc-500 mt-1 truncate">{vid.channelTitle} {vid.sourceType === 'website' || vid.duration === 'Web/Bron' ? '• Website / artikel' : ''}</p>
                    </div>
                 </div>
              ))}
            </div>
          )}
          </>
        )}
      </section>

      {/* Subjects Grid */}
      <section className="space-y-4 mt-6">
        <button 
          type="button"
          onClick={() => setIsSubjectsExpanded(!isSubjectsExpanded)}
          className="flex items-center justify-between w-full hover:bg-zinc-50 p-2 -ml-2 rounded-lg transition-colors group"
        >
          <h2 className="text-lg font-medium text-zinc-900">Blader op vakken en kerndoelen</h2>
          <ChevronRight className={`w-5 h-5 text-zinc-400 transition-transform ${isSubjectsExpanded ? 'rotate-90' : ''}`} />
        </button>
        {isSubjectsExpanded && (
          <>
          {subjects.length === 0 ? (
             <div className="text-sm text-zinc-500 mt-2">Vakken laden vanuit de database...</div>
          ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-2">
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
          </>
        )}
      </section>

      <div className="pt-12 border-t border-zinc-100">
        <p className="text-sm text-zinc-400 text-center">
          Concept en realisatie door EAI Analyse & Advies
        </p>
      </div>

      <PasswordModal 
        isOpen={showPasswordModal}
        onSuccess={() => {
          setShowPasswordModal(false);
          handleLiveSearch();
        }}
        onClose={() => setShowPasswordModal(false)}
      />
    </div>
  );
}
