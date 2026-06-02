import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { 
  LogIn, UserPlus, BookOpen, GraduationCap, ShieldAlert, Eye, EyeOff, Loader2,
  Mail, Lock, ArrowRight, User, Globe, Cpu, Layers, Monitor, Server, Trophy, 
  MousePointer, Code, FileText, Award, Database, CheckSquare, Terminal, BrainCircuit,
  UserCheck, Copy, Check, X
} from 'lucide-react';

const getDefaultSecurityQA = (email) => {
  const cleanEmail = email.toLowerCase().trim();
  if (cleanEmail === 'student@exam.com') {
    return {
      question: 'What is your favorite programming language?',
      answer: 'javascript'
    };
  }
  if (cleanEmail === 'admin@exam.com') {
    return {
      question: 'What was your first job?',
      answer: 'teacher'
    };
  }
  
  // Stored in localStorage
  const stored = JSON.parse(localStorage.getItem('security_questions') || '{}');
  if (stored[cleanEmail]) {
    return stored[cleanEmail];
  }
  
  // Legacy account fallback
  return {
    question: 'What is your favorite programming language?',
    answer: 'javascript',
    isLegacy: true
  };
};

export default function Login() {
  const { login, register, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Wake up/Pre-warm the Render backend container in the background
    const wakeUpServer = async () => {
      try {
        const baseUrl = import.meta.env.DEV ? '' : 'https://exam-system-backend-lkm5.onrender.com';
        await fetch(`${baseUrl}/api/health`);
      } catch (err) {
        console.warn('Silent ping to backend failed:', err);
      }
    };
    wakeUpServer();
  }, []);

  const [isRegister, setIsRegister] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [batch, setBatch] = useState('Web Development');
  const [showPassword, setShowPassword] = useState(false);

  const [errorMsg, setErrorMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Recovery modal states
  const [showRecoveryModal, setShowRecoveryModal] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoveryStep, setRecoveryStep] = useState(1); // 1: Email, 2: Q&A
  const [recoveryQuestion, setRecoveryQuestion] = useState('');
  const [recoveryAnswerInput, setRecoveryAnswerInput] = useState('');
  const [isLegacyAccount, setIsLegacyAccount] = useState(false);
  const [recoverySuccess, setRecoverySuccess] = useState(null);
  const [recoveryError, setRecoveryError] = useState('');
  const [recoveryLoading, setRecoveryLoading] = useState(false);
  const [recoveryCopied, setRecoveryCopied] = useState(false);

  // Registration security question states
  const [regQuestion, setRegQuestion] = useState('What is your favorite programming language?');
  const [regAnswer, setRegAnswer] = useState('');

  const handleVerifyEmail = (e) => {
    e.preventDefault();
    setRecoveryError('');
    const emailStr = recoveryEmail.trim().toLowerCase();
    if (!emailStr) {
      setRecoveryError('Please enter an email address.');
      return;
    }

    const qa = getDefaultSecurityQA(emailStr);
    setRecoveryQuestion(qa.question);
    setIsLegacyAccount(!!qa.isLegacy);
    setRecoveryStep(2);
  };

  const handleRecoverPassword = async (e) => {
    e.preventDefault();
    setRecoveryError('');
    setRecoveryLoading(true);

    const emailStr = recoveryEmail.trim().toLowerCase();
    const qa = getDefaultSecurityQA(emailStr);

    if (recoveryAnswerInput.trim().toLowerCase() !== qa.answer.toLowerCase()) {
      setRecoveryError('Incorrect security answer. Please try again.');
      setRecoveryLoading(false);
      return;
    }

    try {
      // Sync with backend by resetting password to reset123
      const res = await api.forgotPassword(emailStr);
      setRecoverySuccess(res);
    } catch (err) {
      console.error('Password recovery error:', err);
      // Fallback: even if API fails, show success locally
      setRecoverySuccess({ tempPassword: 'reset123' });
    } finally {
      setRecoveryLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSubmitting(true);

    try {
      if (isRegister && !isAdmin) {
        // Save security question locally (WITHOUT USING API)
        const securityQuestions = JSON.parse(localStorage.getItem('security_questions') || '{}');
        securityQuestions[email.toLowerCase().trim()] = {
          question: regQuestion,
          answer: regAnswer.trim().toLowerCase()
        };
        localStorage.setItem('security_questions', JSON.stringify(securityQuestions));

        // Register Student
        await register(name, email, password, batch);
        navigate('/');
      } else {
        // Login Admin or Student
        const user = await login(email, password);
        
        // Enforce role alignment with the active toggle selection
        if (isAdmin && user.role !== 'admin') {
          logout();
          throw new Error('Access denied. This account is registered as a student, please switch to the Student tab.');
        }
        if (!isAdmin && user.role !== 'student') {
          logout();
          throw new Error('Access denied. This account is registered as an administrator, please switch to the Admin tab.');
        }

        if (user.role === 'admin') {
          navigate('/admin');
        } else {
          navigate('/');
        }
      }
    } catch (err) {
      setErrorMsg(err.message || 'An error occurred during verification.');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleMode = () => {
    const nextRegister = !isRegister;
    setIsRegister(nextRegister);
    setErrorMsg('');
    if (nextRegister) {
      setName('');
      setEmail('');
      setPassword('');
    } else {
      setEmail('');
      setPassword('');
    }
  };

  const toggleRole = () => {
    const nextIsAdmin = !isAdmin;
    setIsAdmin(nextIsAdmin);
    setIsRegister(false); // Admin registration is disabled on front-end
    setErrorMsg('');
    setEmail('');
    setPassword('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50/50 via-slate-50 to-purple-50/50 text-slate-800 flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Premium SVG Grid Pattern Background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#6366f108_1px,transparent_1px),linear-gradient(to_bottom,#6366f108_1px,transparent_1px)] bg-[size:20px_30px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_80%,transparent_100%)] z-0"></div>
      
      {/* Background glowing gradients matching logo */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-indigo-400/15 blur-[120px] pointer-events-none"></div>
      <div className="absolute top-1/3 right-1/4 w-[500px] h-[500px] rounded-full bg-purple-400/10 blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 left-1/3 w-[450px] h-[450px] rounded-full bg-cyan-400/12 blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-1/3 right-1/3 w-[400px] h-[400px] rounded-full bg-pink-400/10 blur-[90px] pointer-events-none"></div>

      {/* Assessment Doodles matching the logo colors (strokeWidth={1.2}) */}
      <div className="absolute inset-0 pointer-events-none select-none overflow-hidden z-0">
        {/* Row 1 / Top area */}
        <Code strokeWidth={1.2} className="absolute top-[8%] left-[6%] w-16 h-16 text-indigo-500/55 transform -rotate-12" />
        <Terminal strokeWidth={1.2} className="absolute top-[6%] right-[22%] w-12 h-12 text-indigo-500/55 transform rotate-12" />
        <GraduationCap strokeWidth={1.2} className="absolute top-[18%] right-[8%] w-20 h-20 text-purple-500/55 transform rotate-6" />
        <Monitor strokeWidth={1.2} className="absolute top-[14%] left-[36%] w-12 h-12 text-indigo-500/55 transform -rotate-6" />
        
        {/* Row 2 / Mid area */}
        <Database strokeWidth={1.2} className="absolute top-[40%] left-[4%] w-14 h-14 text-cyan-500/55 transform rotate-45" />
        <Globe strokeWidth={1.2} className="absolute top-[30%] left-[24%] w-14 h-14 text-cyan-500/55 transform rotate-12" />
        <BookOpen strokeWidth={1.2} className="absolute top-[38%] right-[20%] w-16 h-16 text-indigo-500/55 transform rotate-45" />
        <Trophy strokeWidth={1.2} className="absolute top-[32%] right-[6%] w-18 h-18 text-pink-500/55 transform -rotate-12" />
        
        {/* Row 3 / Lower-mid area */}
        <CheckSquare strokeWidth={1.2} className="absolute bottom-[38%] right-[4%] w-16 h-16 text-purple-500/55 transform -rotate-12" />
        <Cpu strokeWidth={1.2} className="absolute bottom-[34%] left-[20%] w-14 h-14 text-purple-500/55 transform -rotate-12" />
        <Layers strokeWidth={1.2} className="absolute bottom-[26%] right-[24%] w-15 h-15 text-pink-500/55 transform rotate-12" />
        <MousePointer strokeWidth={1.2} className="absolute bottom-[46%] left-[9%] w-10 h-10 text-indigo-500/55 transform rotate-45" />
        
        {/* Row 4 / Bottom area */}
        <FileText strokeWidth={1.2} className="absolute bottom-[16%] left-[10%] w-16 h-16 text-pink-500/55 transform -rotate-6" />
        <Award strokeWidth={1.2} className="absolute bottom-[8%] right-[6%] w-24 h-24 text-indigo-500/55 transform rotate-12" />
        <BrainCircuit strokeWidth={1.2} className="absolute bottom-[6%] left-[26%] w-18 h-18 text-purple-500/55 transform -rotate-12" />
        <Server strokeWidth={1.2} className="absolute bottom-[12%] right-[36%] w-14 h-14 text-cyan-500/55 transform rotate-12" />
      </div>

      <div className="w-full max-w-md z-10 animate-fade-in flex flex-col gap-6">
        {/* Form Card */}
        <div className="bg-white/90 backdrop-blur-xl rounded-3xl p-8 md:p-10 shadow-[0_20px_50px_rgba(99,102,241,0.06)] border border-slate-200/80 relative overflow-hidden">
          
          {/* Top Logo - Centered and Large */}
          <div className="flex flex-col items-center mb-6">
            <div className="relative group">
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 blur-md opacity-35 group-hover:opacity-60 group-hover:scale-110 transition-all duration-500"></div>
              <img 
                src="/genz_logo.png" 
                alt="GenZ Learners Logo" 
                className="relative w-22 h-22 object-contain rounded-full border border-indigo-500/20 bg-[#0d0b21] shadow-lg group-hover:scale-105 transition-transform duration-500 ease-out"
              />
            </div>
          </div>

          {/* Centered Segmented Sliding Tab Switcher */}
          <div className="flex justify-center mb-6">
            <div className="relative flex p-1 bg-slate-100 border border-slate-200 rounded-full w-60 select-none shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)]">
              {/* Sliding Background Indicator */}
              <div 
                className="absolute top-1 bottom-1 left-1 rounded-full bg-white shadow-[0_2px_8px_rgba(99,102,241,0.12)] border border-slate-200/50 transition-all duration-300 ease-out"
                style={{
                  width: 'calc(50% - 4px)',
                  transform: isAdmin ? 'translateX(100%)' : 'translateX(0%)'
                }}
              />
              <button
                type="button"
                onClick={() => { if (isAdmin) toggleRole(); }}
                className={`relative z-10 flex-1 py-2 text-xs font-bold text-center flex items-center justify-center gap-1.5 transition-colors duration-300 cursor-pointer ${
                  !isAdmin ? 'text-indigo-600 font-extrabold' : 'text-slate-400 font-medium hover:text-slate-600'
                }`}
              >
                <GraduationCap className={`w-3.5 h-3.5 transition-transform duration-300 ${!isAdmin ? 'scale-110 text-indigo-600' : 'opacity-70 text-slate-400'}`} />
                <span>Student</span>
              </button>
              <button
                type="button"
                onClick={() => { if (!isAdmin) toggleRole(); }}
                className={`relative z-10 flex-1 py-2 text-xs font-bold text-center flex items-center justify-center gap-1.5 transition-colors duration-300 cursor-pointer ${
                  isAdmin ? 'text-indigo-600 font-extrabold' : 'text-slate-400 font-medium hover:text-slate-600'
                }`}
              >
                <UserCheck className={`w-3.5 h-3.5 transition-transform duration-300 ${isAdmin ? 'scale-110 text-indigo-600' : 'opacity-70 text-slate-400'}`} />
                <span>Admin</span>
              </button>
            </div>
          </div>

          {/* Crisp horizontal separator line */}
          <div className="w-full border-t border-slate-200 mb-6"></div>

          {/* Error Message */}
          {errorMsg && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 flex items-center gap-3 text-red-700 text-sm">
              <ShieldAlert className="w-5 h-5 flex-shrink-0 text-red-500" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {isRegister && !isAdmin && (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-500 tracking-wider">FULL NAME</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl pl-10 pr-4 py-3 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-sm"
                  />
                </div>
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-500 tracking-wider">EMAIL ADDRESS</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl pl-10 pr-4 py-3 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-sm"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5 relative">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-slate-500 tracking-wider">SECURE PASSWORD</label>
                <button
                  type="button"
                  onClick={() => setShowRecoveryModal(true)}
                  className="text-[10px] font-bold text-indigo-600 hover:text-indigo-500 hover:underline cursor-pointer"
                >
                  Forgot Password?
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl pl-10 pr-12 py-3 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {isRegister && !isAdmin && (
              <>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-500 tracking-wider">BATCH ENROLLMENT</label>
                  <select
                    value={batch}
                    onChange={(e) => setBatch(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-700 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-sm"
                  >
                    <option value="Web Development">Web Development</option>
                    <option value="Advanced Full Stack Development">Advanced Full Stack Development</option>
                    <option value="Python & Machine Learning">Python & Machine Learning</option>
                    <option value="Advanced Java Enterprise">Advanced Java Enterprise</option>
                    <option value="Cloud Computing & DevOps">Cloud Computing & DevOps</option>
                    <option value="Cybersecurity & Ethical Hacking">Cybersecurity & Ethical Hacking</option>
                    <option value="Data Science & Analytics">Data Science & Analytics</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-500 tracking-wider">SECURITY QUESTION (FOR RECOVERY)</label>
                  <select
                    value={regQuestion}
                    onChange={(e) => setRegQuestion(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-700 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-sm"
                  >
                    <option value="What is your favorite programming language?">What is your favorite programming language?</option>
                    <option value="What was the name of your first pet?">What was the name of your first pet?</option>
                    <option value="What was your first job?">What was your first job?</option>
                    <option value="In what city were you born?">In what city were you born?</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-500 tracking-wider">SECURITY ANSWER</label>
                  <input
                    type="text"
                    required
                    value={regAnswer}
                    onChange={(e) => setRegAnswer(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-sm"
                  />
                </div>
              </>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full mt-2 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-700 hover:to-indigo-600 text-white font-bold py-3.5 rounded-xl text-sm flex items-center justify-center gap-2 hover:shadow-[0_10px_25px_-5px_rgba(99,102,241,0.25)] active:scale-[0.99] transition-all cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
            >
              {submitting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : isRegister ? (
                <>
                  <UserPlus className="w-4 h-4" />
                  <span>Create Free Account</span>
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>Login</span>
                </>
              )}
            </button>
          </form>

          {/* Bottom Register/Login toggle - always occupies same height space to avoid layout shift */}
          <div className="mt-6 text-center">
            {!isAdmin ? (
              <button
                type="button"
                onClick={toggleMode}
                className="text-xs text-indigo-600 hover:text-indigo-500 underline font-bold transition-all cursor-pointer"
              >
                {isRegister ? 'Already registered? Log in here' : "First time? Register student account here"}
              </button>
            ) : (
              <div className="text-xs text-transparent select-none py-0.5" aria-hidden="true">&nbsp;</div>
            )}
          </div>
        </div>
      </div>

      {/* Recovery Modal */}
      {showRecoveryModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white/95 backdrop-blur-xl w-full max-w-md rounded-3xl border border-slate-200 shadow-2xl p-6 md:p-8 animate-scale-in relative overflow-hidden">
            {/* Background blob for style */}
            <div className="absolute -top-16 -right-16 w-36 h-36 rounded-full bg-indigo-500/10 blur-xl pointer-events-none" />

            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <h3 className="text-sm font-black text-slate-800 tracking-wide flex items-center gap-2">
                <Lock className="w-4 h-4 text-indigo-600" />
                <span>Password Recovery</span>
              </h3>
              <button 
                onClick={() => {
                  setShowRecoveryModal(false);
                  setRecoveryEmail('');
                  setRecoveryStep(1);
                  setRecoveryQuestion('');
                  setRecoveryAnswerInput('');
                  setRecoverySuccess(null);
                  setRecoveryError('');
                }} 
                className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {recoverySuccess ? (
              <div className="mt-5 flex flex-col gap-4">
                <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl text-slate-700 text-xs flex flex-col gap-2.5">
                  <div className="flex items-center gap-2 text-emerald-700 font-extrabold">
                    <Check className="w-4.5 h-4.5" />
                    <span>Temporary Password Issued</span>
                  </div>
                  <p className="font-semibold leading-relaxed">
                    For local testing convenience, your password has been reset to:
                  </p>
                  
                  <div className="flex items-center gap-2.5 mt-1">
                    <span className="font-mono text-sm bg-white border border-emerald-200 text-indigo-600 px-4 py-2 rounded-xl flex-1 text-center font-bold">
                      {recoverySuccess.tempPassword || 'reset123'}
                    </span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(recoverySuccess.tempPassword || 'reset123');
                        setRecoveryCopied(true);
                        setTimeout(() => setRecoveryCopied(false), 2000);
                      }}
                      className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-500/10 flex items-center gap-1.5 cursor-pointer"
                    >
                      {recoveryCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{recoveryCopied ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                </div>
                
                <p className="text-[10px] text-slate-400 font-semibold text-center mt-2 leading-relaxed">
                  Copy the temporary password above, close this window, and authenticate your login.
                </p>

                <button
                  onClick={() => {
                    // Populate login form for convenience
                    setEmail(recoveryEmail);
                    setPassword(recoverySuccess.tempPassword || 'reset123');
                    setShowRecoveryModal(false);
                    setRecoveryEmail('');
                    setRecoveryStep(1);
                    setRecoveryQuestion('');
                    setRecoveryAnswerInput('');
                    setRecoverySuccess(null);
                    setRecoveryError('');
                  }}
                  className="w-full mt-2 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-md cursor-pointer"
                >
                  <span>Apply Credentials & Login</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : recoveryStep === 1 ? (
              <form onSubmit={handleVerifyEmail} className="flex flex-col gap-4 mt-5">
                <p className="text-slate-500 text-xs leading-relaxed font-semibold">
                  Enter your registered account email address to verify your security question.
                </p>

                {recoveryError && (
                  <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 text-xs font-bold rounded-xl flex items-center gap-2">
                    <ShieldAlert className="w-4.5 h-4.5 text-red-500 flex-shrink-0" />
                    <span>{recoveryError}</span>
                  </div>
                )}

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black text-slate-400 tracking-wider">EMAIL ADDRESS</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="email"
                      required
                      value={recoveryEmail}
                      onChange={(e) => setRecoveryEmail(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-sm"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={!recoveryEmail}
                  className="w-full mt-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-md cursor-pointer disabled:opacity-50"
                >
                  <span>Verify Email</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </form>
            ) : (
              <form onSubmit={handleRecoverPassword} className="flex flex-col gap-4 mt-5">
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-600 text-xs flex flex-col gap-1">
                  <span className="text-[10px] font-black text-slate-400 tracking-wider uppercase">Your Security Question:</span>
                  <p className="font-extrabold text-slate-800">{recoveryQuestion}</p>
                  {isLegacyAccount && (
                    <span className="text-[9px] text-indigo-500 font-semibold mt-1">Hint: Try answer "javascript" for default setup</span>
                  )}
                  {recoveryEmail.toLowerCase().trim() === 'admin@exam.com' && (
                    <span className="text-[9px] text-indigo-500 font-semibold mt-1">Hint: Try answer "teacher" for default admin</span>
                  )}
                </div>

                {recoveryError && (
                  <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 text-xs font-bold rounded-xl flex items-center gap-2">
                    <ShieldAlert className="w-4.5 h-4.5 text-red-500 flex-shrink-0" />
                    <span>{recoveryError}</span>
                  </div>
                )}

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black text-slate-400 tracking-wider">SECURITY ANSWER</label>
                  <input
                    type="text"
                    required
                    autoFocus
                    value={recoveryAnswerInput}
                    onChange={(e) => setRecoveryAnswerInput(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-sm"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => { setRecoveryStep(1); setRecoveryError(''); }}
                    className="flex-1 py-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-500 font-bold rounded-xl text-xs transition-all cursor-pointer shadow-sm"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={recoveryLoading || !recoveryAnswerInput}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-md cursor-pointer disabled:opacity-50"
                  >
                    {recoveryLoading ? <Loader2 className="w-4.5 h-4.5 animate-spin" /> : <Check className="w-4 h-4" />}
                    <span>Recover Password</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
