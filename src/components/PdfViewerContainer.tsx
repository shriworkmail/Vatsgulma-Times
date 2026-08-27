import React, { useRef, useEffect, useState, useCallback } from 'react';
import { PageData, SnipRegion, NewsSection } from '../types';
import { 
  ChevronLeft, 
  ChevronRight, 
  Loader2, 
  Scissors, 
  FileText, 
  Hand,
  Eye
} from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';

interface PdfViewerContainerProps {
  currentPageData: PageData | undefined;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomReset: () => void;
  pdfDataUrl?: string;
  editionDate: string;
  editionTitle: string;
  isSnipMode: boolean;
  onFinishSnip: (croppedDataUrl: string) => void;
  onCancelSnip: () => void;
  fitMode: 'screen' | 'width' | 'original';
  onToggleFitMode: () => void;
  isPanMode: boolean;
  onTogglePanMode: () => void;
  sections?: NewsSection[];
  onSelectSection?: (section: NewsSection) => void;
  onScrollStateChange?: (isScrolled: boolean) => void;
}

export function PdfViewerContainer({
  currentPage,
  totalPages,
  onPageChange,
  zoom,
  pdfDataUrl,
  editionDate,
  editionTitle = 'वत्सगुल्म टाईम्स',
  isSnipMode,
  onFinishSnip,
  onCancelSnip,
  fitMode,
  isPanMode,
  sections = [],
  onSelectSection,
  onScrollStateChange,
}: PdfViewerContainerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const renderTaskRef = useRef<any>(null);
  const pdfDocCacheRef = useRef<{ dataUrl: string; doc: any } | null>(null);
  const prevPageRef = useRef<number>(currentPage);
  const [flipDirection, setFlipDirection] = useState<'forward' | 'backward' | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [containerDimensions, setContainerDimensions] = useState<{ width: number; height: number }>({ width: 800, height: 600 });

  // Snip selection state
  const [isSelecting, setIsSelecting] = useState(false);
  const [startPos, setStartPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [snipBox, setSnipBox] = useState<SnipRegion | null>(null);

  // Hand Pan Drag state
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const [panStart, setPanStart] = useState<{ x: number; y: number; scrollLeft: number; scrollTop: number }>({
    x: 0,
    y: 0,
    scrollLeft: 0,
    scrollTop: 0,
  });

  // Track exact canvas display dimensions for pixel-perfect hotspot alignment
  const [canvasDisplaySize, setCanvasDisplaySize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });

  // Filter enabled interactive sections for the current page (normalize pageNumber comparison)
  const activeSections = (sections || []).filter(
    (s) => Number(s.pageNumber) === Number(currentPage) && s.enabled !== false
  );

  // Measure container dimensions for full-page layout
  useEffect(() => {
    if (!containerRef.current) return;
    
    const updateSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          setContainerDimensions({ width: rect.width, height: rect.height });
        }
      }
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(containerRef.current);

    window.addEventListener('resize', updateSize);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateSize);
    };
  }, []);

  // Trigger Slide Animation on Page Change
  useEffect(() => {
    if (prevPageRef.current !== currentPage) {
      const direction = currentPage > prevPageRef.current ? 'forward' : 'backward';
      setFlipDirection(direction);
      prevPageRef.current = currentPage;

      const timer = setTimeout(() => {
        setFlipDirection(null);
      }, 300);

      return () => clearTimeout(timer);
    }
  }, [currentPage]);

  // Reset scroll to top when page changes
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
    }
  }, [currentPage]);

  // Render the page whenever page, pdfDataUrl, zoom, or container size changes
  useEffect(() => {
    if (!pdfDataUrl) {
      setIsLoading(false);
      return;
    }

    let isCancelled = false;
    setIsLoading(true);
    setErrorMessage(null);
    setSnipBox(null);

    // Cancel any previous render in progress before starting a new one
    if (renderTaskRef.current) {
      try {
        renderTaskRef.current.cancel();
      } catch {
        // ignore cancellation error
      }
      renderTaskRef.current = null;
    }

    const render = async () => {
      try {
        if (!canvasRef.current || !containerRef.current) return;
        const canvas = canvasRef.current;

        // 1. Get or load PDF document (cached)
        let pdf = pdfDocCacheRef.current?.dataUrl === pdfDataUrl ? pdfDocCacheRef.current.doc : null;
        
        if (!pdf) {
          let loadingTask;
          if (pdfDataUrl.startsWith('data:')) {
            const base64Data = pdfDataUrl.split(',')[1];
            const binaryString = atob(base64Data);
            const len = binaryString.length;
            const bytes = new Uint8Array(len);
            for (let i = 0; i < len; i++) {
              bytes[i] = binaryString.charCodeAt(i);
            }
            loadingTask = pdfjsLib.getDocument({
              data: bytes.buffer,
              cMapUrl: 'https://unpkg.com/pdfjs-dist@4.10.38/cmaps/',
              cMapPacked: true,
            });
          } else {
            // Blob URL or HTTP Google Drive link
            loadingTask = pdfjsLib.getDocument({
              url: pdfDataUrl,
              cMapUrl: 'https://unpkg.com/pdfjs-dist@4.10.38/cmaps/',
              cMapPacked: true,
            });
          }

          pdf = await loadingTask.promise;
          if (isCancelled) return;
          pdfDocCacheRef.current = { dataUrl: pdfDataUrl, doc: pdf };
        }

        const page = await pdf.getPage(currentPage);
        if (isCancelled) return;
        
        const unscaledViewport = page.getViewport({ scale: 1.0 });

        // 2. Calculate Scale: Full page edge-to-edge full-screen calculation
        const isMobile = window.innerWidth < 640;
        const paddingX = isMobile ? 2 : 4;
        const paddingY = isMobile ? 2 : 4;
        const availWidth = Math.max(280, containerDimensions.width - paddingX);
        const availHeight = Math.max(280, containerDimensions.height - paddingY);

        let calculatedScale = 1.0;
        if (fitMode === 'screen') {
          // On mobile screens, fit to width for natural full-screen readability; on desktop, fit full page in viewport
          if (isMobile) {
            calculatedScale = availWidth / unscaledViewport.width;
          } else {
            calculatedScale = Math.min(availWidth / unscaledViewport.width, availHeight / unscaledViewport.height);
          }
        } else if (fitMode === 'width') {
          // Fit to full width for reading columns
          calculatedScale = availWidth / unscaledViewport.width;
        } else {
          // 'original': Keep PDF rendered in original natural 1:1 scale
          calculatedScale = 1.0;
        }

        // Apply user zoom modifier
        const finalScale = Math.max(0.3, calculatedScale * zoom);

        // Render high-DPI crisp vector canvas
        const dpr = window.devicePixelRatio || 1;
        const renderScale = finalScale * (dpr > 1 ? 1.5 : 1.25);
        const viewport = page.getViewport({ scale: renderScale });

        const context = canvas.getContext('2d', { alpha: false });
        if (!context) throw new Error('Canvas context not available');

        canvas.width = viewport.width;
        canvas.height = viewport.height;
        
        // CSS display size (seamless full page display size)
        const displayWidth = viewport.width / (dpr > 1 ? 1.5 : 1.25);
        const displayHeight = viewport.height / (dpr > 1 ? 1.5 : 1.25);
        canvas.style.width = `${Math.round(displayWidth)}px`;
        canvas.style.height = `${Math.round(displayHeight)}px`;
        setCanvasDisplaySize({ width: Math.round(displayWidth), height: Math.round(displayHeight) });

        if (isCancelled) return;

        // Cancel any lingering task on this canvas before starting render
        if (renderTaskRef.current) {
          try {
            renderTaskRef.current.cancel();
          } catch {}
          renderTaskRef.current = null;
        }

        // Render PDF directly and track the active renderTask
        // @ts-ignore
        const renderTask = page.render({
          canvasContext: context,
          viewport: viewport,
        });
        renderTaskRef.current = renderTask;

        await renderTask.promise;
        renderTaskRef.current = null;

        if (!isCancelled) {
          setIsLoading(false);

          // Background Pre-fetch adjacent pages (next and prev) for instant flipping
          setTimeout(async () => {
            try {
              if (pdf && currentPage < totalPages) {
                await pdf.getPage(currentPage + 1);
              }
              if (pdf && currentPage > 1) {
                await pdf.getPage(currentPage - 1);
              }
            } catch {
              // silent prefetch catch
            }
          }, 100);
        }
      } catch (err: any) {
        // Silently handle cancelled renders
        const isCancelledError = 
          err?.name === 'RenderingCancelledException' || 
          err?.message?.includes('cancelled') || 
          err?.message?.includes('canceled') || 
          isCancelled;

        if (!isCancelledError) {
          console.error('Render error:', err);
          setErrorMessage('ई-पेपर पृष्ठ लोड करताना अडचण आली. कृपया पुन्हा प्रयत्न करा.');
          setIsLoading(false);
        }
      }
    };

    render();

    return () => {
      isCancelled = true;
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
        } catch {}
        renderTaskRef.current = null;
      }
    };
  }, [currentPage, pdfDataUrl, zoom, fitMode, containerDimensions, totalPages]);

  // Combined Mouse Down: Snip Tool OR Hand Pan Tool OR Default Drag
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    // 1. Snip Tool Mode
    if (isSnipMode && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
      const y = Math.max(0, Math.min(e.clientY - rect.top, rect.height));

      setIsSelecting(true);
      setStartPos({ x, y });
      setSnipBox({ x, y, width: 0, height: 0 });
      return;
    }

    // 2. Hand Pan Mode OR when zoomed in (allows panning paper)
    if (containerRef.current && (isPanMode || zoom > 1.05 || fitMode === 'width')) {
      setIsPanning(true);
      setPanStart({
        x: e.clientX,
        y: e.clientY,
        scrollLeft: containerRef.current.scrollLeft,
        scrollTop: containerRef.current.scrollTop,
      });
    }
  };

  // Combined Mouse Move
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    // 1. Snip Tool Mode
    if (isSnipMode && isSelecting && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const currentX = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
      const currentY = Math.max(0, Math.min(e.clientY - rect.top, rect.height));

      const x = Math.min(startPos.x, currentX);
      const y = Math.min(startPos.y, currentY);
      const width = Math.abs(currentX - startPos.x);
      const height = Math.abs(currentY - startPos.y);

      setSnipBox({ x, y, width, height });
      return;
    }

    // 2. Hand Pan Dragging: moves paper smoothly
    if (isPanning && containerRef.current) {
      const dx = e.clientX - panStart.x;
      const dy = e.clientY - panStart.y;
      containerRef.current.scrollLeft = panStart.scrollLeft - dx;
      containerRef.current.scrollTop = panStart.scrollTop - dy;
    }
  };

  // Combined Mouse Up / Leave
  const handleMouseUp = () => {
    if (isSnipMode && isSelecting) {
      setIsSelecting(false);
    }
    if (isPanning) {
      setIsPanning(false);
    }
  };

  const executeSnip = useCallback(() => {
    if (!snipBox || !canvasRef.current || snipBox.width < 20 || snipBox.height < 20) {
      alert('कृपया बातमीचा किंवा जाहिरातीचा योग्य भाग निवडा.');
      return;
    }

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const cropCanvas = document.createElement('canvas');
    const brandingHeaderHeight = 44;
    const brandingFooterHeight = 32;
    cropCanvas.width = snipBox.width * scaleX;
    cropCanvas.height = snipBox.height * scaleY + brandingHeaderHeight + brandingFooterHeight;

    const ctx = cropCanvas.getContext('2d');
    if (ctx) {
      // 1. Top Header Banner on Snippet: Dark Red
      ctx.fillStyle = '#8B0000';
      ctx.fillRect(0, 0, cropCanvas.width, brandingHeaderHeight);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 20px "Noto Sans Devanagari", sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(editionTitle, 12, 28);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px "Noto Sans Devanagari", sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(`वाशीम आवृत्ती • ${editionDate}`, cropCanvas.width - 12, 28);

      // 2. Draw cropped newspaper body
      ctx.drawImage(
        canvas,
        snipBox.x * scaleX,
        snipBox.y * scaleY,
        snipBox.width * scaleX,
        snipBox.height * scaleY,
        0,
        brandingHeaderHeight,
        snipBox.width * scaleX,
        snipBox.height * scaleY
      );

      // 3. Bottom Footer Imprint on Snippet: Navy Blue
      const footerY = brandingHeaderHeight + snipBox.height * scaleY;
      ctx.fillStyle = '#0B2240';
      ctx.fillRect(0, footerY, cropCanvas.width, brandingFooterHeight);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px "Noto Sans Devanagari", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Title Code: MAHMAR49870 | मुख्य संपादक: प्रा. राम धनगर | ई-पेपर कात्रण', cropCanvas.width / 2, footerY + 20);

      const croppedData = cropCanvas.toDataURL('image/jpeg', 0.95);
      onFinishSnip(croppedData);
    }
  }, [snipBox, editionDate, editionTitle, onFinishSnip]);

  // Determine active cursor
  const getCursorClass = () => {
    if (isSnipMode) return 'cursor-crosshair';
    if (isPanMode || zoom > 1.0 || fitMode === 'width') {
      return isPanning ? 'cursor-grabbing' : 'cursor-grab';
    }
    return 'cursor-default';
  };

  // Handle scroll events to reveal footer when user scrolls to site/paper's end
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    // Reveal footer when scroll is near the bottom of the content container
    const isAtBottom = (target.scrollHeight - target.clientHeight <= 20) || (target.scrollTop + target.clientHeight >= target.scrollHeight - 40);
    onScrollStateChange?.(isAtBottom);
  };

  return (
    <div 
      ref={containerRef}
      id="epaper-pdf-container" 
      className={`relative flex-1 bg-[#F8FAFC] border-slate-200 overflow-auto select-none h-full w-full custom-scrollbar ${getCursorClass()}`}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onScroll={handleScroll}
    >
      {/* Article Clipping Banner */}
      {isSnipMode && (
        <div className="sticky top-2 z-40 bg-white text-slate-900 font-bold px-3 py-1.5 rounded-md border-2 border-[#8B0000] shadow-xl flex items-center gap-3 w-max mx-auto mb-2">
          <Scissors className="w-4 h-4 text-[#8B0000]" />
          <span className="text-xs font-marathi-sans">
            माऊसने बातमीचा भाग निवडून कापा (Drag to clip article)
          </span>
          <div className="flex items-center gap-2 ml-1">
            {snipBox && snipBox.width > 20 && (
              <button
                onClick={executeSnip}
                className="px-3 py-0.5 bg-[#8B0000] text-white rounded text-xs font-bold hover:bg-[#700000] transition-colors shadow-xs cursor-pointer"
              >
                कापा (Crop)
              </button>
            )}
            <button
              onClick={onCancelSnip}
              className="px-2 py-0.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded text-xs font-bold transition-colors cursor-pointer"
            >
              रद्द करा
            </button>
          </div>
        </div>
      )}

      {/* Hand Pan Floating Badge indicator when hand mode is enabled */}
      {isPanMode && !isSnipMode && (
        <div className="sticky top-2 z-30 bg-[#0B2240] text-white font-bold px-3 py-1 rounded-full shadow-lg flex items-center gap-2 w-max mx-auto border border-white/20 text-xs pointer-events-none">
          <Hand className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
          <span>हँड टूल सुरू: माऊसने क्लिक करून पेपर हव्या त्या दिशेला सरकवा (Drag to Pan)</span>
        </div>
      )}

      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-slate-900/80 z-20 flex flex-col items-center justify-center gap-2 text-white">
          <Loader2 className="w-8 h-8 text-red-500 animate-spin" />
          <p className="text-sm font-bold font-marathi-sans">
            वत्सगुल्म टाईम्स पृष्ठ {currentPage} लोड होत आहे...
          </p>
        </div>
      )}

      {/* When no PDF is currently loaded: Clean professional newspaper reader placeholder */}
      {!pdfDataUrl && !isLoading && (
        <div className="min-h-full flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white border border-slate-200 rounded-lg p-6 sm:p-8 text-center shadow-md mx-4">
            <div className="w-12 h-12 bg-[#0B2240] text-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-xs">
              <FileText className="w-6 h-6 text-slate-100" />
            </div>

            <h3 className="text-2xl font-bold text-[#8B0000] font-khand mb-1">
              वत्सगुल्म टाईम्स ई-पेपर
            </h3>
            <p className="text-xs text-[#0B2240] font-semibold font-marathi-sans mb-3">
              वाशीम • Title Code: MAHMAR49870
            </p>

            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded text-slate-600 text-xs leading-relaxed font-marathi-sans">
              <p className="font-semibold text-slate-800 mb-1">
                दिनांक: {editionDate || 'आजचा अंक'}
              </p>
              <p>
                या तारखेचा ई-पेपर अंक उपलब्ध नाही. कृपया वरील दिनांक निवडीमधून मागील प्रकाशित अंक निवडा.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Error state */}
      {errorMessage && (
        <div className="min-h-full flex items-center justify-center p-4">
          <div className="bg-red-50 border border-red-200 text-[#8B0000] p-4 rounded my-4 max-w-md text-center">
            <p className="font-bold text-xs">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* Main Full-Page Newspaper Canvas: Attached to left side near thumbnail sidebar */}
      {pdfDataUrl && (
        <div className="w-fit min-w-full min-h-full flex flex-col items-start justify-start pt-2 sm:pt-3 pl-6 sm:pl-10 md:pl-12 pr-4 pb-32 sm:pb-44 select-none">
          <div className="relative flex items-center justify-start">
            {/* Previous Page Arrow: Positioned right beside the left edge of the paper */}
            <button
              onClick={() => onPageChange(Math.max(1, currentPage - 1))}
              disabled={currentPage <= 1}
              id="paper-adjacent-prev-btn"
              className="absolute -left-3.5 sm:-left-6 md:-left-9 top-1/2 -translate-y-1/2 z-30 p-1.5 sm:p-2.5 bg-[#0B2240] hover:bg-[#07182E] text-white rounded-full shadow-2xl disabled:opacity-0 disabled:pointer-events-none transition-all border border-slate-700/60 cursor-pointer hover:scale-110 active:scale-95 flex items-center justify-center"
              title="मागील पान (Previous Page)"
            >
              <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            {/* Slide animated container for the canvas */}
            <div 
              style={canvasDisplaySize.width > 0 ? { width: `${canvasDisplaySize.width}px`, height: `${canvasDisplaySize.height}px` } : undefined}
              className={`relative shadow-2xl p-0 m-0 paper-page-shadow rounded-xs select-none ${
                flipDirection === 'forward' 
                  ? 'animate-page-slide-forward' 
                  : flipDirection === 'backward' 
                    ? 'animate-page-slide-backward' 
                    : ''
              }`}
            >
              {/* Canvas for Full Page Newspaper Render */}
              <canvas
                ref={canvasRef}
                id="epaper-render-canvas"
                className="bg-white block max-w-none shadow-2xl p-0 m-0 paper-page-shadow rounded-xs"
              />

              {/* Interactive PDF News Sections Hotspots (Reader Side - Clean highlight on hover/click only) */}
              {!isSnipMode && (
                <>
                  {/* SVG Overlay for Freestyle & Polygon Hotspots */}
                  <svg
                    className="absolute inset-0 w-full h-full pointer-events-none z-25"
                    style={canvasDisplaySize.width > 0 ? { width: `${canvasDisplaySize.width}px`, height: `${canvasDisplaySize.height}px` } : undefined}
                  >
                    {activeSections.map((sec) => {
                      const isPolygon = (sec.shapeType === 'polygon' || sec.shapeType === 'freestyle') && sec.polygonPoints && sec.polygonPoints.length > 2;
                      if (!isPolygon || !sec.polygonPoints) return null;

                      const pdfW = sec.pdfWidth > 0 ? sec.pdfWidth : 1000;
                      const pdfH = sec.pdfHeight > 0 ? sec.pdfHeight : 1400;
                      const scaleX = (canvasDisplaySize.width || 800) / pdfW;
                      const scaleY = (canvasDisplaySize.height || 1130) / pdfH;
                      const ptsString = sec.polygonPoints.map((p) => `${p.x * scaleX},${p.y * scaleY}`).join(' ');

                      return (
                        <polygon
                          key={`reader-poly-${sec.id}`}
                          id={`reader-poly-${sec.id}`}
                          points={ptsString}
                          className="pointer-events-auto cursor-pointer fill-transparent hover:fill-red-500/20 active:fill-red-500/35 stroke-transparent hover:stroke-red-500/90 active:stroke-red-600 stroke-2 transition-all duration-150 select-none"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onSelectSection?.(sec);
                          }}
                          onMouseDown={(e) => e.stopPropagation()}
                          onTouchStart={(e) => e.stopPropagation()}
                        >
                          <title>{sec.title ? `${sec.title} - वाचण्यासाठी क्लिक करा` : 'वाचण्यासाठी क्लिक करा'}</title>
                        </polygon>
                      );
                    })}
                  </svg>

                  {/* HTML Box Overlay for Standard Rectangle Hotspots */}
                  {activeSections.map((sec) => {
                    const isPolygon = (sec.shapeType === 'polygon' || sec.shapeType === 'freestyle') && sec.polygonPoints && sec.polygonPoints.length > 2;
                    if (isPolygon) return null;

                    const pdfW = sec.pdfWidth > 0 ? sec.pdfWidth : (canvasDisplaySize.width || 1000);
                    const pdfH = sec.pdfHeight > 0 ? sec.pdfHeight : (canvasDisplaySize.height || 1400);
                    const leftPercent = (sec.x / pdfW) * 100;
                    const topPercent = (sec.y / pdfH) * 100;
                    const widthPercent = (sec.width / pdfW) * 100;
                    const heightPercent = (sec.height / pdfH) * 100;

                    return (
                      <div
                        key={sec.id}
                        id={`reader-hotspot-${sec.id}`}
                        style={{
                          left: `${leftPercent}%`,
                          top: `${topPercent}%`,
                          width: `${widthPercent}%`,
                          height: `${heightPercent}%`,
                        }}
                        className="absolute transition-all duration-150 rounded-xs cursor-pointer border-2 border-transparent hover:border-red-500/85 hover:bg-red-500/20 active:border-red-600 active:bg-red-500/35 hover:ring-2 hover:ring-red-400/40 hover:shadow-md focus:outline-hidden z-25 select-none"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          onSelectSection?.(sec);
                        }}
                        onMouseDown={(e) => {
                          e.stopPropagation();
                        }}
                        onTouchStart={(e) => {
                          e.stopPropagation();
                        }}
                        title={sec.title ? `${sec.title} - वाचण्यासाठी क्लिक करा` : undefined}
                      />
                    );
                  })}
                </>
              )}

              {/* Snip Selection Highlight Overlay Box */}
              {isSnipMode && snipBox && (
                <div
                  className="absolute border-2 border-dashed border-[#8B0000] bg-[#8B0000]/15 pointer-events-none"
                  style={{
                    left: `${snipBox.x}px`,
                    top: `${snipBox.y}px`,
                    width: `${snipBox.width}px`,
                    height: `${snipBox.height}px`,
                  }}
                >
                  <div className="absolute -top-5 left-0 bg-[#8B0000] text-white text-[9px] px-1 py-0.2 rounded font-mono font-bold">
                    {Math.round(snipBox.width)} x {Math.round(snipBox.height)}
                  </div>
                </div>
              )}
            </div>

            {/* Next Page Arrow: Positioned right beside the right edge of the paper */}
            <button
              onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage >= totalPages}
              id="paper-adjacent-next-btn"
              className="absolute -right-4 sm:-right-12 top-1/2 -translate-y-1/2 z-30 p-2 sm:p-3 bg-[#0B2240] hover:bg-[#07182E] text-white rounded-full shadow-2xl disabled:opacity-0 disabled:pointer-events-none transition-all border border-slate-700/60 cursor-pointer hover:scale-110 active:scale-95 flex items-center justify-center"
              title="पुढील पान (Next Page)"
            >
              <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          </div>

          {/* Circular Page Numbers below Paper with active page highlighted */}
          {totalPages > 1 && (
            <div 
              style={canvasDisplaySize.width > 0 ? { maxWidth: `${canvasDisplaySize.width}px` } : undefined}
              className="w-full mt-4 mb-4 flex items-center justify-center gap-1.5 sm:gap-2 flex-wrap px-3.5 py-1.5 bg-white rounded-full border border-slate-300 shadow-xs z-20"
            >
              <span className="text-xs font-bold text-slate-500 font-marathi-sans mr-0.5">पृष्ठ:</span>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pgNum) => {
                const isActive = pgNum === currentPage;
                return (
                  <button
                    key={`page-circle-btn-${pgNum}`}
                    id={`page-circle-btn-${pgNum}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onPageChange(pgNum);
                    }}
                    className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs font-bold font-mono transition-all duration-200 cursor-pointer shadow-2xs ${
                      isActive
                        ? 'bg-[#8B0000] text-white ring-2 ring-[#8B0000]/50 scale-110 shadow-sm font-extrabold'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-slate-900 border border-slate-300 hover:scale-105'
                    }`}
                    title={`पृष्ठ क्र. ${pgNum}`}
                  >
                    {pgNum}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

