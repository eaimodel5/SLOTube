import { useState, useEffect } from 'react';
import { Search, ArrowRight, PlayCircle, Loader2, Youtube, FileText, ShieldX, Settings2, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { db } from '../../lib/firebase';
import { collection, getDocs, orderBy, query, limit, where } from 'firebase/firestore';
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

import { Tile } from '../../components/ui/Tile';

export default function TeacherHome() {
  const navigate = useNavigate();
  const [subjects, setSubjects] = useState<{title: string, count: number}[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [dbVideos, setDbVideos] = useState<any[]>([]);
  const [allGoals, setAllGoals] = useState<Goal[]>([]);
  const [matchedGoals, setMatchedGoals] = useState<Goal[] | null>(null);
  
  // Live search states
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [liveResults, setLiveResults] = useState<any[] | null>(null);
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
        const sortedList = subjectList.sort((a,b) => a.title.localeCompare(b.title));
        setSubjects(sortedList);
        if (sortedList.length > 0) setSelectedSubject(sortedList[0].title);
      })
      .catch(err => console.error("Could not fetch goals", err));

    const fetchVideos = async () => {
      try {
        const q = query(
          collection(db, "videos"), 
          where("status", "==", "approved"),
          limit(10)
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
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const resp = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyData),
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      
      const data = await resp.json();
      if (resp.ok) {
        setLiveResults(data);
        sessionStorage.setItem('live_search_results', JSON.stringify(data));
      } else {
        setStatusMsg({ type: 'error', text: data.error || "Fout bij zoeken in bronnen." });
      }
    } catch (e: any) {
      console.error(e);
      if (e.name === 'AbortError') {
        setStatusMsg({ type: 'error', text: "Het zoeken duurt te lang. Probeer de zoekopdracht te verfijnen." });
      } else {
        setStatusMsg({ type: 'error', text: "Er is iets misgegaan bij het zoeken." });
      }
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="p-4 sm:p-8 max-w-6xl mx-auto space-y-12">
      {/* Header section with Search */}
      <section className="space-y-6">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold tracking-tight text-zinc-900">Lesmateriaal vinden</h1>
          <p className="text-sm text-zinc-500 mt-1">Doorzoek de bibliotheek, actieve kerndoelen of vind live online bronnen.</p>
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
          className="relative max-w-3xl flex flex-col gap-3 p-4 sm:p-6 bg-white border border-zinc-200 rounded-2xl shadow-sm"
        >
          <div className="flex flex-col sm:flex-row gap-3 relative z-20">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none">
                 <Search className="w-4 h-4 text-zinc-400" />
              </div>
              <input 
                type="text" 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Zoek een onderwerp, domein of plak een URL..." 
                className="w-full pl-10 pr-4 py-3 bg-zinc-50 border border-zinc-200 hover:border-zinc-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:bg-white transition-all text-xs sm:text-sm text-zinc-900 shadow-sm"
              />
            </div>
            <div className="flex gap-2">
              <button 
                type="button"
                onClick={() => setShowSourceSettings(!showSourceSettings)}
                className={`p-3 border rounded-xl transition-colors shrink-0 flex items-center justify-center ${showSourceSettings ? 'bg-zinc-100 border-zinc-300 text-zinc-900' : 'bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-50'}`}
                title="Zoekbronnen instellen"
              >
                <Settings2 className="w-4 h-4" />
              </button>
              <button 
                type="submit"
                disabled={isSearching || !searchQuery}
                className="flex-1 sm:flex-none px-5 py-3 bg-zinc-900 text-white rounded-xl text-sm font-medium hover:bg-zinc-800 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all shadow-sm shrink-0"
              >
                {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                Zoeken
              </button>
            </div>
          </div>
          
          {showSourceSettings && (
            <div className="flex flex-col gap-2.5 pt-3 border-t border-zinc-100 animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Actieve zoekbronnen</div>
              <div className="flex flex-wrap items-center gap-2">
                {Object.keys(activeSources).map((sourceKey) => {
                  let label = sourceKey;
                  if (sourceKey === 'wiki') label = 'Wikipedia';
                  else if (sourceKey === 'wikiwijs') label = 'Wikiwijs';
                  else if (sourceKey === 'npo') label = 'NPO Start';
                  else if (sourceKey === 'youtube') label = 'YouTube';
                  else if (sourceKey === 'general') label = 'Algemeen Web';
                  
                  let Icon = FileText;
                  if (sourceKey === 'youtube') Icon = Youtube;

                  const isActive = activeSources[sourceKey as keyof typeof activeSources];
                  return (
                    <label 
                      key={sourceKey} 
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full cursor-pointer transition-colors border text-xs ${
                        isActive ? 'bg-zinc-900 text-white border-zinc-900' : 'bg-zinc-50 text-zinc-500 border-zinc-200 hover:bg-zinc-100 hover:text-zinc-700'
                      }`}
                    >
                      <input 
                        type="checkbox" 
                        className="hidden"
                        checked={isActive}
                        onChange={(e) => setActiveSources(prev => ({ ...prev, [sourceKey]: e.target.checked }))}
                      />
                      <Icon className="w-3 h-3" />
                      <span className="font-medium">{label}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}
        </form>

        {/* Subjects displayed cleanly directly below the search bar */}
        {!liveResults && !dbVideoResults && (
          <div className="pt-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-3">Bladeren per vakgebied</h3>
            {subjects.length === 0 ? (
               <div className="text-xs text-zinc-400">Vakgebieden laden...</div>
            ) : (
               <div className="flex flex-col gap-2 mt-3">
                 {subjects.map(subject => {
                    const isExpanded = selectedSubject === subject.title;
                    return (
                      <div key={subject.title} className="bg-white border text-left border-zinc-200 rounded-2xl shadow-sm overflow-hidden transition-all">
                        <button 
                          onClick={() => setSelectedSubject(isExpanded ? null : subject.title)}
                          className={`w-full px-4 py-3 flex items-center justify-between transition-colors ${isExpanded ? 'bg-zinc-50' : 'hover:bg-zinc-50'}`}
                        >
                           <span className={`text-sm ${isExpanded ? 'text-zinc-900 font-semibold' : 'text-zinc-700 font-medium'}`}>{subject.title}</span>
                           <div className="flex items-center gap-2">
                              <span className="text-xs font-medium text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded-full">{subject.count}</span>
                              <ChevronDown className={`w-4 h-4 text-zinc-400 transition-transform duration-300 ${isExpanded ? '-rotate-180 text-zinc-900' : ''}`} />
                           </div>
                        </button>
                        
                        {/* Expanded content */}
                        <div className={`grid transition-[grid-template-rows,opacity] duration-300 ease-in-out ${isExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                          <div className="overflow-hidden">
                            <div className="p-4 sm:p-5 bg-zinc-50/50 border-t border-zinc-100">
                               <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                                  {allGoals.filter(g => g.subject === subject.title).map(goal => (
                                     <Tile
                                       key={goal.id}
                                       onClick={() => navigate(`/teacher/goals/${goal.id}`)}
                                       title={goal.domain}
                                       subtitle={goal.sentence}
                                       icon={
                                         <div className="inline-flex items-center justify-center px-2 h-8 rounded-md bg-orange-50 text-orange-600 font-mono text-xs font-bold tracking-wide">
                                           {goal.id}
                                         </div>
                                       }
                                     />
                                  ))}
                               </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                 })}
               </div>
            )}
          </div>
        )}
      </section>

      {/* --- Search Results Area --- */}
      {(liveResults || dbVideoResults || matchedGoals) && (
        <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500 pt-6 border-t border-zinc-200">
          
          {/* 1. Database Matches */}
          {dbVideoResults && dbVideoResults.length > 0 && (
            <section className="space-y-4">
              <h2 className="text-lg font-semibold tracking-tight text-zinc-900 flex items-center gap-2">
                <span className="flex items-center justify-center w-5 h-5 rounded bg-blue-100 text-blue-700 text-[10px] font-bold">
                  {dbVideoResults.length}
                </span>
                Gevonden in de bibliotheek
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {dbVideoResults.map(vid => (
                   <div key={vid.id || vid.videoId} onClick={() => navigate(`/teacher/videos/${vid.id || vid.videoId}`)} className="cursor-pointer group flex flex-col">
                      <div className="relative aspect-video rounded-xl overflow-hidden bg-zinc-100 mb-3 border border-zinc-200 shadow-sm transition-all group-hover:shadow-md">
                        {renderThumbnail(vid)}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors flex items-center justify-center">
                          <PlayCircle className="w-10 h-10 text-white/90 drop-shadow-md scale-95 opacity-0 group-hover:opacity-100 group-hover:scale-100 transition-all" />
                        </div>
                      </div>
                      <h3 className="font-medium text-sm text-zinc-900 line-clamp-2 leading-snug group-hover:text-blue-700 transition-colors">{vid.title}</h3>
                      <p className="text-xs text-zinc-500 mt-1 truncate">{vid.channelTitle}</p>
                   </div>
                ))}
              </div>
            </section>
          )}

          {/* 2. Matched Kerndoelen */}
          {matchedGoals && matchedGoals.length > 0 && (
            <section className="space-y-4">
              <h2 className="text-lg font-semibold tracking-tight text-zinc-900">Gerelateerde kerndoelen</h2>
              <div className="flex flex-col gap-3">
                {matchedGoals.map(goal => (
                  <Tile
                    key={goal.id}
                    onClick={() => navigate(`/teacher/goals/${goal.id}`)}
                    title={goal.sentence}
                    subtitle={goal.description && !isTextSimilar(goal.sentence, goal.description) ? goal.description : goal.subject}
                    icon={
                      <div className="inline-flex items-center justify-center px-2 h-8 rounded-md bg-zinc-100 text-zinc-600 font-mono text-xs font-bold tracking-wide">
                        {goal.id}
                      </div>
                    }
                  />
                ))}
              </div>
            </section>
          )}

          {/* 3. Live Results */}
          {liveResults && (
            <section className="space-y-4">
              <h2 className="text-lg font-semibold tracking-tight text-zinc-900">
                Live resultaten online
              </h2>
              {liveResults.length === 0 ? (
                <div className="text-sm text-zinc-500 py-10 text-center bg-white border border-zinc-200 rounded-2xl shadow-sm">
                  <p className="mb-3">Geen direct lesmateriaal online gevonden voor deze zoekopdracht.</p>
                  {matchedGoals && matchedGoals.length > 0 && (
                    <div className="mt-6 border-t border-zinc-100 pt-6">
                      <span className="text-zinc-700 font-medium mb-3 block">Probeer te zoeken op gerelateerde termen:</span>
                      <div className="flex flex-wrap gap-2 justify-center max-w-2xl mx-auto">
                        {matchedGoals.slice(0, 2).flatMap(g => [...(g.examples || []), ...(g.elaborations || [])]).slice(0, 6).map((q, i) => (
                          <button 
                            key={i} 
                            onClick={() => {
                              setSearchQuery(q);
                              setTimeout(() => { document.querySelector('form')?.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true })) }, 10);
                            }}
                            className="px-4 py-2 bg-zinc-50 border border-zinc-200 hover:border-zinc-300 hover:bg-zinc-100 rounded-full text-sm text-zinc-700 transition-colors"
                          >
                            {q.length > 40 ? q.substring(0, 40) + '...' : q}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {liveResults.map(vid => (
                     <div key={vid.id} onClick={() => navigate(`/teacher/videos/${vid.id}`)} className="cursor-pointer group flex flex-col">
                        <div className="relative aspect-video rounded-xl overflow-hidden bg-zinc-100 mb-3 border border-zinc-200 shadow-sm transition-all group-hover:shadow-md">
                          {renderThumbnail(vid)}
                          
                          {vid.sourceType === 'website' || vid.duration === 'Web/Bron' ? (
                            <div className="absolute inset-0 bg-white/40 group-hover:bg-white/20 transition-colors flex items-center justify-center">
                               <span className="bg-white/95 text-zinc-900 text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded backdrop-blur-sm shadow-sm border border-black/5">Artikel</span>
                            </div>
                          ) : (
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors flex items-center justify-center">
                              <PlayCircle className="w-10 h-10 text-white/90 drop-shadow-md scale-95 opacity-0 group-hover:opacity-100 group-hover:scale-100 transition-all" />
                            </div>
                          )}
    
                          <div className="absolute bottom-1.5 right-1.5 bg-black/80 backdrop-blur-sm text-white text-[10px] font-mono px-1.5 py-0.5 rounded shadow-sm">
                            {vid.duration}
                          </div>
                        </div>
                        <h3 className="font-medium text-xs sm:text-sm text-zinc-900 line-clamp-2 leading-snug group-hover:text-blue-700 transition-colors">{vid.title}</h3>
                        <p className="text-[10px] sm:text-xs text-zinc-500 mt-1 truncate">{vid.channelTitle}</p>
                     </div>
                  ))}
                </div>
              )}
            </section>
          )}

        </div>
      )}

      {/* Default State: Recently added videos */}
      {!liveResults && !dbVideoResults && dbVideos.length > 0 && (
        <section className="space-y-4 pt-6 border-t border-zinc-200">
          <h2 className="text-lg font-semibold tracking-tight text-zinc-900">Nieuw in de bibliotheek</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {dbVideos.map(vid => (
               <div key={vid.id || vid.videoId} onClick={() => navigate(`/teacher/videos/${vid.id || vid.videoId}`)} className="cursor-pointer group flex flex-col">
                  <div className="relative aspect-video rounded-xl overflow-hidden bg-zinc-100 mb-3 border border-zinc-200 shadow-sm transition-all group-hover:shadow-md">
                    {renderThumbnail(vid)}
                    {vid.sourceType === 'website' || vid.duration === 'Web/Bron' ? (
                      <div className="absolute inset-0 bg-white/40 group-hover:bg-white/20 transition-colors flex items-center justify-center">
                         <span className="bg-white/95 text-zinc-900 text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded backdrop-blur-sm shadow-sm border border-black/5">Artikel</span>
                      </div>
                    ) : (
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors flex items-center justify-center">
                         <PlayCircle className="w-10 h-10 text-white/90 drop-shadow-md scale-95 opacity-0 group-hover:opacity-100 group-hover:scale-100 transition-all" />
                      </div>
                    )}
                  </div>
                  <h3 className="font-medium text-xs sm:text-sm text-zinc-900 line-clamp-2 leading-snug group-hover:text-blue-700 transition-colors">{vid.title}</h3>
                  <p className="text-[10px] sm:text-xs text-zinc-500 mt-1 truncate">{vid.channelTitle}</p>
               </div>
            ))}
          </div>
        </section>
      )}

      <div className="pt-12 mt-12 border-t border-zinc-200">
        <p className="text-sm font-mono tracking-widest uppercase text-zinc-400 text-center">
          Concept en realisatie door EAI Analyse & Advies
        </p>
      </div>


    </div>
  );
}
