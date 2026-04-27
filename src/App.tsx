import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import Layout from './components/Layout';
import { AuthProvider, useAuth } from './context/AuthContext';

// Pages
import Login from './pages/Login';
import TeacherHome from './pages/teacher/TeacherHome';
import GoalBrowser from './pages/teacher/GoalBrowser';
import GoalDetail from './pages/teacher/GoalDetail';
import VideoDetail from './pages/teacher/VideoDetail';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminReview from './pages/admin/AdminReview';

// Simple Router Guard
function RoleGuard({ requiredRoles, children }: { requiredRoles: string[], children: React.ReactNode }) {
  const { role, isAuthenticated } = useAuth();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!requiredRoles.includes(role as string)) {
    return <Navigate to={`/${role === 'admin' || role === 'databaas' ? 'admin/review' : 'teacher'}`} replace />;
  }
  return <>{children}</>;
}

function BootSplash({ onComplete }: { onComplete: () => void }) {
  const [stage, setStage] = useState<'eai' | 'slotube'>('eai');

  useEffect(() => {
    // Attempt to play a subtle startup sound using Web Audio API
    // Note: This may be blocked by browser autoplay policies if the user hasn't interacted with the document yet.
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContext) {
        const ctx = new AudioContext();
        
        // EAI sound: Deep warm chord
        const playEAI = () => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(220, ctx.currentTime); // A3
          osc.frequency.exponentialRampToValueAtTime(220, ctx.currentTime + 1);
          
          gain.gain.setValueAtTime(0, ctx.currentTime);
          gain.gain.linearRampToValueAtTime(0.05, ctx.currentTime + 0.2); // Very quiet
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.5);
          
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(ctx.currentTime);
          osc.stop(ctx.currentTime + 1.5);
        };

        // SLOTube sound: Two-tone bright chime
        const playSLOTube = () => {
          if (ctx.state === 'suspended') ctx.resume();
          
          const osc1 = ctx.createOscillator();
          const osc2 = ctx.createOscillator();
          const gain = ctx.createGain();
          
          osc1.type = 'sine';
          osc2.type = 'sine'; // using sine for soft chime
          
          osc1.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
          osc2.frequency.setValueAtTime(783.99, ctx.currentTime); // G5 
          
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

        // If resume is required by browser policy, it might fail silently here.
        ctx.resume().then(() => {
          playEAI();
          setTimeout(playSLOTube, 1800);
        }).catch(() => {
          // play silently failed
        });
      }
    } catch (e) {
      console.log('Audio autoplay blocked or unsupported');
    }

    const eaiTimer = setTimeout(() => {
      setStage('slotube');
    }, 1800); // 1.8 seconds for EAI

    const completeTimer = setTimeout(() => {
      onComplete();
    }, 4000); // Total 4 seconds

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
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#f5f5f5] overflow-hidden"
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
            <h1 className="text-5xl font-semibold tracking-tight text-zinc-900 mb-2">
              SLO<span className="text-zinc-400">Tube</span>
            </h1>
            <p className="text-sm font-mono tracking-widest uppercase text-zinc-500">
              Educatieve Hub
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function App() {
  const [isBooting, setIsBooting] = useState(true);

  return (
    <AuthProvider>
      <AnimatePresence>
        {isBooting && <BootSplash onComplete={() => setIsBooting(false)} />}
      </AnimatePresence>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />
          <Route element={<Layout />}>
            {/* Teacher Routes */}
            <Route path="/teacher" element={
              <RoleGuard requiredRoles={['docent']}>
                <TeacherHome />
              </RoleGuard>
            } />
            <Route path="/teacher/goals" element={
              <RoleGuard requiredRoles={['docent']}>
                <GoalBrowser />
              </RoleGuard>
            } />
            <Route path="/teacher/goals/:id" element={
              <RoleGuard requiredRoles={['docent']}>
                <GoalDetail />
              </RoleGuard>
            } />
            <Route path="/teacher/videos/:id" element={
              <RoleGuard requiredRoles={['docent']}>
                <VideoDetail />
              </RoleGuard>
            } />

            {/* Admin Routes */}
            <Route path="/admin" element={
              <RoleGuard requiredRoles={['admin']}>
                <AdminDashboard />
              </RoleGuard>
            } />
            <Route path="/admin/review" element={
              <RoleGuard requiredRoles={['admin', 'databaas']}>
                <AdminReview />
              </RoleGuard>
            } />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
