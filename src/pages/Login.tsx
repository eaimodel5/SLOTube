import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { PlayCircle, ChevronRight } from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, doc, getDoc, setDoc } from 'firebase/firestore';

function FakeHackOverlay({ onComplete }: { onComplete: () => void }) {
  const [visibleLines, setVisibleLines] = useState<string[]>([]);
  
  useEffect(() => {
    const lines = [
      "SLOTube easter egg gestart...",
      "Nepterminal laden... OK",
      "Geen echte data geopend",
      "Beveiligde grapmodus actief",
      "Terug naar veilige inlog..."
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
      // Removed the admin login and navigation for the easter egg!
    }} />;
  }

  return (
    <div className="min-h-[100dvh] w-full max-w-full bg-zinc-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden overflow-x-hidden">
      
      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4">
        <div className="flex justify-center mb-6">
           <div className="w-14 h-14 bg-black rounded-xl shadow-[0_0_15px_rgba(0,255,0,0.2)] border border-[#0f0]/50 flex items-center justify-center">
             <PlayCircle className="w-7 h-7 text-[#0f0] animate-pulse" />
           </div>
        </div>
        <h2 className="text-center text-3xl tracking-tight text-zinc-900 flex justify-center items-center gap-1.5 font-sans">
          <span className="font-bold">SLO</span><span className="bg-black text-[#0f0] font-mono font-bold px-2 py-0.5 rounded-lg border border-[#0f0]/30 shadow-[0_0_10px_rgba(0,255,0,0.1)] tracking-widest text-lg">TUBE</span>
        </h2>
        <p className="mt-4 text-center text-sm text-zinc-600 leading-relaxed max-w-xs mx-auto">
          <span className="font-semibold block mb-1 text-zinc-800">Lesmateriaal bij SLO-kerndoelen</span>
          Zoek, beoordeel en deel video’s en open leermateriaal per kerndoel.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-white py-8 px-4 border border-zinc-200 sm:rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.02)] sm:px-10">
          <div className="space-y-3">
            
            <button
              onClick={() => handleLogin('docent')}
              disabled={loadingRole !== null}
              className={`w-full group flex items-center justify-between p-5 rounded-xl transition-all border ${
                loadingRole === 'docent' 
                  ? 'border-zinc-500 bg-zinc-50' 
                  : 'border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50 bg-white shadow-sm'
              }`}
            >
              <div className="text-left flex-1 min-w-0 pr-4">
                <h3 className="text-base font-semibold text-zinc-900 group-hover:text-zinc-600 transition-colors">Docentenomgeving</h3>
                <p className="text-sm text-zinc-500 mt-1 truncate">Zoek en gebruik goedgekeurd lesmateriaal</p>
              </div>
              {loadingRole === 'docent' ? (
                <div className="w-5 h-5 border-2 border-zinc-500 border-t-transparent rounded-full animate-spin shrink-0"></div>
              ) : (
                <ChevronRight className="w-5 h-5 text-zinc-300 group-hover:text-zinc-600 transition-colors shrink-0" />
              )}
            </button>

            <button
              onClick={() => handleLogin('databaas')}
              disabled={loadingRole !== null}
              className={`w-full group flex items-center justify-between p-5 rounded-xl transition-all border ${
                loadingRole === 'databaas' 
                  ? 'border-zinc-500 bg-zinc-50' 
                  : 'border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50 bg-white shadow-sm'
              }`}
            >
              <div className="text-left flex-1 min-w-0 pr-4">
                <h3 className="text-base font-semibold text-zinc-900 group-hover:text-zinc-600 transition-colors">Beoordelingsomgeving</h3>
                <p className="text-sm text-zinc-500 mt-1 truncate">Beoordeel en valideer nieuw materiaal</p>
              </div>
              {loadingRole === 'databaas' && !showCodeModal ? (
                <div className="w-5 h-5 border-2 border-zinc-500 border-t-transparent rounded-full animate-spin shrink-0"></div>
              ) : (
                <ChevronRight className="w-5 h-5 text-zinc-300 group-hover:text-zinc-600 transition-colors shrink-0" />
              )}
            </button>

            <button
              onClick={() => handleLogin('admin')}
              disabled={loadingRole !== null}
              className={`w-full group flex items-center justify-between p-5 rounded-xl transition-all border ${
                loadingRole === 'admin' 
                  ? 'border-zinc-500 bg-zinc-50' 
                  : buttonDisabledFake
                  ? 'border-zinc-200 bg-zinc-50 opacity-40 cursor-pointer pointer-events-auto'
                  : 'border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50 bg-white shadow-sm'
              }`}
            >
              <div className="text-left flex-1 min-w-0 pr-4">
                <h3 className="text-base font-semibold text-zinc-900 group-hover:text-zinc-600 transition-colors">Beheerdersomgeving</h3>
                <p className="text-sm text-zinc-500 mt-1 truncate">Systeeminstellingen en toegangsbeheer</p>
              </div>
              {loadingRole === 'admin' ? (
                <div className="w-5 h-5 border-2 border-zinc-500 border-t-transparent rounded-full animate-spin shrink-0"></div>
              ) : (
                <ChevronRight className="w-5 h-5 text-zinc-300 group-hover:text-zinc-600 transition-colors shrink-0" />
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
            <h3 className="text-lg font-semibold text-zinc-900 mb-2">Reviewtoegang</h3>
            <p className="text-sm text-zinc-500 mb-6">Voer uw reviewcode in om door te gaan.</p>
            <input 
              type="text" 
              value={databaasCode}
              onChange={e => setDatabaasCode(e.target.value)}
              placeholder="Bijv. Henk-code-001"
              className="w-full px-4 py-2 border border-zinc-300 rounded-lg mb-2 focus:ring-2 focus:ring-zinc-900 focus:border-transparent outline-none"
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
                className="px-4 py-2 bg-zinc-900 text-white rounded-lg text-sm font-medium hover:bg-zinc-800 disabled:opacity-50 flex items-center gap-2"
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
            <h3 className="text-lg font-semibold text-zinc-900 mb-2">Beheertoegang</h3>
            <p className="text-sm text-zinc-500 mb-6">Voer uw beheerdersgegevens in.</p>
            <div className="space-y-4 mb-2">
              <input 
                type="text" 
                value={adminEmail}
                onChange={e => setAdminEmail(e.target.value)}
                placeholder="Inlognaam of e-mail"
                className="w-full px-4 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-zinc-900 focus:border-transparent outline-none"
                autoFocus
              />
              <input 
                type="password" 
                value={adminPassword}
                onChange={e => setAdminPassword(e.target.value)}
                placeholder="Wachtwoord"
                className="w-full px-4 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-zinc-900 focus:border-transparent outline-none"
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
                className="px-4 py-2 bg-zinc-900 text-white rounded-lg text-sm font-medium hover:bg-zinc-800 disabled:opacity-50 flex items-center gap-2"
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
