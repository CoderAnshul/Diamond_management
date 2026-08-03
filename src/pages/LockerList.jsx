import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import {
  FiGrid,
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiUserCheck,
  FiEye,
  FiXCircle,
  FiRefreshCw
} from 'react-icons/fi';
import toast from 'react-hot-toast';

const LockerList = () => {
  const { user, hasPermission } = useAuth();
  const [lockers, setLockers] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filter states
  const [statusFilter, setStatusFilter] = useState('');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [createMode, setCreateMode] = useState('bulk'); // 'single' or 'bulk'
  const [newLockerNumber, setNewLockerNumber] = useState('');
  const [startNumber, setStartNumber] = useState('');
  const [endNumber, setEndNumber] = useState('');
  const [newLockerStatus, setNewLockerStatus] = useState('available');

  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedLockerHistory, setSelectedLockerHistory] = useState(null);

  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignCustomerSearch, setAssignCustomerSearch] = useState('');
  const [assignSearchResults, setAssignSearchResults] = useState([]);
  const [selectedLockerId, setSelectedLockerId] = useState('');

  const fetchLockers = async () => {
    setLoading(true);
    try {
      const response = await api.get('/lockers', {
        params: { status: statusFilter }
      });
      if (response.data.success) {
        setLockers(response.data.lockers);
      }
    } catch (err) {
      toast.error('Failed to load lockers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLockers();
  }, [statusFilter]);

  const handleAddLocker = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        status: newLockerStatus,
        size: 'small' // Default size
      };

      if (createMode === 'bulk') {
        if (!startNumber || !endNumber) {
          toast.error('Please enter starting and ending values');
          return;
        }
        payload.startNumber = startNumber;
        payload.endNumber = endNumber;
      } else {
        if (!newLockerNumber) {
          toast.error('Please enter a locker number');
          return;
        }
        payload.lockerNumber = newLockerNumber;
      }

      const response = await api.post('/lockers', payload);
      if (response.data.success) {
        toast.success(response.data.message || 'Lockers created successfully');
        setShowAddModal(false);
        setNewLockerNumber('');
        setStartNumber('');
        setEndNumber('');
        fetchLockers();
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create locker');
    }
  };

  const handleDeleteLocker = async (id, number) => {
    if (window.confirm(`Are you sure you want to delete Locker ${number}?`)) {
      try {
        const response = await api.delete(`/lockers/${id}`);
        if (response.data.success) {
          toast.success('Locker deleted');
          fetchLockers();
        }
      } catch (err) {
        toast.error(err.response?.data?.error || 'Failed to delete locker');
      }
    }
  };

  // Assign customer flow
  const handleSearchCustomers = async () => {
    if (!assignCustomerSearch.trim()) return;
    try {
      // Find unassigned customers
      const response = await api.get('/customers', { params: { search: assignCustomerSearch, limit: 20 } });
      if (response.data.success) {
        // Filter out customers that already have lockers
        const unassigned = response.data.customers.filter(c => !c.lockerId);
        setAssignSearchResults(unassigned);
      }
    } catch (err) {
      toast.error('Search failed');
    }
  };

  const handleConfirmAssignment = async (customerId) => {
    try {
      const response = await api.post(`/lockers/${selectedLockerId}/assign`, { customerId });
      if (response.data.success) {
        toast.success('Locker assigned successfully');
        setShowAssignModal(false);
        setAssignCustomerSearch('');
        setAssignSearchResults([]);
        fetchLockers();
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Assignment failed');
    }
  };

  const handleVacateLocker = async (lockerId, number) => {
    if (window.confirm(`Vacate Locker ${number}?`)) {
      try {
        const remarks = window.prompt("Enter vacation remarks:") || '';
        const response = await api.post(`/lockers/${lockerId}/vacate`, { remarks });
        if (response.data.success) {
          toast.success('Locker vacated');
          fetchLockers();
        }
      } catch (err) {
        toast.error('Failed to vacate locker');
      }
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Locker Inventory Map</h2>
          <p className="text-sm text-zinc-400">View and manage safety lockers details</p>
        </div>
        {hasPermission('canManageLockers') && (
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center space-x-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white px-4 py-2.5 rounded-xl text-sm font-semibold shadow-lg active:scale-95 transition-all cursor-pointer"
          >
            <FiPlus />
            <span>Create New Locker</span>
          </button>
        )}
      </div>

      {/* Filter Row */}
      <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4 bg-zinc-900/15 light:bg-zinc-200/15 p-4 rounded-2xl border border-zinc-900 light:border-zinc-200 text-xs">
        <div className="flex-1 flex flex-col space-y-1">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wide">Filter Status</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-zinc-905 border border-zinc-800 light:border-zinc-300 rounded-xl py-2 px-3 outline-none"
          >
            <option value="">All Statuses</option>
            <option value="available">Available (Green)</option>
            <option value="occupied">Occupied (Amber)</option>
            <option value="maintenance">Maintenance (Gray)</option>
          </select>
        </div>

      </div>

      {/* Main Locker Grid */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center space-y-4">
          <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs font-semibold tracking-wider text-zinc-400 uppercase">Loading Lockers Grid...</p>
        </div>
      ) : lockers.length === 0 ? (
        <div className="py-20 text-center text-sm text-zinc-500">No lockers configured matching the criteria.</div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {lockers.map((locker) => {
            const statusColors = {
              available: 'border-emerald-500/30 bg-emerald-500/5 text-emerald-400',
              occupied: 'border-amber-500/30 bg-amber-500/5 text-amber-400',
              maintenance: 'border-zinc-700 bg-zinc-800/40 text-zinc-400'
            };

            return (
              <div
                key={locker._id}
                className={`p-4 border rounded-2xl transition-all shadow-md flex flex-col justify-between min-h-40 ${
                  statusColors[locker.status]
                }`}
              >
                <div>
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] font-bold uppercase tracking-wider opacity-60">
                      {locker.status}
                    </span>
                    <span className="w-2.5 h-2.5 rounded-full bg-current"></span>
                  </div>
                  <h3 className="text-xl font-bold font-mono mt-1">Locker {locker.lockerNumber}</h3>
                </div>

                <div className="space-y-2">
                  {locker.status === 'occupied' && (
                    <p className="text-[10px] font-bold truncate opacity-80">
                      Occupant: {locker.assignedCustomerId?.name || 'Unknown'}
                    </p>
                  )}
                  
                  {/* Actions popup/row */}
                  <div className="flex items-center space-x-1.5 pt-1 text-xs border-t border-zinc-800/20">
                    <button
                      onClick={() => {
                        setSelectedLockerHistory(locker);
                        setShowHistoryModal(true);
                      }}
                      className="p-1 rounded bg-zinc-950/40 hover:bg-zinc-950/60 text-zinc-300"
                      title="History Trail"
                    >
                      <FiEye className="w-3.5 h-3.5" />
                    </button>

                    {locker.status === 'available' && hasPermission('canRegisterCustomer') && (
                      <button
                        onClick={() => {
                          setSelectedLockerId(locker._id);
                          setShowAssignModal(true);
                        }}
                        className="p-1 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400"
                        title="Assign Locker"
                      >
                        <FiUserCheck className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {locker.status === 'occupied' && hasPermission('canManageLockers') && (
                      <button
                        onClick={() => handleVacateLocker(locker._id, locker.lockerNumber)}
                        className="p-1 rounded bg-rose-500/20 hover:bg-rose-500/30 text-rose-400"
                        title="Vacate Locker"
                      >
                        <FiXCircle className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {user?.role === 'owner' && (
                      <button
                        onClick={() => handleDeleteLocker(locker._id, locker.lockerNumber)}
                        className="p-1 rounded bg-rose-500/10 hover:bg-rose-500/25 text-rose-400"
                        title="Delete Locker"
                      >
                        <FiTrash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal - Add Locker */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <form
            onSubmit={handleAddLocker}
            className="w-full max-w-md glass-panel p-6 rounded-3xl border border-zinc-800 shadow-2xl space-y-4"
          >
            <h3 className="text-md font-bold uppercase tracking-wider text-emerald-400">Configure New Locker</h3>
            
            {/* Mode selection tabs */}
            <div className="flex border-b border-zinc-800 mb-4">
              <button
                type="button"
                onClick={() => setCreateMode('bulk')}
                className={`flex-1 pb-2 text-[10px] font-bold uppercase tracking-wider text-center cursor-pointer transition-all ${
                  createMode === 'bulk'
                    ? 'text-emerald-400 border-b-2 border-emerald-500'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                Bulk Range
              </button>
              <button
                type="button"
                onClick={() => setCreateMode('single')}
                className={`flex-1 pb-2 text-[10px] font-bold uppercase tracking-wider text-center cursor-pointer transition-all ${
                  createMode === 'single'
                    ? 'text-emerald-400 border-b-2 border-emerald-500'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                Single Locker
              </button>
            </div>

            <div className="space-y-3 text-xs">
              {createMode === 'bulk' ? (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase">Start Value</label>
                    <input
                      type="number"
                      required
                      placeholder="e.g. 101"
                      value={startNumber}
                      onChange={(e) => setStartNumber(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-850 rounded-xl py-2 px-3 outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase">End Value</label>
                    <input
                      type="number"
                      required
                      placeholder="e.g. 110"
                      value={endNumber}
                      onChange={(e) => setEndNumber(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-850 rounded-xl py-2 px-3 outline-none"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase">Locker Number</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. L-102"
                    value={newLockerNumber}
                    onChange={(e) => setNewLockerNumber(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-850 rounded-xl py-2 px-3 outline-none"
                  />
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase">Default Status</label>
                <select
                  value={newLockerStatus}
                  onChange={(e) => setNewLockerStatus(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-850 rounded-xl py-2 px-3 outline-none cursor-pointer"
                >
                  <option value="available">Available</option>
                  <option value="maintenance">Maintenance</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-2 text-xs">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 rounded-xl bg-zinc-900 border border-zinc-850 text-zinc-400 font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-450 text-white font-semibold cursor-pointer"
              >
                Create Locker
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal - Locker History Trail */}
      {showHistoryModal && selectedLockerHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg glass-panel p-6 rounded-3xl border border-zinc-800 shadow-2xl space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-zinc-800/30">
              <h3 className="text-md font-bold uppercase tracking-wider text-emerald-400">
                Locker {selectedLockerHistory.lockerNumber} History Trail
              </h3>
              <button onClick={() => setShowHistoryModal(false)} className="text-zinc-500 hover:text-zinc-300">
                Close
              </button>
            </div>

            <div className="space-y-3.5 max-h-[300px] overflow-y-auto pr-2 text-xs">
              {selectedLockerHistory.history.length === 0 ? (
                <p className="text-center text-zinc-500 italic py-6">No historical records for this locker</p>
              ) : (
                selectedLockerHistory.history.map((hist, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-2xl bg-zinc-950/40 border border-zinc-850 flex items-center justify-between"
                  >
                    <div>
                      <p className="font-bold">
                        Customer: <span className="text-emerald-400 font-semibold">{hist.customerName}</span>
                      </p>
                      <p className="text-[10px] text-zinc-500 uppercase mt-0.5">
                        Action: {hist.action} • {hist.remarks || 'No remarks'}
                      </p>
                    </div>
                    <div className="text-[10px] text-zinc-500 font-medium">
                      {new Date(hist.date).toLocaleDateString()}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal - Assign Locker Customer Search */}
      {showAssignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md glass-panel p-6 rounded-3xl border border-zinc-800 shadow-2xl space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-md font-bold uppercase tracking-wider text-emerald-400">Assign Locker</h3>
              <button
                onClick={() => {
                  setShowAssignModal(false);
                  setAssignCustomerSearch('');
                  setAssignSearchResults([]);
                }}
                className="text-zinc-500 hover:text-zinc-300"
              >
                Close
              </button>
            </div>

            <div className="space-y-3">
              <div className="flex space-x-2 text-xs">
                <input
                  type="text"
                  placeholder="Search customer name/mobile..."
                  value={assignCustomerSearch}
                  onChange={(e) => setAssignCustomerSearch(e.target.value)}
                  className="flex-1 bg-zinc-950 border border-zinc-850 rounded-xl py-2 px-3 outline-none"
                />
                <button
                  type="button"
                  onClick={handleSearchCustomers}
                  className="bg-emerald-500 text-white px-4 rounded-xl font-semibold cursor-pointer"
                >
                  Search
                </button>
              </div>

              {/* Search Results */}
              <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                {assignSearchResults.length === 0 ? (
                  <p className="text-[10px] text-zinc-500 italic text-center py-4">Search for an unassigned customer</p>
                ) : (
                  assignSearchResults.map(c => (
                    <div
                      key={c._id}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-950 border border-zinc-850 text-xs"
                    >
                      <div>
                        <p className="font-bold">{c.name}</p>
                        <p className="text-[10px] text-zinc-500">{c.mobile}</p>
                      </div>
                      <button
                        onClick={() => handleConfirmAssignment(c._id)}
                        className="bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 px-3 py-1.5 rounded-lg font-bold"
                      >
                        Select
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default LockerList;
