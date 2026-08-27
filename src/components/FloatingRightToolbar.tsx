import React, { useState, useEffect, useRef } from 'react';
import { 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Hand, 
  Scissors, 
  Download, 
  FileDown, 
  Image as ImageIcon, 
  Maximize2, 
  Minimize2, 
  Maximize,
  Minimize,
  Wrench,
  X,
  Sparkles
} from 'lucide-react';

interface FloatingRightToolbarProps {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomReset: () => void;
  onSetZoom?: (zoom: number) => void;
  fitMode: 'screen' | 'width' | 'original';
  onToggleFitMode: () => void;
  isPanMode: boolean;
  onTogglePanMode: () => void;
  isSnipMode: boolean;
  onStartSnip: () => void;
  onDownloadPage: () => void;
  onDownloadPdf?: () => void;
  onToggleFullscreen: () => void;
  hasPdf: boolean;
}

export function FloatingRightToolbar({
  zoom,
  onZoomIn,
  onZoomOut,
  onZoomReset,
  fitMode,
  onToggleFitMode,
  isPanMode,
  onTogglePanMode,
  isSnipMode,
  onStartSnip,
  onDownloadPage,
  onDownloadPdf,
  onToggleFullscreen,
  hasPdf,
}: FloatingRightToolbarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(!!document.fullscreenElement);
  const toolbarRef = useRef<HTMLDivElement | null>(null);

  const handleFullscreenClick = () => {
    onToggleFullscreen();
    setTimeout(() => {
      setIsFullscreen(!!document.fullscreenElement);
    }, 150);
  };

  // Close toolbar when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (isOpen && toolbarRef.current && !toolbarRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  if (!hasPdf) return null;

  return (
    <div ref={toolbarRef} className="fixed right-3 sm:right-5 top-1/2 -translate-y-1/2 z-45 select-none font-marathi-sans">
      {/* 1. Closed State: Circular Floating Action Button (Openable Circle) */}
      {!isOpen ? (
        <div className="relative group">
          <button
            onClick={() => setIsOpen(true)}
            id="tools-openable-circle-btn"
            className="w-13 h-13 sm:w-14 sm:h-14 rounded-full bg-[#0B2240] hover:bg-[#13335A] text-white shadow-2xl border-2 border-amber-400 flex flex-col items-center justify-center cursor-pointer transition-all duration-200 hover:scale-110 active:scale-95 group focus:outline-hidden"
            title="टूल्स उघडा (Open Tools Menu)"
            aria-label="ई-पेपर टूल्स उघडा"
          >
            <div className="relative">
              <Wrench className="w-5 h-5 sm:w-5.5 sm:h-5.5 text-amber-400 group-hover:rotate-45 transition-transform duration-300" />
              {(isPanMode || isSnipMode) && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border border-white animate-ping" />
              )}
            </div>
            <span className="text-[9px] sm:text-[10px] font-bold text-amber-200 tracking-tight leading-none mt-0.5">
              टूल्स
            </span>
          </button>

          {/* Hover Tooltip Pill */}
          <div className="absolute right-full mr-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-150 bg-slate-900 text-white text-[11px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap shadow-xl border border-slate-700">
            टूल्स मेनू उघडा
          </div>
        </div>
      ) : (
        /* 2. Opened State: Floating Tools Panel with Close Circle */
        <aside
          id="right-side-floating-toolbar-expanded"
          aria-label="ई-पेपर टूल्स (Tools)"
          className="flex flex-col items-center bg-[#0B2240] text-white rounded-3xl shadow-2xl border-2 border-amber-400/90 p-2 w-[62px] sm:w-[68px] animate-in fade-in zoom-in-95 duration-200"
        >
          {/* Header with Close Circle Button */}
          <div className="w-full flex items-center justify-between pb-1.5 mb-1 border-b border-white/20 px-0.5">
            <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest font-marathi-sans">
              टूल्स
            </span>
            <button
              onClick={() => setIsOpen(false)}
              id="tools-circle-close-btn"
              className="w-5 h-5 rounded-full bg-white/15 hover:bg-red-600 text-white flex items-center justify-center cursor-pointer transition-colors"
              title="टूल्स बंद करा (Close Tools)"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="w-full flex flex-col gap-1">
            {/* 1. Hand Pan Tool */}
            <button
              onClick={onTogglePanMode}
              id="right-toolbar-hand-pan"
              className={`w-full py-1.5 px-1 rounded-xl flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer group active:scale-95 ${
                isPanMode 
                  ? 'bg-amber-400 text-slate-950 font-bold shadow-md ring-2 ring-amber-300' 
                  : 'hover:bg-white/15 text-slate-100 hover:text-white'
              }`}
              title="हँड टूल (Hand Tool - पेपर फिरवण्यासाठी)"
            >
              <Hand className="w-4 h-4" />
              <span className="text-[9px] leading-tight font-marathi-sans font-semibold text-center truncate w-full">
                हँड टूल
              </span>
            </button>

            {/* 2. Snip / Cutout Tool */}
            <button
              onClick={onStartSnip}
              id="right-toolbar-snip"
              className={`w-full py-1.5 px-1 rounded-xl flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer group active:scale-95 ${
                isSnipMode 
                  ? 'bg-[#8B0000] text-white font-bold shadow-md ring-2 ring-red-400' 
                  : 'hover:bg-white/15 text-slate-100 hover:text-white'
              }`}
              title="कात्रण / स्निप टूल (Crop & Share Article)"
            >
              <Scissors className={`w-4 h-4 ${isSnipMode ? 'text-white' : 'text-red-300 group-hover:text-white'}`} />
              <span className="text-[9px] leading-tight font-marathi-sans font-semibold text-center truncate w-full">
                कात्रण
              </span>
            </button>

            <div className="w-8 h-[1px] bg-white/20 my-0.5 mx-auto" />

            {/* 3. Zoom In */}
            <button
              onClick={onZoomIn}
              id="right-toolbar-zoom-in"
              className="w-full py-1.5 px-1 rounded-xl flex flex-col items-center justify-center gap-0.5 hover:bg-white/15 text-slate-100 hover:text-white transition-all cursor-pointer group active:scale-95"
              title="झूम वाढवा (Zoom In +)"
            >
              <ZoomIn className="w-4 h-4 text-cyan-300" />
              <span className="text-[9px] leading-tight font-marathi-sans font-semibold text-center truncate w-full">
                झूम +
              </span>
            </button>

            {/* 4. Zoom Reset / Percentage */}
            <button
              onClick={onZoomReset}
              id="right-toolbar-zoom-reset"
              className="w-full py-1 px-1 rounded-lg flex flex-col items-center justify-center hover:bg-white/15 transition-all cursor-pointer group"
              title="मूळ आकार १००% (Reset to 100% Original Size)"
            >
              <span className="text-[10px] font-mono font-bold text-amber-300">
                {Math.round(zoom * 100)}%
              </span>
              <span className="text-[8px] text-slate-200 font-marathi-sans font-medium">
                मूळ १००%
              </span>
            </button>

            {/* 5. Zoom Out */}
            <button
              onClick={onZoomOut}
              id="right-toolbar-zoom-out"
              className="w-full py-1.5 px-1 rounded-xl flex flex-col items-center justify-center gap-0.5 hover:bg-white/15 text-slate-100 hover:text-white transition-all cursor-pointer group active:scale-95"
              title="झूम कमी करा (Zoom Out -)"
            >
              <ZoomOut className="w-4 h-4 text-cyan-300" />
              <span className="text-[9px] leading-tight font-marathi-sans font-semibold text-center truncate w-full">
                झूम -
              </span>
            </button>

            <div className="w-8 h-[1px] bg-white/20 my-0.5 mx-auto" />

            {/* 6. Fit Mode Toggle */}
            <button
              onClick={onToggleFitMode}
              id="right-toolbar-fit-mode"
              className={`w-full py-1.5 px-1 rounded-xl flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer group active:scale-95 ${
                fitMode === 'original' 
                  ? 'bg-amber-400 text-slate-950 font-bold shadow-xs' 
                  : fitMode === 'width' 
                    ? 'bg-sky-500 text-white font-bold' 
                    : 'hover:bg-white/15 text-slate-100'
              }`}
              title={
                fitMode === 'original' 
                  ? 'मूळ आकार १००%' 
                  : fitMode === 'screen' 
                    ? 'स्क्रीन फिट' 
                    : 'रुंदी फिट'
              }
            >
              {fitMode === 'original' ? (
                <RotateCcw className="w-4 h-4" />
              ) : fitMode === 'screen' ? (
                <Maximize className="w-4 h-4" />
              ) : (
                <Minimize className="w-4 h-4" />
              )}
              <span className="text-[9px] leading-tight font-marathi-sans font-semibold text-center truncate w-full">
                {fitMode === 'original' ? 'मूळ आकार' : fitMode === 'screen' ? 'स्क्रीन' : 'रुंदी'}
              </span>
            </button>

            {/* 7. Download Hub */}
            <div className="relative w-full">
              <button
                onClick={() => setShowDownloadMenu(!showDownloadMenu)}
                id="right-toolbar-download-toggle"
                className={`w-full py-1.5 px-1 rounded-xl flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer group active:scale-95 ${
                  showDownloadMenu ? 'bg-emerald-600 text-white font-bold' : 'hover:bg-white/15 text-slate-100'
                }`}
                title="ई-पेपर डाउनलोड पर्याय (Download Options)"
              >
                <Download className="w-4 h-4 text-emerald-300 group-hover:text-white" />
                <span className="text-[9px] leading-tight font-marathi-sans font-semibold text-center truncate w-full">
                  डाउनलोड
                </span>
              </button>

              {/* Download Submenu Popup */}
              {showDownloadMenu && (
                <div 
                  className="absolute right-full mr-2 bottom-0 bg-white text-slate-900 rounded-xl shadow-2xl border border-slate-300 py-1.5 w-48 z-50 animate-in fade-in zoom-in-95 duration-150"
                  onMouseLeave={() => setShowDownloadMenu(false)}
                >
                  <div className="px-3 py-1 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100 mb-1">
                    डाउनलोड पर्याय
                  </div>
                  
                  <button
                    onClick={() => {
                      onDownloadPage();
                      setShowDownloadMenu(false);
                    }}
                    className="w-full px-3 py-2 text-left text-xs font-bold text-slate-800 hover:bg-slate-100 flex items-center gap-2 cursor-pointer transition-colors"
                  >
                    <ImageIcon className="w-3.5 h-3.5 text-[#8B0000]" />
                    <span>सध्याचे पान (JPG)</span>
                  </button>

                  {onDownloadPdf && (
                    <button
                      onClick={() => {
                        onDownloadPdf();
                        setShowDownloadMenu(false);
                      }}
                      className="w-full px-3 py-2 text-left text-xs font-bold text-slate-800 hover:bg-slate-100 flex items-center gap-2 cursor-pointer transition-colors"
                    >
                      <FileDown className="w-3.5 h-3.5 text-[#0B2240]" />
                      <span>संपूर्ण ई-पेपर (PDF)</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* 8. Fullscreen Mode */}
            <button
              onClick={handleFullscreenClick}
              id="right-toolbar-fullscreen"
              className="w-full py-1.5 px-1 rounded-xl flex flex-col items-center justify-center gap-0.5 hover:bg-white/15 text-slate-100 hover:text-white transition-all cursor-pointer group active:scale-95"
              title="फुलस्क्रीन (Fullscreen)"
            >
              {isFullscreen ? (
                <Minimize2 className="w-4 h-4 text-purple-300" />
              ) : (
                <Maximize2 className="w-4 h-4 text-purple-300" />
              )}
              <span className="text-[9px] leading-tight font-marathi-sans font-semibold text-center truncate w-full">
                {isFullscreen ? 'बाहेर' : 'फुलस्क्रीन'}
              </span>
            </button>
          </div>
        </aside>
      )}
    </div>
  );
}
