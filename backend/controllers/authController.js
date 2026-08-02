import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import { logActivity } from '../utils/activityLogger.js';

export const login = async (req, res) => {
  const { username, password } = req.body;
  try {
    if (!username || !password) {
      return res.status(400).json({ success: false, error: 'Please enter both username and password' });
    }

    const user = await User.findOne({ username });
    if (!user || !user.isActive) {
      return res.status(401).json({ success: false, error: 'Invalid credentials or inactive user' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN
    });

    await logActivity({
      userId: user._id,
      username: user.username,
      action: 'LOGIN',
      module: 'Auth',
      remarks: 'Logged in successfully',
      ipAddress: req.ip
    });

    res.status(200).json({
      success: true,
      token,
      user: {
        id: user._id,
        username: user.username,
        role: user.role,
        permissions: user.permissions
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getMe = async (req, res) => {
  res.status(200).json({
    success: true,
    user: {
      id: req.user._id,
      username: req.user.username,
      role: req.user.role,
      permissions: req.user.permissions
    }
  });
};

export const createTeamMember = async (req, res) => {
  const { username, password, permissions } = req.body;
  try {
    if (!username || !password) {
      return res.status(400).json({ success: false, error: 'Please provide username and password' });
    }

    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ success: false, error: 'Username already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const newUser = await User.create({
      username,
      passwordHash,
      role: 'staff',
      permissions: permissions || {},
      isActive: true
    });

    await logActivity({
      userId: req.user._id,
      username: req.user.username,
      action: 'CREATE_STAFF',
      module: 'UserManagement',
      remarks: `Created staff member: ${username}`,
      ipAddress: req.ip
    });

    res.status(201).json({
      success: true,
      user: {
        id: newUser._id,
        username: newUser.username,
        role: newUser.role,
        permissions: newUser.permissions,
        isActive: newUser.isActive
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const updatePermissions = async (req, res) => {
  const { permissions, isActive } = req.body;
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    if (user.role === 'owner') {
      return res.status(400).json({ success: false, error: 'Cannot modify owner permissions' });
    }

    if (permissions !== undefined) user.permissions = permissions;
    if (isActive !== undefined) user.isActive = isActive;

    await user.save();

    await logActivity({
      userId: req.user._id,
      username: req.user.username,
      action: 'UPDATE_STAFF_PERMISSIONS',
      module: 'UserManagement',
      remarks: `Updated permissions/status for staff member: ${user.username}`,
      ipAddress: req.ip
    });

    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        username: user.username,
        role: user.role,
        permissions: user.permissions,
        isActive: user.isActive
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getUsers = async (req, res) => {
  try {
    const { includeOwner } = req.query;
    const query = {};
    if (includeOwner !== 'true') {
      query.role = { $ne: 'owner' };
    }
    const users = await User.find(query).select('-passwordHash');
    res.status(200).json({ success: true, users });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    if (user.role === 'owner') {
      return res.status(400).json({ success: false, error: 'Cannot delete owner' });
    }

    await User.findByIdAndDelete(req.params.id);

    await logActivity({
      userId: req.user._id,
      username: req.user.username,
      action: 'DELETE_STAFF',
      module: 'UserManagement',
      remarks: `Deleted staff member: ${user.username}`,
      ipAddress: req.ip
    });

    res.status(200).json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
