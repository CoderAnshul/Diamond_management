import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
  FiLayout,
  FiKey,
  FiUsers,
  FiGrid,
  FiFileText,
  FiUserCheck,
  FiSettings,
  FiLogOut,
  FiSun,
  FiMoon,
  FiMenu,
  FiX
} from 'react-icons/fi';

const DashboardLayout = () => {
  const { user, logout, hasPermission } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { name: 'Dashboard', path: '/', icon: FiLayout, permission: null },
    { name: 'Locker Entry', path: '/entry', icon: FiKey, permission: 'canCreateLockerEntry' },
    { name: 'Customers', path: '/customers', icon: FiUsers, permission: 'canRegisterCustomer' },
    { name: 'Lockers', path: '/lockers', icon: FiGrid, permission: null }, // Lockers list visible to all, actions protected
    { name: 'Reports', path: '/reports', icon: FiFileText, permission: 'canViewReports' },
    { name: 'Staff Management', path: '/staff', icon: FiUserCheck, role: 'owner' },
    { name: 'Settings', path: '/settings', icon: FiSettings, role: 'owner' }
  ];

  const filteredNavItems = navItems.filter(item => {
    if (item.role && user?.role !== item.role) return false;
    if (item.permission && !hasPermission(item.permission)) return false;
    return true;
  });

  return (
    <div className="flex h-screen overflow-hidden bg-zinc-950 text-zinc-50 light:bg-zinc-50 light:text-zinc-900 transition-colors duration-300">
      
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex flex-col w-64 glass-panel border-r border-zinc-800/60 light:border-zinc-200/60 m-3 rounded-2xl overflow-hidden transition-all duration-300 shadow-2xl">
        <div className="p-6 border-b border-zinc-800/40 light:border-zinc-200/40">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-emerald-500/20">
              D
            </div>
            <div>
              <h1 className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-teal-400">
                DIAMOND
              </h1>
              <p className="text-[10px] text-zinc-400 font-semibold tracking-wider -mt-1 uppercase">
                Locker System
              </p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          {filteredNavItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 group ${
                  isActive
                    ? 'bg-gradient-to-r from-emerald-500/20 to-teal-500/10 text-emerald-400 border-l-4 border-emerald-400 pl-3 shadow-inner'
                    : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/40 light:text-zinc-600 light:hover:text-zinc-900 light:hover:bg-zinc-200/50'
                }`
              }
            >
              <item.icon className="w-5 h-5 transition-transform group-hover:scale-110" />
              <span>{item.name}</span>
            </NavLink>
          ))}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-zinc-800/40 light:border-zinc-200/40 flex flex-col space-y-3">
          {/* User profile brief */}
          <div className="flex items-center space-x-3 px-2">
            <div className="w-9 h-9 rounded-full bg-zinc-800 light:bg-zinc-200 flex items-center justify-center font-bold text-emerald-400">
              {user?.username?.substring(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold truncate uppercase">{user?.username}</p>
              <p className="text-[10px] text-zinc-500 capitalize">{user?.role}</p>
            </div>
          </div>

          <div className="flex items-center justify-end pt-2">
            <button
              onClick={handleLogout}
              className="flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-450 hover:bg-rose-500/10 hover:text-rose-400 transition-all cursor-pointer"
            >
              <FiLogOut className="w-4 h-4" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Sidebar - Mobile Menu Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden bg-zinc-950/80 backdrop-blur-sm">
          <aside className="w-64 glass-panel h-full flex flex-col p-6 animate-slide-in">
            <div className="flex items-center justify-between pb-6 border-b border-zinc-800/40">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center text-white font-bold text-lg">
                  D
                </div>
                <h1 className="text-md font-bold text-emerald-400">DIAMOND</h1>
              </div>
              <button onClick={() => setMobileMenuOpen(false)} className="text-zinc-400 hover:text-zinc-100">
                <FiX className="w-6 h-6" />
              </button>
            </div>
            
            <nav className="flex-1 py-6 space-y-1">
              {filteredNavItems.map((item) => (
                <NavLink
                  key={item.name}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-emerald-500/20 text-emerald-400 border-l-4 border-emerald-400 pl-3'
                        : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-850'
                    }`
                  }
                >
                  <item.icon className="w-5 h-5" />
                  <span>{item.name}</span>
                </NavLink>
              ))}
            </nav>

            <div className="border-t border-zinc-800/40 pt-4 flex items-center justify-end">
              <button onClick={handleLogout} className="flex items-center space-x-2 text-rose-455">
                <FiLogOut className="w-4 h-4" />
                <span className="text-sm">Logout</span>
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden m-3 md:ml-0">
        {/* Header - Mobile Trigger */}
        <header className="flex md:hidden items-center justify-between p-4 glass-panel rounded-2xl mb-3 shadow-lg">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center text-white font-bold text-lg">
              D
            </div>
            <span className="font-bold text-md tracking-wider">DIAMOND LOCKER</span>
          </div>
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="p-2 rounded-lg bg-zinc-900 text-zinc-400"
          >
            <FiMenu className="w-6 h-6" />
          </button>
        </header>

        {/* Content Outlet */}
        <main className="flex-1 overflow-y-auto glass-panel rounded-2xl p-6 shadow-2xl relative transition-all duration-300">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
