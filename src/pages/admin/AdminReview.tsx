import { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, query, where, getDocs, doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { Loader2, Video, Bot, CheckCircle, Search, ThumbsUp, XCircle, Database, ShieldCheck, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import Select from 'react-select';

interface Goal {
  id: string;
  subject: string;
  domain: string;
  sentence: string;
  description: string;
  title?: string;
  item_code?: string;
}

export default function AdminReview() {
  const [pendingVideos, setPendingVideos] = useState<any[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedVideo, setSelectedVideo] = useState<any | null>(null);
  const [selectedGoalId, setSelectedGoalId] = useState<string>('');
  
  const [isAssessing, setIsAssessing] = useState(false);
  const [assessment, setAssessment] = useState<{score: number, feedback: string, fullAssessment?: any} | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  const navigate = useNavigate();

  useEffect(() => {
    // Haal kerndoelen op
    fetch('/api/goals')
      .then(r => r.json())
      .then(d => setGoals(d))
      .catch(e => console.error(e));

    // Haal queue (pending videos) uit de database
    const fetchPending = async () => {
      try {
        const { getPendingVideos } = await import('../../lib/firebase/videoRepository');
        const vids = await getPendingVideos();
        // If there's a link, pre-select the goalId
        setPendingVideos(vids);
      } catch(e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchPending();
  }, []);

  const handleAssessAI = async () => {
    if (!selectedVideo || !selectedGoalId) return;
    
    const goal = goals.find(g => g.id === selectedGoalId);
    if (!goal) return;

    setIsAssessing(true);
    setAssessment(null);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 25000); // 25s timeout for AI

      const resp = await fetch('/api/ai/assess', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ video: selectedVideo, goal }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      const data = await resp.json();
      if (resp.ok) {
        setAssessment(data);
      } else {
        alert(data.error || "Kon de AI Beoordeling niet uitvoeren.");
      }
    } catch(e: any) {
      console.error(e);
      if (e.name === 'AbortError') {
        alert("De AI heeft teveel tijd nodig om te antwoorden (Timeout).");
      } else {
        alert("Er is een netwerkfout opgetreden bij de AI assessment.");
      }
    }
    setIsAssessing(false);
  };

  const handleDecide = async (decision: 'approved' | 'rejected') => {
    if (!selectedVideo) return;
    setIsSaving(true);
    try {
      const { setDoc, updateDoc, doc, serverTimestamp } = await import('firebase/firestore');
      
      const currentUser = sessionStorage.getItem('databaas_name') || 'admin';
      const finalGoalId = selectedGoalId || selectedVideo.link?.goalId;
      
      if (!finalGoalId && decision === 'approved') {
        alert("Je moet een kerndoel kiezen om goed te keuren.");
        setIsSaving(false);
        return;
      }
      
      const videoId = selectedVideo.id || selectedVideo.firestoreId || selectedVideo.videoId;
      
      if (finalGoalId) {
        // We have a goalId, update or create video_goal_links
        const linkId = selectedVideo.link?.id || `${videoId}_${finalGoalId}`;
        const linkRef = doc(db, "video_goal_links", linkId);
        
        await setDoc(linkRef, {
          id: linkId,
          videoId: videoId,
          goalId: finalGoalId,
          status: decision,
          reviewedAt: serverTimestamp(),
          reviewedBy: currentUser,
          updatedAt: serverTimestamp(),
          ...(decision === 'approved' && assessment ? {
            matchScore: assessment.score,
            sloAlignment: assessment.fullAssessment || null
          } : {}),
          ...(decision === 'rejected' ? {
            rejectReason: "Handmatig afgekeurd in review"
          } : {})
        }, { merge: true });
      }
      
      // Also update the video document itself if it was standalone pending
      if (selectedVideo.status === 'pending') {
         await updateDoc(doc(db, "videos", videoId), {
           status: decision === 'approved' ? 'reviewed' : 'rejected',
           updatedAt: serverTimestamp()
         });
      }
      
      // Remove from visual list
      setPendingVideos(prev => prev.filter(v => 
        (v.link?.id && selectedVideo.link?.id && v.link.id === selectedVideo.link.id) || 
        (!v.link && v.id === selectedVideo.id)
      ));
      
      setSelectedVideo(null);
      setAssessment(null);
      setSelectedGoalId('');
      
    } catch (e) {
      console.error(e);
      alert("Fout bij opslaan.");
    }
    setIsSaving(false);
  };

  if (loading) {
     return (
       <div className="flex-1 min-h-[50vh] flex flex-col items-center justify-center">
         <Loader2 className="w-8 h-8 animate-spin text-zinc-400 mb-4"/>
         <p className="text-sm font-medium text-zinc-500">Wachtrij ophalen...</p>
       </div>
     );
  }

  return (
    <div className="w-full bg-zinc-50/50 pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-zinc-200">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-white border border-zinc-200 rounded-2xl flex items-center justify-center shadow-sm">
                 <ShieldCheck className="w-6 h-6 text-zinc-900" />
              </div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-zinc-900">Beoordelingsomgeving</h1>
            </div>
             <p className="text-zinc-500 text-sm max-w-2xl leading-relaxed">
              Beoordeel opgeslagen bronnen, koppel ze aan kerndoelen en keur ze goed voor docentengebruik.
            </p>
            {sessionStorage.getItem('databaas_name') && (
               <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 bg-indigo-50 border border-indigo-100 rounded-lg shadow-sm">
                 <div className="w-2 h-2 rounded-full bg-indigo-500" />
                 <span className="text-xs font-semibold text-indigo-800">
                   Actief als: {sessionStorage.getItem('databaas_name')}
                 </span>
               </div>
            )}
          </div>
          <div className="flex">
             <button 
              onClick={() => navigate('/admin')}
              className="px-5 py-2.5 bg-white border border-zinc-200 hover:border-zinc-300 text-zinc-700 hover:text-zinc-900 rounded-xl text-sm font-semibold transition-all shadow-sm flex items-center gap-2"
            >
              Terug naar Beheersysteem
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: Pending Queue */}
          <div className="lg:col-span-4 bg-white border border-zinc-200 rounded-2xl shadow-sm overflow-hidden flex flex-col h-auto lg:h-[700px]">
            <div className="px-6 py-5 border-b border-zinc-100 bg-zinc-50/50 flex items-center justify-between">
              <h2 className="font-semibold text-zinc-900">Wachtrij</h2>
              <span className="text-xs font-bold bg-amber-100 text-amber-800 px-2.5 py-1 rounded-md">{pendingVideos.length} Items</span>
            </div>
            <div className="flex-1 overflow-y-auto min-h-[300px] max-h-[600px] lg:max-h-full">
              {pendingVideos.length === 0 ? (
                <div className="p-8 text-center text-zinc-500 text-sm flex flex-col items-center justify-center h-full">
                  <CheckCircle className="w-10 h-10 text-zinc-300 mb-3" />
                  <p className="font-medium text-zinc-900 mb-1">Geen items in de wachtrij.</p>
                  <p className="text-xs">Nieuwe suggesties verschijnen hier zodra iemand materiaal naar review stuurt.</p>
                </div>
              ) : pendingVideos.map(video => (
                <div 
                  key={video.videoId} 
                  className={`p-4 cursor-pointer hover:bg-zinc-50 transition-colors flex gap-4 border-b border-zinc-100 last:border-0 ${selectedVideo?.videoId === video.videoId ? 'bg-blue-50/30' : ''}`}
                  onClick={() => {
                    setSelectedVideo(video); 
                    setAssessment(null);
                    setSelectedGoalId(video.link?.goalId || '');
                  }}
                >
                  <div className="w-20 h-14 bg-zinc-100 rounded-lg overflow-hidden relative shrink-0 border border-zinc-200 shadow-sm">
                    <img src={video.thumbnailUrl} onError={(e) => { e.currentTarget.src = "https://images.unsplash.com/photo-1610484826967-09c57207009e?auto=format&fit=crop&q=80&w=800"; }} className="absolute inset-0 w-full h-full object-cover" alt="" />
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent h-6" />
                    {video.sourceType === 'website' && (
                      <Database className="w-4 h-4 text-white absolute bottom-1 right-1" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <div className={`text-sm font-semibold mb-1 line-clamp-2 ${selectedVideo?.videoId === video.videoId ? 'text-blue-700' : 'text-zinc-900'}`}>{video.title}</div>
                    <div className="flex items-center gap-2">
                       <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${video.origin === 'manual' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                         {video.origin === 'manual' ? 'Handmatig' : 'Bot'}
                       </span>
                       <div className="text-[10px] uppercase tracking-wider text-zinc-500 truncate font-medium">{video.channelTitle}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: AI Assessor */}
          <div className="lg:col-span-8 space-y-6">
            {!selectedVideo ? (
              <div className="bg-white border-2 border-dashed border-zinc-200 rounded-3xl h-[400px] lg:h-[700px] flex flex-col items-center justify-center p-8 text-center text-zinc-500 shadow-sm">
                <div className="w-16 h-16 bg-zinc-50 rounded-full flex items-center justify-center border border-zinc-100 mb-4 shadow-sm">
                   <Video className="w-8 h-8 text-zinc-300" />
                </div>
                <h3 className="text-lg font-semibold text-zinc-900 mb-2">Selecteer een Bron</h3>
                <p className="max-w-md mx-auto text-sm">Klik op een item uit de wachtrij aan de linkerkant om de video of het artikel te beoordelen.</p>
              </div>
            ) : (
              <div className="bg-white border border-zinc-200 rounded-3xl shadow-sm overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
                
                <div className="px-6 py-5 border-b border-zinc-100 bg-zinc-50/50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 bg-zinc-100 px-2 py-0.5 rounded flex items-center gap-1">
                      {selectedVideo.provider === 'youtube' ? <Video className="w-3 h-3" /> : <Database className="w-3 h-3"/>}
                      {selectedVideo.sourceName || 'Bron'} • Herkomst: {selectedVideo.origin === 'manual' ? 'Handmatig' : 'Automatisch'}
                    </span>
                    <span className="text-[10px] font-mono text-zinc-400 truncate max-w-[150px]">ID: {selectedVideo.id}</span>
                  </div>
                  <h2 className="text-lg font-bold text-zinc-900 leading-snug">{selectedVideo.title}</h2>
                  <p className="text-sm font-medium text-zinc-500 mt-1 flex items-center gap-1.5">
                    {selectedVideo.channelTitle || selectedVideo.sourceName}
                  </p>
                  
                  {(selectedVideo.matchReason || selectedVideo.goalSnapshot) && (
                    <div className="mt-4 p-3 bg-emerald-50 border border-emerald-100 rounded-lg">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm text-emerald-800 font-semibold">Waarom gevonden (Score: {selectedVideo.matchScore}%)</p>
                        {selectedVideo.goalSnapshot && (
                           <span className="text-[10px] bg-emerald-100 text-emerald-700 font-semibold px-2 py-0.5 rounded">Kerndoel: {selectedVideo.goalSnapshot.id}</span>
                        )}
                      </div>
                      <p className="text-xs text-emerald-700 leading-relaxed mb-2">{selectedVideo.matchReason}</p>
                      {selectedVideo.goalSnapshot && (
                         <p className="text-[11px] text-emerald-800 font-medium italic p-2 bg-white/50 rounded inline-block">"{selectedVideo.goalSnapshot.sentence}"</p>
                      )}
                      {selectedVideo.matchEvidence && selectedVideo.matchEvidence.length > 0 && (
                        <div className="mt-2 text-[10px] text-emerald-600/80 font-mono flex gap-1 flex-wrap">
                          <span className="uppercase font-bold mr-1 block w-full">Bewijs:</span>
                          {selectedVideo.matchEvidence.map((ev: string, i: number) => (
                             <span key={i} className="bg-emerald-100/50 border border-emerald-200/50 px-1.5 rounded">{ev}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Player/Preview */}
                {selectedVideo.provider === 'web' || selectedVideo.sourceType === 'website' || selectedVideo.duration === 'Web/Bron' ? (
                  <div className="aspect-video bg-zinc-50 flex flex-col items-center justify-center relative p-8 text-center border-b border-zinc-200">
                     <img src={selectedVideo.thumbnailUrl} onError={(e) => { e.currentTarget.src = "https://images.unsplash.com/photo-1610484826967-09c57207009e?auto=format&fit=crop&q=80&w=800"; }} className="absolute inset-0 w-full h-full object-cover opacity-10 pointer-events-none" alt="" />
                     <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mb-4 z-10 border border-zinc-200">
                       <Database className="w-8 h-8 text-zinc-400" />
                     </div>
                     <h3 className="text-zinc-900 font-bold text-lg z-10 mb-2">Webbron: {selectedVideo.sourceName}</h3>
                     <p className="text-sm text-zinc-600 z-10 max-w-md mx-auto mb-6">Dit materiaal bevindt zich op een externe website. Controleer de inhoud voor educatieve geschiktheid.</p>
                     <div className="flex gap-3 z-10">
                        <a href={selectedVideo.sourceUrl || selectedVideo.videoId} target="_blank" rel="noopener noreferrer" className="px-6 py-3 bg-zinc-900 text-white rounded-xl shadow-sm font-semibold hover:bg-zinc-800 transition-colors flex items-center gap-2">
                          Open Bron <ChevronRight className="w-4 h-4 opacity-70" />
                        </a>
                     </div>
                  </div>
                ) : (
                  <div className="flex flex-col border-b border-zinc-200">
                    <div className="aspect-video bg-black flex flex-col items-center justify-center text-zinc-500 relative">
                      <iframe 
                        className="w-full h-full"
                        src={`https://www.youtube.com/embed/${selectedVideo.videoId.includes('youtube.com') || selectedVideo.videoId.includes('youtu.be') ? (selectedVideo.videoId.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i)?.[1] || selectedVideo.videoId) : selectedVideo.videoId}?origin=${window.location.origin}`} 
                        title="YouTube video player" 
                        frameBorder="0" 
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                        allowFullScreen>
                      </iframe>
                    </div>
                  </div>
                )}

                <div className="p-6 md:p-8 space-y-8 bg-white">
                  
                  {/* Step 1: Goal */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-6 h-6 rounded-full bg-zinc-100 flex items-center justify-center text-xs font-bold text-zinc-900 border border-zinc-200">1</div>
                      <h3 className="text-sm font-bold text-zinc-900">Kies het SLO kerndoel</h3>
                    </div>
                    <Select 
                      value={goals.map(g => ({ value: g.id, label: `${g.id}: ${g.subject} - ${g.sentence}` })).find(o => o.value === selectedGoalId) || null} 
                      onChange={(option: any) => setSelectedGoalId(option?.value || '')}
                      options={goals.map(g => ({ value: g.id, label: `${g.id}: ${g.subject} - ${g.sentence}` }))}
                      placeholder="-- Selecteer het best passende leerdoel of tag --"
                      isSearchable
                      menuPosition="fixed"
                      styles={{
                        control: (baseStyles, state) => ({
                          ...baseStyles,
                          borderColor: state.isFocused ? '#18181b' : '#e4e4e7',
                          borderRadius: '0.75rem',
                          padding: '0.25rem',
                          backgroundColor: state.isFocused ? '#ffffff' : '#fafafa',
                          boxShadow: state.isFocused ? '0 0 0 2px rgba(24, 24, 27, 0.2)' : '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                          '&:hover': {
                            borderColor: state.isFocused ? '#18181b' : '#d4d4d8'
                          }
                        }),
                        option: (baseStyles, state) => ({
                          ...baseStyles,
                          backgroundColor: state.isSelected ? '#18181b' : state.isFocused ? '#f4f4f5' : '#ffffff',
                          color: state.isSelected ? '#ffffff' : '#18181b',
                          cursor: 'pointer',
                          padding: '0.75rem 1rem',
                        }),
                        menu: (baseStyles) => ({
                          ...baseStyles,
                          borderRadius: '0.75rem',
                          overflow: 'hidden',
                          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                          border: '1px solid #e4e4e7',
                          zIndex: 9999
                        }),
                        menuPortal: base => ({ ...base, zIndex: 9999 })
                      }}
                    />
                  </div>

                  {/* Step 2: AI */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-6 h-6 rounded-full bg-zinc-100 flex items-center justify-center text-xs font-bold text-zinc-900 border border-zinc-200">2</div>
                      <h3 className="text-sm font-bold text-zinc-900">Inhoudelijke controle</h3>
                    </div>
                    
                    <div className="bg-zinc-50 p-5 rounded-2xl border border-zinc-200">
                      <p className="text-sm text-zinc-600 mb-4 max-w-xl">Laat de AI controleren of de gekozen bron goed aansluit bij het gezochte SLO kerndoel. Verwacht een inhoudelijke analyse.</p>
                      
                      <button 
                        onClick={handleAssessAI}
                        disabled={!selectedGoalId || isAssessing}
                        className="px-6 py-3 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-50 transition-colors text-sm shadow-sm"
                      >
                        {isAssessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Bot className="w-5 h-5" />}
                        {isAssessing ? 'Aansluiting wordt gecontroleerd...' : 'Controleer aansluiting'}
                      </button>

                      {assessment && (
                        <div className="mt-5 p-5 bg-white border border-zinc-200 rounded-xl shadow-sm animate-in slide-in-from-top-2">
                          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-4">
                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-bold text-xl border ${assessment.score > 70 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : assessment.score > 40 ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                              {assessment.score}%
                            </div>
                            <div>
                              <div className="font-bold text-zinc-900">Compatibiliteitsscore</div>
                              <div className="text-xs font-medium text-zinc-500 mt-0.5">SLO Inhoudelijke match</div>
                            </div>
                          </div>
                          
                          <div className="text-sm text-zinc-700 leading-relaxed text-justify whitespace-pre-wrap">
                            {assessment.feedback}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Step 3: Decision */}
                  <div className="pt-6 border-t border-zinc-200 space-y-4">
                     <div className="flex items-center gap-2 mb-1">
                      <div className="w-6 h-6 rounded-full bg-zinc-100 flex items-center justify-center text-xs font-bold text-zinc-900 border border-zinc-200">3</div>
                      <h3 className="text-sm font-bold text-zinc-900">Eindbeslissing</h3>
                    </div>
                    <p className="text-sm text-zinc-600 mb-4 max-w-xl">
                      Kies eerst een kerndoel om goed te keuren en te koppelen. Afgekeurde items verdwijnen uit de wachtrij en worden niet getoond aan docenten. De reviewer neemt de eindbeslissing.
                    </p>
                     
                     <div className="flex flex-col sm:flex-row gap-3">
                        <button 
                          onClick={() => handleDecide('approved')}
                          disabled={isSaving || !selectedGoalId}
                          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-3.5 px-4 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-50 text-sm shadow-sm"
                        >
                          {isSaving ? <Loader2 className="w-5 h-5 animate-spin"/> : <CheckCircle className="w-5 h-5"/>}
                          Goedkeuren
                        </button>
                        <button 
                          onClick={() => handleDecide('rejected')}
                          disabled={isSaving}
                          className="flex-1 bg-white border-2 border-zinc-200 text-zinc-700 hover:bg-zinc-50 py-3.5 px-4 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-50 text-sm"
                        >
                          <XCircle className="w-5 h-5" />
                          Afkeuren
                        </button>
                     </div>
                  </div>

                </div>
              </div>
            )}
          </div>

        </div>
      </div>


    </div>
  );
}
