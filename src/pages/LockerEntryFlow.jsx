import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import Webcam from 'react-webcam';
import api, { API_HOST } from '../utils/api';
import {
  FiSearch,
  FiCamera,
  FiUserCheck,
  FiAlertTriangle,
  FiActivity,
  FiKey,
  FiPlus,
  FiCheckCircle
} from 'react-icons/fi';
import toast from 'react-hot-toast';

const LockerEntryFlow = () => {
  const [searchParams] = useSearchParams();
  const initialSearch = searchParams.get('search') || '';

  // Step state
  const [step, setStep] = useState(1); // 1: Search, 2: Profile & Verify, 3: Success
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  // Selected client details
  const [selectedClient, setSelectedClient] = useState(null); // { customer, beneficiaries }
  
  // Verification camera state
  const [bootCamera, setBootCamera] = useState(true);
  const [livePhoto, setLivePhoto] = useState(null);
  const webcamRef = useRef(null);

  // Staff attribution list
  const [staffList, setStaffList] = useState([]);
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [verificationStatus, setVerificationStatus] = useState('verified'); // verified, bypass_authorized
  const [entryRemarks, setEntryRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchStaff = async () => {
    try {
      const response = await api.get('/auth/users', { params: { includeOwner: 'true' } });
      if (response.data.success) {
        setStaffList(response.data.users);
      }
    } catch (err) {
      console.error('Failed to fetch staff list:', err.message);
    }
  };

  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const response = await api.get('/entries/search', { params: { query: searchQuery } });
      if (response.data.success) {
        setSearchResults(response.data.results);
      }
    } catch (err) {
      toast.error('Search failed');
    } finally {
      setSearching(false);
    }
  };

  // Run search on page load if preset search parameter exists
  useEffect(() => {
    fetchStaff();
    if (initialSearch) {
      handleSearch();
    }
  }, [initialSearch]);

  const handleSelectClient = (client) => {
    if (!client.customer.lockerId) {
      toast.error('This customer does not have an active locker assigned');
      return;
    }
    setSelectedClient(client);
    setStep(2);
    setLivePhoto(null);
    setBootCamera(true);
  };

  const handleCaptureSnapshot = () => {
    try {
      if (!webcamRef || !webcamRef.current) {
        toast.error('Webcam is not ready yet. Please wait or check connection.');
        return;
      }
      const screenshot = webcamRef.current.getScreenshot();
      if (!screenshot) {
        toast.error('Failed to capture snapshot. Please ensure your camera is active.');
        return;
      }
      setLivePhoto(screenshot);
      setBootCamera(false);
      toast.success('Live photo captured');
    } catch (error) {
      console.error('Snapshot capture error:', error);
      toast.error('Camera error: ' + error.message);
    }
  };

  const handleRecapture = () => {
    setLivePhoto(null);
    setBootCamera(true);
  };

  const handleSubmitEntry = async () => {
    if (!livePhoto) {
      toast.error('Please capture a live verification photo first');
      return;
    }
    if (!selectedStaffId) {
      toast.error('Please select the responsible staff member handling this visit');
      return;
    }

    setSubmitting(true);
    try {
      const response = await api.post('/entries', {
        customerId: selectedClient.customer._id,
        handledByStaffId: selectedStaffId,
        verificationStatus,
        remarks: entryRemarks,
        photoData: livePhoto
      });

      if (response.data.success) {
        toast.success('Visit entry logged successfully!');
        setStep(3);
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to log entry');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetFlow = () => {
    setSelectedClient(null);
    setLivePhoto(null);
    setSelectedStaffId('');
    setVerificationStatus('verified');
    setEntryRemarks('');
    setSearchQuery('');
    setSearchResults([]);
    setStep(1);
  };

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div>
        <h2 className="text-xl font-bold tracking-tight">Locker Entry Processing</h2>
        <p className="text-sm text-zinc-400">Secure identity verification flow for visitor access</p>
      </div>

      {/* STEP 1: Search Customer */}
      {step === 1 && (
        <div className="space-y-6">
          <form onSubmit={handleSearch} className="flex space-x-2 w-full max-w-xl mx-auto">
            <div className="relative flex-1 flex items-center">
              <FiSearch className="absolute left-3.5 text-zinc-400" />
              <input
                type="text"
                placeholder="Search Customer Name, Locker, Mobile, Aadhaar..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-zinc-900/60 light:bg-zinc-200 border border-zinc-850 light:border-zinc-300 focus:border-emerald-500 rounded-xl py-3 pl-10 pr-4 text-sm font-medium outline-none transition-all placeholder-zinc-500"
              />
            </div>
            <button
              type="submit"
              className="bg-emerald-500 hover:bg-emerald-450 text-white px-6 rounded-xl text-sm font-semibold transition-all shadow-md cursor-pointer"
            >
              Search
            </button>
          </form>

          {/* Results Area */}
          <div className="max-w-3xl mx-auto">
            {searching ? (
              <div className="py-20 flex flex-col items-center justify-center space-y-4">
                <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-xs font-semibold text-zinc-400 uppercase">Searching Profiles...</p>
              </div>
            ) : searchResults.length === 0 ? (
              searchQuery && <p className="text-center text-sm text-zinc-500 py-12">No matching customers found</p>
            ) : (
              <div className="bg-zinc-900/10 light:bg-zinc-200/10 border border-zinc-900 light:border-zinc-300 rounded-3xl overflow-hidden divide-y divide-zinc-900 light:divide-zinc-200">
                {searchResults.map((res) => (
                  <div
                    key={res.customer._id}
                    onClick={() => handleSelectClient(res)}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-4 hover:bg-zinc-900/40 light:hover:bg-zinc-250/30 transition-all cursor-pointer gap-4"
                  >
                    <div className="flex items-center space-x-3.5">
                      <img
                        src={`${API_HOST}${res.customer.photoUrl}`}
                        alt={res.customer.name}
                        className="w-12 h-12 rounded-full object-cover border border-zinc-800"
                      />
                      <div>
                        <h4 className="font-bold text-sm text-zinc-250 light:text-zinc-900">{res.customer.name}</h4>
                        <p className="text-xs text-zinc-500 font-semibold">{res.customer.mobile} • Aadhaar: {res.customer.aadhaarNumber}</p>
                      </div>
                    </div>
                    <div className="text-left sm:text-right">
                      <p className="text-sm font-mono font-bold text-emerald-400">
                        Locker {res.customer.lockerId?.lockerNumber || 'Unassigned'}
                      </p>
                      <p className="text-[10px] text-zinc-500 capitalize">
                        Size: {res.customer.lockerId?.size || 'N/A'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* STEP 2: Profile summary, Webcam verification, attribution */}
      {step === 2 && selectedClient && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Column 1: Verification Window (Side by side photos) */}
          <div className="lg:col-span-2 bg-zinc-900/10 light:bg-zinc-200/10 border border-zinc-900 light:border-zinc-300 rounded-3xl p-6 space-y-6">
            <h3 className="font-bold text-xs uppercase tracking-wider text-emerald-400 border-b border-zinc-850 pb-2">
              Step 1: Visual Identity Check (Manual Verification)
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left side: Stored Master image */}
              <div className="flex flex-col items-center space-y-2">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wide">Stored Master Photo</span>
                <div className="w-full h-56 rounded-2xl overflow-hidden border border-zinc-850 light:border-zinc-300 bg-zinc-950 shadow-inner">
                  <img
                    src={`${API_HOST}${selectedClient.customer.photoUrl}`}
                    alt="Master Avatar"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>

              {/* Right side: Captured Live Webcam image */}
              <div className="flex flex-col items-center space-y-2">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wide">Captured Visit Photo</span>
                <div className="w-full h-56 rounded-2xl overflow-hidden border border-zinc-850 light:border-zinc-300 bg-zinc-950 relative flex items-center justify-center shadow-inner">
                  {bootCamera ? (
                    <Webcam
                      audio={false}
                      ref={webcamRef}
                      screenshotFormat="image/jpeg"
                      videoConstraints={{ width: 400, height: 400, facingMode: 'user' }}
                      className="w-full h-full object-cover"
                    />
                  ) : livePhoto ? (
                    <img src={livePhoto} alt="Live Snapshot" className="w-full h-full object-cover" />
                  ) : (
                    <p className="text-xs text-zinc-550 italic">Camera inactive</p>
                  )}
                </div>

                <div className="flex space-x-2 pt-1 w-full text-xs">
                  {bootCamera ? (
                    <button
                      type="button"
                      onClick={handleCaptureSnapshot}
                      className="flex-1 bg-emerald-500 text-white font-semibold py-2 rounded-xl flex items-center justify-center space-x-1.5 cursor-pointer shadow-md"
                    >
                      <FiCamera /> <span>Capture snapshot</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleRecapture}
                      className="flex-1 bg-zinc-850 text-zinc-300 font-semibold py-2 rounded-xl flex items-center justify-center space-x-1.5 cursor-pointer"
                    >
                      <FiPlus className="rotate-45" /> <span>Recapture Photo</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Verification attributes & remarks */}
            <div className="space-y-4 pt-4 border-t border-zinc-850">
              <h3 className="font-bold text-xs uppercase tracking-wider text-emerald-400">
                Step 2: Access Authorization Details
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                
                {/* Verification Status */}
                <div className="space-y-1">
                  <label className="text-[9px] uppercase font-bold text-zinc-500">Manual Verification Match</label>
                  <select
                    value={verificationStatus}
                    onChange={(e) => setVerificationStatus(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-850 rounded-xl py-2 px-3 outline-none"
                  >
                    <option value="verified">Verified Match</option>
                    <option value="bypass_authorized">Bypass (Manual Authorization)</option>
                    <option value="failed">Verification Failed (Access Denied)</option>
                  </select>
                </div>

                {/* Handler Staff */}
                <div className="space-y-1">
                  <label className="text-[9px] uppercase font-bold text-zinc-500">Responsible Handler</label>
                  <select
                    value={selectedStaffId}
                    onChange={(e) => setSelectedStaffId(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-850 rounded-xl py-2 px-3 outline-none cursor-pointer"
                  >
                    <option value="">-- Select Duty Staff --</option>
                    {staffList.map(s => (
                      <option key={s._id} value={s._id}>
                        {s.username} ({s.role === 'owner' ? 'Owner / Super Admin' : 'Team Member'})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Visit Remarks */}
                <div className="space-y-1">
                  <label className="text-[9px] uppercase font-bold text-zinc-500">Access Remarks / Notes</label>
                  <input
                    type="text"
                    placeholder="Remarks (optional)"
                    value={entryRemarks}
                    onChange={(e) => setEntryRemarks(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-850 rounded-xl py-2 px-3 outline-none"
                  />
                </div>

              </div>

              <div className="flex justify-end space-x-2 pt-2 text-xs">
                <button
                  onClick={handleResetFlow}
                  className="px-5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-850 text-zinc-400 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitEntry}
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-450 hover:to-teal-450 text-white font-semibold flex items-center space-x-1.5 shadow-lg active:scale-95 cursor-pointer disabled:opacity-40"
                >
                  <FiUserCheck />
                  <span>{submitting ? 'Logging entry...' : 'Confirm Access & Open Locker'}</span>
                </button>
              </div>
            </div>

          </div>

          {/* Column 2: Selected Client summary profile */}
          <div className="space-y-6">
            
            {/* Customer Summary Card */}
            <div className="bg-zinc-900/10 light:bg-zinc-200/10 border border-zinc-900 light:border-zinc-300 rounded-3xl p-5 space-y-4">
              <h4 className="font-bold text-xs uppercase tracking-wider text-zinc-500">Customer Details</h4>
              <div className="flex items-center space-x-3">
                <img
                  src={`${API_HOST}${selectedClient.customer.photoUrl}`}
                  alt="Customer Avatar"
                  className="w-12 h-12 rounded-xl object-cover border border-zinc-800"
                />
                <div>
                  <h4 className="font-bold text-sm">{selectedClient.customer.name}</h4>
                  <p className="text-[10px] text-emerald-400 font-mono font-bold">
                    Locker {selectedClient.customer.lockerId.lockerNumber}
                  </p>
                </div>
              </div>

              <div className="space-y-2.5 text-xs border-t border-zinc-850/40 pt-3">
                <div>
                  <span className="text-[9px] text-zinc-550 uppercase font-bold block">Mobile Contact</span>
                  <span className="font-semibold text-zinc-350 light:text-zinc-800">{selectedClient.customer.mobile}</span>
                </div>
                <div>
                  <span className="text-[9px] text-zinc-550 uppercase font-bold block">Aadhaar Verification ID</span>
                  <span className="font-mono text-zinc-350 light:text-zinc-800">{selectedClient.customer.aadhaarNumber}</span>
                </div>
              </div>
            </div>

            {/* Beneficiaries checklist */}
            <div className="bg-zinc-900/10 light:bg-zinc-200/10 border border-zinc-900 light:border-zinc-300 rounded-3xl p-5 space-y-3">
              <h4 className="font-bold text-xs uppercase tracking-wider text-zinc-500">Authorized Beneficiaries</h4>
              
              {selectedClient.beneficiaries.length === 0 ? (
                <p className="text-xs text-zinc-500 italic">No beneficiaries registered</p>
              ) : (
                selectedClient.beneficiaries.map(ben => (
                  <div
                    key={ben._id}
                    onClick={() => {
                      // Allow selecting beneficiary to replace stored visual reference comparison
                      setSelectedClient(prev => ({
                        ...prev,
                        customer: {
                          ...prev.customer,
                          name: `${prev.customer.name} (Visited by Beneficiary: ${ben.name})`,
                          photoUrl: ben.photoUrl // Temporarily set avatar for inspection
                        }
                      }));
                      toast.success(`Comparing against beneficiary ${ben.name}`);
                    }}
                    className="flex items-center space-x-2.5 p-2 rounded-xl bg-zinc-950/60 light:bg-zinc-100 hover:bg-zinc-900 border border-zinc-850 light:border-zinc-300 text-xs cursor-pointer group transition-all"
                  >
                    <img
                      src={`${API_HOST}${ben.photoUrl}`}
                      alt={ben.name}
                      className="w-8 h-8 rounded object-cover border border-zinc-800"
                    />
                    <div>
                      <p className="font-bold">{ben.name}</p>
                      <p className="text-[9px] text-zinc-500 uppercase">{ben.relationship}</p>
                    </div>
                  </div>
                ))
              )}
            </div>

          </div>

        </div>
      )}

      {/* STEP 3: Success Screen */}
      {step === 3 && (
        <div className="w-full max-w-md mx-auto bg-zinc-900/10 light:bg-zinc-200/10 border border-zinc-900 light:border-zinc-300 rounded-3xl p-8 flex flex-col items-center justify-center text-center space-y-6 shadow-2xl">
          
          <div className="w-16 h-16 rounded-full bg-emerald-500/15 text-emerald-400 flex items-center justify-center border-2 border-emerald-500/30 animate-pulse">
            <FiCheckCircle className="w-10 h-10" />
          </div>

          <div className="space-y-1">
            <h3 className="text-lg font-bold">Locker Access Granted</h3>
            <p className="text-xs text-zinc-400">
              The visit entry transaction has been saved and logged in the immutable audit trail.
            </p>
          </div>

          <div className="w-full bg-zinc-950 p-4 rounded-2xl border border-zinc-850 text-left text-xs font-mono space-y-1.5">
            <p><span className="text-zinc-500">LOCKER:</span> <span className="text-emerald-400 font-bold">{selectedClient?.customer?.lockerId?.lockerNumber}</span></p>
            <p><span className="text-zinc-500">VISITOR:</span> {selectedClient?.customer?.name}</p>
            <p><span className="text-zinc-500">VERIFICATION:</span> {verificationStatus.toUpperCase()}</p>
            <p><span className="text-zinc-500">HANDLER:</span> {staffList.find(s => s._id === selectedStaffId)?.username || 'Owner'}</p>
            <p><span className="text-zinc-500">TIMESTAMP:</span> {new Date().toLocaleString()}</p>
          </div>

          <button
            onClick={handleResetFlow}
            className="w-full bg-emerald-500 hover:bg-emerald-450 text-white font-semibold py-2.5 rounded-xl text-xs shadow-md transition-all cursor-pointer"
          >
            Start New Check-In
          </button>

        </div>
      )}

    </div>
  );
};

export default LockerEntryFlow;
