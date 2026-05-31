import express from 'express';
import { db } from '../config/db.js';
import { auth, adminOnly } from '../middleware/auth.js';
import crypto from 'crypto';

const router = express.Router();

// POST /api/results/submit
// Evaluate exam submission and return score
router.post('/submit', auth, async (req, res) => {
  try {
    const { examId, answers, cheatingFlags, timeSpent } = req.body;
    const studentId = req.user.id;

    if (!examId || !Array.isArray(answers)) {
      return res.status(400).json({ message: 'Missing examId or answers array.' });
    }

    // Check attempt limit before submitting
    const studentResults = await db.results.find({ studentId, examId });
    const attemptCount = studentResults.filter(r => !r.reset).length;
    if (attemptCount >= 2) {
      return res.status(403).json({ message: 'Access denied. You have already submitted this exam 2 times.' });
    }

    const exam = await db.exams.findOne({ _id: examId });
    if (!exam) {
      return res.status(404).json({ message: 'Exam not found.' });
    }

    // Fetch the student details
    const student = await db.students.findOne({ _id: studentId });
    if (!student) {
      return res.status(404).json({ message: 'Student profile not found.' });
    }

    // Evaluate answers
    let correctCount = 0;
    let wrongCount = 0;
    let unansweredCount = 0;
    const processedAnswers = [];

    for (const ans of answers) {
      const q = await db.questions.findOne({ _id: ans.questionId });
      if (!q) continue;

      const isCorrect = q.correctAnswer === ans.selectedAnswer;
      const isUnanswered = !ans.selectedAnswer;

      if (isUnanswered) {
        unansweredCount++;
      } else if (isCorrect) {
        correctCount++;
      } else {
        wrongCount++;
      }

      processedAnswers.push({
        questionId: q._id,
        question: q.question,
        options: q.options,
        selectedAnswer: ans.selectedAnswer || '',
        correctAnswer: q.correctAnswer,
        explanation: q.explanation || 'No explanation provided.',
        category: q.category,
        isCorrect,
        isUnanswered
      });
    }

    // Calculate score based on correct/wrong answers and negative marking config
    const negativeMark = exam.negativeMarking || 0; // e.g. 0.25
    const totalQuestions = processedAnswers.length;

    let score = correctCount - (wrongCount * negativeMark);
    // Score cannot be negative
    if (score < 0) score = 0;

    const percentage = Math.round((correctCount / totalQuestions) * 100);
    const passed = percentage >= (exam.passingMark || 50);

    const resultId = crypto.randomBytes(8).toString('hex').toUpperCase(); // Certificate/Result Verification ID

    const resultRecord = await db.results.insertOne({
      _id: resultId,
      studentId,
      studentName: student.name,
      studentEmail: student.email,
      studentBatch: student.batch || 'Web Development',
      examId,
      examTitle: exam.title,
      examCategory: exam.category,
      totalQuestions,
      correctCount,
      wrongCount,
      unansweredCount,
      score,
      percentage,
      passed,
      cheatingFlags: cheatingFlags || 0,
      timeSpent: timeSpent || 0, // in seconds
      answers: processedAnswers,
      certificateHash: `CERT-${resultId}-${Math.floor(Math.random() * 10000)}`
    });

    // Create live notification for admin
    await db.notifications.insertOne({
      title: `Exam "${exam.title}" submitted by ${student.name}`,
      color: 'bg-emerald-500',
      path: '/admin/submissions',
      type: 'submission',
      read: false
    });

    // Create live notification for student
    await db.notifications.insertOne({
      title: `Submitted: "${exam.title}" score evaluated.`,
      color: 'bg-emerald-500',
      path: '/?tab=log',
      type: 'student_submission',
      recipientId: studentId,
      read: false
    });

    res.status(201).json(resultRecord);
  } catch (error) {
    console.error('Submit exam error:', error);
    res.status(500).json({ message: 'Server error calculating result.' });
  }
});

// GET /api/results/student/me
// Get current student's exam history
router.get('/student/me', auth, async (req, res) => {
  try {
    const results = await db.results.find({ studentId: req.user.id });
    res.json(results);
  } catch (error) {
    console.error('Fetch student history error:', error);
    res.status(500).json({ message: 'Server error retrieving exam history.' });
  }
});

// GET /api/results/student/:id (Admin only)
// Get a specific student's exam history
router.get('/student/:id', auth, adminOnly, async (req, res) => {
  try {
    const results = await db.results.find({ studentId: req.params.id });
    res.json(results);
  } catch (error) {
    console.error('Fetch student history for admin error:', error);
    res.status(500).json({ message: 'Server error retrieving student exam history.' });
  }
});

// GET /api/results/exam/:id (Admin only)
// Get all student results for a specific exam
router.get('/exam/:id', auth, adminOnly, async (req, res) => {
  try {
    const results = await db.results.find({ examId: req.params.id });
    res.json(results);
  } catch (error) {
    console.error('Fetch exam results for admin error:', error);
    res.status(500).json({ message: 'Server error retrieving exam results.' });
  }
});

// GET /api/results/details/:id
// Get a specific detailed result scorecard (for review or certificate generation)
router.get('/details/:id', auth, async (req, res) => {
  try {
    const result = await db.results.findOne({ _id: req.params.id });
    if (!result) {
      return res.status(404).json({ message: 'Scorecard not found.' });
    }

    // Prevent students from viewing other students' detailed results
    if (req.user.role === 'student' && result.studentId !== req.user.id) {
      return res.status(403).json({ message: 'Access denied. You cannot view this scorecard.' });
    }

    res.json(result);
  } catch (error) {
    console.error('Fetch scorecard error:', error);
    res.status(500).json({ message: 'Server error retrieving scorecard details.' });
  }
});

// GET /api/results/analytics
// Get overall dashboard statistics and metrics
router.get('/analytics/dashboard', auth, async (req, res) => {
  try {
    if (req.user.role === 'admin') {
      // Admin dashboard data
      const allResults = await db.results.find({});
      const totalStudents = await db.students.countDocuments({ role: 'student' });
      const totalExams = await db.exams.countDocuments({});
      const totalQuestions = await db.questions.countDocuments({});

      // Group subject performance
      const subjectMetrics = {};
      allResults.forEach(r => {
        const cat = r.examCategory || 'Other';
        if (!subjectMetrics[cat]) {
          subjectMetrics[cat] = { totalPercentage: 0, count: 0, passCount: 0 };
        }
        subjectMetrics[cat].totalPercentage += r.percentage;
        subjectMetrics[cat].count += 1;
        if (r.passed) {
          subjectMetrics[cat].passCount += 1;
        }
      });

      const chartsData = Object.keys(subjectMetrics).map(cat => ({
        subject: cat,
        avgScore: Math.round(subjectMetrics[cat].totalPercentage / subjectMetrics[cat].count),
        passRate: Math.round((subjectMetrics[cat].passCount / subjectMetrics[cat].count) * 100),
        attempts: subjectMetrics[cat].count
      }));

      // Top performers list
      const studentMap = {};
      allResults.forEach(r => {
        if (!studentMap[r.studentId]) {
          studentMap[r.studentId] = { name: r.studentName, email: r.studentEmail, batch: r.studentBatch, totalScore: 0, examCount: 0, avgPercent: 0 };
        }
        studentMap[r.studentId].totalScore += r.score;
        studentMap[r.studentId].examCount += 1;
        studentMap[r.studentId].avgPercent += r.percentage;
      });

      const rankings = Object.keys(studentMap).map(id => ({
        studentId: id,
        ...studentMap[id],
        avgPercent: Math.round(studentMap[id].avgPercent / studentMap[id].examCount)
      })).sort((a, b) => b.avgPercent - a.avgPercent).slice(0, 10);

      // System pass rate
      const passCount = allResults.filter(r => r.passed).length;
      const passPercentage = allResults.length > 0 ? Math.round((passCount / allResults.length) * 100) : 0;

      res.json({
        totalStudents,
        totalExams,
        totalQuestions,
        totalSubmissions: allResults.length,
        systemPassRate: passPercentage,
        chartsData,
        rankings,
        submissions: [...allResults].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      });
    } else {
      // Student analytics data
      const studentResults = await db.results.find({ studentId: req.user.id });
      const examCount = studentResults.length;
      const passedCount = studentResults.filter(r => r.passed).length;
      const totalScore = studentResults.reduce((acc, r) => acc + r.percentage, 0);
      const avgPercentage = examCount > 0 ? Math.round(totalScore / examCount) : 0;

      // Subject-wise breakdowns
      const subjectScores = {};
      studentResults.forEach(r => {
        const cat = r.examCategory || 'Other';
        if (!subjectScores[cat]) {
          subjectScores[cat] = { total: 0, count: 0 };
        }
        subjectScores[cat].total += r.percentage;
        subjectScores[cat].count += 1;
      });

      const chartsData = Object.keys(subjectScores).map(cat => ({
        subject: cat,
        score: Math.round(subjectScores[cat].total / subjectScores[cat].count),
        attempts: subjectScores[cat].count
      }));

      res.json({
        examCount,
        passedCount,
        failedCount: examCount - passedCount,
        avgPercentage,
        chartsData
      });
    }
  } catch (error) {
    console.error('Fetch analytics error:', error);
    res.status(500).json({ message: 'Server error loading analytics.' });
  }
});

// DELETE /api/results/:id (Admin only)
// Soft reset a specific evaluation submission to allow a retake without deleting history logs
router.delete('/:id', auth, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.results.findOne({ _id: id });
    if (!result) {
      return res.status(404).json({ message: 'Submission record not found.' });
    }

    // Reset all attempts for this student and exam to reset their active count to 0
    await db.results.updateMany({ studentId: result.studentId, examId: result.examId }, { reset: true });

    // Create live notification for student
    await db.notifications.insertOne({
      title: `Retake available: "${result.examTitle}" attempts reset.`,
      color: 'bg-indigo-500',
      path: '/?tab=exams',
      type: 'attempt_reset',
      recipientId: result.studentId,
      read: false
    });

    res.json({ message: 'Submission reset successfully. Student is now allowed to retake.' });
  } catch (error) {
    console.error('Reset submission error:', error);
    res.status(500).json({ message: 'Server error resetting submission record.' });
  }
});

export default router;
