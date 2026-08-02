import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const protect = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ success: false, error: 'Not authorized to access this route' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user || !user.isActive) {
      return res.status(401).json({ success: false, error: 'User session is inactive or invalid' });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, error: 'Not authorized, token failed' });
  }
};

export const restrictToOwner = (req, res, next) => {
  if (req.user && req.user.role === 'owner') {
    next();
  } else {
    res.status(403).json({ success: false, error: 'Forbidden: Access restricted to Owner only' });
  }
};

export const checkPermission = (permission) => {
  return (req, res, next) => {
    // Owner bypasses all checks; otherwise check individual permission
    if (req.user && (req.user.role === 'owner' || req.user.permissions[permission] === true)) {
      return next();
    }
    res.status(403).json({ success: false, error: `Forbidden: Missing permission [${permission}]` });
  };
};
