import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import connectDB from './config/db.js';
import User from './models/User.js';
import bcrypt from 'bcryptjs';
import Locker from './models/Locker.js';

// Route Imports
import authRoutes from './routes/authRoutes.js';
import customerRoutes from './routes/customerRoutes.js';
import lockerRoutes from './routes/lockerRoutes.js';
import entryRoutes from './routes/entryRoutes.js';
import backupRoutes from './routes/backupRoutes.js';
import settingsRoutes from './routes/settingsRoutes.js';
import reportRoutes from './routes/reportRoutes.js';

// Backup Service
import { createSystemBackup } from './services/backupService.js';

// Load Env
dotenv.config();

// Ensure upload storage directories exist
const setupStorage = () => {
  const dirs = [
    'storage/uploads/photos',
    'storage/uploads/docs',
    'storage/backups'
  ];
  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
};
setupStorage();

// Connect Database
connectDB();

const app = express();

// Middlewares
app.use(helmet({
  crossOriginResourcePolicy: false // Allows loading images from backend statically
}));
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(morgan('dev'));

// Rate Limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per windowMs
  message: { error: 'Too many requests from this IP, please try again after 15 minutes' }
});
app.use('/api/', apiLimiter);

// Serve uploads statically
app.use('/uploads', express.static(path.resolve('storage/uploads')));

// Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/customers', customerRoutes);
app.use('/api/v1/lockers', lockerRoutes);
app.use('/api/v1/entries', entryRoutes);
app.use('/api/v1/backups', backupRoutes);
app.use('/api/v1/settings', settingsRoutes);
app.use('/api/v1/reports', reportRoutes);

// Error Handling Middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal Server Error'
  });
});

// Seed default owner account if database is empty
const seedOwnerUser = async () => {
  try {
    const ownerCount = await User.countDocuments({ role: 'owner' });
    if (ownerCount === 0) {
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash('password123', salt);
      await User.create({
        username: 'owner',
        passwordHash,
        role: 'owner',
        permissions: {
          canRegisterCustomer: true,
          canEditCustomer: true,
          canDeleteCustomer: true,
          canManageLockers: true,
          canCreateLockerEntry: true,
          canViewReports: true,
          canViewLogs: true
        },
        isActive: true
      });
      console.log('--- SYSTEM INITIALIZATION ---');
      console.log('Seeded Master Owner Account:');
      console.log('Username: owner');
      console.log('Password: password123');
      console.log('-----------------------------');
    }
  } catch (err) {
    console.error('Failed to seed owner credentials:', err.message);
  }
};

// Start Scheduled Backup Interval (24 hours)
const startBackupInterval = () => {
  const intervalMs = 24 * 60 * 60 * 1000;
  setInterval(async () => {
    try {
      console.log('Running scheduled daily system backup...');
      await createSystemBackup('auto');
      console.log('Daily backup completed successfully.');
    } catch (err) {
      console.error('Daily backup failed:', err.message);
    }
  }, intervalMs);
};

const PORT = process.env.PORT || 5000;
app.listen(PORT, async () => {
  console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  await seedOwnerUser();
  try {
    await Locker.updateMany({ size: 'a' }, { size: 'A' });
    await Locker.updateMany({ size: 'b' }, { size: 'B' });
    await Locker.updateMany({ size: 'c' }, { size: 'C' });
  } catch (err) {
    console.error('Locker size migration failed:', err.message);
  }
  startBackupInterval();
});
