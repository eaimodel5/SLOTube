import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { PlayCircle, ShieldCheck, GraduationCap, Briefcase } from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, doc, getDoc, setDoc } from 'firebase/firestore';

function FakeHackOverlay({ onComplete }: { onComplete: () => void }) {
  const [visibleLines, setVisibleLines] = useState<string[]>([]);
  
  useEffect(() => {
    const lines = [
      "SLOTube OS v2.4 booting...",
      "Checking memory... OK",
      "Mounting file systems... OK",
      "Initializing network interfaces... eth0: UP",
      "Connecting to Firebase backend...",
      "[WARNING] Developer override credentials active: admin / SLOTube",
      "> EXECUTING PAYLOAD: DUMP_ALL_RECORDS",
      "Downloading firestore/users... 14,204 records dumped.",
      "Downloading firestore/system_auth... 1 record dumped.",
      "[!] KERNEL PANIC: Unauthorized datastream detected",
      "Wiping tracks...",
      "Rebooting system to restore safe state..."
    ];

    let current = 0;
    const interval = setInterval(() => {
      if (current < lines.length) {
        setVisibleLines(prev => [...prev, lines[current]]);
        current++;
      } else {
        clearInterval(interval);
        setTimeout(onComplete, 1500);
      }
    }, 500);

    return () => clearInterval(interval);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-[9999] bg-black text-[#0f0] font-mono text-xs sm:text-sm p-6 overflow-hidden flex flex-col">
      {visibleLines.map((line, i) => (
        <div key={i} className="mb-1">{line}</div>
      ))}
      <div className="w-2 h-4 bg-[#0f0] animate-pulse mt-1"></div>
    </div>
  );
}

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [loadingRole, setLoadingRole] = useState<'docent' | 'admin' | 'databaas' | null>(null);
  
  // Databaas code modal states
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [databaasCode, setDatabaasCode] = useState('');
  const [codeError, setCodeError] = useState('');

  // Admin modal states
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminError, setAdminError] = useState('');
  const [showFakeHack, setShowFakeHack] = useState(false);

  const [clickCount, setClickCount] = useState({ count: 0, time: 0 });
  const [buttonDisabledFake, setButtonDisabledFake] = useState(false);

  const handleLogin = (selectedRole: 'docent' | 'admin' | 'databaas') => {
    if (selectedRole === 'databaas') {
      setShowCodeModal(true);
      return;
    }
    if (selectedRole === 'admin') {
      const now = Date.now();
      if (now - clickCount.time > 3000) {
        // Reset if more than 3 seconds since last click
        setClickCount({ count: 1, time: now });
        setButtonDisabledFake(true);
      } else {
        const newCount = clickCount.count + 1;
        if (newCount >= 3) {
           // Triple click achieved!
           setShowAdminModal(true);
           setClickCount({ count: 0, time: 0 });
           setButtonDisabledFake(false);
        } else {
           setClickCount({ count: newCount, time: clickCount.time });
           setButtonDisabledFake(true);
        }
      }
      return;
    }
    setLoadingRole(selectedRole);
    setTimeout(() => {
      login(selectedRole);
      navigate('/teacher');
    }, 600);
  };

  const handleDatabaasLogin = async () => {
    if (!databaasCode.trim()) return;
    setLoadingRole('databaas');
    setCodeError('');
    
    try {
      const q = query(collection(db, 'databaas_codes'), where('code', '==', databaasCode.trim()));
      const snap = await getDocs(q);
      
      if (!snap.empty) {
        const name = snap.docs[0].data().name;
        sessionStorage.setItem('databaas_name', name);
        login('databaas');
        navigate('/admin/review');
      } else {
        setCodeError('Ongeldige code.');
      }
    } catch (error) {
      console.error(error);
      setCodeError('Er is een systeemfout opgetreden.');
    } finally {
      setLoadingRole(null);
    }
  };

  const handleAdminAuth = async () => {
    if (!adminEmail.trim() || !adminPassword.trim()) return;
    
    // Fake hack trigger (easter egg)
    if (adminEmail === 'admin' && adminPassword === 'SLOTube') {
      setShowAdminModal(false);
      setAdminEmail('');
      setAdminPassword('');
      setShowFakeHack(true);
      return;
    }

    setLoadingRole('admin');
    setAdminError('');

    try {
      const adminDocRef = doc(db, 'system_config', 'admin_credentials');
      let adminDoc = await getDoc(adminDocRef);

      if (adminDoc.exists()) {
        const data = adminDoc.data();
        if (data && data.username === adminEmail && data.password === adminPassword) {
          // Validation success
          login('admin');
          navigate('/admin');
          return;
        }
      }
      
      setAdminError('Inloggegevens zijn onjuist.');
    } catch (error) {
      console.error(error);
      setAdminError('Kan geen verbinding maken met de database.');
    } finally {
      setLoadingRole(null);
    }
  };

  if (showFakeHack) {
    return <FakeHackOverlay onComplete={() => {
      setShowFakeHack(false);
      login('admin');
      navigate('/admin');
    }} />;
  }

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      
      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4">
        <div className="flex justify-center mb-6">
           <div className="w-16 h-16 bg-white rounded-2xl shadow-sm border border-zinc-200 flex items-center justify-center">
             <PlayCircle className="w-8 h-8 text-blue-600" />
           </div>
        </div>
        <h2 className="text-center text-3xl font-bold tracking-tight text-zinc-900">
          SLOTube <span className="font-light text-blue-600">Platform</span>
        </h2>
        <p className="mt-4 text-center text-sm text-zinc-600 leading-relaxed font-medium">
          Welkom! Dit platform koppelt educatieve video's automatisch aan de officiële Nederlandse SLO-kerndoelen.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-white py-8 px-4 shadow-sm border border-zinc-200 sm:rounded-2xl sm:px-10">
          <div className="space-y-4">
            
            <button
              onClick={() => handleLogin('docent')}
              disabled={loadingRole !== null}
              className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all ${
                loadingRole === 'docent' 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-zinc-200 hover:border-blue-200 hover:bg-blue-50/50 bg-white'
              }`}
            >
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${loadingRole === 'docent' ? 'bg-blue-500 text-white' : 'bg-blue-100 text-blue-600'}`}>
                  <GraduationCap className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <h3 className="font-medium text-zinc-900">Docent omgeving</h3>
                  <p className="text-xs text-zinc-500">Bekijk en importeer lesmateriaal</p>
                </div>
              </div>
              {loadingRole === 'docent' && (
                <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              )}
            </button>

            <button
              onClick={() => handleLogin('databaas')}
              disabled={loadingRole !== null}
              className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all ${
                loadingRole === 'databaas' 
                  ? 'border-purple-500 bg-purple-50' 
                  : 'border-zinc-200 hover:border-purple-200 hover:bg-purple-50/50 bg-white'
              }`}
            >
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${loadingRole === 'databaas' ? 'bg-purple-500 text-white' : 'bg-purple-100 text-purple-600'}`}>
                  <Briefcase className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <h3 className="font-medium text-zinc-900">Databaas inlog</h3>
                  <p className="text-xs text-zinc-500">Beoordeel en keur video's goed</p>
                </div>
              </div>
              {loadingRole === 'databaas' && !showCodeModal && (
                <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
              )}
            </button>

            <button
              onClick={() => handleLogin('admin')}
              disabled={loadingRole !== null}
              className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all ${
                loadingRole === 'admin' 
                  ? 'border-emerald-500 bg-emerald-50' 
                  : buttonDisabledFake
                  ? 'border-zinc-200 bg-zinc-50 opacity-50 cursor-pointer pointer-events-auto'
                  : 'border-zinc-200 hover:border-emerald-200 hover:bg-emerald-50/50 bg-white'
              }`}
            >
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${loadingRole === 'admin' ? 'bg-emerald-500 text-white' : 'bg-emerald-100 text-emerald-600'}`}>
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <h3 className="font-medium text-zinc-900">Systeem beheerder</h3>
                  <p className="text-xs text-zinc-500">Volledig overzicht en beheer</p>
                </div>
              </div>
              {loadingRole === 'admin' && (
                <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
              )}
            </button>

          </div>

          <div className="mt-8 text-center">
            <p className="text-xs text-zinc-400 font-mono tracking-widest uppercase">
              H. Visser EAI Analyse & Advies
            </p>
          </div>
        </div>
      </div>

      {showCodeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/40 backdrop-blur-sm px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 overflow-hidden">
            <h3 className="text-lg font-semibold text-zinc-900 mb-2">Databaas toegang</h3>
            <p className="text-sm text-zinc-500 mb-6">Voer uw persoonlijke code in om door te gaan.</p>
            <input 
              type="text" 
              value={databaasCode}
              onChange={e => setDatabaasCode(e.target.value)}
              placeholder="Bijv. Henk-code-001"
              className="w-full px-4 py-2 border border-zinc-300 rounded-lg mb-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
              autoFocus
            />
            {codeError && <p className="text-xs text-red-500 mb-4">{codeError}</p>}
            <div className="flex justify-end gap-3 mt-6">
              <button 
                onClick={() => { setShowCodeModal(false); setCodeError(''); }}
                className="px-4 py-2 rounded-lg text-sm font-medium text-zinc-600 hover:bg-zinc-100"
              >
                Annuleren
              </button>
              <button 
                onClick={handleDatabaasLogin}
                disabled={loadingRole === 'databaas' || !databaasCode}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2"
              >
                {loadingRole === 'databaas' ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : null}
                Inloggen
              </button>
            </div>
          </div>
        </div>
      )}

      {showAdminModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/40 backdrop-blur-sm px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 overflow-hidden">
            <h3 className="text-lg font-semibold text-zinc-900 mb-2">Admin toegang</h3>
            <p className="text-sm text-zinc-500 mb-6">Voer uw beheerdersgegevens in.</p>
            <div className="space-y-4 mb-2">
              <input 
                type="text" 
                value={adminEmail}
                onChange={e => setAdminEmail(e.target.value)}
                placeholder="Inlognaam of e-mail"
                className="w-full px-4 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                autoFocus
              />
              <input 
                type="password" 
                value={adminPassword}
                onChange={e => setAdminPassword(e.target.value)}
                placeholder="Wachtwoord"
                className="w-full px-4 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
              />
            </div>
            {adminError && <p className="text-xs text-red-500 mb-4 mt-2">{adminError}</p>}
            <div className="flex justify-end gap-3 mt-6">
              <button 
                onClick={() => { setShowAdminModal(false); setAdminError(''); }}
                className="px-4 py-2 rounded-lg text-sm font-medium text-zinc-600 hover:bg-zinc-100"
              >
                Annuleren
              </button>
              <button 
                onClick={handleAdminAuth}
                disabled={loadingRole === 'admin' || !adminEmail || !adminPassword}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-2"
              >
                {loadingRole === 'admin' ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : null}
                Inloggen
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
