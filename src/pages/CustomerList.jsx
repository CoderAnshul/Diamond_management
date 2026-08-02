import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api, { API_HOST } from '../utils/api';
import { FiSearch, FiPlus, FiEye, FiEdit2, FiTrash2 } from 'react-icons/fi';
import toast from 'react-hot-toast';

const CustomerList = () => {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [lockerNumber, setLockerNumber] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const response = await api.get('/customers', {
        params: { search, lockerNumber, page, limit: 10 }
      });
      if (response.data.success) {
        setCustomers(response.data.customers);
        setTotalPages(response.data.totalPages);
      }
    } catch (err) {
      toast.error('Failed to load customers');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [page]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchCustomers();
  };

  const handleDelete = async (id, name) => {
    if (window.confirm(`Are you absolutely sure you want to delete customer ${name}? This will vacate their assigned locker.`)) {
      try {
        const response = await api.delete(`/customers/${id}`);
        if (response.data.success) {
          toast.success('Customer deleted successfully');
          fetchCustomers();
        }
      } catch (err) {
        toast.error(err.response?.data?.error || 'Failed to delete customer');
      }
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Customer Directory</h2>
          <p className="text-sm text-zinc-400 light:text-zinc-650">Manage diamond office locker customers and beneficiaries</p>
        </div>
        {hasPermission('canRegisterCustomer') && (
          <button
            onClick={() => navigate('/customers/new')}
            className="flex items-center space-x-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white px-4 py-2.5 rounded-xl text-sm font-semibold shadow-lg shadow-emerald-500/10 active:scale-95 transition-all cursor-pointer"
          >
            <FiPlus />
            <span>Add New Customer</span>
          </button>
        )}
      </div>

      {/* Search and Filters */}
      <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-zinc-900/15 light:bg-zinc-200/15 p-4 rounded-2xl border border-zinc-900 light:border-zinc-200">
        <div className="relative flex items-center">
          <FiSearch className="absolute left-3 text-zinc-500" />
          <input
            type="text"
            placeholder="Search Name, Phone, Aadhaar..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-zinc-900/50 light:bg-zinc-100 border border-zinc-800/80 light:border-zinc-300 focus:border-emerald-500 rounded-xl py-2 pl-9 pr-4 text-xs font-medium outline-none transition-all placeholder-zinc-500"
          />
        </div>

        <div className="relative flex items-center">
          <input
            type="text"
            placeholder="Filter by Locker Number..."
            value={lockerNumber}
            onChange={(e) => setLockerNumber(e.target.value)}
            className="w-full bg-zinc-900/50 light:bg-zinc-100 border border-zinc-800/80 light:border-zinc-300 focus:border-emerald-500 rounded-xl py-2 px-4 text-xs font-medium outline-none transition-all placeholder-zinc-500"
          />
        </div>

        <button
          type="submit"
          className="bg-zinc-800 light:bg-zinc-350 hover:bg-zinc-700 text-zinc-100 light:text-zinc-900 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-all"
        >
          Apply Filters
        </button>
      </form>

      {/* Main Directory Table */}
      <div className="bg-zinc-900/20 light:bg-zinc-200/20 border border-zinc-800/40 light:border-zinc-300/40 rounded-3xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-4">
            <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs font-semibold tracking-wider text-zinc-400 uppercase">Fetching Customers...</p>
          </div>
        ) : customers.length === 0 ? (
          <div className="py-20 text-center text-sm text-zinc-500">No customers found matching the search criteria.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-[10px] text-zinc-500 uppercase tracking-wider border-b border-zinc-800/30 bg-zinc-900/10 light:bg-zinc-250/30">
                  <th className="px-6 py-4">Customer</th>
                  <th className="px-6 py-4">Contact</th>
                  <th className="px-6 py-4">Locker Number</th>
                  <th className="px-6 py-4">Aadhaar</th>
                  <th className="px-6 py-4">Agreement Date</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="text-xs divide-y divide-zinc-900 light:divide-zinc-200">
                {customers.map((cust) => (
                  <tr key={cust._id} className="hover:bg-zinc-900/30 light:hover:bg-zinc-250/30 transition-colors">
                    <td className="px-6 py-4 font-semibold flex items-center space-x-3">
                      <img
                        src={cust.photoUrl ? `${API_HOST}${cust.photoUrl}` : 'https://placehold.co/100'}
                        alt={cust.name}
                        className="w-8 h-8 rounded-full object-cover border border-zinc-800"
                      />
                      <span>{cust.name}</span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-semibold">{cust.mobile}</p>
                      {cust.altMobile && <p className="text-[10px] text-zinc-500">{cust.altMobile}</p>}
                    </td>
                    <td className="px-6 py-4 font-mono font-bold text-emerald-400">
                      {cust.lockerId?.lockerNumber ? `Locker ${cust.lockerId.lockerNumber}` : 'Unassigned'}
                    </td>
                    <td className="px-6 py-4 text-zinc-400 font-mono">{cust.aadhaarNumber}</td>
                    <td className="px-6 py-4 text-zinc-400">
                      {new Date(cust.agreementDate).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button
                        onClick={() => navigate(`/customers/${cust._id}`)}
                        className="p-1.5 rounded-lg bg-zinc-800 light:bg-zinc-300 hover:scale-105 active:scale-95 transition-all text-zinc-300 light:text-zinc-700 cursor-pointer inline-flex items-center"
                        title="View Profile"
                      >
                        <FiEye className="w-4 h-4" />
                      </button>
                      {hasPermission('canEditCustomer') && (
                        <button
                          onClick={() => navigate(`/customers/edit/${cust._id}`)}
                          className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 hover:scale-105 active:scale-95 transition-all text-emerald-400 cursor-pointer inline-flex items-center"
                          title="Edit Customer"
                        >
                          <FiEdit2 className="w-4 h-4" />
                        </button>
                      )}
                      {hasPermission('canDeleteCustomer') && (
                        <button
                          onClick={() => handleDelete(cust._id, cust.name)}
                          className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 hover:scale-105 active:scale-95 transition-all text-rose-400 cursor-pointer inline-flex items-center"
                          title="Delete Customer"
                        >
                          <FiTrash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4">
          <button
            disabled={page === 1}
            onClick={() => setPage(p => Math.max(p - 1, 1))}
            className="px-4 py-2 border border-zinc-800/80 light:border-zinc-300 rounded-xl text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            Previous
          </button>
          <span className="text-xs text-zinc-400">
            Page {page} of {totalPages}
          </span>
          <button
            disabled={page === totalPages}
            onClick={() => setPage(p => Math.min(p + 1, totalPages))}
            className="px-4 py-2 border border-zinc-800/80 light:border-zinc-300 rounded-xl text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            Next
          </button>
        </div>
      )}

    </div>
  );
};

export default CustomerList;
