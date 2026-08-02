import express from 'express';
import {
  getLockers,
  getLockerById,
  createLocker,
  updateLocker,
  deleteLocker,
  assignLocker,
  vacateLocker,
  transferLocker
} from '../controllers/lockerController.js';
import { protect, restrictToOwner, checkPermission } from '../middleware/auth.js';

const router = express.Router();

router.get('/', protect, getLockers);
router.get('/:id', protect, getLockerById);
router.post('/', protect, checkPermission('canManageLockers'), createLocker);
router.put('/:id', protect, checkPermission('canManageLockers'), updateLocker);
router.delete('/:id', protect, restrictToOwner, deleteLocker);
router.post('/:id/assign', protect, checkPermission('canRegisterCustomer'), assignLocker);
router.post('/:id/vacate', protect, checkPermission('canManageLockers'), vacateLocker);
router.post('/:id/transfer', protect, checkPermission('canManageLockers'), transferLocker);

export default router;
