import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import StudentDashboard from './pages/StudentDashboard';
import ExamPage from './pages/ExamPage';
import ResultPage from './pages/ResultPage';
import AdminDashboard from './pages/AdminDashboard';
import AdminSubmissions from './pages/AdminSubmissions';
import AdminQuestions from './pages/AdminQuestions';
import AdminExams from './pages/AdminExams';
import AdminStudents from './pages/AdminStudents';

// 1. Guard for authenticated users
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

// 2. Guard for administrator-only routes
function AdminRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  return children;
}

// 3. Guard for student-only routes
function StudentRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role !== 'student') {
    return <Navigate to="/admin" replace />;
  }

  return children;
}

// Main Router Configuration
export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public Login */}
          <Route path="/login" element={<Login />} />

          {/* Student Panel Routes */}
          <Route 
            path="/" 
            element={
              <StudentRoute>
                <StudentDashboard />
              </StudentRoute>
            } 
          />
          <Route 
            path="/exam/:id" 
            element={
              <StudentRoute>
                <ExamPage />
              </StudentRoute>
            } 
          />

          {/* Combined Routes (Detail scorecards can be viewed by both student and admin) */}
          <Route 
            path="/result/:id" 
            element={
              <ProtectedRoute>
                <ResultPage />
              </ProtectedRoute>
            } 
          />

          {/* Admin Panel Routes */}
          <Route 
            path="/admin" 
            element={
              <AdminRoute>
                <AdminDashboard />
              </AdminRoute>
            } 
          />
          <Route 
            path="/admin/submissions" 
            element={
              <AdminRoute>
                <AdminSubmissions />
              </AdminRoute>
            } 
          />
          <Route 
            path="/admin/students" 
            element={
              <AdminRoute>
                <AdminStudents />
              </AdminRoute>
            } 
          />
          <Route 
            path="/admin/questions" 
            element={
              <AdminRoute>
                <AdminQuestions />
              </AdminRoute>
            } 
          />
          <Route 
            path="/admin/exams" 
            element={
              <AdminRoute>
                <AdminExams />
              </AdminRoute>
            } 
          />

          {/* Catch-all Redirect */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
