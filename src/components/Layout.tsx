import { useAuth } from '../context/AuthContext';
import { NavLink, Outlet } from 'react-router-dom';
import { BookOpen, Search, LayoutDashboard, ShieldCheck, LogOut } from 'lucide-react';

export default function Layout() {
  const { role, setRole } = useAuth();

  const teacherNav = [
    { to: "/teacher", icon: BookOpen, label: "Home" },
    { to: "/teacher/goals", icon: Search, label: "Zoek Kerndoel" },
  ];

  const adminNav = [
    { to: "/admin", icon: LayoutDashboard, label: "Dashboard" },
    { to: "/admin/review", icon: ShieldCheck, label: "Review Queue" },
  ];

  const navItems = role === 'admin' ? adminNav : teacherNav;

  return (
    <div className="flex h-screen bg-[#f5f5f5] overflow-hidden">
      {/* Sidebar - Desktop */}
      <aside className="w-64 bg-white border-r border-[#e5e5e5] hidden md:flex flex-col">
        <div className="p-6 border-b border-[#e5e5e5]">
          <h1 className="text-xl font-semibold tracking-tight text-zinc-900">
            SLO<span className="text-zinc-400">Tube</span>
          </h1>
          <p className="text-[11px] font-mono tracking-widest uppercase text-zinc-500 mt-1">
            Educatieve Hub
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
          <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-400 mb-2">Actieve Rol</div>
          <button 
            onClick={() => setRole(role === 'admin' ? 'docent' : 'admin')}
            className="w-full flex items-center justify-between px-3 py-2 text-sm bg-zinc-50 border border-zinc-200 rounded-lg hover:bg-zinc-100 transition mb-4"
          >
            <span className="font-medium text-zinc-700 capitalize">
              Role: {role}
            </span>
            <LogOut className="w-3 h-3 text-zinc-400" />
          </button>
          <div className="text-center w-full pb-2">
            <span className="text-[10px] font-mono leading-tight uppercase tracking-widest text-zinc-400 block px-2">
              H. Visser EAI Analyse & Advies
            </span>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Mobile Header */}
        <header className="md:hidden bg-white border-b border-[#e5e5e5] p-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold tracking-tight text-zinc-900">
            SLO<span className="text-zinc-400">Tube</span>
          </h1>
          <button 
            onClick={() => setRole(role === 'admin' ? 'docent' : 'admin')}
            className="text-xs font-medium px-3 py-1.5 bg-zinc-100 rounded-md"
          >
            Role: {role}
          </button>
        </header>

        {/* Mobile Navigation (Bottom Bar) */}
        <nav className="md:hidden bg-white border-t border-[#e5e5e5] flex items-center justify-around fixed bottom-0 left-0 right-0 z-50 pb-safe">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/teacher" || item.to === "/admin"}
              className={({ isActive }) =>
                `flex flex-col items-center gap-1 p-3 text-[10px] transition-colors flex-1 ${
                  isActive 
                    ? "text-zinc-900 font-medium" 
                    : "text-zinc-500 hover:text-zinc-900"
                }`
              }
            >
              <item.icon className="w-5 h-5" />
              <span className="truncate w-full text-center">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto pb-16 md:pb-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
