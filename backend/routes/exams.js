import express from 'express';
import { db } from '../config/db.js';
import { auth, adminOnly } from '../middleware/auth.js';

const router = express.Router();

// Helper to shuffle arrays
function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// GET /api/exams
// List all exams
router.get('/', auth, async (req, res) => {
  try {
    const exams = await db.exams.find({});
    
    // For students, filter exams where assignedStudentId is null/empty, or matches student ID, or batch matches
    const isStudent = req.user.role === 'student';
    let filteredExams = exams;
    
    if (isStudent) {
      filteredExams = exams.filter(exam => 
        (!exam.assignedStudentId && !exam.assignedBatch) || 
        (exam.assignedStudentId === req.user.id) ||
        (exam.assignedBatch && exam.assignedBatch === req.user.batch)
      );
    }
    
    // For admins, resolve student details if assignedStudentId/assignedBatch exists
    const mappedExams = await Promise.all(filteredExams.map(async exam => {
      let assignedStudentName = "All Students";
      if (exam.assignedStudentId) {
        const student = await db.students.findOne({ _id: exam.assignedStudentId });
        if (student) {
          assignedStudentName = student.name;
        } else {
          assignedStudentName = "Unknown Student";
        }
      } else if (exam.assignedBatch) {
        assignedStudentName = `Batch: ${exam.assignedBatch}`;
      }

      return {
        _id: exam._id,
        title: exam.title,
        duration: exam.duration, // in minutes
        category: exam.category,
        totalQuestions: exam.totalQuestions || (exam.questions ? exam.questions.length : 0),
        passingMark: exam.passingMark || 50,
        negativeMarking: exam.negativeMarking || 0,
        assignedStudentId: exam.assignedStudentId || null,
        assignedBatch: exam.assignedBatch || null,
        assignedStudentName,
        createdAt: exam.createdAt
      };
    }));
    
    res.json(mappedExams);
  } catch (error) {
    console.error('Fetch exams error:', error);
    res.status(500).json({ message: 'Server error fetching exams.' });
  }
});

// GET /api/exams/:id
// Get a specific exam configuration
router.get('/:id', auth, async (req, res) => {
  try {
    const exam = await db.exams.findOne({ _id: req.params.id });
    if (!exam) {
      return res.status(404).json({ message: 'Exam not found.' });
    }

    // Double check assignment if student is requesting details
    if (req.user.role === 'student') {
      const isAssignedToMe = !exam.assignedStudentId || exam.assignedStudentId === req.user.id;
      const isAssignedToMyBatch = exam.assignedBatch && exam.assignedBatch === req.user.batch;
      const isGlobal = !exam.assignedStudentId && !exam.assignedBatch;
      if (!isAssignedToMe && !isAssignedToMyBatch && !isGlobal) {
        return res.status(403).json({ message: 'Access denied. This exam is not assigned to you or your batch.' });
      }

      // Check attempt limit for students
      const studentResults = await db.results.find({ studentId: req.user.id, examId: req.params.id });
      const attemptCount = studentResults.filter(r => !r.reset).length;
      if (attemptCount >= 2) {
        return res.status(403).json({ message: 'Access denied. You have reached the maximum limit of 2 attempts for this exam.' });
      }
    }

    // Resolve questions
    let examQuestions = [];
    if (exam.questions && exam.questions.length > 0) {
      // Fetch specific questions
      const allQ = await db.questions.find({ _id: { $in: exam.questions } });
      examQuestions = allQ;
    } else if (exam.category) {
      // Dynamic random question generation
      const allCategoryQuestions = await db.questions.find({ category: exam.category });
      const targetCount = exam.totalQuestions || allCategoryQuestions.length;
      
      // Shuffle category questions and slice
      const shuffledPool = shuffle(allCategoryQuestions);
      examQuestions = shuffledPool.slice(0, Math.min(targetCount, shuffledPool.length));
    }

    // If user is a student, shuffle questions/options and strip correct answers
    if (req.user.role === 'student') {
      let preparedQuestions = examQuestions.map(q => {
        const options = exam.shuffleOptions ? shuffle(q.options) : q.options;
        return {
          _id: q._id,
          question: q.question,
          options,
          category: q.category,
          difficulty: q.difficulty
        };
      });

      if (exam.randomizeQuestions) {
        preparedQuestions = shuffle(preparedQuestions);
      }

      return res.json({
        _id: exam._id,
        title: exam.title,
        duration: exam.duration,
        category: exam.category,
        totalQuestions: preparedQuestions.length,
        passingMark: exam.passingMark,
        negativeMarking: exam.negativeMarking,
        questions: preparedQuestions
      });
    }

    // For admin, return full question data including correct answers
    res.json({
      ...exam,
      resolvedQuestions: examQuestions
    });
  } catch (error) {
    console.error('Fetch exam details error:', error);
    res.status(500).json({ message: 'Server error fetching exam details.' });
  }
});

// POST /api/exams (Admin only)
router.post('/', auth, adminOnly, async (req, res) => {
  try {
    const { 
      title, 
      duration, 
      category, 
      questions, 
      totalQuestions, 
      passingMark, 
      negativeMarking,
      randomizeQuestions,
      shuffleOptions,
      assignedStudentId,
      assignedBatch
    } = req.body;

    if (!title || !duration || !category) {
      return res.status(400).json({ message: 'Please provide exam title, duration, and category.' });
    }

    const newExam = await db.exams.insertOne({
      title,
      duration: Number(duration),
      category,
      questions: questions || [], // list of specific question IDs if defined
      totalQuestions: Number(totalQuestions) || (questions ? questions.length : 10),
      passingMark: Number(passingMark) || 50,
      negativeMarking: Number(negativeMarking) || 0,
      randomizeQuestions: randomizeQuestions ?? true,
      shuffleOptions: shuffleOptions ?? true,
      assignedStudentId: assignedStudentId || null,
      assignedBatch: assignedBatch || null
    });

    // Notify students
    if (assignedStudentId) {
      await db.notifications.insertOne({
        title: `New assessment assigned: "${title}"`,
        color: 'bg-indigo-500',
        path: '/?tab=exams',
        type: 'exam_assignment',
        recipientId: assignedStudentId,
        read: false
      });
    } else if (assignedBatch) {
      const cohortStudents = await db.students.find({ batch: assignedBatch, role: 'student' });
      for (const student of cohortStudents) {
        await db.notifications.insertOne({
          title: `New batch assessment: "${title}"`,
          color: 'bg-indigo-500',
          path: '/?tab=exams',
          type: 'exam_assignment',
          recipientId: student._id,
          read: false
        });
      }
    } else {
      // Global exam, notify all students
      const allStudents = await db.students.find({ role: 'student' });
      for (const student of allStudents) {
        await db.notifications.insertOne({
          title: `New assessment available: "${title}"`,
          color: 'bg-indigo-500',
          path: '/?tab=exams',
          type: 'exam_assignment',
          recipientId: student._id,
          read: false
        });
      }
    }

    res.status(201).json(newExam);
  } catch (error) {
    console.error('Create exam error:', error);
    res.status(500).json({ message: 'Server error creating exam.' });
  }
});


// DELETE /api/exams/:id (Admin only)
router.delete('/:id', auth, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const exam = await db.exams.findOne({ _id: id });
    if (!exam) {
      return res.status(404).json({ message: 'Exam not found.' });
    }

    await db.exams.deleteOne({ _id: id });
    res.json({ message: 'Exam deleted successfully.' });
  } catch (error) {
    console.error('Delete exam error:', error);
    res.status(500).json({ message: 'Server error deleting exam.' });
  }
});

export default router;
