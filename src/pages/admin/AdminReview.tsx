import { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, query, where, getDocs, doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { Loader2, Video, Bot, CheckCircle, Search, ThumbsUp, XCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

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
  const [assessment, setAssessment] = useState<{score: number, feedback: string} | null>(null);
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
        const q = query(collection(db, "videos"), where("status", "==", "pending"));
        const snap = await getDocs(q);
        const vids: any[] = [];
        snap.forEach(d => vids.push(d.data()));
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
      const resp = await fetch('/api/ai/assess', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ video: selectedVideo, goal })
      });
      if (resp.ok) {
        const result = await resp.json();
        setAssessment(result);
      } else {
        alert("Kon de AI Beoordeling niet uitvoeren.");
      }
    } catch(e) {
      console.error(e);
    }
    setIsAssessing(false);
  };

  const handleDecide = async (decision: 'approved' | 'rejected') => {
    if (!selectedVideo) return;
    setIsSaving(true);
    try {
      const ref = doc(db, "videos", selectedVideo.videoId);
      
      const payload: any = { status: decision };
      if (assessment && selectedGoalId && decision === 'approved') {
        payload.assessedGoals = arrayUnion({
          goalId: selectedGoalId,
          matchScore: assessment.score,
          aiFeedback: assessment.feedback,
          assessedAt: new Date().toISOString()
        });
      }

      await updateDoc(ref, payload);
      
      // Remove from visual list
      setPendingVideos(prev => prev.filter(v => v.videoId !== selectedVideo.videoId));
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
     return <div className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin inline mx-auto"/></div>
  }

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">AI Keurmeester</h1>
        <p className="text-zinc-500 mt-1">Beoordeel opgeslagen video's met AI-ondersteuning, koppel ze aan een SLO kerndoel en sla ze lokaal op voor docenten.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Pending Queue */}
        <div className="lg:col-span-5 bg-white border border-zinc-200 rounded-xl shadow-sm overflow-hidden flex flex-col h-[700px]">
          <div className="p-4 border-b border-zinc-200 bg-zinc-50">
            <h2 className="font-semibold text-zinc-900">Wachtrij Database ({pendingVideos.length})</h2>
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-zinc-100">
            {pendingVideos.length === 0 ? (
              <div className="p-8 text-center text-zinc-500 text-sm">
                Geen video's in de wachtrij. Gebruik de Pre-Scraper om video's klaar te zetten.
              </div>
            ) : pendingVideos.map(video => (
              <div 
                key={video.videoId} 
                className={`p-4 cursor-pointer hover:bg-zinc-50 transition-colors flex gap-4 ${selectedVideo?.videoId === video.videoId ? 'bg-blue-50/50 border-l-4 border-blue-500 pl-3' : 'border-l-4 border-transparent'}`}
                onClick={() => {
                  setSelectedVideo(video); 
                  setAssessment(null);
                  setSelectedGoalId(''); // Reset goal selection
                }}
              >
                <img src={video.thumbnailUrl} className="w-20 h-auto rounded object-cover" />
                <div>
                  <div className="text-sm font-semibold text-zinc-900 line-clamp-2">{video.title}</div>
                  <div className="text-xs text-zinc-500 mt-1">{video.channelTitle}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: AI Assessor */}
        <div className="lg:col-span-7">
          {!selectedVideo ? (
            <div className="bg-zinc-50 border border-zinc-200 rounded-xl shadow-sm h-full flex flex-col items-center justify-center p-8 text-center text-zinc-500 border-dashed">
              <Video className="w-12 h-12 mb-4 text-zinc-300" />
              <p>Selecteer een video uit de wachtrij om de beoordeling te starten.</p>
            </div>
          ) : (
            <div className="bg-white border border-zinc-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
              <div className="p-6 border-b border-zinc-200">
                <div className="flex gap-4">
                  <div className="flex-1 min-w-0">
                    <h2 className="text-xl font-semibold text-zinc-900">{selectedVideo.title}</h2>
                    <p className="text-sm text-zinc-500 mt-1">Door {selectedVideo.channelTitle}</p>
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-6">
                
                {/* Doel Selectie */}
                <div>
                  <label className="block text-sm font-medium text-zinc-900 mb-2">1. Kies het gewenste SLO Kerndoel</label>
                  <select 
                    value={selectedGoalId} 
                    onChange={e => setSelectedGoalId(e.target.value)}
                    className="w-full p-3 border border-zinc-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900"
                  >
                    <option value="">-- Selecteer een doel --</option>
                    {goals.map(g => (
                      <option key={g.id} value={g.id}>{g.id}: {g.subject} - {g.sentence?.substring(0, 50)}...</option>
                    ))}
                  </select>
                </div>

                {/* AI Actie Knop */}
                <button 
                  onClick={handleAssessAI}
                  disabled={!selectedGoalId || isAssessing}
                  className="w-full p-4 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg font-medium flex items-center justify-center gap-2 disabled:opacity-50 transition-colors"
                >
                  {isAssessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Bot className="w-5 h-5" />}
                  Laat Gemini AI dit evalueren
                </button>

                {/* AI Result */}
                {assessment && (
                  <div className="bg-blue-50 border border-blue-100 rounded-xl p-6 mt-4 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-bl-full -mr-4 -mt-4" />
                    
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-16 h-16 rounded-full bg-white border-2 border-blue-200 flex items-center justify-center shadow-sm">
                        <span className={`text-2xl font-bold ${assessment.score > 70 ? 'text-emerald-600' : assessment.score > 40 ? 'text-amber-500' : 'text-red-500'}`}>
                          {assessment.score}
                        </span>
                      </div>
                      <div>
                        <div className="font-semibold text-blue-900">AI Match Score</div>
                        <div className="text-sm text-blue-700">Gebaseerd op officiële SLO matrices</div>
                      </div>
                    </div>
                    
                    <div className="text-sm text-blue-900/80 leading-relaxed bg-white/60 p-4 rounded-lg">
                      {assessment.feedback}
                    </div>

                    <div className="flex gap-4 mt-6">
                      <button 
                        onClick={() => handleDecide('approved')}
                        disabled={isSaving}
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white p-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                      >
                        {isSaving ? <Loader2 className="w-4 h-4 animate-spin"/> : <CheckCircle className="w-4 h-4"/>}
                        Vrijgeven voor Docenten
                      </button>
                      <button 
                        onClick={() => handleDecide('rejected')}
                        disabled={isSaving}
                        className="flex-1 bg-white border border-red-200 text-red-600 hover:bg-red-50 p-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                      >
                        <XCircle className="w-4 h-4" />
                        Afkeuren (Dump)
                      </button>
                    </div>

                  </div>
                )}
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
