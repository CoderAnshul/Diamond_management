import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import {
  FiFileText,
  FiDownload,
  FiPrinter,
  FiCalendar,
  FiUser,
  FiSearch
} from 'react-icons/fi';
import toast from 'react-hot-toast';

const Reports = () => {
  const { hasPermission } = useAuth();
  
  // Selection
  const [reportType, setReportType] = useState('visits'); // visits, audit, lockers
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  // Filters
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [lockerNumber, setLockerNumber] = useState('');
  const [staffUsername, setStaffUsername] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const fetchReport = async () => {
    setLoading(true);
    try {
      let endpoint = '/reports/visits';
      let params = { dateFrom, dateTo, lockerNumber };
      
      if (reportType === 'audit') {
        endpoint = '/reports/audit';
        params.username = staffUsername;
      } else if (reportType === 'lockers') {
        endpoint = '/lockers';
        params.status = statusFilter;
      }

      const response = await api.get(endpoint, { params });
      if (response.data.success) {
        if (reportType === 'visits') {
          setData(response.data.entries);
        } else if (reportType === 'audit') {
          setData(response.data.logs || []);
        } else if (reportType === 'lockers') {
          setData(response.data.lockers || []);
        }
      }
    } catch (err) {
      toast.error('Failed to generate report');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [reportType]);

  const handleApplyFilters = (e) => {
    e.preventDefault();
    fetchReport();
  };

  // Plain JS client-side CSV download
  const handleExportCSV = () => {
    if (data.length === 0) {
      toast.error('No data available to export');
      return;
    }

    let csvRows = [];
    let headers = [];

    if (reportType === 'visits') {
      headers = ['Customer Name', 'Locker Number', 'Staff Handler', 'Visit Date/Time', 'Verification Status', 'Remarks'];
      csvRows.push(headers.join(','));
      data.forEach(item => {
        csvRows.push([
          `"${item.customerName}"`,
          `"${item.lockerNumber}"`,
          `"${item.staffName}"`,
          `"${new Date(item.visitDateTime).toLocaleString()}"`,
          `"${item.verificationStatus}"`,
          `"${item.remarks || ''}"`
        ].join(','));
      });
    } else if (reportType === 'audit') {
      headers = ['Timestamp', 'Username', 'Action', 'Module', 'IP Address', 'Remarks'];
      csvRows.push(headers.join(','));
      data.forEach(item => {
        csvRows.push([
          `"${new Date(item.createdAt).toLocaleString()}"`,
          `"${item.username}"`,
          `"${item.action}"`,
          `"${item.module}"`,
          `"${item.ipAddress || ''}"`,
          `"${item.remarks || ''}"`
        ].join(','));
      });
    } else if (reportType === 'lockers') {
      headers = ['Locker Number', 'Size', 'Status', 'Assigned Customer', 'Assignment Date'];
      csvRows.push(headers.join(','));
      data.forEach(item => {
        csvRows.push([
          `"${item.lockerNumber}"`,
          `"${item.size}"`,
          `"${item.status}"`,
          `"${item.assignedCustomerId?.name || 'None'}"`,
          `"${item.assignmentDate ? new Date(item.assignmentDate).toLocaleDateString() : 'N/A'}"`
        ].join(','));
      });
    }

    const csvContent = "data:text/csv;charset=utf-8," + csvRows.join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `report_${reportType}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0 print:hidden">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Audit & Visitor Reports</h2>
          <p className="text-sm text-zinc-400">Generate secure visit activity and system audit outputs</p>
        </div>

        <div className="flex items-center space-x-2 text-xs">
          <button
            onClick={handleExportCSV}
            className="flex items-center space-x-1.5 px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-350 font-bold hover:bg-zinc-800 hover:text-white cursor-pointer transition-all"
          >
            <FiDownload />
            <span>Export CSV</span>
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center space-x-1.5 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-450 text-white font-bold cursor-pointer transition-all"
          >
            <FiPrinter />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* Report Selection Tabs */}
      <div className="flex space-x-2 border-b border-zinc-850/50 pb-2 print:hidden text-xs font-semibold">
        <button
          onClick={() => setReportType('visits')}
          className={`px-4 py-2 rounded-xl transition-all cursor-pointer ${
            reportType === 'visits' ? 'bg-emerald-500/10 text-emerald-400 font-bold' : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          Locker Visits Log
        </button>
        {hasPermission('canViewLogs') && (
          <button
            onClick={() => setReportType('audit')}
            className={`px-4 py-2 rounded-xl transition-all cursor-pointer ${
              reportType === 'audit' ? 'bg-emerald-500/10 text-emerald-400 font-bold' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            Security Audit Trail
          </button>
        )}
        <button
          onClick={() => setReportType('lockers')}
          className={`px-4 py-2 rounded-xl transition-all cursor-pointer ${
            reportType === 'lockers' ? 'bg-emerald-500/10 text-emerald-400 font-bold' : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          Lockers Allocation
        </button>
      </div>

      {/* Filters Form */}
      <form onSubmit={handleApplyFilters} className="grid grid-cols-1 sm:grid-cols-4 gap-4 bg-zinc-900/10 light:bg-zinc-200/10 p-4 rounded-2xl border border-zinc-900 light:border-zinc-300 print:hidden text-xs">
        
        {/* Date From */}
        {reportType !== 'lockers' && (
          <div className="flex flex-col space-y-1.5">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wide">Date From</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="bg-zinc-950 border border-zinc-850 light:border-zinc-300 rounded-xl py-2 px-3 outline-none"
            />
          </div>
        )}

        {/* Date To */}
        {reportType !== 'lockers' && (
          <div className="flex flex-col space-y-1.5">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wide">Date To</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="bg-zinc-950 border border-zinc-850 light:border-zinc-300 rounded-xl py-2 px-3 outline-none"
            />
          </div>
        )}

        {/* Locker filter */}
        {reportType === 'visits' && (
          <div className="flex flex-col space-y-1.5">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wide">Locker Number</label>
            <input
              type="text"
              placeholder="e.g. L-102"
              value={lockerNumber}
              onChange={(e) => setLockerNumber(e.target.value)}
              className="bg-zinc-950 border border-zinc-850 light:border-zinc-300 rounded-xl py-2 px-3 outline-none"
            />
          </div>
        )}

        {/* Staff search */}
        {reportType === 'audit' && (
          <div className="flex flex-col space-y-1.5">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wide">Staff Username</label>
            <input
              type="text"
              placeholder="Filter by user"
              value={staffUsername}
              onChange={(e) => setStaffUsername(e.target.value)}
              className="bg-zinc-950 border border-zinc-850 light:border-zinc-300 rounded-xl py-2 px-3 outline-none"
            />
          </div>
        )}

        {/* Status filter (Lockers only) */}
        {reportType === 'lockers' && (
          <div className="flex flex-col space-y-1.5 col-span-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wide">Locker Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-zinc-950 border border-zinc-850 light:border-zinc-300 rounded-xl py-2.5 px-3 outline-none cursor-pointer"
            >
              <option value="">All Statuses</option>
              <option value="available">Available</option>
              <option value="occupied">Occupied</option>
              <option value="maintenance">Maintenance</option>
            </select>
          </div>
        )}

        <div className="flex items-end col-span-1">
          <button
            type="submit"
            className="w-full bg-zinc-800 hover:bg-zinc-750 border border-zinc-850 text-zinc-300 font-semibold py-2.5 rounded-xl cursor-pointer text-center"
          >
            Apply Filters
          </button>
        </div>

      </form>

      {/* Printable Report Title block (Hidden on screen) */}
      <div className="hidden print:block text-center space-y-2 border-b border-black pb-4 text-black">
        <h1 className="text-xl font-bold uppercase tracking-wider">Diamond Locker Management Office</h1>
        <h2 className="text-sm font-bold uppercase">System Generated Report: {reportType.toUpperCase()}</h2>
        <p className="text-[10px] font-semibold text-zinc-650">
          Generated: {new Date().toLocaleString()} • Authorized Audit Copy
        </p>
      </div>

      {/* Reports Table container */}
      <div className="bg-zinc-900/20 light:bg-zinc-200/20 border border-zinc-800/40 light:border-zinc-300/40 rounded-3xl overflow-hidden shadow-xl print:border-none print:shadow-none">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-4">
            <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs font-semibold text-zinc-400 uppercase">Generating Report...</p>
          </div>
        ) : data.length === 0 ? (
          <div className="py-20 text-center text-sm text-zinc-500">No records found matching filters.</div>
        ) : (
          <table className="w-full text-left border-collapse text-xs print:text-black">
            
            {/* Headers */}
            {reportType === 'visits' && (
              <thead>
                <tr className="text-[10px] text-zinc-500 uppercase tracking-wider border-b border-zinc-850/40 bg-zinc-900/10 light:bg-zinc-250/20 print:bg-none print:text-black">
                  <th className="px-6 py-4">Customer</th>
                  <th className="px-6 py-4">Locker</th>
                  <th className="px-6 py-4">Staff Handler</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Remarks</th>
                  <th className="px-6 py-4">Date & Time</th>
                </tr>
              </thead>
            )}
            {reportType === 'audit' && (
              <thead>
                <tr className="text-[10px] text-zinc-500 uppercase tracking-wider border-b border-zinc-850/40 bg-zinc-900/10 light:bg-zinc-250/20 print:bg-none print:text-black">
                  <th className="px-6 py-4">Timestamp</th>
                  <th className="px-6 py-4">User</th>
                  <th className="px-6 py-4">Action</th>
                  <th className="px-6 py-4">Module</th>
                  <th className="px-6 py-4">IP Address</th>
                  <th className="px-6 py-4">Remarks</th>
                </tr>
              </thead>
            )}
            {reportType === 'lockers' && (
              <thead>
                <tr className="text-[10px] text-zinc-500 uppercase tracking-wider border-b border-zinc-850/40 bg-zinc-900/10 light:bg-zinc-250/20 print:bg-none print:text-black">
                  <th className="px-6 py-4">Locker Number</th>
                  <th className="px-6 py-4">Size</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Assigned Cust</th>
                  <th className="px-6 py-4">Assignment Date</th>
                </tr>
              </thead>
            )}

            {/* Body */}
            <tbody className="divide-y divide-zinc-900 light:divide-zinc-200 print:divide-zinc-300">
              {reportType === 'visits' && data.map((item) => (
                <tr key={item._id} className="hover:bg-zinc-900/20 light:hover:bg-zinc-250/20 transition-colors">
                  <td className="px-6 py-3 font-semibold">{item.customerName}</td>
                  <td className="px-6 py-3 font-mono font-bold text-emerald-400">{item.lockerNumber}</td>
                  <td className="px-6 py-3 text-zinc-400">{item.staffName}</td>
                  <td className="px-6 py-3">
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/10">
                      {item.verificationStatus}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-zinc-550">{item.remarks || '-'}</td>
                  <td className="px-6 py-3 text-zinc-400 font-mono">
                    {new Date(item.visitDateTime).toLocaleString()}
                  </td>
                </tr>
              ))}

              {reportType === 'audit' && data.map((item) => (
                <tr key={item._id} className="hover:bg-zinc-900/20 light:hover:bg-zinc-250/20 transition-colors">
                  <td className="px-6 py-3 font-mono text-zinc-450">{new Date(item.createdAt).toLocaleString()}</td>
                  <td className="px-6 py-3 font-semibold text-emerald-400">@{item.username}</td>
                  <td className="px-6 py-3 uppercase tracking-wide font-semibold text-[10px]">{item.action}</td>
                  <td className="px-6 py-3 text-zinc-450">{item.module}</td>
                  <td className="px-6 py-3 text-zinc-500 font-mono">{item.ipAddress || '-'}</td>
                  <td className="px-6 py-3 text-zinc-350 light:text-zinc-800">{item.remarks}</td>
                </tr>
              ))}

              {reportType === 'lockers' && data.map((item) => (
                <tr key={item._id} className="hover:bg-zinc-900/20 light:hover:bg-zinc-250/20 transition-colors">
                  <td className="px-6 py-3 font-mono font-bold text-emerald-400">Locker {item.lockerNumber}</td>
                  <td className="px-6 py-3 uppercase">{item.size}</td>
                  <td className="px-6 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                      item.status === 'available' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-400'
                    }`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-zinc-300 light:text-zinc-800">{item.assignedCustomerId?.name || '-'}</td>
                  <td className="px-6 py-3 text-zinc-400 font-mono">
                    {item.assignmentDate ? new Date(item.assignmentDate).toLocaleDateString() : '-'}
                  </td>
                </tr>
              ))}
            </tbody>

          </table>
        )}
      </div>

    </div>
  );
};

export default Reports;
