import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowLeft, 
  ChevronLeft, 
  ChevronRight, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Download, 
  Crosshair, 
  X, 
  Eye, 
  Layers, 
  Share2, 
  Maximize2,
  Minimize2,
  Tag,
  Info,
  Calendar,
  FileText
} from 'lucide-react';
import { Edition, NewsSection } from '../types';

interface AdminEditionReaderProps {
  edition: Edition;
  onClose: () => void;
  onEditHotspots: (edition: Edition) => void;
  onDownloadPdf: (edition: Edition) => void;
  onPreviewSection?: (section: NewsSection) => void;
}

export function AdminEditionReader({
  edition,
  onClose,
  onEditHotspots,
  onDownloadPdf,
  onPreviewSection,
}: AdminEditionReaderProps) {
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [zoom, setZoom] = useState<number>(1.0);
  const [fitMode, setFitMode] = useState<'fit' | 'width'>('fit');
  const [selectedHotspot, setSelectedHotspot] = useState<NewsSection | null>(null);
  const [showHotspots, setShowHotspots] = useState<boolean>(true);
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const [panPosition, setPanPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [startPan, setStartPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const containerRef = useRef<HTMLDivElement | null>(null);
  const pages = edition.pages || [];
  const totalPages = edition.totalPages || pages.length || 1;
  const currentPageData = pages.find((p) => p.pageNumber === currentPage) || pages[0];

  // Hotspots for current page
  const pageHotspots = (edition.sections || []).filter(
    (s) => s.pageNumber === currentPage && s.enabled !== false
  );

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
      if (e.key === 'ArrowLeft') {
        setCurrentPage((p) => Math.max(1, p - 1));
      } else if (e.key === 'ArrowRight') {
        setCurrentPage((p) => Math.min(totalPages, p + 1));
      } else if (e.key === '+' || e.key === '=') {
        setZoom((z) => Math.min(3.0, +(z + 0.15).toFixed(2)));
      } else if (e.key === '-') {
        setZoom((z) => Math.max(0.5, +(z - 0.15).toFixed(2)));
      } else if (e.key === '0') {
        setZoom(1.0);
        setPanPosition({ x: 0, y: 0 });
      } else if (e.key === 'Escape') {
        if (selectedHotspot) {
          setSelectedHotspot(null);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [totalPages, onClose, selectedHotspot]);

  // Pan Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom <= 1.0) return;
    setIsPanning(true);
    setStartPan({ x: e.clientX - panPosition.x, y: e.clientY - panPosition.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isPanning || zoom <= 1.0) return;
    setPanPosition({
      x: e.clientX - startPan.x,
      y: e.clientY - startPan.y,
    });
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  const handleHotspotClick = (e: React.MouseEvent, section: NewsSection) => {
    e.stopPropagation();
    setSelectedHotspot(section);
    if (onPreviewSection) {
      onPreviewSection(section);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 text-slate-100 flex flex-col font-inter select-none overflow-hidden">
      
      {/* Top Application Bar */}
      <header className="bg-[#0B2240] border-b-2 border-slate-700 px-4 py-2.5 flex items-center justify-between z-20 shrink-0 shadow-md">
        
        {/* Left: Back to Admin & Edition Info */}
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            id="admin-reader-back-btn"
            className="flex items-center gap-2 px-3 py-1.5 bg-[#8B0000] hover:bg-[#700000] text-white border-2 border-red-950 text-xs font-semibold cursor-pointer transition-all shadow-xs"
            title="Back to Admin Dashboard"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="font-inter">Back to Admin</span>
          </button>

          <div className="h-6 w-px bg-slate-700 hidden sm:block" />

          <div>
            <div className="flex items-center gap-2">
              <span className="font-manrope text-sm sm:text-base font-bold text-white tracking-wide">
                {edition.title}
              </span>
              <span className="bg-cyan-950 text-cyan-300 border border-cyan-700 text-[10px] px-2 py-0.5 font-mono font-semibold">
                {edition.date}
              </span>
              <span className="bg-slate-800 text-slate-300 border border-slate-600 text-[10px] px-2 py-0.5 font-semibold hidden md:inline">
                {edition.editionName}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-inter hidden sm:block">
              In-Admin Live Preview • {totalPages} Pages • {edition.sections?.length || 0} Hotspots
            </p>
          </div>
        </div>

        {/* Center: Page Controls */}
        <div className="flex items-center gap-1.5 bg-slate-900 border-2 border-slate-700 p-1 font-inter">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage <= 1}
            className="p-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-white border border-slate-600 cursor-pointer disabled:cursor-not-allowed"
            title="Previous Page (←)"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="px-2 flex items-center gap-1.5 text-xs font-semibold">
            <span>Page</span>
            <select
              value={currentPage}
              onChange={(e) => setCurrentPage(Number(e.target.value))}
              className="bg-slate-800 text-white text-xs border border-slate-600 px-1 py-0.5 font-mono font-bold cursor-pointer outline-none"
            >
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((num) => (
                <option key={num} value={num}>
                  {num}
                </option>
              ))}
            </select>
            <span className="text-slate-400">/ {totalPages}</span>
          </div>

          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage >= totalPages}
            className="p-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-white border border-slate-600 cursor-pointer disabled:cursor-not-allowed"
            title="Next Page (→)"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Right: Zoom & Tool Actions */}
        <div className="flex items-center gap-1.5 font-inter">
          
          {/* Zoom controls */}
          <div className="hidden lg:flex items-center gap-1 bg-slate-900 border-2 border-slate-700 p-1">
            <button
              onClick={() => setZoom((z) => Math.max(0.5, +(z - 0.15).toFixed(2)))}
              className="p-1 bg-slate-800 hover:bg-slate-700 text-white border border-slate-600 cursor-pointer"
              title="Zoom Out (-)"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-[11px] font-mono font-bold px-1.5 text-cyan-300 w-12 text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => setZoom((z) => Math.min(3.0, +(z + 0.15).toFixed(2)))}
              className="p-1 bg-slate-800 hover:bg-slate-700 text-white border border-slate-600 cursor-pointer"
              title="Zoom In (+)"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => {
                setZoom(1.0);
                setPanPosition({ x: 0, y: 0 });
              }}
              className="p-1 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-600 cursor-pointer"
              title="Reset Zoom (0)"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Toggle Hotspots */}
          <button
            onClick={() => setShowHotspots((prev) => !prev)}
            className={`px-2.5 py-1.5 border-2 text-xs font-semibold flex items-center gap-1.5 cursor-pointer ${
              showHotspots 
                ? 'bg-blue-900 text-blue-200 border-blue-500' 
                : 'bg-slate-800 text-slate-400 border-slate-600'
            }`}
            title="Toggle News Section Hotspots"
          >
            <Crosshair className="w-3.5 h-3.5" />
            <span className="hidden xl:inline">Hotspots ({pageHotspots.length})</span>
          </button>

          {/* Edit Hotspots in Section Editor */}
          <button
            onClick={() => onEditHotspots(edition)}
            className="px-2.5 py-1.5 bg-blue-700 hover:bg-blue-800 text-white border-2 border-blue-900 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
            title="Open Hotspot Editor"
          >
            <Layers className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Edit Hotspots</span>
          </button>

          {/* Download PDF */}
          <button
            onClick={() => onDownloadPdf(edition)}
            className="p-1.5 sm:px-2.5 sm:py-1.5 bg-slate-800 hover:bg-slate-700 text-white border-2 border-slate-600 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
            title="Download PDF"
          >
            <Download className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Download</span>
          </button>

          {/* Close Viewer */}
          <button
            onClick={onClose}
            className="p-1.5 bg-slate-800 hover:bg-red-900 text-slate-300 hover:text-white border-2 border-slate-600 cursor-pointer"
            title="Close Preview (Esc)"
          >
            <X className="w-4 h-4" />
          </button>

        </div>
      </header>

      {/* Main Newspaper Canvas Workspace */}
      <div 
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        className={`flex-1 relative overflow-auto bg-slate-900 flex items-center justify-center p-2 sm:p-4 ${
          zoom > 1.0 ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'
        }`}
      >
        {currentPageData ? (
          <div 
            className="relative shadow-2xl bg-white transition-transform duration-100 ease-out border border-slate-700 origin-center"
            style={{
              transform: `translate(${panPosition.x}px, ${panPosition.y}px) scale(${zoom})`,
              maxWidth: fitMode === 'fit' ? '92vw' : '100%',
              maxHeight: fitMode === 'fit' ? 'calc(100vh - 170px)' : 'none',
            }}
          >
            {/* Page Newspaper Image */}
            <img
              src={currentPageData.fullPageUrl || currentPageData.thumbnailUrl}
              alt={`Vatsagulma Times Page ${currentPage}`}
              className="w-auto h-auto max-h-[calc(100vh-170px)] object-contain select-none block pointer-events-none"
              draggable={false}
            />

            {/* Render Hotspot Overlays */}
            {showHotspots && (
              <>
                {/* SVG Layer for Polygon / Freestyle Hotspots */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none z-10" viewBox="0 0 100 100" preserveAspectRatio="none">
                  {pageHotspots.map((section) => {
                    const isPolygon = (section.shapeType === 'polygon' || section.shapeType === 'freestyle') && section.polygonPoints && section.polygonPoints.length > 2;
                    if (!isPolygon || !section.polygonPoints) return null;

                    const pdfW = section.pdfWidth > 0 ? section.pdfWidth : 1000;
                    const pdfH = section.pdfHeight > 0 ? section.pdfHeight : 1400;
                    const ptsString = section.polygonPoints
                      .map((p) => `${(p.x / pdfW) * 100},${(p.y / pdfH) * 100}`)
                      .join(' ');
                    const isSelected = selectedHotspot?.id === section.id;

                    return (
                      <polygon
                        key={`admin-poly-${section.id}`}
                        points={ptsString}
                        onClick={(e) => handleHotspotClick(e, section)}
                        className={`pointer-events-auto cursor-pointer transition-all ${
                          isSelected
                            ? 'fill-red-500/35 stroke-red-500 stroke-[0.6]'
                            : 'fill-emerald-500/20 hover:fill-emerald-500/35 stroke-emerald-500 stroke-[0.4] hover:stroke-[0.6]'
                        }`}
                      >
                        <title>{section.title ? `${section.title} (${section.category})` : 'बातमी'}</title>
                      </polygon>
                    );
                  })}
                </svg>

                {/* HTML Boxes for Rectangles and badges */}
                {pageHotspots.map((section) => {
                  const isPolygon = (section.shapeType === 'polygon' || section.shapeType === 'freestyle') && section.polygonPoints && section.polygonPoints.length > 2;
                  const pdfW = section.pdfWidth > 0 ? section.pdfWidth : 1000;
                  const pdfH = section.pdfHeight > 0 ? section.pdfHeight : 1400;
                  const leftPercent = (section.x / pdfW) * 100;
                  const topPercent = (section.y / pdfH) * 100;
                  const widthPercent = (section.width / pdfW) * 100;
                  const heightPercent = (section.height / pdfH) * 100;
                  const isSelected = selectedHotspot?.id === section.id;

                  if (isPolygon) {
                    return (
                      <div
                        key={section.id}
                        style={{
                          left: `${leftPercent}%`,
                          top: `${topPercent}%`,
                        }}
                        className="absolute pointer-events-none z-15"
                      >
                        <div className="bg-[#0B2240] text-emerald-300 text-[9px] font-bold px-1.5 py-0.5 border border-emerald-400 max-w-full truncate shadow-xs">
                          {section.category || 'बहुभुज'}
                        </div>
                      </div>
                    );
                  }
                  
                  return (
                    <div
                      key={section.id}
                      onClick={(e) => handleHotspotClick(e, section)}
                      className={`absolute border-2 transition-all cursor-pointer group z-10 ${
                        isSelected
                          ? 'border-red-600 bg-red-500/30 ring-2 ring-red-400'
                          : 'border-blue-600/70 hover:border-blue-500 bg-blue-500/15 hover:bg-blue-500/25'
                      }`}
                      style={{
                        left: `${leftPercent}%`,
                        top: `${topPercent}%`,
                        width: `${widthPercent}%`,
                        height: `${heightPercent}%`,
                      }}
                      title={section.title || 'Click to view article hotspot'}
                    >
                      {/* Category Tag Header on Hotspot */}
                      <div className="absolute top-0 left-0 bg-[#0B2240] text-white text-[9px] font-bold px-1.5 py-0.5 border border-blue-400 max-w-full truncate shadow-xs">
                        {section.category || 'बातमी'}
                      </div>

                      {/* Hover Tag */}
                      <div className="hidden group-hover:flex absolute bottom-0 left-0 right-0 bg-slate-900/90 text-white text-[10px] p-1 font-semibold truncate items-center gap-1">
                        <Eye className="w-3 h-3 text-cyan-300 shrink-0" />
                        <span className="truncate">{section.title}</span>
                      </div>
                    </div>
                  );
                })}
              </>
            )}

          </div>
        ) : (
          <div className="text-center p-8 border-2 border-dashed border-slate-700 max-w-md">
            <FileText className="w-12 h-12 text-slate-500 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-300">Page Not Available</h3>
            <p className="text-xs text-slate-500 mt-1">This edition does not contain rendered page preview images.</p>
          </div>
        )}
      </div>

      {/* Selected Hotspot Quick Inspection Drawer (if clicked) */}
      {selectedHotspot && (
        <div className="bg-[#0B2240] border-t-2 border-slate-700 p-3 flex items-center justify-between z-30 shrink-0 font-inter">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#8B0000] text-white border border-red-500/50">
              <Crosshair className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white font-manrope">{selectedHotspot.title}</span>
                <span className="bg-blue-900 text-blue-200 text-[10px] px-2 py-0.2 border border-blue-400">
                  {selectedHotspot.category}
                </span>
                <span className="text-[10px] text-slate-400">Page {selectedHotspot.pageNumber}</span>
              </div>
              {selectedHotspot.description && (
                <p className="text-[11px] text-slate-300 line-clamp-1 mt-0.5">{selectedHotspot.description}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onEditHotspots(edition)}
              className="px-2.5 py-1 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold border border-blue-900 cursor-pointer"
            >
              Edit in Hotspot Editor
            </button>
            <button
              onClick={() => setSelectedHotspot(null)}
              className="p-1 text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Bottom Page Thumbnails Bar */}
      <footer className="bg-slate-950 border-t-2 border-slate-800 px-3 py-2 flex items-center gap-2 overflow-x-auto shrink-0 z-20 font-inter">
        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-1 flex items-center gap-1">
          <Layers className="w-3.5 h-3.5 text-amber-400" />
          <span>Pages ({totalPages})</span>
        </div>

        <div className="flex items-center gap-2">
          {pages.map((p) => {
            const isCurrent = p.pageNumber === currentPage;
            const hotspotsCount = (edition.sections || []).filter((s) => s.pageNumber === p.pageNumber).length;
            
            return (
              <button
                key={p.pageNumber}
                onClick={() => {
                  setCurrentPage(p.pageNumber);
                  setSelectedHotspot(null);
                }}
                className={`relative shrink-0 border-2 transition-all p-0.5 flex flex-col items-center cursor-pointer ${
                  isCurrent
                    ? 'border-cyan-400 bg-cyan-950/60 ring-1 ring-cyan-400'
                    : 'border-slate-700 bg-slate-900 hover:border-slate-500 opacity-70 hover:opacity-100'
                }`}
                title={`Page ${p.pageNumber} (${hotspotsCount} hotspots)`}
              >
                <div className="w-10 h-13 overflow-hidden bg-white flex items-center justify-center">
                  <img
                    src={p.thumbnailUrl || p.fullPageUrl}
                    alt={`Page ${p.pageNumber}`}
                    className="w-full h-full object-cover pointer-events-none"
                  />
                </div>
                <div className="text-[10px] font-bold text-slate-200 mt-0.5 flex items-center gap-1">
                  <span>P.{p.pageNumber}</span>
                  {hotspotsCount > 0 && (
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </footer>

    </div>
  );
}
