import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { 
  Database, Plus, Trash2, Edit, Filter, FileUp, Sparkles, X, Check, Loader2
} from 'lucide-react';
import AdminLayout from './AdminLayout';

export default function AdminQuestions() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [questions, setQuestions] = useState([]);
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

  // Filtering states
  const [categoryFilter, setCategoryFilter] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState('');

  // Modal control
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create' or 'edit'
  const [editingId, setEditingId] = useState(null);

  // Form states
  const [questionText, setQuestionText] = useState('');
  const [category, setCategory] = useState('HTML');
  const [difficulty, setDifficulty] = useState('Easy');
  const [optA, setOptA] = useState('');
  const [optB, setOptB] = useState('');
  const [optC, setOptC] = useState('');
  const [optD, setOptD] = useState('');
  const [correctOption, setCorrectOption] = useState('A');

  // Bulk import state
  const [showImportModal, setShowImportModal] = useState(false);
  const [importJsonText, setImportJsonText] = useState('');
  const [importTab, setImportTab] = useState('json'); // 'json' or 'pdf'
  const [pdfFile, setPdfFile] = useState(null);
  const [pdfParsing, setPdfParsing] = useState(false);
  const [parsedQuestions, setParsedQuestions] = useState([]);
  const [batchCategory, setBatchCategory] = useState('HTML');
  const [batchDifficulty, setBatchDifficulty] = useState('Medium');



  // Fetch questions
  const loadQuestions = async (skipCache = false) => {
    const userId = user?._id || user?.id || 'default';
    const cacheKey = `cache_admin_questions_${userId}_${categoryFilter || 'all'}_${difficultyFilter || 'all'}`;
    const cachedData = localStorage.getItem(cacheKey);

    if (cachedData && !skipCache) {
      setQuestions(JSON.parse(cachedData));
      setLoading(false);
    } else {
      setLoading(true);
    }

    try {
      const data = await api.getQuestions(categoryFilter, difficultyFilter);
      setQuestions(data);
      localStorage.setItem(cacheKey, JSON.stringify(data));
    } catch (err) {
      console.error('Error fetching questions:', err);
      if (!cachedData || skipCache) {
        setError('Failed to fetch question bank records.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQuestions(false);
  }, [categoryFilter, difficultyFilter, user]);

  const openCreateModal = () => {
    setModalMode('create');
    setEditingId(null);
    setQuestionText('');
    setCategory('HTML');
    setDifficulty('Easy');
    setOptA('');
    setOptB('');
    setOptC('');
    setOptD('');
    setCorrectOption('A');
    setShowModal(true);
  };

  const openEditModal = (q) => {
    setModalMode('edit');
    setEditingId(q._id);
    setQuestionText(q.question);
    setCategory(q.category);
    setDifficulty(q.difficulty);
    setOptA(q.options[0] || '');
    setOptB(q.options[1] || '');
    setOptC(q.options[2] || '');
    setOptD(q.options[3] || '');
    
    const correctIdx = q.options.indexOf(q.correctAnswer);
    setCorrectOption(correctIdx === 0 ? 'A' : correctIdx === 1 ? 'B' : correctIdx === 2 ? 'C' : 'D');
    
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    const options = [optA.trim(), optB.trim(), optC.trim(), optD.trim()].filter(Boolean);
    if (options.length < 2) {
      showToast('Questions require at least 2 non-empty options.', 'error');
      setSubmitting(false);
      return;
    }

    let correctAnswer = options[0];
    if (correctOption === 'B') correctAnswer = options[1] || options[0];
    if (correctOption === 'C') correctAnswer = options[2] || options[0];
    if (correctOption === 'D') correctAnswer = options[3] || options[0];

    const payload = {
      question: questionText.trim(),
      options,
      correctAnswer,
      category,
      difficulty
    };

    try {
      if (modalMode === 'create') {
        await api.createQuestion(payload);
        showToast('Question created successfully.', 'success');
      } else {
        await api.updateQuestion(editingId, payload);
        showToast('Question updated successfully.', 'success');
      }
      setShowModal(false);
      loadQuestions(true);
    } catch (err) {
      console.error('Error saving question:', err);
      showToast(err.message || 'Failed to save question.', 'error');
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
      await api.deleteQuestion(deleteConfirmId);
      showToast('Question deleted successfully.', 'success');
      loadQuestions(true);
    } catch (err) {
      console.error('Error deleting question:', err);
      showToast('Failed to delete question.', 'error');
    } finally {
      setDeleteConfirmId(null);
    }
  };

  const handleBulkImport = async () => {
    try {
      const parsed = JSON.parse(importJsonText);
      if (!Array.isArray(parsed)) {
        showToast('Data must be a JSON array of question objects.', 'error');
        return;
      }

      setSubmitting(true);
      const res = await api.importQuestions(parsed);
      showToast(res.message || 'Successfully imported questions.', 'success');
      setShowImportModal(false);
      setImportJsonText('');
      loadQuestions(true);
    } catch (err) {
      console.error('Error importing questions:', err);
      showToast('Error parsing JSON content. Verify formatting guidelines.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Load PDF.js dynamically on mount
  useEffect(() => {
    if (window.pdfjsLib) return;
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    script.onload = () => {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    };
    document.body.appendChild(script);
  }, []);

  const handleJsonFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setImportJsonText(event.target.result);
    };
    reader.readAsText(file);
  };

  const handlePdfFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setPdfFile(file);
    setPdfParsing(true);
    setParsedQuestions([]);

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const arrayBuffer = event.target.result;
          const pdfjsLib = window.pdfjsLib;
          if (!pdfjsLib) {
            showToast('PDF.js library is loading. Please try again in a few seconds.', 'info');
            setPdfParsing(false);
            return;
          }
          const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
          const pdf = await loadingTask.promise;
          let fullText = '';
          
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map(item => item.str).join('\n');
            fullText += pageText + '\n';
          }

          // Parse questions
          const lines = fullText.split('\n');
          const pQuestions = [];
          let currentQ = null;

          for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            // Question pattern: "1. text" or "Q1: text" or "Question 1: text"
            const qMatch = line.match(/^(?:Q|q)?(?:uestion)?\s*(\d+)[:.)\s]\s*(.*)$/i);
            if (qMatch) {
              if (currentQ && currentQ.question && currentQ.options.length >= 2) {
                pQuestions.push(currentQ);
              }
              currentQ = {
                question: qMatch[2].trim(),
                options: [],
                correctAnswer: '',
                category: batchCategory,
                difficulty: batchDifficulty
              };
              continue;
            }

            if (currentQ) {
              // Option pattern: "A) text" or "a. text" or "A. text"
              const optMatch = line.match(/^[A-Da-d]\s*[:.)\s-]\s*(.*)$/);
              if (optMatch) {
                currentQ.options.push(optMatch[1].trim());
                continue;
              }

              // Answer pattern: "Correct: A" or "Correct Answer: B" or "Answer: C"
              const ansMatch = line.match(/^(?:Correct\s*Answer|Correct|Answer|Ans)\s*[:.-]?\s*([A-Da-d])(?:[\s.)]|$)/i);
              if (ansMatch) {
                currentQ.correctOptionLetter = ansMatch[1].toUpperCase();
                continue;
              }

              // Append text to question if not matching options
              if (currentQ.options.length === 0 && !currentQ.correctOptionLetter) {
                currentQ.question += ' ' + line;
              }
            }
          }

          if (currentQ && currentQ.question && currentQ.options.length >= 2) {
            pQuestions.push(currentQ);
          }

          // Resolve correct answer value from option letter
          pQuestions.forEach(q => {
            if (q.correctOptionLetter) {
              const idx = q.correctOptionLetter.charCodeAt(0) - 65;
              q.correctAnswer = q.options[idx] || q.options[0] || '';
              delete q.correctOptionLetter;
            } else {
              q.correctAnswer = q.options[0] || '';
            }
          });

          setParsedQuestions(pQuestions);
          if (pQuestions.length === 0) {
            showToast('No questions could be parsed. Check PDF layout details.', 'error');
          }
        } catch (err) {
          console.error(err);
          showToast('Error extracting text from PDF.', 'error');
        } finally {
          setPdfParsing(false);
        }
      };
      reader.readAsArrayBuffer(file);
    } catch (err) {
      console.error(err);
      showToast('Error reading file.', 'error');
      setPdfParsing(false);
    }
  };

  const handleUpdateBatchSettings = (cat, diff) => {
    setBatchCategory(cat);
    setBatchDifficulty(diff);
    setParsedQuestions(prev => prev.map(q => ({
      ...q,
      category: cat,
      difficulty: diff
    })));
  };

  const handleImportParsed = async () => {
    if (parsedQuestions.length === 0) return;
    setSubmitting(true);
    try {
      const res = await api.importQuestions(parsedQuestions);
      showToast(res.message || 'Successfully imported questions.', 'success');
      setShowImportModal(false);
      setParsedQuestions([]);
      setPdfFile(null);
      loadQuestions(true);
    } catch (err) {
      console.error(err);
      showToast(err.message || 'Failed to import questions.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownloadSamplePDF = () => {
    try {
      const { jsPDF } = window.jspdf || {};
      if (!jsPDF) {
        showToast('PDF engine is loading. Please try again in a few seconds.', 'info');
        return;
      }
      
      const doc = new jsPDF();
      
      // Title
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(18);
      doc.text('GenZ Learners Question Bank: HTML Fundamentals', 20, 20);
      
      // Separator line
      doc.setDrawColor(200, 200, 200);
      doc.line(20, 24, 190, 24);
      
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(11);
      
      let y = 35;
      const questionsData = [
        {
          q: "1. Which HTML tag is specifically used for creating hyperlinks?",
          opts: ["A) <link>", "B) <a>", "C) <href>", "D) <hyper>"],
          ans: "Correct Answer: B"
        },
        {
          q: "2. What does the abbreviation HTML stand for?",
          opts: ["A) HyperText Markup Language", "B) HighText Machine Language", "C) HyperText Marking Language", "D) Hyperlink and Text Management Language"],
          ans: "Correct Answer: A"
        },
        {
          q: "3. Which attribute is used in HTML to specify an inline style?",
          opts: ["A) class", "B) styles", "C) style", "D) design"],
          ans: "Correct Answer: C"
        },
        {
          q: "4. Which HTML element is used to define the title of a document?",
          opts: ["A) <meta>", "B) <header>", "C) <title>", "D) <head>"],
          ans: "Correct Answer: C"
        },
        {
          q: "5. What is the correct HTML element for inserting a line break?",
          opts: ["A) <break>", "B) <lb>", "C) <br>", "D) <newline>"],
          ans: "Correct Answer: C"
        }
      ];
      
      questionsData.forEach((item) => {
        // Question text
        doc.setFont('Helvetica', 'bold');
        doc.text(item.q, 20, y);
        y += 7;
        
        // Options
        doc.setFont('Helvetica', 'normal');
        item.opts.forEach(opt => {
          doc.text(opt, 25, y);
          y += 5.5;
        });
        
        // Correct answer
        doc.setFont('Helvetica', 'italic');
        doc.setTextColor(22, 163, 74); // green color
        doc.text(item.ans, 20, y);
        doc.setTextColor(0, 0, 0); // reset to black
        
        y += 13; // spacing for next question
      });
      
      doc.save('sample_questions.pdf');
    } catch (err) {
      console.error(err);
      showToast('Error generating sample PDF.', 'error');
    }
  };

  const headerActions = (
    <div className="flex items-center gap-2">
      <button
        onClick={() => setShowImportModal(true)}
        className="px-2.5 py-2 sm:px-3.5 sm:py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 hover:text-slate-800 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all shadow-sm"
        title="Bulk Import"
      >
        <FileUp className="w-4 h-4 text-indigo-600 flex-shrink-0" />
        <span className="hidden sm:inline">Bulk Import</span>
      </button>
      <button
        onClick={openCreateModal}
        className="px-2.5 py-2 sm:px-3.5 sm:py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all shadow-md shadow-indigo-500/10"
        title="Create Question"
      >
        <Plus className="w-4 h-4 flex-shrink-0" />
        <span className="hidden sm:inline">Create Question</span>
      </button>
    </div>
  );

  return (
    <AdminLayout 
      activePage="Manage Questions" 
      headerTitle="QUESTION BANK CONFIGURATOR" 
      headerActions={headerActions}
    >
      {/* Filtering Widgets */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-300 bg-white shadow-sm flex flex-wrap gap-4 items-center animate-slide-up">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-500 tracking-wider">
          <Filter className="w-4 h-4 text-indigo-600" />
          <span>FILTER BANK:</span>
        </div>
        
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="bg-white border border-slate-300 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:border-indigo-500 transition-all shadow-sm"
        >
          <option value="">All Categories (HTML, CSS, JS, React, etc.)</option>
          <option value="HTML">HTML Fundamentals</option>
          <option value="CSS">CSS Layouts</option>
          <option value="JavaScript">JavaScript Basics</option>
          <option value="React">React Framework</option>
          <option value="Node.js">Node.js / Express</option>
          <option value="Database">MongoDB / SQL</option>
          <option value="Bootstrap">Bootstrap Grid</option>
          <option value="Git/GitHub">Git Version Control</option>
        </select>

        <select
          value={difficultyFilter}
          onChange={(e) => setDifficultyFilter(e.target.value)}
          className="bg-white border border-slate-300 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:border-indigo-500 transition-all shadow-sm"
        >
          <option value="">All Difficulties</option>
          <option value="Easy">Easy</option>
          <option value="Medium">Medium</option>
          <option value="Hard">Hard</option>
        </select>
      </div>

      {/* Questions List */}
      {loading ? (
        <div className="flex-1 flex flex-col items-center justify-center p-12">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
        </div>
      ) : questions.length === 0 ? (
        <div className="glass-panel p-12 text-center rounded-2xl border border-slate-300 bg-white flex flex-col items-center justify-center gap-3 shadow-sm">
          <Database className="w-10 h-10 text-slate-400" />
          <p className="text-slate-500 text-sm font-semibold">No questions match your filter options.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4 animate-slide-up">
          {questions.map((q, idx) => (
            <div key={q._id} className="glass-panel p-5 rounded-2xl border border-slate-300 bg-white shadow-sm hover:border-slate-300 transition-all flex flex-col md:flex-row justify-between gap-4 items-start md:items-center">
              <div className="flex items-start gap-4 flex-1">
                <span className="w-7 h-7 rounded-lg bg-slate-50 border border-slate-300 flex items-center justify-center text-xs font-bold text-slate-500 flex-shrink-0">
                  {idx + 1}
                </span>
                <div className="flex flex-col text-left gap-1">
                  <p className="text-sm font-bold text-slate-800 leading-relaxed">{q.question}</p>
                  
                  <div className="flex flex-wrap gap-2.5 items-center mt-2 text-[10px] text-slate-500 font-semibold">
                    <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-100">{q.category}</span>
                    <span className={`px-2.5 py-0.5 rounded-full border font-bold ${
                      q.difficulty === 'Easy' 
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-600' 
                        : q.difficulty === 'Hard'
                          ? 'bg-red-50 border-red-200 text-red-600'
                          : 'bg-amber-50 border-amber-200 text-amber-600'
                    }`}>
                      {q.difficulty}
                    </span>
                    <span>•</span>
                    <span>Correct Answer: <strong className="text-emerald-600 font-bold">{q.correctAnswer}</strong></span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end md:self-auto">
                <button
                  onClick={() => openEditModal(q)}
                  className="p-2 bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 text-slate-500 hover:text-indigo-600 rounded-lg transition-all cursor-pointer shadow-sm"
                >
                  <Edit className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(q._id)}
                  className="p-2 bg-white border border-slate-200 hover:bg-red-50 hover:border-red-200 text-slate-500 hover:text-red-600 rounded-lg transition-all cursor-pointer shadow-sm"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CRUD Form Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-2xl bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 md:p-8 animate-scale-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-600" />
                {modalMode === 'create' ? 'Add New Question' : 'Edit Question Details'}
              </h3>
              <button 
                onClick={() => setShowModal(false)} 
                className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-6">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-500 tracking-wider">QUESTION CONTENT</label>
                <textarea
                  required
                  rows="3"
                  value={questionText}
                  onChange={(e) => setQuestionText(e.target.value)}
                  placeholder="Which HTML element is used for line break?"
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all resize-none shadow-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-500 tracking-wider">CATEGORY</label>
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
                  <label className="text-xs font-bold text-slate-500 tracking-wider">DIFFICULTY</label>
                  <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 focus:outline-none focus:border-indigo-500 transition-all shadow-sm"
                  >
                    <option value="Easy">Easy</option>
                    <option value="Medium">Medium</option>
                    <option value="Hard">Hard</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <label className="text-xs font-bold text-slate-500 tracking-wider">OPTIONS DEFINITIONS</label>
                <div className="grid sm:grid-cols-2 gap-3">
                  <input
                    type="text"
                    required
                    value={optA}
                    onChange={(e) => setOptA(e.target.value)}
                    placeholder="Option A"
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 transition-all shadow-sm"
                  />
                  <input
                    type="text"
                    required
                    value={optB}
                    onChange={(e) => setOptB(e.target.value)}
                    placeholder="Option B"
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 transition-all shadow-sm"
                  />
                  <input
                    type="text"
                    value={optC}
                    onChange={(e) => setOptC(e.target.value)}
                    placeholder="Option C (Optional)"
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 transition-all shadow-sm"
                  />
                  <input
                    type="text"
                    value={optD}
                    onChange={(e) => setOptD(e.target.value)}
                    placeholder="Option D (Optional)"
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 transition-all shadow-sm"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-500 tracking-wider">SELECT CORRECT OPTION</label>
                <div className="grid grid-cols-4 gap-2">
                  {['A', 'B', 'C', 'D'].map(letter => {
                    const active = correctOption === letter;
                    return (
                      <button
                        key={letter}
                        type="button"
                        onClick={() => setCorrectOption(letter)}
                        className={`py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer shadow-sm ${
                          active
                            ? 'bg-indigo-600 border-indigo-600 text-white font-bold'
                            : 'bg-white border-slate-200 text-slate-500 hover:text-slate-700'
                        }`}
                      >
                        Option {letter}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center gap-4 mt-6 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-500 font-bold rounded-xl text-xs transition-all cursor-pointer shadow-sm"
                >
                  Cancel Setup
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs transition-all cursor-pointer flex items-center justify-center gap-1 shadow-md shadow-indigo-500/10"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  <span>{modalMode === 'create' ? 'Insert Question' : 'Save Changes'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-2xl bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 md:p-8 animate-scale-in max-h-[90vh] overflow-y-auto">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <FileUp className="w-5 h-5 text-indigo-600" />
                <span>Bulk Import Questions</span>
              </h3>
              <button 
                onClick={() => {
                  setShowImportModal(false);
                  setParsedQuestions([]);
                  setPdfFile(null);
                }} 
                className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tab Bar */}
            <div className="flex border-b border-slate-100 mt-5">
              <button
                type="button"
                onClick={() => setImportTab('json')}
                className={`py-2.5 px-4 font-bold text-xs border-b-2 transition-all cursor-pointer ${
                  importTab === 'json'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                JSON Format
              </button>
              <button
                type="button"
                onClick={() => setImportTab('pdf')}
                className={`py-2.5 px-4 font-bold text-xs border-b-2 transition-all cursor-pointer ${
                  importTab === 'pdf'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                PDF Importer (Dynamic Parser)
              </button>
            </div>

            {/* Tab 1: JSON Import */}
            {importTab === 'json' && (
              <div className="flex flex-col gap-4 mt-5">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-slate-500 tracking-wider">PASTE JSON ARRAY OR UPLOAD FILE</label>
                  <label className="bg-indigo-50 border border-indigo-100 hover:bg-indigo-100 text-indigo-600 font-bold px-3 py-1.5 rounded-lg text-[10px] cursor-pointer transition-all shadow-sm flex items-center gap-1">
                    <FileUp className="w-3.5 h-3.5" />
                    <span>Upload JSON File</span>
                    <input 
                      type="file" 
                      accept=".json" 
                      onChange={handleJsonFileChange} 
                      className="hidden" 
                    />
                  </label>
                </div>
                
                <textarea
                  rows="8"
                  value={importJsonText}
                  onChange={(e) => setImportJsonText(e.target.value)}
                  placeholder='[\n  {\n    "question": "Which HTML tag is used for defining paragraphs?",\n    "options": ["<p>", "<paragraph>", "<paragraph-tag>"],\n    "correctAnswer": "<p>",\n    "category": "HTML",\n    "difficulty": "Easy"\n  }\n]'
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-xs font-mono text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all resize-none shadow-sm"
                />

                <div className="flex items-center gap-4 mt-4 pt-4 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => {
                      setShowImportModal(false);
                      setImportJsonText('');
                    }}
                    className="flex-1 py-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-500 font-bold rounded-xl text-xs transition-all cursor-pointer shadow-sm"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleBulkImport}
                    disabled={submitting || !importJsonText.trim()}
                    className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs transition-all cursor-pointer flex items-center justify-center gap-1 shadow-md shadow-indigo-500/10 disabled:opacity-50"
                  >
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    <span>Import JSON Questions</span>
                  </button>
                </div>
              </div>
            )}

            {/* Tab 2: PDF Import */}
            {importTab === 'pdf' && (
              <div className="flex flex-col gap-4 mt-5">
                
                {/* PDF Selector zone */}
                <div className="flex flex-col gap-3">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-slate-500 tracking-wider">SELECT QUESTION BANK PDF</label>
                    <button
                      type="button"
                      onClick={handleDownloadSamplePDF}
                      className="text-indigo-600 hover:text-indigo-800 font-bold text-[10px] cursor-pointer transition-colors flex items-center gap-1 bg-indigo-50 px-2.5 py-1.5 rounded-lg border border-indigo-100/50 shadow-sm"
                      title="Download a formatted sample PDF for parsing test"
                    >
                      <span>Download Sample PDF</span>
                    </button>
                  </div>
                  
                  <div className="border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center hover:border-indigo-300 transition-all bg-slate-50/50 flex flex-col items-center justify-center gap-2.5 relative">
                    <FileUp className="w-8 h-8 text-indigo-500 stroke-1" />
                    
                    {pdfFile ? (
                      <div className="flex flex-col items-center gap-0.5">
                        <span className="text-xs font-bold text-slate-700">{pdfFile.name}</span>
                        <span className="text-[10px] text-slate-400 font-semibold">Size: {(pdfFile.size / 1024).toFixed(1)} KB</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-0.5">
                        <span className="text-xs font-bold text-slate-600">Drag and drop your PDF here, or click to browse</span>
                        <span className="text-[10px] text-slate-400 font-semibold">Standard layout: Question lists followed by choices and correct answer markers</span>
                      </div>
                    )}
                    
                    <input 
                      type="file" 
                      accept=".pdf" 
                      onChange={handlePdfFileChange}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                  </div>
                </div>

                {/* Parsing loader */}
                {pdfParsing && (
                  <div className="flex items-center justify-center gap-3 p-6 border border-indigo-100 bg-indigo-50/30 rounded-xl animate-pulse">
                    <Loader2 className="w-5 h-5 text-indigo-600 animate-spin" />
                    <span className="text-xs font-bold text-indigo-700">Extracting and parsing assessment items from document...</span>
                  </div>
                )}

                {/* Parsed results preview list */}
                {parsedQuestions.length > 0 && (
                  <div className="flex flex-col gap-3.5 mt-2">
                    
                    {/* Batch settings */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-50 border border-slate-200 p-4 rounded-2xl">
                      <div className="text-left">
                        <span className="text-xs font-black text-slate-800">Batch Question Settings</span>
                        <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Apply category and difficulty directly to all {parsedQuestions.length} parsed items</p>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-3">
                        <select
                          value={batchCategory}
                          onChange={(e) => handleUpdateBatchSettings(e.target.value, batchDifficulty)}
                          className="bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 text-[11px] font-bold text-slate-700 focus:outline-none focus:border-indigo-500 shadow-sm"
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
                        <select
                          value={batchDifficulty}
                          onChange={(e) => handleUpdateBatchSettings(batchCategory, e.target.value)}
                          className="bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 text-[11px] font-bold text-slate-700 focus:outline-none focus:border-indigo-500 shadow-sm"
                        >
                          <option value="Easy">Easy</option>
                          <option value="Medium">Medium</option>
                          <option value="Hard">Hard</option>
                        </select>
                      </div>
                    </div>

                    {/* Preview list wrapper */}
                    <div className="flex flex-col gap-2 max-h-60 overflow-y-auto scrollbar-thin border border-slate-200 rounded-2xl divide-y divide-slate-100 p-2.5 bg-slate-50/20">
                      {parsedQuestions.map((q, idx) => (
                        <div key={idx} className="py-2.5 px-1.5 flex items-start justify-between gap-3 text-left">
                          <div className="min-w-0 flex-1 flex items-start gap-2.5">
                            <span className="w-5 h-5 rounded-md bg-white border border-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-400 flex-shrink-0 mt-0.5">{idx + 1}</span>
                            <div className="min-w-0 flex-1">
                              {/* Editable Question content input */}
                              <input 
                                type="text"
                                value={q.question}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setParsedQuestions(prev => prev.map((item, i) => i === idx ? { ...item, question: val } : item));
                                }}
                                className="w-full bg-transparent hover:bg-white focus:bg-white hover:border border-transparent hover:border-slate-200 px-1 rounded font-bold text-slate-700 text-xs truncate focus:outline-none focus:ring-1 focus:ring-indigo-500/25 py-0.5"
                              />
                              
                              <div className="flex flex-wrap gap-2 items-center mt-1.5 text-[9px] text-slate-400 font-bold">
                                <span className="text-slate-600">Correct: <strong className="text-emerald-600 font-black">{q.correctAnswer}</strong></span>
                                <span>•</span>
                                <span>Choices: {q.options.join(' | ')}</span>
                              </div>
                            </div>
                          </div>

                          {/* Action row delete */}
                          <button
                            type="button"
                            onClick={() => setParsedQuestions(prev => prev.filter((_, i) => i !== idx))}
                            className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>

                    {/* Footer buttons */}
                    <div className="flex items-center gap-4 mt-4 pt-4 border-t border-slate-200">
                      <button
                        type="button"
                        onClick={() => {
                          setPdfFile(null);
                          setParsedQuestions([]);
                        }}
                        className="flex-1 py-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-500 font-bold rounded-xl text-xs transition-all cursor-pointer shadow-sm"
                      >
                        Reset Importer
                      </button>
                      <button
                        type="button"
                        onClick={handleImportParsed}
                        disabled={submitting}
                        className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs transition-all cursor-pointer flex items-center justify-center gap-1 shadow-md shadow-indigo-500/10"
                      >
                        {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                        <span>Import {parsedQuestions.length} PDF Items</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
            
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
              <h3 className="text-base font-black text-slate-800 tracking-tight">Delete Question</h3>
              <p className="text-xs text-slate-500 font-semibold leading-relaxed px-2">
                Are you sure you want to delete this question? This action is permanent and cannot be undone.
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
