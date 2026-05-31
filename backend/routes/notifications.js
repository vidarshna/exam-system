import express from 'express';
import { db } from '../config/db.js';
import { auth } from '../middleware/auth.js';

const router = express.Router();

// GET /api/notifications
// Fetch all notifications for the user
router.get('/', auth, async (req, res) => {
  try {
    const list = await db.notifications.find({});
    
    // Admin sees global notifications (recipientId undefined/null)
    // Students see only notifications assigned to them (recipientId === studentId)
    const filtered = list.filter(n => 
      req.user.role === 'admin' ? !n.recipientId : n.recipientId === req.user.id
    );

    // Sort by createdAt descending
    filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json(filtered);
  } catch (error) {
    console.error('Fetch notifications error:', error);
    res.status(500).json({ message: 'Server error retrieving notifications.' });
  }
});

// PUT /api/notifications/read
// Mark all user notifications as read
router.put('/read', auth, async (req, res) => {
  try {
    const allNotifications = await db.notifications.find({});
    for (const n of allNotifications) {
      const isMine = req.user.role === 'admin' ? !n.recipientId : n.recipientId === req.user.id;
      if (isMine && !n.read) {
        await db.notifications.updateOne({ _id: n._id }, { read: true });
      }
    }
    res.json({ message: 'All notifications marked as read.' });
  } catch (error) {
    console.error('Mark read notifications error:', error);
    res.status(500).json({ message: 'Server error marking notifications as read.' });
  }
});

// PUT /api/notifications/:id/read
// Mark a specific notification as read
router.put('/:id/read', auth, async (req, res) => {
  try {
    const n = await db.notifications.findOne({ _id: req.params.id });
    if (!n) {
      return res.status(404).json({ message: 'Notification not found.' });
    }
    const isMine = req.user.role === 'admin' ? !n.recipientId : n.recipientId === req.user.id;
    if (!isMine) {
      return res.status(403).json({ message: 'Access denied.' });
    }
    await db.notifications.updateOne({ _id: req.params.id }, { read: true });
    res.json({ message: 'Notification marked as read.' });
  } catch (error) {
    console.error('Mark read notification error:', error);
    res.status(500).json({ message: 'Server error marking notification as read.' });
  }
});

// DELETE /api/notifications
// Clear all user notifications
router.delete('/', auth, async (req, res) => {
  try {
    const allNotifications = await db.notifications.find({});
    for (const n of allNotifications) {
      const isMine = req.user.role === 'admin' ? !n.recipientId : n.recipientId === req.user.id;
      if (isMine) {
        await db.notifications.deleteOne({ _id: n._id });
      }
    }
    res.json({ message: 'All notifications cleared successfully.' });
  } catch (error) {
    console.error('Clear notifications error:', error);
    res.status(500).json({ message: 'Server error clearing notifications.' });
  }
});

export default router;
