import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Search, PlayCircle, ShieldCheck, Database, GraduationCap } from 'lucide-react';

const steps = [
  {
    title: "Welkom bij SLOTube",
    desc: "Een centraal platform om lesmateriaal, video's en artikelen te zoeken die naadloos aansluiten bij de SLO-kerndoelen.",
    icon: <PlayCircle className="w-12 h-12 text-[#0f0]" />,
    bg: "bg-black"
  },
  {
    title: "1. Zoek een kerndoel",
    desc: "Kies een vakgebied en open een SLO-kerndoel. Daar zie je goedgekeurd materiaal en nieuwe suggesties.",
    icon: <Database className="w-12 h-12 text-emerald-500" />,
    bg: "bg-emerald-50"
  },
  {
    title: "2. Laat suggesties zoeken",
    desc: "SLOTube zoekt in beschikbare bronnen en toont materiaal dat inhoudelijk past bij het kerndoel.",
    icon: <Search className="w-12 h-12 text-blue-500" />,
    bg: "bg-blue-50"
  },
  {
    title: "3. Bekijk waarom iets gevonden is",
    desc: "Bij elke suggestie zie je de bron, matchscore en een korte reden. Zo kun je snel beoordelen of het materiaal bruikbaar is.",
    icon: <Search className="w-12 h-12 text-indigo-500" />,
    bg: "bg-indigo-50"
  },
  {
    title: "4. Stuur materiaal naar review",
    desc: "Nieuw materiaal wordt eerst als 'Wacht op review' opgeslagen. Pas na goedkeuring verschijnt het bij docenten.",
    icon: <ShieldCheck className="w-12 h-12 text-purple-500" />,
    bg: "bg-purple-50"
  },
  {
    title: "5. Gebruik goedgekeurd materiaal",
    desc: "Docenten zien alleen materiaal dat is goedgekeurd. Zo blijft de lijst overzichtelijk en betrouwbaar.",
    icon: <GraduationCap className="w-12 h-12 text-amber-500" />,
    bg: "bg-amber-50"
  }
];

export default function Tutorial() {
  const [currentStep, setCurrentStep] = useState(0);
  const navigate = useNavigate();

  return (
    <div className="relative w-full min-h-[calc(100vh-4rem)] flex flex-col pt-12 overflow-hidden bg-white">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-3xl mx-auto w-full px-6 flex flex-col items-center pb-24"
      >
        <div className="flex items-center gap-2 mb-12">
          <span className="font-bold text-xl text-zinc-900">SLO</span>
          <span className="bg-black text-[#0f0] font-mono font-bold px-2 py-0.5 rounded border border-[#0f0]/30 tracking-widest text-sm">TUBE</span>
          <span className="text-zinc-300 mx-2">/</span>
          <span className="text-sm font-semibold text-zinc-500 tracking-wider uppercase">Uitleg</span>
        </div>

        <div className="relative w-full aspect-[4/3] sm:aspect-[2/1] rounded-2xl overflow-hidden border border-zinc-200 shadow-sm mb-8 bg-zinc-50">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className={`absolute inset-0 flex flex-col items-center justify-center p-8 text-center ${steps[currentStep].bg === 'bg-black' ? 'bg-zinc-900' : 'bg-white'}`}
            >
              <div className={`mb-6 p-4 rounded-full ${steps[currentStep].bg === 'bg-black' ? 'bg-zinc-800' : steps[currentStep].bg}`}>
                {steps[currentStep].icon}
              </div>
              <h2 className={`text-2xl font-bold mb-4 ${steps[currentStep].bg === 'bg-black' ? 'text-white' : 'text-zinc-900'}`}>
                {steps[currentStep].title}
              </h2>
              <p className={`text-lg max-w-xl leading-relaxed ${steps[currentStep].bg === 'bg-black' ? 'text-zinc-300' : 'text-zinc-600'}`}>
                {steps[currentStep].desc}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="flex w-full items-center justify-between px-4">
          <div className="flex gap-2">
            {steps.map((_, idx) => (
              <div 
                key={idx} 
                className={`h-2 rounded-full transition-all duration-300 ${
                  idx === currentStep ? 'w-8 bg-zinc-800' : 'w-2 bg-zinc-200'
                }`} 
              />
            ))}
          </div>

          <div className="flex gap-3">
            {currentStep > 0 && (
              <button 
                onClick={() => setCurrentStep(s => s - 1)}
                className="px-5 py-2.5 rounded-lg font-medium text-zinc-600 hover:bg-zinc-100 transition-colors"
              >
                Vorige
              </button>
            )}
            {currentStep < steps.length - 1 ? (
              <button 
                onClick={() => setCurrentStep(s => s + 1)}
                className="px-5 py-2.5 bg-zinc-900 text-white rounded-lg font-medium flex items-center gap-2 hover:bg-zinc-800 transition-colors shadow-sm"
              >
                Volgende
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button 
                onClick={() => navigate('/teacher')}
                className="px-5 py-2.5 bg-[#0f0]/20 text-green-700 border border-[#0f0]/50 rounded-lg font-semibold flex items-center gap-2 hover:bg-[#0f0]/30 transition-colors shadow-sm"
              >
                Begrepen, start!
                <PlayCircle className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
