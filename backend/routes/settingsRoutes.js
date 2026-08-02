import express from 'express';
import { getSettings, updateSettings } from '../controllers/settingsController.js';
import { protect, restrictToOwner } from '../middleware/auth.js';

const router = express.Router();

router.get('/', protect, getSettings);
router.put('/', protect, restrictToOwner, updateSettings);

export default router;
