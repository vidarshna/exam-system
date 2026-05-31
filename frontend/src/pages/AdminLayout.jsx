import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  LayoutDashboard, Database, FileSpreadsheet, Users, 
  LogOut, Search, Bell, Calendar,
  ChevronRight, X, Clock, History
} from 'lucide-react';
import { api } from '../services/api';

export default function AdminLayout({ children, activePage, headerTitle, headerActions }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [showNotif,       setShowNotif]       = useState(false);
  const [showCalendar,    setShowCalendar]    = useState(false);
  const [showSearch,      setShowSearch]      = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [searchQuery,     setSearchQuery]     = useState('');
  const searchInputRef = useRef(null);

  const [notifications, setNotifications] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const formatTimeAgo = (dateString) => {
    if (!dateString) return 'Just now';
    const now = new Date();
    const date = new Date(dateString);
    const diffMs = now - date;
    if (diffMs < 0) return 'Just now';
    
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hr${diffHours > 1 ? 's' : ''} ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  };

  const fetchNotifications = async () => {
    try {
      const data = await api.getNotifications();
      setNotifications(data || []);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (error) {
      console.error('Error marking notifications as read:', error);
    }
  };

  const handleClearAll = async () => {
    try {
      await api.clearNotifications();
      setNotifications([]);
    } catch (error) {
      console.error('Error clearing notifications:', error);
    }
  };

  const handleMarkSingleRead = async (id) => {
    try {
      await api.markNotificationAsRead(id);
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, read: true } : n));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000);
    return () => clearInterval(interval);
  }, []);

  const searchItems = [
    { label: 'Admin Dashboard Overview', path: '/admin', category: 'Page', desc: 'Home metrics and subject performance charts', keywords: ['home', 'stats', 'overall'] },
    { label: 'Student Candidates Management', path: '/admin/students', category: 'Page', desc: 'View, edit, or remove student profiles', keywords: ['students', 'candidates', 'users', 'list'] },
    { label: 'Question Bank Database', path: '/admin/questions', category: 'Page', desc: 'Configure evaluation question resources', keywords: ['questions', 'database', 'answers', 'bank'] },
    { label: 'Exam Evaluation Settings', path: '/admin/exams', category: 'Page', desc: 'Create, modify, or schedule evaluations', keywords: ['exams', 'tests', 'evaluations', 'schedule'] },
    { label: 'Enroll New Student Profile', path: '/admin/students', category: 'Action', desc: 'Enroll a new candidate profile', keywords: ['enroll', 'add student', 'register'] },
    { label: 'Create New Exam Template', path: '/admin/exams', category: 'Action', desc: 'Configure a new evaluation module', keywords: ['new exam', 'create test', 'add exam'] },
    { label: 'Add Database Question', path: '/admin/questions', category: 'Action', desc: 'Insert a new item into question bank', keywords: ['add question', 'new question', 'insert'] }
  ];

  const query = searchQuery.trim().toLowerCase();
  const filteredItems = searchItems.filter(item => 
    item.label.toLowerCase().includes(query) ||
    item.desc.toLowerCase().includes(query) ||
    item.category.toLowerCase().includes(query) ||
    item.keywords.some(k => k.toLowerCase().includes(query))
  );

  // Close panels on outside click
  useEffect(() => {
    const handler = (e) => {
      if (!e.target.closest('[data-panel]')) {
        setShowNotif(false);
        setShowCalendar(false);
        setShowSearch(false);
        setShowProfileMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Focus search input when panel opens
  useEffect(() => {
    if (showSearch && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [showSearch]);

  const now = new Date();
  const dateStr  = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const timeStr  = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  const month    = now.toLocaleString('en-US', { month: 'long' });
  const year     = now.getFullYear();
  const firstDay = new Date(year, now.getMonth(), 1).getDay();
  const daysInMonth = new Date(year, now.getMonth() + 1, 0).getDate();
  const today    = now.getDate();

  const sidebarItems = [
    { name: 'Dashboard',          path: '/admin',           icon: LayoutDashboard },
    { name: 'Student Management', path: '/admin/students',  icon: Users           },
    { name: 'Submissions Log',    path: '/admin/submissions', icon: History         },
    { name: 'Manage Questions',   path: '/admin/questions', icon: Database        },
    { name: 'Configure Exams',    path: '/admin/exams',     icon: FileSpreadsheet },
  ];

  return (
    <div className="h-screen flex font-sans bg-[#f0f1fa] overflow-hidden">

      {/* Mobile Sidebar Backdrop */}
      {sidebarOpen && (
        <div 
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm md:hidden animate-fade-in"
        />
      )}

      {/* ── Dark Sidebar Drawer ─────────────────────────────────── */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 md:w-56 md:relative md:translate-x-0 md:flex flex-col h-screen overflow-y-auto
                        bg-gradient-to-b from-[#312e81] via-[#2d2b8b] to-[#1e1b5e]
                        shadow-2xl shadow-indigo-900/40 transition-transform duration-300 ease-in-out ${
                          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
                        }`}>

        {/* Brand */}
        <div className="px-5 pt-7 pb-5 flex items-center justify-between gap-3 select-none">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#0d0b21] border border-white/10 flex items-center justify-center flex-shrink-0 shadow-lg overflow-hidden">
              <img src="/genz_logo.png" alt="GenZ" className="w-7 h-7 object-contain" />
            </div>
            <div className="min-w-0">
              <span className="font-black text-white text-sm tracking-wide leading-none block truncate">
                GenZ Learners
              </span>
              <span className="text-[9px] text-indigo-300 font-bold tracking-widest block mt-0.5">ADMIN PORTAL</span>
            </div>
          </div>
          {/* Close button on mobile */}
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg md:hidden flex items-center justify-center cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Sidebar Space Adjustment */}
        <div className="mt-2" />

        {/* Nav */}
        <nav className="flex-1 px-3 flex flex-col gap-0.5">
          {sidebarItems.map(item => {
            const active = item.name === activePage;
            return (
              <button
                key={item.name}
                onClick={() => {
                  navigate(item.path);
                  setSidebarOpen(false); // Close sidebar drawer on mobile nav
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold
                            transition-all duration-200 cursor-pointer text-left group ${
                  active
                    ? 'bg-white/20 text-white shadow-lg shadow-black/20'
                    : 'text-white/55 hover:text-white hover:bg-white/10'
                }`}
              >
                <item.icon className={`w-4 h-4 flex-shrink-0 transition-colors ${
                  active ? 'text-white' : 'text-white/40 group-hover:text-white/80'
                }`} />
                <span className="flex-1 leading-none">{item.name}</span>
                <ChevronRight className={`w-3 h-3 flex-shrink-0 transition-colors ${
                  active ? 'text-white/70' : 'text-white/20 group-hover:text-white/50'
                }`} />
              </button>
            );
          })}
        </nav>

        {/* Bottom Actions */}
        <div className="px-3 pb-7 flex flex-col gap-1 mt-4">
          <div className="mx-2 h-px bg-white/10 mb-3" />
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold
                       text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all cursor-pointer"
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            <span>Sign Out</span>
            <ChevronRight className="w-3 h-3 ml-auto text-red-400/30" />
          </button>
        </div>
      </aside>

      {/* ── Main Content Area ──────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">

        {/* Minimal Top Bar */}
        <div className="flex items-center justify-between px-4 md:px-8 pt-6 pb-4 flex-shrink-0">
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            {/* Hamburger Toggle Button */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 bg-white border border-slate-200 text-slate-500 rounded-xl hover:text-indigo-600 md:hidden flex-shrink-0 flex items-center justify-center cursor-pointer shadow-sm transition-all"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div className="min-w-0 flex-1">
              <p className="text-slate-400 text-[10px] font-semibold mb-0.5 hidden sm:block">
                Hello {user?.name?.split(' ')[0] || 'Admin'}, Welcome back
              </p>
              <h1 className="text-slate-800 text-base md:text-xl font-black leading-tight tracking-wide truncate">
                {headerTitle || 'Admin Dashboard'}
              </h1>
            </div>
          </div>

          {/* Action Area (Icons & Profile) */}
          <div className="flex items-center gap-2 md:gap-4 flex-shrink-0">
            {/* Header Action Buttons */}
            <div className="flex items-center gap-1.5 sm:gap-2.5">
              {headerActions}

              {/* ── Notification Bell ── */}
              <div className="relative flex-shrink-0" data-panel>
                <button
                  onClick={() => { setShowNotif(v => !v); setShowCalendar(false); setShowSearch(false); }}
                  className="w-9 h-9 rounded-xl bg-white border border-slate-200 text-slate-500
                             hover:text-indigo-600 hover:border-indigo-300 hover:shadow-md
                             transition-all shadow-sm flex items-center justify-center relative"
                >
                  <Bell className="w-4 h-4" />
                  {notifications.some(n => !n.read) && (
                    <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_4px_rgba(239,68,68,0.8)]" />
                  )}
                </button>

                {showNotif && (
                  <>
                    {/* Mobile Backdrop */}
                    <div
                      className="fixed inset-0 bg-slate-900/30 backdrop-blur-[2px] z-40 md:hidden animate-backdrop-in"
                      onClick={() => setShowNotif(false)}
                    />

                    {/* Desktop Dropdown / Mobile Bottom Sheet */}
                    <div
                      className="
                        fixed bottom-0 left-0 right-0 z-50
                        md:absolute md:bottom-auto md:left-auto md:right-0 md:top-11 md:w-80
                        bg-white
                        rounded-t-3xl md:rounded-2xl
                        shadow-2xl border border-slate-200/80
                        overflow-hidden
                        animate-sheet-up md:animate-fade-in
                      "
                      data-panel
                    >
                      {/* Drag Handle — mobile only */}
                      <div className="flex justify-center pt-3 pb-0 md:hidden">
                        <div className="w-10 h-1 rounded-full bg-slate-200" />
                      </div>

                      {/* Header */}
                      <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-xl bg-indigo-50 flex items-center justify-center">
                            <Bell className="w-3.5 h-3.5 text-indigo-600" />
                          </div>
                          <span className="text-sm font-black text-slate-800 tracking-tight">Notifications</span>
                          {notifications.filter(n => !n.read).length > 0 && (
                            <span className="px-2 py-0.5 text-[9px] font-black bg-indigo-600 text-white rounded-full">
                              {notifications.filter(n => !n.read).length} new
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {notifications.some(n => !n.read) && (
                            <button
                              onClick={handleMarkAllRead}
                              className="text-[10px] font-black text-indigo-600 hover:text-indigo-800 transition-colors cursor-pointer bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-lg"
                            >
                              Mark all read
                            </button>
                          )}
                          <button onClick={() => setShowNotif(false)} className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Notification List */}
                      <div className="flex flex-col divide-y divide-slate-100 max-h-[55vh] md:max-h-72 overflow-y-auto">
                        {notifications.length > 0 ? (
                          notifications.map((n) => (
                            <button
                              key={n._id}
                              onClick={async () => {
                                if (!n.read) await handleMarkSingleRead(n._id);
                                navigate(n.path);
                                setShowNotif(false);
                              }}
                              className={`flex items-start gap-3 px-5 py-4 hover:bg-slate-50 transition-colors cursor-pointer text-left w-full relative ${
                                !n.read ? 'bg-indigo-50/20' : ''
                              }`}
                            >
                              <span className={`w-2.5 h-2.5 rounded-full ${n.color || 'bg-slate-400'} mt-1 flex-shrink-0 ${
                                !n.read ? 'animate-pulse ring-4 ring-indigo-500/10' : ''
                              }`} />
                              <div className="flex-1 min-w-0">
                                <p className={`text-xs leading-snug ${!n.read ? 'font-bold text-slate-800' : 'font-medium text-slate-500'}`}>
                                  {n.title}
                                </p>
                                <p className="text-[10px] text-slate-400 font-semibold mt-1 flex items-center gap-1">
                                  <Clock className="w-2.5 h-2.5" /> {formatTimeAgo(n.createdAt)}
                                </p>
                              </div>
                              {!n.read && (
                                <span className="w-2 h-2 rounded-full bg-indigo-500 flex-shrink-0 mt-1" />
                              )}
                            </button>
                          ))
                        ) : (
                          <div className="px-5 py-12 text-center flex flex-col items-center gap-3">
                            <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center">
                              <Bell className="w-7 h-7 text-slate-300 stroke-1" />
                            </div>
                            <div>
                              <p className="text-xs font-black text-slate-500">All caught up!</p>
                              <p className="text-[10px] text-slate-400 font-medium mt-0.5">No new notifications</p>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Footer */}
                      {notifications.length > 0 && (
                        <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
                          <span className="text-[10px] text-slate-400 font-semibold">{notifications.length} total</span>
                          <button
                            onClick={handleClearAll}
                            className="text-[10px] font-black text-red-500 hover:text-red-700 transition-colors cursor-pointer uppercase tracking-wider"
                          >
                            Clear all
                          </button>
                        </div>
                      )}

                      {/* Safe area spacer for mobile */}
                      <div className="h-safe-bottom md:hidden pb-2" />
                    </div>
                  </>
                )}
              </div>


              {/* ── Calendar ── */}
              <div className="relative flex-shrink-0 hidden sm:block" data-panel>
                <button
                  onClick={() => { setShowCalendar(v => !v); setShowNotif(false); setShowSearch(false); }}
                  className="w-9 h-9 rounded-xl bg-white border border-slate-200 text-slate-500
                             hover:text-indigo-600 hover:border-indigo-300 hover:shadow-md
                             transition-all shadow-sm flex items-center justify-center"
                >
                  <Calendar className="w-4 h-4" />
                </button>
                {showCalendar && (
                  <div className="fixed top-16 left-4 right-4 md:absolute md:right-0 md:left-auto md:top-11 md:w-72 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden animate-fade-in" data-panel>
                    {/* Month Header */}
                    <div className="bg-gradient-to-r from-[#312e81] to-[#4f46e5] px-5 py-4">
                      <p className="text-white font-black text-sm">{month} {year}</p>
                      <p className="text-indigo-200 text-xs font-semibold mt-0.5 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {timeStr} · {now.toLocaleDateString('en-US', { weekday: 'long' })}
                      </p>
                    </div>
                    {/* Calendar Grid */}
                    <div className="p-4">
                      <div className="grid grid-cols-7 mb-2">
                        {['S','M','T','W','T','F','S'].map((d, i) => (
                          <div key={i} className="text-center text-[9px] font-black text-slate-400 py-1">{d}</div>
                        ))}
                      </div>
                      <div className="grid grid-cols-7 gap-y-1">
                        {Array.from({ length: firstDay }).map((_, i) => <div key={`e${i}`} />)}
                        {Array.from({ length: daysInMonth }).map((_, i) => {
                          const day = i + 1;
                          const isToday = day === today;
                          return (
                            <div key={day} className={`text-center text-xs py-1 rounded-lg font-bold transition-all cursor-pointer ${
                              isToday
                                ? 'bg-gradient-to-br from-[#312e81] to-[#4f46e5] text-white shadow-md'
                                : 'text-slate-600 hover:bg-indigo-50 hover:text-indigo-700'
                            }`}>
                              {day}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    <div className="px-4 pb-3 border-t border-slate-100 pt-2">
                      <p className="text-[10px] text-slate-400 font-semibold text-center">{dateStr}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* ── Search ── */}
              <div className="relative flex-shrink-0 hidden sm:block" data-panel>
                <button
                  onClick={() => { setShowSearch(v => !v); setShowNotif(false); setShowCalendar(false); }}
                  className="w-9 h-9 rounded-xl bg-white border border-slate-200 text-slate-500
                             hover:text-indigo-600 hover:border-indigo-300 hover:shadow-md
                             transition-all shadow-sm flex items-center justify-center"
                >
                  <Search className="w-4 h-4" />
                </button>
                {showSearch && (
                  <div className="fixed top-16 left-4 right-4 md:absolute md:right-0 md:left-auto md:top-11 md:w-80 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden animate-fade-in" data-panel>
                    <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100">
                      <Search className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                      <input
                        ref={searchInputRef}
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search students, exams, questions..."
                        className="flex-1 text-xs text-slate-700 placeholder-slate-400 font-semibold bg-transparent outline-none"
                      />
                      {searchQuery && (
                        <button onClick={() => setSearchQuery('')} className="text-slate-400 hover:text-slate-600 transition-colors">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    <div className="p-4">
                      {searchQuery ? (
                        filteredItems.length > 0 ? (
                          <div className="flex flex-col gap-1.5 max-h-64 overflow-y-auto scrollbar-thin">
                            <p className="text-[9px] font-black text-slate-400 tracking-wider uppercase mb-1">Search Results ({filteredItems.length})</p>
                            {filteredItems.map((item, idx) => (
                              <button
                                key={idx}
                                onClick={() => { navigate(item.path); setShowSearch(false); setSearchQuery(''); }}
                                className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-indigo-50 text-left transition-all duration-150 group border border-transparent hover:border-indigo-100/50 cursor-pointer"
                              >
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-bold text-slate-700 group-hover:text-indigo-700 truncate">{item.label}</p>
                                  <p className="text-[10px] text-slate-400 font-semibold mt-0.5 truncate">{item.desc}</p>
                                </div>
                                <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider ml-3 ${
                                  item.category === 'Page' 
                                    ? 'bg-indigo-50 border border-indigo-100 text-indigo-600' 
                                    : 'bg-emerald-50 border border-emerald-100 text-emerald-600'
                                }`}>
                                  {item.category}
                                </span>
                              </button>
                            ))}
                          </div>
                        ) : (
                          <div className="p-8 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
                            <Search className="w-8 h-8 text-slate-300" />
                            <span className="text-xs font-semibold">No results found for "{searchQuery}"</span>
                            <span className="text-[10px] text-slate-400 font-medium">Try searching for "student", "exam", or "question".</span>
                          </div>
                        )
                      ) : (
                        <div className="flex flex-col gap-1.5">
                          <p className="text-[9px] font-black text-slate-400 tracking-wider uppercase mb-1">Quick Links</p>
                          {[
                            { label: 'Student Management', path: '/admin/students', icon: Users },
                            { label: 'Manage Questions', path: '/admin/questions', icon: Database },
                            { label: 'Configure Exams', path: '/admin/exams', icon: FileSpreadsheet },
                          ].map(({ label, path, icon: Icon }) => (
                            <button
                              key={path}
                              onClick={() => { navigate(path); setShowSearch(false); }}
                              className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-indigo-50 text-left transition-colors group"
                            >
                              <Icon className="w-3.5 h-3.5 text-indigo-400 group-hover:text-indigo-600 flex-shrink-0" />
                              <span className="text-xs font-bold text-slate-600 group-hover:text-indigo-700">{label}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Vertical Separator */}
            <div className="w-px h-7 bg-slate-200 hidden sm:block flex-shrink-0" />

            {/* Integrated Professional User Profile Section (Clickable Avatar) */}
            <div className="relative flex-shrink-0" data-panel>
              {/* Clickable Avatar Button */}
              <button
                onClick={() => { setShowProfileMenu(v => !v); setShowNotif(false); setShowCalendar(false); setShowSearch(false); }}
                className="relative select-none cursor-pointer group focus:outline-none"
                title={user?.name || 'System Admin'}
              >
                <div className="w-9 h-9 rounded-full bg-indigo-600 border-2 border-indigo-700
                                flex items-center justify-center font-black text-white text-xs shadow-sm
                                group-hover:ring-2 group-hover:ring-indigo-400 group-hover:ring-offset-1
                                transition-all duration-200">
                  {user?.name ? user.name.charAt(0).toUpperCase() : 'A'}
                </div>
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full
                                 border-2 border-white shadow-[0_0_4px_rgba(16,185,129,0.4)]" />
              </button>

              {/* Profile Dropdown Menu */}
              {showProfileMenu && (
                <div className="fixed top-16 left-4 right-4 md:absolute md:right-0 md:left-auto md:top-11 md:w-52 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden animate-fade-in" data-panel>
                  {/* User Info Header */}
                  <div className="px-4 py-3 bg-gradient-to-r from-indigo-50 to-indigo-50/30 border-b border-slate-100 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center font-black text-white text-xs flex-shrink-0">
                      {user?.name ? user.name.charAt(0).toUpperCase() : 'A'}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-black text-slate-800 truncate">{user?.name || 'System Admin'}</p>
                      <p className="text-[9px] text-slate-400 font-bold mt-0.5 truncate">{user?.email || 'admin@genz.com'}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => { logout(); setShowProfileMenu(false); }}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-left text-xs font-bold text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Page Content */}
        <main className="flex-1 px-4 md:px-8 pb-8">
          {children}
        </main>
      </div>
    </div>
  );
}
