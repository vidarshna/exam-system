import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-exam-system-token-key';

export const auth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authorization denied. Token is missing.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Token is invalid or expired.' });
  }
};

export const adminOnly = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Authorization denied. User details not verified.' });
  }
  
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Access denied. Administrator privileges required.' });
  }

  next();
};

export const studentOnly = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Authorization denied. User details not verified.' });
  }

  if (req.user.role !== 'student') {
    return res.status(403).json({ message: 'Access denied. Student privileges required.' });
  }

  next();
};
