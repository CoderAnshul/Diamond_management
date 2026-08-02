import express from 'express';
import {
  searchCustomerForVisit,
  createVisitEntry,
  getVisitEntries
} from '../controllers/entryController.js';
import { protect, checkPermission } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';

const router = express.Router();

const fileUploads = upload.fields([
  { name: 'capturedPhoto', maxCount: 1 }
]);

router.get('/search', protect, searchCustomerForVisit);
router.post('/', protect, checkPermission('canCreateLockerEntry'), fileUploads, createVisitEntry);
router.get('/', protect, getVisitEntries);

export default router;
