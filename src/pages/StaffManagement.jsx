import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { FiUserCheck, FiPlus, FiTrash2, FiKey, FiLock, FiEyeOff } from 'react-icons/fi';
import toast from 'react-hot-toast';

const StaffManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // New staff form states
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [permissions, setPermissions] = useState({
    canRegisterCustomer: true,
    canEditCustomer: true,
    canDeleteCustomer: false,
    canManageLockers: false,
    canCreateLockerEntry: true,
    canViewReports: true,
    canViewLogs: false
  });

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await api.get('/auth/users');
      if (response.data.success) {
        setUsers(response.data.users);
      }
    } catch (err) {
      toast.error('Failed to load staff list');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleTogglePermission = async (userId, permName) => {
    const userToUpdate = users.find(u => u._id === userId);
    if (!userToUpdate) return;

    const updatedPermissions = {
      ...userToUpdate.permissions,
      [permName]: !userToUpdate.permissions[permName]
    };

    try {
      const response = await api.put(`/auth/users/${userId}`, {
        permissions: updatedPermissions
      });
      if (response.data.success) {
        toast.success(`Permission updated for ${userToUpdate.username}`);
        fetchUsers();
      }
    } catch (err) {
      toast.error('Failed to update permissions');
    }
  };

  const handleToggleActive = async (userId, currentActive) => {
    const userToUpdate = users.find(u => u._id === userId);
    if (!userToUpdate) return;

    try {
      const response = await api.put(`/auth/users/${userId}`, {
        isActive: !currentActive
      });
      if (response.data.success) {
        toast.success(`${userToUpdate.username} account status toggled`);
        fetchUsers();
      }
    } catch (err) {
      toast.error('Failed to toggle status');
    }
  };

  const handleCreateStaff = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      toast.error('Username and password are required');
      return;
    }

    try {
      const response = await api.post('/auth/users', {
        username,
        password,
        permissions
      });
      if (response.data.success) {
        toast.success('Staff member registered successfully');
        setUsername('');
        setPassword('');
        setPermissions({
          canRegisterCustomer: true,
          canEditCustomer: true,
          canDeleteCustomer: false,
          canManageLockers: false,
          canCreateLockerEntry: true,
          canViewReports: true,
          canViewLogs: false
        });
        fetchUsers();
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Registration failed');
    }
  };

  const handleDeleteStaff = async (id, name) => {
    if (window.confirm(`Delete staff member ${name}?`)) {
      try {
        const response = await api.delete(`/auth/users/${id}`);
        if (response.data.success) {
          toast.success('Staff member deleted');
          fetchUsers();
        }
      } catch (err) {
        toast.error('Deletion failed');
      }
    }
  };

  const permissionLabels = {
    canRegisterCustomer: 'Register Customer',
    canEditCustomer: 'Edit Customer',
    canDeleteCustomer: 'Delete Records',
    canManageLockers: 'Configure Lockers',
    canCreateLockerEntry: 'Locker Check-Ins',
    canViewReports: 'View Reports',
    canViewLogs: 'View Audit Logs'
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold tracking-tight">Staff & Permissions Management</h2>
        <p className="text-sm text-zinc-400">Manage internal team members permissions matrix</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Register Team Member Form */}
        <div className="bg-zinc-900/10 light:bg-zinc-200/10 border border-zinc-900 light:border-zinc-300 rounded-3xl p-6 shadow-xl h-fit">
          <h4 className="font-bold text-xs uppercase tracking-wider text-emerald-400 mb-4 flex items-center space-x-1.5">
            <FiPlus /> <span>Add Team Member</span>
          </h4>

          <form onSubmit={handleCreateStaff} className="space-y-4 text-xs">
            {/* Username */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-zinc-500 uppercase">Username</label>
              <input
                type="text"
                placeholder="Enter username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-850 rounded-xl py-2 px-3 outline-none"
              />
            </div>

            {/* Password */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-zinc-500 uppercase">Password</label>
              <input
                type="password"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-850 rounded-xl py-2 px-3 outline-none"
              />
            </div>

            {/* Initial Permissions Checklist */}
            <div className="space-y-2 border-t border-zinc-850 pt-3">
              <label className="text-[9px] font-bold text-zinc-500 uppercase block mb-1">Default Permissions</label>
              {Object.keys(permissions).map(perm => (
                <label key={perm} className="flex items-center space-x-2 cursor-pointer hover:text-zinc-350 py-0.5">
                  <input
                    type="checkbox"
                    checked={permissions[perm]}
                    onChange={() => setPermissions(prev => ({ ...prev, [perm]: !prev[perm] }))}
                    className="accent-emerald-500 cursor-pointer"
                  />
                  <span>{permissionLabels[perm]}</span>
                </label>
              ))}
            </div>

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-450 hover:to-teal-450 text-white font-semibold py-2.5 rounded-xl transition-all shadow-md mt-2 cursor-pointer text-center"
            >
              Register Account
            </button>
          </form>
        </div>

        {/* Right Column: Staff List Table */}
        <div className="lg:col-span-2 bg-zinc-900/10 light:bg-zinc-200/10 border border-zinc-900 light:border-zinc-300 rounded-3xl p-6 shadow-xl flex flex-col">
          <h4 className="font-bold text-xs uppercase tracking-wider text-zinc-400 mb-4 flex items-center space-x-1.5">
            <FiUserCheck /> <span>Authorized Team Members</span>
          </h4>

          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-3">
              <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-[10px] font-bold text-zinc-500 uppercase">Fetching Staff...</p>
            </div>
          ) : users.length === 0 ? (
            <p className="text-xs text-zinc-500 italic text-center py-6">No team members registered</p>
          ) : (
            <div className="space-y-4">
              {users.map((staff) => (
                <div
                  key={staff._id}
                  className="p-4 rounded-2xl bg-zinc-950/60 light:bg-zinc-100/60 border border-zinc-850 light:border-zinc-350 text-xs flex flex-col md:flex-row md:items-start justify-between gap-4"
                >
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2.5">
                      <div className="w-8 h-8 rounded-lg bg-zinc-900 flex items-center justify-center font-bold text-emerald-400">
                        {staff.username.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h5 className="font-bold text-sm">@{staff.username}</h5>
                        <p className="text-[9px] text-zinc-550 uppercase">Team Member Profile</p>
                      </div>
                    </div>

                    {/* Permissions grid bubbles */}
                    <div className="flex flex-wrap gap-1.5 pt-1.5">
                      {Object.keys(permissionLabels).map(perm => (
                        <button
                          key={perm}
                          onClick={() => handleTogglePermission(staff._id, perm)}
                          className={`px-2 py-0.5 rounded text-[8px] font-bold transition-all cursor-pointer ${
                            staff.permissions?.[perm]
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-zinc-900 text-zinc-600 border border-zinc-850/40 line-through'
                          }`}
                          title={`Toggle ${permissionLabels[perm]}`}
                        >
                          {permissionLabels[perm]}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Actions column */}
                  <div className="flex items-center space-x-2 pt-2 md:pt-0 self-end md:self-start">
                    <button
                      onClick={() => handleToggleActive(staff._id, staff.isActive)}
                      className={`px-3 py-1.5 rounded-xl font-bold cursor-pointer transition-all ${
                        staff.isActive
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/10'
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/10'
                      }`}
                    >
                      {staff.isActive ? 'Active' : 'Disabled'}
                    </button>
                    <button
                      onClick={() => handleDeleteStaff(staff._id, staff.username)}
                      className="p-2 rounded-xl bg-zinc-900 border border-zinc-850 hover:bg-rose-500/15 hover:text-rose-400 text-zinc-500 cursor-pointer transition-all"
                      title="Delete User"
                    >
                      <FiTrash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

    </div>
  );
};

export default StaffManagement;
