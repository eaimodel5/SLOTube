import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PlayCircle, ShieldCheck, Clock, ShieldX, Youtube, Search, Loader2, Globe } from 'lucide-react';
import { db } from '../../lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { PasswordModal } from '../../components/PasswordModal';
import { isTextSimilar } from '../../lib/textUtils';

interface Goal {
  id: string;
  title: string;
  domain: string;
  subject: string;
  sentence: string;
  description: string;
  examples?: string[];
  elaborations?: string[];
  actor?: string;
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

  // Live search states
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [liveResults, setLiveResults] = useState<any[] | null>(null);
  
  // Discovery states
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [discoveryCandidates, setDiscoveryCandidates] = useState<any[] | null>(null);

  const [showPasswordModal, setShowPasswordModal] = useState(false);

  useEffect(() => {
    // 1. Fetch specific goal
    fetch('/api/goals')
      .then(res => res.json())
      .then((data: Goal[]) => {
        const found = data.find(g => g.id === id);
        if (found) {
          setGoal(found);
          // Pre-fill the search query with the goal domain + subject to give them a good default
          setSearchQuery(`${found.subject} ${found.domain} ${found.sentence.split(' ').slice(0, 5).join(' ')}`);
        }
      });
      
    // 2. Fetch approved videos that match this goal
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

  const handleLiveSearch = async () => {
    if (!searchQuery.trim()) return;
    
    if (sessionStorage.getItem('eai_auth') !== 'true') {
      setShowPasswordModal(true);
      return;
    }

    setIsSearching(true);
    try {
      const isGenericUrl = (searchQuery.startsWith('http://') || searchQuery.startsWith('https://')) && !(searchQuery.includes('youtube.com') || searchQuery.includes('youtu.be'));
      
      const endpoint = isGenericUrl ? '/api/scrape' : '/api/youtube/search';
      
      let effectiveQueries = [searchQuery];
      if (!isGenericUrl && goal) {
        effectiveQueries = [
          searchQuery,
          searchQuery.toLowerCase().includes('leerling') || searchQuery.toLowerCase().includes('docent') 
            ? searchQuery 
            : `${searchQuery} ${goal.subject}`
        ];
      }

      const bodyData = isGenericUrl 
        ? { url: searchQuery }
        : { queries: effectiveQueries, maxResultsPerQuery: 5 };

      const resp = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyData)
      });
      const data = await resp.json();
      if (resp.ok) {
        setLiveResults(data);
        sessionStorage.setItem('live_search_results', JSON.stringify(data));
      } else {
        alert(data.error || "Fout bij de zoek/scrape opdracht.");
      }
    } catch (e) {
      console.error(e);
      alert("Er is iets misgegaan bij het zoeken.");
    } finally {
      setIsSearching(false);
    }
  };

  const handleDiscovery = async () => {
    if (!goal) return;
    if (sessionStorage.getItem('eai_auth') !== 'true') {
      setShowPasswordModal(true);
      // Store that we were trying to do discovery
      sessionStorage.setItem('pending_action', 'discovery');
      return;
    }

    setIsDiscovering(true);
    setDiscoveryCandidates(null);
    try {
      const resp = await fetch('/api/discovery/goal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          goal, 
          options: { 
            maxResults: 12,
            useAi: false 
          } 
        })
      });
      const data = await resp.json();
      if (resp.ok) {
        setDiscoveryCandidates(data.results);
      } else {
        alert(data.error || "Mislukt om suggesties te zoeken.");
      }
    } catch (e) {
      console.error(e);
      alert("Er is iets misgegaan bij het zoeken naar suggesties.");
    } finally {
      setIsDiscovering(false);
    }
  };

  const handleSendToReview = async (candidate: any) => {
    try {
      // Check if it already exists in database using canonicalUrl
      const q = query(collection(db, "videos"), where("canonicalUrl", "==", candidate.canonicalUrl), where("goalId", "==", id));
      const snap = await getDocs(q);
      if (!snap.empty) {
        alert("Deze video staat al in de database voor dit kerndoel.");
        return;
      }

      await import('firebase/firestore').then(({ setDoc, doc, serverTimestamp }) => {
        return setDoc(doc(db, "videos", candidate.id), {
          ...candidate,
          goalId: id,
          status: "pending",
          origin: "discovery",
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      });

      alert("Video is succesvol naar de review gestuurd!");
      
      // Remove from list
      setDiscoveryCandidates(prev => prev ? prev.filter(c => c.id !== candidate.id) : null);
      
    } catch(e) {
      console.error(e);
      alert("Kon de video niet toevoegen aan review.");
    }
  };

  if (!goal) return <div className="p-8 text-center text-zinc-500">Laden...</div>;

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      {/* Goal Header */}
      <div className="bg-white border border-zinc-200 rounded-xl p-8 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="text-xs font-mono uppercase tracking-widest text-zinc-500">
            Kerndoel {goal.id} • {goal.domain}
          </div>
          {goal.actor && (
            <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full ${goal.actor === 'school' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
              DOELGROEP: {goal.actor === 'school' ? 'DOCENTEN / SCHOOL' : 'LEERLINGEN'}
            </span>
          )}
        </div>
        <h1 className="text-2xl font-semibold text-zinc-900 leading-tight">
          {goal.sentence}
        </h1>
        {goal.description && !isTextSimilar(goal.sentence, goal.description) && (
          <p className="mt-4 text-zinc-600 leading-relaxed">
            {goal.description}
          </p>
        )}
      </div>

      {/* Live Search Form */}
      <div className="bg-white border border-zinc-200 rounded-xl p-6 shadow-sm">
        <h2 className="text-lg font-medium text-zinc-900 mb-2">Zoek of Importeer Lesmateriaal</h2>
        <p className="text-sm text-zinc-500 mb-4">Vind direct nieuw lesmateriaal voor dit kerndoel. Typ een zoekterm om op YouTube te zoeken, of plak een directe link naar een andere website.</p>
        
        <div className="flex flex-col md:flex-row gap-6 mb-6">
          <button 
            onClick={handleDiscovery}
            disabled={isDiscovering}
            className="w-full md:w-1/2 px-6 py-4 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-sm font-medium hover:bg-emerald-100 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors shadow-sm"
          >
            {isDiscovering ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
            Automatisch suggesties zoeken
          </button>
        </div>

        <form 
          onSubmit={(e) => { e.preventDefault(); handleLiveSearch(); }}
          className="relative max-w-4xl flex flex-col sm:flex-row gap-3"
        >
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
            <input 
              type="text" 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Zoekterm voor YouTube (bijv. Uitleg Breuken) of Weblink" 
              className="w-full pl-12 pr-4 py-3 bg-white border border-zinc-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition-shadow text-sm text-zinc-900"
            />
          </div>
          <div className="w-full sm:w-48 shrink-0">
             <select
               className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition-shadow text-sm text-zinc-700"
               onChange={(e) => {
                 if(e.target.value) {
                    setSearchQuery(prev => prev + " " + e.target.value);
                 }
               }}
             >
               <option value="">-- Doelgroep --</option>
               <option value="voor leerlingen">Voor Leerlingen</option>
               <option value="uitleg kinderen">Uitleg Kinderen</option>
               <option value="voor docenten">Voor Docenten</option>
               <option value="didactiek">Didactiek</option>
             </select>
          </div>
          <button 
            type="submit"
            disabled={isSearching || !searchQuery}
            className="w-full sm:w-auto px-6 py-3 bg-zinc-900 text-white rounded-xl text-sm font-medium hover:bg-zinc-800 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors whitespace-nowrap shadow-sm shrink-0"
          >
            {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            Handmatig Zoeken
          </button>
        </form>
      </div>

      {/* Discovery Results */}
      {discoveryCandidates && discoveryCandidates.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-zinc-900 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            Gevonden Suggesties (Lokaal Geanalyseerd)
          </h2>
          <div className="grid grid-cols-1 gap-4">
            {discoveryCandidates.map((candidate, idx) => (
              <div key={idx} className="flex flex-col md:flex-row gap-6 p-4 bg-white border border-emerald-100 rounded-xl shadow-sm relative overflow-hidden">
                {/* Thumbnail */}
                <div className="relative w-full md:w-64 aspect-video rounded-lg overflow-hidden bg-zinc-100 shrink-0 border border-emerald-50">
                  <img src={candidate.thumbnailUrl} alt={candidate.title} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/10 flex items-center justify-center">
                    <PlayCircle className="w-10 h-10 text-white/90 drop-shadow-lg" />
                  </div>
                </div>
                {/* Data */}
                <div className="flex flex-col flex-1 py-1 min-w-0">
                  <h3 className="text-lg font-semibold text-zinc-900 line-clamp-2 leading-tight mb-2">{candidate.title}</h3>
                  <div className="flex items-center gap-4 text-sm text-zinc-600 mb-4">
                    <span className="flex items-center gap-1"><Youtube className="w-4 h-4" /> {candidate.channelTitle}</span>
                    <span className="font-mono bg-zinc-100 px-2 py-0.5 rounded text-xs">{candidate.sourceName || candidate.provider}</span>
                  </div>
                  <div className="max-w-2xl text-sm bg-emerald-50 p-3 rounded-lg border border-emerald-100 mb-4">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-emerald-800">Match Score: {candidate.matchScore}%</span>
                    </div>
                    <p className="text-emerald-700">{candidate.matchReason}</p>
                    {candidate.matchEvidence && candidate.matchEvidence.length > 0 && (
                      <p className="text-emerald-600/80 mt-1 text-xs">Overlap: {candidate.matchEvidence.join(', ')}</p>
                    )}
                  </div>
                  <div className="mt-auto self-end">
                    <button 
                      onClick={() => handleSendToReview(candidate)}
                      className="px-5 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors shadow-sm"
                    >
                      Naar review sturen
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {discoveryCandidates && discoveryCandidates.length === 0 && (
        <div className="p-8 text-center bg-zinc-50 border border-zinc-200 rounded-xl rounded-dashed">
          <p className="text-zinc-600">Geen nieuwe bruikbare suggesties gevonden voor dit kerndoel.</p>
        </div>
      )}

      {/* Live YouTube/Scrape Results */}
      {liveResults && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-zinc-900 flex items-center gap-2">
            <Search className="w-5 h-5 text-zinc-400" />
            Live Zoekresultaten
          </h2>
          {liveResults.length === 0 ? (
            <div className="text-sm text-zinc-500 p-8 text-center bg-zinc-50 border border-zinc-200 rounded-xl">
              <p className="mb-4">We konden voor deze term geen direct lesmateriaal vinden.</p>
              
              {goal && ((goal.examples && goal.examples.length > 0) || (goal.elaborations && goal.elaborations.length > 0)) && (
                <div className="mt-6 flex flex-col items-center">
                  <span className="font-semibold text-zinc-700 mb-3">Misschien werken deze praktijkvoorbeelden uit de SLO data beter:</span>
                  <div className="flex flex-wrap gap-2 justify-center max-w-2xl">
                    {[...(goal.examples || []), ...(goal.elaborations || [])].slice(0, 5).map((q, i) => (
                      <button 
                        key={i} 
                        onClick={() => {
                          setSearchQuery(q);
                          // Needs a small delay to ensure state updates before searching, or just do logic in the UI
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
            <div className="grid grid-cols-1 gap-4">
              {liveResults.map(vid => (
                 <div 
                   key={vid.id} 
                   onClick={() => navigate(`/teacher/videos/${vid.id}`)} 
                   className="flex gap-6 p-4 bg-white border border-zinc-200 rounded-xl hover:shadow-md cursor-pointer transition-all group relative overflow-hidden"
                 >
                   <div className="absolute top-0 right-0 px-3 py-1 bg-zinc-100 text-zinc-600 text-[10px] font-bold uppercase tracking-wider rounded-bl-lg border-b border-l border-zinc-200">
                     {vid.sourceType === 'website' || vid.duration === 'Web/Bron' ? 'Scrape Resultaat' : 'Live van YouTube'}
                   </div>
                    {/* Thumbnail */}
                    <div className="relative w-32 sm:w-48 md:w-64 aspect-video rounded-lg overflow-hidden bg-zinc-100 shrink-0 border border-zinc-200">
                      <img src={vid.thumbnailUrl} alt={vid.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      
                      {vid.sourceType === 'website' || vid.duration === 'Web/Bron' ? (
                        <div className="absolute inset-0 bg-white/60 group-hover:bg-white/40 transition-colors flex items-center justify-center">
                          <span className="bg-zinc-900 text-white text-xs px-3 py-1.5 rounded-full font-medium shadow-sm">Externe Bron</span>
                        </div>
                      ) : (
                        <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                          <PlayCircle className="w-8 h-8 md:w-12 md:h-12 text-white/90 drop-shadow-lg" />
                        </div>
                      )}
                      
                      <div className="absolute bottom-1 right-1 md:bottom-2 md:right-2 bg-black/80 text-white text-[10px] font-mono px-1.5 py-0.5 rounded">
                        {vid.duration}
                      </div>
                    </div>
                    {/* Data */}
                    <div className="flex flex-col flex-1 py-1 pr-4 min-w-0">
                      <h3 className="text-lg font-semibold text-zinc-900 line-clamp-2 leading-tight group-hover:text-amber-600 transition-colors">{vid.title}</h3>
                      <div className="mt-2 flex items-center gap-2 text-sm text-zinc-500">
                        {vid.sourceType === 'website' || vid.duration === 'Web/Bron' ? <Globe className="w-4 h-4 text-zinc-400" /> : <Youtube className="w-4 h-4 text-zinc-400" />}
                        <span>{vid.channelTitle}</span>
                      </div>
                    </div>
                 </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Database Videos Section */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-zinc-900">Lesmateriaal in Database</h2>
            <p className="text-sm text-zinc-500 mt-1">Geïmporteerd en officieel beoordeeld op relevantie voor dit kerndoel.</p>
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
              <div className="relative w-32 sm:w-48 md:w-64 aspect-video rounded-lg overflow-hidden bg-zinc-100 shrink-0 border border-zinc-200">
                <img src={video.thumbnailUrl} alt={video.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                
                {video.sourceType === 'website' || video.duration === 'Web/Bron' ? (
                  <div className="absolute inset-0 bg-white/60 group-hover:bg-white/40 transition-colors flex items-center justify-center">
                     <span className="bg-zinc-900 text-white text-xs px-3 py-1.5 rounded-full font-medium shadow-sm">Externe Bron</span>
                  </div>
                ) : null}

                <div className="absolute bottom-1 right-1 md:bottom-2 md:right-2 bg-zinc-900/80 backdrop-blur-sm px-1.5 py-0.5 rounded text-[10px] font-mono text-white">
                  {video.duration}
                </div>
              </div>

              {/* Data */}
              <div className="flex flex-col flex-1 py-1 min-w-0">
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
            <div className="p-12 text-center bg-zinc-50 border border-zinc-200 rounded-xl rounded-dashed flex flex-col items-center justify-center">
              <div className="w-12 h-12 bg-white border border-zinc-200 rounded-xl shadow-sm flex items-center justify-center mb-4">
                 <Youtube className="w-6 h-6 text-zinc-400" />
              </div>
              <h3 className="text-zinc-900 font-medium mb-1">Nog geen video's in de database</h3>
              <p className="text-zinc-500 text-sm max-w-sm mb-6">
                Er zijn nog geen goedgekeurde video's voor dit specifieke kerndoel in jullie bibliotheek te vinden.
              </p>
              <button 
                onClick={() => navigate('/admin/review')}
                className="px-4 py-2 bg-zinc-900 text-white rounded-lg text-sm font-medium hover:bg-zinc-800 transition-colors shadow-sm"
              >
                Beheerder: Voeg video's toe
              </button>
            </div>
          )}
        </div>
      </div>

      <PasswordModal 
        isOpen={showPasswordModal}
        onSuccess={() => {
          setShowPasswordModal(false);
          if (sessionStorage.getItem('pending_action') === 'discovery') {
            sessionStorage.removeItem('pending_action');
            handleDiscovery();
          } else {
            handleLiveSearch();
          }
        }}
        onClose={() => setShowPasswordModal(false)}
      />
    </div>
  );
}
