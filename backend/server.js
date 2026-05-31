import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import authRoutes, { seedDefaultUsers } from './routes/auth.js';
import questionRoutes from './routes/questions.js';
import examRoutes from './routes/exams.js';
import resultRoutes from './routes/results.js';
import notificationRoutes from './routes/notifications.js';
import { seedQuestions } from './database/seeder.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5050;


// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Express route registrations
app.use('/api/auth', authRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/exams', examRoutes);
app.use('/api/results', resultRoutes);
app.use('/api/notifications', notificationRoutes);

// Health Check / Ping
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Exam system server is running smoothly.' });
});

// Initialize database data and boot server
async function startServer() {
  try {
    console.log('Initializing local Database Systems...');
    
    // Seed default credentials and questions bank
    await seedDefaultUsers();
    await seedQuestions();

    app.listen(PORT, () => {
      console.log(`===============================================`);
      console.log(`   Exam System Backend running on port ${PORT} `);
      console.log(`===============================================`);
    });
  } catch (error) {
    console.error('Failed to initialize database or start server:', error);
    process.exit(1);
  }
}

startServer();
