import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Users, Loader2, Search, SlidersHorizontal, Edit, X, Check } from 'lucide-react';
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

export default function AdminStudents() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [filterText, setFilterText] = useState('');
  const [selectedBatch, setSelectedBatch] = useState('All Courses');
  const [selectedRole, setSelectedRole] = useState('All Roles');
  const [sortBy, setSortBy] = useState('name-asc');

  // Edit modal states
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editBatch, setEditBatch] = useState('Web Development');
  const [editRole, setEditRole] = useState('student');
  const [editStatus, setEditStatus] = useState('Active');
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveError, setSaveError] = useState('');

  const handleOpenEditModal = (student) => {
    setEditingStudent(student);
    setEditName(student.name || '');
    setEditEmail(student.email || '');
    setEditBatch(student.batch || 'Web Development');
    setEditRole(student.role || 'student');
    setEditStatus(student.isActive !== false ? 'Active' : 'Inactive');
    setSaveError('');
    setShowEditModal(true);
  };

  const handleSaveStudent = async (e) => {
    e.preventDefault();
    if (!editName.trim() || !editEmail.trim()) {
      setSaveError('Name and email are required.');
      return;
    }

    setSaveLoading(true);
    setSaveError('');

    try {
      const payload = {
        name: editName.trim(),
        email: editEmail.trim(),
        batch: editBatch,
        role: editRole,
        status: editStatus
      };
      
      await api.adminUpdateStudent(editingStudent._id, payload);

      setStudents(prev => prev.map(s => s._id === editingStudent._id ? {
        ...s,
        name: editName.trim(),
        email: editEmail.trim(),
        batch: editBatch,
        role: editRole,
        isActive: editStatus === 'Active'
      } : s));

      setShowEditModal(false);
    } catch (err) {
      console.error('Error saving student:', err);
      setSaveError(err.message || 'Failed to update student details.');
    } finally {
      setSaveLoading(false);
    }
  };

  useEffect(() => {
    const loadStudents = async () => {
      try {
        setLoading(true);
        const data = await api.getStudents();
        setStudents(data || []);
      } catch (err) {
        console.error('Error fetching students:', err);
        setError('Failed to retrieve students records.');
      } finally {
        setLoading(false);
      }
    };

    loadStudents();
  }, []);

  // Collect unique batches dynamically
  const uniqueBatches = ['All Courses', ...Array.from(new Set(students.map(s => s.batch || 'Web Development')))];

  // Filter students based on text, batch, and role
  const filteredStudents = students.filter(student => {
    const matchesSearch = 
      (student.name || '').toLowerCase().includes(filterText.toLowerCase()) ||
      (student.email || '').toLowerCase().includes(filterText.toLowerCase());

    const studentBatch = student.batch || 'Web Development';
    const matchesBatch = selectedBatch === 'All Courses' || studentBatch === selectedBatch;

    const matchesRole = 
      selectedRole === 'All Roles' || 
      (selectedRole === 'Admin' && student.role === 'admin') ||
      (selectedRole === 'Student' && student.role === 'student');

    return matchesSearch && matchesBatch && matchesRole;
  });

  // Sort students
  const sortedStudents = [...filteredStudents].sort((a, b) => {
    const nameA = (a.name || '').toLowerCase();
    const nameB = (b.name || '').toLowerCase();
    const batchA = (a.batch || 'Web Development').toLowerCase();
    const batchB = (b.batch || 'Web Development').toLowerCase();
    const roleA = (a.role || 'student').toLowerCase();
    const roleB = (b.role || 'student').toLowerCase();

    if (sortBy === 'name-asc') return nameA.localeCompare(nameB);
    if (sortBy === 'name-desc') return nameB.localeCompare(nameA);
    if (sortBy === 'batch-asc') return batchA.localeCompare(batchB);
    if (sortBy === 'batch-desc') return batchB.localeCompare(batchA);
    if (sortBy === 'role-asc') return roleA.localeCompare(roleB);
    if (sortBy === 'role-desc') return roleB.localeCompare(roleA);
    return 0;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
        <p className="text-slate-500 text-sm font-semibold">Loading student directory...</p>
      </div>
    );
  }

  return (
    <AdminLayout activePage="Student Management" headerTitle="STUDENT DIRECTORY">
      <div className="flex flex-col gap-6 animate-slide-up">
        {/* Title Block */}
        <div className="flex flex-col gap-1">
          <h1 className="text-lg font-black text-slate-800 flex items-center gap-2.5">
            <Users className="w-5 h-5 text-indigo-600" /> GenZ Learners Student Management
          </h1>
          <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider mt-0.5">
            TOTAL REGISTERED USER ENROLLMENTS: {students.length}
          </p>
        </div>

        {/* Filter and Sort Bar */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          {/* Search Capsule */}
          <div className="flex-1 min-w-[240px] relative flex items-center">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 flex-shrink-0" />
            <input
              type="text"
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              placeholder="Search student candidate, email..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-semibold shadow-inner"
            />
          </div>

          {/* Dropdown Filters */}
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-400 font-black tracking-wider uppercase">Course:</span>
              <select
                value={selectedBatch}
                onChange={(e) => setSelectedBatch(e.target.value)}
                className="bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-700 font-bold focus:outline-none focus:border-indigo-500 transition-all shadow-sm cursor-pointer"
              >
                {uniqueBatches.map(batch => (
                  <option key={batch} value={batch}>{batch}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-400 font-black tracking-wider uppercase">Role:</span>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-700 font-bold focus:outline-none focus:border-indigo-500 transition-all shadow-sm cursor-pointer"
              >
                <option value="All Roles">All Roles</option>
                <option value="Admin">Admin</option>
                <option value="Student">Student</option>
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
                <option value="name-asc">Name (A-Z)</option>
                <option value="name-desc">Name (Z-A)</option>
                <option value="batch-asc">Course (A-Z)</option>
                <option value="batch-desc">Course (Z-A)</option>
                <option value="role-asc">Role (A-Z)</option>
                <option value="role-desc">Role (Z-A)</option>
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

        {/* Student Database Table Card */}
        <div className="bg-white border border-slate-300 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            {students.length === 0 ? (
              <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
                <Users className="w-10 h-10 text-slate-300" />
                <span className="font-semibold">No students registered in the database.</span>
              </div>
            ) : sortedStudents.length === 0 ? (
              <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
                <Users className="w-10 h-10 text-slate-300 animate-pulse" />
                <span className="font-semibold text-sm">No matching student records found.</span>
                <span className="text-[10px] text-slate-400 font-semibold">Try adjusting your filters or search terms.</span>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-300 bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                    <th className="py-4 px-6">Student Candidate</th>
                    <th className="py-4 px-6">Email Address</th>
                    <th className="py-4 px-6">Batch Enrollment</th>
                    <th className="py-4 px-6">Security Role</th>
                    <th className="py-4 px-6">Status</th>
                    <th className="py-4 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                  {sortedStudents.map((student) => {
                    const avatarColor = getAvatarColor(student.name, student.role);
                    const isActive = student.isActive !== false;
                    return (
                      <tr key={student._id} className="hover:bg-slate-50/30 transition-colors">
                        <td className="py-3.5 px-6 flex items-center gap-3">
                          {/* Dynamic Avatar Bubble */}
                          <div className={`w-8 h-8 rounded-full ${avatarColor} flex items-center justify-center font-extrabold text-xs shadow-sm`}>
                            {student.name ? student.name.charAt(0).toUpperCase() : 'S'}
                          </div>
                          <span className="font-extrabold text-slate-800">{student.name}</span>
                        </td>
                        <td className="py-3.5 px-6 text-slate-500 font-medium">
                          {student.email}
                        </td>
                        <td className="py-3.5 px-6">
                          <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-[10px] font-bold">
                            {student.batch || 'Web Development'}
                          </span>
                        </td>
                        <td className="py-3.5 px-6">
                          {student.role === 'admin' ? (
                            <span className="bg-indigo-50 text-indigo-600 border border-indigo-100/50 px-3 py-1 rounded-full text-[10px] font-bold">
                              Admin
                            </span>
                          ) : (
                            <span className="bg-blue-50 text-blue-600 border border-blue-100/50 px-3 py-1 rounded-full text-[10px] font-bold">
                              Student
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-6">
                          {isActive ? (
                            <span className="text-emerald-500 font-bold text-xs flex items-center gap-1.5 select-none">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/20"></span>
                              Active
                            </span>
                          ) : (
                            <span className="text-red-500 font-bold text-xs flex items-center gap-1.5 select-none">
                              <span className="w-1.5 h-1.5 rounded-full bg-red-500 shadow-sm shadow-red-500/20"></span>
                              Inactive
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-6 text-right">
                          <button
                            onClick={() => handleOpenEditModal(student)}
                            className="p-1.5 bg-white border border-slate-200 hover:bg-indigo-50 hover:border-indigo-200 text-slate-500 hover:text-indigo-600 rounded-xl transition-all cursor-pointer shadow-sm inline-flex items-center justify-center hover:scale-105"
                            title="Edit Details"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
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

      {/* Edit Student Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white/95 backdrop-blur-xl w-full max-w-lg rounded-3xl border border-slate-200 shadow-2xl p-6 md:p-8 animate-scale-in">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-6">
              <h3 className="text-sm font-black text-slate-800 tracking-wide flex items-center gap-2">
                <Edit className="w-4.5 h-4.5 text-indigo-600" />
                <span>Edit Candidate & Course Registry</span>
              </h3>
              <button 
                onClick={() => setShowEditModal(false)} 
                className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {saveError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-bold rounded-xl">
                {saveError}
              </div>
            )}

            <form onSubmit={handleSaveStudent} className="flex flex-col gap-4">
              {/* Name Field */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black text-slate-400 tracking-wider">FULL NAME</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Candidate Name"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all shadow-inner font-semibold"
                />
              </div>

              {/* Email Field */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black text-slate-400 tracking-wider">EMAIL ADDRESS</label>
                <input
                  type="email"
                  required
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  placeholder="candidate@email.com"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all shadow-inner font-semibold"
                />
              </div>

              {/* Course/Batch Field */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black text-slate-400 tracking-wider">COURSE / BATCH ENROLLMENT</label>
                <select
                  value={editBatch}
                  onChange={(e) => setEditBatch(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-700 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all shadow-inner font-bold cursor-pointer"
                >
                  <option value="Web Development">Web Development</option>
                  <option value="Advanced Full Stack Development">Advanced Full Stack Development</option>
                  <option value="Python & Machine Learning">Python & Machine Learning</option>
                  <option value="Advanced Java Enterprise">Advanced Java Enterprise</option>
                  <option value="Cloud Computing & DevOps">Cloud Computing & DevOps</option>
                  <option value="Cybersecurity & Ethical Hacking">Cybersecurity & Ethical Hacking</option>
                  <option value="Data Science & Analytics">Data Science & Analytics</option>
                  <option value="Trainer Core">Trainer Core</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Role Field */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black text-slate-400 tracking-wider">SECURITY ROLE</label>
                  <select
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-700 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all shadow-inner font-bold cursor-pointer"
                  >
                    <option value="student">Student</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                {/* Status Field */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black text-slate-400 tracking-wider">STATUS</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-700 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all shadow-inner font-bold cursor-pointer"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-4 mt-6 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-600 font-bold rounded-xl text-xs transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saveLoading}
                  className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-md shadow-indigo-500/10 disabled:opacity-50"
                >
                  {saveLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
