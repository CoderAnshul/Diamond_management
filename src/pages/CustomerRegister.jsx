import React, { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import Webcam from 'react-webcam';
import api from '../utils/api';
import { FiCamera, FiUploadCloud, FiTrash2, FiArrowLeft, FiCheck } from 'react-icons/fi';
import toast from 'react-hot-toast';

const CustomerRegister = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditMode = !!id;
  
  const { register, handleSubmit, setValue, formState: { errors } } = useForm();
  
  const [lockers, setLockers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // Camera & Image management
  const [useCamera, setUseCamera] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState(null); // Holds base64 or file URL
  const [photoFile, setPhotoFile] = useState(null); // File object if uploaded via file picker
  const webcamRef = useRef(null);

  // Fetch available lockers & customer data if in edit mode
  useEffect(() => {
    const fetchLockers = async () => {
      try {
        const response = await api.get('/lockers', { params: { status: 'available' } });
        if (response.data.success) {
          setLockers(response.data.lockers);
        }
      } catch (err) {
        console.error('Failed to fetch lockers:', err.message);
      }
    };

    const fetchCustomerData = async () => {
      if (!isEditMode) return;
      setLoading(true);
      try {
        const response = await api.get(`/customers/${id}`);
        if (response.data.success) {
          const { customer } = response.data;
          
          // Pre-populate form fields
          setValue('name', customer.name);
          setValue('mobile', customer.mobile);
          setValue('altMobile', customer.altMobile || '');
          setValue('address', customer.address);
          setValue('aadhaarNumber', customer.aadhaarNumber);
          setValue('depositAmount', customer.depositAmount);
          setValue('agreementDate', customer.agreementDate ? customer.agreementDate.split('T')[0] : '');
          setValue('remarks', customer.remarks || '');
          
          if (customer.lockerId) {
            // Append currently occupied locker to the list of choices
            setLockers(prev => [customer.lockerId, ...prev]);
            setValue('lockerId', customer.lockerId._id);
          }
          
          setCapturedPhoto(`http://localhost:5000${customer.photoUrl}`);
        }
      } catch (err) {
        toast.error('Failed to load customer profile');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchLockers();
    fetchCustomerData();
  }, [id, isEditMode, setValue]);

  const capturePhoto = () => {
    try {
      if (!webcamRef || !webcamRef.current) {
        toast.error('Webcam is not initialized or ready yet.');
        return;
      }
      const imageSrc = webcamRef.current.getScreenshot();
      if (!imageSrc) {
        toast.error('Failed to capture snapshot. Please make sure your camera is active.');
        return;
      }
      setCapturedPhoto(imageSrc);
      setPhotoFile(null); // Clear manual file if taken
      setUseCamera(false);
      toast.success('Photo captured successfully');
    } catch (error) {
      console.error('Camera capture error:', error);
      toast.error('Camera error: ' + error.message);
    }
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setCapturedPhoto(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const clearPhoto = () => {
    setCapturedPhoto(null);
    setPhotoFile(null);
  };

  const onSubmit = async (data) => {
    if (!capturedPhoto) {
      toast.error('Customer photo is required for security verification');
      return;
    }

    setSubmitting(true);
    const formData = new FormData();
    
    // Append standard fields
    Object.keys(data).forEach(key => {
      if (key === 'aadhaarNumber' && data[key]) {
        formData.append(key, data[key].replace(/[\s-]/g, ''));
      } else {
        formData.append(key, data[key]);
      }
    });

    // Append files
    if (photoFile) {
      formData.append('photo', photoFile);
    } else if (capturedPhoto.startsWith('data:image')) {
      // Base64 camera captured photo fallback handled in backend
      formData.append('photoData', capturedPhoto);
    }

    // PDF documents
    if (data.aadhaarDocFiles?.[0]) formData.append('aadhaarDoc', data.aadhaarDocFiles[0]);
    if (data.agreementDocFiles?.[0]) formData.append('agreementDoc', data.agreementDocFiles[0]);
    if (data.otherDocFiles?.[0]) formData.append('otherDoc', data.otherDocFiles[0]);

    try {
      let response;
      if (isEditMode) {
        response = await api.put(`/customers/${id}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      } else {
        response = await api.post('/customers', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      }

      if (response.data.success) {
        toast.success(isEditMode ? 'Customer updated successfully' : 'Customer registered successfully');
        navigate(isEditMode ? `/customers/${id}` : '/customers');
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Registration failed');
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const onError = (errors) => {
    const messages = Object.values(errors).map(err => err.message);
    if (messages.length > 0) {
      toast.error(`Please correct: ${messages.join(', ')}`);
    }
  };

  if (loading) {
    return (
      <div className="h-full flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm font-semibold tracking-wider text-zinc-400 uppercase">Loading customer details...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex items-center space-x-3">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-xl bg-zinc-900 light:bg-zinc-200 hover:scale-105 active:scale-95 transition-all text-zinc-400"
        >
          <FiArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h2 className="text-xl font-bold tracking-tight">
            {isEditMode ? 'Modify Customer Profile' : 'Register New Customer'}
          </h2>
          <p className="text-sm text-zinc-400">Please provide accurate verification details below</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit, onError)} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Master Photo Capture */}
        <div className="bg-zinc-900/10 light:bg-zinc-200/10 border border-zinc-900 light:border-zinc-300 rounded-3xl p-6 flex flex-col items-center space-y-6">
          <h4 className="font-bold text-xs uppercase tracking-wider text-zinc-500">Master Verification Image</h4>
          
          {/* Photo Display Window */}
          <div className="w-64 h-64 rounded-2xl overflow-hidden border border-zinc-800 light:border-zinc-300 bg-zinc-950 flex items-center justify-center relative group">
            {useCamera ? (
              <Webcam
                audio={false}
                ref={webcamRef}
                screenshotFormat="image/jpeg"
                videoConstraints={{ width: 400, height: 400, facingMode: 'user' }}
                className="w-full h-full object-cover"
              />
            ) : capturedPhoto ? (
              <img src={capturedPhoto} alt="Customer Avatar" className="w-full h-full object-cover" />
            ) : (
              <div className="text-center p-4">
                <FiCamera className="w-10 h-10 mx-auto text-zinc-600 mb-2" />
                <p className="text-xs text-zinc-500 font-semibold">No verification image set</p>
              </div>
            )}
            
            {capturedPhoto && !useCamera && (
              <button
                type="button"
                onClick={clearPhoto}
                className="absolute top-2 right-2 p-1.5 rounded-lg bg-rose-500/80 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-rose-600"
              >
                <FiTrash2 className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Action Buttons */}
          <div className="w-full flex flex-col space-y-2">
            {useCamera ? (
              <button
                type="button"
                onClick={capturePhoto}
                className="w-full bg-emerald-500 text-white font-semibold py-2.5 rounded-xl text-xs flex items-center justify-center space-x-1.5"
              >
                <FiCheck className="w-4 h-4" />
                <span>Capture Snapshot</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setUseCamera(true)}
                className="w-full bg-zinc-850 light:bg-zinc-300 hover:bg-zinc-800 text-zinc-100 light:text-zinc-900 font-semibold py-2.5 rounded-xl text-xs flex items-center justify-center space-x-1.5"
              >
                <FiCamera className="w-4 h-4" />
                <span>Use Live Webcam</span>
              </button>
            )}

            {!useCamera && (
              <label className="w-full bg-zinc-900/60 light:bg-zinc-200 border border-zinc-850 light:border-zinc-300 hover:bg-zinc-850 hover:text-zinc-100 py-2.5 rounded-xl text-xs font-semibold text-center cursor-pointer flex items-center justify-center space-x-1.5">
                <FiUploadCloud className="w-4 h-4" />
                <span>Upload From File</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
              </label>
            )}
          </div>
        </div>

        {/* Right Column: Customer registration fields */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-zinc-900/10 light:bg-zinc-200/10 border border-zinc-900 light:border-zinc-300 rounded-3xl p-6 space-y-4">
            <h4 className="font-bold text-xs uppercase tracking-wider text-emerald-400">Personal Information</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Customer Name */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide">Customer Name</label>
                <input
                  type="text"
                  placeholder="Enter full name"
                  className="w-full bg-zinc-950 light:bg-zinc-100 border border-zinc-850 light:border-zinc-300 focus:border-emerald-500 rounded-xl py-2 px-3 text-xs outline-none transition-all"
                  {...register('name', { required: 'Name is required' })}
                />
                {errors.name && <span className="text-[9px] text-rose-500 font-semibold">{errors.name.message}</span>}
              </div>

              {/* Aadhaar Number */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide">Aadhaar Number</label>
                <input
                  type="text"
                  placeholder="xxxx-xxxx-xxxx"
                  className="w-full bg-zinc-950 light:bg-zinc-100 border border-zinc-850 light:border-zinc-300 focus:border-emerald-500 rounded-xl py-2 px-3 text-xs outline-none transition-all"
                  {...register('aadhaarNumber', {
                    required: 'Aadhaar is required',
                    pattern: { value: /^\d{4}[\s-]?\d{4}[\s-]?\d{4}$/, message: 'Aadhaar must be a valid 12-digit number' }
                  })}
                />
                {errors.aadhaarNumber && <span className="text-[9px] text-rose-500 font-semibold">{errors.aadhaarNumber.message}</span>}
              </div>

              {/* Mobile */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide">Mobile Number</label>
                <input
                  type="text"
                  placeholder="10-digit number"
                  className="w-full bg-zinc-950 light:bg-zinc-100 border border-zinc-850 light:border-zinc-300 focus:border-emerald-500 rounded-xl py-2 px-3 text-xs outline-none transition-all"
                  {...register('mobile', {
                    required: 'Mobile is required',
                    pattern: { value: /^\d{10}$/, message: 'Must be 10 digits' }
                  })}
                />
                {errors.mobile && <span className="text-[9px] text-rose-500 font-semibold">{errors.mobile.message}</span>}
              </div>

              {/* Alt Mobile */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide">Alternative Contact</label>
                <input
                  type="text"
                  placeholder="Alt number (optional)"
                  className="w-full bg-zinc-950 light:bg-zinc-100 border border-zinc-850 light:border-zinc-300 focus:border-emerald-500 rounded-xl py-2 px-3 text-xs outline-none transition-all"
                  {...register('altMobile')}
                />
              </div>

              {/* Address */}
              <div className="space-y-1 md:col-span-2">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide">Address</label>
                <textarea
                  rows="2"
                  placeholder="Enter residential address"
                  className="w-full bg-zinc-950 light:bg-zinc-100 border border-zinc-850 light:border-zinc-300 focus:border-emerald-500 rounded-xl py-2 px-3 text-xs outline-none transition-all resize-none"
                  {...register('address', { required: 'Address is required' })}
                ></textarea>
                {errors.address && <span className="text-[9px] text-rose-500 font-semibold">{errors.address.message}</span>}
              </div>
            </div>
          </div>

          <div className="bg-zinc-900/10 light:bg-zinc-200/10 border border-zinc-900 light:border-zinc-300 rounded-3xl p-6 space-y-4">
            <h4 className="font-bold text-xs uppercase tracking-wider text-emerald-400">Locker Assignment & Agreement</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Locker Number */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide">Assign Locker</label>
                <select
                  className="w-full bg-zinc-950 light:bg-zinc-100 border border-zinc-850 light:border-zinc-300 focus:border-emerald-500 rounded-xl py-2 px-3 text-xs outline-none transition-all cursor-pointer"
                  {...register('lockerId')}
                >
                  <option value="">-- No Locker Assigned --</option>
                  {lockers.map(l => (
                    <option key={l._id} value={l._id}>
                      Locker {l.lockerNumber} ({l.size})
                    </option>
                  ))}
                </select>
              </div>

              {/* Deposit Amount */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide">Deposit Amount (₹)</label>
                <input
                  type="number"
                  placeholder="Enter security deposit"
                  className="w-full bg-zinc-950 light:bg-zinc-100 border border-zinc-850 light:border-zinc-300 focus:border-emerald-500 rounded-xl py-2 px-3 text-xs outline-none transition-all"
                  {...register('depositAmount', { required: 'Deposit amount is required' })}
                />
                {errors.depositAmount && <span className="text-[9px] text-rose-500 font-semibold">{errors.depositAmount.message}</span>}
              </div>

              {/* Agreement Date */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide">Agreement Date</label>
                <input
                  type="date"
                  className="w-full bg-zinc-950 light:bg-zinc-100 border border-zinc-850 light:border-zinc-300 focus:border-emerald-500 rounded-xl py-2 px-3 text-xs outline-none transition-all"
                  {...register('agreementDate', { required: 'Agreement Date is required' })}
                />
                {errors.agreementDate && <span className="text-[9px] text-rose-500 font-semibold">{errors.agreementDate.message}</span>}
              </div>

              {/* Remarks */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide">Remarks</label>
                <input
                  type="text"
                  placeholder="Additional notes"
                  className="w-full bg-zinc-950 light:bg-zinc-100 border border-zinc-850 light:border-zinc-300 focus:border-emerald-500 rounded-xl py-2 px-3 text-xs outline-none transition-all"
                  {...register('remarks')}
                />
              </div>
            </div>
          </div>

          {/* Secure Document Pickers */}
          <div className="bg-zinc-900/10 light:bg-zinc-200/10 border border-zinc-900 light:border-zinc-300 rounded-3xl p-6 space-y-4">
            <h4 className="font-bold text-xs uppercase tracking-wider text-emerald-400">Verification Attachments (PDFs / Images)</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              
              {/* Aadhaar */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide">Aadhaar PDF</label>
                <input
                  type="file"
                  accept="application/pdf,image/*"
                  className="w-full text-zinc-500 file:mr-2 file:py-1 file:px-2 file:rounded-lg file:border-0 file:text-[10px] file:font-semibold file:bg-zinc-900 file:text-emerald-400 hover:file:bg-zinc-800"
                  {...register('aadhaarDocFiles')}
                />
              </div>

              {/* Agreement */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide">Agreement Document</label>
                <input
                  type="file"
                  accept="application/pdf,image/*"
                  className="w-full text-zinc-500 file:mr-2 file:py-1 file:px-2 file:rounded-lg file:border-0 file:text-[10px] file:font-semibold file:bg-zinc-900 file:text-emerald-400 hover:file:bg-zinc-800"
                  {...register('agreementDocFiles')}
                />
              </div>

              {/* Other */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide">Other Document</label>
                <input
                  type="file"
                  accept="application/pdf,image/*"
                  className="w-full text-zinc-500 file:mr-2 file:py-1 file:px-2 file:rounded-lg file:border-0 file:text-[10px] file:font-semibold file:bg-zinc-900 file:text-emerald-400 hover:file:bg-zinc-800"
                  {...register('otherDocFiles')}
                />
              </div>

            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-semibold py-3.5 rounded-2xl text-xs shadow-lg active:scale-98 disabled:opacity-40 cursor-pointer"
          >
            {submitting ? 'Processing Registration...' : isEditMode ? 'Update Customer Profile' : 'Submit & Open Locker'}
          </button>
        </div>

      </form>

    </div>
  );
};

export default CustomerRegister;
