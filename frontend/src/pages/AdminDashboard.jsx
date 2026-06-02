import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { 
  Users, FileSpreadsheet, TrendingUp, Award, Loader2, History,
  ChevronDown, ChevronUp
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import AdminLayout from './AdminLayout';

// Helper function for dynamic avatar colors
const getAvatarColor = (name, role) => {
  if (role === 'admin') return 'bg-amber-500 text-white';
  const colors = [
    'bg-pink-500 text-white',
    'bg-rose-500 text-white',
    'bg-indigo-500 text-white',
    'bg-blue-500 text-white',
    'bg-teal-500 text-white',
    'bg-purple-500 text-white',
    'bg-emerald-500 text-white'
  ];
  let hash = 0;
  const str = name || '';
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const idx = Math.abs(hash) % colors.length;
  return colors[idx];
};

// Custom high-end SaaS styled tooltip for Recharts
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-gradient-to-b from-[#312e81] via-[#2d2b8b] to-[#1e1b5e] text-white p-3.5 rounded-2xl shadow-xl border border-indigo-500/20 text-xs font-semibold flex flex-col gap-2">
        <p className="text-indigo-200/90 font-black uppercase tracking-wider text-[9px] border-b border-indigo-900/60 pb-1.5 mb-0.5">{label}</p>
        {payload.map((item, idx) => {
          const isAvgPercent = item.name.toLowerCase().includes('percentage') || item.name.toLowerCase().includes('percent');
          const gradient = isAvgPercent 
            ? 'linear-gradient(135deg, #5b8cf5, #2563eb)' 
            : 'linear-gradient(135deg, #c7d2fe, #818cf8)';
          return (
            <div key={idx} className="flex items-center justify-between gap-6">
              <span className="text-[10px] font-bold text-indigo-100 uppercase tracking-wider flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ background: gradient }}></span>
                {item.name}
              </span>
              <span className="font-black text-white">
                {item.value}{isAvgPercent ? '%' : ''}
              </span>
            </div>
          );
        })}
      </div>
    );
  }
  return null;
};

export default function AdminDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const userId = user?._id || user?.id || 'default';
    const cacheKey = `cache_admin_stats_${userId}`;

    const loadAdminDashboard = async () => {
      const cachedData = localStorage.getItem(cacheKey);
      if (cachedData) {
        setStats(JSON.parse(cachedData));
        setLoading(false);
      } else {
        setLoading(true);
      }

      try {
        const analyticsData = await api.getAnalyticsDashboard();
        setStats(analyticsData);
        localStorage.setItem(cacheKey, JSON.stringify(analyticsData));
      } catch (err) {
        console.error('Error loading admin dashboard:', err);
        if (!cachedData) {
          setError('Failed to sync administrative dashboard data.');
        }
      } finally {
        setLoading(false);
      }
    };

    loadAdminDashboard();
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
        <p className="text-slate-500 text-sm font-semibold">Loading administrator panel analytics...</p>
      </div>
    );
  }

  // Calculate quick analytics for overall stats indicators
  const overallAvg = stats?.chartsData?.length 
    ? Math.round(stats.chartsData.reduce((acc, curr) => acc + (curr.avgScore || 0), 0) / stats.chartsData.length)
    : 0;

  const totalAttempts = stats?.chartsData?.length
    ? stats.chartsData.reduce((acc, curr) => acc + (curr.attempts || 0), 0)
    : 0;

  return (
    <AdminLayout activePage="Dashboard" headerTitle="OVERALL PLATFORM STATS">
      {/* Stats Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-slide-up">
        {/* TOTAL STUDENTS */}
        <div className="group relative overflow-hidden bg-white border border-slate-200 p-6 rounded-3xl text-slate-800 flex flex-col gap-2 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300">
          {/* Background decorative circles */}
          <div className="absolute -right-6 -bottom-6 w-36 h-36 rounded-full bg-indigo-500/[0.03] pointer-events-none transition-transform duration-500 group-hover:scale-110"></div>
          <div className="absolute right-12 -bottom-16 w-32 h-32 rounded-full bg-indigo-500/[0.05] pointer-events-none transition-transform duration-500 group-hover:scale-110"></div>
          
          {/* Floating Icon */}
          <div className="absolute right-6 top-6 text-indigo-500/35 group-hover:scale-110 group-hover:text-indigo-500/60 transition-all duration-300">
            <Users className="w-9 h-9" />
          </div>

          <span className="text-[10px] font-black bg-indigo-50 border border-indigo-100/60 text-indigo-600 px-3 py-1 rounded-full uppercase tracking-wider self-start">
            Candidate Profiles
          </span>
          <span className="text-[11px] font-bold text-slate-400 tracking-wider uppercase mt-4">Total Students</span>
          <span className="text-4xl font-black text-slate-800 tracking-tight mt-0.5">{stats?.totalStudents || 0}</span>
          <span className="text-xs text-slate-500 font-semibold mt-1">Enrolled student candidates</span>
        </div>

        {/* ACTIVE EXAMS */}
        <div className="group relative overflow-hidden bg-white border border-slate-200 p-6 rounded-3xl text-slate-800 flex flex-col gap-2 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300">
          {/* Background decorative circles */}
          <div className="absolute -right-6 -bottom-6 w-36 h-36 rounded-full bg-indigo-500/[0.03] pointer-events-none transition-transform duration-500 group-hover:scale-110"></div>
          <div className="absolute right-12 -bottom-16 w-32 h-32 rounded-full bg-indigo-500/[0.05] pointer-events-none transition-transform duration-500 group-hover:scale-110"></div>
          
          {/* Floating Icon */}
          <div className="absolute right-6 top-6 text-indigo-500/35 group-hover:scale-110 group-hover:text-indigo-500/60 transition-all duration-300">
            <FileSpreadsheet className="w-9 h-9" />
          </div>

          <span className="text-[10px] font-black bg-indigo-50 border border-indigo-100/60 text-indigo-600 px-3 py-1 rounded-full uppercase tracking-wider self-start">
            Evaluations
          </span>
          <span className="text-[11px] font-bold text-slate-400 tracking-wider uppercase mt-4">Active Exams</span>
          <span className="text-4xl font-black text-slate-800 tracking-tight mt-0.5">{stats?.totalExams || 0}</span>
          <span className="text-xs text-slate-500 font-semibold mt-1">Scheduled exam configurations</span>
        </div>

        {/* TOTAL SUBMISSIONS */}
        <div className="group relative overflow-hidden bg-white border border-slate-200 p-6 rounded-3xl text-slate-800 flex flex-col gap-2 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300">
          {/* Background decorative circles */}
          <div className="absolute -right-6 -bottom-6 w-36 h-36 rounded-full bg-indigo-500/[0.03] pointer-events-none transition-transform duration-500 group-hover:scale-110"></div>
          <div className="absolute right-12 -bottom-16 w-32 h-32 rounded-full bg-indigo-500/[0.05] pointer-events-none transition-transform duration-500 group-hover:scale-110"></div>
          
          {/* Floating Icon */}
          <div className="absolute right-6 top-6 text-indigo-500/35 group-hover:scale-110 group-hover:text-indigo-500/60 transition-all duration-300">
            <History className="w-9 h-9" />
          </div>

          <span className="text-[10px] font-black bg-indigo-50 border border-indigo-100/60 text-indigo-600 px-3 py-1 rounded-full uppercase tracking-wider self-start">
            Submissions
          </span>
          <span className="text-[11px] font-bold text-slate-400 tracking-wider uppercase mt-4">Total Submissions</span>
          <span className="text-4xl font-black text-slate-800 tracking-tight mt-0.5">{stats?.submissions?.length || 0}</span>
          <span className="text-xs text-slate-500 font-semibold mt-1">Completed evaluations logged</span>
        </div>
      </div>

      {/* Graphics Area - Premium 3-column split for charts and leaderboard */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-slide-up delay-100 mt-8">
        {/* Subject Analytics Breakdown Column */}
        <div className="lg:col-span-2 flex flex-col gap-3 min-w-0">
          <h2 className="text-xs font-black text-slate-500 uppercase tracking-wider flex items-center gap-2 px-1">
            <TrendingUp className="w-4 h-4 text-indigo-600" /> Subject Performance Analytics
          </h2>
          <div className="bg-white border border-slate-200/85 rounded-3xl shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex flex-col overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:brightness-105 min-w-0">
            <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Average score & exam attendances per subject</span>
              
              {/* Quick stats indicators */}
              <div className="flex items-center gap-4 bg-slate-50 border border-slate-100 px-4 py-2 rounded-2xl self-start sm:self-auto">
                <div className="flex flex-col">
                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Overall Avg</span>
                  <span className="text-xs font-black text-slate-800 mt-0.5">{overallAvg}%</span>
                </div>
                <div className="w-[1px] h-6 bg-slate-200"></div>
                <div className="flex flex-col">
                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Total Attempts</span>
                  <span className="text-xs font-black text-slate-800 mt-0.5">{totalAttempts}</span>
                </div>
              </div>
            </div>
            
            <div className="p-5 w-full" style={{ height: 340 }}>
              {stats?.chartsData && stats.chartsData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={stats.chartsData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorAvgScore" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%"  stopColor="#5B8CF5" stopOpacity={0.95}/>
                        <stop offset="100%" stopColor="#312e81" stopOpacity={0.15}/>
                      </linearGradient>
                      <linearGradient id="colorAttempts" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%"  stopColor="#818cf8" stopOpacity={0.95}/>
                        <stop offset="100%" stopColor="#c7d2fe" stopOpacity={0.15}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f8fafc" vertical={false} />
                    <XAxis dataKey="subject" stroke="#94a3b8" fontSize={10} fontWeight="700" tickLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={10} fontWeight="700" tickLine={false} />
                    <Tooltip 
                      content={<CustomTooltip />}
                      cursor={{ fill: 'rgba(99, 102, 241, 0.02)', radius: 8 }}
                      isAnimationActive={false}
                      transitionDuration={0}
                    />
                    <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '9px', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em' }} />
                    <Bar name="Avg Percentage"  dataKey="avgScore"  fill="url(#colorAvgScore)"  radius={[6,6,0,0]} barSize={22} />
                    <Bar name="Attempts Count"  dataKey="attempts"  fill="url(#colorAttempts)"  radius={[6,6,0,0]} barSize={22} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 text-sm gap-2">
                  <TrendingUp className="w-8 h-8 text-slate-300" />
                  <span className="font-bold text-slate-400 text-xs uppercase tracking-wider">No Subject Data Available</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Top Performer Rankings Column */}
        <div className="lg:col-span-1 flex flex-col gap-3">
          <h2 className="text-xs font-black text-slate-500 uppercase tracking-wider flex items-center gap-2 px-1">
            <Award className="w-4 h-4 text-amber-500" /> Leaderboard Rankings
          </h2>
          <div className="bg-white border border-slate-200/85 rounded-3xl shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex flex-col overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:brightness-105">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Top-performing candidates</span>
              <span className="text-[9px] bg-amber-50 border border-amber-100 text-amber-700 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                Top {stats?.rankings?.length || 0}
              </span>
            </div>

            <div className="p-5 overflow-y-auto max-h-[420px] scrollbar-thin">
              {stats?.rankings && stats.rankings.length > 0 ? (
                <div className="flex flex-col gap-3">
                  {stats.rankings.map((student, index) => {
                    const avatarColor = getAvatarColor(student.name, 'student');
                    return (
                      <div key={student.studentId} className="group flex flex-col p-3 bg-slate-50/40 hover:bg-slate-50/90 border border-slate-100 hover:border-slate-200/80 rounded-2xl transition-all duration-200">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className={`w-6 h-6 rounded-full flex items-center justify-center font-black text-[10px] text-white shadow-sm transition-transform group-hover:scale-110 duration-200 ${
                              index === 0 ? 'bg-gradient-to-br from-yellow-400 to-amber-500 ring-2 ring-yellow-100'
                              : index === 1 ? 'bg-gradient-to-br from-slate-300 to-slate-400 ring-2 ring-slate-100'
                              : index === 2 ? 'bg-gradient-to-br from-orange-400 to-amber-700 ring-2 ring-orange-100'
                              : 'bg-slate-200 text-slate-500'
                            }`}>
                              {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : index + 1}
                            </span>
                            
                            <div className={`w-8 h-8 rounded-full ${avatarColor} flex items-center justify-center font-extrabold text-[10px] shadow-sm`}>
                              {student.name ? student.name.charAt(0).toUpperCase() : 'S'}
                            </div>

                            <div className="flex flex-col text-left">
                              <span className="text-xs font-black text-slate-800 group-hover:text-indigo-600 transition-colors">{student.name}</span>
                              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">{student.batch}</span>
                            </div>
                          </div>

                          <div className="flex flex-col text-right">
                            <span className="text-xs font-black text-slate-900">{student.avgPercent}%</span>
                            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">{student.examCount} tests</span>
                          </div>
                        </div>

                        <div className="w-full bg-slate-100 rounded-full h-1 mt-2.5 overflow-hidden">
                          <div 
                            className={`h-full rounded-full bg-gradient-to-r transition-all duration-500 ${
                              index === 0 ? 'from-yellow-400 to-amber-500'
                              : index === 1 ? 'from-slate-400 to-slate-500'
                              : index === 2 ? 'from-orange-400 to-amber-600'
                              : 'from-indigo-500 to-indigo-600'
                            }`}
                            style={{ width: `${student.avgPercent}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 text-sm gap-2 text-center p-4">
                  <Award className="w-8 h-8 text-slate-300" />
                  <span className="font-bold text-slate-400 text-xs uppercase tracking-wider">No Rankings Available</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
