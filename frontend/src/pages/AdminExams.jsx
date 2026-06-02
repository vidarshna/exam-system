import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { 
  Plus, Trash2, Timer, Award, HelpCircle, X, Check, Loader2,
  FileSpreadsheet, User, Settings, Globe, GraduationCap, Search
} from 'lucide-react';
import AdminLayout from './AdminLayout';

export default function AdminExams() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [exams, setExams] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Custom Toast State
  const [toast, setToast] = useState(null); // { message: string, type: 'success' | 'error' | 'info' }

  // Custom Deletion Confirmation State
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
  };

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Modal Control
  const [showModal, setShowModal] = useState(false);

  // Form States
  const [title, setTitle] = useState('');
  const [duration, setDuration] = useState(30);
  const [category, setCategory] = useState('HTML');
  const [totalQuestions, setTotalQuestions] = useState(10);
  const [passingMark, setPassingMark] = useState(50);
  const [negativeMarking, setNegativeMarking] = useState(0);
  const [randomizeQuestions, setRandomizeQuestions] = useState(true);
  const [shuffleOptions, setShuffleOptions] = useState(true);
  const [assignedStudentId, setAssignedStudentId] = useState('');
  const [assignmentType, setAssignmentType] = useState('global');
  const [assignedBatch, setAssignedBatch] = useState('');
  const [studentSearch, setStudentSearch] = useState('');
  const [showStudentDropdown, setShowStudentDropdown] = useState(false);

  // Close student dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (!e.target.closest('[data-panel]')) {
        setShowStudentDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Fetch Exams and Students list
  const loadInitialData = async (skipCache = false) => {
    const userId = user?._id || user?.id || 'default';
    const keyExams = `cache_admin_exams_${userId}`;
    const keyStudents = `cache_admin_students_${userId}`;
    
    const cachedExams = localStorage.getItem(keyExams);
    const cachedStudents = localStorage.getItem(keyStudents);

    if (cachedExams && cachedStudents && !skipCache) {
      setExams(JSON.parse(cachedExams));
      setStudents(JSON.parse(cachedStudents));
      setLoading(false);
    } else {
      setLoading(true);
    }

    try {
      const [examsData, studentsData] = await Promise.all([
        api.getExams(),
        api.getStudents()
      ]);
      const filteredStudents = studentsData.filter(s => s.role === 'student');
      setExams(examsData);
      setStudents(filteredStudents);

      localStorage.setItem(keyExams, JSON.stringify(examsData));
      localStorage.setItem(keyStudents, JSON.stringify(filteredStudents));
    } catch (err) {
      console.error('Error fetching admin exams data:', err);
      if (!cachedExams || skipCache) {
        setError('Failed to fetch scheduled exams or student list.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData(false);
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    const payload = {
      title: title.trim(),
      duration: Number(duration),
      category,
      totalQuestions: Number(totalQuestions),
      passingMark: Number(passingMark),
      negativeMarking: Number(negativeMarking),
      randomizeQuestions,
      shuffleOptions,
      assignedStudentId: assignmentType === 'student' ? assignedStudentId : null,
      assignedBatch: assignmentType === 'batch' ? assignedBatch : null
    };

    try {
      await api.createExam(payload);
      setShowModal(false);
      
      // Clear Form
      setTitle('');
      setDuration(30);
      setCategory('HTML');
      setTotalQuestions(10);
      setPassingMark(50);
      setNegativeMarking(0);
      setRandomizeQuestions(true);
      setShuffleOptions(true);
      setAssignedStudentId('');
      setAssignmentType('global');
      setAssignedBatch('');
      setStudentSearch('');
      
      loadInitialData(true);
      showToast('Exam configuration created successfully.', 'success');
    } catch (err) {
      console.error('Error creating exam:', err);
      showToast(err.message || 'Failed to create exam.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (id) => {
    setDeleteConfirmId(id);
  };

  const executeDelete = async () => {
    if (!deleteConfirmId) return;
    try {
      await api.deleteExam(deleteConfirmId);
      showToast('Exam configuration deleted successfully.', 'success');
      loadInitialData(true);
    } catch (err) {
      console.error('Error deleting exam:', err);
      showToast('Failed to delete exam.', 'error');
    } finally {
      setDeleteConfirmId(null);
    }
  };

  const headerActions = (
    <button
      onClick={() => setShowModal(true)}
      className="px-2.5 py-2 sm:px-3.5 sm:py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all shadow-md shadow-indigo-500/10"
      title="Schedule Exam"
    >
      <Plus className="w-4 h-4 flex-shrink-0" />
      <span className="hidden sm:inline">Schedule Exam</span>
    </button>
  );

  return (
    <AdminLayout 
      activePage="Configure Exams" 
      headerTitle="EXAM SCHEDULER" 
      headerActions={headerActions}
    >

          {/* Error Message */}
          {error && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold shadow-sm">
              {error}
            </div>
          )}

          {/* Active Exams Configuration */}
          {loading ? (
            <div className="flex-1 flex flex-col items-center justify-center p-12">
              <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
            </div>
          ) : exams.length === 0 ? (
            <div className="glass-panel p-12 text-center rounded-2xl border border-slate-300 bg-white flex flex-col items-center justify-center gap-3 shadow-sm">
              <FileSpreadsheet className="w-10 h-10 text-slate-400" />
              <p className="text-slate-500 text-sm font-semibold">No examinations are scheduled. Click "Schedule Exam" to configure one.</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-slide-up">
              {exams.map(exam => (
                <div key={exam._id} className="glass-panel p-5 rounded-2xl border border-slate-300 bg-white shadow-sm hover:border-indigo-500/30 transition-all duration-300 flex flex-col justify-between relative group">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-100">
                        {exam.category}
                      </span>
                      <button
                        onClick={() => handleDelete(exam._id)}
                        className="p-1.5 bg-white hover:bg-red-50 border border-slate-200 hover:border-red-200 text-slate-500 hover:text-red-600 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer duration-300 shadow-sm"
                        title="Delete Exam Configuration"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <h3 className="font-bold text-slate-800 mt-4 text-base truncate">{exam.title}</h3>
                    
                    <div className="flex flex-col gap-2.5 mt-4 pt-4 border-t border-slate-200 text-xs text-slate-500 font-medium">
                      <div className="flex items-center gap-2">
                        <Timer className="w-4 h-4 text-indigo-600" />
                        <span>Duration: <strong className="text-slate-700">{exam.duration} minutes</strong></span>
                      </div>
                      <div className="flex items-center gap-2">
                        <HelpCircle className="w-4 h-4 text-cyan-600" />
                        <span>Question Pool: <strong className="text-slate-700">{exam.totalQuestions} questions</strong></span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Award className="w-4 h-4 text-amber-500" />
                        <span>Passing Grade: <strong className="text-slate-700">{exam.passingMark}%</strong></span>
                      </div>
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-indigo-500" />
                        <span>Assignee: <strong className="text-indigo-600 font-bold">{exam.assignedStudentName || "All Students"}</strong></span>
                      </div>
                    </div>
                  </div>

                  {exam.negativeMarking > 0 && (
                    <div className="mt-4 p-2 bg-red-50 border border-red-200 rounded-xl text-[9px] text-center text-red-600 font-bold shadow-sm">
                      Negative Marking Enabled: -{exam.negativeMarking} per error
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

      {/* Schedule Exam Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-xl bg-white rounded-3xl border border-slate-300 shadow-2xl p-6 md:p-8 animate-scale-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Settings className="w-5 h-5 text-indigo-600" />
                <span>Schedule New Exam</span>
              </h3>
              <button 
                onClick={() => setShowModal(false)} 
                className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-6">
              {/* Exam Title */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-500 tracking-wider">EXAM TITLE</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="React Hooks Assessment Test"
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all shadow-sm"
                />
              </div>

              {/* Grid settings */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-500 tracking-wider">SUBJECT DOMAIN</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 focus:outline-none focus:border-indigo-500 transition-all shadow-sm"
                  >
                    <option value="HTML">HTML Fundamentals</option>
                    <option value="CSS">CSS Layouts</option>
                    <option value="JavaScript">JavaScript Basics</option>
                    <option value="React">React Framework</option>
                    <option value="Node.js">Node.js / Express</option>
                    <option value="Database">MongoDB / SQL</option>
                    <option value="Bootstrap">Bootstrap Grid</option>
                    <option value="Git/GitHub">Git Version Control</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-500 tracking-wider">TIMER DURATION (MINS)</label>
                  <input
                    type="number"
                    required
                    min="1"
                    max="300"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-indigo-500 transition-all shadow-sm"
                  />
                </div>
              </div>

              {/* Advanced Parameters */}
              <div className="grid grid-cols-3 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-500 tracking-wider">QUESTION SIZE</label>
                  <input
                    type="number"
                    required
                    min="1"
                    max="100"
                    value={totalQuestions}
                    onChange={(e) => setTotalQuestions(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-indigo-500 transition-all shadow-sm"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-500 tracking-wider">PASS % THRESHOLD</label>
                  <input
                    type="number"
                    required
                    min="10"
                    max="100"
                    value={passingMark}
                    onChange={(e) => setPassingMark(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-indigo-500 transition-all shadow-sm"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-500 tracking-wider">NEGATIVE MARKS</label>
                  <select
                    value={negativeMarking}
                    onChange={(e) => setNegativeMarking(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 transition-all shadow-sm"
                  >
                    <option value="0">0 (None)</option>
                    <option value="0.25">-0.25</option>
                    <option value="0.5">-0.50</option>
                    <option value="1">-1.00</option>
                  </select>
                </div>
              </div>

              {/* Assignment Level (Segmented Control) */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-slate-500 tracking-wider">ASSIGN TO STUDENT</label>
                <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-2xl border border-slate-200/60">
                  <button
                    type="button"
                    onClick={() => {
                      setAssignmentType('global');
                      setAssignedStudentId('');
                      setAssignedBatch('');
                    }}
                    className={`py-3 px-2 rounded-xl text-[11px] sm:text-xs font-bold flex items-center justify-center gap-1.5 transition-all duration-200 cursor-pointer ${
                      assignmentType === 'global'
                        ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/10'
                        : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <Globe className="w-3.5 h-3.5" />
                    <span>Global</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAssignmentType('batch');
                      setAssignedStudentId('');
                      setAssignedBatch('');
                    }}
                    className={`py-3 px-2 rounded-xl text-[11px] sm:text-xs font-bold flex items-center justify-center gap-1.5 transition-all duration-200 cursor-pointer ${
                      assignmentType === 'batch'
                        ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/10'
                        : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <GraduationCap className="w-3.5 h-3.5" />
                    <span>Batch</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAssignmentType('student');
                      setAssignedStudentId('');
                      setAssignedBatch('');
                      setStudentSearch('');
                    }}
                    className={`py-3 px-2 rounded-xl text-[11px] sm:text-xs font-bold flex items-center justify-center gap-1.5 transition-all duration-200 cursor-pointer ${
                      assignmentType === 'student'
                        ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/10'
                        : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <User className="w-3.5 h-3.5" />
                    <span>Individual</span>
                  </button>
                </div>
              </div>

              {/* Conditional Inputs */}
              {(assignmentType === 'batch' || assignmentType === 'student') && (
                <div className="grid grid-cols-1 gap-4 animate-fade-in">
                  {assignmentType === 'batch' && (
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-slate-500 tracking-wider">SELECT COURSE BATCH</label>
                      <select
                        value={assignedBatch}
                        onChange={(e) => setAssignedBatch(e.target.value)}
                        required
                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 focus:outline-none focus:border-indigo-500 transition-all shadow-sm"
                      >
                        <option value="">Choose a Batch...</option>
                        <option value="Web Development">Web Development</option>
                        <option value="Advanced Full Stack Development">Advanced Full Stack Development</option>
                        <option value="Python & Machine Learning">Python & Machine Learning</option>
                        <option value="Advanced Java Enterprise">Advanced Java Enterprise</option>
                        <option value="Cloud Computing & DevOps">Cloud Computing & DevOps</option>
                        <option value="Cybersecurity & Ethical Hacking">Cybersecurity & Ethical Hacking</option>
                        <option value="Data Science & Analytics">Data Science & Analytics</option>
                      </select>
                    </div>
                  )}

                  {assignmentType === 'student' && (
                    <div className="flex flex-col gap-1.5 relative" data-panel>
                      <label className="text-xs font-bold text-slate-500 tracking-wider">SELECT STUDENT</label>
                      
                      {!assignedStudentId ? (
                        <div className="relative">
                          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <input
                            type="text"
                            placeholder="Search student by name or email..."
                            value={studentSearch}
                            onChange={(e) => {
                              setStudentSearch(e.target.value);
                              setShowStudentDropdown(true);
                            }}
                            onFocus={() => setShowStudentDropdown(true)}
                            className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-sm text-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all shadow-sm"
                          />
                        </div>
                      ) : (
                        <div className="flex items-center justify-between bg-indigo-50 border border-indigo-200 px-4 py-3 rounded-xl text-sm text-indigo-700 font-semibold shadow-sm animate-fade-in">
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-indigo-500" />
                            <span>
                              {students.find(s => s._id === assignedStudentId)?.name || 'Selected Student'} ({students.find(s => s._id === assignedStudentId)?.email})
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setAssignedStudentId('');
                              setStudentSearch('');
                            }}
                            className="p-1 hover:bg-indigo-100 rounded-lg text-indigo-500 hover:text-indigo-700 transition-all cursor-pointer"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      )}

                      {showStudentDropdown && !assignedStudentId && (
                        <div className="absolute left-0 right-0 top-[calc(100%+4px)] bg-white rounded-xl shadow-2xl border border-slate-200 z-50 max-h-52 overflow-y-auto divide-y divide-slate-50 animate-fade-in">
                          {students.filter(student => 
                            student.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
                            student.email.toLowerCase().includes(studentSearch.toLowerCase())
                          ).length > 0 ? (
                            students.filter(student => 
                              student.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
                              student.email.toLowerCase().includes(studentSearch.toLowerCase())
                            ).map(student => (
                              <button
                                key={student._id}
                                type="button"
                                onClick={() => {
                                  setAssignedStudentId(student._id);
                                  setShowStudentDropdown(false);
                                }}
                                className="w-full flex items-center justify-between px-4 py-3 hover:bg-indigo-50 text-left transition-colors cursor-pointer"
                              >
                                <div>
                                  <p className="text-xs font-bold text-slate-700">{student.name}</p>
                                  <p className="text-[10px] text-slate-400 font-semibold mt-0.5">{student.email}</p>
                                </div>
                                <span className="text-[9px] font-black px-2 py-0.5 rounded bg-indigo-50 border border-indigo-100 text-indigo-600 uppercase tracking-wide">
                                  {student.batch || 'No Batch'}
                                </span>
                              </button>
                            ))
                          ) : (
                            <div className="p-4 text-center text-xs font-semibold text-slate-400">
                              No candidates matching "{studentSearch}"
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Shuffling configs */}
              <div className="flex flex-col gap-3 mt-2 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 tracking-wider">SECURITY CONFIGURATIONS</span>
                
                <div className="flex items-center gap-3 font-semibold text-slate-600">
                  <input
                    type="checkbox"
                    id="randomize"
                    checked={randomizeQuestions}
                    onChange={(e) => setRandomizeQuestions(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 bg-white text-indigo-600 focus:ring-indigo-500"
                  />
                  <label htmlFor="randomize" className="text-xs text-slate-700 cursor-pointer">
                    Randomize Question Pools for students
                  </label>
                </div>

                <div className="flex items-center gap-3 font-semibold text-slate-600">
                  <input
                    type="checkbox"
                    id="shuffle"
                    checked={shuffleOptions}
                    onChange={(e) => setShuffleOptions(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 bg-white text-indigo-600 focus:ring-indigo-500"
                  />
                  <label htmlFor="shuffle" className="text-xs text-slate-700 cursor-pointer">
                    Auto-Shuffle Option sequences (A, B, C, D)
                  </label>
                </div>
              </div>

              <div className="flex items-center gap-4 mt-6 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-500 font-bold rounded-xl text-xs transition-all cursor-pointer shadow-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs transition-all cursor-pointer flex items-center justify-center gap-1 shadow-md shadow-indigo-500/10"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  <span>Schedule Exam</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
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

      {/* Custom Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white/95 backdrop-blur-xl w-full max-w-md rounded-3xl border border-slate-200 shadow-2xl p-6 md:p-8 animate-scale-in flex flex-col items-center text-center gap-4">
            
            {/* Warning Icon Bubble */}
            <div className="w-16 h-16 rounded-full bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-500 shadow-sm animate-bounce">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>

            <div className="flex flex-col gap-2 mt-1">
              <h3 className="text-base font-black text-slate-800 tracking-tight">Delete Exam Configuration</h3>
              <p className="text-xs text-slate-500 font-semibold leading-relaxed px-2">
                Are you sure you want to delete this exam configuration? This will delete all student records for this exam.
              </p>
            </div>

            <div className="flex items-center gap-3.5 w-full mt-4">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="flex-1 py-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 font-bold rounded-xl text-xs transition-all cursor-pointer shadow-sm hover:scale-102"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeDelete}
                className="flex-1 py-3 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-xs transition-all cursor-pointer shadow-md shadow-rose-500/10 hover:scale-102 flex items-center justify-center gap-1.5"
              >
                <span>Yes, Delete</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </AdminLayout>
  );
}
