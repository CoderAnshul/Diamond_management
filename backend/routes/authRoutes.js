import express from 'express';
import { login, getMe, createTeamMember, updatePermissions, getUsers, deleteUser } from '../controllers/authController.js';
import { protect, restrictToOwner } from '../middleware/auth.js';

const router = express.Router();

router.post('/login', login);
router.get('/me', protect, getMe);
router.get('/users', protect, getUsers);
router.post('/users', protect, restrictToOwner, createTeamMember);
router.put('/users/:id', protect, restrictToOwner, updatePermissions);
router.delete('/users/:id', protect, restrictToOwner, deleteUser);

export default router;
