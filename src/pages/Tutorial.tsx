import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Search, PlayCircle, ShieldCheck, Database, GraduationCap, Video } from 'lucide-react';

function TutorialBootSplash({ onComplete }: { onComplete: () => void }) {
  const [stage, setStage] = useState<'eai' | 'slotube'>('eai');

  useEffect(() => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContext) {
        const ctx = new AudioContext();
        
        const playEAI = () => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(220, ctx.currentTime);
          osc.frequency.exponentialRampToValueAtTime(220, ctx.currentTime + 1);
          
          gain.gain.setValueAtTime(0, ctx.currentTime);
          gain.gain.linearRampToValueAtTime(0.05, ctx.currentTime + 0.2); 
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.5);
          
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(ctx.currentTime);
          osc.stop(ctx.currentTime + 1.5);
        };

        const playSLOTube = () => {
          if (ctx.state === 'suspended') ctx.resume();
          
          const osc1 = ctx.createOscillator();
          const osc2 = ctx.createOscillator();
          const gain = ctx.createGain();
          
          osc1.type = 'sine';
          osc2.type = 'sine';
          
          osc1.frequency.setValueAtTime(523.25, ctx.currentTime);
          osc2.frequency.setValueAtTime(783.99, ctx.currentTime);
          
          gain.gain.setValueAtTime(0, ctx.currentTime);
          gain.gain.linearRampToValueAtTime(0.04, ctx.currentTime + 0.1);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 2);
          
          osc1.connect(gain);
          osc2.connect(gain);
          gain.connect(ctx.destination);
          
          osc1.start(ctx.currentTime);
          osc2.start(ctx.currentTime);
          osc1.stop(ctx.currentTime + 2);
          osc2.stop(ctx.currentTime + 2);
        };

        ctx.resume().then(() => {
          playEAI();
          setTimeout(playSLOTube, 1800);
        }).catch(() => {});
      }
    } catch (e) {
      console.log('Audio autoplay blocked or unsupported');
    }

    const eaiTimer = setTimeout(() => {
      setStage('slotube');
    }, 1800);

    const completeTimer = setTimeout(() => {
      onComplete();
    }, 4000);

    return () => {
      clearTimeout(eaiTimer);
      clearTimeout(completeTimer);
    };
  }, [onComplete]);

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.8, ease: "easeInOut" }}
      className="absolute inset-0 z-[100] flex flex-col items-center justify-center bg-[#f5f5f5] overflow-hidden"
    >
      <AnimatePresence mode="wait">
        {stage === 'eai' ? (
          <motion.div
            key="eai"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 1.1, opacity: 0, filter: 'blur(8px)' }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="flex flex-col items-center"
          >
            <div className="text-zinc-900 text-6xl font-black tracking-tighter mb-4">
              EAI
            </div>
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: 120 }}
              transition={{ duration: 1.5, ease: "easeInOut" }}
              className="h-1 bg-zinc-200 rounded-full overflow-hidden"
            >
              <motion.div 
                initial={{ x: '-100%' }}
                animate={{ x: '100%' }}
                transition={{ duration: 1, ease: "easeInOut", repeat: Infinity }}
                className="w-full h-full bg-zinc-600 rounded-full"
              />
            </motion.div>
          </motion.div>
        ) : (
          <motion.div
            key="slotube"
            initial={{ scale: 0.9, opacity: 0, filter: 'blur(8px)' }}
            animate={{ scale: 1, opacity: 1, filter: 'blur(0px)' }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="flex flex-col items-center"
          >
            <h1 className="text-5xl tracking-tight text-zinc-900 flex justify-center items-center gap-2 font-sans mb-3">
              <span className="font-bold">SLO</span><span className="bg-black text-[#0f0] font-mono font-bold px-3 py-1 rounded-lg border border-[#0f0]/30 shadow-[0_0_10px_rgba(0,255,0,0.1)] tracking-widest text-3xl">TUBE</span>
            </h1>
            <p className="text-sm font-mono tracking-widest uppercase text-zinc-500 mt-2">
              Educatieve Hub
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

const steps = [
  {
    title: "Welkom bij SLOTube",
    desc: "Een centraal platform om lesmateriaal, video's en artikelen te zoeken die naadloos aansluiten bij de SLO-kerndoelen.",
    icon: <PlayCircle className="w-12 h-12 text-[#0f0]" />,
    bg: "bg-black"
  },
  {
    title: "1. Zoeken",
    desc: "Zoek direct op een onderwerp, YouTube URL, of webartikel in de zoekbalk. SLOtube checkt automatisch welke bronnen er zijn of schraapt live het internet voor je.",
    icon: <Search className="w-12 h-12 text-blue-500" />,
    bg: "bg-blue-50"
  },
  {
    title: "2. Kerndoelen Verbinden",
    desc: "Als je iets zoekt, suggereert SLOTube direct onderliggende SLO-kerndoelen. Je kunt direct browsen via specifieke vakgebieden.",
    icon: <Database className="w-12 h-12 text-emerald-500" />,
    bg: "bg-emerald-50"
  },
  {
    title: "3. Beoordelen",
    desc: "Docenten en experts kunnen gevonden lesmateriaal en de bijbehorende kerndoelen beoordelen. Alleen goedgekeurde materialen belanden in de vaste mediatheek.",
    icon: <ShieldCheck className="w-12 h-12 text-purple-500" />,
    bg: "bg-purple-50"
  },
  {
    title: "4. Lesgeven",
    desc: "Alles wordt opgemaakt in een gestructureerde lesomgeving met makkelijke previews. Veilig en overzichtelijk voor in de klas.",
    icon: <GraduationCap className="w-12 h-12 text-amber-500" />,
    bg: "bg-amber-50"
  }
];

export default function Tutorial() {
  const [isBooting, setIsBooting] = useState(true);
  const [currentStep, setCurrentStep] = useState(0);
  const navigate = useNavigate();

  return (
    <div className="relative w-full min-h-[calc(100vh-4rem)] flex flex-col pt-12 overflow-hidden bg-white">
      <AnimatePresence>
        {isBooting && <TutorialBootSplash onComplete={() => setIsBooting(false)} />}
      </AnimatePresence>
      
      {!isBooting && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-3xl mx-auto w-full px-6 flex flex-col items-center pb-24"
        >
          <div className="flex items-center gap-2 mb-12">
            <span className="font-bold text-xl text-zinc-900">SLO</span>
            <span className="bg-black text-[#0f0] font-mono font-bold px-2 py-0.5 rounded border border-[#0f0]/30 tracking-widest text-sm">TUBE</span>
            <span className="text-zinc-300 mx-2">/</span>
            <span className="text-sm font-semibold text-zinc-500 tracking-wider uppercase">Platform Gids</span>
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
      )}
    </div>
  );
}
