import { useState, useEffect, FormEvent } from 'react';
import { Search, ChevronRight, PlayCircle, Loader2, Youtube, FileText, ShieldX, Settings2, ChevronDown } from 'lucide-react';
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
  const [statusMsg, setStatusMsg] = useState<{type: 'error'|'success', text: string} | null>(null);
  const [showSourceSettings, setShowSourceSettings] = useState(false);
  
  // Toggles for sources
  const [activeSources, setActiveSources] = useState({
    youtube: true,
    wiki: true,
    npo: true,
    wikiwijs: true,
    general: true
  });

  // Collapsible states
  const [isRecentExpanded, setIsRecentExpanded] = useState(true);
  const [isSubjectsExpanded, setIsSubjectsExpanded] = useState(true);
  const [isKerndoelenExpanded, setIsKerndoelenExpanded] = useState(true);
  const [isBibliotheekExpanded, setIsBibliotheekExpanded] = useState(true);
  const [isLiveExpanded, setIsLiveExpanded] = useState(true);

  const renderThumbnail = (item: any) => {
    const isWeb = item.sourceType === 'website' || item.duration === 'Web/Bron';
    const thumbUrl = item.thumbnailUrl || item.thumbnail;
    const hasThumb = thumbUrl && thumbUrl.length > 5;
    
    return (
      <div className="relative w-full h-full bg-zinc-100 flex items-center justify-center">
        {hasThumb ? (
           <img 
             src={thumbUrl} 
             onError={(e) => { e.currentTarget.src = "https://images.unsplash.com/photo-1610484826967-09c57207009e?auto=format&fit=crop&q=80&w=800"; }} 
             alt={item.title} 
             className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
           />
        ) : (
           <div className="flex flex-col items-center justify-center text-zinc-400 group-hover:scale-105 transition-transform duration-300">
             {isWeb ? <FileText className="w-6 h-6 sm:w-8 sm:h-8 mb-1 sm:mb-2 opacity-50" /> : <PlayCircle className="w-6 h-6 sm:w-8 sm:h-8 mb-1 sm:mb-2 opacity-50" />}
             <span className="text-[9px] sm:text-[10px] font-medium uppercase tracking-widest">{isWeb ? 'Website' : 'Video'}</span>
           </div>
        )}
      </div>
    );
  };

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

    setStatusMsg(null);
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
    
    // Expand sections on search
    setIsKerndoelenExpanded(true);
    setIsBibliotheekExpanded(true);
    setIsLiveExpanded(true);

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
        : { queries: effectiveQueries, maxResultsPerQuery: 16, sources: activeSources };

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 seconds timeout

      const resp = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyData),
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      
      const data = await resp.json();
      if (resp.ok) {
        // Safe live results
        setLiveResults(data);
        // Save to session so VideoDetail can read title/desc if it's not in db
        sessionStorage.setItem('live_search_results', JSON.stringify(data));
      } else {
        setStatusMsg({ type: 'error', text: data.error || "Fout bij YouTube zoeken." });
      }
    } catch (e: any) {
      console.error(e);
      if (e.name === 'AbortError') {
        setStatusMsg({ type: 'error', text: "Het zoeken duurt te lang. Probeert u het nog eens, of specificeer de zoekopdracht." });
      } else {
        setStatusMsg({ type: 'error', text: "Er is iets misgegaan bij het zoeken." });
      }
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-12">
      {/* Header section with Search */}
      <section className="space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-zinc-900">Lesmateriaal vinden</h1>
          <p className="text-zinc-500 mt-1">Zoek in de actuele lesdatabase of zoek live online bronnen via YouTube of weblinks.</p>
        </div>
        
        {statusMsg && (
          <div className={`p-4 rounded-xl flex items-center justify-between shadow-sm ${statusMsg.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>
            <p className="text-sm font-medium">{statusMsg.text}</p>
            <button onClick={() => setStatusMsg(null)} className="opacity-70 hover:opacity-100 transition-opacity">
              <ShieldX className="w-5 h-5" />
            </button>
          </div>
        )}

        <form 
          onSubmit={(e) => { e.preventDefault(); handleLiveSearch(); }}
          className="relative max-w-3xl flex flex-col gap-3"
        >
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
              <input 
                type="text" 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Zoek lesmateriaal via een onderwerp, URL, etc..." 
                className="w-full pl-12 pr-4 py-3.5 bg-zinc-100/50 border border-zinc-200 hover:border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:bg-white transition-all text-base text-zinc-900 shadow-sm"
              />
            </div>
            <div className="flex gap-2">
              <button 
                type="button"
                onClick={() => setShowSourceSettings(!showSourceSettings)}
                className={`p-3.5 border border-zinc-200 hover:border-zinc-300 rounded-lg transition-colors flex items-center justify-center ${showSourceSettings ? 'bg-zinc-100 text-zinc-900' : 'bg-white text-zinc-600'}`}
                title="Zoekbronnen instellen"
              >
                <Settings2 className="w-5 h-5" />
              </button>
              <button 
                type="submit"
                disabled={isSearching || !searchQuery}
                className="flex-1 sm:flex-none px-6 py-3.5 bg-zinc-900 text-white rounded-lg font-medium hover:bg-zinc-800 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors shadow-sm shrink-0"
              >
                {isSearching ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-4 h-4" />}
                Zoeken
              </button>
            </div>
          </div>
          
          {showSourceSettings && (
            <div className="flex flex-col gap-2 p-3 mt-1 bg-white border border-zinc-200 rounded-lg shadow-sm w-full animate-in slide-in-from-top-1 fade-in duration-200">
              <div className="text-sm font-medium text-zinc-700 px-1">Geselecteerde zoekbronnen:</div>
              <div className="flex flex-wrap items-center gap-2">
                {Object.keys(activeSources).map((sourceKey) => {
                  let label = sourceKey;
                  if (sourceKey === 'wiki') label = 'Wikipedia';
                  else if (sourceKey === 'wikiwijs') label = 'Wikiwijs';
                  else if (sourceKey === 'npo') label = 'NPO Start';
                  else if (sourceKey === 'youtube') label = 'YouTube';
                  else if (sourceKey === 'general') label = 'Algemeen Web';
                  
                  // Icons for different sources to make it clearer
                  let Icon = FileText;
                  if (sourceKey === 'youtube') Icon = Youtube;

                  const isActive = activeSources[sourceKey as keyof typeof activeSources];
                  return (
                    <label 
                      key={sourceKey} 
                      className={`flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer transition-colors border ${
                        isActive ? 'bg-zinc-900 text-white border-zinc-900' : 'bg-zinc-50 text-zinc-600 border-zinc-200 hover:bg-zinc-100'
                      }`}
                    >
                      <input 
                        type="checkbox" 
                        className="hidden"
                        checked={isActive}
                        onChange={(e) => setActiveSources(prev => ({ ...prev, [sourceKey]: e.target.checked }))}
                      />
                      <Icon className="w-4 h-4" />
                      <span className="text-sm font-medium">{label}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}
        </form>
      </section>

      {/* Live YouTube and Web Results - Moved UP */}
      {liveResults && (
        <section className="space-y-4 pt-2">
          <button 
            type="button"
            onClick={() => setIsLiveExpanded(!isLiveExpanded)}
            className="flex items-center justify-between w-full hover:bg-zinc-50 p-2 -ml-2 rounded-lg transition-colors group border-b border-zinc-100"
          >
            <h2 className="text-xl font-semibold tracking-tight text-zinc-900">Gevonden zoekresultaten {searchQuery ? `voor "${searchQuery}"` : ""}</h2>
            <ChevronRight className={`w-5 h-5 text-zinc-400 transition-transform ${isLiveExpanded ? 'rotate-90' : ''}`} />
          </button>
          
          {isLiveExpanded && (
            <>
            {liveResults.length === 0 ? (
              <div className="text-sm text-zinc-500 py-10 text-center bg-zinc-50/50 rounded-lg border border-zinc-100">
                <p className="mb-3">Geen lesmateriaal online gevonden.</p>
                {matchedGoals && matchedGoals.length > 0 && (
                  <div className="mt-4">
                    <span className="text-zinc-700 mb-3 block">Probeer suggesties uit de kerndoelen:</span>
                    <div className="flex flex-wrap gap-2 justify-center max-w-2xl mx-auto">
                      {matchedGoals.slice(0, 2).flatMap(g => [...(g.examples || []), ...(g.elaborations || [])]).slice(0, 4).map((q, i) => (
                        <button 
                          key={i} 
                          onClick={() => {
                            setSearchQuery(q);
                            setTimeout(() => { document.querySelector('form')?.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true })) }, 10);
                          }}
                          className="px-4 py-2 bg-white border border-zinc-200 hover:border-zinc-300 rounded-md text-sm text-zinc-700 transition-colors shadow-sm"
                        >
                          {q.length > 50 ? q.substring(0, 50) + '...' : q}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-6 mt-2">
                {liveResults.map(vid => (
                   <div key={vid.id} onClick={() => navigate(`/teacher/videos/${vid.id}`)} className="cursor-pointer group flex flex-col">
                      <div className="relative aspect-video rounded-lg overflow-hidden bg-zinc-100 mb-2 sm:mb-3">
                        {renderThumbnail(vid)}
                        
                        {vid.sourceType === 'website' || vid.duration === 'Web/Bron' ? (
                          <div className="absolute inset-0 bg-white/40 group-hover:bg-white/20 transition-colors flex items-center justify-center">
                             <span className="bg-white/95 text-zinc-900 text-[9px] sm:text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded backdrop-blur-sm shadow-sm border border-black/5">Artikel</span>
                          </div>
                        ) : (
                          <div className="absolute inset-0 bg-black/5 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                            <PlayCircle className="w-8 h-8 sm:w-10 sm:h-10 text-white/90 drop-shadow-md opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        )}
  
                        <div className="absolute bottom-1 right-1 sm:bottom-1.5 sm:right-1.5 bg-black/80 text-white text-[9px] sm:text-[10px] font-mono px-1 sm:px-1.5 py-0.5 rounded">
                          {vid.duration}
                        </div>
                      </div>
                      <h3 className="font-medium text-xs sm:text-sm text-zinc-900 line-clamp-2 leading-snug group-hover:underline decoration-zinc-300 underline-offset-2">{vid.title}</h3>
                      <p className="text-[10px] sm:text-xs text-zinc-500 mt-0.5 sm:mt-1 truncate">{vid.channelTitle}</p>
                   </div>
                ))}
              </div>
            )}
            </>
          )}
        </section>
      )}

      {/* Database Matches */}
      {dbVideoResults && dbVideoResults.length > 0 && (
        <section className="space-y-4 pt-4">
          <button 
            type="button"
            onClick={() => setIsBibliotheekExpanded(!isBibliotheekExpanded)}
            className="flex items-center justify-between w-full hover:bg-zinc-50 p-2 -ml-2 rounded-lg transition-colors group border-b border-zinc-100"
          >
            <h2 className="text-xl font-semibold tracking-tight text-zinc-900">Gevonden in de bibliotheek</h2>
            <ChevronRight className={`w-5 h-5 text-zinc-400 transition-transform ${isBibliotheekExpanded ? 'rotate-90' : ''}`} />
          </button>
          {isBibliotheekExpanded && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-6 mt-2">
              {dbVideoResults.map(vid => (
                 <div key={vid.id || vid.videoId} onClick={() => navigate(`/teacher/videos/${vid.id || vid.videoId}`)} className="cursor-pointer group flex flex-col">
                    <div className="relative aspect-video rounded-lg overflow-hidden bg-zinc-100 mb-2 sm:mb-3">
                      {renderThumbnail(vid)}
                      <div className="absolute inset-0 bg-black/5 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                        <PlayCircle className="w-8 h-8 sm:w-10 sm:h-10 text-white/90 drop-shadow-md opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                    <h3 className="font-medium text-xs sm:text-sm text-zinc-900 line-clamp-2 leading-snug group-hover:underline decoration-zinc-300 underline-offset-2">{vid.title}</h3>
                    <p className="text-[10px] sm:text-xs text-zinc-500 mt-0.5 sm:mt-1 truncate">{vid.channelTitle}</p>
                 </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Matched Kerndoelen */}
      {matchedGoals && matchedGoals.length > 0 && (
        <section className="space-y-4 pt-2">
          <button 
            type="button"
            onClick={() => setIsKerndoelenExpanded(!isKerndoelenExpanded)}
            className="flex items-center justify-between w-full hover:bg-zinc-50 p-2 -ml-2 rounded-lg transition-colors group border-b border-zinc-100"
          >
            <h2 className="text-xl font-semibold tracking-tight text-zinc-900">Gerelateerde kerndoelen</h2>
            <ChevronRight className={`w-5 h-5 text-zinc-400 transition-transform ${isKerndoelenExpanded ? 'rotate-90' : ''}`} />
          </button>
          
          {isKerndoelenExpanded && (
            <div className="grid grid-cols-1 divide-y divide-zinc-100 border-t border-b border-zinc-100 mt-2">
              {matchedGoals.map(goal => (
                <div 
                  key={goal.id} 
                  onClick={() => navigate(`/teacher/goals/${goal.id}`)} 
                  className="py-4 hover:bg-zinc-50 cursor-pointer transition-colors group flex flex-col sm:flex-row gap-4"
                >
                  <div className="sm:w-32 shrink-0">
                    <div className="text-xs uppercase font-semibold text-zinc-500">{goal.subject}</div>
                    <div className="text-sm text-zinc-400 mt-1">{goal.id}</div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-medium text-zinc-900 group-hover:text-zinc-600 transition-colors">{goal.sentence}</h3>
                    {goal.description && !isTextSimilar(goal.sentence, goal.description) && (
                      <p className="mt-1 text-sm text-zinc-500 line-clamp-2">{goal.description}</p>
                    )}
                  </div>
                  <div className="hidden sm:flex items-center justify-end w-8 text-zinc-300 group-hover:text-zinc-900 transition-colors">
                    <ChevronRight className="w-5 h-5" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      <section className="space-y-4 pt-6 border-t border-zinc-100">
        <button 
          type="button"
          onClick={() => setIsRecentExpanded(!isRecentExpanded)}
          className="flex items-center justify-between w-full hover:bg-zinc-50 p-2 -ml-2 rounded-lg transition-colors group"
        >
          <h2 className="text-xl font-semibold tracking-tight text-zinc-900">Actueel in de bibliotheek</h2>
          <ChevronRight className={`w-5 h-5 text-zinc-400 transition-transform ${isRecentExpanded ? 'rotate-90' : ''}`} />
        </button>
        {isRecentExpanded && (
          <>
          {dbVideos.length === 0 ? (
            <div className="py-12 text-center bg-zinc-50/50 rounded-lg">
              <p className="text-zinc-500 text-sm">De bibliotheek is nog leeg.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-6 mt-2">
              {dbVideos.map(vid => (
                 <div key={vid.id || vid.videoId} onClick={() => navigate(`/teacher/videos/${vid.id || vid.videoId}`)} className="cursor-pointer group flex flex-col">
                    <div className="relative aspect-video rounded-lg overflow-hidden bg-zinc-100 mb-2 sm:mb-3">
                      {renderThumbnail(vid)}
                      {vid.sourceType === 'website' || vid.duration === 'Web/Bron' ? (
                        <div className="absolute inset-0 bg-white/40 group-hover:bg-white/20 transition-colors flex items-center justify-center">
                           <span className="bg-white/95 text-zinc-900 text-[9px] sm:text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded backdrop-blur-sm shadow-sm border border-black/5">Artikel</span>
                        </div>
                      ) : (
                        <div className="absolute inset-0 bg-black/5 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                           <PlayCircle className="w-8 h-8 sm:w-10 sm:h-10 text-white/90 drop-shadow-md opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      )}
                    </div>
                    <h3 className="font-medium text-xs sm:text-sm text-zinc-900 line-clamp-2 leading-snug group-hover:underline decoration-zinc-300 underline-offset-2">{vid.title}</h3>
                    <p className="text-[10px] sm:text-xs text-zinc-500 mt-0.5 sm:mt-1 truncate">{vid.channelTitle}</p>
                 </div>
              ))}
            </div>
          )}
          </>
        )}
      </section>

      {/* Subjects text list */}
      <section className="space-y-4 pt-6 mt-6 border-t border-zinc-100 pb-12">
        <button 
          type="button"
          onClick={() => setIsSubjectsExpanded(!isSubjectsExpanded)}
          className="flex items-center justify-between w-full hover:bg-zinc-50 p-2 -ml-2 rounded-lg transition-colors group"
        >
          <h2 className="text-xl font-semibold tracking-tight text-zinc-900">Vakgebieden</h2>
          <ChevronRight className={`w-5 h-5 text-zinc-400 transition-transform ${isSubjectsExpanded ? 'rotate-90' : ''}`} />
        </button>
        {isSubjectsExpanded && (
          <>
          {subjects.length === 0 ? (
             <div className="text-sm text-zinc-500 mt-2">Laden...</div>
          ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-4">
                {subjects.map(subject => (
                  <button 
                    key={subject.title}
                    onClick={() => navigate(`/teacher/goals?subject=${encodeURIComponent(subject.title)}`)}
                    className="flex justify-between items-center p-4 bg-white border border-zinc-200 hover:border-zinc-300 hover:shadow-sm rounded-xl transition-all text-left group"
                  >
                    <span className="font-semibold text-zinc-800 group-hover:text-zinc-900 transition-colors truncate pr-3">{subject.title}</span>
                    <span className="text-xs font-medium text-zinc-500 bg-zinc-100 px-2.5 py-1 rounded-md shrink-0">{subject.count} doelen</span>
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
