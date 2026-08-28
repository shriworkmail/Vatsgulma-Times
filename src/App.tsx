import { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { NavyBar } from './components/NavyBar';
import { DateFilterBar } from './components/DateFilterBar';
import { ThumbnailSidebar } from './components/ThumbnailSidebar';
import { PdfViewerContainer } from './components/PdfViewerContainer';
import { FloatingRightToolbar } from './components/FloatingRightToolbar';
import { MobileBottomToolbar } from './components/MobileBottomToolbar';
import { Footer } from './components/Footer';
import { AdminPortal } from './components/AdminPortal';
import { SnipModal } from './components/SnipModal';
import { SectionViewerModal } from './components/SectionViewerModal';
import { Edition, NewsSection } from './types';
import { initializeStorage, getSavedEditions, checkIsAdminLoggedIn } from './services/storageService';

export default function App() {
  const [viewMode, setViewMode] = useState<'reader' | 'admin'>('reader');
  const [editions, setEditions] = useState<Edition[]>([]);
  const [currentEdition, setCurrentEdition] = useState<Edition | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [zoom, setZoom] = useState<number>(1.0);
  const [fitMode, setFitMode] = useState<'screen' | 'width' | 'original'>('original');
  const [isPanMode, setIsPanMode] = useState<boolean>(false);
  // Show thumbnails on left side by default on desktop/tablet
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(typeof window !== 'undefined' ? window.innerWidth >= 768 : true);
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState<boolean>(false);
  
  // Footer visibility on scroll state
  const [isScrolled, setIsScrolled] = useState<boolean>(false);
  
  // Snip & Share Tool States
  const [isSnipMode, setIsSnipMode] = useState<boolean>(false);
  const [croppedImageUrl, setCroppedImageUrl] = useState<string | null>(null);
  const [isSnipModalOpen, setIsSnipModalOpen] = useState<boolean>(false);

  // Interactive Section Hotspot Modal State
  const [selectedSectionForModal, setSelectedSectionForModal] = useState<NewsSection | null>(null);

  // Settings State for Header Display
  const [headerSettings, setHeaderSettings] = useState<{
    bannerImage?: string | null;
    chiefEditor?: string;
    execEditor?: string;
    location?: string;
    titleCode?: string;
  }>({});

  // Function to refresh publication settings from localStorage
  const loadHeaderSettings = useCallback(() => {
    try {
      const saved = localStorage.getItem('vatsagulma_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        setHeaderSettings({
          bannerImage: parsed.bannerImage || null,
          chiefEditor: parsed.chiefEditor || 'प्रा. राम धनगर',
          execEditor: parsed.execEditor || 'स्वप्नील रोकडे',
          location: parsed.location || 'वाशीम येथून प्रकाशित',
          titleCode: parsed.titleCode || 'MAHMAR49870',
        });
      }
    } catch (e) {
      console.warn('Error reading publication settings:', e);
    }
  }, []);

  // Initialize storage & clean state on startup
  const loadEditions = useCallback(async () => {
    try {
      loadHeaderSettings();
      const loaded = await initializeStorage();
      setEditions(loaded);
      
      if (loaded.length > 0) {
        const latestEdition = loaded[0];
        setCurrentEdition(latestEdition);
        setSelectedDate(latestEdition.date);
        setCurrentPage(1);
      } else {
        setCurrentEdition(null);
        setSelectedDate(new Date().toISOString().split('T')[0]);
      }
    } catch (err) {
      console.error('Error initializing editions:', err);
    }
  }, []);

  useEffect(() => {
    loadEditions();
    setIsAdminLoggedIn(checkIsAdminLoggedIn());

    // Adjust sidebar on window resize
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setIsSidebarOpen(false);
      } else {
        setIsSidebarOpen(true);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [loadEditions]);

  // Keyboard navigation shortcuts for high-craft developer UX
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts if typing inside inputs/textareas
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      if (viewMode === 'reader') {
        if (e.key === 'ArrowLeft' && !isSnipMode) {
          setCurrentPage((prev) => Math.max(1, prev - 1));
        } else if (e.key === 'ArrowRight' && !isSnipMode) {
          const maxP = currentEdition?.totalPages || currentEdition?.pages?.length || 1;
          setCurrentPage((prev) => Math.min(maxP, prev + 1));
        } else if (e.key === '+' || e.key === '=') {
          setZoom((prev) => Math.min(3.0, +(prev + 0.15).toFixed(2)));
        } else if (e.key === '-') {
          setZoom((prev) => Math.max(0.4, +(prev - 0.15).toFixed(2)));
        } else if (e.key === '0') {
          setZoom(1.0);
          setFitMode('original');
        } else if (e.key === 'Escape') {
          if (isSnipMode) setIsSnipMode(false);
          if (selectedSectionForModal) setSelectedSectionForModal(null);
          if (isSnipModalOpen) setIsSnipModalOpen(false);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [viewMode, isSnipMode, currentEdition, selectedSectionForModal, isSnipModalOpen]);

  // Handle Date Filter Change
  const handleDateChange = (newDate: string) => {
    setSelectedDate(newDate);
    const matched = editions.find((e) => e.date === newDate);
    if (matched) {
      setCurrentEdition(matched);
      setCurrentPage(1);
    }
  };

  // Change Paper / Edition Navigation
  const currentEditionIndex = editions.findIndex((e) => e.date === selectedDate);
  const hasPrevEdition = currentEditionIndex > -1 && currentEditionIndex < editions.length - 1;
  const hasNextEdition = currentEditionIndex > 0;

  const handlePrevEdition = () => {
    if (hasPrevEdition) {
      const olderEdition = editions[currentEditionIndex + 1];
      setSelectedDate(olderEdition.date);
      setCurrentEdition(olderEdition);
      setCurrentPage(1);
    }
  };

  const handleNextEdition = () => {
    if (hasNextEdition) {
      const newerEdition = editions[currentEditionIndex - 1];
      setSelectedDate(newerEdition.date);
      setCurrentEdition(newerEdition);
      setCurrentPage(1);
    }
  };

  // Zoom controls
  const handleZoomIn = () => setZoom((prev) => Math.min(3.0, +(prev + 0.15).toFixed(2)));
  const handleZoomOut = () => setZoom((prev) => Math.max(0.4, +(prev - 0.15).toFixed(2)));
  const handleZoomReset = () => {
    setZoom(1.0);
    setFitMode('original');
  };
  const handleToggleFitMode = () => {
    setFitMode((prev) => {
      if (prev === 'original') return 'screen';
      if (prev === 'screen') return 'width';
      return 'original';
    });
    setZoom(1.0);
  };

  // Fullscreen mode
  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  // Download full page as image
  const handleDownloadPage = () => {
    const canvas = document.getElementById('epaper-render-canvas') as HTMLCanvasElement | null;
    if (!canvas) return;

    const link = document.createElement('a');
    link.download = `Vatsagulma_Times_Washim_Page_${currentPage}_${selectedDate}.jpg`;
    link.href = canvas.toDataURL('image/jpeg', 0.95);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Download raw PDF
  const handleDownloadPdf = () => {
    if (!currentEdition?.pdfDataUrl) {
      alert('या अंकाची पीडीएफ फाईल उपलब्ध नाही.');
      return;
    }
    const link = document.createElement('a');
    link.download = currentEdition.pdfFileName || `Vatsagulma_Times_${selectedDate}.pdf`;
    link.href = currentEdition.pdfDataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Snip Tool Callbacks
  const handleStartSnip = () => {
    setIsSnipMode(true);
  };

  const handleCancelSnip = () => {
    setIsSnipMode(false);
  };

  const handleFinishSnip = (dataUrl: string) => {
    setIsSnipMode(false);
    setCroppedImageUrl(dataUrl);
    setIsSnipModalOpen(true);
  };

  const pagesList = currentEdition?.pages || [];
  const totalPages = currentEdition?.totalPages || pagesList.length || 1;
  const currentPageData = pagesList.find((p) => p.pageNumber === currentPage) || pagesList[0];

  // 1. If Admin Mode is active, render Full-Screen Admin Portal (Not in a popup)
  if (viewMode === 'admin') {
    return (
      <AdminPortal
        onBackToReader={() => {
          loadHeaderSettings();
          setViewMode('reader');
        }}
        isAdminLoggedIn={isAdminLoggedIn}
        setIsAdminLoggedIn={setIsAdminLoggedIn}
        editions={editions}
        onRefreshEditions={async () => {
          loadHeaderSettings();
          const fresh = await getSavedEditions();
          setEditions(fresh);
          if (fresh.length > 0) {
            setCurrentEdition((prev) => {
              if (!prev) return fresh[0];
              const updatedCurrent = fresh.find((e) => e.id === prev.id) || fresh.find((e) => e.date === selectedDate) || fresh[0];
              return updatedCurrent || null;
            });
          }
        }}
        onSelectEditionAndRead={(ed) => {
          loadHeaderSettings();
          setCurrentEdition(ed);
          setSelectedDate(ed.date);
          setCurrentPage(1);
          setViewMode('reader');
        }}
        onPreviewSection={(sec) => setSelectedSectionForModal(sec)}
      />
    );
  }

  // 2. Otherwise render the Clean Public E-Paper Reader View in a containerized frame with clean white background
  return (
    <div className="h-screen w-screen bg-white flex flex-col items-center justify-center p-0 overflow-hidden font-marathi-sans select-none">
      
      {/* Container Frame for Main Website */}
      <div className="w-full max-w-[1700px] h-full flex flex-col bg-white overflow-hidden relative shadow-md">
        
        {/* 1. Header with Paper Name, 2-line details, and right banner */}
        <Header
          onOpenAdmin={() => setViewMode('admin')}
          isAdminLoggedIn={isAdminLoggedIn}
          bannerImageUrl={headerSettings.bannerImage}
          chiefEditor={headerSettings.chiefEditor}
          execEditor={headerSettings.execEditor}
          location={headerSettings.location}
          titleCode={headerSettings.titleCode}
        />

        {/* 2. Navy Blue Info Strip (Single Line text after Title code) */}
        <NavyBar />

        {/* 3. Clean Date Bar with Page Selector, WhatsApp Share and Fullscreen Toggle */}
        <DateFilterBar
          selectedDate={selectedDate}
          onDateChange={handleDateChange}
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={(p) => setCurrentPage(p)}
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          isSidebarOpen={isSidebarOpen}
          onToggleFullscreen={handleToggleFullscreen}
          onPrevEdition={handlePrevEdition}
          onNextEdition={handleNextEdition}
          hasPrevEdition={hasPrevEdition}
          hasNextEdition={hasNextEdition}
        />

        {/* 4. Fit-to-screen Workspace: Left Thumbnails Sidebar + PDF Viewer */}
        <main className="flex-1 flex overflow-hidden relative w-full h-full bg-white">
          {/* Thumbnails on Left Side */}
          {pagesList.length > 0 && (
            <ThumbnailSidebar
              pages={pagesList}
              currentPage={currentPage}
              onSelectPage={(p) => setCurrentPage(p)}
              isOpen={isSidebarOpen}
              onClose={() => setIsSidebarOpen(false)}
              editionTitle={currentEdition?.title || 'वत्सगुल्म टाईम्स'}
              editionDate={selectedDate}
            />
          )}

          {/* Center: Full-page Newspaper Viewer with Interactive Section Hotspots */}
          <PdfViewerContainer
            currentPageData={currentPageData}
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={(p) => setCurrentPage(p)}
            zoom={zoom}
            onZoomIn={handleZoomIn}
            onZoomOut={handleZoomOut}
            onZoomReset={handleZoomReset}
            pdfDataUrl={currentEdition?.pdfDataUrl}
            editionDate={selectedDate}
            editionTitle={currentEdition?.title || 'वत्सगुल्म टाईम्स'}
            isSnipMode={isSnipMode}
            onFinishSnip={handleFinishSnip}
            onCancelSnip={handleCancelSnip}
            fitMode={fitMode}
            onToggleFitMode={handleToggleFitMode}
            isPanMode={isPanMode}
            onTogglePanMode={() => setIsPanMode((prev) => !prev)}
            sections={currentEdition?.sections || []}
            onSelectSection={(sec) => setSelectedSectionForModal(sec)}
            onScrollStateChange={(scrolled) => setIsScrolled(scrolled)}
          />

          {/* Right Hand Side: Openable Circle Tools Floating Action Button */}
          <FloatingRightToolbar
            zoom={zoom}
            onZoomIn={handleZoomIn}
            onZoomOut={handleZoomOut}
            onZoomReset={handleZoomReset}
            fitMode={fitMode}
            onToggleFitMode={handleToggleFitMode}
            isPanMode={isPanMode}
            onTogglePanMode={() => setIsPanMode((prev) => !prev)}
            isSnipMode={isSnipMode}
            onStartSnip={handleStartSnip}
            onDownloadPage={handleDownloadPage}
            onDownloadPdf={handleDownloadPdf}
            onToggleFullscreen={handleToggleFullscreen}
            hasPdf={!!currentEdition?.pdfDataUrl}
          />
        </main>

        {/* 5. Mobile Bottom Toolbar: Displayed Below Paper on Mobile Screens */}
        <MobileBottomToolbar
          zoom={zoom}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onZoomReset={handleZoomReset}
          fitMode={fitMode}
          onToggleFitMode={handleToggleFitMode}
          isPanMode={isPanMode}
          onTogglePanMode={() => setIsPanMode((prev) => !prev)}
          isSnipMode={isSnipMode}
          onStartSnip={handleStartSnip}
          onDownloadPage={handleDownloadPage}
          onDownloadPdf={handleDownloadPdf}
          onToggleFullscreen={handleToggleFullscreen}
          hasPdf={!!currentEdition?.pdfDataUrl}
        />

        {/* 6. Footer: Hidden by default, smoothly revealed only when user scrolls */}
        <div 
          className={`transition-all duration-300 ease-in-out shrink-0 z-30 overflow-hidden ${
            isScrolled 
              ? 'translate-y-0 opacity-100 max-h-16' 
              : 'translate-y-full opacity-0 max-h-0 pointer-events-none'
          }`}
        >
          <Footer
            onOpenAdmin={() => setViewMode('admin')}
            isAdminLoggedIn={isAdminLoggedIn}
          />
        </div>
      </div>

      {/* Cropped Article Snippet Modal */}
      <SnipModal
        isOpen={isSnipModalOpen}
        onClose={() => setIsSnipModalOpen(false)}
        croppedImageUrl={croppedImageUrl}
        editionDate={selectedDate}
        editionTitle={currentEdition?.title || 'वत्सगुल्म टाईम्स'}
      />

      {/* Reader Side High-Resolution Interactive Section Popup Modal */}
      <SectionViewerModal
        isOpen={!!selectedSectionForModal}
        onClose={() => setSelectedSectionForModal(null)}
        section={selectedSectionForModal}
        pdfDataUrl={currentEdition?.pdfDataUrl}
        pageImageUrl={
          selectedSectionForModal
            ? currentEdition?.pages?.find(
                (p) => p.pageNumber === selectedSectionForModal.pageNumber
              )?.fullPageUrl ||
              currentEdition?.pages?.find(
                (p) => p.pageNumber === selectedSectionForModal.pageNumber
              )?.thumbnailUrl
            : undefined
        }
        editionDate={selectedDate}
        editionTitle={currentEdition?.title || 'वत्सगुल्म टाईम्स'}
      />

    </div>
  );
}
