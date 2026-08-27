import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  UploadCloud, 
  Database, 
  Trash2, 
  Eye, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Lock, 
  KeyRound, 
  LogOut, 
  Calendar,
  Edit,
  PlusCircle,
  Download,
  Save,
  Search,
  Crosshair,
  Cloud,
  RefreshCw,
  ArrowLeft,
  FileText,
  User,
  MapPin,
  Layers,
  Info,
  Check,
  EyeOff,
  LayoutDashboard,
  HardDrive,
  Settings,
  Cpu,
  BarChart3,
  ChevronRight,
  Sliders,
  FileCheck,
  FolderOpen
} from 'lucide-react';
import { Edition, NewsSection, GoogleDriveStatus } from '../types';
import { processUploadedPdf } from '../services/pdfService';
import { saveEdition, deleteEdition, verifyAdminCredentials, setAdminLoggedIn, saveEditionSections, clearAllStorage } from '../services/storageService';
import { 
  getGoogleDriveStatus, 
  connectGoogleDrive, 
  disconnectGoogleDrive, 
  uploadPdfToGoogleDrive, 
  syncAllEditionsToDrive, 
  loadMasterIndexFromDrive, 
  isGoogleDriveConnected 
} from '../services/googleDriveService';
import { InteractiveSectionEditor } from './InteractiveSectionEditor';
import { AdminEditionReader } from './AdminEditionReader';

interface AdminPortalProps {
  onBackToReader: () => void;
  isAdminLoggedIn: boolean;
  setIsAdminLoggedIn: (status: boolean) => void;
  editions: Edition[];
  onRefreshEditions: () => Promise<void>;
  onSelectEditionAndRead: (edition: Edition) => void;
  onPreviewSection?: (section: NewsSection) => void;
}

type AdminTab = 'dashboard' | 'upload' | 'archives' | 'sections' | 'drive' | 'settings' | 'system' | 'edit';

export function AdminPortal({
  onBackToReader,
  isAdminLoggedIn,
  setIsAdminLoggedIn,
  editions,
  onRefreshEditions,
  onSelectEditionAndRead,
  onPreviewSection,
}: AdminPortalProps) {
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  
  // Login Form State
  const [username, setUsername] = useState('vtv');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // In-Admin Live Reader Preview State (Keeps admin inside the Admin Portal!)
  const [previewingEdition, setPreviewingEdition] = useState<Edition | null>(null);

  // Google Drive State
  const [driveStatus, setDriveStatus] = useState<GoogleDriveStatus>(getGoogleDriveStatus());
  const [isDriveConnecting, setIsDriveConnecting] = useState<boolean>(false);
  const [isDriveSyncing, setIsDriveSyncing] = useState<boolean>(false);
  const [driveSyncProgress, setDriveSyncProgress] = useState<{ percent: number; message: string }>({ percent: 0, message: '' });
  const [saveToDriveOnUpload, setSaveToDriveOnUpload] = useState<boolean>(true);

  // Upload / Add New Form State
  const [uploadDate, setUploadDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [editionTitle, setEditionTitle] = useState<string>('वत्सगुल्म टाईम्स ई-पेपर');
  const [editionArea, setEditionArea] = useState<string>('वाशीम');
  const [chiefEditor, setChiefEditor] = useState<string>('प्रा. राम धनगर');
  const [executiveEditor, setExecutiveEditor] = useState<string>('स्वप्नील रोकडे');
  const [publishedFrom, setPublishedFrom] = useState<string>('वाशीम');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<{ percent: number; message: string }>({ percent: 0, message: '' });
  const [statusBanner, setStatusBanner] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Interactive Section Editor State
  const [activeSectionEdition, setActiveSectionEdition] = useState<Edition | null>(null);

  // Edit Edition State
  const [editingEdition, setEditingEdition] = useState<Edition | null>(null);
  const [editDate, setEditDate] = useState<string>('');
  const [editTitle, setEditTitle] = useState<string>('');
  const [editArea, setEditArea] = useState<string>('');
  const [editChiefEditor, setEditChiefEditor] = useState<string>('');
  const [editExecutiveEditor, setEditExecutiveEditor] = useState<string>('');
  const [editPublishedFrom, setEditPublishedFrom] = useState<string>('');
  const [editFile, setEditFile] = useState<File | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Publication Settings Form State with LocalStorage Persistence
  const [settingTitle, setSettingTitle] = useState('वत्सगुल्म टाईम्स');
  const [settingRni, setSettingRni] = useState('MAHMAR/2018/76231');
  const [settingTitleCode, setSettingTitleCode] = useState('MAHMAR49870');
  const [settingLocation, setSettingLocation] = useState('वाशीम येथून प्रकाशित');
  const [settingChiefEditor, setSettingChiefEditor] = useState('प्रा. राम धनगर');
  const [settingExecEditor, setSettingExecEditor] = useState('स्वप्नील रोकडे');
  const [settingContactEmail, setSettingContactEmail] = useState('shri.workmail@gmail.com');
  const [settingBannerImage, setSettingBannerImage] = useState<string | null>(null);

  useEffect(() => {
    setDriveStatus(getGoogleDriveStatus());
    try {
      const savedSettings = localStorage.getItem('vatsagulma_settings');
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        if (parsed.title) setSettingTitle(parsed.title);
        if (parsed.rni) setSettingRni(parsed.rni);
        if (parsed.titleCode) setSettingTitleCode(parsed.titleCode);
        if (parsed.location) setSettingLocation(parsed.location);
        if (parsed.chiefEditor) setSettingChiefEditor(parsed.chiefEditor);
        if (parsed.execEditor) setSettingExecEditor(parsed.execEditor);
        if (parsed.contactEmail) setSettingContactEmail(parsed.contactEmail);
        if (parsed.bannerImage) setSettingBannerImage(parsed.bannerImage);
      }
    } catch (e) {
      console.warn('Could not load saved settings:', e);
    }
  }, []);

  const handleBannerUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showNotification('error', 'Please upload a valid image file (PNG, JPG, WEBP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const base64 = uploadEvent.target?.result as string;
      setSettingBannerImage(base64);
      showNotification('success', 'Header banner image loaded. Click "Save Settings" to persist.');
    };
    reader.readAsDataURL(file);
  };

  const showNotification = (type: 'success' | 'error', message: string) => {
    setStatusBanner({ type, message });
    setTimeout(() => {
      setStatusBanner(null);
    }, 6000);
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const settingsObj = {
        title: settingTitle,
        rni: settingRni,
        titleCode: settingTitleCode,
        location: settingLocation,
        chiefEditor: settingChiefEditor,
        execEditor: settingExecEditor,
        contactEmail: settingContactEmail,
        bannerImage: settingBannerImage,
      };
      localStorage.setItem('vatsagulma_settings', JSON.stringify(settingsObj));
      showNotification('success', 'Publication settings & header banner saved successfully.');
    } catch (err: any) {
      showNotification('error', 'Failed to save settings.');
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setLoginError(null);

    setTimeout(() => {
      if (verifyAdminCredentials(username, password)) {
        setAdminLoggedIn(true);
        setIsAdminLoggedIn(true);
        setLoginError(null);
        setActiveTab('dashboard');
        showNotification('success', 'Logged in successfully.');
      } else {
        setLoginError('Invalid username or password.');
      }
      setIsLoggingIn(false);
    }, 250);
  };

  const handleLogout = () => {
    setAdminLoggedIn(false);
    setIsAdminLoggedIn(false);
    setPassword('');
    showNotification('success', 'Logged out successfully.');
  };

  const resetUploadForm = () => {
    setUploadDate(new Date().toISOString().split('T')[0]);
    setEditionTitle('वत्सगुल्म टाईम्स ई-पेपर');
    setEditionArea('वाशीम');
    setChiefEditor(settingChiefEditor);
    setExecutiveEditor(settingExecEditor);
    setPublishedFrom('वाशीम');
    setSelectedFile(null);
    setActiveTab('upload');
  };

  const handleConnectDrive = async () => {
    setIsDriveConnecting(true);
    try {
      const status = await connectGoogleDrive();
      setDriveStatus(status);
      showNotification('success', 'Google Drive connected successfully.');
    } catch (err: any) {
      console.error('Drive connection error:', err);
      showNotification('error', err.message || 'Failed to connect Google Drive.');
    } finally {
      setIsDriveConnecting(false);
    }
  };

  const handleDisconnectDrive = async () => {
    if (confirm('Disconnect Google Drive?')) {
      await disconnectGoogleDrive();
      setDriveStatus(getGoogleDriveStatus());
      showNotification('success', 'Google Drive disconnected.');
    }
  };

  const handleSyncAllToDrive = async () => {
    if (!isGoogleDriveConnected()) {
      await handleConnectDrive();
    }
    if (!isGoogleDriveConnected()) return;

    try {
      setIsDriveSyncing(true);
      const result = await syncAllEditionsToDrive(editions, (percent, message) => {
        setDriveSyncProgress({ percent, message });
      });

      await onRefreshEditions();
      setDriveStatus(getGoogleDriveStatus());
      showNotification('success', `Sync complete. ${result.syncedCount} editions saved to Drive.`);
    } catch (err: any) {
      console.error('Drive sync error:', err);
      showNotification('error', err.message || 'Google Drive sync failed.');
    } finally {
      setIsDriveSyncing(false);
    }
  };

  const handleRestoreFromDrive = async () => {
    if (!isGoogleDriveConnected()) {
      await handleConnectDrive();
    }
    if (!isGoogleDriveConnected()) return;

    try {
      setIsDriveSyncing(true);
      setDriveSyncProgress({ percent: 30, message: 'Fetching master index from Drive...' });

      const driveEditions = await loadMasterIndexFromDrive();
      if (!driveEditions || driveEditions.length === 0) {
        showNotification('error', 'No editions found on Google Drive.');
        return;
      }

      setDriveSyncProgress({ percent: 70, message: `Restoring ${driveEditions.length} editions to database...` });

      for (const ed of driveEditions) {
        await saveEdition(ed);
      }

      await onRefreshEditions();
      setDriveSyncProgress({ percent: 100, message: 'Done' });
      showNotification('success', `Successfully restored ${driveEditions.length} editions from Drive.`);
    } catch (err: any) {
      console.error('Drive restore error:', err);
      showNotification('error', err.message || 'Failed to restore from Drive.');
    } finally {
      setIsDriveSyncing(false);
    }
  };

  const handleUploadSingleToDrive = async (edition: Edition) => {
    if (!isGoogleDriveConnected()) {
      await handleConnectDrive();
    }
    if (!isGoogleDriveConnected()) return;

    try {
      setIsProcessing(true);
      setUploadProgress({ percent: 30, message: `Uploading edition ${edition.date} to Drive...` });

      if (!edition.pdfDataUrl) {
        throw new Error('PDF file not available for this edition.');
      }

      const res = await fetch(edition.pdfDataUrl);
      const blob = await res.blob();
      const driveResult = await uploadPdfToGoogleDrive(
        blob,
        edition.pdfFileName || `Vatsagulma_Times_${edition.date}.pdf`,
        edition.date,
        (percent, message) => setUploadProgress({ percent, message })
      );

      const updated: Edition = {
        ...edition,
        driveFileId: driveResult.fileId,
        driveWebContentLink: driveResult.webContentLink,
        driveWebViewLink: driveResult.webViewLink,
        isStoredOnDrive: true,
        driveSyncedAt: new Date().toISOString(),
      };

      await saveEdition(updated);
      await onRefreshEditions();
      showNotification('success', `Edition ${edition.date} saved to Drive.`);
    } catch (err: any) {
      console.error('Single drive upload error:', err);
      showNotification('error', err.message || 'Drive upload failed.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.type !== 'application/pdf' && !file.name.endsWith('.pdf')) {
        showNotification('error', 'Only PDF files are supported.');
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type !== 'application/pdf' && !file.name.endsWith('.pdf')) {
        showNotification('error', 'Only PDF files are supported.');
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      showNotification('error', 'Please select a newspaper PDF file.');
      return;
    }

    try {
      setIsProcessing(true);

      const processed = await processUploadedPdf(selectedFile, (percent, message) => {
        setUploadProgress({ percent: Math.round(percent * 0.6), message });
      });

      const fileSizeInMB = (selectedFile.size / (1024 * 1024)).toFixed(1) + ' MB';
      let driveData: { fileId?: string; webContentLink?: string; webViewLink?: string; isStoredOnDrive?: boolean } = {};

      if (saveToDriveOnUpload && isGoogleDriveConnected()) {
        try {
          setUploadProgress({ percent: 65, message: 'Uploading to Google Drive...' });
          const driveUpload = await uploadPdfToGoogleDrive(
            selectedFile,
            selectedFile.name || `Vatsagulma_Times_${uploadDate}.pdf`,
            uploadDate,
            (percent, message) => {
              setUploadProgress({ percent: Math.round(60 + percent * 0.35), message: `Drive: ${message}` });
            }
          );
          driveData = {
            fileId: driveUpload.fileId,
            webContentLink: driveUpload.webContentLink,
            webViewLink: driveUpload.webViewLink,
            isStoredOnDrive: true,
          };
        } catch (driveErr) {
          console.warn('Google Drive auto-upload note:', driveErr);
        }
      }

      const newEdition: Edition = {
        id: `vatsagulma-${uploadDate}-${Date.now().toString().slice(-4)}`,
        date: uploadDate,
        title: editionTitle,
        editionName: editionArea,
        titleCode: settingTitleCode || 'MAHMAR49870',
        chiefEditor: chiefEditor || settingChiefEditor,
        executiveEditor: executiveEditor || settingExecEditor,
        publishedFrom: publishedFrom || 'वाशीम',
        totalPages: processed.pages.length,
        pages: processed.pages,
        pdfDataUrl: processed.pdfDataUrl,
        pdfFileName: selectedFile.name,
        fileSize: fileSizeInMB,
        uploadedAt: new Date().toISOString(),
        uploadedBy: 'Editorial Desk',
        pdfAnalysis: processed.pdfAnalysis,
        sections: [],
        driveFileId: driveData.fileId,
        driveWebContentLink: driveData.webContentLink,
        driveWebViewLink: driveData.webViewLink,
        isStoredOnDrive: driveData.isStoredOnDrive,
        driveSyncedAt: driveData.isStoredOnDrive ? new Date().toISOString() : undefined,
      };

      await saveEdition(newEdition);
      await onRefreshEditions();
      setDriveStatus(getGoogleDriveStatus());

      showNotification('success', `Edition ${uploadDate} published successfully with ${processed.pages.length} pages.`);
      resetUploadForm();
      setActiveTab('archives');

    } catch (err: any) {
      console.error('PDF upload error:', err);
      showNotification('error', err.message || 'PDF processing failed.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleStartEdit = (edition: Edition) => {
    setEditingEdition(edition);
    setEditDate(edition.date);
    setEditTitle(edition.title);
    setEditArea(edition.editionName);
    setEditChiefEditor(edition.chiefEditor || settingChiefEditor);
    setEditExecutiveEditor(edition.executiveEditor || settingExecEditor);
    setEditPublishedFrom(edition.publishedFrom || 'वाशीम');
    setEditFile(null);
    setActiveTab('edit');
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEdition) return;

    try {
      setIsProcessing(true);

      let updatedPages = editingEdition.pages;
      let updatedPdfDataUrl = editingEdition.pdfDataUrl;
      let updatedPdfFileName = editingEdition.pdfFileName;
      let updatedFileSize = editingEdition.fileSize;
      let updatedAnalysis = editingEdition.pdfAnalysis;
      let driveFileId = editingEdition.driveFileId;
      let driveWebContentLink = editingEdition.driveWebContentLink;
      let driveWebViewLink = editingEdition.driveWebViewLink;
      let isStoredOnDrive = editingEdition.isStoredOnDrive;

      if (editFile) {
        const processed = await processUploadedPdf(editFile, (percent, message) => {
          setUploadProgress({ percent, message });
        });
        updatedPages = processed.pages;
        updatedPdfDataUrl = processed.pdfDataUrl;
        updatedPdfFileName = editFile.name;
        updatedFileSize = (editFile.size / (1024 * 1024)).toFixed(1) + ' MB';
        updatedAnalysis = processed.pdfAnalysis;

        if (isGoogleDriveConnected()) {
          try {
            const driveUpload = await uploadPdfToGoogleDrive(
              editFile,
              editFile.name || `Vatsagulma_Times_${editDate}.pdf`,
              editDate
            );
            driveFileId = driveUpload.fileId;
            driveWebContentLink = driveUpload.webContentLink;
            driveWebViewLink = driveUpload.webViewLink;
            isStoredOnDrive = true;
          } catch (e) {
            console.warn('Drive edit upload note:', e);
          }
        }
      }

      const updatedEdition: Edition = {
        ...editingEdition,
        date: editDate,
        title: editTitle,
        editionName: editArea,
        chiefEditor: editChiefEditor,
        executiveEditor: editExecutiveEditor,
        publishedFrom: editPublishedFrom,
        totalPages: updatedPages.length,
        pages: updatedPages,
        pdfDataUrl: updatedPdfDataUrl,
        pdfFileName: updatedPdfFileName,
        fileSize: updatedFileSize,
        pdfAnalysis: updatedAnalysis,
        driveFileId,
        driveWebContentLink,
        driveWebViewLink,
        isStoredOnDrive,
        driveSyncedAt: new Date().toISOString(),
      };

      await saveEdition(updatedEdition);
      await onRefreshEditions();
      showNotification('success', `Edition ${editDate} updated.`);
      setActiveTab('archives');

    } catch (err: any) {
      console.error('Edit failed:', err);
      showNotification('error', err.message || 'Failed to update edition.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = async (id: string, editionDateText: string, hasDriveFile?: boolean) => {
    const driveWarning = hasDriveFile ? ' (including cloud file)' : '';
    if (confirm(`Are you sure you want to delete edition ${editionDateText}?${driveWarning}`)) {
      await deleteEdition(id);
      await onRefreshEditions();
      setDriveStatus(getGoogleDriveStatus());
      showNotification('success', `Edition ${editionDateText} deleted.`);
    }
  };

  const handleDownloadEdition = (edition: Edition) => {
    if (!edition.pdfDataUrl && !edition.driveWebContentLink) {
      alert('PDF file not available.');
      return;
    }
    const link = document.createElement('a');
    link.download = edition.pdfFileName || `Vatsagulma_Times_${edition.date}.pdf`;
    link.href = edition.pdfDataUrl || edition.driveWebContentLink || '#';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSaveSections = async (updatedSections: NewsSection[]) => {
    if (!activeSectionEdition) return;
    try {
      const updated = await saveEditionSections(activeSectionEdition.id, updatedSections);
      if (updated) {
        setActiveSectionEdition((prev) => (prev ? { ...prev, sections: updatedSections } : null));
        await onRefreshEditions();
      }
    } catch (err) {
      console.error('Failed to save sections in AdminPortal:', err);
    }
  };

  const handleClearCache = async () => {
    if (confirm('Warning: All local cached records will be cleared. Continue?')) {
      await clearAllStorage();
      await onRefreshEditions();
      showNotification('success', 'Storage cleared.');
    }
  };

  const filteredEditions = editions.filter((e) => 
    e.date.includes(searchQuery) ||
    e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.editionName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const driveEditionsCount = editions.filter((e) => e.isStoredOnDrive || e.driveFileId).length;
  const totalPagesSum = editions.reduce((acc, ed) => acc + (ed.totalPages || ed.pages?.length || 0), 0);
  const totalSectionsSum = editions.reduce((acc, ed) => acc + (ed.sections?.length || 0), 0);

  // Render In-Admin Live Reader Preview if active (Opens inside Admin Login!)
  if (previewingEdition) {
    return (
      <AdminEditionReader
        edition={previewingEdition}
        onClose={() => setPreviewingEdition(null)}
        onEditHotspots={(ed) => {
          setPreviewingEdition(null);
          setActiveSectionEdition(ed);
        }}
        onDownloadPdf={handleDownloadEdition}
        onPreviewSection={onPreviewSection}
      />
    );
  }

  // Render Section Editor full-screen if active
  if (activeSectionEdition) {
    return (
      <InteractiveSectionEditor
        edition={activeSectionEdition}
        onSaveSections={handleSaveSections}
        onClose={() => setActiveSectionEdition(null)}
        onPreviewSection={onPreviewSection}
      />
    );
  }

  // =========================================================================
  // 1. ADMIN AUTHENTICATION (BOXY LAYOUT)
  // =========================================================================
  if (!isAdminLoggedIn) {
    return (
      <div className="min-h-screen w-screen bg-slate-950 text-slate-100 flex flex-col font-inter select-none relative overflow-x-hidden">
        
        {/* Top Header Bar */}
        <header className="bg-[#0B2240] border-b-2 border-slate-700 px-4 sm:px-6 py-3 flex items-center justify-between z-10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#8B0000] text-white border border-red-500/50">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-manrope text-xl font-bold text-white tracking-wide">
                  Vatsagulma Times
                </span>
                <span className="bg-[#8B0000] text-white text-[10px] px-2 py-0.5 border border-red-600 font-inter font-semibold uppercase tracking-wider">
                  Admin Login
                </span>
              </div>
              <p className="text-[11px] text-slate-300 font-inter">
                RNI: MAHMAR/2018/76231 | Code: MAHMAR49870
              </p>
            </div>
          </div>

          <button
            onClick={onBackToReader}
            id="login-page-back-to-reader-btn"
            className="flex items-center gap-2 px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-white border-2 border-slate-600 text-xs font-inter font-semibold transition-all cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-amber-400" />
            <span>Back to Reader</span>
          </button>
        </header>

        {/* Login Container */}
        <main className="flex-1 flex items-center justify-center p-4 sm:p-8 relative">
          <div className="w-full max-w-3xl grid grid-cols-1 md:grid-cols-12 border-2 border-slate-700 bg-slate-900 shadow-2xl overflow-hidden">
            
            {/* Left Box: System Info */}
            <div className="md:col-span-5 bg-[#07172c] p-6 text-white flex flex-col justify-between border-b-2 md:border-b-0 md:border-r-2 border-slate-700">
              <div>
                <div className="inline-flex items-center gap-2 px-2.5 py-1 bg-red-950 border border-red-700 text-red-300 text-xs font-inter font-semibold mb-4">
                  <Lock className="w-3.5 h-3.5" />
                  <span>Admin Console</span>
                </div>

                <h2 className="font-manrope text-2xl font-bold text-white leading-tight mb-2">
                  Editorial Management System
                </h2>
                <p className="text-xs text-slate-300 font-inter leading-relaxed mb-6">
                  Sign in to upload e-paper editions, configure cloud backups, and manage news hotspots.
                </p>

                <div className="space-y-2 text-xs font-inter text-slate-300">
                  <div className="border border-slate-700 bg-slate-800/80 p-2 flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>PDF Page Processing</span>
                  </div>
                  <div className="border border-slate-700 bg-slate-800/80 p-2 flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Google Drive Integration</span>
                  </div>
                  <div className="border border-slate-700 bg-slate-800/80 p-2 flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Interactive Hotspot Articles</span>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-4 border-t border-slate-700 flex items-center justify-between text-[11px] font-inter text-slate-400">
                <span>Station v2.5</span>
                <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                  <span className="w-2 h-2 bg-emerald-400 animate-pulse" />
                  Online
                </span>
              </div>
            </div>

            {/* Right Box: Login Form */}
            <div className="md:col-span-7 bg-white p-6 sm:p-8 flex flex-col justify-center text-slate-900">
              <div className="mb-6 border-l-4 border-[#8B0000] pl-3">
                <h3 className="font-manrope text-xl font-bold text-slate-900 leading-none">
                  Sign In
                </h3>
                <p className="text-xs text-slate-500 font-inter mt-1">
                  Enter your credentials to continue
                </p>
              </div>

              {loginError && (
                <div className="mb-4 p-3 bg-red-50 border-2 border-red-500 text-[#8B0000] text-xs flex items-center gap-2 font-inter font-semibold">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                  <span>{loginError}</span>
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-4 font-inter">
                
                {/* Username Box */}
                <div className="border-2 border-slate-300 bg-white focus-within:border-[#0B2240]">
                  <div className="bg-slate-100 px-3 py-1 border-b border-slate-300 text-[10px] font-inter font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
                    <span>Username</span>
                    <User className="w-3 h-3 text-slate-500" />
                  </div>
                  <input
                    type="text"
                    id="admin-login-username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    placeholder="Enter username"
                    className="w-full px-3 py-2 text-xs font-inter font-medium text-slate-900 border-none outline-none"
                  />
                </div>

                {/* Password Box */}
                <div className="border-2 border-slate-300 bg-white focus-within:border-[#0B2240]">
                  <div className="bg-slate-100 px-3 py-1 border-b border-slate-300 text-[10px] font-inter font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
                    <span>Password</span>
                    <KeyRound className="w-3 h-3 text-slate-500" />
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      id="admin-login-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      placeholder="••••••••"
                      className="w-full px-3 py-2 text-xs font-inter font-medium text-slate-900 border-none outline-none pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-700 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Info Box */}
                <div className="bg-blue-50 border-2 border-blue-200 p-2.5 flex items-center justify-between text-xs text-blue-900 font-inter">
                  <div className="flex items-center gap-1.5 font-semibold">
                    <Info className="w-3.5 h-3.5 text-blue-700 shrink-0" />
                    <span>Default Credentials:</span>
                  </div>
                  <div className="bg-white px-2 py-0.5 border border-blue-300 font-mono font-bold text-blue-800">
                    vtv / vtv
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isLoggingIn}
                    id="admin-full-login-submit-btn"
                    className="w-full py-2.5 px-4 bg-[#8B0000] hover:bg-[#700000] text-white font-inter font-bold border-2 border-red-950 text-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isLoggingIn ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-white" />
                        <span>Verifying...</span>
                      </>
                    ) : (
                      <>
                        <Lock className="w-4 h-4" />
                        <span>Sign In</span>
                      </>
                    )}
                  </button>
                </div>
              </form>

              <div className="mt-6 pt-4 border-t border-slate-200 text-center font-inter">
                <button
                  type="button"
                  onClick={onBackToReader}
                  className="text-xs text-slate-600 hover:text-[#0B2240] hover:underline font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Return to Reader</span>
                </button>
              </div>
            </div>

          </div>
        </main>
      </div>
    );
  }

  // =========================================================================
  // 2. ADMIN PORTAL (LEFT-SIDE COLUMN TABS & CLEAN WORKSPACE)
  // =========================================================================
  return (
    <div className="min-h-screen w-screen bg-slate-100 text-slate-900 flex flex-col font-inter select-none overflow-hidden">
      
      {/* Top Application Bar */}
      <header className="bg-[#0B2240] text-white border-b-2 border-slate-700 px-4 sm:px-6 py-2.5 flex items-center justify-between shrink-0 shadow-sm z-20 font-inter">
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-[#8B0000] text-white border border-red-500/40">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-manrope text-lg sm:text-xl font-bold text-white tracking-wide leading-none">
                Vatsagulma Times • Admin Portal
              </h1>
              <span className="bg-emerald-950 text-emerald-300 border border-emerald-600 text-[10px] px-2 py-0.5 font-inter font-semibold uppercase tracking-wider hidden md:inline">
                Online
              </span>
            </div>
            <p className="text-[11px] text-slate-300 font-inter flex items-center gap-2 mt-0.5">
              <span>RNI: {settingRni}</span>
              <span>|</span>
              <span>Code: {settingTitleCode}</span>
              <span>|</span>
              <span>Editions: <strong className="text-white font-bold">{editions.length}</strong></span>
              {driveStatus.isConnected && (
                <>
                  <span>|</span>
                  <span className="text-emerald-300 font-semibold inline-flex items-center gap-1">
                    <Cloud className="w-3 h-3 text-emerald-400" />
                    Drive Synced ({driveEditionsCount})
                  </span>
                </>
              )}
            </p>
          </div>
        </div>

        {/* Right Header Navigation */}
        <div className="flex items-center gap-2 font-inter">
          <button
            onClick={() => {
              if (editions.length > 0) {
                setPreviewingEdition(editions[0]);
              } else {
                showNotification('error', 'No editions available to preview. Upload an edition first.');
              }
            }}
            id="admin-top-view-paper-btn"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0B2240] hover:bg-blue-900 text-white border-2 border-slate-600 text-xs font-semibold cursor-pointer shadow-xs"
            title="Open Live Paper Reader inside Admin"
          >
            <Eye className="w-3.5 h-3.5 text-cyan-300" />
            <span className="hidden sm:inline">View Paper</span>
          </button>

          <button
            onClick={onBackToReader}
            id="admin-top-back-to-reader-btn"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white border-2 border-slate-600 text-xs font-semibold cursor-pointer"
            title="Go to Public Website View"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden md:inline">Public Site</span>
          </button>

          <button
            onClick={handleLogout}
            id="admin-top-logout-btn"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#8B0000] hover:bg-[#700000] text-white border-2 border-red-950 text-xs font-semibold cursor-pointer shadow-xs"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Logout</span>
          </button>
        </div>
      </header>

      {/* Notification Banner */}
      {statusBanner && (
        <div className={`px-4 sm:px-6 py-2 flex items-center justify-between text-xs font-semibold border-b-2 font-inter ${
          statusBanner.type === 'success' 
            ? 'bg-emerald-100 text-emerald-950 border-emerald-400' 
            : 'bg-red-100 text-red-950 border-red-400'
        }`}>
          <div className="flex items-center gap-2">
            {statusBanner.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-700 shrink-0" />
            )}
            <span>{statusBanner.message}</span>
          </div>
          <button 
            onClick={() => setStatusBanner(null)}
            className="text-slate-700 hover:text-slate-900 text-sm font-bold cursor-pointer px-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* Left Sidebar + Right Content Layout */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* =========================================================================
            LEFT COLUMN TABS (Clean, Boxy, English Names, Inter Font)
           ========================================================================= */}
        <aside className="w-56 sm:w-64 bg-slate-900 border-r-2 border-slate-700 flex flex-col shrink-0 overflow-y-auto font-inter text-slate-300">
          
          <div className="p-3 border-b-2 border-slate-700 flex items-center justify-between bg-slate-950">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Navigation</span>
            <button
              onClick={resetUploadForm}
              id="admin-sidebar-new-upload-btn"
              className="px-2 py-1 bg-[#8B0000] hover:bg-[#700000] text-white text-[11px] font-bold border border-red-950 flex items-center gap-1 cursor-pointer"
            >
              <PlusCircle className="w-3 h-3" />
              <span>New</span>
            </button>
          </div>

          <div className="p-2 space-y-1">
            
            {/* TAB 1: Dashboard */}
            <button
              onClick={() => setActiveTab('dashboard')}
              id="admin-tab-dashboard-btn"
              className={`w-full flex items-center justify-between px-3 py-2.5 text-xs font-semibold border-2 transition-all cursor-pointer ${
                activeTab === 'dashboard'
                  ? 'bg-[#0B2240] text-white border-cyan-500 shadow-xs'
                  : 'bg-slate-800/60 text-slate-300 border-slate-700 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <LayoutDashboard className={`w-4 h-4 ${activeTab === 'dashboard' ? 'text-cyan-400' : 'text-slate-400'}`} />
                <span>Dashboard</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 opacity-50" />
            </button>

            {/* TAB 2: Upload */}
            <button
              onClick={() => setActiveTab('upload')}
              id="admin-tab-upload-btn"
              className={`w-full flex items-center justify-between px-3 py-2.5 text-xs font-semibold border-2 transition-all cursor-pointer ${
                activeTab === 'upload'
                  ? 'bg-[#8B0000] text-white border-red-400 shadow-xs'
                  : 'bg-slate-800/60 text-slate-300 border-slate-700 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <UploadCloud className={`w-4 h-4 ${activeTab === 'upload' ? 'text-amber-300' : 'text-slate-400'}`} />
                <span>Upload Edition</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 opacity-50" />
            </button>

            {/* TAB 3: Archives */}
            <button
              onClick={() => setActiveTab('archives')}
              id="admin-tab-archives-btn"
              className={`w-full flex items-center justify-between px-3 py-2.5 text-xs font-semibold border-2 transition-all cursor-pointer ${
                activeTab === 'archives'
                  ? 'bg-[#0B2240] text-white border-cyan-500 shadow-xs'
                  : 'bg-slate-800/60 text-slate-300 border-slate-700 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Database className={`w-4 h-4 ${activeTab === 'archives' ? 'text-emerald-400' : 'text-slate-400'}`} />
                <span>Archives</span>
              </div>
              <span className="text-[10px] bg-slate-700 text-slate-200 px-1.5 py-0.2 border border-slate-600 font-mono">
                {editions.length}
              </span>
            </button>

            {/* TAB 4: News Sections */}
            <button
              onClick={() => setActiveTab('sections')}
              id="admin-tab-sections-btn"
              className={`w-full flex items-center justify-between px-3 py-2.5 text-xs font-semibold border-2 transition-all cursor-pointer ${
                activeTab === 'sections'
                  ? 'bg-blue-900 text-white border-blue-400 shadow-xs'
                  : 'bg-slate-800/60 text-slate-300 border-slate-700 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Crosshair className={`w-4 h-4 ${activeTab === 'sections' ? 'text-blue-300' : 'text-slate-400'}`} />
                <span>News Sections</span>
              </div>
              <span className="text-[10px] bg-slate-700 text-slate-200 px-1.5 py-0.2 border border-slate-600 font-mono">
                {totalSectionsSum}
              </span>
            </button>

            {/* TAB 5: Google Drive */}
            <button
              onClick={() => setActiveTab('drive')}
              id="admin-tab-drive-btn"
              className={`w-full flex items-center justify-between px-3 py-2.5 text-xs font-semibold border-2 transition-all cursor-pointer ${
                activeTab === 'drive'
                  ? 'bg-emerald-800 text-white border-emerald-400 shadow-xs'
                  : 'bg-slate-800/60 text-slate-300 border-slate-700 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Cloud className={`w-4 h-4 ${activeTab === 'drive' ? 'text-emerald-300' : 'text-slate-400'}`} />
                <span>Google Drive</span>
              </div>
              {driveStatus.isConnected ? (
                <span className="w-2 h-2 bg-emerald-400 animate-pulse" />
              ) : (
                <span className="text-[9px] bg-slate-700 text-slate-400 px-1 border border-slate-600 font-mono">OFF</span>
              )}
            </button>

            {/* TAB 6: Settings */}
            <button
              onClick={() => setActiveTab('settings')}
              id="admin-tab-settings-btn"
              className={`w-full flex items-center justify-between px-3 py-2.5 text-xs font-semibold border-2 transition-all cursor-pointer ${
                activeTab === 'settings'
                  ? 'bg-purple-900 text-white border-purple-400 shadow-xs'
                  : 'bg-slate-800/60 text-slate-300 border-slate-700 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Settings className={`w-4 h-4 ${activeTab === 'settings' ? 'text-purple-300' : 'text-slate-400'}`} />
                <span>Settings</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 opacity-50" />
            </button>

            {/* TAB 7: System */}
            <button
              onClick={() => setActiveTab('system')}
              id="admin-tab-system-btn"
              className={`w-full flex items-center justify-between px-3 py-2.5 text-xs font-semibold border-2 transition-all cursor-pointer ${
                activeTab === 'system'
                  ? 'bg-slate-700 text-white border-slate-400 shadow-xs'
                  : 'bg-slate-800/60 text-slate-300 border-slate-700 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Cpu className={`w-4 h-4 ${activeTab === 'system' ? 'text-amber-400' : 'text-slate-400'}`} />
                <span>System</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 opacity-50" />
            </button>

            {/* Contextual TAB: Edit Edition */}
            {editingEdition && (
              <button
                onClick={() => setActiveTab('edit')}
                className={`w-full flex items-center justify-between px-3 py-2.5 text-xs font-semibold border-2 transition-all cursor-pointer ${
                  activeTab === 'edit'
                    ? 'bg-amber-800 text-white border-amber-400 shadow-xs'
                    : 'bg-amber-950/50 text-amber-300 border-amber-800 hover:bg-amber-900'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Edit className="w-4 h-4 text-amber-300" />
                  <span>Edit ({editingEdition.date})</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 opacity-50" />
              </button>
            )}

          </div>

          <div className="mt-auto p-3 border-t-2 border-slate-700 bg-slate-950 text-[11px] font-inter text-slate-400 space-y-1">
            <div className="flex items-center justify-between">
              <span>Database:</span>
              <span className="text-emerald-400 font-semibold">IndexedDB</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Drive Sync:</span>
              <span className={driveStatus.isConnected ? "text-emerald-400 font-semibold" : "text-slate-400 font-semibold"}>
                {driveStatus.isConnected ? "Connected" : "Disconnected"}
              </span>
            </div>
          </div>
        </aside>

        {/* =========================================================================
            RIGHT MAIN WORKSPACE (Clean Boxy Content)
           ========================================================================= */}
        <main className="flex-1 p-4 sm:p-6 overflow-y-auto bg-slate-100">
          
          {/* =========================================================================
              TAB: DASHBOARD (Manrope SemiBold for Headings, Inter for Controls/Tables)
             ========================================================================= */}
          {activeTab === 'dashboard' && (
            <div className="space-y-5 max-w-6xl mx-auto">
              
              {/* Header Box */}
              <div className="border-2 border-slate-300 bg-white p-4 sm:p-5 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b-2 border-slate-200 pb-3">
                  <div>
                    <h2 className="font-manrope text-xl sm:text-2xl font-semibold text-slate-900 leading-tight">
                      Dashboard
                    </h2>
                    <p className="text-xs text-slate-500 font-inter mt-0.5">
                      Overview of published editions, cloud synchronization, and news hotspots.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 font-inter">
                    <button
                      onClick={() => setActiveTab('upload')}
                      className="px-3.5 py-2 bg-[#8B0000] hover:bg-[#700000] text-white border-2 border-red-950 text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <PlusCircle className="w-4 h-4" />
                      <span>Upload Edition</span>
                    </button>
                    <button
                      onClick={onRefreshEditions}
                      className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border-2 border-slate-300 cursor-pointer"
                      title="Refresh data"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Metric Cards (Boxy style) */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
                  
                  {/* Metric 1: Total Editions */}
                  <div className="border-2 border-slate-300 bg-slate-50 p-3.5">
                    <div className="flex items-center justify-between text-slate-500 text-xs font-inter font-semibold uppercase">
                      <span>Total Editions</span>
                      <Database className="w-4 h-4 text-[#0B2240]" />
                    </div>
                    <div className="text-2xl sm:text-3xl font-semibold text-slate-900 font-manrope mt-1">
                      {editions.length}
                    </div>
                    <div className="text-[11px] text-emerald-700 mt-1 font-inter font-medium">
                      ● Active in storage
                    </div>
                  </div>

                  {/* Metric 2: Total Pages */}
                  <div className="border-2 border-slate-300 bg-slate-50 p-3.5">
                    <div className="flex items-center justify-between text-slate-500 text-xs font-inter font-semibold uppercase">
                      <span>Total Pages</span>
                      <Layers className="w-4 h-4 text-amber-700" />
                    </div>
                    <div className="text-2xl sm:text-3xl font-semibold text-slate-900 font-manrope mt-1">
                      {totalPagesSum}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1 font-inter font-medium">
                      Rendered & Indexed
                    </div>
                  </div>

                  {/* Metric 3: Google Drive */}
                  <div className="border-2 border-slate-300 bg-slate-50 p-3.5">
                    <div className="flex items-center justify-between text-slate-500 text-xs font-inter font-semibold uppercase">
                      <span>Drive Synced</span>
                      <Cloud className="w-4 h-4 text-emerald-700" />
                    </div>
                    <div className="text-2xl sm:text-3xl font-semibold text-slate-900 font-manrope mt-1">
                      {driveEditionsCount}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1 font-inter font-medium">
                      {driveStatus.isConnected ? 'Cloud Connected' : 'Not Connected'}
                    </div>
                  </div>

                  {/* Metric 4: News Hotspots */}
                  <div className="border-2 border-slate-300 bg-slate-50 p-3.5">
                    <div className="flex items-center justify-between text-slate-500 text-xs font-inter font-semibold uppercase">
                      <span>News Sections</span>
                      <Crosshair className="w-4 h-4 text-blue-700" />
                    </div>
                    <div className="text-2xl sm:text-3xl font-semibold text-slate-900 font-manrope mt-1">
                      {totalSectionsSum}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1 font-inter font-medium">
                      Interactive Clippings
                    </div>
                  </div>

                </div>
              </div>

              {/* Quick Actions & Recent Editions */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                
                {/* Left: Recent Editions Table */}
                <div className="lg:col-span-8 border-2 border-slate-300 bg-white p-4 shadow-xs">
                  <div className="flex items-center justify-between border-b-2 border-slate-200 pb-2.5 mb-3 font-inter">
                    <h3 className="font-manrope text-base font-semibold text-slate-900">
                      Recent Editions
                    </h3>
                    <button
                      onClick={() => setActiveTab('archives')}
                      className="text-xs text-[#0B2240] hover:underline font-semibold cursor-pointer"
                    >
                      View All ({editions.length}) →
                    </button>
                  </div>

                  {editions.length === 0 ? (
                    <div className="text-center py-8 border-2 border-dashed border-slate-300 p-4">
                      <FileText className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                      <p className="text-xs font-semibold text-slate-600 font-inter">No editions published yet.</p>
                      <button
                        onClick={() => setActiveTab('upload')}
                        className="mt-3 px-3 py-1.5 bg-[#8B0000] text-white text-xs font-semibold border-2 border-red-950 cursor-pointer font-inter"
                      >
                        Upload First Edition
                      </button>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse font-inter">
                        <thead>
                          <tr className="bg-slate-100 border-2 border-slate-300 text-slate-700 uppercase text-[10px] font-bold">
                            <th className="p-2 border-r border-slate-300">Date</th>
                            <th className="p-2 border-r border-slate-300">Edition Title</th>
                            <th className="p-2 border-r border-slate-300 text-center">Pages</th>
                            <th className="p-2 border-r border-slate-300 text-center">Drive</th>
                            <th className="p-2 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {editions.slice(0, 5).map((ed) => (
                            <tr key={ed.id} className="border-b border-slate-200 hover:bg-slate-50">
                              <td className="p-2 border-r border-slate-200 font-mono font-bold text-[#0B2240]">
                                {ed.date}
                              </td>
                              <td className="p-2 border-r border-slate-200 font-medium text-slate-800">
                                {ed.title} - {ed.editionName}
                              </td>
                              <td className="p-2 border-r border-slate-200 text-center font-mono font-semibold">
                                {ed.totalPages || ed.pages?.length || 0}
                              </td>
                              <td className="p-2 border-r border-slate-200 text-center">
                                {ed.isStoredOnDrive || ed.driveFileId ? (
                                  <span className="text-emerald-700 font-semibold text-[10px] bg-emerald-50 px-1.5 py-0.5 border border-emerald-300">
                                    Synced
                                  </span>
                                ) : (
                                  <span className="text-slate-500 text-[10px] bg-slate-100 px-1.5 py-0.5 border border-slate-300">
                                    Local
                                  </span>
                                )}
                              </td>
                              <td className="p-2 text-right">
                                <div className="flex items-center justify-end gap-1 font-inter">
                                  <button
                                    onClick={() => setPreviewingEdition(ed)}
                                    className="p-1 bg-[#0B2240] text-white border border-blue-950 hover:bg-blue-900 cursor-pointer"
                                    title="Read Edition"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => setActiveSectionEdition(ed)}
                                    className="p-1 bg-blue-700 text-white border border-blue-900 hover:bg-blue-800 cursor-pointer"
                                    title="Edit Hotspots"
                                  >
                                    <Crosshair className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleStartEdit(ed)}
                                    className="p-1 bg-slate-200 text-slate-800 border border-slate-400 hover:bg-slate-300 cursor-pointer"
                                    title="Edit Details"
                                  >
                                    <Edit className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Right: Quick Launch & Cloud Status Box */}
                <div className="lg:col-span-4 space-y-4">
                  
                  {/* Google Drive Status Box */}
                  <div className="border-2 border-slate-300 bg-white p-4 shadow-xs font-inter">
                    <div className="flex items-center justify-between border-b-2 border-slate-200 pb-2 mb-3">
                      <h3 className="font-manrope text-sm font-semibold text-slate-900 flex items-center gap-1.5">
                        <Cloud className="w-4 h-4 text-emerald-600" />
                        <span>Google Drive</span>
                      </h3>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 border ${
                        driveStatus.isConnected 
                          ? 'bg-emerald-100 text-emerald-900 border-emerald-400' 
                          : 'bg-slate-100 text-slate-600 border-slate-300'
                      }`}>
                        {driveStatus.isConnected ? 'Active' : 'Offline'}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 mb-3 leading-relaxed">
                      {driveStatus.isConnected 
                        ? `Connected: ${driveStatus.userEmail || 'Google Cloud'}`
                        : 'Connect Google Drive for cloud archiving and automatic PDF backups.'}
                    </p>

                    <div className="space-y-2">
                      {!driveStatus.isConnected ? (
                        <button
                          onClick={handleConnectDrive}
                          disabled={isDriveConnecting}
                          className="w-full py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold border-2 border-emerald-950 text-xs flex items-center justify-center gap-2 cursor-pointer"
                        >
                          {isDriveConnecting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Cloud className="w-3.5 h-3.5" />}
                          <span>Connect Google Drive</span>
                        </button>
                      ) : (
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={handleSyncAllToDrive}
                            disabled={isDriveSyncing}
                            className="py-1.5 bg-[#0B2240] hover:bg-blue-900 text-white font-semibold border-2 border-blue-950 text-xs flex items-center justify-center gap-1 cursor-pointer"
                          >
                            {isDriveSyncing ? <Loader2 className="w-3 h-3 animate-spin" /> : <UploadCloud className="w-3 h-3" />}
                            <span>Sync All</span>
                          </button>
                          <button
                            onClick={() => setActiveTab('drive')}
                            className="py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold border-2 border-slate-300 text-xs flex items-center justify-center cursor-pointer"
                          >
                            <span>Manage</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Direct Shortcuts */}
                  <div className="border-2 border-slate-300 bg-white p-4 shadow-xs font-inter">
                    <h3 className="font-manrope text-sm font-semibold text-slate-900 border-b-2 border-slate-200 pb-2 mb-3">
                      Quick Shortcuts
                    </h3>

                    <div className="space-y-2">
                      <button
                        onClick={() => setActiveTab('upload')}
                        className="w-full p-2 bg-slate-50 hover:bg-slate-100 border-2 border-slate-300 text-left text-xs font-semibold text-slate-800 flex items-center justify-between cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <UploadCloud className="w-4 h-4 text-[#8B0000]" />
                          <span>Publish New PDF</span>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                      </button>

                      <button
                        onClick={() => setActiveTab('sections')}
                        className="w-full p-2 bg-slate-50 hover:bg-slate-100 border-2 border-slate-300 text-left text-xs font-semibold text-slate-800 flex items-center justify-between cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <Crosshair className="w-4 h-4 text-blue-700" />
                          <span>Tag Article Hotspots</span>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                      </button>

                      <button
                        onClick={() => setActiveTab('settings')}
                        className="w-full p-2 bg-slate-50 hover:bg-slate-100 border-2 border-slate-300 text-left text-xs font-semibold text-slate-800 flex items-center justify-between cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <Settings className="w-4 h-4 text-purple-700" />
                          <span>Publication Settings</span>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                      </button>
                    </div>
                  </div>

                </div>

              </div>

            </div>
          )}

          {/* =========================================================================
              TAB: UPLOAD EDITION
             ========================================================================= */}
          {activeTab === 'upload' && (
            <div className="max-w-4xl mx-auto space-y-5">
              
              <div className="border-2 border-slate-300 bg-white p-5 shadow-xs">
                <div className="border-b-2 border-slate-200 pb-3 mb-4">
                  <h2 className="font-manrope text-xl font-semibold text-slate-900">
                    Upload Edition
                  </h2>
                  <p className="text-xs text-slate-500 font-inter mt-0.5">
                    Select a multi-page PDF to render pages, generate thumbnails, and publish to readers.
                  </p>
                </div>

                <form onSubmit={handleUploadSubmit} className="space-y-4 font-inter">
                  
                  {/* File Dropzone */}
                  <div
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={handleDrop}
                    onClick={() => document.getElementById('admin-pdf-file-input')?.click()}
                    className={`border-2 border-dashed p-6 text-center cursor-pointer transition-colors ${
                      selectedFile 
                        ? 'border-emerald-600 bg-emerald-50/60' 
                        : 'border-slate-400 bg-slate-50 hover:bg-slate-100 hover:border-slate-600'
                    }`}
                  >
                    <input
                      type="file"
                      id="admin-pdf-file-input"
                      accept="application/pdf"
                      onChange={handleFileChange}
                      className="hidden"
                    />

                    {selectedFile ? (
                      <div className="flex flex-col items-center gap-1.5">
                        <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                        <span className="text-xs font-bold text-slate-900">{selectedFile.name}</span>
                        <span className="text-[11px] text-slate-600 font-mono">
                          {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • Ready to Process
                        </span>
                        <span className="text-[10px] text-blue-700 underline mt-1 font-semibold">Click to change file</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-1.5">
                        <UploadCloud className="w-8 h-8 text-[#8B0000]" />
                        <span className="text-xs font-bold text-slate-900">Drag & Drop PDF file here or Click to Browse</span>
                        <span className="text-[11px] text-slate-500">Supports standard multi-page newspaper PDF files</span>
                      </div>
                    )}
                  </div>

                  {/* Metadata Fields (Boxy) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    
                    {/* Publication Date */}
                    <div className="border-2 border-slate-300 bg-white focus-within:border-[#0B2240]">
                      <div className="bg-slate-100 px-3 py-1 border-b border-slate-300 text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                        Publication Date *
                      </div>
                      <input
                        type="date"
                        value={uploadDate}
                        onChange={(e) => setUploadDate(e.target.value)}
                        required
                        className="w-full px-3 py-2 text-xs font-medium text-slate-900 border-none outline-none"
                      />
                    </div>

                    {/* Edition Region */}
                    <div className="border-2 border-slate-300 bg-white focus-within:border-[#0B2240]">
                      <div className="bg-slate-100 px-3 py-1 border-b border-slate-300 text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                        Edition Area / Sub-Region *
                      </div>
                      <input
                        type="text"
                        value={editionArea}
                        onChange={(e) => setEditionArea(e.target.value)}
                        required
                        placeholder="वाशीम / Washim"
                        className="w-full px-3 py-2 text-xs font-medium text-slate-900 border-none outline-none"
                      />
                    </div>

                    {/* Chief Editor */}
                    <div className="border-2 border-slate-300 bg-white focus-within:border-[#0B2240]">
                      <div className="bg-slate-100 px-3 py-1 border-b border-slate-300 text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                        Chief Editor
                      </div>
                      <input
                        type="text"
                        value={chiefEditor}
                        onChange={(e) => setChiefEditor(e.target.value)}
                        placeholder="प्रा. राम धनगर"
                        className="w-full px-3 py-2 text-xs font-medium text-slate-900 border-none outline-none"
                      />
                    </div>

                    {/* Executive Editor */}
                    <div className="border-2 border-slate-300 bg-white focus-within:border-[#0B2240]">
                      <div className="bg-slate-100 px-3 py-1 border-b border-slate-300 text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                        Executive Editor
                      </div>
                      <input
                        type="text"
                        value={executiveEditor}
                        onChange={(e) => setExecutiveEditor(e.target.value)}
                        placeholder="स्वप्नील रोकडे"
                        className="w-full px-3 py-2 text-xs font-medium text-slate-900 border-none outline-none"
                      />
                    </div>

                  </div>

                  {/* Google Drive Checkbox */}
                  <div className="p-3 bg-slate-50 border-2 border-slate-300 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="save-to-drive-checkbox"
                        checked={saveToDriveOnUpload}
                        onChange={(e) => setSaveToDriveOnUpload(e.target.checked)}
                        className="w-4 h-4 rounded-none border-2 border-slate-400 text-emerald-600 focus:ring-0 cursor-pointer"
                      />
                      <label htmlFor="save-to-drive-checkbox" className="text-xs font-semibold text-slate-800 cursor-pointer">
                        Automatically upload & sync to Google Drive
                      </label>
                    </div>
                    {driveStatus.isConnected ? (
                      <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-100 px-2 py-0.5 border border-emerald-300">
                        Drive Ready
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={handleConnectDrive}
                        className="text-[10px] text-blue-700 underline font-semibold cursor-pointer"
                      >
                        Connect Drive Now
                      </button>
                    )}
                  </div>

                  {/* Progress Indicator */}
                  {isProcessing && (
                    <div className="p-3 bg-blue-50 border-2 border-blue-300 space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-bold text-blue-950 font-inter">
                        <span>{uploadProgress.message || 'Processing PDF pages...'}</span>
                        <span className="font-mono">{uploadProgress.percent}%</span>
                      </div>
                      <div className="w-full bg-blue-200 h-2">
                        <div 
                          className="bg-blue-800 h-2 transition-all duration-200"
                          style={{ width: `${uploadProgress.percent}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Submit Button */}
                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isProcessing || !selectedFile}
                      className="w-full py-2.5 px-4 bg-[#8B0000] hover:bg-[#700000] text-white font-inter font-bold border-2 border-red-950 text-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin text-white" />
                          <span>Processing & Publishing...</span>
                        </>
                      ) : (
                        <>
                          <UploadCloud className="w-4 h-4" />
                          <span>Publish Edition</span>
                        </>
                      )}
                    </button>
                  </div>

                </form>
              </div>

            </div>
          )}

          {/* =========================================================================
              TAB: ARCHIVES (Table View with Inter Font)
             ========================================================================= */}
          {activeTab === 'archives' && (
            <div className="max-w-6xl mx-auto space-y-4">
              
              {/* Top Controls */}
              <div className="border-2 border-slate-300 bg-white p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-inter">
                <div>
                  <h2 className="font-manrope text-xl font-semibold text-slate-900">
                    Editions Archive
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Search and manage all published newspaper issues.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <div className="border-2 border-slate-300 bg-white px-2.5 py-1.5 flex items-center gap-2">
                    <Search className="w-3.5 h-3.5 text-slate-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search by date or title..."
                      className="text-xs text-slate-900 border-none outline-none w-44 sm:w-56"
                    />
                  </div>

                  <button
                    onClick={() => setActiveTab('upload')}
                    className="px-3 py-1.5 bg-[#8B0000] hover:bg-[#700000] text-white border-2 border-red-950 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>New</span>
                  </button>
                </div>
              </div>

              {/* Table */}
              <div className="border-2 border-slate-300 bg-white shadow-xs overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse font-inter">
                  <thead>
                    <tr className="bg-slate-100 border-b-2 border-slate-300 text-slate-700 uppercase text-[10px] font-bold">
                      <th className="p-3 border-r border-slate-300">Date</th>
                      <th className="p-3 border-r border-slate-300">Edition Title</th>
                      <th className="p-3 border-r border-slate-300 text-center">Pages</th>
                      <th className="p-3 border-r border-slate-300 text-center">Size</th>
                      <th className="p-3 border-r border-slate-300 text-center">Drive Status</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEditions.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center py-8 text-slate-500 font-semibold">
                          No matching editions found.
                        </td>
                      </tr>
                    ) : (
                      filteredEditions.map((ed) => (
                        <tr key={ed.id} className="border-b border-slate-200 hover:bg-slate-50">
                          <td className="p-3 border-r border-slate-200 font-mono font-bold text-[#0B2240]">
                            {ed.date}
                          </td>
                          <td className="p-3 border-r border-slate-200">
                            <div className="font-semibold text-slate-900">{ed.title}</div>
                            <div className="text-[11px] text-slate-500">{ed.editionName} • {ed.publishedFrom || 'Washim'}</div>
                          </td>
                          <td className="p-3 border-r border-slate-200 text-center font-mono font-semibold">
                            {ed.totalPages || ed.pages?.length || 0}
                          </td>
                          <td className="p-3 border-r border-slate-200 text-center font-mono text-slate-600">
                            {ed.fileSize || 'N/A'}
                          </td>
                          <td className="p-3 border-r border-slate-200 text-center">
                            {ed.isStoredOnDrive || ed.driveFileId ? (
                              <span className="text-emerald-700 font-semibold text-[10px] bg-emerald-50 px-2 py-0.5 border border-emerald-300">
                                Synced
                              </span>
                            ) : (
                              <button
                                onClick={() => handleUploadSingleToDrive(ed)}
                                className="text-blue-700 hover:text-blue-900 font-semibold text-[10px] bg-blue-50 px-2 py-0.5 border border-blue-300 cursor-pointer"
                              >
                                Upload to Drive
                              </button>
                            )}
                          </td>
                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end gap-1.5 font-inter">
                              <button
                                onClick={() => setPreviewingEdition(ed)}
                                className="px-2 py-1 bg-[#0B2240] hover:bg-blue-900 text-white font-semibold text-[11px] border border-blue-950 flex items-center gap-1 cursor-pointer"
                              >
                                <Eye className="w-3 h-3" />
                                <span>Read</span>
                              </button>
                              <button
                                onClick={() => setActiveSectionEdition(ed)}
                                className="px-2 py-1 bg-blue-700 hover:bg-blue-800 text-white font-semibold text-[11px] border border-blue-900 flex items-center gap-1 cursor-pointer"
                              >
                                <Crosshair className="w-3 h-3" />
                                <span>Hotspots</span>
                              </button>
                              <button
                                onClick={() => handleDownloadEdition(ed)}
                                className="p-1 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 cursor-pointer"
                                title="Download PDF"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleStartEdit(ed)}
                                className="p-1 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 cursor-pointer"
                                title="Edit Edition"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDelete(ed.id, ed.date, ed.isStoredOnDrive)}
                                className="p-1 bg-red-50 hover:bg-red-100 text-red-700 border border-red-300 cursor-pointer"
                                title="Delete Edition"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

            </div>
          )}

          {/* =========================================================================
              TAB: NEWS SECTIONS (Interactive Hotspots)
             ========================================================================= */}
          {activeTab === 'sections' && (
            <div className="max-w-5xl mx-auto space-y-4 font-inter">
              
              <div className="border-2 border-slate-300 bg-white p-5 shadow-xs">
                <div className="border-b-2 border-slate-200 pb-3 mb-4">
                  <h2 className="font-manrope text-xl font-semibold text-slate-900">
                    News Sections (Hotspot Articles)
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Clickable newspaper clippings allow readers to view and share individual articles.
                  </p>
                </div>

                <div className="space-y-3">
                  {editions.map((ed) => {
                    const sectionCount = ed.sections?.length || 0;
                    return (
                      <div 
                        key={ed.id} 
                        className="border-2 border-slate-300 p-4 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-sm text-[#0B2240]">{ed.date}</span>
                            <span className="text-xs font-semibold text-slate-700">— {ed.title}</span>
                          </div>
                          <p className="text-xs text-slate-500 mt-1">
                            {ed.totalPages || ed.pages?.length || 0} Pages • {sectionCount} Hotspot Articles tagged
                          </p>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => setActiveSectionEdition(ed)}
                            className="px-3 py-1.5 bg-blue-800 hover:bg-blue-900 text-white font-semibold text-xs border-2 border-blue-950 flex items-center gap-1.5 cursor-pointer"
                          >
                            <Crosshair className="w-3.5 h-3.5 text-blue-300" />
                            <span>Open Section Editor</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          )}

          {/* =========================================================================
              TAB: GOOGLE DRIVE (Cloud Hub)
             ========================================================================= */}
          {activeTab === 'drive' && (
            <div className="max-w-4xl mx-auto space-y-5 font-inter">
              
              <div className="border-2 border-slate-300 bg-white p-5 shadow-xs">
                <div className="border-b-2 border-slate-200 pb-3 mb-4">
                  <h2 className="font-manrope text-xl font-semibold text-slate-900 flex items-center gap-2">
                    <Cloud className="w-5 h-5 text-emerald-600" />
                    <span>Google Drive Integration</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Connect your Google Drive account to create automatic cloud backups and sync across devices.
                  </p>
                </div>

                <div className="space-y-4">
                  
                  {/* Status Banner */}
                  <div className={`p-4 border-2 flex items-center justify-between ${
                    driveStatus.isConnected 
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-950' 
                      : 'bg-slate-50 border-slate-300 text-slate-800'
                  }`}>
                    <div className="flex items-center gap-3">
                      <div className={`p-2 border ${
                        driveStatus.isConnected 
                          ? 'bg-emerald-700 text-white border-emerald-800' 
                          : 'bg-slate-300 text-slate-700 border-slate-400'
                      }`}>
                        <Cloud className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-xs font-bold uppercase tracking-wider">
                          Status: {driveStatus.isConnected ? 'Connected' : 'Disconnected'}
                        </div>
                        <div className="text-xs font-medium text-slate-600">
                          {driveStatus.isConnected 
                            ? `User: ${driveStatus.userEmail || 'Google Cloud Session'} | Folder: ${driveStatus.folderName || 'Vatsagulma_Epaper_Archives'}`
                            : 'No active Google Drive connection.'}
                        </div>
                      </div>
                    </div>

                    <div>
                      {!driveStatus.isConnected ? (
                        <button
                          onClick={handleConnectDrive}
                          disabled={isDriveConnecting}
                          className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold border-2 border-emerald-950 text-xs flex items-center gap-2 cursor-pointer"
                        >
                          {isDriveConnecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Cloud className="w-4 h-4" />}
                          <span>Connect Drive</span>
                        </button>
                      ) : (
                        <button
                          onClick={handleDisconnectDrive}
                          className="px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-800 font-semibold border-2 border-red-300 text-xs cursor-pointer"
                        >
                          Disconnect
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Sync Actions */}
                  {driveStatus.isConnected && (
                    <div className="border-2 border-slate-300 p-4 bg-slate-50 space-y-3">
                      <h3 className="font-manrope text-sm font-semibold text-slate-900">
                        Cloud Synchronization Controls
                      </h3>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <button
                          onClick={handleSyncAllToDrive}
                          disabled={isDriveSyncing}
                          className="p-3 bg-[#0B2240] hover:bg-blue-900 text-white font-semibold border-2 border-blue-950 text-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                        >
                          {isDriveSyncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
                          <span>Backup All Editions to Drive</span>
                        </button>

                        <button
                          onClick={handleRestoreFromDrive}
                          disabled={isDriveSyncing}
                          className="p-3 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold border-2 border-emerald-950 text-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                        >
                          {isDriveSyncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                          <span>Restore from Drive Index</span>
                        </button>
                      </div>

                      {isDriveSyncing && (
                        <div className="p-3 bg-blue-50 border border-blue-300 space-y-1">
                          <div className="flex items-center justify-between text-xs font-semibold text-blue-950">
                            <span>{driveSyncProgress.message || 'Syncing with Drive...'}</span>
                            <span className="font-mono">{driveSyncProgress.percent}%</span>
                          </div>
                          <div className="w-full bg-blue-200 h-2">
                            <div 
                              className="bg-blue-800 h-2 transition-all duration-200" 
                              style={{ width: `${driveSyncProgress.percent}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                </div>
              </div>

            </div>
          )}

          {/* =========================================================================
              TAB: SETTINGS (Editorial & Publication Info)
             ========================================================================= */}
          {activeTab === 'settings' && (
            <div className="max-w-4xl mx-auto space-y-5 font-inter">
              
              <div className="border-2 border-slate-300 bg-white p-5 shadow-xs">
                <div className="border-b-2 border-slate-200 pb-3 mb-4">
                  <h2 className="font-manrope text-xl font-semibold text-slate-900">
                    Publication Settings
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Configure newspaper registration details, masthead titles, and editorial team names.
                  </p>
                </div>

                <form onSubmit={handleSaveSettings} className="space-y-4">
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    
                    <div className="border-2 border-slate-300 bg-white focus-within:border-[#0B2240]">
                      <div className="bg-slate-100 px-3 py-1 border-b border-slate-300 text-[10px] font-bold text-slate-700 uppercase">
                        Newspaper Name
                      </div>
                      <input
                        type="text"
                        value={settingTitle}
                        onChange={(e) => setSettingTitle(e.target.value)}
                        className="w-full px-3 py-2 text-xs font-medium text-slate-900 border-none outline-none"
                      />
                    </div>

                    <div className="border-2 border-slate-300 bg-white focus-within:border-[#0B2240]">
                      <div className="bg-slate-100 px-3 py-1 border-b border-slate-300 text-[10px] font-bold text-slate-700 uppercase">
                        RNI Registration No.
                      </div>
                      <input
                        type="text"
                        value={settingRni}
                        onChange={(e) => setSettingRni(e.target.value)}
                        className="w-full px-3 py-2 text-xs font-mono font-medium text-slate-900 border-none outline-none"
                      />
                    </div>

                    <div className="border-2 border-slate-300 bg-white focus-within:border-[#0B2240]">
                      <div className="bg-slate-100 px-3 py-1 border-b border-slate-300 text-[10px] font-bold text-slate-700 uppercase">
                        Title Code
                      </div>
                      <input
                        type="text"
                        value={settingTitleCode}
                        onChange={(e) => setSettingTitleCode(e.target.value)}
                        className="w-full px-3 py-2 text-xs font-mono font-medium text-slate-900 border-none outline-none"
                      />
                    </div>

                    <div className="border-2 border-slate-300 bg-white focus-within:border-[#0B2240]">
                      <div className="bg-slate-100 px-3 py-1 border-b border-slate-300 text-[10px] font-bold text-slate-700 uppercase">
                        Published Location
                      </div>
                      <input
                        type="text"
                        value={settingLocation}
                        onChange={(e) => setSettingLocation(e.target.value)}
                        className="w-full px-3 py-2 text-xs font-medium text-slate-900 border-none outline-none"
                      />
                    </div>

                    <div className="border-2 border-slate-300 bg-white focus-within:border-[#0B2240]">
                      <div className="bg-slate-100 px-3 py-1 border-b border-slate-300 text-[10px] font-bold text-slate-700 uppercase">
                        Chief Editor Name
                      </div>
                      <input
                        type="text"
                        value={settingChiefEditor}
                        onChange={(e) => setSettingChiefEditor(e.target.value)}
                        className="w-full px-3 py-2 text-xs font-medium text-slate-900 border-none outline-none"
                      />
                    </div>

                    <div className="border-2 border-slate-300 bg-white focus-within:border-[#0B2240]">
                      <div className="bg-slate-100 px-3 py-1 border-b border-slate-300 text-[10px] font-bold text-slate-700 uppercase">
                        Executive Editor Name
                      </div>
                      <input
                        type="text"
                        value={settingExecEditor}
                        onChange={(e) => setSettingExecEditor(e.target.value)}
                        className="w-full px-3 py-2 text-xs font-medium text-slate-900 border-none outline-none"
                      />
                    </div>

                  </div>

                  {/* Header Banner Image Upload Option */}
                  <div className="border-2 border-slate-300 bg-slate-50 p-4 space-y-3">
                    <div>
                      <h3 className="font-bold text-xs text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                        <span>Header Top Banner Advertisement / Brand Image</span>
                      </h3>
                      <p className="text-[11px] text-slate-600 mt-0.5">
                        Upload a custom image banner to be shown on the right side of the main header (Recommended size: 400x80px PNG/JPG/WEBP).
                      </p>
                    </div>

                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                      <label className="px-3.5 py-2 bg-[#0B2240] hover:bg-blue-900 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer border border-blue-950 shadow-2xs">
                        <UploadCloud className="w-3.5 h-3.5" />
                        <span>Upload Banner Image</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleBannerUpload}
                          className="hidden"
                        />
                      </label>

                      {settingBannerImage && (
                        <button
                          type="button"
                          onClick={() => setSettingBannerImage(null)}
                          className="px-3 py-2 bg-red-100 hover:bg-red-200 text-red-800 text-xs font-semibold border border-red-300 cursor-pointer"
                        >
                          Remove Banner
                        </button>
                      )}
                    </div>

                    {/* Banner Preview */}
                    {settingBannerImage && (
                      <div className="mt-2 border border-slate-300 bg-white p-2 w-fit max-w-full">
                        <div className="text-[10px] font-bold text-slate-500 uppercase mb-1">Banner Preview:</div>
                        <img 
                          src={settingBannerImage} 
                          alt="Banner Preview" 
                          className="max-h-16 w-auto object-contain border border-slate-200 bg-slate-50"
                        />
                      </div>
                    )}
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      className="py-2.5 px-5 bg-[#0B2240] hover:bg-blue-900 text-white font-semibold border-2 border-blue-950 text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <Save className="w-4 h-4" />
                      <span>Save Settings</span>
                    </button>
                  </div>

                </form>
              </div>

            </div>
          )}

          {/* =========================================================================
              TAB: SYSTEM (Diagnostics & Cache Control)
             ========================================================================= */}
          {activeTab === 'system' && (
            <div className="max-w-4xl mx-auto space-y-5 font-inter">
              
              <div className="border-2 border-slate-300 bg-white p-5 shadow-xs">
                <div className="border-b-2 border-slate-200 pb-3 mb-4">
                  <h2 className="font-manrope text-xl font-semibold text-slate-900">
                    System & Storage Diagnostics
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Technical storage metrics and cache management tools.
                  </p>
                </div>

                <div className="space-y-4">
                  
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="border-2 border-slate-300 bg-slate-50 p-3">
                      <div className="text-[10px] font-bold uppercase text-slate-500">Storage Engine</div>
                      <div className="text-sm font-bold text-slate-900 mt-0.5">IndexedDB + LocalStorage</div>
                    </div>
                    <div className="border-2 border-slate-300 bg-slate-50 p-3">
                      <div className="text-[10px] font-bold uppercase text-slate-500">Active Database</div>
                      <div className="text-sm font-bold text-slate-900 mt-0.5">vatsagulma_epaper_db</div>
                    </div>
                    <div className="border-2 border-slate-300 bg-slate-50 p-3">
                      <div className="text-[10px] font-bold uppercase text-slate-500">App Version</div>
                      <div className="text-sm font-bold text-slate-900 mt-0.5">v2.5.0 Production</div>
                    </div>
                  </div>

                  <div className="border-2 border-red-300 bg-red-50 p-4 space-y-2">
                    <h3 className="font-bold text-xs text-red-950 uppercase">Danger Zone: Cache Clearing</h3>
                    <p className="text-xs text-red-800">
                      Clearing cache removes all local editions stored in your browser. Editions backed up on Google Drive will remain safe.
                    </p>
                    <button
                      onClick={handleClearCache}
                      className="px-3 py-1.5 bg-red-700 hover:bg-red-800 text-white font-semibold border-2 border-red-950 text-xs cursor-pointer"
                    >
                      Clear Local Storage Cache
                    </button>
                  </div>

                </div>
              </div>

            </div>
          )}

          {/* =========================================================================
              TAB: EDIT (Contextual Edit Edition)
             ========================================================================= */}
          {activeTab === 'edit' && editingEdition && (
            <div className="max-w-4xl mx-auto space-y-5 font-inter">
              
              <div className="border-2 border-slate-300 bg-white p-5 shadow-xs">
                <div className="border-b-2 border-slate-200 pb-3 mb-4 flex items-center justify-between">
                  <div>
                    <h2 className="font-manrope text-xl font-semibold text-slate-900">
                      Edit Edition: {editingEdition.date}
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Update edition title, region, or replace the attached PDF file.
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveTab('archives')}
                    className="text-xs text-slate-600 hover:text-slate-900 font-semibold cursor-pointer border border-slate-300 px-2 py-1"
                  >
                    Cancel
                  </button>
                </div>

                <form onSubmit={handleEditSubmit} className="space-y-4">
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="border-2 border-slate-300 bg-white focus-within:border-[#0B2240]">
                      <div className="bg-slate-100 px-3 py-1 border-b border-slate-300 text-[10px] font-bold text-slate-700 uppercase">
                        Date
                      </div>
                      <input
                        type="date"
                        value={editDate}
                        onChange={(e) => setEditDate(e.target.value)}
                        required
                        className="w-full px-3 py-2 text-xs font-medium text-slate-900 border-none outline-none"
                      />
                    </div>

                    <div className="border-2 border-slate-300 bg-white focus-within:border-[#0B2240]">
                      <div className="bg-slate-100 px-3 py-1 border-b border-slate-300 text-[10px] font-bold text-slate-700 uppercase">
                        Edition Area
                      </div>
                      <input
                        type="text"
                        value={editArea}
                        onChange={(e) => setEditArea(e.target.value)}
                        required
                        className="w-full px-3 py-2 text-xs font-medium text-slate-900 border-none outline-none"
                      />
                    </div>

                    <div className="border-2 border-slate-300 bg-white focus-within:border-[#0B2240]">
                      <div className="bg-slate-100 px-3 py-1 border-b border-slate-300 text-[10px] font-bold text-slate-700 uppercase">
                        Chief Editor
                      </div>
                      <input
                        type="text"
                        value={editChiefEditor}
                        onChange={(e) => setEditChiefEditor(e.target.value)}
                        className="w-full px-3 py-2 text-xs font-medium text-slate-900 border-none outline-none"
                      />
                    </div>

                    <div className="border-2 border-slate-300 bg-white focus-within:border-[#0B2240]">
                      <div className="bg-slate-100 px-3 py-1 border-b border-slate-300 text-[10px] font-bold text-slate-700 uppercase">
                        Executive Editor
                      </div>
                      <input
                        type="text"
                        value={editExecutiveEditor}
                        onChange={(e) => setEditExecutiveEditor(e.target.value)}
                        className="w-full px-3 py-2 text-xs font-medium text-slate-900 border-none outline-none"
                      />
                    </div>
                  </div>

                  {/* Optional Replace PDF */}
                  <div className="border-2 border-slate-300 p-3 bg-slate-50">
                    <div className="text-[10px] font-bold uppercase text-slate-700 mb-1">
                      Replace PDF File (Optional)
                    </div>
                    <input
                      type="file"
                      accept="application/pdf"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setEditFile(e.target.files[0]);
                        }
                      }}
                      className="text-xs font-medium text-slate-700"
                    />
                    {editFile && (
                      <span className="text-xs text-emerald-700 font-semibold block mt-1">
                        New file selected: {editFile.name} ({(editFile.size / (1024 * 1024)).toFixed(2)} MB)
                      </span>
                    )}
                  </div>

                  <div className="pt-2 flex items-center gap-2">
                    <button
                      type="submit"
                      disabled={isProcessing}
                      className="py-2.5 px-5 bg-[#0B2240] hover:bg-blue-900 text-white font-semibold border-2 border-blue-950 text-xs flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
                    >
                      {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      <span>Save Changes</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('archives')}
                      className="py-2.5 px-4 bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold border-2 border-slate-400 text-xs cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>

                </form>
              </div>

            </div>
          )}

        </main>
      </div>

    </div>
  );
}
