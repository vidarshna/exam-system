import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../config/db.js';
import { auth } from '../middleware/auth.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-exam-system-token-key';

// Auto-seed default credentials if they don't exist
export async function seedDefaultUsers() {
  try {
    const adminExists = await db.students.findOne({ role: 'admin' });
    if (!adminExists) {
      const hashedAdminPassword = await bcrypt.hash('admin123', 10);
      await db.students.insertOne({
        name: 'System Administrator',
        email: 'admin@exam.com',
        password: hashedAdminPassword,
        batch: 'Trainer Core',
        role: 'admin'
      });
      console.log('Seeded default admin credentials: admin@exam.com / admin123');
    }

    const studentExists = await db.students.findOne({ role: 'student' });
    if (!studentExists) {
      const hashedStudentPassword = await bcrypt.hash('student123', 10);
      await db.students.insertOne({
        name: 'Vidarshna',
        email: 'student@exam.com',
        password: hashedStudentPassword,
        batch: 'Web Development',
        role: 'student'
      });
      console.log('Seeded default student credentials: student@exam.com / student123');
    }
  } catch (error) {
    console.error('Error seeding default users:', error);
  }
}

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, batch } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Please provide name, email, and password.' });
    }

    const userExists = await db.students.findOne({ email: email.toLowerCase() });
    if (userExists) {
      return res.status(400).json({ message: 'User with this email already exists.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newStudent = await db.students.insertOne({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      batch: batch || 'Web Development',
      role: 'student' // default is student, admin role can be set inside database
    });

    // Create live notification for admin
    await db.notifications.insertOne({
      title: `New student registered: ${newStudent.name}`,
      color: 'bg-indigo-500',
      path: '/admin/students',
      type: 'registration',
      read: false
    });

    // Create live notification for student
    await db.notifications.insertOne({
      title: `Welcome, ${newStudent.name}! Explore "Available Exams" to start.`,
      color: 'bg-indigo-500',
      path: '/?tab=exams',
      type: 'welcome',
      recipientId: newStudent._id,
      read: false
    });

    const token = jwt.sign(
      { id: newStudent._id, name: newStudent.name, email: newStudent.email, role: newStudent.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      token,
      user: {
        _id: newStudent._id,
        name: newStudent.name,
        email: newStudent.email,
        role: newStudent.role,
        batch: newStudent.batch,
        bio: newStudent.bio || '',
        gitHubUrl: newStudent.gitHubUrl || '',
        linkedInUrl: newStudent.linkedInUrl || '',
        avatar: newStudent.avatar || ''
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ message: 'Server error during registration.' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide email and password.' });
    }

    const user = await db.students.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials.' });
    }

    const token = jwt.sign(
      { id: user._id, name: user.name, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        batch: user.batch,
        bio: user.bio || '',
        gitHubUrl: user.gitHubUrl || '',
        linkedInUrl: user.linkedInUrl || '',
        avatar: user.avatar || ''
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login.' });
  }
});

// GET /api/auth/me
router.get('/me', auth, async (req, res) => {
  try {
    const user = await db.students.findOne({ _id: req.user.id });
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      batch: user.batch,
      bio: user.bio || '',
      gitHubUrl: user.gitHubUrl || '',
      linkedInUrl: user.linkedInUrl || '',
      avatar: user.avatar || ''
    });
  } catch (error) {
    console.error('Fetch user error:', error);
    res.status(500).json({ message: 'Server error fetching user details.' });
  }
});

// PUT /api/auth/profile
router.put('/profile', auth, async (req, res) => {
  try {
    const { name, bio, gitHubUrl, linkedInUrl, avatar } = req.body;
    
    const updateDoc = {};
    if (name !== undefined) updateDoc.name = name;
    if (bio !== undefined) updateDoc.bio = bio;
    if (gitHubUrl !== undefined) updateDoc.gitHubUrl = gitHubUrl;
    if (linkedInUrl !== undefined) updateDoc.linkedInUrl = linkedInUrl;
    if (avatar !== undefined) updateDoc.avatar = avatar;

    await db.students.updateOne({ _id: req.user.id }, { $set: updateDoc });
    const updatedUser = await db.students.findOne({ _id: req.user.id });

    res.json({
      _id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      role: updatedUser.role,
      batch: updatedUser.batch,
      bio: updatedUser.bio || '',
      gitHubUrl: updatedUser.gitHubUrl || '',
      linkedInUrl: updatedUser.linkedInUrl || '',
      avatar: updatedUser.avatar || ''
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Server error updating profile details.' });
  }
});

// GET /api/auth/students (Admin can view all students)
router.get('/students', auth, async (req, res) => {
  try {
    const allUsers = await db.students.find({});
    // Exclude passwords
    const filtered = allUsers.map(user => ({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      batch: user.batch,
      createdAt: user.createdAt
    }));
    res.json(filtered);
  } catch (error) {
    console.error('Fetch students error:', error);
    res.status(500).json({ message: 'Server error fetching students list.' });
  }
});

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: 'Please provide email address.' });
    }

    const user = await db.students.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({ message: 'No registered account found with this email address.' });
    }

    // Reset password to default 'reset123'
    const hashedResetPassword = await bcrypt.hash('reset123', 10);
    await db.students.updateOne({ _id: user._id }, { $set: { password: hashedResetPassword } });

    res.json({ 
      message: 'Password recovery processed successfully.',
      tempPassword: 'reset123' 
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ message: 'Server error during password recovery.' });
  }
});

// PUT /api/auth/students/:id (Admin can update any student/admin)
router.put('/students/:id', auth, async (req, res) => {
  try {
    // Verify caller is admin
    const caller = await db.students.findOne({ _id: req.user.id });
    if (!caller || caller.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Administrator privileges required.' });
    }

    const { name, email, batch, role, status } = req.body;
    
    const updateDoc = {};
    if (name !== undefined) updateDoc.name = name;
    if (email !== undefined) updateDoc.email = email.toLowerCase();
    if (batch !== undefined) updateDoc.batch = batch;
    if (role !== undefined) updateDoc.role = role;
    if (status !== undefined) updateDoc.status = status; // Active or Inactive

    await db.students.updateOne({ _id: req.params.id }, { $set: updateDoc });
    
    res.json({ message: 'Student registry details updated successfully.' });
  } catch (error) {
    console.error('Admin student update error:', error);
    res.status(500).json({ message: 'Server error updating student record.' });
  }
});

export default router;
