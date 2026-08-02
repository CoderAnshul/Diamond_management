import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import {
  FiSettings,
  FiRefreshCw,
  FiDownload,
  FiDatabase,
  FiCheckCircle,
  FiCamera,
  FiClock,
  FiBriefcase
} from 'react-icons/fi';
import toast from 'react-hot-toast';

const SettingsPage = () => {
  // Settings Form
  const [companyName, setCompanyName] = useState('');
  const [companyAddress, setCompanyAddress] = useState('');
  const [companyPhone, setCompanyPhone] = useState('');
  
  // Camera settings
  const [cameraDeviceId, setCameraDeviceId] = useState('');
  const [videoDevices, setVideoDevices] = useState([]);
  
  // Backup configurations
  const [autoBackupEnabled, setAutoBackupEnabled] = useState(true);
  const [backupInterval, setBackupInterval] = useState(24);
  const [gDriveFolderId, setGDriveFolderId] = useState('');
  const [gDriveRefreshToken, setGDriveRefreshToken] = useState('');
  
  // Backup logs
  const [backupLogs, setBackupLogs] = useState([]);
  const [lastBackup, setLastBackup] = useState(null);
  const [triggeringBackup, setTriggeringBackup] = useState(false);
  const [restoringBackup, setRestoringBackup] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);

  const fetchSettings = async () => {
    try {
      const response = await api.get('/settings');
      if (response.data.success) {
        const { settings } = response.data;
        setCompanyName(settings.companyName || '');
        setCompanyAddress(settings.companyAddress || '');
        setCompanyPhone(settings.companyPhone || '');
        setCameraDeviceId(settings.cameraDeviceId || '');
        
        if (settings.backupConfig) {
          setAutoBackupEnabled(settings.backupConfig.autoBackupEnabled);
          setBackupInterval(settings.backupConfig.backupIntervalHours || 24);
          setGDriveFolderId(settings.backupConfig.googleDriveFolderId || '');
          setGDriveRefreshToken(settings.backupConfig.googleDriveRefreshToken || '');
          
          if (settings.backupConfig.lastBackupTime) {
            setLastBackup({
              time: settings.backupConfig.lastBackupTime,
              status: settings.backupConfig.lastBackupStatus
            });
          }
        }
      }
    } catch (err) {
      toast.error('Failed to load system settings');
    }
  };

  const fetchBackupLogs = async () => {
    try {
      const response = await api.get('/backups');
      if (response.data.success) {
        setBackupLogs(response.data.logs);
      }
    } catch (err) {
      console.error('Failed to load backup logs:', err.message);
    }
  };

  const getMediaDevices = async () => {
    try {
      // Prompt camera access permission
      await navigator.mediaDevices.getUserMedia({ video: true });
      const devices = await navigator.mediaDevices.enumerateDevices();
      const video = devices.filter(device => device.kind === 'videoinput');
      setVideoDevices(video);
    } catch (err) {
      console.warn('Camera access denied or unavailable:', err.message);
    }
  };

  useEffect(() => {
    fetchSettings();
    fetchBackupLogs();
    getMediaDevices();
  }, []);

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      const response = await api.put('/settings', {
        companyName,
        companyAddress,
        companyPhone,
        cameraDeviceId,
        backupConfig: {
          autoBackupEnabled,
          backupIntervalHours: backupInterval,
          googleDriveFolderId: gDriveFolderId,
          googleDriveRefreshToken: gDriveRefreshToken
        }
      });
      if (response.data.success) {
        toast.success('System settings saved successfully');
        fetchSettings();
      }
    } catch (err) {
      toast.error('Failed to save settings');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleTriggerBackup = async () => {
    setTriggeringBackup(true);
    toast.loading('Generating system backup...');
    try {
      const response = await api.post('/backups/trigger');
      toast.dismiss();
      if (response.data.success) {
        toast.success('Backup archive created successfully');
        fetchSettings();
        fetchBackupLogs();
      }
    } catch (err) {
      toast.dismiss();
      toast.error(err.response?.data?.error || 'Backup creation failed');
    } finally {
      setTriggeringBackup(false);
    }
  };

  const handleDownloadBackup = (id, filename) => {
    // Open in a new tab to trigger file download stream
    window.open(`http://localhost:5000/api/v1/backups/download/${id}`, '_blank');
  };

  const handleRestoreBackup = async (id, filename) => {
    const confirmation = window.prompt(`WARNING: Restoring will overwrite all current system data with backup "${filename}". Type "RESTORE" to confirm:`);
    if (confirmation === 'RESTORE') {
      setRestoringBackup(true);
      toast.loading('Restoring system checkpoints...');
      try {
        const response = await api.post(`/backups/restore/${id}`);
        toast.dismiss();
        if (response.data.success) {
          toast.success('System database restored successfully!');
          fetchBackupLogs();
        }
      } catch (err) {
        toast.dismiss();
        toast.error('Restoration checkpoint failed');
      } finally {
        setRestoringBackup(false);
      }
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold tracking-tight">System Settings & Backups</h2>
        <p className="text-sm text-zinc-400">Configure business parameters, peripherals, and Google Drive backups</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Config Panel */}
        <div className="lg:col-span-2 space-y-6">
          <form onSubmit={handleSaveSettings} className="bg-zinc-900/10 light:bg-zinc-200/10 border border-zinc-900 light:border-zinc-300 rounded-3xl p-6 shadow-xl space-y-6">
            
            {/* General details */}
            <div className="space-y-4">
              <h4 className="font-bold text-xs uppercase tracking-wider text-emerald-400 flex items-center space-x-1.5 border-b border-zinc-850 pb-2">
                <FiBriefcase /> <span>Company Specifications</span>
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase">Office Name</label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-850 rounded-xl py-2 px-3 outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase">Contact Number</label>
                  <input
                    type="text"
                    value={companyPhone}
                    onChange={(e) => setCompanyPhone(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-850 rounded-xl py-2 px-3 outline-none"
                  />
                </div>
                <div className="space-y-1 md:col-span-2">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase">Office Address</label>
                  <textarea
                    rows="2"
                    value={companyAddress}
                    onChange={(e) => setCompanyAddress(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-850 rounded-xl py-2 px-3 outline-none resize-none"
                  ></textarea>
                </div>
              </div>
            </div>

            {/* Peripherals */}
            <div className="space-y-4 pt-4 border-t border-zinc-850">
              <h4 className="font-bold text-xs uppercase tracking-wider text-emerald-400 flex items-center space-x-1.5">
                <FiCamera /> <span>Verification Cameras</span>
              </h4>
              <div className="space-y-1 text-xs">
                <label className="text-[10px] font-bold text-zinc-500 uppercase">Default Camera Source</label>
                <select
                  value={cameraDeviceId}
                  onChange={(e) => setCameraDeviceId(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-850 rounded-xl py-2.5 px-3 outline-none cursor-pointer"
                >
                  <option value="">-- Let Browser Choose Default --</option>
                  {videoDevices.map(device => (
                    <option key={device.deviceId} value={device.deviceId}>
                      {device.label || `Camera ${device.deviceId.substring(0, 5)}...`}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Google Drive Configuration */}
            <div className="space-y-4 pt-4 border-t border-zinc-850">
              <h4 className="font-bold text-xs uppercase tracking-wider text-emerald-400 flex items-center space-x-1.5">
                <FiDatabase /> <span>Google Drive Cloud Storage</span>
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase">GDrive Folder ID</label>
                  <input
                    type="text"
                    placeholder="Enter Drive folder hash ID"
                    value={gDriveFolderId}
                    onChange={(e) => setGDriveFolderId(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-850 rounded-xl py-2 px-3 outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase">GDrive Refresh Token</label>
                  <input
                    type="password"
                    placeholder="Enter OAuth2 refresh token"
                    value={gDriveRefreshToken}
                    onChange={(e) => setGDriveRefreshToken(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-850 rounded-xl py-2 px-3 outline-none"
                  />
                </div>
                <div className="space-y-1 md:col-span-2">
                  <label className="flex items-center space-x-2 cursor-pointer pt-2">
                    <input
                      type="checkbox"
                      checked={autoBackupEnabled}
                      onChange={() => setAutoBackupEnabled(!autoBackupEnabled)}
                      className="accent-emerald-500 cursor-pointer"
                    />
                    <span className="font-semibold text-zinc-350">Enable Auto Backup scheduler</span>
                  </label>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={savingSettings}
              className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-450 hover:to-teal-450 text-white font-semibold py-3 rounded-xl text-xs shadow-md cursor-pointer"
            >
              {savingSettings ? 'Saving configurations...' : 'Save System Settings'}
            </button>
          </form>
        </div>

        {/* Right Column: Backup status & History */}
        <div className="space-y-6">
          
          {/* Status summary */}
          <div className="bg-zinc-900/10 light:bg-zinc-200/10 border border-zinc-900 light:border-zinc-300 rounded-3xl p-5 space-y-4 shadow-xl">
            <h4 className="font-bold text-xs uppercase tracking-wider text-zinc-500">Backup Status Summary</h4>
            
            <div className="flex items-center space-x-3.5">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center border ${
                lastBackup?.status === 'success' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
              }`}>
                <FiCheckCircle className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold capitalize">Auto Sync Interval: {backupInterval} Hrs</p>
                <p className="text-[10px] text-zinc-500 mt-0.5">
                  Last Backup Run: {lastBackup?.time ? new Date(lastBackup.time).toLocaleString() : 'Never'}
                </p>
              </div>
            </div>

            <button
              onClick={handleTriggerBackup}
              disabled={triggeringBackup}
              className="w-full bg-zinc-950 border border-zinc-850 hover:bg-zinc-900 text-zinc-350 font-bold py-2 rounded-xl text-xs flex items-center justify-center space-x-1.5 shadow cursor-pointer disabled:opacity-40"
            >
              <FiRefreshCw className={triggeringBackup ? 'animate-spin' : ''} />
              <span>Trigger Manual Backup</span>
            </button>
          </div>

          {/* History table */}
          <div className="bg-zinc-900/10 light:bg-zinc-200/10 border border-zinc-900 light:border-zinc-300 rounded-3xl p-5 space-y-3 shadow-xl">
            <h4 className="font-bold text-xs uppercase tracking-wider text-zinc-500">Backup History</h4>

            <div className="space-y-3 max-h-[250px] overflow-y-auto pr-1">
              {backupLogs.length === 0 ? (
                <p className="text-xs text-zinc-550 italic text-center py-6">No backups executed yet</p>
              ) : (
                backupLogs.map((log) => (
                  <div
                    key={log._id}
                    className="p-3 rounded-2xl bg-zinc-950/60 light:bg-zinc-100/60 border border-zinc-850 light:border-zinc-350 text-xs flex flex-col space-y-2"
                  >
                    <div className="flex justify-between items-start">
                      <div className="truncate pr-2">
                        <p className="font-bold truncate text-zinc-300 light:text-zinc-800" title={log.fileName}>
                          {log.fileName}
                        </p>
                        <p className="text-[9px] text-zinc-500 mt-0.5">
                          Size: {(log.sizeBytes / 1024).toFixed(1)} KB • {log.remarks}
                        </p>
                      </div>
                      <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase ${
                        log.status === 'success' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                      }`}>
                        {log.status}
                      </span>
                    </div>

                    {log.status === 'success' && (
                      <div className="flex space-x-2 border-t border-zinc-900 pt-2 text-[10px] font-bold">
                        <button
                          onClick={() => handleDownloadBackup(log._id, log.fileName)}
                          className="flex items-center space-x-1 text-emerald-400 hover:text-emerald-350 cursor-pointer"
                        >
                          <FiDownload /> <span>Download</span>
                        </button>
                        <button
                          onClick={() => handleRestoreBackup(log._id, log.fileName)}
                          className="flex items-center space-x-1 text-rose-400 hover:text-rose-350 cursor-pointer"
                        >
                          <FiRefreshCw /> <span>Restore</span>
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};

export default SettingsPage;
