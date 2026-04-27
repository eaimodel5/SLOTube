import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PlayCircle, ShieldCheck, Clock, ShieldX, Youtube, Search, Loader2, Globe, ChevronDown, ChevronUp, FileText } from 'lucide-react';
import { db } from '../../lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { createPendingVideo } from '../../lib/firebase/videoRepository';
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
  provider?: string;
  sourceType?: string;
  sourceName?: string;
  sourceUrl?: string;
  origin?: string;
  assessedGoals?: {goalId: string, matchScore: number}[];
  thumbnailUrl: string;
}

function getSourceBadge(provider: string = '', sourceName: string = '') {
  const normalized = provider.toLowerCase() || '';
  if (normalized.includes('youtube')) return { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-100', icon: <Youtube className="w-3.5 h-3.5" />, label: 'YouTube' };
  if (normalized.includes('schooltv')) return { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-100', icon: <PlayCircle className="w-3.5 h-3.5" />, label: 'Schooltv' };
  if (normalized.includes('klokhuis')) return { bg: 'bg-pink-50', text: 'text-pink-600', border: 'border-pink-100', icon: <PlayCircle className="w-3.5 h-3.5" />, label: 'Het Klokhuis' };
  if (normalized.includes('wikiwijs')) return { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-100', icon: <Globe className="w-3.5 h-3.5" />, label: 'Wikiwijs' };
  if (normalized.includes('impuls')) return { bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-100', icon: <Globe className="w-3.5 h-3.5" />, label: 'Impuls Open Leermateriaal' };
  if (normalized.includes('openleermateriaal')) return { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-100', icon: <Globe className="w-3.5 h-3.5" />, label: 'Openleermateriaal' };
  if (normalized.includes('npo')) return { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-100', icon: <PlayCircle className="w-3.5 h-3.5" />, label: 'NPO' };
  if (normalized.includes('wikipedia')) return { bg: 'bg-zinc-100', text: 'text-zinc-700', border: 'border-zinc-200', icon: <Globe className="w-3.5 h-3.5" />, label: 'Wikipedia' };
  return { bg: 'bg-zinc-50', text: 'text-zinc-600', border: 'border-zinc-200', icon: <Globe className="w-3.5 h-3.5" />, label: sourceName || 'Webbron' };
}

function getScoreLabel(score: number) {
  if (score >= 80) return { label: 'Sterke match', color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200' };
  if (score >= 60) return { label: 'Waarschijnlijk bruikbaar', color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200' };
  if (score >= 45) return { label: 'Twijfelgeval', color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200' };
  return { label: 'Niet tonen', color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200' };
}

export default function GoalDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [goal, setGoal] = useState<Goal | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);

  // UI state
  const [showExtra, setShowExtra] = useState(false);

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
        ? { url: searchQuery, goal: goal }
        : { queries: effectiveQueries, maxResultsPerQuery: 5, goal: goal };

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
        // Alleen suggesties van >= 45 tonen
        const filtered = (data.results || []).filter((r: any) => (r.matchScore || 0) >= 45);
        setDiscoveryCandidates(filtered);
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
      await createPendingVideo(candidate, id || '');
      alert("Video is succesvol naar de review gestuurd!");
      
      // Remove from list
      setDiscoveryCandidates(prev => prev ? prev.filter(c => c.id !== candidate.id) : null);
      
    } catch(e: any) {
      console.error(e);
      alert(e.message || "Kon de video niet toevoegen aan review.");
    }
  };

  if (!goal) return <div className="p-8 text-center text-zinc-500 flex items-center justify-center min-h-[50vh]"><Loader2 className="w-6 h-6 animate-spin" /></div>;

  const validExamples = goal.examples?.filter(ex => ex.trim().length > 0) || [];
  const validElaborations = goal.elaborations?.filter(el => el.trim().length > 0) || [];

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      {/* Goal Header */}
      <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-sm">
        <div className="p-6 md:p-8">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-4">
            <div className="text-xs font-mono uppercase tracking-widest text-zinc-500 bg-zinc-100 inline-block px-2 py-1 rounded w-fit">
              Kerndoel {goal.id} • {goal.domain}
            </div>
            {goal.actor && (
              <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded-sm ${goal.actor === 'school' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                DOELGROEP: {goal.actor === 'school' ? 'DOCENTEN / SCHOOL' : 'LEERLINGEN'}
              </span>
            )}
          </div>
          <h1 className="text-2xl font-semibold text-zinc-900 leading-tight">
            {goal.sentence}
          </h1>
          {goal.description && !isTextSimilar(goal.sentence, goal.description) && (
            <p className="mt-4 text-zinc-600 leading-relaxed text-sm">
              {goal.description}
            </p>
          )}

          {(validExamples.length > 0 || validElaborations.length > 0) && (
            <div className="mt-6 border-t border-zinc-100 pt-4">
              <button 
                onClick={() => setShowExtra(!showExtra)}
                className="flex items-center gap-2 text-sm font-medium text-emerald-600 hover:text-emerald-700 transition-colors"
              >
                {showExtra ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                {showExtra ? 'Verberg SLO toelichtingen' : 'Toon extra SLO uitwerkingen & voorbeelden'}
              </button>

              {showExtra && (
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6 bg-emerald-50/50 p-4 rounded-lg border border-emerald-100/50">
                  {validExamples.length > 0 && (
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-800 mb-3">Voorbeelden</h4>
                      <ul className="space-y-2">
                        {validExamples.map((ex, i) => (
                          <li key={i} className="text-sm text-zinc-700 flex items-start gap-2">
                            <span className="text-emerald-400 mt-0.5">•</span>
                            <span>{ex}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {validElaborations.length > 0 && (
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-800 mb-3">Uitwerkingen (Havo/Vwo)</h4>
                      <ul className="space-y-2">
                        {validElaborations.map((el, i) => (
                          <li key={i} className="text-sm text-zinc-700 flex items-start gap-2">
                            <span className="text-emerald-400 mt-0.5">•</span>
                            <span>{el}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Database Videos Section */}
      <div className="space-y-4">
        <div className="flex justify-between items-end">
          <h2 className="text-xl font-semibold text-zinc-900 border-b-2 border-emerald-500 pb-1 inline-block">Goedgekeurd Lesmateriaal</h2>
          <span className="text-sm font-mono text-zinc-500">{videos.length} RESULTATEN</span>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {videos.map((video) => {
            const badge = getSourceBadge(video.provider, video.sourceName);
            const assessed = video.assessedGoals?.find(g => g.goalId === id);
            return (
              <div 
                key={video.id} 
                onClick={() => navigate(`/teacher/videos/${encodeURIComponent(video.id)}`)}
                className="flex flex-col sm:flex-row gap-4 sm:gap-6 p-4 bg-white border border-zinc-200 rounded-xl hover:shadow-md cursor-pointer transition-all group"
              >
                {/* Thumbnail */}
                <div className="relative w-full sm:w-48 aspect-video rounded-lg overflow-hidden bg-zinc-100 shrink-0 border border-zinc-200">
                  <img src={video.thumbnailUrl} onError={(e) => { e.currentTarget.src = "https://images.unsplash.com/photo-1610484826967-09c57207009e?auto=format&fit=crop&q=80&w=800"; }} alt={video.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute inset-0 bg-black/10 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                    {badge.icon.type === PlayCircle ? <PlayCircle className="w-8 h-8 text-white/90 drop-shadow flex-shrink-0" /> : <Globe className="w-8 h-8 text-white/90 drop-shadow flex-shrink-0" />}
                  </div>
                  {video.duration && video.duration !== 'Web/Bron' && (
                    <div className="absolute bottom-1.5 right-1.5 bg-black/80 text-white text-[10px] font-mono px-1.5 py-0.5 rounded">
                      {video.duration}
                    </div>
                  )}
                </div>

                {/* Data */}
                <div className="flex flex-col flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4 mb-1">
                    <h3 className="text-base sm:text-lg font-semibold text-zinc-900 line-clamp-2 leading-tight group-hover:text-emerald-700 transition-colors">{video.title}</h3>
                  </div>
                  
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs sm:text-sm text-zinc-500">
                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded font-medium border ${badge.bg} ${badge.text} ${badge.border}`}>
                      {badge.icon}
                      {badge.label}
                    </span>
                    <span className="w-1 h-1 rounded-full bg-zinc-300"></span>
                    <span>{video.origin === 'manual' ? 'Handmatig toegevoegd' : 'Automatische match'}</span>
                  </div>

                  <div className="mt-auto pt-4 flex flex-wrap items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-200">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Goedgekeurd door docent
                    </span>
                    {assessed && (
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono uppercase text-zinc-400 tracking-wider">Sterkte:</span>
                        <span className="text-sm font-semibold text-zinc-700">{assessed.matchScore}%</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          {videos.length === 0 && (
             <div className="p-8 sm:p-12 text-center bg-zinc-50 border border-zinc-200 rounded-xl border-dashed">
               <h3 className="text-zinc-900 font-medium mb-2">Nog geen goedgekeurd lesmateriaal.</h3>
               <p className="text-zinc-500 text-sm mb-6 max-w-sm mx-auto">
                 Er zijn nog geen materialen goedgekeurd voor dit kerndoel. Start hieronder de automatische suggesties of importeer zelf een link.
               </p>
             </div>
          )}
        </div>
      </div>

      {/* Discovery Section */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-zinc-900 border-b-2 border-slate-200 pb-1 inline-block">Nieuwe suggesties zoeken</h2>
        
        {/* Live Search Form */}
        <div className="bg-white border border-zinc-200 rounded-xl p-6 shadow-sm">
          <p className="text-sm text-zinc-500 mb-6 max-w-2xl">
            Vind direct nieuw materiaal voor dit doel. Gebruik de automatische zoeker over alle beschikbare bronnen, of voeg handmatig een video of artikel toe via een link.
          </p>
          
          <div className="flex flex-col md:flex-row gap-6 mb-8">
            <button 
              onClick={handleDiscovery}
              disabled={isDiscovering}
              className="w-full md:w-1/2 px-6 py-4 bg-zinc-900 text-white rounded-xl text-sm font-medium hover:bg-zinc-800 disabled:opacity-50 flex items-center justify-center gap-3 transition-colors shadow-sm"
            >
              {isDiscovering ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
              Genereer 12 suggesties (Automatisch)
            </button>
          </div>

          <div className="relative border-t border-zinc-100 pt-6">
            <span className="absolute -top-3 left-6 bg-white px-2 text-xs font-medium text-zinc-400">Of zoek handmatig</span>
            <form 
              onSubmit={(e) => { e.preventDefault(); handleLiveSearch(); }}
              className="flex flex-col sm:flex-row gap-3"
            >
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Zoekterm of plak een link (bijv. Wikiwijs of YouTube)" 
                  className="w-full pl-12 pr-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:bg-white transition-all text-sm text-zinc-900"
                />
              </div>
              <div className="w-full sm:w-48 shrink-0">
                 <select
                   className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:bg-white transition-all text-sm text-zinc-700"
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
                className="w-full sm:w-auto px-6 py-3 bg-white border border-zinc-300 text-zinc-700 rounded-xl text-sm font-medium hover:bg-zinc-50 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors whitespace-nowrap shadow-sm shrink-0"
              >
                {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                Zoeken
              </button>
            </form>
          </div>
        </div>

        {/* Discovery Results */}
        {discoveryCandidates && discoveryCandidates.length > 0 && (
          <div className="space-y-4 mt-6">
            <h3 className="text-lg font-medium text-zinc-900">Automatische Resultaten</h3>
            <div className="grid grid-cols-1 gap-4">
              {discoveryCandidates.map((candidate, idx) => {
                const sLabel = getScoreLabel(candidate.matchScore || 0);
                const badge = getSourceBadge(candidate.provider, candidate.sourceName);
                
                return (
                  <div key={idx} className="flex flex-col md:flex-row gap-6 p-5 bg-white border border-zinc-200 rounded-xl shadow-sm relative overflow-hidden group">
                    {/* Thumbnail */}
                    <div className="relative w-full md:w-56 aspect-video rounded-lg overflow-hidden bg-zinc-100 shrink-0 border border-zinc-200">
                      <img src={candidate.thumbnailUrl} onError={(e) => { e.currentTarget.src = "https://images.unsplash.com/photo-1610484826967-09c57207009e?auto=format&fit=crop&q=80&w=800"; }} alt={candidate.title} className="w-full h-full object-cover" />
                      {candidate.duration && candidate.duration !== 'Web/Bron' && (
                        <div className="absolute bottom-1.5 right-1.5 bg-black/80 text-white text-[10px] font-mono px-1.5 py-0.5 rounded">
                          {candidate.duration}
                        </div>
                      )}
                    </div>
                    {/* Data */}
                    <div className="flex flex-col flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded font-medium border text-xs ${badge.bg} ${badge.text} ${badge.border}`}>
                          {badge.icon}
                          {badge.label}
                        </span>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border ${sLabel.bg} ${sLabel.color} ${sLabel.border}`}>
                          {candidate.matchScore}% - {sLabel.label}
                        </span>
                      </div>
                      
                      <h4 className="text-base font-semibold text-zinc-900 leading-tight mb-2 line-clamp-2">{candidate.title}</h4>
                      
                      <div className="text-sm bg-zinc-50 p-3 rounded-lg border border-zinc-100 mb-4 mt-auto">
                        <p className="font-medium text-zinc-700 text-xs mb-1 uppercase tracking-wider">Waarom gevonden?</p>
                        <p className="text-zinc-600 line-clamp-3">{candidate.matchReason}</p>
                        {candidate.matchEvidence && candidate.matchEvidence.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {candidate.matchEvidence.map((ev: string, i: number) => (
                              <span key={i} className="bg-white border border-zinc-200 text-zinc-500 text-[10px] px-1.5 py-0.5 rounded">{ev}</span>
                            ))}
                          </div>
                        )}
                      </div>
                      
                      <div className="mt-2 self-end">
                        <button 
                          onClick={() => handleSendToReview(candidate)}
                          className="px-4 py-2 bg-zinc-900 text-white rounded-lg text-sm font-medium hover:bg-zinc-800 transition-colors shadow-sm"
                        >
                          Naar review sturen
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        
        {discoveryCandidates && discoveryCandidates.length === 0 && (
          <div className="p-8 text-center bg-zinc-50 border border-zinc-200 rounded-xl rounded-dashed">
            <p className="text-zinc-600 font-medium mb-1">Geen sterke suggesties gevonden.</p>
            <p className="text-sm text-zinc-500">Probeer handmatig te zoeken of gebruik een praktijkvoorbeeld uit de SLO-data hierboven.</p>
          </div>
        )}

        {/* Live Manual Results */}
        {liveResults && (
          <div className="space-y-4 mt-6">
            <h3 className="text-lg font-medium text-zinc-900">Handmatige Resultaten</h3>
            {liveResults.length === 0 ? (
              <div className="p-8 text-center bg-zinc-50 border border-zinc-200 rounded-xl">
                <p className="text-zinc-600 font-medium">Niets gevonden voor "{searchQuery}".</p>
                <p className="text-sm text-zinc-500">Controleer de zoekterm of de link en probeer het opnieuw.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {liveResults.map((candidate, idx) => {
                  const sLabel = getScoreLabel(candidate.matchScore || 0);
                  const badge = getSourceBadge(candidate.provider, candidate.sourceName);
                  
                  return (
                    <div key={idx} className="flex flex-col md:flex-row gap-6 p-5 bg-white border border-zinc-200 rounded-xl shadow-sm relative overflow-hidden group">
                      {/* Thumbnail */}
                      <div className="relative w-full md:w-56 aspect-video rounded-lg overflow-hidden bg-zinc-100 shrink-0 border border-zinc-200">
                        <img src={candidate.thumbnailUrl} onError={(e) => { e.currentTarget.src = "https://images.unsplash.com/photo-1610484826967-09c57207009e?auto=format&fit=crop&q=80&w=800"; }} alt={candidate.title} className="w-full h-full object-cover" />
                        {candidate.duration && candidate.duration !== 'Web/Bron' && (
                          <div className="absolute bottom-1.5 right-1.5 bg-black/80 text-white text-[10px] font-mono px-1.5 py-0.5 rounded">
                            {candidate.duration}
                          </div>
                        )}
                      </div>
                      {/* Data */}
                      <div className="flex flex-col flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded font-medium border text-xs ${badge.bg} ${badge.text} ${badge.border}`}>
                            {badge.icon}
                            {badge.label}
                          </span>
                          {candidate.matchScore > 0 && (
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border ${sLabel.bg} ${sLabel.color} ${sLabel.border}`}>
                              {candidate.matchScore}% - {sLabel.label}
                            </span>
                          )}
                        </div>
                        
                        <h4 className="text-base font-semibold text-zinc-900 leading-tight mb-2 line-clamp-2">{candidate.title}</h4>
                        
                        {candidate.matchReason && (
                          <div className="text-sm bg-zinc-50 p-3 rounded-lg border border-zinc-100 mb-4 mt-auto">
                            <p className="font-medium text-zinc-700 text-xs mb-1 uppercase tracking-wider">Waarom gevonden?</p>
                            <p className="text-zinc-600 line-clamp-3">{candidate.matchReason}</p>
                          </div>
                        )}
                        
                        <div className="mt-auto pt-4 self-end flex gap-3">
                          <button 
                            onClick={() => window.open(candidate.sourceUrl || `https://youtube.com/watch?v=${candidate.videoId}`, '_blank')}
                            className="px-4 py-2 bg-white border border-zinc-200 text-zinc-700 rounded-lg text-sm font-medium hover:bg-zinc-50 transition-colors"
                          >
                            Bekijk bron
                          </button>
                          <button 
                            onClick={() => handleSendToReview(candidate)}
                            className="px-4 py-2 bg-zinc-900 text-white rounded-lg text-sm font-medium hover:bg-zinc-800 transition-colors shadow-sm"
                          >
                            Naar review sturen
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

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
