import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api, { API_HOST } from '../utils/api';
import {
  FiGrid,
  FiUsers,
  FiActivity,
  FiArrowRight,
  FiCalendar,
  FiSearch,
  FiUnlock,
  FiPlus,
  FiDownloadCloud
} from 'react-icons/fi';
import toast from 'react-hot-toast';

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, hasPermission } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchDashboardData = async () => {
    try {
      const response = await api.get('/reports/summary');
      if (response.data.success) {
        setData(response.data);
      }
    } catch (err) {
      toast.error('Failed to load dashboard data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/entry?search=${encodeURIComponent(searchQuery)}`);
    }
  };

  if (loading) {
    return (
      <div className="h-full flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm font-semibold tracking-wider text-zinc-400 uppercase">Loading Dashboard...</p>
      </div>
    );
  }

  const { summary, recentLogs = [], latestCustomers = [], latestVisits = [] } = data || {};

  const isElectron = !!window.electronAPI;

  const handleDownloadApp = () => {
    const downloadUrl = `${API_HOST}/uploads/DiamondLockerSetup.exe`;
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = 'DiamondLockerSetup.exe';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Downloading Desktop App Installer...');
  };

  return (
    <div className="space-y-6">
      
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
        <div className="flex items-center space-x-4">
          <div>
            <h2 className="text-xl font-bold tracking-tight">Dashboard Overview</h2>
            <p className="text-sm text-zinc-400 light:text-zinc-650">
              Welcome back, <span className="text-emerald-400 font-bold uppercase">{user?.username}</span>
            </p>
          </div>
          {!isElectron && (
            <button
              onClick={handleDownloadApp}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-black hover:bg-zinc-800 text-white text-[10px] font-bold shadow-md cursor-pointer transition-all active:scale-95 ml-2"
              title="Download Desktop App Installer"
            >
              <FiDownloadCloud className="w-3.5 h-3.5" />
              <span>Install App</span>
            </button>
          )}
        </div>

        {/* Global Search Bar */}
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-80">
          <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            placeholder="Search Locker / Customer / Mobile..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-zinc-900/60 light:bg-zinc-200/60 border border-zinc-800/80 light:border-zinc-300 focus:border-emerald-500 rounded-xl py-2.5 pl-10 pr-4 text-sm font-medium outline-none transition-all placeholder-zinc-500"
          />
        </form>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        
        {/* Total Lockers */}
        <div className="bg-zinc-900/40 light:bg-zinc-200/40 p-5 rounded-2xl border border-zinc-800/50 light:border-zinc-300/50 flex flex-col justify-between shadow-md">
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold text-zinc-500 light:text-zinc-550 uppercase tracking-wider">Total Lockers</span>
            <div className="p-2 rounded-lg bg-zinc-850 light:bg-zinc-300 text-zinc-400"><FiGrid className="w-4 h-4" /></div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold">{summary?.totalLockers || 0}</h3>
            <p className="text-[10px] text-zinc-400 mt-1">Configured in office</p>
          </div>
        </div>

        {/* Occupied Lockers */}
        <div className="bg-zinc-900/40 light:bg-zinc-200/40 p-5 rounded-2xl border border-zinc-800/50 light:border-zinc-300/50 flex flex-col justify-between shadow-md">
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold text-zinc-500 light:text-zinc-550 uppercase tracking-wider">Occupied</span>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400"><FiActivity className="w-4 h-4" /></div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold text-emerald-400">{summary?.occupiedLockers || 0}</h3>
            <p className="text-[10px] text-emerald-500 font-medium mt-1">
              {summary?.totalLockers ? Math.round((summary.occupiedLockers / summary.totalLockers) * 100) : 0}% Occupancy rate
            </p>
          </div>
        </div>

        {/* Available Lockers */}
        <div className="bg-zinc-900/40 light:bg-zinc-200/40 p-5 rounded-2xl border border-zinc-800/50 light:border-zinc-300/50 flex flex-col justify-between shadow-md">
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold text-zinc-500 light:text-zinc-550 uppercase tracking-wider">Available</span>
            <div className="p-2 rounded-lg bg-teal-500/10 text-teal-400"><FiUnlock className="w-4 h-4" /></div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold text-teal-400">{summary?.availableLockers || 0}</h3>
            <p className="text-[10px] text-zinc-400 mt-1">Ready for rent</p>
          </div>
        </div>

        {/* Total Customers */}
        <div className="bg-zinc-900/40 light:bg-zinc-200/40 p-5 rounded-2xl border border-zinc-800/50 light:border-zinc-300/50 flex flex-col justify-between shadow-md">
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold text-zinc-500 light:text-zinc-550 uppercase tracking-wider">Customers</span>
            <div className="p-2 rounded-lg bg-zinc-850 light:bg-zinc-300 text-zinc-400"><FiUsers className="w-4 h-4" /></div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold">{summary?.totalCustomers || 0}</h3>
            <p className="text-[10px] text-zinc-400 mt-1">Registered profiles</p>
          </div>
        </div>

        {/* Today's Entries */}
        <div className="bg-zinc-900/40 light:bg-zinc-200/40 p-5 rounded-2xl border border-zinc-800/50 light:border-zinc-300/50 flex flex-col justify-between shadow-md col-span-2 lg:col-span-1">
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold text-zinc-500 light:text-zinc-550 uppercase tracking-wider">Today's Visits</span>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400"><FiCalendar className="w-4 h-4" /></div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold text-emerald-400">{summary?.todayEntriesCount || 0}</h3>
            <p className="text-[10px] text-zinc-400 mt-1">Locker entries recorded</p>
          </div>
        </div>

      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Recent Visited Log entries */}
        <div className="lg:col-span-2 bg-zinc-900/20 light:bg-zinc-200/20 border border-zinc-800/40 light:border-zinc-300/40 rounded-3xl p-6 shadow-xl flex flex-col">
          <div className="flex items-center justify-between pb-4 border-b border-zinc-800/30 mb-4">
            <h4 className="font-bold text-sm tracking-wide uppercase">Recent Locker Activities</h4>
            <button
              onClick={() => navigate('/reports')}
              className="text-xs font-bold text-emerald-400 hover:text-emerald-300 flex items-center space-x-1.5 cursor-pointer"
            >
              <span>View All</span>
              <FiArrowRight />
            </button>
          </div>

          <div className="flex-1 overflow-x-auto">
            {latestVisits.length === 0 ? (
              <div className="py-12 text-center text-sm text-zinc-500">No visits logged today</div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="text-[10px] text-zinc-500 uppercase tracking-wider border-b border-zinc-800/30 pb-2">
                    <th className="pb-3">Customer</th>
                    <th className="pb-3">Locker</th>
                    <th className="pb-3">Verified By</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3">Time</th>
                  </tr>
                </thead>
                <tbody className="text-xs divide-y divide-zinc-900 light:divide-zinc-200">
                  {latestVisits.map((visit) => (
                    <tr key={visit._id} className="hover:bg-zinc-900/30 light:hover:bg-zinc-250/30 transition-colors">
                      <td className="py-3 font-semibold flex items-center space-x-2.5">
                        <img
                          src={visit.capturedPhotoUrl ? `${API_HOST}${visit.capturedPhotoUrl}` : 'https://placehold.co/100'}
                          alt={visit.customerName}
                          className="w-7 h-7 rounded-full object-cover border border-zinc-800"
                        />
                        <span>{visit.customerName}</span>
                      </td>
                      <td className="py-3 font-mono text-emerald-400 font-semibold">{visit.lockerNumber}</td>
                      <td className="py-3 text-zinc-400">{visit.staffName}</td>
                      <td className="py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                          visit.verificationStatus === 'verified'
                            ? 'bg-emerald-500/10 text-emerald-400'
                            : 'bg-amber-500/10 text-amber-400'
                        }`}>
                          {visit.verificationStatus}
                        </span>
                      </td>
                      <td className="py-3 text-zinc-500">
                        {new Date(visit.visitDateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Right Column: Latest Registered Customers */}
        <div className="bg-zinc-900/20 light:bg-zinc-200/20 border border-zinc-800/40 light:border-zinc-300/40 rounded-3xl p-6 shadow-xl flex flex-col">
          <div className="flex items-center justify-between pb-4 border-b border-zinc-800/30 mb-4">
            <h4 className="font-bold text-sm tracking-wide uppercase">New Enrollments</h4>
            {hasPermission('canRegisterCustomer') && (
              <button
                onClick={() => navigate('/customers/new')}
                className="p-1 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 hover:scale-105 active:scale-95 transition-all cursor-pointer"
                title="Add New Customer"
              >
                <FiPlus className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex-1 space-y-4">
            {latestCustomers.length === 0 ? (
              <div className="py-12 text-center text-sm text-zinc-500">No customers registered yet</div>
            ) : (
              latestCustomers.map((cust) => (
                <div
                  key={cust._id}
                  onClick={() => navigate(`/customers/${cust._id}`)}
                  className="flex items-center justify-between p-2.5 rounded-xl hover:bg-zinc-900/40 light:hover:bg-zinc-250/30 transition-all cursor-pointer border border-transparent hover:border-zinc-800/30"
                >
                  <div className="flex items-center space-x-3">
                    <img
                      src={cust.photoUrl ? `${API_HOST}${cust.photoUrl}` : 'https://placehold.co/100'}
                      alt={cust.name}
                      className="w-9 h-9 rounded-full object-cover border border-zinc-800"
                    />
                    <div>
                      <p className="text-xs font-bold">{cust.name}</p>
                      <p className="text-[10px] text-zinc-500 font-semibold">{cust.mobile}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-mono font-bold text-emerald-400">
                      Locker {cust.lockerId?.lockerNumber || 'Unassigned'}
                    </p>
                    <p className="text-[9px] text-zinc-500">
                      {new Date(cust.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* Lower Row: Full System Activity Logs (Audit Trail) */}
      {(user?.role === 'owner' || hasPermission('canViewLogs')) && (
        <div className="bg-zinc-900/20 light:bg-zinc-200/20 border border-zinc-800/40 light:border-zinc-300/40 rounded-3xl p-6 shadow-xl">
          <div className="flex items-center justify-between pb-4 border-b border-zinc-800/30 mb-4">
            <h4 className="font-bold text-sm tracking-wide uppercase">Audit Logs (Recent Trails)</h4>
            <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-800 text-zinc-500 font-bold uppercase tracking-wider">
              Immutable
            </span>
          </div>

          <div className="space-y-3">
            {recentLogs.slice(0, 5).map((log) => (
              <div
                key={log._id}
                className="flex flex-col md:flex-row md:items-center justify-between p-3 rounded-xl bg-zinc-900/30 light:bg-zinc-200/30 border border-zinc-800/20 text-xs gap-2"
              >
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 mt-1"></div>
                  <div>
                    <p className="font-semibold text-zinc-300 light:text-zinc-800">{log.remarks}</p>
                    <div className="flex items-center space-x-2 text-[9px] text-zinc-500 mt-0.5">
                      <span className="font-bold uppercase text-emerald-400">@{log.username}</span>
                      <span>•</span>
                      <span>Module: {log.module}</span>
                      <span>•</span>
                      <span>Action: {log.action}</span>
                    </div>
                  </div>
                </div>
                <div className="text-[10px] text-zinc-500 text-right min-w-[120px]">
                  {new Date(log.createdAt).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};

export default Dashboard;
