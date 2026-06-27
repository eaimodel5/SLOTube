import React from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { PlayCircle, Database, Search, ShieldCheck, GraduationCap } from 'lucide-react';
import { Tile } from '../components/ui/Tile';

const steps = [
  {
    title: "1. Zoek een kerndoel",
    desc: "Kies een vakgebied en open een SLO-kerndoel. Daar zie je goedgekeurd materiaal en nieuwe suggesties.",
    icon: <Database className="w-6 h-6 text-emerald-500" />
  },
  {
    title: "2. Laat suggesties zoeken",
    desc: "SLOTube zoekt in beschikbare bronnen en toont materiaal dat inhoudelijk past bij het kerndoel.",
    icon: <Search className="w-6 h-6 text-blue-500" />
  },
  {
    title: "3. Bekijk waarom iets gevonden is",
    desc: "Bij elke suggestie zie je de bron, matchscore en een korte reden. Zo kun je snel beoordelen of het materiaal bruikbaar is.",
    icon: <Search className="w-6 h-6 text-indigo-500" />
  },
  {
    title: "4. Stuur materiaal naar review",
    desc: "Nieuw materiaal wordt eerst als 'Wacht op review' opgeslagen. Pas na goedkeuring verschijnt het bij docenten.",
    icon: <ShieldCheck className="w-6 h-6 text-purple-500" />
  },
  {
    title: "5. Gebruik goedgekeurd materiaal",
    desc: "Docenten zien alleen materiaal dat is goedgekeurd. Zo blijft de lijst overzichtelijk en betrouwbaar.",
    icon: <GraduationCap className="w-6 h-6 text-amber-500" />
  }
];

export default function Tutorial() {
  const navigate = useNavigate();

  return (
    <div className="relative w-full min-h-[calc(100vh-4rem)] flex flex-col pt-6 pb-24 bg-zinc-50/30">
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl mx-auto w-full px-4 flex flex-col items-center"
      >
        <div className="flex items-center gap-2 mb-8">
          <span className="font-bold text-xl text-zinc-900">SLO</span>
          <span className="bg-black text-[#0f0] font-mono font-bold px-2 py-0.5 rounded border border-[#0f0]/30 tracking-widest text-sm">TUBE</span>
          <span className="text-zinc-300 mx-2">/</span>
          <span className="text-sm font-semibold text-zinc-500 tracking-wider uppercase">Uitleg</span>
        </div>

        <div className="w-full bg-zinc-900 text-white rounded-xl p-5 mb-6 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <PlayCircle className="w-8 h-8 text-[#0f0]" />
            <h2 className="text-lg font-bold">Welkom bij SLOTube</h2>
          </div>
          <p className="text-sm text-zinc-300 leading-relaxed">
            Een centraal platform om lesmateriaal, video's en artikelen te zoeken die naadloos aansluiten bij de SLO-kerndoelen.
          </p>
        </div>

        <div className="w-full space-y-3 mb-8">
          {steps.map((step, idx) => (
            <Tile
              key={idx}
              title={step.title}
              subtitle={step.desc}
              icon={
                <div className="w-10 h-10 rounded-lg bg-zinc-100 flex items-center justify-center">
                  {step.icon}
                </div>
              }
              rightIcon={<div/>} // Hide right arrow
            />
          ))}
        </div>

        <button 
          onClick={() => navigate('/teacher')}
          className="w-full sm:w-auto px-6 py-3 bg-zinc-900 text-white rounded-xl font-medium flex justify-center items-center gap-2 hover:bg-zinc-800 transition-colors shadow-sm"
        >
          Begrepen, start!
          <PlayCircle className="w-4 h-4" />
        </button>
      </motion.div>
    </div>
  );
}
