import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { 
  Award, Clock, CheckCircle, XCircle, AlertCircle, 
  HelpCircle, ArrowLeft, Printer, Share2, Loader2, Sparkles
} from 'lucide-react';
import StudentLayout from './StudentLayout';
import AdminLayout from './AdminLayout';

export default function ResultPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedQuestion, setExpandedQuestion] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const [toast, setToast] = useState(null);
  const [logoBase64, setLogoBase64] = useState('');
  const [sigBase64, setSigBase64] = useState('');

  useEffect(() => {
    const convertToBase64 = async (url, setter) => {
      try {
        const response = await fetch(url);
        const blob = await response.blob();
        const reader = new FileReader();
        reader.onloadend = () => {
          setter(reader.result);
        };
        reader.readAsDataURL(blob);
      } catch (err) {
        console.error(`Failed to convert ${url} to Base64:`, err);
      }
    };

    convertToBase64('/genz_logo_full.png', setLogoBase64);
    convertToBase64('/founder_signature.png', setSigBase64);
  }, []);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    const fetchResult = async () => {
      const cacheKey = `cache_scorecard_${id}`;
      const cachedData = localStorage.getItem(cacheKey);

      if (cachedData) {
        setResult(JSON.parse(cachedData));
        setLoading(false);
      } else {
        setLoading(true);
      }

      try {
        const data = await api.getDetailedScorecard(id);
        setResult(data);
        localStorage.setItem(cacheKey, JSON.stringify(data));
      } catch (err) {
        console.error('Error fetching result scorecard:', err);
        if (!cachedData) {
          setError('Failed to fetch evaluation scorecard.');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchResult();
  }, [id]);

  const handlePrint = () => {
    window.print();
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    showToast('Result URL copied to clipboard!', 'success');
  };

  const handleDownloadPDF = () => {
    const svgElement = document.querySelector('.certificate-print-area svg');
    if (!svgElement) {
      showToast('Certificate SVG element not found on page.', 'error');
      return;
    }

    setDownloading(true);

    try {
      // 1. Serialize SVG to a standalone XML string
      const svgString = new XMLSerializer().serializeToString(svgElement);
      
      // 2. Convert to Blob URL
      const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);
      
      // 3. Draw on high-resolution canvas
      const img = new Image();
      img.onload = () => {
        try {
          const width = 842;
          const height = 595;
          const scale = 2.5; // High resolution retina scale
          
          const canvas = document.createElement('canvas');
          canvas.width = width * scale;
          canvas.height = height * scale;
          
          const ctx = canvas.getContext('2d');
          // Fill white background
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          
          // Draw SVG image to canvas
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          
          // Get high-res PNG data
          const imgData = canvas.toDataURL('image/png');
          
          // Instantiate jsPDF
          const { jsPDF } = window.jspdf || {};
          if (!jsPDF) {
            showToast('PDF generation engine is not fully loaded. Please try again.', 'error');
            setDownloading(false);
            URL.revokeObjectURL(url);
            return;
          }
          
          const doc = new jsPDF({
            orientation: 'landscape',
            unit: 'px',
            format: [width, height]
          });
          
          doc.addImage(imgData, 'PNG', 0, 0, width, height);
          doc.save(`Certificate-${result.examTitle.replace(/\s+/g, '_')}-${result.studentName.replace(/\s+/g, '_')}.pdf`);
          
          setDownloading(false);
          URL.revokeObjectURL(url);
        } catch (err) {
          console.error('Error rendering certificate PDF canvas:', err);
          showToast('Failed to generate PDF. Falling back to print.', 'error');
          setDownloading(false);
          URL.revokeObjectURL(url);
        }
      };
      
      img.onerror = (err) => {
        console.error('Image load error:', err);
        showToast('Failed to process certificate image.', 'error');
        setDownloading(false);
        URL.revokeObjectURL(url);
      };
      
      img.src = url;
    } catch (err) {
      console.error('Error generating PDF:', err);
      showToast('Failed to generate PDF.', 'error');
      setDownloading(false);
    }
  };

  const formatTimeSpent = (secs) => {
    const mins = Math.floor(secs / 60);
    const rs = secs % 60;
    return `${mins}m ${rs}s`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
        <p className="text-slate-500 text-sm font-semibold">Evaluating your answers...</p>
      </div>
    );
  }

  // Header Actions to pass to Layout
  const headerActions = (
    <div className="flex items-center gap-1.5 sm:gap-2.5 print:hidden">
      <button
        onClick={handleShare}
        className="p-2 sm:px-3 sm:py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-500 hover:text-indigo-600 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 text-xs font-bold shadow-sm"
        title="Copy Link"
      >
        <Share2 className="w-4 h-4 flex-shrink-0" />
        <span className="hidden sm:inline">Copy Link</span>
      </button>

      {result && result.passed && (
        <>
          <button
            onClick={handlePrint}
            className="p-2 sm:px-3 sm:py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-500 hover:text-indigo-600 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 text-xs font-bold shadow-sm"
            title="Print Certificate"
          >
            <Printer className="w-4 h-4 flex-shrink-0" />
            <span className="hidden sm:inline">Print</span>
          </button>

          <button
            onClick={handleDownloadPDF}
            disabled={downloading}
            className={`p-2 sm:px-3 sm:py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-all cursor-pointer flex items-center gap-1.5 text-xs font-bold shadow-md ${downloading ? 'opacity-50 cursor-not-allowed' : ''}`}
            title="Download Certificate as PDF"
          >
            {downloading ? (
              <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />
            ) : (
              <Award className="w-4 h-4 flex-shrink-0" />
            )}
            <span className="hidden sm:inline">{downloading ? 'Generating...' : 'Download PDF'}</span>
          </button>
        </>
      )}
    </div>
  );

  if (error || !result) {
    const errorContent = (
      <div className="max-w-md mx-auto mt-12">
        <div className="glass-panel p-8 rounded-3xl text-center border border-red-200 bg-white shadow-lg animate-scale-in">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-slate-800">Scorecard Error</h2>
          <p className="text-sm text-slate-500 mt-2 font-medium">{error || 'Scorecard details could not be found.'}</p>
          <button
            onClick={() => navigate('/')}
            className="mt-6 bg-slate-100 hover:bg-slate-200 border border-slate-300 px-6 py-2.5 rounded-xl text-xs font-bold text-slate-600 transition-all cursor-pointer shadow-sm"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );

    if (user?.role === 'admin') {
      return (
        <AdminLayout activePage="Submissions" headerTitle="Scorecard Error" headerActions={headerActions}>
          {errorContent}
        </AdminLayout>
      );
    }
    return (
      <StudentLayout activePage="Certificates" headerTitle="Scorecard Error" headerActions={headerActions}>
        {errorContent}
      </StudentLayout>
    );
  }

  const mainContent = (
    <div className="flex flex-col gap-8 pb-12">
      {/* Scorecard Overview */}
      <div className="glass-panel p-6 md:p-8 rounded-3xl border border-white/60 bg-white shadow-xl relative overflow-hidden print:hidden animate-fade-in">
        {/* Background soft status glows */}
        <div className={`absolute top-0 right-0 w-48 h-48 rounded-full blur-3xl pointer-events-none -translate-y-1/2 translate-x-1/2 opacity-20 ${
          result.passed ? 'bg-emerald-500' : 'bg-red-500'
        }`}></div>

        <div className="grid md:grid-cols-12 gap-8 items-center">
          {/* Left: Score Badge */}
          <div className="md:col-span-4 flex flex-col items-center justify-center text-center p-6 bg-slate-50 border border-slate-200 rounded-2xl relative shadow-inner">
            <span className="text-[10px] font-bold text-slate-400 tracking-wider">PERCENTAGE GRADE</span>
            <span className={`text-6xl font-black mt-2 bg-gradient-to-r bg-clip-text text-transparent ${
              result.passed ? 'from-emerald-600 to-teal-500' : 'from-red-600 to-rose-500'
            }`}>
              {result.percentage}%
            </span>
            
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black tracking-wider mt-4 ${
              result.passed 
                ? 'bg-emerald-50 border border-emerald-200 text-emerald-600' 
                : 'bg-red-50 border border-red-200 text-red-600'
            }`}>
              {result.passed ? 'PASSED TEST' : 'FAILED TEST'}
            </span>
          </div>

          {/* Right: Metrics Details */}
          <div className="md:col-span-8 flex flex-col gap-5 text-left">
            <div>
              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-100">
                {result.examCategory}
              </span>
              <h2 className="text-2xl font-black text-slate-900 mt-3">{result.examTitle}</h2>
              <p className="text-xs text-slate-400 mt-1 font-semibold">Submitted at {new Date(result.createdAt).toLocaleString()}</p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-slate-200 text-slate-600">
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-slate-400 tracking-wider">TOTAL SCORE</span>
                <span className="text-sm font-bold text-slate-800 mt-1">{result.score} / {result.totalQuestions}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-slate-400 tracking-wider">TIME SPENT</span>
                <span className="text-sm font-bold text-slate-800 mt-1">{formatTimeSpent(result.timeSpent)}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-slate-400 tracking-wider">INFRACTIONS</span>
                <span className={`text-sm font-bold mt-1 ${result.cheatingFlags > 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                  {result.cheatingFlags} flags
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-slate-400 tracking-wider">VERIFICATION ID</span>
                <span className="text-xs font-bold text-indigo-600 mt-1 font-mono truncate">{result._id}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Certificate Display */}
      {result.passed && (
        <div className="flex flex-col gap-4 animate-slide-up">
          <h2 className="text-base font-bold text-slate-900 tracking-wide print:hidden flex items-center gap-2">
            <Award className="w-5 h-5 text-indigo-600" /> Certificate Earned
          </h2>
          
          <div className="certificate-print-area rounded-3xl overflow-hidden border border-slate-200 bg-white p-2 md:p-6 flex items-center justify-center shadow-lg">
            {/* Premium Certificate SVG */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 842 595"
              className="w-full h-auto max-w-[800px] rounded-2xl shadow-inner"
            >
              <defs>
                {/* Gold gradient */}
                <linearGradient id="goldGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#92400e" />
                  <stop offset="40%" stopColor="#d97706" />
                  <stop offset="60%" stopColor="#fbbf24" />
                  <stop offset="100%" stopColor="#92400e" />
                </linearGradient>
                {/* Navy gradient for header */}
                <linearGradient id="navyGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#312e81" />
                  <stop offset="100%" stopColor="#1e1b5e" />
                </linearGradient>
                {/* Name gradient */}
                <linearGradient id="nameGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#1e1b5e" />
                  <stop offset="50%" stopColor="#4f46e5" />
                  <stop offset="100%" stopColor="#1e1b5e" />
                </linearGradient>
                {/* Seal gradient */}
                <radialGradient id="sealGrad" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#fde68a" />
                  <stop offset="100%" stopColor="#d97706" />
                </radialGradient>
              </defs>

              {/* White canvas */}
              <rect x="0" y="0" width="842" height="595" fill="#ffffff" />

              {/* ── Navy Header Banner ── */}
              <rect x="0" y="0" width="842" height="130" fill="url(#navyGrad)" />

              {/* Header gold accent line */}
              <rect x="0" y="126" width="842" height="4" fill="url(#goldGrad)" />

              {/* Logo image */}
              <image href={logoBase64 || "/genz_logo_full.png"} x="45" y="25" width="80" height="80" preserveAspectRatio="xMidYMid meet" />

              {/* Brand name */}
              <text x="145" y="55" fill="#ffffff" fontSize="22" fontWeight="900" letterSpacing="3" fontFamily="system-ui, -apple-system, sans-serif">GenZ Learners</text>
              <text x="147" y="75" fill="#fbbf24" fontSize="8.5" fontWeight="900" letterSpacing="4" fontFamily="system-ui, -apple-system, sans-serif">LEARN BEYOND LIMITS</text>
              <line x1="147" y1="84" x2="450" y2="84" stroke="#4f46e5" strokeWidth="1" strokeOpacity="0.4" />
              <text x="147" y="97" fill="#c7d2fe" fontSize="7.5" fontWeight="600" letterSpacing="1.2" fontFamily="system-ui, -apple-system, sans-serif">AUTHORIZED DIGITAL CERTIFICATION BODY  ·  WEB ENGINEERING  ·  FRONTEND DEVELOPMENT</text>

              {/* Certificate ribbon label top-right */}
              <rect x="660" y="28" width="158" height="74" rx="8" fill="#ffffff" fillOpacity="0.06" />
              <text x="739" y="52" textAnchor="middle" fill="#fbbf24" fontSize="8" fontWeight="900" letterSpacing="3" fontFamily="system-ui, -apple-system, sans-serif">✦ CERTIFIED ✦</text>
              <text x="739" y="70" textAnchor="middle" fill="#ffffff" fontSize="10" fontWeight="900" letterSpacing="1" fontFamily="system-ui, -apple-system, sans-serif">{result.percentage}%</text>
              <text x="739" y="87" textAnchor="middle" fill="#86efac" fontSize="8" fontWeight="700" letterSpacing="2" fontFamily="system-ui, -apple-system, sans-serif">DISTINCTION</text>

              {/* ── Main Content Area ── */}

              {/* Subtle diagonal decorative lines */}
              <line x1="0" y1="595" x2="200" y2="134" stroke="#e0e7ff" strokeWidth="1" strokeOpacity="0.6" />
              <line x1="842" y1="595" x2="642" y2="134" stroke="#e0e7ff" strokeWidth="1" strokeOpacity="0.6" />

              {/* Watermark circle */}
              <circle cx="421" cy="370" r="160" fill="none" stroke="#e0e7ff" strokeWidth="1" strokeOpacity="0.4" />
              <circle cx="421" cy="370" r="120" fill="none" stroke="#e0e7ff" strokeWidth="1" strokeOpacity="0.3" />
              <text
                x="421"
                y="350"
                textAnchor="middle"
                fill="#4f46e5"
                fillOpacity="0.04"
                fontSize="38"
                fontWeight="900"
                letterSpacing="12"
                fontFamily="system-ui, -apple-system, sans-serif"
                transform="rotate(-15, 421, 350)"
              >
                GENZ LEARNERS
              </text>

              {/* CERTIFICATE OF COMPLETION title */}
              <text x="421" y="190" textAnchor="middle" fill="#0f172a" fontSize="26" fontWeight="900" letterSpacing="4" fontFamily="system-ui, -apple-system, sans-serif">CERTIFICATE OF COMPLETION</text>

              {/* Gold underline */}
              <rect x="221" y="198" width="400" height="2" rx="1" fill="url(#goldGrad)" />

              {/* Subtitle */}
              <text x="421" y="228" textAnchor="middle" fill="#64748b" fontSize="10.5" fontWeight="600" letterSpacing="2" fontFamily="system-ui, -apple-system, sans-serif">THIS CERTIFICATE IS PROUDLY AWARDED TO</text>

              {/* Student Name */}
              <text x="421" y="295" textAnchor="middle" fill="url(#nameGrad)" fontSize="42" fontWeight="900" letterSpacing="1" fontFamily="Georgia, 'Times New Roman', serif" fontStyle="italic">{result.studentName}</text>

              {/* Thin name underline */}
              <line x1="181" y1="308" x2="661" y2="308" stroke="url(#goldGrad)" strokeWidth="1.5" strokeOpacity="0.5" />

              {/* Description */}
              <text x="421" y="345" textAnchor="middle" fill="#475569" fontSize="11" fontWeight="500" fontFamily="system-ui, -apple-system, sans-serif">For successfully completing the automated assessment in</text>
              <text x="421" y="373" textAnchor="middle" fill="#1e1b5e" fontSize="17" fontWeight="900" letterSpacing="0.5" fontFamily="system-ui, -apple-system, sans-serif">{result.examTitle}</text>
              <text x="421" y="400" textAnchor="middle" fill="#475569" fontSize="10.5" fontWeight="600" fontFamily="system-ui, -apple-system, sans-serif">
                Score: <tspan fill="#059669" fontWeight="900">{result.score}/{result.totalQuestions} ({result.percentage}%)</tspan>  ·  Domain: <tspan fill="#4f46e5" fontWeight="900">{result.examCategory}</tspan>
              </text>

              {/* ── Bottom Section ── */}

              {/* Gold seal left */}
              <circle cx="100" cy="510" r="42" fill="url(#sealGrad)" fillOpacity="0.15" />
              <circle cx="100" cy="510" r="38" fill="none" stroke="url(#goldGrad)" strokeWidth="2" />
              <circle cx="100" cy="510" r="30" fill="none" stroke="url(#goldGrad)" strokeWidth="1" strokeOpacity="0.5" />
              <text x="100" y="504" textAnchor="middle" fill="#92400e" fontSize="7" fontWeight="900" letterSpacing="2" fontFamily="system-ui">GENZ</text>
              <text x="100" y="516" textAnchor="middle" fill="#d97706" fontSize="8" fontWeight="900" fontFamily="system-ui">✦</text>
              <text x="100" y="528" textAnchor="middle" fill="#92400e" fontSize="7" fontWeight="900" letterSpacing="2" fontFamily="system-ui">VERIFIED</text>

              {/* Signature area — centered */}
              <image href={sigBase64 || "/founder_signature.png"} x="376" y="415" width="90" height="50" preserveAspectRatio="xMidYMid meet" />
              <line x1="331" y1="472" x2="511" y2="472" stroke="#cbd5e1" strokeWidth="1.5" />
              <text x="421" y="488" textAnchor="middle" fill="#1e1b5e" fontSize="10.5" fontWeight="900" fontFamily="system-ui, -apple-system, sans-serif">A. Ramasubramaniyan</text>
              <text x="421" y="501" textAnchor="middle" fill="#4f46e5" fontSize="8" fontWeight="700" letterSpacing="0.5" fontFamily="system-ui, -apple-system, sans-serif">Founder &amp; CEO, GenZ Learners</text>

              {/* Date area */}
              <text x="421" y="537" textAnchor="middle" fill="#94a3b8" fontSize="8" fontWeight="700" letterSpacing="1" fontFamily="system-ui">DATE OF AWARD</text>
              <text x="421" y="551" textAnchor="middle" fill="#475569" fontSize="9.5" fontWeight="700" fontFamily="system-ui">{new Date(result.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</text>

              {/* Verification hash */}
              <text x="50" y="582" fill="#cbd5e1" fontSize="7" fontFamily="monospace">HASH: {result.certificateHash}</text>
              <text x="792" y="582" textAnchor="end" fill="#cbd5e1" fontSize="7" fontFamily="monospace">ID: {result._id}</text>

              {/* Bottom gold bar */}
              <rect x="0" y="588" width="842" height="7" fill="url(#navyGrad)" />
            </svg>

            <div className="absolute top-8 left-8 text-yellow-500/20 print:hidden animate-glow"><Sparkles className="w-8 h-8" /></div>
            <div className="absolute bottom-8 right-8 text-yellow-500/20 print:hidden animate-glow delay-200"><Sparkles className="w-8 h-8" /></div>
          </div>
        </div>
      )}

      {/* Detailed Question Review */}
      <div className="flex flex-col gap-4 print:hidden animate-slide-up delay-100">
        <h2 className="text-base font-bold text-slate-900 tracking-wide">Detailed Answer Review</h2>
        <div className="flex flex-col gap-3">
          {result.answers.map((ans, idx) => {
            const isOpen = expandedQuestion === idx;
            
            return (
              <div 
                key={ans.questionId} 
                className="glass-panel rounded-2xl border border-slate-200 bg-white overflow-hidden transition-all duration-300"
              >
                <button
                  onClick={() => setExpandedQuestion(isOpen ? null : idx)}
                  className="w-full text-left p-5 flex items-center justify-between gap-4 cursor-pointer hover:bg-slate-50/50"
                >
                  <div className="flex items-start gap-4">
                    <span className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs flex-shrink-0 ${
                      ans.isUnanswered 
                        ? 'bg-slate-100 text-slate-400 border border-slate-200' 
                        : ans.isCorrect
                          ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                          : 'bg-red-50 text-red-600 border border-red-200'
                    }`}>
                      {idx + 1}
                    </span>
                    <div>
                      <p className="text-sm font-bold text-slate-800 line-clamp-1">{ans.question}</p>
                      <div className="flex gap-2.5 items-center mt-1 text-[10px] text-slate-400 font-semibold">
                        <span>Category: <strong className="text-slate-700">{ans.category}</strong></span>
                        <span>•</span>
                        <span className={ans.isCorrect ? 'text-emerald-600' : ans.isUnanswered ? 'text-slate-500' : 'text-red-500'}>
                          {ans.isUnanswered ? 'Unanswered' : ans.isCorrect ? 'Correct' : 'Incorrect'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="text-xs font-bold text-indigo-600 hover:text-indigo-500">
                    {isOpen ? 'Close' : 'Review Details'}
                  </div>
                </button>

                {/* Expanded Body */}
                {isOpen && (
                  <div className="px-5 pb-5 pt-1 border-t border-slate-200 flex flex-col gap-4 bg-slate-50/30 animate-fade-in">
                    <p className="text-slate-800 text-sm font-bold leading-relaxed">{ans.question}</p>
                    
                    <div className="flex flex-col gap-2">
                      {ans.options.map((opt) => {
                        const isUserSelected = ans.selectedAnswer === opt;
                        const isCorrectOpt = ans.correctAnswer === opt;
                        
                        let bgStyle = 'bg-white border-slate-200 text-slate-600';
                        if (isCorrectOpt) {
                          bgStyle = 'bg-emerald-50 border-emerald-200 text-emerald-700 font-bold';
                        } else if (isUserSelected && !isCorrectOpt) {
                          bgStyle = 'bg-red-50 border-red-200 text-red-700 font-bold';
                        }

                        return (
                          <div 
                            key={opt}
                            className={`p-3 rounded-xl border text-xs flex items-center justify-between ${bgStyle}`}
                          >
                            <span>{opt}</span>
                            <div className="flex items-center gap-1.5 text-[9px] font-bold">
                              {isCorrectOpt && (
                                <span className="text-emerald-600 flex items-center gap-1 bg-emerald-50/50 border border-emerald-200 px-2 py-0.5 rounded-md">
                                  <CheckCircle className="w-3 h-3" /> Correct Choice
                                </span>
                              )}
                              {isUserSelected && !isCorrectOpt && (
                                <span className="text-red-600 flex items-center gap-1 bg-red-50/50 border border-red-200 px-2 py-0.5 rounded-md">
                                  <XCircle className="w-3 h-3" /> Your Selection
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Explanation */}
                    <div className="bg-white border border-slate-200 p-4 rounded-xl flex gap-3 text-xs text-slate-400 leading-relaxed font-medium">
                      <HelpCircle className="w-5 h-5 text-indigo-600 flex-shrink-0" />
                      <div>
                        <strong className="text-slate-800 font-bold block mb-1">Learning Assessment Explanation</strong>
                        {ans.explanation || 'The answer is calculated based on standardized specifications and assessment criteria.'}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  const toastNotification = toast && (
    <div className="fixed bottom-6 right-6 z-50 animate-scale-in print:hidden">
      <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl border shadow-xl backdrop-blur-md transition-all ${
        toast.type === 'success' 
          ? 'bg-white border-emerald-200 text-slate-800 shadow-emerald-500/5'
          : toast.type === 'error'
            ? 'bg-white border-rose-200 text-slate-800 shadow-rose-500/5'
            : 'bg-white border-indigo-200 text-slate-800 shadow-indigo-500/5'
      }`}>
        <div className={`w-7 h-7 rounded-xl flex items-center justify-center ${
          toast.type === 'success' 
            ? 'bg-emerald-50 text-emerald-600'
            : toast.type === 'error'
              ? 'bg-rose-50 text-rose-600'
              : 'bg-indigo-50 text-indigo-600'
        }`}>
          {toast.type === 'success' && <CheckCircle className="w-4 h-4" />}
          {toast.type === 'error' && <XCircle className="w-4 h-4" />}
          {toast.type === 'info' && <AlertCircle className="w-4 h-4" />}
        </div>
        <span className="text-xs font-black tracking-tight">{toast.message}</span>
        <button 
          onClick={() => setToast(null)}
          className="text-slate-400 hover:text-slate-600 font-bold text-xs ml-2 cursor-pointer focus:outline-none"
        >
          ✕
        </button>
      </div>
    </div>
  );

  // Return wrapped in the layout depending on role
  if (user?.role === 'admin') {
    return (
      <AdminLayout activePage="Submissions" headerTitle="Exam Performance Evaluation" headerActions={headerActions}>
        <div className="max-w-4xl mx-auto px-4 mt-2">
          {mainContent}
        </div>
        {toastNotification}
      </AdminLayout>
    );
  }

  return (
    <StudentLayout activePage="Certificates" headerTitle="Exam Performance Evaluation" headerActions={headerActions}>
      <div className="max-w-4xl mx-auto px-4 mt-2">
        {mainContent}
      </div>
      {toastNotification}
    </StudentLayout>
  );
}
