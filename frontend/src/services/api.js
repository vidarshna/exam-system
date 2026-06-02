const BASE_URL = import.meta.env.DEV ? '' : 'https://exam-system-backend-lkm5.onrender.com';

const getHeaders = () => {
  const token = localStorage.getItem('exam_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
};

const handleResponse = async (res) => {
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || 'Request failed.');
  }
  return data;
};

export const api = {
  // Exams
  getExams: async () => {
    const res = await fetch(`${BASE_URL}/api/exams` , { headers: getHeaders() });
    return handleResponse(res);
  },

  getExamDetails: async (id) => {
    const res = await fetch(`${BASE_URL}/api/exams/${id}`, { headers: getHeaders() });
    return handleResponse(res);
  },

  createExam: async (examData) => {
    const res = await fetch(`${BASE_URL}/api/exams` , {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(examData)
    });
    return handleResponse(res);
  },

  deleteExam: async (id) => {
    const res = await fetch(`${BASE_URL}/api/exams/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  // Results & Submissions
  submitExam: async (submissionData) => {
    const res = await fetch(`${BASE_URL}/api/results/submit` , {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(submissionData)
    });
    return handleResponse(res);
  },

  getStudentHistory: async () => {
    const res = await fetch(`${BASE_URL}/api/results/student/me` , { headers: getHeaders() });
    return handleResponse(res);
  },

  getDetailedScorecard: async (id) => {
    const res = await fetch(`${BASE_URL}/api/results/details/${id}`, { headers: getHeaders() });
    return handleResponse(res);
  },

  getAnalyticsDashboard: async () => {
    const res = await fetch(`${BASE_URL}/api/results/analytics/dashboard` , { headers: getHeaders() });
    return handleResponse(res);
  },

  // Questions (Admin)
  getQuestions: async (category = '', difficulty = '') => {
    let url = `${BASE_URL}/api/questions`;
    const params = [];
    if (category) params.push(`category=${encodeURIComponent(category)}`);
    if (difficulty) params.push(`difficulty=${encodeURIComponent(difficulty)}`);
    if (params.length > 0) url += `?${params.join('&')}`;

    const res = await fetch(url, { headers: getHeaders() });
    return handleResponse(res);
  },

  createQuestion: async (questionData) => {
    const res = await fetch(`${BASE_URL}/api/questions` , {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(questionData)
    });
    return handleResponse(res);
  },

  updateQuestion: async (id, questionData) => {
    const res = await fetch(`${BASE_URL}/api/questions/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(questionData)
    });
    return handleResponse(res);
  },

  deleteQuestion: async (id) => {
    const res = await fetch(`${BASE_URL}/api/questions/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  importQuestions: async (questionsList) => {
    const res = await fetch(`${BASE_URL}/api/questions/import` , {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(questionsList)
    });
    return handleResponse(res);
  },

  // Students Directory (Admin)
  getStudents: async () => {
    const res = await fetch(`${BASE_URL}/api/auth/students` , { headers: getHeaders() });
    return handleResponse(res);
  },

  updateProfile: async (profileData) => {
    const res = await fetch(`${BASE_URL}/api/auth/profile` , {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(profileData)
    });
    return handleResponse(res);
  },

  forgotPassword: async (email) => {
    const res = await fetch(`${BASE_URL}/api/auth/forgot-password` , {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    return handleResponse(res);
  },

  adminUpdateStudent: async (id, studentData) => {
    const res = await fetch(`${BASE_URL}/api/auth/students/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(studentData)
    });
    return handleResponse(res);
  },

  getNotifications: async () => {
    const res = await fetch(`${BASE_URL}/api/notifications` , { headers: getHeaders() });
    return handleResponse(res);
  },

  markAllNotificationsAsRead: async () => {
    const res = await fetch(`${BASE_URL}/api/notifications/read` , {
      method: 'PUT',
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  markNotificationAsRead: async (id) => {
    const res = await fetch(`${BASE_URL}/api/notifications/${id}/read`, {
      method: 'PUT',
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  clearNotifications: async () => {
    const res = await fetch(`${BASE_URL}/api/notifications` , {
      method: 'DELETE',
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  deleteSubmission: async (id) => {
    const res = await fetch(`${BASE_URL}/api/results/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    return handleResponse(res);
  }
};
