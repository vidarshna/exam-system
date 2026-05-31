import express from 'express';
import { db } from '../config/db.js';
import { auth, adminOnly } from '../middleware/auth.js';

const router = express.Router();

// GET /api/questions
// Query params: category, difficulty
router.get('/', auth, async (req, res) => {
  try {
    const { category, difficulty } = req.query;
    const filter = {};
    if (category) filter.category = category;
    if (difficulty) filter.difficulty = difficulty;

    const questions = await db.questions.find(filter);
    res.json(questions);
  } catch (error) {
    console.error('Fetch questions error:', error);
    res.status(500).json({ message: 'Server error fetching questions.' });
  }
});

// POST /api/questions (Admin only)
router.post('/', auth, adminOnly, async (req, res) => {
  try {
    const { question, options, correctAnswer, category, difficulty } = req.body;

    if (!question || !options || !correctAnswer || !category) {
      return res.status(400).json({ message: 'Missing required question fields.' });
    }

    if (!Array.isArray(options) || options.length < 2) {
      return res.status(400).json({ message: 'Questions must have at least 2 options.' });
    }

    if (!options.includes(correctAnswer)) {
      return res.status(400).json({ message: 'Correct answer must match one of the options.' });
    }

    const newQuestion = await db.questions.insertOne({
      question,
      options,
      correctAnswer,
      category,
      difficulty: difficulty || 'Medium'
    });

    // Create live notification for admin
    await db.notifications.insertOne({
      title: `Question bank updated: New question added in ${newQuestion.category}`,
      color: 'bg-purple-500',
      path: '/admin/questions',
      type: 'question_update',
      read: false
    });

    res.status(201).json(newQuestion);
  } catch (error) {
    console.error('Create question error:', error);
    res.status(500).json({ message: 'Server error creating question.' });
  }
});

// PUT /api/questions/:id (Admin only)
router.put('/:id', auth, adminOnly, async (req, res) => {
  try {
    const { question, options, correctAnswer, category, difficulty } = req.body;
    const { id } = req.params;

    const existing = await db.questions.findOne({ _id: id });
    if (!existing) {
      return res.status(404).json({ message: 'Question not found.' });
    }

    if (options && (!Array.isArray(options) || options.length < 2)) {
      return res.status(400).json({ message: 'Questions must have at least 2 options.' });
    }

    if (options && correctAnswer && !options.includes(correctAnswer)) {
      return res.status(400).json({ message: 'Correct answer must match one of the options.' });
    }

    const updateDoc = {};
    if (question) updateDoc.question = question;
    if (options) updateDoc.options = options;
    if (correctAnswer) updateDoc.correctAnswer = correctAnswer;
    if (category) updateDoc.category = category;
    if (difficulty) updateDoc.difficulty = difficulty;

    const result = await db.questions.updateOne({ _id: id }, { $set: updateDoc });

    // Create live notification for admin
    await db.notifications.insertOne({
      title: `Question bank updated: Question in ${result.doc.category || 'bank'} modified`,
      color: 'bg-purple-500',
      path: '/admin/questions',
      type: 'question_update',
      read: false
    });

    res.json({ message: 'Question updated successfully.', question: result.doc });
  } catch (error) {
    console.error('Update question error:', error);
    res.status(500).json({ message: 'Server error updating question.' });
  }
});

// DELETE /api/questions/:id (Admin only)
router.delete('/:id', auth, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await db.questions.findOne({ _id: id });
    if (!existing) {
      return res.status(404).json({ message: 'Question not found.' });
    }

    await db.questions.deleteOne({ _id: id });

    // Create live notification for admin
    await db.notifications.insertOne({
      title: `Question bank updated: Question deleted`,
      color: 'bg-purple-500',
      path: '/admin/questions',
      type: 'question_update',
      read: false
    });

    res.json({ message: 'Question deleted successfully.' });
  } catch (error) {
    console.error('Delete question error:', error);
    res.status(500).json({ message: 'Server error deleting question.' });
  }
});

// POST /api/questions/import (Admin only - bulk import JSON list)
router.post('/import', auth, adminOnly, async (req, res) => {
  try {
    const list = req.body;
    if (!Array.isArray(list)) {
      return res.status(400).json({ message: 'Body must be an array of questions.' });
    }

    // Basic validation
    const validQuestions = [];
    for (const q of list) {
      if (q.question && Array.isArray(q.options) && q.correctAnswer && q.category) {
        if (q.options.includes(q.correctAnswer)) {
          validQuestions.push({
            question: q.question,
            options: q.options,
            correctAnswer: q.correctAnswer,
            category: q.category,
            difficulty: q.difficulty || 'Medium'
          });
        }
      }
    }

    if (validQuestions.length === 0) {
      return res.status(400).json({ message: 'No valid questions found to import.' });
    }

    const created = await db.questions.insertMany(validQuestions);

    // Create live notification for admin
    await db.notifications.insertOne({
      title: `Question bank updated: Imported ${created.length} questions`,
      color: 'bg-purple-500',
      path: '/admin/questions',
      type: 'question_update',
      read: false
    });

    res.status(201).json({ message: `Successfully imported ${created.length} questions.`, count: created.length });
  } catch (error) {
    console.error('Bulk import error:', error);
    res.status(500).json({ message: 'Server error during question import.' });
  }
});

export default router;
