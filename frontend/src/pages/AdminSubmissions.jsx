import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { History, Loader2, Search, SlidersHorizontal } from 'lucide-react';
import AdminLayout from './AdminLayout';

// Helper function for dynamic avatar colors
const getAvatarColor = (name) => {
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

export default function AdminSubmissions() {
  const { user } = useAuth();
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [filterText, setFilterText] = useState('');
  const [selectedBatch, setSelectedBatch] = useState('All Courses');
  const [selectedExam, setSelectedExam] = useState('All Exams');
  const [selectedStatus, setSelectedStatus] = useState('All Statuses');
  const [sortBy, setSortBy] = useState('date-desc');

  // Custom confirmation modal state
  const [confirmData, setConfirmData] = useState(null);

  useEffect(() => {
    const userId = user?._id || user?.id || 'default';
    const cacheKey = `cache_admin_submissions_${userId}`;

    const loadSubmissions = async () => {
      const cachedData = localStorage.getItem(cacheKey);
      if (cachedData) {
        const parsed = JSON.parse(cachedData);
        setSubmissions(parsed?.submissions || []);
        setLoading(false);
      } else {
        setLoading(true);
      }

      try {
        const data = await api.getAnalyticsDashboard();
        setSubmissions(data?.submissions || []);
        localStorage.setItem(cacheKey, JSON.stringify(data));
      } catch (err) {
        console.error('Error fetching submissions:', err);
        if (!cachedData) {
          setError('Failed to retrieve evaluation submission logs.');
        }
      } finally {
        setLoading(false);
      }
    };

    loadSubmissions();
  }, [user]);

  const handleAllowRetake = (id, studentName, examTitle, studentId, examId) => {
    setConfirmData({ id, studentName, examTitle, studentId, examId });
  };

  const executeAllowRetake = async () => {
    if (!confirmData) return;
    const { id, studentId, examId } = confirmData;

    try {
      await api.deleteSubmission(id);
      const updatedSubmissions = submissions.map(sub => 
        (sub.studentId === studentId && sub.examId === examId) ? { ...sub, reset: true } : sub
      );
      setSubmissions(updatedSubmissions);
      
      const userId = user?._id || user?.id || 'default';
      const cacheKey = `cache_admin_submissions_${userId}`;
      const cachedStr = localStorage.getItem(cacheKey);
      if (cachedStr) {
        try {
          const cachedObj = JSON.parse(cachedStr);
          cachedObj.submissions = updatedSubmissions;
          localStorage.setItem(cacheKey, JSON.stringify(cachedObj));
        } catch (e) {
          console.error('Error updating submissions cache:', e);
        }
      }

      setConfirmData(null);
    } catch (err) {
      console.error('Error resetting exam attempt:', err);
      setError(err.message || 'Failed to reset attempt.');
      setConfirmData(null);
    }
  };

  // Collect unique batches and exams dynamically
  const uniqueBatches = ['All Courses', ...Array.from(new Set(submissions.map(s => s.studentBatch || 'Web Development')))];
  const uniqueExams = ['All Exams', ...Array.from(new Set(submissions.map(s => s.examTitle || 'Exam')))];

  // Filtering logic
  const filteredSubmissions = submissions.filter(sub => {
    const matchesSearch = 
      (sub.studentName || '').toLowerCase().includes(filterText.toLowerCase()) ||
      (sub.studentEmail || '').toLowerCase().includes(filterText.toLowerCase()) ||
      (sub.examTitle || '').toLowerCase().includes(filterText.toLowerCase());

    const batch = sub.studentBatch || 'Web Development';
    const matchesBatch = selectedBatch === 'All Courses' || batch === selectedBatch;

    const matchesExam = selectedExam === 'All Exams' || sub.examTitle === selectedExam;

    const matchesStatus = 
      selectedStatus === 'All Statuses' ||
      (selectedStatus === 'Passed' && sub.passed) ||
      (selectedStatus === 'Failed' && !sub.passed);

    return matchesSearch && matchesBatch && matchesExam && matchesStatus;
  });

  // Sorting logic
  const sortedSubmissions = [...filteredSubmissions].sort((a, b) => {
    const dateA = new Date(a.createdAt || 0);
    const dateB = new Date(b.createdAt || 0);
    const perfA = a.percentage || 0;
    const perfB = b.percentage || 0;

    if (sortBy === 'date-desc') return dateB - dateA;
    if (sortBy === 'date-asc') return dateA - dateB;
    if (sortBy === 'perf-desc') return perfB - perfA;
    if (sortBy === 'perf-asc') return perfA - perfB;
    return 0;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
        <p className="text-slate-500 text-sm font-semibold">Loading student submissions archive...</p>
      </div>
    );
  }

  return (
    <AdminLayout activePage="Submissions Log" headerTitle="SUBMISSIONS LOGS">
      <div className="flex flex-col gap-6 animate-slide-up">
        {/* Title Block */}
        <div className="flex flex-col gap-1">
          <h1 className="text-lg font-black text-slate-800 flex items-center gap-2.5">
            <History className="w-5 h-5 text-indigo-600" /> GenZ Learners Student Evaluation Activity
          </h1>
          <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider mt-0.5">
            TOTAL RECORDED LOGS: {submissions.length}
          </p>
        </div>

        {/* Dynamic Filter and Sort Bar */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-4">
          {/* Search Input */}
          <div className="flex-1 min-w-[240px] relative flex items-center">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 flex-shrink-0" />
            <input
              type="text"
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              placeholder="Search candidate, email, exam title..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-semibold shadow-inner"
            />
          </div>

          {/* Filters Select Dropdowns */}
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-400 font-black tracking-wider uppercase">Course:</span>
              <select
                value={selectedBatch}
                onChange={(e) => setSelectedBatch(e.target.value)}
                className="bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-700 font-bold focus:outline-none focus:border-indigo-500 transition-all shadow-sm cursor-pointer max-w-[150px] truncate"
              >
                {uniqueBatches.map(batch => (
                  <option key={batch} value={batch}>{batch}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-400 font-black tracking-wider uppercase">Exam:</span>
              <select
                value={selectedExam}
                onChange={(e) => setSelectedExam(e.target.value)}
                className="bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-700 font-bold focus:outline-none focus:border-indigo-500 transition-all shadow-sm cursor-pointer max-w-[150px] truncate"
              >
                {uniqueExams.map(exam => (
                  <option key={exam} value={exam}>{exam}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-400 font-black tracking-wider uppercase">Status:</span>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-700 font-bold focus:outline-none focus:border-indigo-500 transition-all shadow-sm cursor-pointer"
              >
                <option value="All Statuses">All Statuses</option>
                <option value="Passed">Passed</option>
                <option value="Failed">Failed</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-[10px] text-slate-400 font-black tracking-wider uppercase">Sort:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-700 font-bold focus:outline-none focus:border-indigo-500 transition-all shadow-sm cursor-pointer"
              >
                <option value="date-desc">Newest First</option>
                <option value="date-asc">Oldest First</option>
                <option value="perf-desc">Performance (High-Low)</option>
                <option value="perf-asc">Performance (Low-High)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold shadow-sm">
            {error}
          </div>
        )}

        {/* Submissions Log Table Card */}
        <div className="bg-white border border-slate-300 rounded-3xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            {submissions.length === 0 ? (
              <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
                <History className="w-10 h-10 text-slate-300" />
                <span className="font-semibold">No submissions logged yet. Attendance logs populate as students take tests.</span>
              </div>
            ) : sortedSubmissions.length === 0 ? (
              <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
                <History className="w-10 h-10 text-slate-300 animate-pulse" />
                <span className="font-semibold text-sm">No matching submissions found.</span>
                <span className="text-[10px] text-slate-400 font-semibold">Try adjusting your filters or search terms.</span>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                    <th className="py-4 px-6">Student Candidate</th>
                    <th className="py-4 px-6">Batch</th>
                    <th className="py-4 px-6">Exam Attended</th>
                    <th className="py-4 px-6">Performance</th>
                    <th className="py-4 px-6">Time Spent</th>
                    <th className="py-4 px-6">Status</th>
                    <th className="py-4 px-6">Date</th>
                    <th className="py-4 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                  {sortedSubmissions.map((sub) => {
                    const avatarColor = getAvatarColor(sub.studentName);
                    const timeString = sub.timeSpent 
                      ? `${Math.floor(sub.timeSpent / 60)}m ${sub.timeSpent % 60}s`
                      : 'N/A';
                    const dateStr = sub.createdAt
                      ? new Date(sub.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                      : 'N/A';
                    return (
                      <tr key={sub._id} className="hover:bg-slate-50/30 transition-colors">
                        <td className="py-3.5 px-6 flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full ${avatarColor} flex items-center justify-center font-extrabold text-xs shadow-sm`}>
                            {sub.studentName ? sub.studentName.charAt(0).toUpperCase() : 'S'}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-extrabold text-slate-800">{sub.studentName}</span>
                            <span className="text-[10px] text-slate-400 font-medium mt-0.5">{sub.studentEmail}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-6">
                          <span className="bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-full text-[10px] font-bold">
                            {sub.studentBatch}
                          </span>
                        </td>
                        <td className="py-3.5 px-6">
                          <div className="flex flex-col">
                            <span className="text-slate-800 font-extrabold">{sub.examTitle}</span>
                            <span className="text-[10px] text-indigo-500 font-bold uppercase tracking-wider mt-0.5">{sub.examCategory}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-6">
                          <div className="flex flex-col">
                            <span className="text-slate-900 font-black">{sub.percentage}%</span>
                            <span className="text-[10px] text-slate-400 font-bold mt-0.5">Score: {sub.score}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-6 text-slate-500">{timeString}</td>
                        <td className="py-3.5 px-6">
                          {sub.passed ? (
                            <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider">
                              Passed
                            </span>
                          ) : (
                            <span className="bg-red-50 text-red-700 border border-red-100 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider">
                              Failed
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-6 text-slate-400 text-[11px] font-extrabold">{dateStr}</td>
                        <td className="py-3.5 px-6 text-right">
                          {sub.reset ? (
                            <span className="bg-indigo-50 text-indigo-700 border border-indigo-100 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider">
                              Retake Allowed
                            </span>
                          ) : (
                            <button
                              onClick={() => handleAllowRetake(sub._id, sub.studentName, sub.examTitle, sub.studentId, sub.examId)}
                              className="bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white border border-rose-100 hover:border-rose-500/25 px-3 py-1.5 rounded-xl text-[10px] font-black transition-all cursor-pointer shadow-sm hover:scale-105 inline-flex items-center gap-1"
                              title="Reset attempt to allow student to retake"
                            >
                              Allow Retake
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Custom Confirmation Modal */}
      {confirmData && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white/95 backdrop-blur-xl w-full max-w-md rounded-3xl border border-slate-200 shadow-2xl p-6 md:p-8 animate-scale-in flex flex-col items-center text-center gap-4">
            
            {/* Warning Icon bubble */}
            <div className="w-16 h-16 rounded-full bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-500 shadow-sm animate-bounce">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>

            <div className="flex flex-col gap-2 mt-1">
              <h3 className="text-base font-black text-slate-800 tracking-tight">Allow Assessment Retake</h3>
              <p className="text-xs text-slate-500 font-semibold leading-relaxed px-2">
                Are you sure you want to allow <strong className="text-slate-800 font-extrabold">{confirmData.studentName}</strong> to retake the <strong className="text-indigo-600 font-extrabold">"{confirmData.examTitle}"</strong> exam? This action will delete their current submission record permanently.
              </p>
            </div>

            <div className="flex items-center gap-3.5 w-full mt-4">
              <button
                type="button"
                onClick={() => setConfirmData(null)}
                className="flex-1 py-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 font-bold rounded-xl text-xs transition-all cursor-pointer shadow-sm hover:scale-102"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeAllowRetake}
                className="flex-1 py-3 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-xs transition-all cursor-pointer shadow-md shadow-rose-500/10 hover:scale-102 flex items-center justify-center gap-1.5"
              >
                <span>Yes, Allow Retake</span>
              </button>
            </div>

          </div>
        </div>
      )}
    </AdminLayout>
  );
}
