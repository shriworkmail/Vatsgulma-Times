import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  X, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Download, 
  Share2, 
  Loader2, 
  Maximize, 
  Minimize, 
  Printer, 
  Sparkles,
  Layers,
  Tag,
  Check
} from 'lucide-react';
import { NewsSection } from '../types';
import { renderPdfSectionHighRes } from '../services/pdfService';

interface SectionViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  section: NewsSection | null;
  pdfDataUrl?: string;
  pageImageUrl?: string;
  editionDate: string;
  editionTitle?: string;
}

// Helper to compose high-resolution branded newspaper clipping for download
async function createBrandedArticleImage(
  imageSrc: string,
  paperName: string,
  pageNumber: number,
  editionDate: string,
  category?: string
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const cropW = img.naturalWidth || img.width;
        const cropH = img.naturalHeight || img.height;

        // Base responsive scaling factor relative to 800px standard width
        const scale = Math.max(0.8, Math.min(3.5, cropW / 700));

        const padX = Math.round(18 * scale);
        const headerH = Math.round(68 * scale);
        const footerH = Math.round(44 * scale);
        const borderWidth = Math.max(3, Math.round(4 * scale));

        const canvasW = cropW + padX * 2 + borderWidth * 2;
        const canvasH = cropH + headerH + footerH + borderWidth * 2 + Math.round(16 * scale);

        const canvas = document.createElement('canvas');
        canvas.width = canvasW;
        canvas.height = canvasH;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(imageSrc);
          return;
        }

        // 1. Clean White Card Canvas Background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvasW, canvasH);

        // 2. Top Header - Newspaper Masthead (Centered)
        ctx.textAlign = 'center';
        ctx.fillStyle = '#8B0000'; // Dark Red
        ctx.font = `bold ${Math.round(28 * scale)}px 'Khand', 'Noto Sans Devanagari', 'Mukta', Arial, sans-serif`;
        ctx.textBaseline = 'top';
        ctx.fillText(paperName || 'वत्सगुल्म टाईम्स', canvasW / 2, Math.round(8 * scale));

        // Subtitle / Tagline centered below paper name
        ctx.fillStyle = '#475569';
        ctx.font = `${Math.round(11 * scale)}px 'Noto Sans Devanagari', Arial, sans-serif`;
        const tagline = 'आपली संस्कृती, आपला वसा ! • डिजिटल ई-पेपर आवृत्ती';
        ctx.fillText(tagline, canvasW / 2, Math.round(42 * scale));

        // Category Tag on top right if present
        if (category) {
          ctx.textAlign = 'right';
          ctx.fillStyle = '#8B0000';
          ctx.font = `bold ${Math.round(11 * scale)}px 'Noto Sans Devanagari', Arial, sans-serif`;
          ctx.fillText(`[ ${category} ]`, canvasW - padX, Math.round(14 * scale));
        }
        ctx.textAlign = 'left';

        // Header Divider Line (Dark Red)
        ctx.strokeStyle = '#8B0000';
        ctx.lineWidth = Math.max(2, Math.round(2 * scale));
        ctx.beginPath();
        ctx.moveTo(padX, headerH - Math.round(4 * scale));
        ctx.lineTo(canvasW - padX, headerH - Math.round(4 * scale));
        ctx.stroke();

        // 3. Image with Dark Red Border
        const imgX = padX;
        const imgY = headerH + Math.round(6 * scale);

        // Draw Dark Red Border Box
        ctx.fillStyle = '#8B0000';
        ctx.fillRect(imgX, imgY, cropW + borderWidth * 2, cropH + borderWidth * 2);

        // Draw Cropped Article Image inside
        ctx.drawImage(img, imgX + borderWidth, imgY + borderWidth, cropW, cropH);

        // 4. Footer Strip Below Image
        const footerY = imgY + cropH + borderWidth * 2 + Math.round(10 * scale);

        // Footer top subtle divider
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = Math.max(1, Math.round(1 * scale));
        ctx.beginPath();
        ctx.moveTo(padX, footerY - Math.round(4 * scale));
        ctx.lineTo(canvasW - padX, footerY - Math.round(4 * scale));
        ctx.stroke();

        // Footer text styling
        ctx.fillStyle = '#1e293b';
        ctx.font = `bold ${Math.round(11 * scale)}px 'Noto Sans Devanagari', Arial, sans-serif`;
        ctx.textBaseline = 'top';

        // Left: Date & Page No
        const datePageText = `दिनांक: ${editionDate}  |  पान क्र. ${pageNumber}`;
        ctx.fillText(datePageText, padX, footerY);

        // Center: Website
        ctx.fillStyle = '#8B0000';
        ctx.font = `bold ${Math.round(11 * scale)}px Arial, sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText('www.vatsgulmatimes.in', canvasW / 2, footerY);

        // Right: Powered by Shrinath IT Solutions
        ctx.fillStyle = '#475569';
        ctx.font = `${Math.round(10.5 * scale)}px Arial, sans-serif`;
        ctx.textAlign = 'right';
        ctx.fillText('Powered by Shrinath IT Solutions', canvasW - padX, footerY);

        // Reset textAlign
        ctx.textAlign = 'left';

        // Export as High-Quality JPEG
        const finalDataUrl = canvas.toDataURL('image/jpeg', 0.96);
        resolve(finalDataUrl);
      } catch (err) {
        console.error('Error creating branded article image:', err);
        resolve(imageSrc);
      }
    };
    img.onerror = () => resolve(imageSrc);
    img.src = imageSrc;
  });
}

export function SectionViewerModal({
  isOpen,
  onClose,
  section,
  pdfDataUrl,
  pageImageUrl,
  editionDate,
  editionTitle = 'वत्सगुल्म टाईम्स',
}: SectionViewerModalProps) {
  const [renderedImageUrl, setRenderedImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isEnhancing, setIsEnhancing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [zoom, setZoom] = useState<number>(1.0);
  const [fitMode, setFitMode] = useState<'screen' | 'width'>('screen');
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [currentRenderScale, setCurrentRenderScale] = useState<number>(2.5);

  // Active render tracking to cancel stale operations and avoid memory leaks
  const activeRenderIdRef = useRef<number>(0);
  const zoomDebounceTimerRef = useRef<any>(null);

  // Pan / Dragging state for zoomed view
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const [panStart, setPanStart] = useState<{ x: number; y: number; scrollLeft: number; scrollTop: number }>({
    x: 0,
    y: 0,
    scrollLeft: 0,
    scrollTop: 0,
  });

  // Touch pinch-to-zoom state for mobile
  const touchStartDistRef = useRef<number | null>(null);
  const touchStartZoomRef = useRef<number>(1.0);

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Clean memory on unmount or close
  useEffect(() => {
    if (!isOpen) {
      if (zoomDebounceTimerRef.current) {
        clearTimeout(zoomDebounceTimerRef.current);
      }
      activeRenderIdRef.current += 1;
      setRenderedImageUrl(null);
      setZoom(1.0);
    }
  }, [isOpen]);

  // Core Lazy Render Function using on-demand PDF.js section extraction
  const executeRender = useCallback(
    async (targetScale: number, isInitial: boolean = false) => {
      if (!section) return;

      const renderId = ++activeRenderIdRef.current;
      if (isInitial) {
        setIsLoading(true);
      } else {
        setIsEnhancing(true);
      }
      setErrorMessage(null);

      try {
        if (pdfDataUrl) {
          // Direct high-resolution rendering from original vector PDF using minimal-memory transform
          const result = await renderPdfSectionHighRes(
            pdfDataUrl,
            section.pageNumber,
            {
              x: section.x,
              y: section.y,
              width: section.width,
              height: section.height,
              pdfWidth: section.pdfWidth,
              pdfHeight: section.pdfHeight,
            },
            targetScale
          );

          if (activeRenderIdRef.current === renderId) {
            setRenderedImageUrl(result.dataUrl);
            setCurrentRenderScale(targetScale);
            setIsLoading(false);
            setIsEnhancing(false);
          }
        } else if (pageImageUrl) {
          // Fallback: Crop from rendered page image
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.src = pageImageUrl;
          await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
          });

          if (activeRenderIdRef.current !== renderId) return;

          const pdfW = (section.pdfWidth && section.pdfWidth > 0) ? section.pdfWidth : (img.naturalWidth || 800);
          const pdfH = (section.pdfHeight && section.pdfHeight > 0) ? section.pdfHeight : (img.naturalHeight || 1130);
          const normX = Math.max(0, Math.min(1, section.x / pdfW));
          const normY = Math.max(0, Math.min(1, section.y / pdfH));
          const normW = Math.max(0.01, Math.min(1 - normX, section.width / pdfW));
          const normH = Math.max(0.01, Math.min(1 - normY, section.height / pdfH));

          const cropCanvas = document.createElement('canvas');
          const cropW = Math.round(normW * img.naturalWidth);
          const cropH = Math.round(normH * img.naturalHeight);
          cropCanvas.width = Math.max(1, cropW);
          cropCanvas.height = Math.max(1, cropH);

          const ctx = cropCanvas.getContext('2d');
          if (ctx) {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, cropCanvas.width, cropCanvas.height);
            ctx.drawImage(
              img,
              Math.round(normX * img.naturalWidth),
              Math.round(normY * img.naturalHeight),
              cropW,
              cropH,
              0,
              0,
              cropCanvas.width,
              cropCanvas.height
            );
            if (activeRenderIdRef.current === renderId) {
              setRenderedImageUrl(cropCanvas.toDataURL('image/jpeg', 0.95));
              setIsLoading(false);
              setIsEnhancing(false);
            }
          }
        } else {
          throw new Error('बातमीचा मजकूर किंवा इमेज डेटा उपलब्ध नाही.');
        }
      } catch (err: any) {
        if (activeRenderIdRef.current === renderId) {
          console.error('High-res section render error:', err);
          setErrorMessage('बातमी भाग उच्च रिझोल्युशनमध्ये लोड करताना त्रुटी आली.');
          setIsLoading(false);
          setIsEnhancing(false);
        }
      }
    },
    [section, pdfDataUrl, pageImageUrl]
  );

  // Initial lazy load on open
  useEffect(() => {
    if (!isOpen || !section) {
      setRenderedImageUrl(null);
      setIsLoading(false);
      return;
    }

    setZoom(1.0);
    setFitMode('screen');
    executeRender(2.5, true);
  }, [isOpen, section?.id, pdfDataUrl, executeRender]);

  // On-demand crisp re-rendering during zoom operations
  useEffect(() => {
    if (!isOpen || !section || !pdfDataUrl || isLoading) return;

    if (zoomDebounceTimerRef.current) {
      clearTimeout(zoomDebounceTimerRef.current);
    }

    // Determine target scale needed for the current zoom level
    // (e.g., base 2.5x scaled up for deep zooms 2.0x - 3.5x)
    let desiredScale = 2.5;
    if (zoom >= 2.0) {
      desiredScale = Math.min(4.5, +(2.2 * zoom).toFixed(1));
    } else if (zoom >= 1.4) {
      desiredScale = 3.2;
    }

    // Only re-render if desired scale is noticeably higher than current rendered scale
    if (desiredScale > currentRenderScale + 0.3) {
      zoomDebounceTimerRef.current = setTimeout(() => {
        executeRender(desiredScale, false);
      }, 250);
    }

    return () => {
      if (zoomDebounceTimerRef.current) {
        clearTimeout(zoomDebounceTimerRef.current);
      }
    };
  }, [zoom, isOpen, section, pdfDataUrl, isLoading, currentRenderScale, executeRender]);

  // Pan Handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current || zoom <= 1.0) return;
    setIsPanning(true);
    setPanStart({
      x: e.clientX,
      y: e.clientY,
      scrollLeft: containerRef.current.scrollLeft,
      scrollTop: containerRef.current.scrollTop,
    });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isPanning || !containerRef.current) return;
    const dx = e.clientX - panStart.x;
    const dy = e.clientY - panStart.y;
    containerRef.current.scrollLeft = panStart.scrollLeft - dx;
    containerRef.current.scrollTop = panStart.scrollTop - dy;
  };

  const handleMouseUp = () => {
    if (isPanning) setIsPanning(false);
  };

  // Mouse wheel zoom support
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY < 0 ? 0.15 : -0.15;
      setZoom((z) => Math.min(3.5, Math.max(0.5, +(z + delta).toFixed(2))));
    }
  };

  // Mobile Touch Pinch Zoom Handlers
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      touchStartDistRef.current = Math.hypot(dx, dy);
      touchStartZoomRef.current = zoom;
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2 && touchStartDistRef.current) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const currentDist = Math.hypot(dx, dy);
      const factor = currentDist / touchStartDistRef.current;
      const newZoom = Math.min(3.5, Math.max(0.6, touchStartZoomRef.current * factor));
      setZoom(+newZoom.toFixed(2));
    }
  };

  const handleTouchEnd = () => {
    touchStartDistRef.current = null;
  };

  // Download high-resolution branded cropped article image
  const handleDownload = async () => {
    if (!renderedImageUrl || !section || isDownloading) return;
    setIsDownloading(true);
    try {
      const brandedImageUrl = await createBrandedArticleImage(
        renderedImageUrl,
        editionTitle || 'वत्सगुल्म टाईम्स',
        section.pageNumber,
        editionDate,
        section.category
      );
      const link = document.createElement('a');
      const safeTitle = section.title.replace(/[^a-zA-Z0-9\u0900-\u097F]/g, '_').slice(0, 30);
      link.download = `${editionTitle}_${safeTitle}_पान_${section.pageNumber}_${editionDate}.jpg`;
      link.href = brandedImageUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Download article error:', err);
    } finally {
      setIsDownloading(false);
    }
  };

  // Share to WhatsApp
  const handleShareWhatsApp = () => {
    if (!section) return;
    const text = encodeURIComponent(
      `📰 *${editionTitle} - वाशीम ई-पेपर*\n` +
      `📌 *${section.title}*\n` +
      `📂 श्रेणी: ${section.category} | पृष्ठ क्र. ${section.pageNumber}\n` +
      `📅 दिनांक: ${editionDate}\n` +
      `🌐 वेबसाईट: www.vatsgulmatimes.in\n` +
      `⚡ Powered by Shrinath IT Solutions\n` +
      `🔗 वाचण्यासाठी येथे क्लिक करा: ${window.location.href}`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  // Copy Link to Section
  const handleCopyLink = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  // Print Article
  const handlePrint = async () => {
    if (!renderedImageUrl || !section) return;
    try {
      const brandedImageUrl = await createBrandedArticleImage(
        renderedImageUrl,
        editionTitle || 'वत्सगुल्म टाईम्स',
        section.pageNumber,
        editionDate,
        section.category
      );
      const printWin = window.open('', '_blank');
      if (!printWin) return;
      printWin.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>${editionTitle} - ${section.title}</title>
            <style>
              body { margin: 0; padding: 20px; font-family: 'Noto Sans Devanagari', sans-serif; text-align: center; background: #ffffff; }
              img { max-width: 100%; height: auto; box-shadow: 0 4px 12px rgba(0,0,0,0.15); border: 2px solid #8B0000; }
            </style>
          </head>
          <body>
            <img src="${brandedImageUrl}" onload="window.print();window.close();" />
          </body>
        </html>
      `);
      printWin.document.close();
    } catch (err) {
      console.error('Print article error:', err);
    }
  };

  if (!isOpen || !section) return null;

  // Category Color Badges
  const getCategoryBadgeClass = (cat: string) => {
    switch (cat) {
      case 'मुख्य बातमी':
        return 'bg-red-600 text-white';
      case 'जिल्हा विशेष':
      case 'जिल्हा बातमी':
        return 'bg-blue-600 text-white';
      case 'संपादकीय':
      case 'अग्रलेख':
        return 'bg-purple-700 text-white';
      case 'क्रीडा':
        return 'bg-emerald-600 text-white';
      case 'जाहिरात':
        return 'bg-amber-500 text-slate-950 font-bold';
      case 'कृषी व व्यापार':
      case 'व्यापार':
        return 'bg-teal-700 text-white';
      case 'मनोरंजन':
        return 'bg-pink-600 text-white';
      default:
        return 'bg-slate-700 text-white';
    }
  };

  return (
    <div 
      id="section-viewer-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xs p-2 sm:p-4 font-marathi-sans select-none animate-in fade-in duration-200"
      onClick={onClose}
    >
      {/* Modal Card */}
      <div 
        className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-5xl h-[92vh] sm:h-[88vh] flex flex-col overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 1. Top Header Bar */}
        <div className="bg-[#0B2240] px-3 sm:px-5 py-2.5 sm:py-3 border-b border-slate-700/80 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <span className={`px-2 py-0.5 rounded text-[11px] sm:text-xs font-bold uppercase tracking-wider shrink-0 flex items-center gap-1 shadow-2xs ${getCategoryBadgeClass(section.category)}`}>
              <Tag className="w-3 h-3" />
              {section.category}
            </span>

            <div className="min-w-0">
              <h2 className="text-white text-sm sm:text-base font-bold truncate leading-tight font-khand tracking-wide">
                {section.title}
              </h2>
              <p className="text-slate-300 text-[11px] sm:text-xs truncate flex items-center gap-2">
                <span>{editionTitle}</span>
                <span>•</span>
                <span>पान क्र. {section.pageNumber}</span>
                <span>•</span>
                <span>{editionDate}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* High-DPI Vector Clarity Indicator */}
            {pdfDataUrl && (
              <span className="hidden md:inline-flex items-center gap-1 text-[11px] bg-amber-400/15 border border-amber-400/30 text-amber-300 px-2 py-0.5 rounded-full font-medium shadow-2xs">
                <Sparkles className="w-3 h-3 text-amber-400" />
                <span>HD वेक्टर स्पष्टता</span>
              </span>
            )}

            {/* Quick Close Button */}
            <button
              onClick={onClose}
              id="close-section-modal-btn"
              className="p-1.5 sm:p-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer shrink-0"
              title="बंद करा (ESC / Close)"
            >
              <X className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          </div>
        </div>

        {/* 2. Secondary Control Toolbar */}
        <div className="bg-slate-800/90 px-3 sm:px-4 py-1.5 border-b border-slate-700 flex items-center justify-between gap-2 shrink-0 text-slate-200 text-xs">
          {/* Zoom & Fit Controls */}
          <div className="flex items-center gap-1 sm:gap-2">
            <button
              onClick={() => setZoom((z) => Math.max(0.5, +(z - 0.2).toFixed(2)))}
              id="section-zoom-out"
              className="p-1 sm:p-1.5 hover:bg-slate-700 rounded text-slate-200 hover:text-white transition-colors cursor-pointer"
              title="झूम कमी करा (-)"
            >
              <ZoomOut className="w-4 h-4" />
            </button>

            <span className="font-mono text-xs font-bold text-amber-400 px-1 min-w-[42px] text-center">
              {Math.round(zoom * 100)}%
            </span>

            <button
              onClick={() => setZoom((z) => Math.min(3.5, +(z + 0.2).toFixed(2)))}
              id="section-zoom-in"
              className="p-1 sm:p-1.5 hover:bg-slate-700 rounded text-slate-200 hover:text-white transition-colors cursor-pointer"
              title="झूम वाढवा (+)"
            >
              <ZoomIn className="w-4 h-4" />
            </button>

            <button
              onClick={() => {
                setZoom(1.0);
                setFitMode('screen');
              }}
              id="section-zoom-reset"
              className="hidden xs:flex items-center gap-1 px-2 py-1 hover:bg-slate-700 rounded text-slate-300 hover:text-white transition-colors cursor-pointer text-xs"
              title="मूळ आकार (100% Reset)"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>१००%</span>
            </button>

            <div className="w-[1px] h-4 bg-slate-600 mx-1 hidden xs:block" />

            <button
              onClick={() => setFitMode((m) => (m === 'screen' ? 'width' : 'screen'))}
              id="section-fit-toggle"
              className="flex items-center gap-1 px-2 py-1 bg-slate-700/60 hover:bg-slate-700 rounded text-slate-200 hover:text-white transition-colors cursor-pointer text-xs"
              title="स्क्रीन किंवा रुंदीमध्ये फिट करा"
            >
              {fitMode === 'screen' ? <Maximize className="w-3.5 h-3.5" /> : <Minimize className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{fitMode === 'screen' ? 'स्क्रीन फिट' : 'रुंदी फिट'}</span>
            </button>

            {isEnhancing && (
              <span className="hidden sm:inline-flex items-center gap-1 text-[10px] text-amber-300 bg-amber-400/10 px-1.5 py-0.5 rounded animate-pulse">
                <Loader2 className="w-3 h-3 animate-spin" />
                <span>HD रिझोल्युशन ऑप्टिमायझेशन...</span>
              </span>
            )}
          </div>

          {/* Action Sharing / Downloading / Printing Buttons */}
          <div className="flex items-center gap-1 sm:gap-2">
            <button
              onClick={handleShareWhatsApp}
              id="section-share-whatsapp"
              className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1 bg-[#25D366] hover:bg-[#1EBE5D] text-white rounded text-xs font-bold transition-colors cursor-pointer shadow-xs"
              title="व्हाट्सअँपवर बातमी शेअर करा"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">शेअर</span>
            </button>

            <button
              onClick={handleDownload}
              id="section-download-btn"
              disabled={!renderedImageUrl || isDownloading}
              className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1 bg-[#8B0000] hover:bg-[#700000] text-white rounded text-xs font-bold transition-colors cursor-pointer shadow-xs disabled:opacity-50"
              title="उच्च दर्जाची बातमी इमेज डाउनलोड करा"
            >
              {isDownloading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              <span className="hidden sm:inline">
                {isDownloading ? 'तयार होत आहे...' : 'डाउनलोड'}
              </span>
            </button>

            <button
              onClick={handlePrint}
              id="section-print-btn"
              disabled={!renderedImageUrl}
              className="p-1 sm:p-1.5 hover:bg-slate-700 rounded text-slate-300 hover:text-white transition-colors cursor-pointer hidden md:flex items-center justify-center"
              title="बातमी प्रिंट करा"
            >
              <Printer className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 3. Main Cropped Article Display Stage */}
        <div 
          ref={containerRef}
          id="section-crop-viewport"
          className={`flex-1 overflow-auto bg-slate-950 flex items-center justify-center p-2 sm:p-4 relative custom-scrollbar ${
            zoom > 1.0 ? (isPanning ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-default'
          }`}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {isLoading && (
            <div className="flex flex-col items-center justify-center gap-3 text-white">
              <Loader2 className="w-10 h-10 text-red-500 animate-spin" />
              <div className="text-center">
                <p className="text-sm font-bold">मूळ पीडीएफमधून उच्च दर्जाची बातमी तयार होत आहे...</p>
                <p className="text-xs text-slate-400 mt-1">High-resolution on-demand vector crop segment from PDF.js</p>
              </div>
            </div>
          )}

          {errorMessage && !isLoading && (
            <div className="bg-red-950/80 border border-red-700 text-red-200 p-4 rounded-xl max-w-md text-center">
              <p className="text-sm font-bold mb-1">{errorMessage}</p>
              <p className="text-xs text-slate-300">कृपया पुन्हा प्रयत्न करा किंवा संपूर्ण पान पहा.</p>
            </div>
          )}

          {renderedImageUrl && !isLoading && (
            <div 
              className="transition-transform duration-100 ease-out origin-center flex items-center justify-center py-2"
              style={{
                transform: `scale(${zoom})`,
              }}
            >
              {/* Newspaper Clipping Branded Card */}
              <div className="relative group shadow-2xl rounded-xs overflow-hidden bg-white border border-slate-300 max-w-full flex flex-col">
                
                {/* 1. Paper Name Header Above Image (Centered) */}
                <div className="bg-white px-3 sm:px-4 py-2 border-b-2 border-[#8B0000] relative flex flex-col items-center justify-center text-center shrink-0">
                  <h1 className="text-[#8B0000] text-xl sm:text-2xl font-bold font-khand leading-none tracking-wide">
                    {editionTitle || 'वत्सगुल्म टाईम्स'}
                  </h1>
                  <p className="text-[10px] sm:text-[11px] text-slate-500 font-marathi-sans mt-0.5">
                    आपली संस्कृती, आपला वसा ! • डिजिटल ई-पेपर आवृत्ती
                  </p>
                  {section.category && (
                    <span className="absolute right-3 top-2 sm:top-2.5 text-[9px] sm:text-[10px] font-bold text-[#8B0000] bg-red-50 border border-red-200 px-1.5 py-0.5 rounded shrink-0">
                      {section.category}
                    </span>
                  )}
                </div>

                {/* 2. Article Image with Dark Red Border */}
                <div className="p-1 sm:p-2 bg-white flex items-center justify-center">
                  <div className="border-3 sm:border-4 border-[#8B0000] overflow-hidden bg-white inline-block shadow-sm">
                    <img 
                      src={renderedImageUrl}
                      alt={section.title}
                      className={`block object-contain select-none max-w-none ${
                        fitMode === 'screen' 
                          ? 'max-h-[56vh] sm:max-h-[58vh] w-auto' 
                          : 'w-[88vw] sm:w-[740px] max-w-none h-auto'
                      }`}
                      referrerPolicy="no-referrer"
                      draggable={false}
                    />
                  </div>
                </div>

                {/* 3. Text Below Image: Date, Page No, Website, Powered By */}
                <div className="bg-slate-50 px-3 sm:px-4 py-2 border-t border-slate-200 text-slate-700 text-[11px] sm:text-xs flex flex-wrap items-center justify-between gap-2 shrink-0 select-text">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-800">
                      दिनांक: <strong className="text-[#8B0000]">{editionDate}</strong>
                    </span>
                    <span className="text-slate-400">•</span>
                    <span className="font-semibold text-slate-800">
                      पान क्र. <strong className="text-[#8B0000]">{section.pageNumber}</strong>
                    </span>
                  </div>

                  <div className="text-center font-bold text-[#8B0000] hover:underline font-english-clean">
                    <a href="https://www.vatsgulmatimes.in" target="_blank" rel="noopener noreferrer">
                      www.vatsgulmatimes.in
                    </a>
                  </div>

                  <div className="text-slate-500 text-[10px] sm:text-[11px] font-english-clean">
                    <span>Powered by </span>
                    <a 
                      href="https://www.shrinathit.in" 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="font-semibold text-slate-700 hover:text-[#8B0000] hover:underline"
                    >
                      Shrinath IT Solutions
                    </a>
                  </div>
                </div>

              </div>
            </div>
          )}
        </div>

        {/* 4. Bottom Description / Footer Strip */}
        <div className="bg-slate-900 px-4 py-2 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px] text-slate-400 shrink-0">
          <div className="truncate">
            {section.description ? (
              <span className="text-slate-300 italic">
                {section.description}
              </span>
            ) : (
              <span>
                {editionTitle} • डिजिटल ई-पेपर उच्च दर्जाचे कात्रण (On-Demand Vector Render)
              </span>
            )}
          </div>
          <div className="text-slate-400 text-right shrink-0">
            झूम करण्यासाठी माउस / पिंच वापरा • बाहेर क्लिक करून बंद करा
          </div>
        </div>

      </div>
    </div>
  );
}
