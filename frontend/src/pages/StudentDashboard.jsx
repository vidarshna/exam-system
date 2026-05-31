import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  GraduationCap, Calendar, BarChart3, Award, Clock, ArrowRight, 
  CheckCircle, AlertTriangle, Loader2, Sparkles, Search, User, Copy, Check, Bookmark, X,
  BookOpen, Trophy, Star, Lock, Shield, Mail, Globe, ExternalLink
} from 'lucide-react';
import StudentLayout from './StudentLayout';

export default function StudentDashboard() {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const currentTab = searchParams.get('tab') || 'overview';

  const [exams, setExams] = useState([]);
  const [history, setHistory] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Custom Toast State
  const [toast, setToast] = useState(null); // { message: string, type: 'success' | 'error' | 'info' }

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
  };

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Search/Filters states
  const [examSearch, setExamSearch] = useState('');
  const [logFilter, setLogFilter] = useState('all');
  const [copied, setCopied] = useState(false);

  // Profile edit states
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editGitHub, setEditGitHub] = useState('');
  const [editLinkedIn, setEditLinkedIn] = useState('');
  const [editAvatar, setEditAvatar] = useState('');
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    if (user) {
      setEditName(user.name || '');
      setEditBio(user.bio || '');
      setEditGitHub(user.gitHubUrl || '');
      setEditLinkedIn(user.linkedInUrl || '');
      setEditAvatar(user.avatar || '');
    }
  }, [user]);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoading(true);
        const [availableExams, attemptHistory, stats] = await Promise.all([
          api.getExams(),
          api.getStudentHistory(),
          api.getAnalyticsDashboard()
        ]);
        
        setExams(availableExams);
        setHistory(attemptHistory.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
        setAnalytics(stats);
      } catch (err) {
        console.error('Error loading student dashboard:', err);
        setError('Failed to sync dashboard data with server.');
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  const handleStartExam = (exam) => {
    const attemptCount = history.filter(h => h.examId === exam._id && !h.reset).length;
    if (attemptCount >= 2) {
      showToast('You have reached the maximum limit of 2 attempts for this exam.', 'error');
      return;
    }
    navigate(`/exam/${exam._id}`);
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!editName.trim()) {
      setSaveError('Name cannot be empty.');
      return;
    }

    try {
      setSaveLoading(true);
      setSaveError('');
      const updated = await api.updateProfile({
        name: editName,
        bio: editBio,
        gitHubUrl: editGitHub,
        linkedInUrl: editLinkedIn,
        avatar: editAvatar
      });
      updateUser(updated);
      setIsEditing(false);
    } catch (err) {
      console.error('Error saving profile:', err);
      setSaveError(err.message || 'Failed to save profile changes.');
    } finally {
      setSaveLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
        <p className="text-slate-500 text-sm font-semibold">Synchronizing your dashboard data...</p>
      </div>
    );
  }

  // Calculate completion progress
  const attemptedIds = new Set(history.filter(h => !h.reset).map(h => h.examId));
  const attemptedCount = attemptedIds.size;
  const allUniqueAssignedExamIds = new Set([
    ...exams.map(e => e._id),
    ...history.filter(h => !h.reset).map(h => h.examId)
  ]);
  const totalExamsCount = allUniqueAssignedExamIds.size;
  const progressPercent = totalExamsCount > 0 ? Math.round((attemptedCount / totalExamsCount) * 100) : 0;

  // Filter certificates
  const passedAttempts = history.filter(attempt => attempt.passed && !attempt.reset);
  const passedExamIds = new Set(passedAttempts.map(h => h.examId));
  const pendingExams = exams.filter(exam => {
    const isPassed = passedExamIds.has(exam._id);
    const attemptCount = history.filter(h => h.examId === exam._id && !h.reset).length;
    return !isPassed && attemptCount < 2;
  });

  const badgesList = [
    {
      id: 'first_step',
      title: 'First Step',
      desc: 'Completed your first assessment successfully.',
      emoji: '🎯',
      earned: history.length >= 1,
      requirement: 'Complete at least 1 assessment'
    },
    {
      id: 'perfect_score',
      title: 'Perfect Score',
      desc: 'Achieved a perfect 100% score in an assessment.',
      emoji: '💯',
      earned: history.some(h => h.percentage === 100),
      requirement: 'Get a perfect 100% score'
    },
    {
      id: 'speed_runner',
      title: 'Speed Runner',
      desc: 'Finished an assessment in under 3 minutes.',
      emoji: '⏱️',
      earned: history.some(h => h.timeSpent > 0 && h.timeSpent < 180),
      requirement: 'Complete an exam in under 3m'
    },
    {
      id: 'honors_scholar',
      title: 'Honors Scholar',
      desc: 'Maintained an average mark of 85% or above.',
      emoji: '🎓',
      earned: analytics?.avgPercentage >= 85,
      requirement: 'Average score of 85% or above'
    },
    {
      id: 'subject_wizard',
      title: 'Subject Wizard',
      desc: 'Passed 3 or more assessments successfully.',
      emoji: '🧙‍♂️',
      earned: passedAttempts.length >= 3,
      requirement: 'Pass 3 or more assessments'
    },
    {
      id: 'integrity_champion',
      title: 'Integrity Champion',
      desc: 'Completed an assessment with zero security flags.',
      emoji: '🛡️',
      earned: history.length > 0 && history.some(h => h.cheatingFlags === 0),
      requirement: 'Complete an exam with 0 security flags'
    }
  ];

  // Dynamic Time-of-day greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return { text: "Good Morning", icon: "☀️" };
    if (hour < 17) return { text: "Good Afternoon", icon: "🌤️" };
    return { text: "Good Evening", icon: "🌙" };
  };
  const greeting = getGreeting();



  // Filter exam results by search query
  const filteredExams = exams.filter(exam =>
    exam.title.toLowerCase().includes(examSearch.toLowerCase()) ||
    exam.category.toLowerCase().includes(examSearch.toLowerCase())
  );

  // Filter attempt logs
  const filteredHistory = history.filter(attempt => {
    if (logFilter === 'passed') return attempt.passed;
    if (logFilter === 'failed') return !attempt.passed;
    return true;
  });

  // LinkedIn certification url generator
  const getLinkedInLink = (attempt) => {
    const title = encodeURIComponent(attempt.examTitle);
    const org = encodeURIComponent("GenZ Learners Academy");
    const certId = encodeURIComponent(attempt.certificateHash);
    const date = new Date(attempt.createdAt);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    return `https://www.linkedin.com/profile/add?startTask=CERTIFICATION_NAME&name=${title}&organizationName=${org}&issueYear=${year}&issueMonth=${month}&certId=${certId}`;
  };

  // Helper to map category dynamic color schemes and icons for cards
  const getCardTheme = (category) => {
    const cat = category.toLowerCase();
    if (cat.includes('react')) return { accent: 'border-l-cyan-500', icon: '⚛️', color: 'text-cyan-600 bg-cyan-50 border-cyan-100' };
    if (cat.includes('html')) return { accent: 'border-l-orange-500', icon: '🌐', color: 'text-orange-600 bg-orange-50 border-orange-100' };
    if (cat.includes('css')) return { accent: 'border-l-blue-500', icon: '🎨', color: 'text-blue-600 bg-blue-50 border-blue-100' };
    if (cat.includes('javascript') || cat.includes('js')) return { accent: 'border-l-yellow-500', icon: '⚡', color: 'text-yellow-600 bg-yellow-50 border-yellow-100' };
    if (cat.includes('node')) return { accent: 'border-l-green-500', icon: '🟢', color: 'text-green-600 bg-green-50 border-green-100' };
    return { accent: 'border-l-indigo-500', icon: '📝', color: 'text-indigo-600 bg-indigo-50 border-indigo-100' };
  };

  const getBadgeStyles = (id, earned) => {
    if (!earned) {
      return {
        cardClass: 'bg-slate-50/20 border-slate-100 opacity-60 grayscale',
        iconContainerClass: 'bg-slate-100 text-slate-400 border border-slate-200',
        glowClass: ''
      };
    }
    
    switch(id) {
      case 'first_step':
        return {
          cardClass: 'bg-gradient-to-br from-cyan-50/80 to-white border-cyan-200 hover:border-cyan-400 hover:shadow-lg hover:shadow-cyan-500/10 group hover:scale-102',
          iconContainerClass: 'bg-gradient-to-tr from-cyan-500 to-cyan-600 text-white shadow-md shadow-cyan-500/20',
          glowClass: 'bg-cyan-500/10'
        };
      case 'perfect_score':
        return {
          cardClass: 'bg-gradient-to-br from-amber-50/80 to-white border-amber-200 hover:border-amber-400 hover:shadow-lg hover:shadow-amber-500/10 group hover:scale-102',
          iconContainerClass: 'bg-gradient-to-tr from-amber-500 to-amber-600 text-white shadow-md shadow-amber-500/20',
          glowClass: 'bg-amber-500/10'
        };
      case 'speed_runner':
        return {
          cardClass: 'bg-gradient-to-br from-rose-50/80 to-white border-rose-200 hover:border-rose-400 hover:shadow-lg hover:shadow-rose-500/10 group hover:scale-102',
          iconContainerClass: 'bg-gradient-to-tr from-rose-500 to-rose-600 text-white shadow-md shadow-rose-500/20',
          glowClass: 'bg-rose-500/10'
        };
      case 'honors_scholar':
        return {
          cardClass: 'bg-gradient-to-br from-indigo-50/80 to-white border-indigo-200 hover:border-indigo-400 hover:shadow-lg hover:shadow-indigo-500/10 group hover:scale-102',
          iconContainerClass: 'bg-gradient-to-tr from-indigo-500 to-indigo-600 text-white shadow-md shadow-indigo-500/20',
          glowClass: 'bg-indigo-500/10'
        };
      case 'subject_wizard':
        return {
          cardClass: 'bg-gradient-to-br from-sky-50/80 to-white border-sky-200 hover:border-sky-400 hover:shadow-lg hover:shadow-sky-500/10 group hover:scale-102',
          iconContainerClass: 'bg-gradient-to-tr from-sky-500 to-sky-600 text-white shadow-md shadow-sky-500/20',
          glowClass: 'bg-sky-500/10'
        };
      case 'integrity_champion':
        return {
          cardClass: 'bg-gradient-to-br from-emerald-50/80 to-white border-emerald-200 hover:border-emerald-400 hover:shadow-lg hover:shadow-emerald-500/10 group hover:scale-102',
          iconContainerClass: 'bg-gradient-to-tr from-emerald-500 to-emerald-600 text-white shadow-md shadow-emerald-500/20',
          glowClass: 'bg-emerald-500/10'
        };
      default:
        return {
          cardClass: 'bg-gradient-to-br from-slate-50 to-white border-slate-200 hover:border-slate-400 hover:shadow-md group hover:scale-102',
          iconContainerClass: 'bg-gradient-to-tr from-slate-500 to-slate-600 text-white',
          glowClass: 'bg-slate-500/10'
        };
    }
  };

  // Setup tab styling mapping
  let activePage = "Dashboard";
  let headerTitle = "OVERVIEW";
  if (currentTab === 'exams') {
    activePage = "Available Exams";
    headerTitle = "AVAILABLE EXAMS";
  } else if (currentTab === 'certificates') {
    activePage = "Certificates";
    headerTitle = "MY CERTIFICATES";
  } else if (currentTab === 'log') {
    activePage = "Exam Log";
    headerTitle = "EXAM ATTEMPT LOG";
  } else if (currentTab === 'profile') {
    activePage = "My Profile";
    headerTitle = "MY PROFILE";
  }

  return (
    <StudentLayout activePage={activePage} headerTitle={headerTitle}>
      <div className="flex flex-col gap-8">
        
        {/* Error Notification */}
        {error && (
          <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold shadow-sm">
            {error}
          </div>
        )}

        {/* ── VIEW: OVERVIEW (GAMIFIED CONCEPT) ────────────────────── */}
        {currentTab === 'overview' && (
          <>
            {/* Welcome Banner - Premium Mesh Hero */}
            <div className="relative overflow-hidden p-8 rounded-[2rem] bg-gradient-to-br from-[#1e1b4b] via-[#312e81] to-[#1e1b5e] border border-white/10 text-white shadow-xl shadow-indigo-950/20 animate-fade-in flex flex-col md:flex-row justify-between items-start md:items-center gap-6 group">
              {/* Animated Glowing Blobs */}
              <div className="absolute -top-24 -left-24 w-72 h-72 rounded-full bg-indigo-500/20 blur-[60px] animate-pulse pointer-events-none" />
              <div className="absolute -bottom-24 -right-24 w-72 h-72 rounded-full bg-purple-500/20 blur-[60px] animate-pulse pointer-events-none" />
              
              <div className="relative z-10">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black tracking-widest uppercase px-2.5 py-0.5 rounded-md bg-white/10 border border-white/10 backdrop-blur-sm text-indigo-200">
                    Student Portal Overview
                  </span>
                </div>
                <h1 className="text-3xl sm:text-4xl font-black mt-3 tracking-tight flex items-center gap-3">
                  {greeting.text}, {user?.name ? user.name.split(' ')[0] : 'Student'}! 
                  <span className="inline-block animate-bounce origin-bottom duration-1000 text-3xl sm:text-4xl">{greeting.icon}</span>
                </h1>
                <p className="text-indigo-200/80 text-xs sm:text-sm mt-2 max-w-xl font-medium leading-relaxed">
                  {pendingExams.length > 0 
                    ? `You have ${pendingExams.length} pending assessment${pendingExams.length > 1 ? 's' : ''} to complete. Ready to level up your skills and earn verified certificates?` 
                    : "Excellent work! All assigned curriculum models are fully completed. You're completely up to date."}
                </p>
              </div>

              {/* Glass Calendar Pill */}
              <div className="relative z-10 bg-white/10 border border-white/20 px-5 py-3 rounded-2xl text-xs text-white/90 flex items-center gap-2.5 shadow-lg backdrop-blur-md font-bold hover:bg-white/15 transition-all self-stretch md:self-auto justify-center md:justify-start">
                <div className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center text-indigo-300">
                  <Calendar className="w-4.5 h-4.5" />
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-[9px] uppercase tracking-wider text-indigo-200">Current Date</span>
                  <span className="text-xs font-black">{new Date().toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</span>
                </div>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 animate-slide-up">
              {/* Card 1: Exams Attended */}
              <div 
                onClick={() => navigate('/?tab=log')}
                className="relative overflow-hidden p-6 rounded-3xl bg-white border border-slate-200/80 text-slate-800 shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl hover:shadow-indigo-500/5 hover:border-indigo-300/60 group select-none cursor-pointer flex flex-col justify-between"
              >
                <div className="absolute -right-4 -bottom-4 w-24 h-24 rounded-full bg-indigo-500/[0.02] group-hover:scale-120 group-hover:bg-indigo-500/[0.04] transition-all duration-500" />
                <div className="flex items-start justify-between">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black tracking-wider uppercase text-slate-400">Exams Attended</span>
                    <span className="text-3xl font-black mt-2 tracking-tight text-slate-800 bg-gradient-to-r from-slate-800 to-slate-950 bg-clip-text text-transparent">{analytics?.examCount || 0}</span>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 transition-all duration-300 group-hover:bg-indigo-600 group-hover:text-white group-hover:shadow-lg group-hover:shadow-indigo-500/20">
                    <CheckCircle className="w-5 h-5" />
                  </div>
                </div>
                <span className="text-[9px] text-slate-400 font-semibold mt-4 block">Total curriculum attempts</span>
              </div>

              {/* Card 2: Passed Tests */}
              <div 
                onClick={() => navigate('/?tab=log')}
                className="relative overflow-hidden p-6 rounded-3xl bg-white border border-slate-200/80 text-slate-800 shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl hover:shadow-emerald-500/5 hover:border-emerald-300/60 group select-none cursor-pointer flex flex-col justify-between"
              >
                <div className="absolute -right-4 -bottom-4 w-24 h-24 rounded-full bg-emerald-500/[0.02] group-hover:scale-120 group-hover:bg-emerald-500/[0.04] transition-all duration-500" />
                <div className="flex items-start justify-between">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black tracking-wider uppercase text-slate-400">Passed Tests</span>
                    <span className="text-3xl font-black mt-2 tracking-tight text-slate-800 bg-gradient-to-r from-slate-800 to-slate-950 bg-clip-text text-transparent">{analytics?.passedCount || 0}</span>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 transition-all duration-300 group-hover:bg-emerald-600 group-hover:text-white group-hover:shadow-lg group-hover:shadow-emerald-500/20">
                    <Award className="w-5 h-5" />
                  </div>
                </div>
                <span className="text-[9px] text-slate-400 font-semibold mt-4 block">Evaluations passed successfully</span>
              </div>

              {/* Card 3: Average Mark */}
              <div 
                onClick={() => navigate('/?tab=log')}
                className="relative overflow-hidden p-6 rounded-3xl bg-white border border-slate-200/80 text-slate-800 shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl hover:shadow-purple-500/5 hover:border-purple-300/60 group select-none cursor-pointer flex flex-col justify-between"
              >
                <div className="absolute -right-4 -bottom-4 w-24 h-24 rounded-full bg-purple-500/[0.02] group-hover:scale-120 group-hover:bg-purple-500/[0.04] transition-all duration-500" />
                <div className="flex items-start justify-between">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black tracking-wider uppercase text-slate-400">Average Mark</span>
                    <span className="text-3xl font-black mt-2 tracking-tight text-slate-800 bg-gradient-to-r from-slate-800 to-slate-950 bg-clip-text text-transparent">{analytics?.avgPercentage || 0}%</span>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600 transition-all duration-300 group-hover:bg-purple-600 group-hover:text-white group-hover:shadow-lg group-hover:shadow-purple-500/20">
                    <BarChart3 className="w-5 h-5" />
                  </div>
                </div>
                <span className="text-[9px] text-slate-400 font-semibold mt-4 block">Cumulative accuracy average</span>
              </div>

              {/* Card 4: Certificates Earned */}
              <div 
                onClick={() => navigate('/?tab=certificates')}
                className="relative overflow-hidden p-6 rounded-3xl bg-white border border-slate-200/80 text-slate-800 shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl hover:shadow-amber-500/5 hover:border-amber-300/60 group select-none cursor-pointer flex flex-col justify-between"
              >
                <div className="absolute -right-4 -bottom-4 w-24 h-24 rounded-full bg-amber-500/[0.02] group-hover:scale-120 group-hover:bg-amber-500/[0.04] transition-all duration-500" />
                <div className="flex items-start justify-between">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black tracking-wider uppercase text-slate-400">Certificates</span>
                    <span className="text-3xl font-black mt-2 tracking-tight text-slate-800 bg-gradient-to-r from-slate-800 to-slate-950 bg-clip-text text-transparent">{passedAttempts.length}</span>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-500 transition-all duration-300 group-hover:bg-amber-500 group-hover:text-white group-hover:shadow-lg group-hover:shadow-amber-500/20">
                    <Sparkles className="w-5 h-5" />
                  </div>
                </div>
                <span className="text-[9px] text-slate-400 font-semibold mt-4 block">Earned verified credentials</span>
              </div>
            </div>

            {/* Main Split Layout: Assessments & Certificates Overview */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start animate-slide-up">
              
              {/* Left Column: Assigned Assessments Summary */}
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between px-1">
                  <h2 className="text-xs font-black text-slate-500 uppercase tracking-wider flex items-center gap-2">
                    <GraduationCap className="w-4 h-4 text-indigo-600" /> Assigned Assessments
                  </h2>
                  <button 
                    onClick={() => navigate('/?tab=exams')}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <span>View All ({pendingExams.length})</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {pendingExams.length === 0 ? (
                  <div className="bg-white border border-slate-200/80 rounded-3xl p-10 text-center flex flex-col items-center justify-center gap-3.5 shadow-sm animate-fade-in">
                    <CheckCircle className="w-8 h-8 text-emerald-500 animate-bounce" />
                    <p className="text-slate-500 text-xs font-bold">No assessments are currently assigned to you.</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-4">
                    {pendingExams.slice(0, 3).map(exam => {
                      const hasAnyHistory = history.some(h => h.examId === exam._id);
                      const hasFailedAttempt = history.some(h => h.examId === exam._id && !h.passed && !h.reset);
                      return (
                        <div 
                          key={exam._id} 
                          onClick={() => handleStartExam(exam)}
                          className={`bg-white border border-slate-200 border-l-4 ${
                            exam.category.toLowerCase().includes('react') ? 'border-l-cyan-500' :
                            exam.category.toLowerCase().includes('html') ? 'border-l-orange-500' :
                            exam.category.toLowerCase().includes('css') ? 'border-l-blue-500' :
                            exam.category.toLowerCase().includes('javascript') || exam.category.toLowerCase().includes('js') ? 'border-l-yellow-500' :
                            'border-l-indigo-500'
                          } rounded-3xl p-5 flex items-center justify-between gap-4 transition-all duration-300 hover:border-indigo-300/80 hover:-translate-y-1 hover:shadow-lg hover:shadow-indigo-500/[0.02] cursor-pointer group`}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`text-[9px] font-extrabold px-2.5 py-0.5 rounded-full border ${
                                exam.category.toLowerCase().includes('react') ? 'text-cyan-600 bg-cyan-50 border-cyan-100' :
                                exam.category.toLowerCase().includes('html') ? 'text-orange-600 bg-orange-50 border-orange-100' :
                                exam.category.toLowerCase().includes('css') ? 'text-blue-600 bg-blue-50 border-blue-100' :
                                exam.category.toLowerCase().includes('javascript') || exam.category.toLowerCase().includes('js') ? 'text-yellow-600 bg-yellow-50 border-yellow-100' :
                                'text-indigo-600 bg-indigo-50 border-indigo-100'
                              }`}>
                                {exam.category}
                              </span>
                              {hasFailedAttempt && (
                                <span className="text-[9.5px] font-black px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-600 border border-amber-200/80 animate-pulse">
                                  Retake Available
                                </span>
                              )}
                              <span className="text-[10px] text-slate-400 font-bold flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5" /> {exam.duration}m
                              </span>
                            </div>
                            <h3 className="font-extrabold text-slate-800 mt-2.5 text-sm group-hover:text-indigo-600 transition-colors truncate">
                              {exam.title}
                            </h3>
                            <p className="text-[10px] text-slate-400 mt-0.5 font-bold">
                              Total questions: {exam.totalQuestions}
                            </p>
                          </div>
                          <button
                            className="w-9.5 h-9.5 rounded-2xl bg-slate-50 border border-slate-200 text-slate-400 group-hover:bg-indigo-600 group-hover:border-indigo-600 group-hover:text-white flex items-center justify-center transition-all duration-300 group-hover:scale-105 group-hover:shadow-md group-hover:shadow-indigo-500/25 flex-shrink-0"
                            title={hasFailedAttempt || hasAnyHistory ? "Retake" : "Start Assessment"}
                          >
                            <ArrowRight className="w-4.5 h-4.5 transition-transform duration-300 group-hover:translate-x-0.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Right Column: Earned Certificates Summary */}
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between px-1">
                  <h2 className="text-xs font-black text-slate-500 uppercase tracking-wider flex items-center gap-2">
                    <Award className="w-4 h-4 text-indigo-600" /> Earned Certificates
                  </h2>
                  <button 
                    onClick={() => navigate('/?tab=certificates')}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <span>View All ({passedAttempts.length})</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {passedAttempts.length === 0 ? (
                  <div className="bg-white border border-slate-200/80 rounded-3xl p-10 text-center flex flex-col items-center justify-center gap-3.5 shadow-sm">
                    <Award className="w-8 h-8 text-slate-300" />
                    <p className="text-slate-400 text-xs font-bold">No certificates earned yet.</p>
                    <p className="text-slate-400 text-[10px] font-semibold leading-relaxed">
                      Pass an assessment with a score above threshold to earn your certificate!
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-4">
                    {passedAttempts.slice(0, 3).map(attempt => (
                      <div 
                        key={attempt._id}
                        className="bg-white border border-slate-200 rounded-3xl p-5 flex items-center justify-between gap-4 transition-all duration-300 hover:border-indigo-300/80 hover:-translate-y-1 hover:shadow-lg hover:shadow-indigo-500/[0.02] group"
                      >
                        {/* Make details area clickable to view scorecard */}
                        <div 
                          onClick={() => navigate(`/result/${attempt._id}`)}
                          className="min-w-0 flex-1 cursor-pointer"
                        >
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <span className="text-[9.5px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center gap-1">
                              🏆 {attempt.examCategory}
                            </span>
                            <span className="text-[10px] text-slate-400 font-bold">
                              {new Date(attempt.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          <h3 className="font-extrabold text-slate-800 mt-2.5 text-sm group-hover:text-indigo-600 transition-colors truncate">
                            {attempt.examTitle}
                          </h3>
                          <div className="flex items-center gap-3 text-[10px] text-slate-400 font-bold mt-1.5 flex-wrap">
                            <span className="bg-slate-50 border border-slate-100 rounded-lg px-2 py-0.5">
                              Score: <strong className="text-slate-800 font-black">{attempt.percentage}%</strong>
                            </span>
                            
                            {/* Copyable Hash Capsule */}
                            <span 
                              onClick={(e) => {
                                e.stopPropagation();
                                navigator.clipboard.writeText(attempt.certificateHash);
                                // Display temporary copied state
                                const target = e.currentTarget;
                                const originalText = target.innerText;
                                target.innerText = "Copied!";
                                target.style.color = "#10b981";
                                setTimeout(() => {
                                  target.innerText = originalText;
                                  target.style.color = "";
                                }, 1500);
                              }}
                              className="font-mono text-[9px] text-indigo-500 hover:text-indigo-700 bg-indigo-50/50 hover:bg-indigo-50 border border-indigo-100/50 hover:border-indigo-200 px-2 py-0.5 rounded-lg flex items-center gap-1 transition-all select-none"
                              title="Click to copy Verification Code"
                            >
                              Code: {attempt.certificateHash.substring(0, 8)}...
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={() => navigate(`/result/${attempt._id}`)}
                          className="w-9.5 h-9.5 rounded-2xl bg-slate-50 border border-slate-200 text-slate-400 hover:bg-indigo-600 hover:border-indigo-600 hover:text-white flex items-center justify-center transition-all duration-300 hover:scale-105 hover:shadow-md hover:shadow-indigo-500/25 flex-shrink-0 cursor-pointer"
                          title="View Scorecard"
                        >
                          <ArrowRight className="w-4.5 h-4.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          </>
        )}

        {/* ── VIEW: AVAILABLE EXAMS ─────────────────────────────────── */}
        {currentTab === 'exams' && (
          <div className="flex flex-col gap-5 animate-fade-in">
            {/* Search Console */}
            <div className="relative max-w-md select-none">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search exams by title or category..."
                value={examSearch}
                onChange={(e) => setExamSearch(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-10 py-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 transition-all shadow-sm font-semibold"
              />
              {examSearch && (
                <button 
                  onClick={() => setExamSearch('')}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 font-bold text-xs cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>

            {filteredExams.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center flex flex-col items-center justify-center gap-3 shadow-sm max-w-lg mx-auto">
                <AlertTriangle className="w-10 h-10 text-slate-300" />
                <p className="text-slate-500 text-sm font-bold">No matching assessments found.</p>
                <p className="text-slate-400 text-xs font-semibold">Try modifying your search criteria or contact your course administrator.</p>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredExams.map(exam => {
                  const theme = getCardTheme(exam.category);
                  const lastPassedAttempt = history.find(h => h.examId === exam._id && h.passed && !h.reset);
                  const isPassed = !!lastPassedAttempt;
                  const examAttempts = history.filter(h => h.examId === exam._id && !h.reset);
                  const attemptCount = examAttempts.length;
                  const hasAnyHistory = history.some(h => h.examId === exam._id);
                  const hasFailedAttempt = attemptCount > 0 && !isPassed;
                  const attemptsExhausted = !isPassed && attemptCount >= 2;

                  return (
                    <div 
                      key={exam._id} 
                      className={`bg-white border border-slate-200 border-l-4 ${isPassed ? 'border-l-emerald-500' : (attemptsExhausted ? 'border-l-rose-500' : theme.accent)} rounded-3xl p-5 flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:border-indigo-200 group`}
                    >
                      <div>
                        {/* Category, status, and duration */}
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${isPassed ? 'text-emerald-600 bg-emerald-50 border-emerald-100' : theme.color} flex items-center gap-1`}>
                              <span>{isPassed ? '🏆' : theme.icon}</span>
                              <span>{exam.category}</span>
                            </span>
                            {isPassed && (
                              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500 text-white border border-emerald-600 flex items-center gap-1">
                                Passed
                              </span>
                            )}
                            {attemptsExhausted && (
                              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-600 border border-rose-200 flex items-center gap-1">
                                Attempts Exhausted
                              </span>
                            )}
                            {!isPassed && !attemptsExhausted && hasFailedAttempt && (
                              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-600 border border-amber-200 flex items-center gap-1">
                                Retake Available
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1 text-slate-400 text-xs font-bold">
                            <Clock className="w-3.5 h-3.5" />
                            <span>{exam.duration}m</span>
                          </div>
                        </div>

                        {/* Title and details */}
                        <h3 className="font-extrabold text-slate-800 mt-3.5 text-base group-hover:text-indigo-600 transition-colors">{exam.title}</h3>
                        <p className="text-xs text-slate-500 mt-1 font-medium">Total questions: {exam.totalQuestions}</p>
                        
                        {/* Negative marking badge */}
                        <div className="mt-3">
                          {exam.negativeMarking > 0 ? (
                            <span className="inline-block text-[9px] bg-red-50 border border-red-200 text-red-600 font-bold px-2 py-0.5 rounded-lg">
                              Negative Marking: -{exam.negativeMarking}
                            </span>
                          ) : (
                            <span className="inline-block text-[9px] bg-slate-100 border border-slate-200 text-slate-500 font-bold px-2 py-0.5 rounded-lg">
                              No Negative Markings
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Start / View Scorecard Action */}
                      {isPassed ? (
                        <button
                          onClick={() => navigate(`/result/${lastPassedAttempt._id}`)}
                          className="mt-5 w-full bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm hover:scale-102"
                        >
                          <span>View Scorecard</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      ) : attemptsExhausted ? (
                        <button
                          disabled
                          className="mt-5 w-full bg-slate-100 text-slate-400 border border-slate-200 font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all cursor-not-allowed shadow-sm"
                        >
                          <span>Attempts Exhausted</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => handleStartExam(exam)}
                          className="mt-5 w-full bg-indigo-600 hover:bg-indigo-600 text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm shadow-indigo-500/5 hover:shadow-indigo-500/10 hover:scale-102"
                        >
                          <span>{hasFailedAttempt || hasAnyHistory ? 'Retake' : 'Start Assessment'}</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── VIEW: CERTIFICATES ───────────────────────────────────── */}
        {currentTab === 'certificates' && (
          <div className="animate-fade-in">
            {passedAttempts.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center flex flex-col items-center justify-center gap-4 shadow-sm max-w-lg mx-auto mt-6">
                <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center shadow-inner">
                  <Award className="w-8 h-8 text-indigo-500" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-base">No Certificates Earned Yet</h3>
                  <p className="text-slate-400 text-xs font-semibold leading-relaxed mt-2.5 max-w-sm">
                    Complete your assigned exams and score above the passing threshold to earn official verified certificates!
                  </p>
                </div>
                <button
                  onClick={() => navigate('/?tab=exams')}
                  className="mt-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-500/10 cursor-pointer"
                >
                  Browse Available Exams
                </button>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {passedAttempts.map(attempt => (
                  <div key={attempt._id} className="relative overflow-hidden bg-white border border-slate-200 rounded-3xl p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:border-indigo-200/80 flex flex-col justify-between group">
                    <div className="absolute -right-6 -top-6 w-20 h-20 rounded-full bg-indigo-500/[0.03] group-hover:scale-110 transition-transform duration-500" />
                    <div className="absolute right-4 -top-10 w-20 h-20 rounded-full bg-indigo-500/[0.04]" />
                    
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100">
                          {attempt.examCategory}
                        </span>
                        <Award className="w-5 h-5 text-amber-500" />
                      </div>
                      
                      <h3 className="font-extrabold text-slate-800 mt-4 text-base group-hover:text-indigo-600 transition-colors leading-tight">
                        {attempt.examTitle}
                      </h3>
                      
                      <div className="mt-4 pt-4 border-t border-slate-100 space-y-2 text-xs text-slate-500 font-medium">
                        <div className="flex justify-between">
                          <span>Grade Score:</span>
                          <strong className="text-slate-800">{attempt.score} / {attempt.totalQuestions} ({attempt.percentage}%)</strong>
                        </div>
                        <div className="flex justify-between">
                          <span>Date Certified:</span>
                          <strong className="text-slate-700">{new Date(attempt.createdAt).toLocaleDateString()}</strong>
                        </div>
                        <div className="flex justify-between items-center">
                          <span>Verify Hash:</span>
                          <span className="text-indigo-600 font-mono text-[9px] truncate max-w-[120px] bg-slate-50 border border-slate-100 px-1.5 py-0.5 rounded" title={attempt.certificateHash}>
                            {attempt.certificateHash}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2.5 mt-5">
                      <button
                        onClick={() => navigate(`/result/${attempt._id}`)}
                        className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-600 text-white font-bold rounded-xl text-[11px] flex items-center justify-center gap-1.5 transition-all shadow-md shadow-indigo-500/10 cursor-pointer"
                      >
                        <span>Scorecard</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                      <a
                        href={getLinkedInLink(attempt)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="py-2.5 px-3 bg-[#0a66c2] hover:bg-[#004182] text-white font-bold rounded-xl text-[11px] flex items-center justify-center gap-1 transition-all shadow-md shadow-blue-500/10 cursor-pointer"
                        title="Add to LinkedIn Profile"
                      >
                        <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                          <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.779-1.75-1.75s.784-1.75 1.75-1.75 1.75.779 1.75 1.75-.784 1.75-1.75 1.75zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
                        </svg>
                        <span>Add to profile</span>
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── VIEW: EXAM LOG ───────────────────────────────────────── */}
        {currentTab === 'log' && (
          <div className="flex flex-col gap-4 animate-fade-in">
            {/* Filter Log Bar */}
            <div className="flex justify-between items-center bg-slate-50 border border-slate-200 p-3 rounded-2xl">
              <span className="text-xs text-slate-500 font-semibold px-2">
                Showing {filteredHistory.length} total attempt logs
              </span>
              <select
                value={logFilter}
                onChange={(e) => setLogFilter(e.target.value)}
                className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-700 font-bold focus:outline-none focus:border-indigo-500 shadow-sm cursor-pointer"
              >
                <option value="all">All Evaluated Logs</option>
                <option value="passed">Passed Attempts</option>
                <option value="failed">Failed Attempts</option>
              </select>
            </div>

            {filteredHistory.length === 0 ? (
              <div className="bg-white border border-slate-200/85 rounded-3xl p-12 text-center flex flex-col items-center justify-center gap-2 shadow-sm max-w-lg mx-auto mt-4">
                <Calendar className="w-8 h-8 text-slate-300" />
                <p className="text-slate-500 text-sm font-bold">No exam logs matched the selected filter.</p>
              </div>
            ) : (
              <div className="bg-white border border-slate-200/85 rounded-3xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 tracking-wider">
                        <th className="py-4 px-6">EXAM TITLE</th>
                        <th className="py-4 px-6">SUBJECT</th>
                        <th className="py-4 px-6">DATE SUBMITTED</th>
                        <th className="py-4 px-6">SCORE</th>
                        <th className="py-4 px-6">PERCENTAGE</th>
                        <th className="py-4 px-6">STATUS</th>
                        <th className="py-4 px-6 text-right">ACTION</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                      {filteredHistory.map((attempt) => (
                        <tr key={attempt._id} className="hover:bg-slate-50/50 transition-all">
                          <td className="py-4 px-6 font-bold text-slate-800">{attempt.examTitle}</td>
                          <td className="py-4 px-6 text-slate-500">
                            <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-xs border border-slate-200/65 font-bold">
                              {attempt.examCategory}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-slate-500 font-medium">
                            {new Date(attempt.createdAt).toLocaleDateString()}
                          </td>
                          <td className="py-4 px-6 font-bold text-slate-800">{attempt.score} / {attempt.totalQuestions}</td>
                          <td className="py-4 px-6 font-bold text-slate-800">{attempt.percentage}%</td>
                          <td className="py-4 px-6">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                              attempt.passed 
                                ? 'bg-emerald-50 border border-emerald-200 text-emerald-600' 
                                : 'bg-red-50 border border-red-200 text-red-600'
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${attempt.passed ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                              {attempt.passed ? 'PASSED' : 'FAILED'}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-right">
                            <button
                              onClick={() => navigate(`/result/${attempt._id}`)}
                              className="bg-indigo-50 hover:bg-indigo-600 text-indigo-600 hover:text-white border border-indigo-100 hover:border-indigo-500/25 px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-sm"
                            >
                              Scorecard
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── VIEW: MY PROFILE ─────────────────────────────────────── */}
        {currentTab === 'profile' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 animate-fade-in items-stretch">
            {/* Left Side: Avatar & Core Card */}
            <div className="md:col-span-1 bg-white border border-slate-200 rounded-3xl shadow-xl flex flex-col group relative overflow-hidden pb-6 h-full">
              {/* Cover Banner with Mesh Gradient */}
              <div className="h-32 w-full bg-gradient-to-tr from-indigo-600 via-purple-600 to-rose-505 relative overflow-hidden">
                {/* Dynamic decorative backdrop effects */}
                <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.4),transparent_50%)]" />
                <div className="absolute -top-12 -left-12 w-24 h-24 rounded-full bg-white/10 blur-xl" />
                <div className="absolute -bottom-8 -right-8 w-20 h-20 rounded-full bg-white/15 blur-lg" />
              </div>

              {/* Floating Avatar Container */}
              <div className="flex flex-col items-center -mt-12 relative z-10 px-6 pb-4">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-indigo-600 to-indigo-900 border-4 border-white shadow-xl flex items-center justify-center font-black text-white text-4xl select-none transform hover:scale-105 transition-transform duration-300">
                  {user?.avatar || (user?.name ? user.name.charAt(0).toUpperCase() : 'S')}
                </div>
                <div className="mt-3 text-center">
                  <h3 className="text-lg font-black text-slate-800 leading-tight tracking-tight">{user?.name || 'Student Candidate'}</h3>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 mt-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    Verified Candidate
                  </span>
                </div>
              </div>

              {/* Bio in glassmorphic capsule */}
              <div className="px-6 py-2">
                <div className="bg-slate-50/50 border border-slate-100/80 rounded-2xl p-4 text-center">
                  <p className="text-xs text-slate-500 leading-relaxed italic break-words">
                    {user?.bio ? `"${user.bio}"` : '"No profile bio added yet. Click Edit Profile on the right to personalize your candidate details!"'}
                  </p>
                </div>
              </div>

              {/* Social profile links as high-fidelity interactive buttons with glows */}
              <div className="flex items-center justify-center gap-3.5 mt-4 px-6">
                <a 
                  href={user?.gitHubUrl ? (user.gitHubUrl.startsWith('http') ? user.gitHubUrl : `https://${user.gitHubUrl}`) : '#'}
                  target={user?.gitHubUrl ? "_blank" : "_self"}
                  rel="noopener noreferrer"
                  className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 shadow-sm border ${
                    user?.gitHubUrl 
                      ? 'bg-slate-900 border-slate-900 text-white hover:bg-slate-800 hover:shadow-lg hover:shadow-slate-900/20 hover:scale-110' 
                      : 'bg-slate-50 border-slate-200 text-slate-300 cursor-not-allowed'
                  }`}
                  title={user?.gitHubUrl ? "GitHub Profile" : "No GitHub Link"}
                >
                  <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                  </svg>
                </a>
                <a 
                  href={user?.linkedInUrl ? (user.linkedInUrl.startsWith('http') ? user.linkedInUrl : `https://${user.linkedInUrl}`) : '#'}
                  target={user?.linkedInUrl ? "_blank" : "_self"}
                  rel="noopener noreferrer"
                  className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 shadow-sm border ${
                    user?.linkedInUrl 
                      ? 'bg-[#0a66c2] border-[#0a66c2] text-white hover:bg-[#004182] hover:border-[#004182] hover:shadow-lg hover:shadow-blue-500/20 hover:scale-110' 
                      : 'bg-slate-50 border-slate-200 text-slate-300 cursor-not-allowed'
                  }`}
                  title={user?.linkedInUrl ? "LinkedIn Profile" : "No LinkedIn Link"}
                >
                  <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                    <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.779-1.75-1.75s.784-1.75 1.75-1.75 1.75.779 1.75 1.75-.784 1.75-1.75 1.75zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
                  </svg>
                </a>
              </div>
            </div>

            {/* Right Side: Registry Information & Statistics */}
            <div className="md:col-span-2 flex flex-col gap-6">
              
              {isEditing ? (
                /* Edit Profile Form Container */
                <form 
                  onSubmit={handleSaveProfile}
                  className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xl flex flex-col gap-5 transition-all duration-300 animate-scale-in"
                >
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
                      <User className="w-4 h-4 text-indigo-600" />
                      <span>Edit Candidate Profile</span>
                    </h3>
                    {saveError && (
                      <span className="text-red-500 text-[10px] font-bold">{saveError}</span>
                    )}
                  </div>

                  {/* Avatar Picker */}
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-black text-slate-400 tracking-wider uppercase">Select Developer Avatar Badge</label>
                    <div className="grid grid-cols-8 gap-2">
                      {['⚛️', '🎨', '🌐', '⚡', '🟢', '🚀', '🧙‍♂️', '💻'].map((emoji) => (
                        <button
                          type="button"
                          key={emoji}
                          onClick={() => setEditAvatar(emoji)}
                          className={`w-9.5 h-9.5 rounded-xl border flex items-center justify-center text-lg transition-all cursor-pointer ${
                            editAvatar === emoji
                              ? 'bg-indigo-50 border-indigo-500 scale-110 shadow-sm font-bold'
                              : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Name field */}
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-black text-slate-400 tracking-wider uppercase">Full Name</label>
                    <input 
                      type="text"
                      required
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder="Enter full name"
                      className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 font-semibold focus:outline-none focus:border-indigo-500 focus:bg-white transition-all shadow-inner"
                    />
                  </div>

                  {/* Bio field */}
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-black text-slate-400 tracking-wider uppercase">Short Bio / Headline</label>
                    <textarea 
                      rows="2"
                      value={editBio}
                      onChange={(e) => setEditBio(e.target.value)}
                      placeholder="Introduce yourself to course trainers and peers..."
                      className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 font-semibold focus:outline-none focus:border-indigo-500 focus:bg-white transition-all resize-none shadow-inner"
                    />
                  </div>

                  {/* Social links row */}
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-2">
                      <label className="text-[10px] font-black text-slate-400 tracking-wider uppercase">GitHub Profile Link</label>
                      <input 
                        type="text"
                        value={editGitHub}
                        onChange={(e) => setEditGitHub(e.target.value)}
                        placeholder="github.com/username"
                        className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 font-semibold focus:outline-none focus:border-indigo-500 focus:bg-white transition-all shadow-inner"
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-[10px] font-black text-slate-400 tracking-wider uppercase">LinkedIn Profile Link</label>
                      <input 
                        type="text"
                        value={editLinkedIn}
                        onChange={(e) => setEditLinkedIn(e.target.value)}
                        placeholder="linkedin.com/in/username"
                        className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 font-semibold focus:outline-none focus:border-indigo-500 focus:bg-white transition-all shadow-inner"
                      />
                    </div>
                  </div>

                  {/* Buttons */}
                  <div className="flex items-center gap-3 mt-2">
                    <button
                      type="submit"
                      disabled={saveLoading}
                      className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md hover:scale-102 disabled:opacity-50"
                    >
                      {saveLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      <span>{saveLoading ? 'Saving...' : 'Save Changes'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => { setIsEditing(false); setSaveError(''); }}
                      className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-600 font-bold rounded-xl text-xs transition-all cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                /* Standard Profile Right-Column Content (Registry Records + Academic Standing) */
                <>
                  {/* Account Registry Card - Height Upgraded */}
                  <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-xl transition-all duration-305 hover:shadow-2xl hover:border-indigo-300/80 relative group flex-1 flex flex-col justify-between min-h-[580px]">
                    <div>
                      <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
                        <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
                          <Bookmark className="w-4 h-4 text-indigo-600" />
                          <span>Student Registry Records</span>
                        </h3>
                        <button
                          onClick={() => setIsEditing(true)}
                          className="bg-indigo-50 hover:bg-indigo-600 hover:text-white border border-indigo-100 hover:border-indigo-500/20 text-indigo-600 px-3.5 py-1.5 rounded-xl text-[10px] font-black transition-all cursor-pointer shadow-sm flex items-center gap-1.5 hover:scale-105"
                        >
                          <span>✏️</span> Edit Profile
                        </button>
                      </div>
                      
                      {/* Modular Icon-based Cards - Vertical & High-Spaced */}
                      <div className="grid sm:grid-cols-2 gap-6">
                        <div className="p-5 bg-slate-50 border border-slate-200/80 rounded-2xl flex flex-col gap-3.5 transition-all duration-300 hover:bg-indigo-50/40 hover:border-indigo-200 hover:shadow-md group/item">
                          <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 transition-all duration-300 group-hover/item:bg-indigo-600 group-hover/item:text-white group-hover/item:scale-105 flex-shrink-0 shadow-sm">
                            <Globe className="w-5 h-5" />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-extrabold">Registered Institution</span>
                            <strong className="text-slate-800 text-sm mt-1 font-black">GenZ Learners Academy</strong>
                          </div>
                        </div>

                        <div className="p-5 bg-slate-50 border border-slate-200/80 rounded-2xl flex flex-col gap-3.5 transition-all duration-300 hover:bg-emerald-50/40 hover:border-emerald-200 hover:shadow-md group/item">
                          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 transition-all duration-300 group-hover/item:bg-emerald-600 group-hover/item:text-white group-hover/item:scale-105 flex-shrink-0 shadow-sm">
                            <CheckCircle className="w-5 h-5" />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-extrabold">Study Status</span>
                            <strong className="text-emerald-600 text-sm mt-1 flex items-center gap-1.5 font-black">
                              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                              Active & Enrolled
                            </strong>
                          </div>
                        </div>

                        <div className="p-5 bg-slate-50 border border-slate-200/80 rounded-2xl flex flex-col gap-3.5 transition-all duration-300 hover:bg-indigo-50/40 hover:border-indigo-200 hover:shadow-md group/item">
                          <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 transition-all duration-300 group-hover/item:bg-indigo-600 group-hover/item:text-white group-hover/item:scale-105 flex-shrink-0 shadow-sm">
                            <Mail className="w-5 h-5" />
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-extrabold">Email Address</span>
                            <strong className="text-slate-800 text-sm mt-1 font-black truncate block">{user?.email || 'N/A'}</strong>
                          </div>
                        </div>

                        <div className="p-5 bg-slate-50 border border-slate-200/80 rounded-2xl flex flex-col gap-3.5 transition-all duration-300 hover:bg-indigo-50/40 hover:border-indigo-200 hover:shadow-md group/item">
                          <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 transition-all duration-300 group-hover/item:bg-indigo-600 group-hover/item:text-white group-hover/item:scale-105 flex-shrink-0 shadow-sm">
                            <GraduationCap className="w-5 h-5" />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-extrabold">Course Cohort</span>
                            <strong className="text-slate-800 text-sm mt-1 font-black">{user?.batch || 'Web Development'}</strong>
                          </div>
                        </div>

                        <div className="p-5 bg-slate-50 border border-slate-200/80 rounded-2xl flex flex-col gap-3.5 transition-all duration-300 hover:bg-indigo-50/40 hover:border-indigo-200 hover:shadow-md group/item">
                          <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 transition-all duration-300 group-hover/item:bg-indigo-600 group-hover/item:text-white group-hover/item:scale-105 flex-shrink-0 shadow-sm">
                            <Shield className="w-5 h-5" />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-extrabold">Security Profile</span>
                            <strong className="text-slate-800 text-sm mt-1 font-black">Student Access Role</strong>
                          </div>
                        </div>

                        <div className="p-5 bg-slate-50 border border-slate-200/80 rounded-2xl flex flex-col gap-3.5 transition-all duration-300 hover:bg-indigo-50/40 hover:border-indigo-200 hover:shadow-md group/item">
                          <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 transition-all duration-300 group-hover/item:bg-indigo-600 group-hover/item:text-white group-hover/item:scale-105 flex-shrink-0 shadow-sm">
                            <User className="w-5 h-5" />
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-extrabold">Candidate Signature</span>
                            <strong className="text-slate-800 text-sm mt-1 font-mono truncate block" title={user?.name ? user.name.toUpperCase().replace(/\s+/g, '_') : 'STUDENT_CANDIDATE'}>
                              {user?.name ? user.name.toUpperCase().replace(/\s+/g, '_') : 'STUDENT_CANDIDATE'}
                            </strong>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="h-px bg-slate-100 my-6" />

                      {/* Database Keys & Verification Key */}
                      <div className="flex flex-col gap-2.5">
                        <label className="text-[10px] font-black text-slate-400 tracking-wider uppercase">UNIQUE CANDIDATE VERIFICATION KEY</label>
                        <div className="flex items-center gap-3">
                          <input 
                            type="text" 
                            readOnly 
                            value={user?.id || user?._id || 'STD-GZ-92847612'} 
                            className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs text-indigo-600 font-mono flex-1 outline-none select-all font-semibold"
                          />
                          <button 
                            onClick={() => {
                              navigator.clipboard.writeText(user?.id || user?._id || 'STD-GZ-92847612');
                              setCopied(true);
                              setTimeout(() => setCopied(false), 2000);
                            }}
                            className="px-5 py-3 bg-indigo-50 border border-indigo-200 hover:bg-indigo-600 hover:text-white hover:border-indigo-600 text-indigo-600 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-sm hover:scale-105"
                          >
                            {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                            <span>{copied ? 'Copied' : 'Copy'}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                </>
              )}

            </div>



          </div>
        )}
      </div>
      {/* Custom Toast Alert */}
      {toast && (
        <div className={`fixed top-6 right-6 z-[9999] max-w-sm w-full bg-white/95 backdrop-blur-xl border rounded-2xl shadow-2xl p-4 flex items-start gap-3 animate-slide-in-right transition-all duration-300 ${
          toast.type === 'success' ? 'border-emerald-200 shadow-emerald-500/5' : 
          toast.type === 'error' ? 'border-red-200 shadow-red-500/5' : 'border-indigo-200 shadow-indigo-500/5'
        }`}>
          <div className={`p-1.5 rounded-lg flex-shrink-0 ${
            toast.type === 'success' ? 'bg-emerald-50 text-emerald-600' :
            toast.type === 'error' ? 'bg-red-50 text-red-600' : 'bg-indigo-50 text-indigo-600'
          }`}>
            {toast.type === 'success' ? (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            ) : toast.type === 'error' ? (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
          </div>
          <div className="flex-1 text-left min-w-0">
            <h4 className="text-xs font-bold text-slate-800 leading-snug">
              {toast.type === 'success' ? 'Success' : toast.type === 'error' ? 'Error' : 'Notification'}
            </h4>
            <p className="text-[11px] text-slate-500 font-semibold mt-0.5 leading-relaxed">{toast.message}</p>
          </div>
          <button 
            onClick={() => setToast(null)}
            className="text-slate-400 hover:text-slate-600 flex-shrink-0 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

    </StudentLayout>
  );
}
