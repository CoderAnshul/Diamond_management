import Locker from '../models/Locker.js';
import Customer from '../models/Customer.js';
import LockerEntry from '../models/LockerEntry.js';
import ActivityLog from '../models/ActivityLog.js';

export const getDashboardSummary = async (req, res) => {
  try {
    const totalLockers = await Locker.countDocuments({});
    const occupiedLockers = await Locker.countDocuments({ status: 'occupied' });
    const availableLockers = await Locker.countDocuments({ status: 'available' });
    const maintenanceLockers = await Locker.countDocuments({ status: 'maintenance' });
    const totalCustomers = await Customer.countDocuments({ isDeleted: false });

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);
    
    const todayEntriesCount = await LockerEntry.countDocuments({
      visitDateTime: { $gte: startOfToday, $lte: endOfToday }
    });

    let recentLogs = [];
    if (req.user.role === 'owner' || req.user.permissions.canViewLogs) {
      recentLogs = await ActivityLog.find({})
        .sort({ createdAt: -1 })
        .limit(10);
    }

    const latestCustomers = await Customer.find({ isDeleted: false })
      .populate('lockerId', 'lockerNumber')
      .sort({ createdAt: -1 })
      .limit(5);

    const latestVisits = await LockerEntry.find({})
      .sort({ visitDateTime: -1 })
      .limit(5);

    res.status(200).json({
      success: true,
      summary: {
        totalLockers,
        occupiedLockers,
        availableLockers,
        maintenanceLockers,
        totalCustomers,
        todayEntriesCount
      },
      recentLogs,
      latestCustomers,
      latestVisits
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getAuditLogs = async (req, res) => {
  const { username, action, module, dateFrom, dateTo, page = 1, limit = 20 } = req.query;
  try {
    const query = {};
    if (username) query.username = { $regex: username, $options: 'i' };
    if (action) query.action = action;
    if (module) query.module = module;

    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
      if (dateTo) {
        const endOfDate = new Date(dateTo);
        endOfDate.setHours(23, 59, 59, 999);
        query.createdAt.$lte = endOfDate;
      }
    }

    const count = await ActivityLog.countDocuments(query);
    const logs = await ActivityLog.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.status(200).json({
      success: true,
      count,
      totalPages: Math.ceil(count / limit),
      currentPage: Number(page),
      logs
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getVisitsReport = async (req, res) => {
  const { dateFrom, dateTo, customerId, lockerNumber, staffId, verificationStatus } = req.query;
  try {
    const query = {};
    if (customerId) query.customerId = customerId;
    if (staffId) query.handledByStaffId = staffId;
    if (verificationStatus) query.verificationStatus = verificationStatus;
    if (lockerNumber) query.lockerNumber = lockerNumber;

    if (dateFrom || dateTo) {
      query.visitDateTime = {};
      if (dateFrom) query.visitDateTime.$gte = new Date(dateFrom);
      if (dateTo) {
        const endOfDay = new Date(dateTo);
        endOfDay.setHours(23, 59, 59, 999);
        query.visitDateTime.$lte = endOfDay;
      }
    }

    const entries = await LockerEntry.find(query).sort({ visitDateTime: -1 });
    res.status(200).json({ success: true, entries });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
