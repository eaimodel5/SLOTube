import { useAuth } from '../context/AuthContext';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { BookOpen, Search, LayoutDashboard, ShieldCheck, LogOut, HelpCircle, Menu, X, Home } from 'lucide-react';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

export default function Layout() {
  const { role, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    // 1. Dynamic document titles for better context
    const titles: Record<string, string> = {
      '/teacher': 'Ontdek - SLOTube',
      '/teacher/goals': 'Doelen - SLOTube',
      '/admin': 'Beheer - SLOTube',
      '/admin/review': 'Reviewomgeving - SLOTube',
      '/tutorial': 'Tutorial - SLOTube'
    };
    
    let title = titles[location.pathname] || 'SLOTube';
    if (location.pathname.includes('/goals/')) title = 'Kerndoel - SLOTube';
    if (location.pathname.includes('/videos/')) title = 'Lesmateriaal - SLOTube';
    
    document.title = title;

    // 2. Scroll to top on route change for the inner scroll container
    const mainEl = document.getElementById('main-scroll-container');
    if (mainEl) {
      mainEl.scrollTo(0, 0);
    }
    
    // Close mobile menu on navigate
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const teacherNav = [
    { to: "/teacher", icon: BookOpen, label: "Ontdek & zoek" },
    { to: "/tutorial", icon: HelpCircle, label: "Hoe werkt SLOTube" },
  ];

  const adminNav = [
    { to: "/admin", icon: LayoutDashboard, label: "Beheer" },
    { to: "/admin/review", icon: ShieldCheck, label: "Reviewomgeving" },
  ];

  const databaasNav = [
    { to: "/admin/review", icon: ShieldCheck, label: "Reviewomgeving" },
  ];

  const navItems = role === 'admin' ? adminNav : role === 'databaas' ? databaasNav : teacherNav;
  
  const homeRoute = role === 'admin' ? '/admin' : role === 'databaas' ? '/admin/review' : '/teacher';

  return (
    <div className="flex w-full max-w-full h-[100dvh] bg-[#f5f5f5] overflow-hidden">
      {/* Sidebar - Desktop */}
      <aside className="w-64 bg-white border-r border-[#e5e5e5] hidden md:flex flex-col">
        <div 
          className="p-6 border-b border-[#e5e5e5] cursor-pointer hover:bg-zinc-50 transition-colors"
          onClick={() => navigate(homeRoute)}
        >
          <div className="flex items-center gap-1.5 mb-1 text-2xl tracking-tight text-zinc-900 font-sans">
            <span className="font-bold">SLO</span><span className="bg-black text-[#0f0] font-mono font-bold px-1.5 py-0.5 rounded border border-[#0f0]/30 shadow-[0_0_8px_rgba(0,255,0,0.1)] tracking-widest text-sm">TUBE</span>
          </div>
          <p className="text-[11px] font-mono tracking-widest uppercase text-zinc-500">
            Educatieve hub
          </p>
        </div>
        
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/teacher" || item.to === "/admin"}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  isActive 
                    ? "bg-zinc-100 text-zinc-900 font-medium" 
                    : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50"
                }`
              }
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* EAI Footer */}
        <div className="p-4 border-t border-[#e5e5e5] mt-auto">
           {/* Role Switcher (Mock) */}
          <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-400 mb-2">Ingelogd</div>
          <button 
            onClick={() => {
              logout();
            }}
            className="w-full flex items-center justify-between px-3 py-2 text-sm bg-zinc-50 border border-zinc-200 rounded-lg hover:bg-zinc-100 hover:text-zinc-900 hover:border-zinc-300 transition mb-4 group"
            title="Wissel van rol"
          >
            <span className="font-medium text-zinc-700 group-hover:text-zinc-900">
              Als {role === 'databaas' ? 'reviewer' : role === 'admin' ? 'beheerder' : 'docent'}
            </span>
            <LogOut className="w-3 h-3 text-zinc-400 group-hover:text-zinc-900" />
          </button>
          <div className="text-center w-full pb-2">
            <span className="text-[10px] font-mono leading-tight uppercase tracking-widest text-zinc-400 block px-2">
              H. Visser EAI Analyse & Advies
            </span>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-[100dvh] overflow-hidden relative">
        {/* Mobile Header */}
        <header className="md:hidden bg-white border-b border-[#e5e5e5] p-4 flex items-center justify-between z-40 relative">
          <div 
            className="flex items-center gap-1.5 text-xl tracking-tight text-zinc-900 font-sans cursor-pointer"
            onClick={() => navigate(homeRoute)}
          >
            <span className="font-bold">SLO</span><span className="bg-black text-[#0f0] font-mono font-bold px-1.5 py-0.5 rounded border border-[#0f0]/30 shadow-[0_0_8px_rgba(0,255,0,0.1)] tracking-widest text-xs">TUBE</span>
          </div>
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 -mr-2 text-zinc-600 hover:text-zinc-900 focus:outline-none"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </header>

        {/* Mobile Menu Backdrop */}
        {mobileMenuOpen && (
          <div 
            className="md:hidden fixed inset-0 bg-black/20 z-40"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}

        {/* Mobile Menu Slide-out */}
        <div 
          className={`md:hidden fixed top-[65px] left-0 right-0 bottom-0 bg-white z-50 transform transition-transform duration-300 ease-in-out ${mobileMenuOpen ? 'translate-x-0' : 'translate-x-full'} flex flex-col`}
        >
          <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/teacher" || item.to === "/admin"}
                className={({ isActive }) =>
                  `flex items-center gap-4 px-4 py-4 rounded-xl text-base transition-colors border ${
                    isActive 
                      ? "bg-zinc-900 border-zinc-900 text-white font-medium" 
                      : "bg-zinc-50 border-zinc-100 text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900"
                  }`
                }
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </NavLink>
            ))}
          </nav>
          
          <div className="p-6 border-t border-zinc-100 bg-zinc-50 pb-safe">
            <div className="text-xs font-mono uppercase tracking-widest text-zinc-400 mb-3 block">Account & Rol</div>
            <button 
              onClick={() => {
                logout();
              }}
              className="w-full flex items-center justify-between px-4 py-4 text-sm bg-white border border-zinc-200 rounded-xl hover:bg-zinc-50 transition-colors shadow-sm"
            >
              <div className="flex flex-col items-start gap-1">
                <span className="font-medium text-zinc-900 text-sm">
                  Rol wisselen / Uitloggen
                </span>
                <span className="text-zinc-500 text-xs">
                  Nu ingelogd als {role === 'databaas' ? 'reviewer' : role === 'admin' ? 'beheerder' : 'docent'}
                </span>
              </div>
              <LogOut className="w-5 h-5 text-zinc-400" />
            </button>
            <div className="mt-8 text-center text-[10px] font-mono leading-relaxed uppercase tracking-widest text-zinc-400">
              H. Visser EAI Analyse & Advies
            </div>
          </div>
        </div>

        {/* Main Content */}
        <main id="main-scroll-container" className="flex-1 w-full max-w-full overflow-y-auto overflow-x-hidden bg-zinc-50/30 relative z-0 pb-safe">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="h-full"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
