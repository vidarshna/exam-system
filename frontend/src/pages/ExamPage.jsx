import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { 
  Clock, Flag, CheckCircle, 
  ChevronLeft, ChevronRight, Loader2, X
} from 'lucide-react';

export default function ExamPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [exam, setExam] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  
  // Assessment state
  const [answers, setAnswers] = useState({});
  const [flags, setFlags] = useState({});
  const [visited, setVisited] = useState({ 0: true });
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [submitReason, setSubmitReason] = useState('manual'); // 'manual' | 'timeout'
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Timer state
  const [timeLeft, setTimeLeft] = useState(0);
  const startTimeRef = useRef(Date.now());

  // Fetch exam data
  useEffect(() => {
    const fetchExam = async () => {
      try {
        setLoading(true);
        const data = await api.getExamDetails(id);
        setExam(data);
        setQuestions(data.questions || []);
        setTimeLeft(data.duration * 60);

        // Load saved state if available
        const savedState = localStorage.getItem(`exam_save_${id}_${user?._id}`);
        if (savedState) {
          try {
            const parsed = JSON.parse(savedState);
            setAnswers(parsed.answers || {});
            setFlags(parsed.flags || {});
            setVisited(parsed.visited || { 0: true });
            if (parsed.currentIdx !== undefined) setCurrentIdx(parsed.currentIdx);
            
            // Adjust time remaining based on when they loaded
            const elapsed = Math.floor((Date.now() - parsed.timestamp) / 1000);
            const remaining = parsed.timeLeft - elapsed;
            setTimeLeft(remaining > 0 ? remaining : 5);
          } catch (e) {
            console.error('Error parsing saved exam state:', e);
          }
        }
      } catch (err) {
        console.error('Error fetching exam details:', err);
        setError(err.message || 'Failed to fetch exam instructions. Please contact administrator.');
      } finally {
        setLoading(false);
      }
    };

    fetchExam();
  }, [id, user]);

  // Periodic Auto-Save
  useEffect(() => {
    if (!exam) return;
    const saveState = {
      answers,
      flags,
      visited,
      currentIdx,
      timeLeft,
      timestamp: Date.now()
    };
    localStorage.setItem(`exam_save_${id}_${user?._id}`, JSON.stringify(saveState));
  }, [answers, flags, visited, currentIdx, timeLeft, exam, id, user]);

  // Timer Tick
  useEffect(() => {
    if (!exam || loading || submitting) return;

    if (timeLeft <= 0) {
      handleAutoSubmit();
      return;
    }

    const interval = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [timeLeft, exam, loading, submitting]);

  const handleAutoSubmit = () => {
    setSubmitReason('timeout');
    submitExamResults();
  };

  const submitExamResults = async () => {
    setSubmitting(true);
    
    const finalAnswers = questions.map(q => ({
      questionId: q._id,
      selectedAnswer: answers[q._id] || ''
    }));

    const timeSpent = Math.floor((Date.now() - startTimeRef.current) / 1000);

    try {
      const payload = {
        examId: id,
        answers: finalAnswers,
        cheatingFlags: 0,
        timeSpent
      };

      const result = await api.submitExam(payload);
      localStorage.removeItem(`exam_save_${id}_${user?._id}`);
      navigate(`/result/${result._id}`);
    } catch (err) {
      console.error('Error submitting assessment results:', err);
      setError('Connection failure. Your responses are auto-saved locally. Please contact support.');
      setSubmitting(false);
      setSubmitReason('manual');
    }
  };

  const selectOption = (qId, option) => {
    setAnswers(prev => ({
      ...prev,
      [qId]: option
    }));
  };

  const jumpToQuestion = (idx) => {
    setCurrentIdx(idx);
    setVisited(prev => ({
      ...prev,
      [idx]: true
    }));
  };

  const handleNext = () => {
    if (currentIdx < questions.length - 1) {
      jumpToQuestion(currentIdx + 1);
    }
  };

  const handlePrev = () => {
    if (currentIdx > 0) {
      jumpToQuestion(currentIdx - 1);
    }
  };

  const toggleFlag = (qId) => {
    setFlags(prev => ({
      ...prev,
      [qId]: !prev[qId]
    }));
  };

  const formatTime = (secs) => {
    const mins = Math.floor(secs / 60);
    const rs = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${rs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
        <p className="text-slate-500 text-sm font-semibold">Configuring assessment environment...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col items-center justify-center p-4">
        <div className="glass-panel p-8 rounded-3xl text-center border border-red-200 bg-white max-w-md shadow-lg">
          <h2 className="text-lg font-bold text-slate-800">System Error</h2>
          <p className="text-sm text-slate-500 mt-2 font-medium">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="mt-6 bg-slate-100 hover:bg-slate-200 border border-slate-300 px-6 py-2.5 rounded-xl text-xs font-bold text-slate-600 transition-all cursor-pointer shadow-sm"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentIdx];
  const isTimeUrgent = timeLeft < 120;

  return (
    <div className="h-screen flex font-sans bg-[#f0f1fa] overflow-hidden select-none">
      
      {/* Mobile Sidebar Backdrop */}
      {sidebarOpen && (
        <div 
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm md:hidden animate-fade-in"
        />
      )}

      {/* ── Dark Sidebar Drawer ── */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 md:w-56 md:relative md:translate-x-0 md:flex flex-col h-screen overflow-y-auto
                        bg-gradient-to-b from-[#312e81] via-[#2d2b8b] to-[#1e1b5e]
                        shadow-2xl shadow-indigo-900/40 transition-transform duration-300 ease-in-out p-5 gap-6 ${
                          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
                        }`}>
        
        {/* Brand/Logo (Matching sidebar on other pages) */}
        <div className="flex items-center justify-between gap-3 select-none">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#0d0b21] border border-white/10 flex items-center justify-center flex-shrink-0 shadow-lg overflow-hidden">
              <img src="/genz_logo.png" alt="GenZ" className="w-7 h-7 object-contain" />
            </div>
            <div className="min-w-0">
              <span className="font-black text-white text-sm tracking-wide leading-none block truncate">
                GenZ Learners
              </span>
              <span className="text-[9px] text-indigo-300 font-bold tracking-widest block mt-0.5">ASSESSMENT</span>
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

        <div className="h-px bg-white/10 my-1" />

        {/* Question Navigator */}
        <div>
          <h3 className="text-xs font-bold text-indigo-200 tracking-wider mb-3">QUESTION NAVIGATOR</h3>
          <div className="grid grid-cols-5 gap-2">
            {questions.map((q, idx) => {
              const isCurrent = idx === currentIdx;
              const isFlagged = !!flags[q._id];
              const isAnswered = !!answers[q._id];
              const isSeen = !!visited[idx];

              let btnStyles = 'bg-white/5 border border-white/5 text-white/50 hover:bg-white/10 hover:text-white';
              
              if (isCurrent) {
                btnStyles = 'bg-white border border-white text-indigo-900 font-extrabold shadow-md shadow-white/10';
              } else if (isFlagged) {
                btnStyles = 'bg-amber-500 border border-amber-500 text-white font-bold';
              } else if (isAnswered) {
                btnStyles = 'bg-indigo-500/40 border border-indigo-400/35 text-indigo-100 font-bold';
              } else if (isSeen) {
                btnStyles = 'bg-white/15 border border-white/10 text-white/80 hover:bg-white/20';
              }

              return (
                <button
                  key={q._id}
                  onClick={() => {
                    jumpToQuestion(idx);
                    setSidebarOpen(false); // Close drawer on navigation
                  }}
                  className={`h-9 w-9 text-xs rounded-lg transition-all flex items-center justify-center cursor-pointer ${btnStyles}`}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>
        </div>

        {/* Legend */}
        <div className="border-t border-white/10 pt-5 flex flex-col gap-3 text-xs text-indigo-200 font-semibold mt-auto">
          <h4 className="font-bold text-indigo-200 tracking-wider">LEGEND</h4>
          <div className="flex flex-col gap-2.5 bg-white/5 p-3.5 rounded-xl border border-white/5">
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 bg-white rounded shadow-sm"></span>
              <span className="text-white/90">Active Question</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 bg-indigo-500/40 border border-indigo-400/35 rounded"></span>
              <span className="text-white/80">Answered</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 bg-amber-500 rounded"></span>
              <span className="text-white/80">Flagged for Review</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 bg-white/15 border border-white/10 rounded"></span>
              <span className="text-white/70">Visited / Unanswered</span>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Main Content Workspace ── */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        
        {/* Top Header */}
        <header className="h-16 border-b border-slate-200 bg-white flex items-center justify-between px-4 md:px-8 sticky top-0 z-10 shadow-sm flex-shrink-0">
          <div className="flex items-center gap-3">
            {/* Hamburger Toggle Button */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2.5 bg-white border border-slate-200 text-slate-500 rounded-xl hover:text-indigo-600 md:hidden flex items-center justify-center cursor-pointer shadow-sm transition-all"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div>
              <h1 className="font-extrabold text-[10px] text-slate-400 tracking-wider leading-none">CANDIDATE ASSESSMENT</h1>
              <h2 className="text-slate-800 text-xs md:text-sm font-black mt-1 leading-none truncate max-w-[140px] sm:max-w-md">{exam?.title}</h2>
            </div>
          </div>

          {/* Timer Box */}
          <div className={`flex items-center gap-2 border px-4 py-2 rounded-xl transition-all duration-300 ${
            isTimeUrgent 
              ? 'bg-red-50 border-red-200 text-red-600 animate-pulse font-bold' 
              : 'bg-slate-50 border-slate-200 text-slate-700'
          }`}>
            <Clock className="w-4 h-4 text-indigo-600" />
            <span className="font-mono text-xs font-bold tracking-widest">{formatTime(timeLeft)}</span>
          </div>
        </header>

        {/* Central Workspace Content */}
        <main className="flex-1 p-4 sm:p-8 overflow-y-auto">
          {currentQuestion ? (
            <div className="max-w-4xl mx-auto flex flex-col gap-6">
              
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500">
                  Question <strong className="text-slate-800">{currentIdx + 1}</strong> of {questions.length}
                </span>
                <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${
                  currentQuestion.difficulty === 'Easy' 
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-600' 
                    : currentQuestion.difficulty === 'Hard'
                      ? 'bg-red-50 border-red-200 text-red-600'
                      : 'bg-amber-50 border-amber-200 text-amber-600'
                }`}>
                  {currentQuestion.difficulty}
                </span>
              </div>

              {/* Question Card */}
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                <p className="text-slate-800 text-sm md:text-base font-bold leading-relaxed">{currentQuestion.question}</p>
              </div>

              {/* Options list */}
              <div className="flex flex-col gap-3">
                {currentQuestion.options.map((opt, i) => {
                  const isSelected = answers[currentQuestion._id] === opt;
                  const letter = String.fromCharCode(65 + i);

                  return (
                    <button
                      key={opt}
                      onClick={() => selectOption(currentQuestion._id, opt)}
                      className={`w-full text-left p-4 rounded-2xl border transition-all cursor-pointer flex items-center gap-4 group shadow-sm ${
                        isSelected 
                          ? 'bg-indigo-50/50 border-indigo-500 text-indigo-900 font-bold' 
                          : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                      }`}
                    >
                      <span className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs border transition-all ${
                        isSelected 
                          ? 'bg-indigo-600 border-indigo-500 text-white' 
                          : 'bg-slate-50 border-slate-200 text-slate-400 group-hover:text-slate-600'
                      }`}>
                        {letter}
                      </span>
                      <span className="text-xs sm:text-sm font-semibold">{opt}</span>
                    </button>
                  );
                })}
              </div>

              {/* Navigation Footer */}
              <div className="mt-8 pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3 flex-shrink-0">
                  <button
                    onClick={handlePrev}
                    disabled={currentIdx === 0}
                    className="h-11 w-11 bg-white border border-slate-200 text-slate-500 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50/30 rounded-xl flex items-center justify-center transition-all cursor-pointer shadow-sm disabled:opacity-30 disabled:pointer-events-none flex-shrink-0"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  
                  <button
                    onClick={handleNext}
                    disabled={currentIdx === questions.length - 1}
                    className="h-11 w-11 bg-white border border-slate-200 text-slate-500 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50/30 rounded-xl flex items-center justify-center transition-all cursor-pointer shadow-sm disabled:opacity-30 disabled:pointer-events-none flex-shrink-0"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex items-center gap-3 flex-wrap w-full sm:w-auto justify-center sm:justify-end">
                  <button
                    onClick={() => toggleFlag(currentQuestion._id)}
                    className={`px-4 py-2.5 border rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer transition-all shadow-sm flex-shrink-0 ${
                      flags[currentQuestion._id]
                        ? 'bg-amber-500 border-amber-500 text-white hover:bg-amber-600'
                        : 'bg-white border-slate-200 text-slate-500 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50/30'
                    }`}
                  >
                    <Flag className="w-4 h-4" />
                    <span>{flags[currentQuestion._id] ? 'Flagged' : 'Flag Question'}</span>
                  </button>

                  <button
                    onClick={submitExamResults}
                    disabled={submitting}
                    className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-xl text-xs tracking-wider transition-all cursor-pointer hover:shadow-lg hover:shadow-indigo-500/20 disabled:opacity-50 shadow-md flex-shrink-0"
                  >
                    {submitting ? 'Submitting...' : 'Submit Assessment'}
                  </button>
                </div>
              </div>

            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
            </div>
          )}
        </main>
      </div>

      {/* Fullscreen Submission Loading Overlay */}
      {submitting && (
        <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-md flex flex-col items-center justify-center gap-4 text-center p-6 animate-fade-in">
          <div className="bg-white/95 backdrop-blur-xl border border-slate-200 rounded-3xl p-8 max-w-sm shadow-2xl flex flex-col items-center gap-5 animate-scale-in">
            <div className="w-16 h-16 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-sm">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
            <div className="flex flex-col gap-2">
              <h3 className="text-base font-black text-slate-800 tracking-tight">
                {submitReason === 'timeout' ? 'Time Limit Reached' : 'Submitting Assessment'}
              </h3>
              <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                {submitReason === 'timeout' 
                  ? 'Your time limit has expired. Automatically saving and submitting your responses...' 
                  : 'Saving your responses and evaluating results. Please do not close or reload this page.'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
