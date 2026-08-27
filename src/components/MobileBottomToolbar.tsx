import { useState } from 'react';
import { 
  ZoomIn, 
  ZoomOut, 
  Hand, 
  Scissors, 
  Download, 
  FileDown, 
  Image as ImageIcon, 
  Maximize2, 
  Minimize2, 
  Maximize,
  Minimize,
  RotateCcw,
  X
} from 'lucide-react';

interface MobileBottomToolbarProps {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomReset: () => void;
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

export function MobileBottomToolbar({
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
}: MobileBottomToolbarProps) {
  const [showDownloadSheet, setShowDownloadSheet] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(!!document.fullscreenElement);

  const handleFullscreenClick = () => {
    onToggleFullscreen();
    setTimeout(() => {
      setIsFullscreen(!!document.fullscreenElement);
    }, 150);
  };

  if (!hasPdf) return null;

  return (
    <>
      {/* Fixed Mobile Bottom Toolbar (Below Paper on Mobile) */}
      <div 
        id="mobile-bottom-toolbar"
        aria-label="मोबाइल ई-पेपर टूल्स (Mobile Toolbar)"
        className="block md:hidden shrink-0 bg-[#0B2240] text-white border-t border-slate-700/80 shadow-2xl z-40 select-none pb-safe"
      >
        <div className="flex items-center justify-around px-1.5 py-1.5 gap-0.5 overflow-x-auto no-scrollbar">
          
          {/* 1. Hand Pan Tool */}
          <button
            onClick={onTogglePanMode}
            id="mobile-toolbar-hand-pan"
            className={`flex-1 min-w-[48px] py-1 px-1 rounded-lg flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer active:scale-95 ${
              isPanMode 
                ? 'bg-amber-400 text-slate-950 font-bold shadow-xs' 
                : 'text-slate-200 hover:bg-white/10 active:bg-white/20'
            }`}
            title="हँड टूल"
          >
            <Hand className="w-4 h-4" />
            <span className="text-[9px] font-marathi-sans font-semibold leading-none">
              हँड
            </span>
          </button>

          {/* 2. Snip Tool */}
          <button
            onClick={onStartSnip}
            id="mobile-toolbar-snip"
            className={`flex-1 min-w-[48px] py-1 px-1 rounded-lg flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer active:scale-95 ${
              isSnipMode 
                ? 'bg-[#8B0000] text-white font-bold shadow-xs' 
                : 'text-slate-200 hover:bg-white/10 active:bg-white/20'
            }`}
            title="कात्रण / क्रॉप"
          >
            <Scissors className={`w-4 h-4 ${isSnipMode ? 'text-white' : 'text-red-300'}`} />
            <span className="text-[9px] font-marathi-sans font-semibold leading-none">
              कात्रण
            </span>
          </button>

          {/* Divider */}
          <div className="w-[1px] h-6 bg-white/20 shrink-0" />

          {/* 3. Zoom Out */}
          <button
            onClick={onZoomOut}
            id="mobile-toolbar-zoom-out"
            className="flex-1 min-w-[44px] py-1 px-1 rounded-lg flex flex-col items-center justify-center gap-0.5 text-slate-200 hover:bg-white/10 active:scale-95 cursor-pointer"
            title="झूम कमी करा (-)"
          >
            <ZoomOut className="w-4 h-4 text-cyan-300" />
            <span className="text-[9px] font-marathi-sans font-semibold leading-none">
              झूम -
            </span>
          </button>

          {/* 4. Zoom Reset */}
          <button
            onClick={onZoomReset}
            id="mobile-toolbar-zoom-reset"
            className="flex-1 min-w-[44px] py-1 px-1 rounded-lg flex flex-col items-center justify-center text-slate-200 hover:bg-white/10 active:scale-95 cursor-pointer"
            title="१००% रिसेट"
          >
            <span className="text-[10px] font-mono font-bold text-amber-300 leading-none">
              {Math.round(zoom * 100)}%
            </span>
            <span className="text-[8px] text-slate-300 font-marathi-sans mt-0.5 leading-none">
              रिसेट
            </span>
          </button>

          {/* 5. Zoom In */}
          <button
            onClick={onZoomIn}
            id="mobile-toolbar-zoom-in"
            className="flex-1 min-w-[44px] py-1 px-1 rounded-lg flex flex-col items-center justify-center gap-0.5 text-slate-200 hover:bg-white/10 active:scale-95 cursor-pointer"
            title="झूम वाढवा (+)"
          >
            <ZoomIn className="w-4 h-4 text-cyan-300" />
            <span className="text-[9px] font-marathi-sans font-semibold leading-none">
              झूम +
            </span>
          </button>

          {/* Divider */}
          <div className="w-[1px] h-6 bg-white/20 shrink-0" />

          {/* 6. Fit Mode */}
          <button
            onClick={onToggleFitMode}
            id="mobile-toolbar-fit-mode"
            className={`flex-1 min-w-[48px] py-1 px-1 rounded-lg flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer active:scale-95 ${
              fitMode === 'original'
                ? 'bg-amber-400 text-slate-950 font-bold'
                : fitMode === 'width'
                  ? 'bg-sky-500 text-white font-bold'
                  : 'text-slate-200 hover:bg-white/10'
            }`}
            title="मूळ आकार / स्क्रीन / रुंदी फिट"
          >
            {fitMode === 'screen' ? (
              <Maximize className="w-4 h-4" />
            ) : fitMode === 'width' ? (
              <Minimize className="w-4 h-4" />
            ) : (
              <RotateCcw className="w-4 h-4" />
            )}
            <span className="text-[9px] font-marathi-sans font-semibold leading-none">
              {fitMode === 'original' ? 'मूळ' : fitMode === 'screen' ? 'स्क्रीन' : 'रुंदी'}
            </span>
          </button>

          {/* 7. Download Hub */}
          <button
            onClick={() => setShowDownloadSheet(true)}
            id="mobile-toolbar-download"
            className="flex-1 min-w-[48px] py-1 px-1 rounded-lg flex flex-col items-center justify-center gap-0.5 text-emerald-300 hover:bg-white/10 active:scale-95 cursor-pointer"
            title="डाउनलोड"
          >
            <Download className="w-4 h-4" />
            <span className="text-[9px] font-marathi-sans font-semibold leading-none">
              डाउनलोड
            </span>
          </button>

          {/* 8. Fullscreen */}
          <button
            onClick={handleFullscreenClick}
            id="mobile-toolbar-fullscreen"
            className="flex-1 min-w-[48px] py-1 px-1 rounded-lg flex flex-col items-center justify-center gap-0.5 text-purple-300 hover:bg-white/10 active:scale-95 cursor-pointer"
            title="फुलस्क्रीन"
          >
            {isFullscreen ? (
              <Minimize2 className="w-4 h-4" />
            ) : (
              <Maximize2 className="w-4 h-4" />
            )}
            <span className="text-[9px] font-marathi-sans font-semibold leading-none">
              {isFullscreen ? 'बाहेर' : 'फुल'}
            </span>
          </button>

        </div>
      </div>

      {/* Download Action Bottom Sheet Modal */}
      {showDownloadSheet && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 font-marathi-sans md:hidden">
          <div className="bg-white rounded-t-2xl w-full max-w-md p-4 shadow-2xl space-y-3 animate-in slide-in-from-bottom duration-200">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <h3 className="font-bold text-sm text-[#0B2240]">डाउनलोड पर्याय (Download Options)</h3>
              <button
                onClick={() => setShowDownloadSheet(false)}
                className="p-1 text-slate-500 hover:text-slate-800 rounded cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 pt-1">
              <button
                onClick={() => {
                  onDownloadPage();
                  setShowDownloadSheet(false);
                }}
                className="w-full p-3 text-left text-sm font-bold text-slate-800 hover:bg-slate-100 rounded-xl border border-slate-200 flex items-center gap-3 cursor-pointer shadow-2xs"
              >
                <div className="p-2 bg-red-50 text-[#8B0000] rounded-lg">
                  <ImageIcon className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-slate-900">सध्याचे पान (JPG Image)</div>
                  <div className="text-[11px] text-slate-500 font-normal">वाचन व शेअर करण्यासाठी हाय-रिझोल्युशन इमेज</div>
                </div>
              </button>

              {onDownloadPdf && (
                <button
                  onClick={() => {
                    onDownloadPdf();
                    setShowDownloadSheet(false);
                  }}
                  className="w-full p-3 text-left text-sm font-bold text-slate-800 hover:bg-slate-100 rounded-xl border border-slate-200 flex items-center gap-3 cursor-pointer shadow-2xs"
                >
                  <div className="p-2 bg-blue-50 text-[#0B2240] rounded-lg">
                    <FileDown className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-slate-900">संपूर्ण ई-पेपर (Full PDF)</div>
                    <div className="text-[11px] text-slate-500 font-normal">सर्व पृष्ठांची संपूर्ण मूळ पीडीएफ फाईल</div>
                  </div>
                </button>
              )}
            </div>

            <button
              onClick={() => setShowDownloadSheet(false)}
              className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
            >
              रद्द करा (Cancel)
            </button>
          </div>
        </div>
      )}
    </>
  );
}
