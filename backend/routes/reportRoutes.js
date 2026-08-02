import express from 'express';
import { getDashboardSummary, getAuditLogs, getVisitsReport } from '../controllers/reportController.js';
import { protect, checkPermission } from '../middleware/auth.js';

const router = express.Router();

router.get('/summary', protect, getDashboardSummary);
router.get('/audit', protect, checkPermission('canViewLogs'), getAuditLogs);
router.get('/visits', protect, checkPermission('canViewReports'), getVisitsReport);

export default router;
