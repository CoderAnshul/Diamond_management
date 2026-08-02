import express from 'express';
import {
  getBackupHistory,
  triggerManualBackup,
  restoreBackup,
  downloadBackupFile
} from '../controllers/backupController.js';
import { protect, restrictToOwner } from '../middleware/auth.js';

const router = express.Router();

router.get('/', protect, restrictToOwner, getBackupHistory);
router.post('/trigger', protect, restrictToOwner, triggerManualBackup);
router.post('/restore/:id', protect, restrictToOwner, restoreBackup);
router.get('/download/:id', protect, restrictToOwner, downloadBackupFile);

export default router;
