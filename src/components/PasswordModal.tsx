import { useState, FormEvent } from 'react';
import { Shield, X } from 'lucide-react';

interface PasswordModalProps {
  isOpen: boolean;
  onSuccess: () => void;
  onClose: () => void;
}

export function PasswordModal({ isOpen, onSuccess, onClose }: PasswordModalProps) {
  const [pwd, setPwd] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (pwd.trim() === 'EAI model') {
      sessionStorage.setItem('eai_auth', 'true');
      setPwd('');
      setError('');
      onSuccess();
    } else {
      setError('Onjuist wachtwoord. Toegang geweigerd.');
    }
  };

  return (
    <div className="fixed inset-0 bg-zinc-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden border border-zinc-200">
        <div className="p-4 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
          <div className="flex items-center gap-2 text-zinc-800 font-semibold text-sm">
            <Shield className="w-4 h-4 text-zinc-500" />
            API Autorisatie Vereist
          </div>
          <button onClick={onClose} className="p-1 hover:bg-zinc-200 rounded text-zinc-400 hover:text-zinc-600 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <p className="text-sm text-zinc-600 leading-relaxed">
            Deze actie gebruikt API keys voor externe services (YouTube/Gemini). Voer het wachtwoord in om deze functionaliteit eenmalig te ontgrendelen voor deze sessie.
          </p>
          <div>
            <input 
              type="password" 
              value={pwd}
              onChange={e => { setPwd(e.target.value); setError(''); }}
              placeholder="Wachtwoord..."
              className="w-full border border-zinc-300 p-2.5 rounded-lg focus:ring-2 focus:ring-zinc-900 outline-none text-sm text-zinc-900"
              autoFocus
            />
            {error && <div className="text-red-600 text-xs mt-1.5 font-medium">{error}</div>}
          </div>
          <button type="submit" className="w-full bg-zinc-900 hover:bg-zinc-800 text-white p-2.5 rounded-lg font-medium transition-colors text-sm">
            Ontgrendel Functionaliteit
          </button>
        </form>
      </div>
    </div>
  );
}
