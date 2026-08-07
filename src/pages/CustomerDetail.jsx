import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Webcam from 'react-webcam';
import api, { API_HOST } from '../utils/api';
import {
  FiArrowLeft,
  FiUserPlus,
  FiFileText,
  FiCheckCircle,
  FiAlertTriangle,
  FiTrash2,
  FiPlus,
  FiCamera,
  FiPhone,
  FiBook,
  FiInfo,
  FiExternalLink
} from 'react-icons/fi';
import toast from 'react-hot-toast';

const CustomerDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Locker modification modals
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferLockerId, setTransferLockerId] = useState('');
  const [availableLockers, setAvailableLockers] = useState([]);
  const [lockerActionRemarks, setLockerActionRemarks] = useState('');

  // Beneficiary management
  const [showBeneficiaryModal, setShowBeneficiaryModal] = useState(false);
  const [beneficiaryName, setBeneficiaryName] = useState('');
  const [beneficiaryRel, setBeneficiaryRel] = useState('');
  const [beneficiaryMobile, setBeneficiaryMobile] = useState('');
  const [beneficiaryAadhaar, setBeneficiaryAadhaar] = useState('');
  const [beneficiaryPhoto, setBeneficiaryPhoto] = useState(null);
  const [beneficiaryCamera, setBeneficiaryCamera] = useState(false);
  const [beneficiarySignature, setBeneficiarySignature] = useState(null);
  const [isNomineeSelection, setIsNomineeSelection] = useState(false);
  const webcamRef = useRef(null);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/customers/${id}`);
      if (response.data.success) {
        setProfile(response.data);
      }
    } catch (err) {
      toast.error('Failed to load customer profile');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    fetchProfile();
  }, [id]);

  const handleVacateLocker = async () => {
    if (!profile?.customer?.lockerId) return;
    if (window.confirm(`Are you sure you want to vacate locker ${profile.customer.lockerId.lockerNumber} assigned to ${profile.customer.name}?`)) {
      try {
        const remarks = window.prompt("Enter vacation remarks:") || '';
        const response = await api.post(`/lockers/${profile.customer.lockerId._id}/vacate`, { remarks });
        if (response.data.success) {
          toast.success('Locker vacated successfully');
          fetchProfile();
        }
      } catch (err) {
        toast.error('Failed to vacate locker');
      }
    }
  };

  const handleOpenTransferModal = async () => {
    setShowTransferModal(true);
    try {
      const response = await api.get('/lockers', { params: { status: 'available' } });
      if (response.data.success) {
        setAvailableLockers(response.data.lockers);
      }
    } catch (err) {
      console.error('Failed to fetch available lockers:', err.message);
    }
  };

  const handleTransferLocker = async () => {
    if (!transferLockerId) {
      toast.error('Please select a destination locker');
      return;
    }
    try {
      const response = await api.post(`/lockers/${profile.customer.lockerId._id}/transfer`, {
        newLockerId: transferLockerId,
        remarks: lockerActionRemarks
      });
      if (response.data.success) {
        toast.success('Locker transferred successfully');
        setShowTransferModal(false);
        setLockerActionRemarks('');
        setTransferLockerId('');
        fetchProfile();
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to transfer locker');
    }
  };

  // Beneficiary camera handle
  const captureBeneficiary = () => {
    const screenshot = webcamRef.current.getScreenshot();
    setBeneficiaryPhoto(screenshot);
    setBeneficiaryCamera(false);
  };

  const handleAddBeneficiary = async (e) => {
    e.preventDefault();
    if (!beneficiaryPhoto) {
      toast.error('Photo is required');
      return;
    }
    if (!beneficiarySignature) {
      toast.error('Signature image file is required');
      return;
    }

    const formData = new FormData();
    formData.append('name', beneficiaryName);
    formData.append('relationship', beneficiaryRel);
    formData.append('mobile', beneficiaryMobile);
    formData.append('aadhaarNumber', beneficiaryAadhaar);
    formData.append('photoData', beneficiaryPhoto);
    formData.append('signature', beneficiarySignature);
    formData.append('isNominee', isNomineeSelection);

    try {
      const response = await api.post(`/customers/${id}/beneficiaries`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (response.data.success) {
        toast.success(isNomineeSelection ? 'Nominee added successfully' : 'Beneficiary added successfully');
        setShowBeneficiaryModal(false);
        // Clear inputs
        setBeneficiaryName('');
        setBeneficiaryRel('');
        setBeneficiaryMobile('');
        setBeneficiaryAadhaar('');
        setBeneficiaryPhoto(null);
        setBeneficiarySignature(null);
        setIsNomineeSelection(false);
        fetchProfile();
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to add beneficiary');
    }
  };

  const handleDeleteBeneficiary = async (benId) => {
    if (window.confirm('Delete this beneficiary?')) {
      try {
        const response = await api.delete(`/customers/beneficiaries/${benId}`);
        if (response.data.success) {
          toast.success('Beneficiary removed');
          fetchProfile();
        }
      } catch (err) {
        toast.error('Failed to remove beneficiary');
      }
    }
  };

  if (loading) {
    return (
      <div className="h-full flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm font-semibold tracking-wider text-zinc-400 uppercase">Loading profile...</p>
      </div>
    );
  }

  const { customer, beneficiaries = [], visits = [] } = profile || {};

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => navigate('/customers')}
            className="p-2 rounded-xl bg-zinc-900 light:bg-zinc-200 hover:scale-105 active:scale-95 transition-all text-zinc-400 cursor-pointer"
          >
            <FiArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h2 className="text-xl font-bold tracking-tight">Customer Profile Details</h2>
            <p className="text-sm text-zinc-400">Complete verification data and visits history</p>
          </div>
        </div>
        
        {hasPermission('canEditCustomer') && (
          <button
            onClick={() => navigate(`/customers/edit/${customer._id}`)}
            className="bg-zinc-800 hover:bg-zinc-750 text-white px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-all"
          >
            Edit Profile
          </button>
        )}
      </div>

      {/* Profile Overview Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Visual Card (Photo + Locker Info) */}
        <div className="bg-zinc-900/10 light:bg-zinc-200/10 border border-zinc-900 light:border-zinc-300 rounded-3xl p-6 flex flex-col items-center justify-between text-center relative overflow-hidden">
          
          <img
            src={`${API_HOST}${customer.photoUrl}`}
            alt={customer.name}
            className="w-44 h-44 rounded-2xl object-cover border-2 border-emerald-500 shadow-2xl mb-4"
          />

          <h3 className="text-lg font-bold">{customer.name}</h3>
          <p className="text-xs text-zinc-500 font-semibold mb-6 flex items-center space-x-1 justify-center">
            <FiPhone className="w-3.5 h-3.5" /> <span>{customer.mobile}</span>
          </p>

          <div className="w-full bg-zinc-950/60 light:bg-zinc-100 p-4 rounded-2xl border border-zinc-850 light:border-zinc-300">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wide">Assigned Locker</span>
            {customer.lockerId ? (
              <div className="mt-2 space-y-3">
                <p className="text-xl font-bold font-mono text-emerald-400">
                  Locker {customer.lockerId.lockerNumber}
                </p>
                <p className="text-xs text-zinc-400 capitalize">Size: {customer.lockerId.size || 'N/A'}</p>
                
                {hasPermission('canManageLockers') && (
                  <div className="flex justify-center space-x-2 text-[10px] pt-1">
                    <button
                      onClick={handleOpenTransferModal}
                      className="px-3 py-1.5 rounded-lg bg-zinc-850 light:bg-zinc-200 hover:bg-zinc-800 text-zinc-300 light:text-zinc-800 transition-all font-semibold cursor-pointer"
                    >
                      Transfer
                    </button>
                    <button
                      onClick={handleVacateLocker}
                      className="px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-all font-semibold cursor-pointer"
                    >
                      Vacate
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm font-semibold text-zinc-500 mt-1">No active locker</p>
            )}
          </div>

        </div>

        {/* Text Card (Personal details & agreement) */}
        <div className="lg:col-span-2 bg-zinc-900/10 light:bg-zinc-200/10 border border-zinc-900 light:border-zinc-300 rounded-3xl p-6 space-y-6">
          
          <div>
            <h4 className="font-bold text-xs uppercase tracking-wider text-emerald-400 mb-3 flex items-center space-x-1.5">
              <FiInfo /> <span>Customer Metadata</span>
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1">
                <p className="text-zinc-500 font-bold uppercase text-[9px]">Aadhaar Number</p>
                <p className="font-mono text-zinc-300 light:text-zinc-800">{customer.aadhaarNumber}</p>
              </div>
              <div className="space-y-1">
                <p className="text-zinc-500 font-bold uppercase text-[9px]">Agreement Date</p>
                <p className="text-zinc-300 light:text-zinc-800">{new Date(customer.agreementDate).toLocaleDateString()}</p>
              </div>
              <div className="space-y-1">
                <p className="text-zinc-500 font-bold uppercase text-[9px]">Security Deposit</p>
                <p className="font-bold text-emerald-400">₹{customer.depositAmount.toLocaleString()}</p>
              </div>
              <div className="space-y-1">
                <p className="text-zinc-500 font-bold uppercase text-[9px]">Security Codeword</p>
                <p className="font-bold text-emerald-400 uppercase tracking-wider">{customer.codeWord || 'N/A'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-zinc-500 font-bold uppercase text-[9px]">Address</p>
                <p className="text-zinc-300 light:text-zinc-800 truncate">{customer.address}</p>
              </div>
              {customer.altMobile && (
                <div className="space-y-1">
                  <p className="text-zinc-500 font-bold uppercase text-[9px]">Alternative Contact</p>
                  <p className="text-zinc-300 light:text-zinc-800">{customer.altMobile}</p>
                </div>
              )}
              {customer.remarks && (
                <div className="space-y-1 md:col-span-2">
                  <p className="text-zinc-500 font-bold uppercase text-[9px]">Staff Remarks</p>
                  <p className="text-zinc-350 light:text-zinc-650 italic">"{customer.remarks}"</p>
                </div>
              )}
            </div>
          </div>

          {/* Secure Document Vault */}
          <div>
            <h4 className="font-bold text-xs uppercase tracking-wider text-emerald-400 mb-3 flex items-center space-x-1.5">
              <FiBook /> <span>Document Vault</span>
            </h4>
            {customer.documents.length === 0 ? (
              <p className="text-xs text-zinc-500 italic">No document scans uploaded</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {customer.documents.map((doc, idx) => (
                  <a
                    key={idx}
                    href={`${API_HOST}${doc.fileUrl}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between p-3 rounded-xl bg-zinc-950/60 light:bg-zinc-100 hover:bg-zinc-900 border border-zinc-850 light:border-zinc-300 text-xs font-semibold text-zinc-300 light:text-zinc-800 transition-all group"
                  >
                    <div className="flex items-center space-x-2">
                      <FiFileText className="text-emerald-400" />
                      <span className="capitalize">{doc.docType} Scan</span>
                    </div>
                    <FiExternalLink className="text-zinc-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </a>
                ))}
              </div>
            )}
          </div>

        </div>

      </div>

      {/* Bottom Layout: Nominee, Beneficiaries & Visits */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Nominee & Beneficiaries Column */}
        <div className="space-y-6">
          
          {/* Nominee Panel */}
          <div className="bg-zinc-900/10 light:bg-zinc-200/10 border border-zinc-900 light:border-zinc-300 rounded-3xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800/30">
              <h4 className="font-bold text-xs uppercase tracking-wider text-zinc-400">Registered Nominee</h4>
              {hasPermission('canEditCustomer') && !beneficiaries.some(b => b.isNominee) && (
                <button
                  onClick={() => {
                    setIsNomineeSelection(true);
                    setShowBeneficiaryModal(true);
                  }}
                  className="flex items-center space-x-1 text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded-lg font-bold hover:bg-emerald-500/20 cursor-pointer"
                >
                  <FiPlus className="w-3.5 h-3.5" />
                  <span>Add Nominee</span>
                </button>
              )}
            </div>

            <div className="space-y-3">
              {!beneficiaries.some(b => b.isNominee) ? (
                <p className="text-xs text-zinc-500 italic text-center py-6">No nominee registered (Max 1 Nominee)</p>
              ) : (
                beneficiaries.filter(b => b.isNominee).map((nom) => (
                  <div
                    key={nom._id}
                    className="flex items-center justify-between p-3 rounded-2xl bg-zinc-950/40 light:bg-zinc-100/60 border border-zinc-850 light:border-zinc-350 text-xs"
                  >
                    <div className="flex items-center space-x-3">
                      <img
                        src={`${API_HOST}${nom.photoUrl}`}
                        alt={nom.name}
                        className="w-10 h-10 rounded-lg object-cover border border-zinc-800"
                      />
                      <div>
                        <p className="font-bold">{nom.name}</p>
                        <p className="text-[10px] text-zinc-500 font-semibold uppercase">
                          {nom.relationship} • {nom.mobile}
                        </p>
                        <p className="text-[9px] text-zinc-500 font-mono mt-0.5">Aadhaar: {nom.aadhaarNumber}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-4">
                      {nom.signatureUrl && (
                        <div className="text-right flex flex-col items-end space-y-0.5">
                          <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-wide">Signature</span>
                          <img
                            src={`${API_HOST}${nom.signatureUrl}`}
                            alt="nominee signature"
                            className="w-14 h-8 object-contain bg-white rounded border border-zinc-800 cursor-pointer"
                            title="Click to view signature"
                            onClick={() => window.open(`${API_HOST}${nom.signatureUrl}`, '_blank')}
                          />
                        </div>
                      )}
                      
                      <div className="flex items-center space-x-2">
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-teal-500/15 text-teal-400">
                          Nominee
                        </span>
                        {hasPermission('canEditCustomer') && (
                          <button
                            onClick={() => handleDeleteBeneficiary(nom._id)}
                            className="p-1.5 rounded bg-rose-500/10 text-rose-400 hover:bg-rose-500/25 transition-colors cursor-pointer"
                          >
                            <FiTrash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Beneficiaries Panel */}
          <div className="bg-zinc-900/10 light:bg-zinc-200/10 border border-zinc-900 light:border-zinc-300 rounded-3xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800/30">
              <h4 className="font-bold text-xs uppercase tracking-wider text-zinc-400">Registered Beneficiaries</h4>
              {hasPermission('canEditCustomer') && beneficiaries.filter(b => !b.isNominee).length < 3 && (
                <button
                  onClick={() => {
                    setIsNomineeSelection(false);
                    setShowBeneficiaryModal(true);
                  }}
                  className="flex items-center space-x-1 text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded-lg font-bold hover:bg-emerald-500/20 cursor-pointer"
                >
                  <FiPlus className="w-3.5 h-3.5" />
                  <span>Add Beneficiary</span>
                </button>
              )}
            </div>

            <div className="space-y-3">
              {beneficiaries.filter(b => !b.isNominee).length === 0 ? (
                <p className="text-xs text-zinc-500 italic text-center py-6">No beneficiaries registered (Max 3 Beneficiaries)</p>
              ) : (
                beneficiaries.filter(b => !b.isNominee).map((ben) => (
                  <div
                    key={ben._id}
                    className="flex items-center justify-between p-3 rounded-2xl bg-zinc-950/40 light:bg-zinc-100/60 border border-zinc-850 light:border-zinc-355 text-xs"
                  >
                    <div className="flex items-center space-x-3">
                      <img
                        src={`${API_HOST}${ben.photoUrl}`}
                        alt={ben.name}
                        className="w-10 h-10 rounded-lg object-cover border border-zinc-800"
                      />
                      <div>
                        <p className="font-bold">{ben.name}</p>
                        <p className="text-[10px] text-zinc-500 font-semibold uppercase">
                          {ben.relationship} • {ben.mobile}
                        </p>
                        <p className="text-[9px] text-zinc-500 font-mono mt-0.5">Aadhaar: {ben.aadhaarNumber}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-4">
                      {ben.signatureUrl && (
                        <div className="text-right flex flex-col items-end space-y-0.5">
                          <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-wide">Signature</span>
                          <img
                            src={`${API_HOST}${ben.signatureUrl}`}
                            alt="beneficiary signature"
                            className="w-14 h-8 object-contain bg-white rounded border border-zinc-800 cursor-pointer"
                            title="Click to view signature"
                            onClick={() => window.open(`${API_HOST}${ben.signatureUrl}`, '_blank')}
                          />
                        </div>
                      )}

                      <div className="flex items-center space-x-2">
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-emerald-500/15 text-emerald-400">
                          {ben.status}
                        </span>
                        {hasPermission('canEditCustomer') && (
                          <button
                            onClick={() => handleDeleteBeneficiary(ben._id)}
                            className="p-1.5 rounded bg-rose-500/10 text-rose-400 hover:bg-rose-500/25 transition-colors cursor-pointer"
                          >
                            <FiTrash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

        {/* Visit logs timeline */}
        <div className="bg-zinc-900/10 light:bg-zinc-200/10 border border-zinc-900 light:border-zinc-300 rounded-3xl p-6 space-y-4">
          <div className="pb-3 border-b border-zinc-800/30">
            <h4 className="font-bold text-xs uppercase tracking-wider text-zinc-400">Visit Logs Timeline</h4>
          </div>

          <div className="space-y-4 max-h-[350px] overflow-y-auto pr-2">
            {visits.length === 0 ? (
              <p className="text-xs text-zinc-500 italic text-center py-6">No previous visit records</p>
            ) : (
              visits.map((visit) => (
                <div
                  key={visit._id}
                  className="p-3 rounded-2xl bg-zinc-950/40 light:bg-zinc-100/60 border border-zinc-850 light:border-zinc-350 flex items-start justify-between text-xs relative group"
                >
                  <div className="flex items-start space-x-3.5">
                    <img
                      src={`${API_HOST}${visit.capturedPhotoUrl}`}
                      alt="Captured Visit"
                      className="w-14 h-14 rounded-lg object-cover border border-zinc-800"
                    />
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-zinc-300 light:text-zinc-800">Locker Entry</span>
                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase ${
                          visit.verificationStatus === 'verified' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-400'
                        }`}>
                          {visit.verificationStatus}
                        </span>
                      </div>
                      <p className="text-[10px] text-zinc-500 mt-1">
                        Handled By: <span className="font-semibold">{visit.staffName}</span>
                      </p>
                      <p className="text-[10px] text-zinc-400 mt-0.5">{visit.remarks || 'No remarks recorded'}</p>
                    </div>
                  </div>
                  <div className="text-[10px] text-zinc-500 text-right font-medium">
                    {new Date(visit.visitDateTime).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* Modal - Transfer Locker */}
      {showTransferModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md glass-panel p-6 rounded-3xl border border-zinc-800 shadow-2xl space-y-4">
            <h3 className="text-md font-bold uppercase tracking-wider text-emerald-400">Transfer Locker Assignment</h3>
            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="text-zinc-400 font-semibold uppercase text-[9px]">Select New Locker</label>
                <select
                  value={transferLockerId}
                  onChange={(e) => setTransferLockerId(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-850 rounded-xl py-2 px-3 outline-none"
                >
                  <option value="">-- Select Available Locker --</option>
                  {availableLockers.map(l => (
                    <option key={l._id} value={l._id}>Locker {l.lockerNumber}{l.size ? ` (${l.size})` : ''}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-zinc-400 font-semibold uppercase text-[9px]">Remarks / Reason</label>
                <input
                  type="text"
                  placeholder="Reason for transfer"
                  value={lockerActionRemarks}
                  onChange={(e) => setLockerActionRemarks(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-850 rounded-xl py-2 px-3 outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-2 text-xs">
              <button
                onClick={() => setShowTransferModal(false)}
                className="px-4 py-2 rounded-xl bg-zinc-900 border border-zinc-850 text-zinc-400 font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleTransferLocker}
                className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-450 text-white font-semibold cursor-pointer"
              >
                Confirm Transfer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal - Add Beneficiary / Nominee */}
      {showBeneficiaryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <form
            onSubmit={handleAddBeneficiary}
            className="w-full max-w-lg glass-panel p-6 rounded-3xl border border-zinc-800 shadow-2xl space-y-4"
          >
            <h3 className="text-md font-bold uppercase tracking-wider text-emerald-400">
              Register {isNomineeSelection ? 'Nominee' : 'Beneficiary'}
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              
              {/* Webcam Stream / Photo Area */}
              <div className="flex flex-col items-center justify-center border border-zinc-850 p-3 rounded-2xl bg-zinc-950">
                {beneficiaryCamera ? (
                  <Webcam
                    audio={false}
                    ref={webcamRef}
                    screenshotFormat="image/jpeg"
                    videoConstraints={{ width: 300, height: 300, facingMode: 'user' }}
                    className="w-full h-36 object-cover rounded-xl mb-2"
                  />
                ) : beneficiaryPhoto ? (
                  <img src={beneficiaryPhoto} alt="Snapshot" className="w-full h-36 object-cover rounded-xl mb-2" />
                ) : (
                  <div className="h-36 flex flex-col items-center justify-center text-zinc-500">
                    <FiCamera className="w-8 h-8 mb-1" />
                    <span>No photo captured</span>
                  </div>
                )}

                {beneficiaryCamera ? (
                  <button
                    type="button"
                    onClick={captureBeneficiary}
                    className="bg-emerald-500 text-white py-1 px-3 rounded-lg font-bold"
                  >
                    Capture
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setBeneficiaryCamera(true)}
                    className="bg-zinc-850 text-zinc-300 py-1 px-3 rounded-lg font-bold"
                  >
                    Use Webcam
                  </button>
                )}
              </div>

              {/* Input details */}
              <div className="space-y-2">
                <div className="space-y-0.5">
                  <label className="text-[9px] uppercase font-bold text-zinc-500">Name</label>
                  <input
                    type="text"
                    required
                    value={beneficiaryName}
                    onChange={(e) => setBeneficiaryName(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-850 rounded-xl py-1.5 px-3 outline-none"
                  />
                </div>
                <div className="space-y-0.5">
                  <label className="text-[9px] uppercase font-bold text-zinc-500">Relationship</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Spouse, Son, Business Partner"
                    value={beneficiaryRel}
                    onChange={(e) => setBeneficiaryRel(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-850 rounded-xl py-1.5 px-3 outline-none"
                  />
                </div>
                <div className="space-y-0.5">
                  <label className="text-[9px] uppercase font-bold text-zinc-500">Mobile</label>
                  <input
                    type="text"
                    required
                    value={beneficiaryMobile}
                    onChange={(e) => setBeneficiaryMobile(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-850 rounded-xl py-1.5 px-3 outline-none"
                  />
                </div>
                <div className="space-y-0.5">
                  <label className="text-[9px] uppercase font-bold text-zinc-500">Aadhaar Number</label>
                  <input
                    type="text"
                    required
                    value={beneficiaryAadhaar}
                    onChange={(e) => setBeneficiaryAadhaar(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-850 rounded-xl py-1.5 px-3 outline-none"
                  />
                </div>
              </div>

              {/* Signature Image File Upload */}
              <div className="space-y-1 md:col-span-2 pt-2 border-t border-zinc-850">
                <label className="text-[10px] font-bold text-zinc-450 uppercase tracking-wide">
                  Signature Image File
                </label>
                <input
                  type="file"
                  accept="image/*"
                  required
                  onChange={(e) => setBeneficiarySignature(e.target.files[0])}
                  className="w-full bg-zinc-950 border border-zinc-850 rounded-xl py-2 px-3 text-xs outline-none text-zinc-300"
                />
                <p className="text-[9px] text-zinc-500 mt-0.5">
                  Please upload a scanned image or photo of their signature.
                </p>
              </div>

            </div>

            <div className="flex justify-end space-x-2 pt-2 text-xs">
              <button
                type="button"
                onClick={() => {
                  setShowBeneficiaryModal(false);
                  setBeneficiarySignature(null);
                  setIsNomineeSelection(false);
                }}
                className="px-4 py-2 rounded-xl bg-zinc-900 border border-zinc-850 text-zinc-400 font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-450 text-white font-semibold cursor-pointer"
              >
                Save {isNomineeSelection ? 'Nominee' : 'Beneficiary'}
              </button>
            </div>

          </form>
        </div>
      )}

    </div>
  );
};

export default CustomerDetail;
