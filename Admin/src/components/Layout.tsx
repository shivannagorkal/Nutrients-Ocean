import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useDateRange, RangePreset } from '../context/DateRangeContext';
import { useDataCheck } from '../api/dataCheck';
import {
  Calendar,
  TrendingUp,
  Receipt,
  Users,
  AlertCircle,
  Settings,
  LogOut,
  ChevronDown,
  Menu,
  X,
} from 'lucide-react';

const PRESETS: RangePreset[] = [
  'Today',
  'Yesterday',
  '7 days',
  'This week',
  'This month',
  'Last month',
  'All time',
  'Custom',
];

export default function Layout() {
  const { user, logout } = useAuth();
  const { preset, setPreset, from, to, setCustomRange } = useDateRange();
  const navigate = useNavigate();
  const location = useLocation();

  const [dateMenuOpen, setDateMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [customModalOpen, setCustomModalOpen] = useState(false);
  const [customStart, setCustomStart] = useState(from);
  const [customEnd, setCustomEnd] = useState(to);

  // Show date picker primarily on Today, Sales, Expenses
  const showDateFilter = ['/today', '/sales', '/expenses'].some(path => location.pathname.startsWith(path));

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const { data: dataCheckRes } = useDataCheck();
  const alertCount = (dataCheckRes?.summary?.errors || 0) + (dataCheckRes?.summary?.warnings || 0);

  const navItems = [
    { name: 'Today', path: '/today', icon: Calendar },
    { name: 'Sales', path: '/sales', icon: TrendingUp },
    { name: 'Expenses', path: '/expenses', icon: Receipt },
    { name: 'Partners', path: '/partners', icon: Users },
    { name: 'Data check', path: '/data-check', icon: AlertCircle, badgeCount: alertCount },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans text-slate-800">
      {/* Desktop Sidebar (Material Navigation Drawer) */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-slate-200/80 shadow-sm flex-shrink-0 z-20">
        {/* Brand / Logo */}
        <div className="h-16 flex items-center gap-3 px-6 border-b border-slate-100">
          <div className="h-9 w-9 rounded-xl bg-emerald-600 flex items-center justify-center text-white font-bold text-lg shadow-sm">
            NO
          </div>
          <div>
            <h1 className="font-bold text-slate-900 text-sm tracking-tight leading-none">Nutrients Ocean</h1>
            <p className="text-[11px] text-emerald-700 font-medium mt-1">Sales & Expense Dashboard</p>
          </div>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-emerald-50 text-emerald-800 font-semibold'
                      : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
                  }`
                }
              >
                <div className="flex items-center gap-3">
                  <Icon className="h-4 w-4 flex-shrink-0" />
                  <span>{item.name}</span>
                </div>
                {item.name === 'Data check' && item.badgeCount > 0 && (
                  <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-amber-100 text-amber-800">
                    {item.badgeCount}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* User Card & Logout */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/60">
          <div className="flex items-center justify-between">
            <div className="truncate mr-2">
              <p className="text-xs font-semibold text-slate-900 truncate">{user?.member || 'User'}</p>
              <p className="text-[11px] text-slate-500 truncate">{user?.email}</p>
            </div>
            <button
              onClick={handleLogout}
              title="Logout"
              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top App Bar */}
        <header className="h-16 bg-white border-b border-slate-200/80 px-4 md:px-8 flex items-center justify-between flex-shrink-0 z-10 shadow-sm">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100"
            >
              <Menu className="h-5 w-5" />
            </button>
            <h2 className="text-base font-bold text-slate-800 capitalize">
              {location.pathname.replace('/', '') || 'Today'}
            </h2>
          </div>

          {/* Top Bar Actions: Date-Range Picker & Logout */}
          <div className="flex items-center gap-3">
            {showDateFilter && (
              <div className="relative">
                <button
                  onClick={() => setDateMenuOpen(!dateMenuOpen)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200/80 text-slate-800 text-xs font-medium rounded-lg transition border border-slate-200"
                >
                  <Calendar className="h-3.5 w-3.5 text-slate-600" />
                  <span>{preset === 'Custom' ? `${from} to ${to}` : preset}</span>
                  <ChevronDown className="h-3.5 w-3.5 text-slate-500" />
                </button>

                {dateMenuOpen && (
                  <div className="absolute right-0 mt-1 w-44 bg-white rounded-xl shadow-lg border border-slate-100 py-1 z-50 text-xs">
                    {PRESETS.map((p) => (
                      <button
                        key={p}
                        onClick={() => {
                          if (p === 'Custom') {
                            setDateMenuOpen(false);
                            setCustomModalOpen(true);
                          } else {
                            setPreset(p);
                            setDateMenuOpen(false);
                          }
                        }}
                        className={`w-full text-left px-3.5 py-2 hover:bg-slate-50 transition-colors ${
                          preset === p ? 'text-emerald-700 font-bold bg-emerald-50/50' : 'text-slate-700'
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <button
              onClick={handleLogout}
              className="hidden md:flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition border border-slate-200"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Logout</span>
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 pb-20 md:pb-8">
          <Outlet />
        </main>

        {/* Mobile Bottom Navigation Bar per Section 6.1 */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex justify-around items-center h-14 z-30 shadow-lg px-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex flex-col items-center justify-center flex-1 py-1 text-[10px] font-medium transition-colors ${
                    isActive ? 'text-emerald-700 font-bold' : 'text-slate-500 hover:text-slate-800'
                  }`
                }
              >
                <div className="relative">
                  <Icon className="h-4 w-4 mb-0.5" />
                  {item.name === 'Data check' && item.badgeCount > 0 && (
                    <span className="absolute -top-1 -right-2 h-3.5 min-w-3.5 px-1 bg-rose-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center">
                      {item.badgeCount}
                    </span>
                  )}
                </div>
                <span>{item.name}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Custom Date Modal */}
      {customModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 shadow-2xl max-w-sm w-full border border-slate-100">
            <h3 className="font-bold text-slate-900 text-sm mb-4">Select Custom Date Range</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">From Date</label>
                <input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">To Date</label>
                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setCustomModalOpen(false)}
                className="px-3.5 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (customStart && customEnd) {
                    setCustomRange(customStart, customEnd);
                    setCustomModalOpen(false);
                  }
                }}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm"
              >
                Apply Range
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

