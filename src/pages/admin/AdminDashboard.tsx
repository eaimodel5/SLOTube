import { useState, useEffect } from 'react';
import { Video, ShieldCheck, Search, Database, Loader2, Save, ChevronRight, Wand2, Link as LinkIcon, Plus, UserPlus, Key, PlayCircle, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { db } from '../../lib/firebase';
import { collection, doc, setDoc, getDocs, serverTimestamp, deleteDoc } from 'firebase/firestore';
import Select from 'react-select';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [isCrawling, setIsCrawling] = useState(false);
  const [crawlQuery, setCrawlQuery] = useState("");
  const [crawlResults, setCrawlResults] = useState<any[]>([]);
  const [savedCount, setSavedCount] = useState(0);
  const [playingVideoId, setPlayingVideoId] = useState<string | null>(null);
  const [dbStats, setDbStats] = useState({ total: 0, pending: 0, approved: 0 });
  const [recentPending, setRecentPending] = useState<any[]>([]);
  const [recentApproved, setRecentApproved] = useState<any[]>([]);

  const [databaasCodes, setDatabaasCodes] = useState<any[]>([]);
  const [newCodeName, setNewCodeName] = useState('');
  const [newCodeValue, setNewCodeValue] = useState('');
  const [isAddingCode, setIsAddingCode] = useState(false);

  const [admins, setAdmins] = useState<any[]>([]);
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [newAdminName, setNewAdminName] = useState('');
  const [isAddingAdmin, setIsAddingAdmin] = useState(false);

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
             className="w-full h-full object-cover opacity-80" 
           />
        ) : (
           <div className="flex flex-col items-center justify-center text-zinc-400">
             {isWeb ? <FileText className="w-8 h-8 mb-2 opacity-50" /> : <PlayCircle className="w-8 h-8 mb-2 opacity-50" />}
             <span className="text-[10px] font-medium uppercase tracking-widest">{isWeb ? 'Website' : 'Video'}</span>
           </div>
        )}
      </div>
    );
  };

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const snap = await getDocs(collection(db, 'video_goal_links'));
        let pending = 0;
        let approved = 0;
        const pendingLinks: any[] = [];
        const approvedLinks: any[] = [];
        
        snap.forEach(d => {
          const data = d.data();
          if (data.status === 'pending') {
            pending++;
            pendingLinks.push(data);
          }
          if (data.status === 'approved') {
            approved++;
            approvedLinks.push(data);
          }
        });
        
        pendingLinks.sort((a, b) => {
          const d1 = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
          const d2 = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
          return d2 - d1;
        });

        approvedLinks.sort((a, b) => {
          const d1 = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
          const d2 = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
          return d2 - d1;
        });
        
        // Fetch actual videos for top links
        const topPendingLinks = pendingLinks.slice(0, 3);
        const topApprovedLinks = approvedLinks.slice(0, 5);
        
        const videoSnap = await getDocs(collection(db, 'videos'));
        const videosMap = new Map();
        videoSnap.forEach(d => videosMap.set(d.id, { id: d.id, ...d.data() }));

        const pendingDocs = topPendingLinks.map(l => ({ ...videosMap.get(l.videoId), link: l })).filter(v => v.id);
        const approvedDocs = topApprovedLinks.map(l => ({ ...videosMap.get(l.videoId), link: l })).filter(v => v.id);

        setDbStats({ total: videoSnap.size, pending, approved });
        setRecentPending(pendingDocs);
        setRecentApproved(approvedDocs);
      } catch (e) {
        console.error(e);
      }
    };
    fetchStats();
  }, [savedCount]);

  useEffect(() => {
    const fetchDatabaasCodes = async () => {
      try {
        const snap = await getDocs(collection(db, 'databaas_codes'));
        const codes: any[] = [];
        snap.forEach(d => {
          codes.push({ id: d.id, ...d.data() });
        });
        setDatabaasCodes(codes);
      } catch (e) {
        console.error("Error fetching databaas codes", e);
      }
    };
    fetchDatabaasCodes();
  }, [isAddingCode]);

  useEffect(() => {
    const fetchAdmins = async () => {
      try {
        const snap = await getDocs(collection(db, 'admins'));
        const adminList: any[] = [];
        snap.forEach(d => {
          adminList.push({ id: d.id, ...d.data() });
        });
        setAdmins(adminList);
      } catch (e) {
        console.error("Error fetching admins", e);
      }
    };
    fetchAdmins();
  }, [isAddingAdmin]);

  const handleAddDatabaasCode = async (e: any) => {
    e.preventDefault();
    if (!newCodeName || !newCodeValue) return;
    setIsAddingCode(true);
    try {
      await setDoc(doc(collection(db, "databaas_codes")), {
        name: newCodeName,
        code: newCodeValue,
        createdAt: serverTimestamp()
      });
      setNewCodeName('');
      setNewCodeValue('');
    } catch (error) {
      console.error(error);
      alert("Error opslaan code");
    } finally {
      setIsAddingCode(false);
    }
  };

  const handleAddAdmin = async (e: any) => {
    e.preventDefault();
    if (!newAdminEmail || !newAdminPassword || !newAdminName) return;
    setIsAddingAdmin(true);
    try {
      await setDoc(doc(collection(db, "admins")), {
        email: newAdminEmail.trim().toLowerCase(),
        password: newAdminPassword,
        name: newAdminName,
        createdAt: serverTimestamp()
      });
      setNewAdminEmail('');
      setNewAdminPassword('');
      setNewAdminName('');
    } catch (error) {
      console.error(error);
      alert("Error opslaan beheerder");
    } finally {
      setIsAddingAdmin(false);
    }
  };

  const STATS = [
    { label: 'Totaal in Systeem', value: dbStats.total, icon: Database, color: 'text-indigo-600', bg: 'bg-indigo-50 border-indigo-100' },
    { label: 'Goedgekeurd', value: dbStats.approved, icon: ShieldCheck, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-100' },
    { label: 'Wachtlijst Review', value: dbStats.pending, icon: Loader2, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-100' },
  ];

  const handleDeleteApproved = async (id: string, e: any) => {
    e.stopPropagation();
    if (!window.confirm('Weet u zeker dat u dit goedgekeurde materiaal wilt verwijderen?')) return;
    try {
      await deleteDoc(doc(db, 'videos', id));
      setRecentApproved(prev => prev.filter(v => v.id !== id));
      setDbStats(s => ({ ...s, approved: s.approved - 1, total: s.total - 1 }));
    } catch(err) {
      alert('Delete failed');
    }
  };

  const handleCrawl = async () => {
    if (!crawlQuery) return;
    
    setIsCrawling(true);
    setCrawlResults([]);
    try {
      const isGenericUrl = (crawlQuery.startsWith('http://') || crawlQuery.startsWith('https://')) && !(crawlQuery.includes('youtube.com') || crawlQuery.includes('youtu.be'));
      
      const endpoint = isGenericUrl ? '/api/scrape' : '/api/youtube/search';
      const bodyData = isGenericUrl 
        ? { url: crawlQuery }
        : { queries: [crawlQuery], maxResultsPerQuery: 5 };

      const resp = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(bodyData)
      });
      const data = await resp.json();
      if (resp.ok) {
        setCrawlResults(data);
      } else {
        alert(data.error || "Fout bij het ophalen van de data. Controleer de API key.");
      }
    } catch (e) {
      console.error(e);
      alert("Er is iets misgegaan: " + e);
    }
    setIsCrawling(false);
  };

  const saveToDatabase = async (video: any) => {
    try {
      const docId = video.id || video.videoId;
      const docRef = doc(db, "videos", docId);
      await setDoc(docRef, {
        id: docId,
        videoId: video.videoId,
        title: video.title,
        channelTitle: video.channelTitle,
        description: video.description || "",
        duration: video.duration || "",
        publishedAt: video.publishedAt || new Date().toISOString(),
        thumbnailUrl: video.thumbnailUrl || "",
        status: "pending",
        origin: video.origin || "manual",
        addedAt: serverTimestamp(),
        addedBy: "admin", 
        matchScore: video.matchScore || 0,
        sourceType: video.sourceType || "youtube",
        updatedAt: serverTimestamp()
      }, { merge: true });
      
      setSavedCount(c => c + 1);
      
      // Remove from visual list
      setCrawlResults(prev => prev.filter(v => v.videoId !== video.videoId));
    } catch (e) {
      console.error(e);
      alert("Fout bij opslaan in Firebase: " + e);
    }
  };

  return (
    <div className="w-full bg-zinc-50/50 pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-zinc-200">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-zinc-900 rounded-2xl flex items-center justify-center shadow-md">
                 <Wand2 className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-zinc-900">Beheersysteem</h1>
            </div>
            <p className="text-zinc-500 text-sm max-w-2xl leading-relaxed">
              Importeer bronnen, bekijk de systeemanalyse en beheer keurmeestertoegang en review-wachtrijen centraal.
            </p>
          </div>
          <div className="flex gap-3">
             <button 
              onClick={() => navigate('/teacher')}
              className="px-5 py-2.5 bg-white border border-zinc-200 hover:border-zinc-300 text-zinc-700 hover:text-zinc-900 rounded-xl text-sm font-semibold transition-all shadow-sm flex items-center gap-2"
            >
              Naar Docentenportaal
            </button>
            <button 
              onClick={() => navigate('/admin/review')}
              className="px-5 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-sm font-semibold transition-all shadow-sm flex items-center gap-2 group"
            >
              <ShieldCheck className="w-4 h-4 text-white/70 group-hover:text-white transition-colors" />
              Start ReviewSessie
            </button>
          </div>
        </header>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {STATS.map(stat => (
            <div key={stat.label} className="bg-white p-6 border border-zinc-200 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${stat.bg}`}>
                  <stat.icon className={`w-6 h-6 ${stat.color}`} />
                </div>
              </div>
              <div>
                 <p className="text-3xl md:text-4xl font-bold text-zinc-900 tracking-tight">{stat.value}</p>
                 <p className="text-sm font-medium text-zinc-500 mt-1">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Main Content Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          
          {/* Main Column: Scraper */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
              <div className="px-6 py-5 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
                <div>
                  <h2 className="text-lg font-bold text-zinc-900">Importeer Educatieve Bronnen</h2>
                  <p className="text-sm text-zinc-500 mt-0.5">WebsiteURL (Wikipedia, NPO) of trefwoorden (YouTube)</p>
                </div>
              </div>
              
              <div className="p-6">
                <form 
                  onSubmit={(e) => { e.preventDefault(); handleCrawl(); }} 
                  className="flex flex-col sm:flex-row gap-3 relative"
                >
                  <div className="relative flex-1">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <LinkIcon className="h-5 w-5 text-zinc-400" />
                    </div>
                    <input 
                      type="text" 
                      placeholder="Plak URL of zoekterm..." 
                      value={crawlQuery}
                      onChange={e => setCrawlQuery(e.target.value)}
                      className="block w-full pl-11 pr-4 py-3 border border-zinc-200 rounded-xl text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition-all"
                    />
                  </div>
                  <div className="w-full sm:w-56 shrink-0 z-20">
                     <Select
                       placeholder="-- Doelgroep (SLO) --"
                       isSearchable={false}
                       options={[
                         { value: "algemeen", label: "Algemeen" },
                         { value: "po groep 1-2", label: "PO groep 1-2" },
                         { value: "po groep 3-4", label: "PO groep 3-4" },
                         { value: "po groep 5-6", label: "PO groep 5-6" },
                         { value: "po groep 7-8", label: "PO groep 7-8" },
                         { value: "vo onderbouw", label: "VO Onderbouw" },
                         { value: "vmbo", label: "VMBO" },
                         { value: "havo vwo", label: "HAVO / VWO" },
                         { value: "speciaal onderwijs", label: "Speciaal Onderwijs" }
                       ]}
                       onChange={(option: any) => {
                         if(option?.value) {
                            setCrawlQuery(prev => prev ? prev + " " + option.value : option.value);
                         }
                       }}
                       styles={{
                          control: (baseStyles, state) => ({
                            ...baseStyles,
                            borderColor: state.isFocused ? '#18181b' : '#e4e4e7',
                            borderWidth: '1px',
                            borderRadius: '0.75rem',
                            padding: '0.3rem',
                            backgroundColor: '#fafafa',
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
                            fontSize: '0.875rem'
                          }),
                          placeholder: (baseStyles) => ({
                            ...baseStyles,
                            color: '#52525b',
                            fontSize: '0.875rem'
                          }),
                          singleValue: (baseStyles) => ({
                            ...baseStyles,
                            fontSize: '0.875rem'
                          })
                        }}
                     />
                  </div>
                  <button 
                    type="submit"
                    disabled={isCrawling || !crawlQuery}
                    className="px-6 py-3 bg-zinc-900 text-white rounded-xl text-sm font-semibold hover:bg-zinc-800 focus:ring-2 focus:ring-offset-2 focus:ring-zinc-900 disabled:opacity-70 flex items-center justify-center gap-2 transition-all shrink-0"
                  >
                    {isCrawling ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                    {isCrawling ? 'Zoeken...' : 'URL / Zoeken'}
                  </button>
                </form>

                {savedCount > 0 && (
                  <div className="mt-4 p-4 bg-emerald-50 text-emerald-800 text-sm rounded-xl border border-emerald-100/50 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2">
                    <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                      <Save className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div>
                      <p className="font-semibold">Succesvol opgeslagen!</p>
                      <p className="text-emerald-600/90">{savedCount} bron(nen) toegevoegd aan de wachtrij.</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Scraper Results */}
              <div className="border-t border-zinc-100 bg-zinc-50/30">
                <div className="px-6 py-4 flex items-center justify-between border-b border-zinc-100 bg-white">
                  <h3 className="font-semibold text-zinc-900">Zoekresultaten</h3>
                  {crawlResults.length > 0 && (
                    <span className="text-xs font-semibold bg-blue-50 text-blue-700 px-2.5 py-1 rounded-md border border-blue-100">{crawlResults.length} Gevonden</span>
                  )}
                </div>

                <div className="p-6 space-y-4">
                  {crawlResults.length === 0 && !isCrawling && (
                    <div className="text-center py-12 px-4 border-2 border-dashed border-zinc-200 rounded-2xl bg-white">
                      <Search className="w-8 h-8 text-zinc-300 mx-auto mb-3" />
                      <p className="text-sm font-medium text-zinc-900">Geen zoekresultaten</p>
                      <p className="text-xs text-zinc-500 mt-1">Voer een zoekterm in om resultaten van YouTube en internet te tonen.</p>
                    </div>
                  )}

                  {crawlResults.map(video => (
                    <div key={video.videoId} className="group bg-white p-4 rounded-2xl border border-zinc-200 hover:border-blue-200 shadow-sm transition-all flex flex-col sm:flex-row gap-5 items-start">
                      
                      <div className="w-full sm:w-48 aspect-video rounded-xl overflow-hidden bg-zinc-100 relative shrink-0 border border-zinc-100">
                        {video.sourceType === 'website' || video.duration === 'Web/Bron' ? (
                          <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-50 group-hover:bg-zinc-100 transition-colors">
                             {renderThumbnail(video)}
                             <div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-white/50 backdrop-blur-[2px]">
                               <Database className="w-8 h-8 text-zinc-600 mb-2" />
                               <span className="text-[10px] uppercase tracking-wider font-bold text-zinc-600 text-center px-2">Web / Artikel</span>
                             </div>
                          </div>
                        ) : playingVideoId === video.videoId ? (
                          <iframe 
                            className="w-full h-full relative z-10 bg-black"
                            src={`https://www.youtube.com/embed/${video.videoId.includes('youtube.com') || video.videoId.includes('youtu.be') ? (video.videoId.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i)?.[1] || video.videoId) : video.videoId}?origin=${window.location.origin}&autoplay=1`} 
                            title="YouTube video player" 
                            frameBorder="0" 
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                            allowFullScreen>
                          </iframe>
                        ) : (
                          <div 
                            className="absolute inset-0 cursor-pointer group-hover:scale-105 transition-transform duration-500"
                            onClick={() => setPlayingVideoId(video.videoId)}
                          >
                            {renderThumbnail(video)}
                            <div className="absolute inset-0 bg-black/10 group-hover:bg-black/20 flex items-center justify-center transition-colors">
                              <div className="w-10 h-10 bg-white/90 backdrop-blur rounded-full flex items-center justify-center shadow-sm opacity-0 group-hover:opacity-100 transition-opacity">
                                <Video className="w-5 h-5 text-zinc-900" />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0 py-1 flex flex-col h-full justify-between w-full">
                        <div>
                          <h4 className="text-sm font-semibold text-zinc-900 line-clamp-2 leading-snug group-hover:text-blue-600 transition-colors">{video.title}</h4>
                          <p className="text-xs font-medium text-zinc-500 mt-1.5 flex items-center gap-1.5 truncate">
                            <span className="w-1.5 h-1.5 rounded-full bg-zinc-300 shrink-0"></span>
                            <span className="truncate">{video.channelTitle}</span>
                          </p>
                        </div>
                        
                        <div className="mt-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
                          <button 
                            onClick={() => saveToDatabase(video)}
                            className="w-full sm:w-auto px-4 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 hover:text-blue-800 rounded-lg text-xs font-bold uppercase tracking-wide flex items-center justify-center gap-2 transition-colors border border-blue-100/50"
                          >
                            <Plus className="w-4 h-4" /> Zet in Wachtrij
                          </button>
                          
                          {(video.sourceType === 'website' || video.duration === 'Web/Bron') && (
                             <a href={video.videoId} target="_blank" rel="noopener noreferrer" className="text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors flex items-center justify-center gap-1 w-full sm:w-auto">
                               Open Origineel <ChevronRight className="w-3 h-3" />
                             </a>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              {/* Approved Videos Overview */}
              <div className="border-t border-zinc-100 bg-zinc-50/30 mt-6">
                <div className="px-6 py-4 flex items-center justify-between border-b border-zinc-100 bg-white">
                  <h3 className="font-semibold text-zinc-900">Gevonden en geaccepteerde bronnen beheren</h3>
                  <span className="text-xs font-semibold bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-md border border-emerald-100">{dbStats.approved} Actief</span>
                </div>
                
                <div className="p-6 space-y-4">
                  {recentApproved.length === 0 ? (
                    <div className="text-center py-8">
                       <p className="text-sm text-zinc-500">Nog geen goedgekeurde bronnen in de database.</p>
                    </div>
                  ) : (
                    recentApproved.map(item => (
                      <div key={item.id} onClick={() => navigate(`/teacher/videos/${item.id}`)} className="bg-white border border-zinc-200 rounded-xl p-3 flex gap-4 shadow-sm items-center cursor-pointer hover:border-zinc-300 transition-colors">
                        <div className="w-16 h-16 rounded bg-zinc-100 shrink-0 overflow-hidden relative">
                           {renderThumbnail({ ...item, title: item.title, thumbnailUrl: item.thumbnailUrl })}
                        </div>
                        <div className="flex-1 min-w-0">
                           <h4 className="text-sm font-semibold text-zinc-900 line-clamp-1">{item.title}</h4>
                           <p className="text-xs text-zinc-500 mt-1 truncate">{item.channelTitle} • {item.sourceType === 'website' || item.duration === 'Web/Bron' ? 'Website' : 'Video'}</p>
                        </div>
                        <button 
                          onClick={(e) => handleDeleteApproved(item.id, e)}
                          className="px-3 py-1.5 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors border border-red-100"
                        >
                          Verwijder
                        </button>
                      </div>
                    ))
                  )}
                  {dbStats.approved > 5 && (
                    <div className="text-center pt-2">
                       <p className="text-xs text-zinc-500">Log in op de Docentenomgeving om alle {dbStats.approved} bronnen te doorzoeken.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Code Management & Actions */}
          <div className="space-y-6">
            
            {/* Recent Pending Box */}
            <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
              <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  <h2 className="font-semibold text-zinc-900 text-sm">Vers in de wachtrij</h2>
                </div>
                <span className="text-xs font-medium text-zinc-500">{recentPending.length} items</span>
              </div>
              <div className="p-4 space-y-3 bg-zinc-50/50">
                {recentPending.length === 0 ? (
                   <p className="text-xs text-zinc-500 text-center py-4">De wachtrij is leeg.</p>
                ) : (
                  recentPending.map(item => (
                    <div key={item.id} className="bg-white border border-zinc-200 rounded-xl p-3 flex gap-3 shadow-sm items-center">
                      <div className="w-12 h-12 rounded bg-zinc-100 shrink-0 overflow-hidden relative">
                         {renderThumbnail({ ...item, title: item.title, thumbnailUrl: item.thumbnailUrl })}
                      </div>
                      <div className="flex-1 min-w-0">
                         <h4 className="text-xs font-semibold text-zinc-900 line-clamp-1">{item.title}</h4>
                         <p className="text-[10px] text-zinc-500 mt-0.5 truncate">{item.channelTitle}</p>
                      </div>
                    </div>
                  ))
                )}
                {recentPending.length > 0 && (
                  <button 
                    onClick={() => navigate('/admin/review')}
                    className="w-full py-2 bg-white border border-zinc-200 hover:bg-zinc-50 text-zinc-700 rounded-lg text-xs font-semibold transition-colors mt-2"
                  >
                    Open Alle {dbStats.pending} Items
                  </button>
                )}
              </div>
            </div>

            {/* Databaas Codes Management */}
            <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
              <div className="px-6 py-5 border-b border-zinc-100 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center">
                   <Key className="w-4 h-4 text-emerald-600" />
                </div>
                <h2 className="font-semibold text-zinc-900">Keurmeester Codes</h2>
              </div>
              
              <div className="p-6 bg-zinc-50/30 flex-1">
                <form onSubmit={handleAddDatabaasCode} className="mb-6 space-y-3">
                  <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">Code Uitgeven</p>
                  <div>
                    <input 
                      required
                      type="text" 
                      placeholder="Naam (bijv. Henk)" 
                      value={newCodeName}
                      onChange={e => setNewCodeName(e.target.value)}
                      className="w-full px-4 py-2 border border-zinc-200 rounded-lg text-sm text-zinc-900 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all placeholder:text-zinc-400"
                    />
                  </div>
                  <div className="flex gap-2">
                    <input 
                      required
                      type="text" 
                      placeholder="Code (bijv. h-123)" 
                      value={newCodeValue}
                      onChange={e => setNewCodeValue(e.target.value)}
                      className="flex-1 min-w-0 px-4 py-2 border border-zinc-200 rounded-lg text-sm text-zinc-900 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all placeholder:text-zinc-400"
                    />
                    <button 
                      type="submit"
                      disabled={isAddingCode}
                      className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-2 transition-colors shrink-0 shadow-sm"
                    >
                      <Plus className="w-4 h-4" /> Maak
                    </button>
                  </div>
                </form>

                <div className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Actieve Codes ({databaasCodes.length})</h3>
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {databaasCodes.length === 0 ? (
                      <p className="text-sm text-zinc-500 italic p-4 text-center bg-white border border-zinc-100 rounded-xl">Geen toegangscodes beschikbaar.</p>
                    ) : (
                      databaasCodes.map(c => (
                        <div key={c.id} className="flex items-center justify-between bg-white px-4 py-3 border border-zinc-200 hover:border-emerald-200 rounded-xl shadow-sm transition-colors group">
                          <div className="min-w-0 pr-4">
                            <div className="text-sm font-semibold text-zinc-900 group-hover:text-emerald-700 transition-colors truncate">{c.name}</div>
                            <div className="text-xs font-mono font-medium text-zinc-500 mt-0.5 truncate">{c.code}</div>
                          </div>
                          <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] shrink-0"></div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Admins Management */}
            <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm overflow-hidden flex flex-col mt-6">
              <div className="px-6 py-5 border-b border-zinc-100 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center">
                   <UserPlus className="w-4 h-4 text-blue-600" />
                </div>
                <h2 className="font-semibold text-zinc-900">Beheerders</h2>
              </div>
              
              <div className="p-6 bg-zinc-50/30 flex-1">
                <form onSubmit={handleAddAdmin} className="mb-6 space-y-3">
                  <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">Beheerder Toevoegen</p>
                  <div>
                    <input 
                      required
                      type="text" 
                      placeholder="Naam (bijv. EAI Admin)" 
                      value={newAdminName}
                      onChange={e => setNewAdminName(e.target.value)}
                      className="w-full px-4 py-2 border border-zinc-200 rounded-lg text-sm text-zinc-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder:text-zinc-400"
                    />
                  </div>
                  <div>
                    <input 
                      required
                      type="email" 
                      placeholder="E-mailadres" 
                      value={newAdminEmail}
                      onChange={e => setNewAdminEmail(e.target.value)}
                      className="w-full px-4 py-2 border border-zinc-200 rounded-lg text-sm text-zinc-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder:text-zinc-400"
                    />
                  </div>
                  <div className="flex gap-2">
                    <input 
                      required
                      type="text" 
                      placeholder="Nieuw wachtwoord" 
                      value={newAdminPassword}
                      onChange={e => setNewAdminPassword(e.target.value)}
                      className="flex-1 min-w-0 px-4 py-2 border border-zinc-200 rounded-lg text-sm text-zinc-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder:text-zinc-400"
                    />
                    <button 
                      type="submit"
                      disabled={isAddingAdmin}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 transition-colors shrink-0 shadow-sm"
                    >
                      <Plus className="w-4 h-4" /> Aanmaken
                    </button>
                  </div>
                </form>

                <div className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Actieve Beheerders ({admins.length})</h3>
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {admins.length === 0 ? (
                      <p className="text-sm text-zinc-500 italic p-4 text-center bg-white border border-zinc-100 rounded-xl">Geen externe beheerders gevonden.</p>
                    ) : (
                      admins.map(a => (
                        <div key={a.id} className="flex items-center justify-between bg-white px-4 py-3 border border-zinc-200 hover:border-blue-200 rounded-xl shadow-sm transition-colors group">
                          <div className="min-w-0 pr-4">
                            <div className="text-sm font-semibold text-zinc-900 group-hover:text-blue-700 transition-colors truncate">{a.name}</div>
                            <div className="text-xs font-mono font-medium text-zinc-500 mt-0.5 truncate">{a.email}</div>
                          </div>
                          <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)] shrink-0"></div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>

      </div>


    </div>
  );
}


