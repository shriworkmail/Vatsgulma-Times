import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Plus, 
  Trash2, 
  Edit3, 
  Save, 
  Layers, 
  ChevronLeft, 
  ChevronRight, 
  Eye, 
  EyeOff, 
  Check, 
  X, 
  Crosshair, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Tag, 
  Loader2,
  Sliders,
  HelpCircle,
  Hand,
  MousePointer,
  Sparkles,
  PenTool,
  Square,
  Undo2,
  CheckCircle2,
  Shapes,
  Activity
} from 'lucide-react';
import { Edition, NewsSection, NewsPoint } from '../types';
import * as pdfjsLib from 'pdfjs-dist';

interface InteractiveSectionEditorProps {
  edition: Edition;
  onSaveSections: (updatedSections: NewsSection[]) => Promise<void>;
  onClose: () => void;
  onPreviewSection?: (section: NewsSection) => void;
}

const CATEGORY_OPTIONS = [
  'मुख्य बातमी',
  'जिल्हा विशेष',
  'संपादकीय / विचार',
  'कृषी व व्यापार',
  'क्रीडा वार्ता',
  'जाहिरात (Ad)',
  'मनोरंजन',
  'स्थानिक घडामोडी',
  'विशेष लेख',
  'इतर',
];

export type ToolMode = 'draw' | 'polygon' | 'freestyle' | 'select' | 'hand';

export function InteractiveSectionEditor({
  edition,
  onSaveSections,
  onClose,
  onPreviewSection,
}: InteractiveSectionEditorProps) {
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [sections, setSections] = useState<NewsSection[]>(edition.sections || []);
  
  // Tool Modes:
  // 'draw' (Rectangle Box)
  // 'polygon' (Multi-point Polygon / L-shape / Stepped shape)
  // 'freestyle' (Freehand Lasso drawing)
  // 'select' (Select & move vertices / boxes)
  // 'hand' (Pan / move paper)
  const [toolMode, setToolMode] = useState<ToolMode>('draw');
  const [isSpacePressed, setIsSpacePressed] = useState<boolean>(false);

  // Rectangle Drawing state
  const [isDrawingRect, setIsDrawingRect] = useState<boolean>(false);
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null);
  const [currentDrawBox, setCurrentDrawBox] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  
  // Polygon Mapping state (Canvas display coords)
  const [polygonPoints, setPolygonPoints] = useState<{ x: number; y: number }[]>([]);
  const [currentCursorPos, setCurrentCursorPos] = useState<{ x: number; y: number } | null>(null);

  // Freestyle Drawing state (Canvas display coords)
  const [isDrawingFreestyle, setIsDrawingFreestyle] = useState<boolean>(false);
  const [freestylePoints, setFreestylePoints] = useState<{ x: number; y: number }[]>([]);

  // Hand Panning state
  const [isStagePanning, setIsStagePanning] = useState<boolean>(false);
  const [panStart, setPanStart] = useState<{ x: number; y: number; scrollLeft: number; scrollTop: number }>({
    x: 0,
    y: 0,
    scrollLeft: 0,
    scrollTop: 0,
  });

  // Active selected section in editor
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [isSectionModalOpen, setIsSectionModalOpen] = useState<boolean>(false);
  const [editingSection, setEditingSection] = useState<NewsSection | null>(null);

  // Moving / Resizing states
  const [dragAction, setDragAction] = useState<'move' | 'nw' | 'ne' | 'se' | 'sw' | 'vertex' | null>(null);
  const [dragVertexIndex, setDragVertexIndex] = useState<number | null>(null);
  const [dragStartPos, setDragStartPos] = useState<{ x: number; y: number } | null>(null);
  const [dragInitialSection, setDragInitialSection] = useState<NewsSection | null>(null);

  // Form Fields for new / edited section
  const [formTitle, setFormTitle] = useState<string>('');
  const [formCategory, setFormCategory] = useState<string>('मुख्य बातमी');
  const [formCustomCategory, setFormCustomCategory] = useState<string>('');
  const [formDescription, setFormDescription] = useState<string>('');
  const [formEnabled, setFormEnabled] = useState<boolean>(true);

  // Canvas and PDF info
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stageContainerRef = useRef<HTMLDivElement | null>(null);
  const renderTaskRef = useRef<any>(null);
  const pdfDocCacheRef = useRef<{ dataUrl: string; doc: any } | null>(null);
  const [isLoadingPdf, setIsLoadingPdf] = useState<boolean>(true);
  const [pdfDimensions, setPdfDimensions] = useState<{ width: number; height: number }>({ width: 595, height: 842 });
  const [canvasDisplaySize, setCanvasDisplaySize] = useState<{ width: number; height: number }>({ width: 600, height: 850 });
  const [editorZoom, setEditorZoom] = useState<number>(1.15);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);

  // Key listeners: Spacebar (Hand Pan), Esc (Cancel polygon), Enter (Finish polygon), Backspace (Undo vertex)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName);
      if (isInput) return;

      if (e.code === 'Space') {
        e.preventDefault();
        setIsSpacePressed(true);
      } else if (e.key === 'Escape') {
        if (polygonPoints.length > 0) {
          setPolygonPoints([]);
        } else if (selectedSectionId) {
          setSelectedSectionId(null);
        }
      } else if (e.key === 'Enter') {
        if (toolMode === 'polygon' && polygonPoints.length >= 3) {
          finishPolygonCreation(polygonPoints);
        }
      } else if (e.key === 'Backspace' || (e.ctrlKey && e.key === 'z')) {
        if (toolMode === 'polygon' && polygonPoints.length > 0) {
          e.preventDefault();
          setPolygonPoints((prev) => prev.slice(0, prev.length - 1));
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpacePressed(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [polygonPoints, toolMode, selectedSectionId]);

  // Wheel listener for smooth zoom on stage
  useEffect(() => {
    const stage = stageContainerRef.current;
    if (!stage) return;

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) {
        e.preventDefault();
        const delta = e.deltaY < 0 ? 0.15 : -0.15;
        setEditorZoom((prev) => Math.min(3.5, Math.max(0.4, +(prev + delta).toFixed(2))));
      }
    };

    stage.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      stage.removeEventListener('wheel', handleWheel);
    };
  }, []);

  // Render PDF page onto the editor canvas
  useEffect(() => {
    let isCancelled = false;
    setIsLoadingPdf(true);

    if (renderTaskRef.current) {
      try {
        renderTaskRef.current.cancel();
      } catch {}
      renderTaskRef.current = null;
    }

    const renderPage = async () => {
      try {
        if (!canvasRef.current) {
          setIsLoadingPdf(false);
          return;
        }

        if (edition.pdfDataUrl) {
          let pdf = pdfDocCacheRef.current?.dataUrl === edition.pdfDataUrl ? pdfDocCacheRef.current.doc : null;

          if (!pdf) {
            const base64Data = edition.pdfDataUrl.split(',')[1];
            const binaryString = atob(base64Data);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
              bytes[i] = binaryString.charCodeAt(i);
            }

            const loadingTask = pdfjsLib.getDocument({
              data: bytes.buffer,
              cMapUrl: 'https://unpkg.com/pdfjs-dist@4.10.38/cmaps/',
              cMapPacked: true,
            });
            pdf = await loadingTask.promise;
            if (isCancelled) return;
            pdfDocCacheRef.current = { dataUrl: edition.pdfDataUrl, doc: pdf };
          }

          const page = await pdf.getPage(currentPage);
          if (isCancelled) return;

          const unscaledViewport = page.getViewport({ scale: 1.0 });
          setPdfDimensions({ width: unscaledViewport.width || 595, height: unscaledViewport.height || 842 });

          const containerW = stageContainerRef.current ? stageContainerRef.current.clientWidth - 48 : 800;
          const targetW = Math.min(850, Math.max(450, containerW));
          const baseScale = targetW / unscaledViewport.width;
          const currentScale = baseScale * editorZoom;

          const dpr = window.devicePixelRatio || 1;
          const viewport = page.getViewport({ scale: currentScale * dpr });

          const canvas = canvasRef.current;
          canvas.width = viewport.width;
          canvas.height = viewport.height;

          const dispW = viewport.width / dpr;
          const dispH = viewport.height / dpr;
          canvas.style.width = `${dispW}px`;
          canvas.style.height = `${dispH}px`;
          setCanvasDisplaySize({ width: dispW, height: dispH });

          const ctx = canvas.getContext('2d', { alpha: false });
          if (ctx) {
            if (isCancelled) return;

            if (renderTaskRef.current) {
              try {
                renderTaskRef.current.cancel();
              } catch {}
              renderTaskRef.current = null;
            }

            // @ts-ignore
            const renderTask = page.render({
              canvasContext: ctx,
              viewport: viewport,
            });
            renderTaskRef.current = renderTask;

            await renderTask.promise;
            renderTaskRef.current = null;
          }
        } else if (edition.pages && (edition.pages[currentPage - 1]?.fullPageUrl || edition.pages[currentPage - 1]?.thumbnailUrl)) {
          const pageImgSrc = edition.pages[currentPage - 1].fullPageUrl || edition.pages[currentPage - 1].thumbnailUrl;
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.src = pageImgSrc;
          await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
          });

          if (isCancelled) return;

          const origW = img.naturalWidth || 800;
          const origH = img.naturalHeight || 1130;
          setPdfDimensions({ width: origW, height: origH });

          const containerW = stageContainerRef.current ? stageContainerRef.current.clientWidth - 48 : 800;
          const targetW = Math.min(850, Math.max(450, containerW));
          const baseScale = targetW / origW;
          const currentScale = baseScale * editorZoom;

          const dpr = window.devicePixelRatio || 1;
          const canvas = canvasRef.current;
          canvas.width = origW * currentScale * dpr;
          canvas.height = origH * currentScale * dpr;

          const dispW = origW * currentScale;
          const dispH = origH * currentScale;
          canvas.style.width = `${dispW}px`;
          canvas.style.height = `${dispH}px`;
          setCanvasDisplaySize({ width: dispW, height: dispH });

          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          }
        }

        if (!isCancelled) {
          setIsLoadingPdf(false);
        }
      } catch (err: any) {
        const isCancelledError =
          err?.name === 'RenderingCancelledException' ||
          err?.message?.includes('cancelled') ||
          err?.message?.includes('canceled') ||
          isCancelled;

        if (!isCancelledError) {
          console.error('Editor PDF render error:', err);
          setIsLoadingPdf(false);
        }
      }
    };

    renderPage();

    return () => {
      isCancelled = true;
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
        } catch {}
        renderTaskRef.current = null;
      }
    };
  }, [edition.id, edition.pdfDataUrl, edition.pages?.length, currentPage, editorZoom]);

  // Current page sections
  const currentPageSections = sections.filter((s) => s.pageNumber === currentPage);

  // Convert canvas pixel position to original PDF coordinates
  const canvasToPdfCoords = useCallback((canvasX: number, canvasY: number): NewsPoint => {
    if (!canvasDisplaySize.width || !canvasDisplaySize.height) return { x: 0, y: 0 };
    const ratioX = (pdfDimensions.width || 800) / canvasDisplaySize.width;
    const ratioY = (pdfDimensions.height || 1130) / canvasDisplaySize.height;
    return {
      x: Math.round(canvasX * ratioX),
      y: Math.round(canvasY * ratioY),
    };
  }, [canvasDisplaySize, pdfDimensions]);

  // Convert PDF coordinates to current canvas overlay CSS positions
  const pdfToCanvasRect = useCallback((s: NewsSection) => {
    const pdfW = (s.pdfWidth && s.pdfWidth > 0) ? s.pdfWidth : (pdfDimensions.width || 800);
    const pdfH = (s.pdfHeight && s.pdfHeight > 0) ? s.pdfHeight : (pdfDimensions.height || 1130);
    const leftPercent = Math.max(0, Math.min(100, (s.x / pdfW) * 100));
    const topPercent = Math.max(0, Math.min(100, (s.y / pdfH) * 100));
    const widthPercent = Math.max(1, Math.min(100 - leftPercent, (s.width / pdfW) * 100));
    const heightPercent = Math.max(1, Math.min(100 - topPercent, (s.height / pdfH) * 100));
    return { leftPercent, topPercent, widthPercent, heightPercent };
  }, [pdfDimensions]);

  // Convert PDF polygon points to canvas pixel points for SVG rendering
  const pdfPolygonToCanvasPoints = useCallback((s: NewsSection): { x: number; y: number }[] => {
    if (!s.polygonPoints || s.polygonPoints.length === 0) return [];
    const pdfW = (s.pdfWidth && s.pdfWidth > 0) ? s.pdfWidth : (pdfDimensions.width || 800);
    const pdfH = (s.pdfHeight && s.pdfHeight > 0) ? s.pdfHeight : (pdfDimensions.height || 1130);
    const scaleX = canvasDisplaySize.width / pdfW;
    const scaleY = canvasDisplaySize.height / pdfH;
    return s.polygonPoints.map((p) => ({
      x: p.x * scaleX,
      y: p.y * scaleY,
    }));
  }, [canvasDisplaySize, pdfDimensions]);

  // Helper to finish polygon and open details modal
  const finishPolygonCreation = (canvasPts: { x: number; y: number }[], shape: 'polygon' | 'freestyle' = 'polygon') => {
    if (canvasPts.length < 3) return;

    const pdfPoints: NewsPoint[] = canvasPts.map((p) => canvasToPdfCoords(p.x, p.y));
    
    // Calculate bounding box
    const minX = Math.min(...pdfPoints.map((p) => p.x));
    const maxX = Math.max(...pdfPoints.map((p) => p.x));
    const minY = Math.min(...pdfPoints.map((p) => p.y));
    const maxY = Math.max(...pdfPoints.map((p) => p.y));
    const width = Math.max(20, maxX - minX);
    const height = Math.max(20, maxY - minY);

    const newSec: NewsSection = {
      id: `sec_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      editionId: edition.id,
      pageNumber: currentPage,
      x: minX,
      y: minY,
      width,
      height,
      pdfWidth: Math.round(pdfDimensions.width),
      pdfHeight: Math.round(pdfDimensions.height),
      shapeType: shape,
      polygonPoints: pdfPoints,
      title: `बातमी क्र. ${currentPageSections.length + 1}`,
      category: 'मुख्य बातमी',
      description: '',
      enabled: true,
      createdAt: new Date().toISOString(),
    };

    setEditingSection(newSec);
    setFormTitle(newSec.title);
    setFormCategory('मुख्य बातमी');
    setFormCustomCategory('');
    setFormDescription('');
    setFormEnabled(true);
    setIsSectionModalOpen(true);

    // Reset temporary states
    setPolygonPoints([]);
    setFreestylePoints([]);
    setCurrentCursorPos(null);
  };

  // Stage Mouse Down: Handles Hand Pan, Box Draw, Polygon click, or Freestyle start
  const handleStageMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const isHand = toolMode === 'hand' || isSpacePressed || e.button === 1;

    if (isHand) {
      setIsStagePanning(true);
      setPanStart({
        x: e.clientX,
        y: e.clientY,
        scrollLeft: stageContainerRef.current?.scrollLeft || 0,
        scrollTop: stageContainerRef.current?.scrollTop || 0,
      });
      return;
    }

    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const y = Math.max(0, Math.min(e.clientY - rect.top, rect.height));

    if (toolMode === 'draw') {
      setIsDrawingRect(true);
      setDrawStart({ x, y });
      setCurrentDrawBox({ x, y, width: 0, height: 0 });
      setSelectedSectionId(null);
    } else if (toolMode === 'polygon') {
      // Check if clicking close to first point (within 14px) to close polygon
      if (polygonPoints.length >= 3) {
        const first = polygonPoints[0];
        const dist = Math.hypot(x - first.x, y - first.y);
        if (dist < 16) {
          finishPolygonCreation(polygonPoints, 'polygon');
          return;
        }
      }
      setPolygonPoints((prev) => [...prev, { x, y }]);
      setSelectedSectionId(null);
    } else if (toolMode === 'freestyle') {
      setIsDrawingFreestyle(true);
      setFreestylePoints([{ x, y }]);
      setSelectedSectionId(null);
    }
  };

  // Stage Mouse Move
  const handleStageMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    // 1. Hand panning
    if (isStagePanning && stageContainerRef.current) {
      const dx = e.clientX - panStart.x;
      const dy = e.clientY - panStart.y;
      stageContainerRef.current.scrollLeft = panStart.scrollLeft - dx;
      stageContainerRef.current.scrollTop = panStart.scrollTop - dy;
      return;
    }

    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const currentX = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const currentY = Math.max(0, Math.min(e.clientY - rect.top, rect.height));

    // Track cursor for polygon rubberband line
    if (toolMode === 'polygon') {
      setCurrentCursorPos({ x: currentX, y: currentY });
    }

    // 2. Drawing rectangle box
    if (toolMode === 'draw' && isDrawingRect && drawStart) {
      const x = Math.min(drawStart.x, currentX);
      const y = Math.min(drawStart.y, currentY);
      const width = Math.abs(currentX - drawStart.x);
      const height = Math.abs(currentY - drawStart.y);
      setCurrentDrawBox({ x, y, width, height });
      return;
    }

    // 3. Drawing freestyle contour
    if (toolMode === 'freestyle' && isDrawingFreestyle) {
      setFreestylePoints((prev) => {
        const last = prev[prev.length - 1];
        if (!last || Math.hypot(currentX - last.x, currentY - last.y) > 6) {
          return [...prev, { x: currentX, y: currentY }];
        }
        return prev;
      });
      return;
    }

    // 4. Dragging / Resizing an existing section or vertex
    if (dragAction && dragStartPos && dragInitialSection && canvasDisplaySize.width > 0) {
      const scaleX = pdfDimensions.width / canvasDisplaySize.width;
      const scaleY = pdfDimensions.height / canvasDisplaySize.height;

      const dxPdf = (e.clientX - dragStartPos.x) * scaleX;
      const dyPdf = (e.clientY - dragStartPos.y) * scaleY;

      // Handle polygon vertex dragging
      if (dragAction === 'vertex' && dragVertexIndex !== null && dragInitialSection.polygonPoints) {
        const updatedPoints = dragInitialSection.polygonPoints.map((pt, idx) => {
          if (idx === dragVertexIndex) {
            return {
              x: Math.max(0, Math.min(pdfDimensions.width, Math.round(pt.x + dxPdf))),
              y: Math.max(0, Math.min(pdfDimensions.height, Math.round(pt.y + dyPdf))),
            };
          }
          return pt;
        });

        const minX = Math.min(...updatedPoints.map((p) => p.x));
        const maxX = Math.max(...updatedPoints.map((p) => p.x));
        const minY = Math.min(...updatedPoints.map((p) => p.y));
        const maxY = Math.max(...updatedPoints.map((p) => p.y));

        setSections((prev) =>
          prev.map((s) =>
            s.id === dragInitialSection.id
              ? {
                  ...s,
                  polygonPoints: updatedPoints,
                  x: minX,
                  y: minY,
                  width: Math.max(20, maxX - minX),
                  height: Math.max(20, maxY - minY),
                }
              : s
          )
        );
        return;
      }

      // Handle moving whole polygon or rectangle
      if (dragAction === 'move') {
        const newX = Math.max(0, Math.min(pdfDimensions.width - dragInitialSection.width, dragInitialSection.x + dxPdf));
        const newY = Math.max(0, Math.min(pdfDimensions.height - dragInitialSection.height, dragInitialSection.y + dyPdf));
        
        let updatedPolygonPoints = dragInitialSection.polygonPoints;
        if (updatedPolygonPoints && updatedPolygonPoints.length > 0) {
          const shiftX = Math.round(newX - dragInitialSection.x);
          const shiftY = Math.round(newY - dragInitialSection.y);
          updatedPolygonPoints = dragInitialSection.polygonPoints.map((pt) => ({
            x: pt.x + shiftX,
            y: pt.y + shiftY,
          }));
        }

        setSections((prev) =>
          prev.map((s) =>
            s.id === dragInitialSection.id
              ? {
                  ...s,
                  x: Math.round(newX),
                  y: Math.round(newY),
                  polygonPoints: updatedPolygonPoints,
                }
              : s
          )
        );
        return;
      }

      // Handle standard box corner resizing
      let newX = dragInitialSection.x;
      let newY = dragInitialSection.y;
      let newW = dragInitialSection.width;
      let newH = dragInitialSection.height;

      if (dragAction === 'se') {
        newW = Math.max(20, Math.min(pdfDimensions.width - newX, dragInitialSection.width + dxPdf));
        newH = Math.max(20, Math.min(pdfDimensions.height - newY, dragInitialSection.height + dyPdf));
      } else if (dragAction === 'nw') {
        const potentialX = dragInitialSection.x + dxPdf;
        const potentialY = dragInitialSection.y + dyPdf;
        const rightEdge = dragInitialSection.x + dragInitialSection.width;
        const bottomEdge = dragInitialSection.y + dragInitialSection.height;
        newX = Math.max(0, Math.min(rightEdge - 20, potentialX));
        newY = Math.max(0, Math.min(bottomEdge - 20, potentialY));
        newW = rightEdge - newX;
        newH = bottomEdge - newY;
      } else if (dragAction === 'ne') {
        const potentialY = dragInitialSection.y + dyPdf;
        const bottomEdge = dragInitialSection.y + dragInitialSection.height;
        newY = Math.max(0, Math.min(bottomEdge - 20, potentialY));
        newW = Math.max(20, Math.min(pdfDimensions.width - newX, dragInitialSection.width + dxPdf));
        newH = bottomEdge - newY;
      } else if (dragAction === 'sw') {
        const potentialX = dragInitialSection.x + dxPdf;
        const rightEdge = dragInitialSection.x + dragInitialSection.width;
        newX = Math.max(0, Math.min(rightEdge - 20, potentialX));
        newW = rightEdge - newX;
        newH = Math.max(20, Math.min(pdfDimensions.height - newY, dragInitialSection.height + dyPdf));
      }

      setSections((prev) =>
        prev.map((s) =>
          s.id === dragInitialSection.id
            ? { ...s, x: Math.round(newX), y: Math.round(newY), width: Math.round(newW), height: Math.round(newH) }
            : s
        )
      );
    }
  };

  const handleStageMouseUp = () => {
    if (isStagePanning) {
      setIsStagePanning(false);
    }

    // Finish Rectangle Drawing
    if (toolMode === 'draw' && isDrawingRect) {
      setIsDrawingRect(false);
      if (currentDrawBox && currentDrawBox.width > 25 && currentDrawBox.height > 25) {
        const startPdf = canvasToPdfCoords(currentDrawBox.x, currentDrawBox.y);
        const endPdf = canvasToPdfCoords(currentDrawBox.x + currentDrawBox.width, currentDrawBox.y + currentDrawBox.height);
        
        const newSec: NewsSection = {
          id: `sec_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          editionId: edition.id,
          pageNumber: currentPage,
          x: Math.round(startPdf.x),
          y: Math.round(startPdf.y),
          width: Math.round(endPdf.x - startPdf.x),
          height: Math.round(endPdf.y - startPdf.y),
          pdfWidth: Math.round(pdfDimensions.width),
          pdfHeight: Math.round(pdfDimensions.height),
          shapeType: 'rectangle',
          title: `बातमी क्र. ${currentPageSections.length + 1}`,
          category: 'मुख्य बातमी',
          description: '',
          enabled: true,
          createdAt: new Date().toISOString(),
        };

        setEditingSection(newSec);
        setFormTitle(newSec.title);
        setFormCategory('मुख्य बातमी');
        setFormCustomCategory('');
        setFormDescription('');
        setFormEnabled(true);
        setIsSectionModalOpen(true);
      }
      setCurrentDrawBox(null);
      setDrawStart(null);
    }

    // Finish Freestyle Drawing
    if (toolMode === 'freestyle' && isDrawingFreestyle) {
      setIsDrawingFreestyle(false);
      if (freestylePoints.length >= 6) {
        // Downsample points to avoid bloating
        const step = Math.max(1, Math.floor(freestylePoints.length / 30));
        const downsampled = freestylePoints.filter((_, i) => i % step === 0);
        if (downsampled.length >= 3) {
          finishPolygonCreation(downsampled, 'freestyle');
        }
      }
      setFreestylePoints([]);
    }

    // Finish Dragging / Resizing
    if (dragAction) {
      setDragAction(null);
      setDragVertexIndex(null);
      setDragStartPos(null);
      setDragInitialSection(null);
    }
  };

  // Start Move Drag
  const handleStartMoveSection = (e: React.MouseEvent, sec: NewsSection) => {
    if (toolMode === 'hand' || isSpacePressed) return;
    e.stopPropagation();
    setSelectedSectionId(sec.id);
    setDragAction('move');
    setDragStartPos({ x: e.clientX, y: e.clientY });
    setDragInitialSection(sec);
  };

  // Start Resize Drag on Box Corner
  const handleStartResize = (e: React.MouseEvent, sec: NewsSection, handle: 'nw' | 'ne' | 'se' | 'sw') => {
    if (toolMode === 'hand' || isSpacePressed) return;
    e.stopPropagation();
    setSelectedSectionId(sec.id);
    setDragAction(handle);
    setDragStartPos({ x: e.clientX, y: e.clientY });
    setDragInitialSection(sec);
  };

  // Start Polygon Vertex Drag
  const handleStartDragVertex = (e: React.MouseEvent, sec: NewsSection, vertexIdx: number) => {
    if (toolMode === 'hand' || isSpacePressed) return;
    e.stopPropagation();
    setSelectedSectionId(sec.id);
    setDragAction('vertex');
    setDragVertexIndex(vertexIdx);
    setDragStartPos({ x: e.clientX, y: e.clientY });
    setDragInitialSection(sec);
  };

  // Open Edit Details Dialog
  const handleOpenEditSection = (sec: NewsSection) => {
    setEditingSection(sec);
    setFormTitle(sec.title);
    if (CATEGORY_OPTIONS.includes(sec.category)) {
      setFormCategory(sec.category);
      setFormCustomCategory('');
    } else {
      setFormCategory('इतर');
      setFormCustomCategory(sec.category);
    }
    setFormDescription(sec.description || '');
    setFormEnabled(sec.enabled);
    setIsSectionModalOpen(true);
  };

  // Save Section Details from Modal
  const handleSaveSectionDetails = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSection) return;

    const finalCategory = formCategory === 'इतर' && formCustomCategory.trim() 
      ? formCustomCategory.trim() 
      : formCategory;

    const updated: NewsSection = {
      ...editingSection,
      title: formTitle.trim() || 'नवीन बातमी',
      category: finalCategory,
      description: formDescription.trim(),
      enabled: formEnabled,
      updatedAt: new Date().toISOString(),
    };

    setSections((prev) => {
      const exists = prev.some((s) => s.id === updated.id);
      const next = exists
        ? prev.map((s) => (s.id === updated.id ? updated : s))
        : [...prev, updated];
      // Asynchronously persist to storage without blocking render
      Promise.resolve().then(() => onSaveSections(next)).catch(console.error);
      return next;
    });

    setIsSectionModalOpen(false);
    setSelectedSectionId(updated.id);
    setEditingSection(null);
  };

  // Delete a Section
  const handleDeleteSection = (secId: string) => {
    if (confirm('हा बातमी भाग हटवायचा आहे का?')) {
      setSections((prev) => {
        const next = prev.filter((s) => s.id !== secId);
        Promise.resolve().then(() => onSaveSections(next)).catch(console.error);
        return next;
      });
      if (selectedSectionId === secId) setSelectedSectionId(null);
    }
  };

  // Toggle Section Enabled status
  const handleToggleEnabled = (secId: string) => {
    setSections((prev) => {
      const next = prev.map((s) => (s.id === secId ? { ...s, enabled: !s.enabled } : s));
      Promise.resolve().then(() => onSaveSections(next)).catch(console.error);
      return next;
    });
  };

  // Close editor with auto-save
  const handleCloseEditor = async () => {
    try {
      await onSaveSections(sections);
    } catch {}
    onClose();
  };

  // Persist all sections to database
  const handleSaveAll = async () => {
    setIsSaving(true);
    setSaveFeedback(null);
    try {
      await onSaveSections(sections);
      setSaveFeedback('सर्व परस्परसंवादी सेक्शन्स यशस्वीरीत्या जतन केले!');
      setTimeout(() => setSaveFeedback(null), 3500);
    } catch (err) {
      console.error('Save sections error:', err);
      setSaveFeedback('जतन करताना त्रुटी आली.');
    } finally {
      setIsSaving(false);
    }
  };

  // Active cursor determination
  const getStageCursor = () => {
    if (isStagePanning) return 'cursor-grabbing';
    if (toolMode === 'hand' || isSpacePressed) return 'cursor-grab';
    if (toolMode === 'draw') return 'cursor-crosshair';
    if (toolMode === 'polygon' || toolMode === 'freestyle') return 'cursor-crosshair';
    return 'cursor-default';
  };

  return (
    <div 
      id="interactive-sections-editor"
      className="fixed inset-0 z-[70] flex flex-col bg-slate-950 text-slate-100 font-marathi-sans select-none overflow-hidden"
    >
      {/* 1. Editor Top Navigation Bar */}
      <header className="bg-[#0B2240] px-3 sm:px-5 py-2.5 border-b border-slate-700/80 flex items-center justify-between gap-3 shrink-0 shadow-md">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="p-1.5 bg-[#8B0000] text-white rounded-lg shadow-2xs">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-white font-bold text-sm sm:text-base font-khand tracking-wide leading-tight flex items-center gap-2">
              <span>परस्परसंवादी बातमी मॅपिंग संपादक (Interactive Article Mapper)</span>
              <span className="hidden md:inline-block bg-amber-400/20 text-amber-300 border border-amber-400/40 text-[10px] px-2 py-0.5 rounded font-sans">
                Freestyle & Polygon Enabled
              </span>
            </h2>
            <p className="text-slate-300 text-xs truncate">
              {edition.title} • दिनांक: {edition.date} • एकूण मॅप केलेले भाग: {sections.length}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {saveFeedback && (
            <span className="hidden sm:inline-block text-xs font-bold text-emerald-400 bg-emerald-950/80 border border-emerald-700 px-2.5 py-1 rounded">
              {saveFeedback}
            </span>
          )}

          <button
            onClick={handleSaveAll}
            disabled={isSaving}
            id="editor-save-all-btn"
            className="flex items-center gap-1.5 px-3.5 sm:px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-all shadow-md cursor-pointer disabled:opacity-50 active:scale-95"
            title="सर्व मॅपिंग जतन करा"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>जतन करा (Save All)</span>
          </button>

          <button
            onClick={handleCloseEditor}
            id="editor-close-btn"
            className="p-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
            title="संपादक बंद करा"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* 2. Precision Tool Controls Bar */}
      <div className="bg-slate-900 border-b border-slate-800 px-3 sm:px-4 py-2 flex flex-wrap items-center justify-between gap-2.5 shrink-0 text-xs">
        
        {/* Left: Tool Selection (Box Draw, Polygon/L-Shape, Freestyle Lasso, Hand Pan, Pointer Select) */}
        <div className="flex items-center gap-1.5 bg-slate-950/70 p-1 rounded-lg border border-slate-800 overflow-x-auto">
          
          {/* Tool 1: Rectangle Box Tool */}
          <button
            onClick={() => {
              setToolMode('draw');
              setPolygonPoints([]);
              setSelectedSectionId(null);
            }}
            id="tool-draw-box-btn"
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-md font-bold transition-all cursor-pointer whitespace-nowrap ${
              toolMode === 'draw'
                ? 'bg-red-600 text-white shadow-md'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
            title="आयताकार बॉक्स काढा (Standard Rectangle Box)"
          >
            <Square className="w-4 h-4" />
            <span>आयताकार (Box)</span>
          </button>

          {/* Tool 2: Multi-point Polygon / L-shape Tool */}
          <button
            onClick={() => {
              setToolMode('polygon');
              setPolygonPoints([]);
              setSelectedSectionId(null);
            }}
            id="tool-polygon-btn"
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-md font-bold transition-all cursor-pointer whitespace-nowrap ${
              toolMode === 'polygon'
                ? 'bg-emerald-600 text-white shadow-md font-extrabold ring-1 ring-emerald-300'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
            title="एल-आकार किंवा अनियमित बहुभुज मॅप करा (L-Shape / Polygon / Freestyle Points)"
          >
            <Shapes className="w-4 h-4 text-amber-300" />
            <span>बहुभुज (Polygon)</span>
          </button>

          {/* Tool 3: Freestyle Lasso Tool */}
          <button
            onClick={() => {
              setToolMode('freestyle');
              setPolygonPoints([]);
              setSelectedSectionId(null);
            }}
            id="tool-freestyle-btn"
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-md font-bold transition-all cursor-pointer whitespace-nowrap ${
              toolMode === 'freestyle'
                ? 'bg-purple-600 text-white shadow-md font-extrabold'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
            title="माऊसने थेट फ्रीहँड रेखाटन करा (Freehand Lasso Drawing)"
          >
            <PenTool className="w-4 h-4 text-cyan-300" />
            <span>फ्रीस्टाईल (Lasso)</span>
          </button>

          {/* Tool 4: Hand Pan Tool */}
          <button
            onClick={() => {
              setToolMode('hand');
              setPolygonPoints([]);
            }}
            id="tool-hand-pan-btn"
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-md font-bold transition-all cursor-pointer whitespace-nowrap ${
              toolMode === 'hand'
                ? 'bg-amber-500 text-slate-950 shadow-md font-extrabold'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
            title="पेपर हलवण्यासाठी हात साधन (Hand Tool - Move Paper) [Shortcut: Spacebar]"
          >
            <Hand className="w-4 h-4" />
            <span>हात (Hand)</span>
          </button>

          {/* Tool 5: Pointer Select Tool */}
          <button
            onClick={() => {
              setToolMode('select');
              setPolygonPoints([]);
            }}
            id="tool-select-btn"
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-md font-bold transition-all cursor-pointer whitespace-nowrap ${
              toolMode === 'select'
                ? 'bg-sky-600 text-white shadow-md'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
            title="सेक्शन किंवा बिंदू निवडा व हलवा (Select & Move Vertices)"
          >
            <MousePointer className="w-4 h-4" />
            <span>निवडा (Select)</span>
          </button>
        </div>

        {/* Center: Page Navigation */}
        <div className="flex items-center gap-1 bg-slate-950/60 border border-slate-800 rounded-lg p-0.5">
          <button
            onClick={() => {
              setCurrentPage((p) => Math.max(1, p - 1));
              setSelectedSectionId(null);
              setPolygonPoints([]);
            }}
            disabled={currentPage <= 1}
            className="p-1 text-slate-300 hover:text-white hover:bg-slate-800 rounded disabled:opacity-30 cursor-pointer"
            title="मागील पान"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <span className="px-2.5 font-bold text-slate-200 text-xs">
            पान {currentPage} / {edition.totalPages}
          </span>

          <button
            onClick={() => {
              setCurrentPage((p) => Math.min(edition.totalPages, p + 1));
              setSelectedSectionId(null);
              setPolygonPoints([]);
            }}
            disabled={currentPage >= edition.totalPages}
            className="p-1 text-slate-300 hover:text-white hover:bg-slate-800 rounded disabled:opacity-30 cursor-pointer"
            title="पुढील पान"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Right: Accurate Zoom & Scroll Wheel Navigation */}
        <div className="flex items-center gap-1.5 bg-slate-950/60 p-1 rounded-lg border border-slate-800">
          <button
            onClick={() => setEditorZoom((z) => Math.max(0.4, +(z - 0.15).toFixed(2)))}
            className="p-1.5 hover:bg-slate-800 text-slate-300 hover:text-white rounded cursor-pointer active:scale-95"
            title="झूम कमी करा (Zoom Out)"
          >
            <ZoomOut className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-1">
            {[0.8, 1.15, 1.6, 2.2].map((lvl) => (
              <button
                key={lvl}
                onClick={() => setEditorZoom(lvl)}
                className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold cursor-pointer transition-colors ${
                  Math.abs(editorZoom - lvl) < 0.08
                    ? 'bg-amber-400 text-slate-950'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                {Math.round(lvl * 100)}%
              </button>
            ))}
          </div>

          <button
            onClick={() => setEditorZoom((z) => Math.min(3.5, +(z + 0.15).toFixed(2)))}
            className="p-1.5 hover:bg-slate-800 text-slate-300 hover:text-white rounded cursor-pointer active:scale-95"
            title="झूम वाढवा (Zoom In)"
          >
            <ZoomIn className="w-4 h-4" />
          </button>

          <button
            onClick={() => setEditorZoom(1.0)}
            className="p-1.5 hover:bg-slate-800 text-slate-300 hover:text-white rounded cursor-pointer"
            title="मूळ आकार रिसेट (100%)"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>

      </div>

      {/* 3. Main Workspace: Canvas Stage on Left, Sections Manager Sidebar on Right */}
      <div className="flex-1 flex overflow-hidden relative">
        
        {/* Left / Center Canvas Workspace */}
        <div 
          ref={stageContainerRef}
          id="editor-canvas-stage"
          className={`flex-1 overflow-auto bg-slate-950 p-6 sm:p-10 flex items-center justify-center relative custom-scrollbar select-none ${getStageCursor()}`}
          onMouseDown={handleStageMouseDown}
          onMouseMove={handleStageMouseMove}
          onMouseUp={handleStageMouseUp}
          onMouseLeave={handleStageMouseUp}
          onDoubleClick={() => {
            if (toolMode === 'polygon' && polygonPoints.length >= 3) {
              finishPolygonCreation(polygonPoints, 'polygon');
            }
          }}
        >
          {isLoadingPdf && (
            <div className="absolute inset-0 z-30 bg-slate-950/85 flex flex-col items-center justify-center gap-2 text-white backdrop-blur-xs">
              <Loader2 className="w-9 h-9 text-amber-400 animate-spin" />
              <p className="text-xs font-bold font-marathi-sans">अचूक मॅपिंगसाठी पृष्ठ लोड होत आहे...</p>
            </div>
          )}

          {/* Floating Instructions HUD at top of stage */}
          <div className="absolute top-3 left-4 z-30 bg-[#0B2240]/90 backdrop-blur-xs border border-white/10 text-white text-[11px] px-3 py-1.5 rounded-lg shadow-xl flex items-center gap-2.5 pointer-events-none max-w-[85vw]">
            <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>
              {toolMode === 'polygon'
                ? polygonPoints.length === 0
                  ? '📐 बहुभुज साधन: बातमीच्या कोपऱ्यांवर क्लिक करून बिंदू जोडा (L-आकार किंवा अनियमित बातम्यांसाठी उत्तम)'
                  : `🎯 ${polygonPoints.length} बिंदू जोडले: नवीन बिंदूसाठी क्लिक करा • पहिल्या बिंदूवर क्लिक करून किंवा Enter दाबा आणि पूर्ण करा`
                : toolMode === 'freestyle'
                  ? '✏️ फ्रीस्टाईल लॅसो: माऊस दाबून ठेवून बातमीच्या किंवा जाहिरातीच्या कडेने फ्रीहँड रेष ओढा'
                  : toolMode === 'hand' || isSpacePressed
                    ? '✋ हात साधन सक्रिय: पेपर हलवण्यासाठी कुठेही क्लिक करून ओढा (Spacebar शॉर्टकट)'
                    : toolMode === 'draw'
                      ? '🎯 बॉक्स साधन: बातमीभोवती आयताकार बॉक्स काढा (Scroll Zoom उपलब्ध)'
                      : '🖱️ निवड साधन: सेक्शनवर क्लिक करून कडा/बिंदू ओढा किंवा स्थान बदला'}
            </span>
          </div>

          {/* Polygon In-Progress Floating Action Controls */}
          {toolMode === 'polygon' && polygonPoints.length > 0 && (
            <div className="absolute top-12 left-4 z-30 bg-slate-900/95 border border-emerald-500/50 text-white px-3 py-1.5 rounded-lg shadow-2xl flex items-center gap-2 text-xs">
              <span className="font-bold text-emerald-400 flex items-center gap-1">
                <Activity className="w-3.5 h-3.5" />
                {polygonPoints.length} बिंदू
              </span>

              <button
                onClick={() => setPolygonPoints((prev) => prev.slice(0, prev.length - 1))}
                className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded flex items-center gap-1 text-[11px] cursor-pointer"
                title="मागील बिंदू काढा (Backspace)"
              >
                <Undo2 className="w-3 h-3" />
                <span>मागे</span>
              </button>

              <button
                onClick={() => finishPolygonCreation(polygonPoints, 'polygon')}
                disabled={polygonPoints.length < 3}
                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-bold rounded flex items-center gap-1 text-[11px] cursor-pointer"
                title="मॅपिंग पूर्ण करा (Enter)"
              >
                <CheckCircle2 className="w-3 h-3" />
                <span>पूर्ण करा</span>
              </button>

              <button
                onClick={() => setPolygonPoints([])}
                className="px-2 py-1 bg-red-800/80 hover:bg-red-700 text-red-200 rounded flex items-center gap-1 text-[11px] cursor-pointer"
                title="रद्द करा (Esc)"
              >
                <X className="w-3 h-3" />
                <span>रद्द</span>
              </button>
            </div>
          )}

          {/* Canvas Wrapper Container */}
          <div className="relative shadow-2xl bg-white select-none transition-transform duration-75">
            <canvas ref={canvasRef} className="block max-w-none bg-white paper-page-shadow rounded-xs" />

            {/* SVG Layer for Polygons, Freestyle paths and Handles */}
            <svg 
              className="absolute inset-0 w-full h-full pointer-events-none"
              style={{ width: `${canvasDisplaySize.width}px`, height: `${canvasDisplaySize.height}px` }}
            >
              {/* 1. Saved Polygon Sections */}
              {currentPageSections.map((sec) => {
                const isPolygon = (sec.shapeType === 'polygon' || sec.shapeType === 'freestyle') && sec.polygonPoints && sec.polygonPoints.length > 2;
                if (!isPolygon) return null;

                const canvasPts = pdfPolygonToCanvasPoints(sec);
                const ptsString = canvasPts.map((p) => `${p.x},${p.y}`).join(' ');
                const isSelected = selectedSectionId === sec.id;

                return (
                  <g key={`svg-poly-${sec.id}`}>
                    <polygon
                      points={ptsString}
                      className={`pointer-events-auto cursor-pointer transition-colors ${
                        isSelected
                          ? 'fill-red-500/30 stroke-red-500 stroke-2'
                          : sec.enabled
                            ? 'fill-emerald-500/15 hover:fill-emerald-500/30 stroke-emerald-500 stroke-2 stroke-dasharray-[4,2]'
                            : 'fill-slate-500/10 stroke-slate-400 stroke-1 opacity-50'
                      }`}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (toolMode !== 'hand' && !isSpacePressed) {
                          setSelectedSectionId(sec.id);
                        }
                      }}
                      onMouseDown={(e) => handleStartMoveSection(e, sec)}
                    />

                    {/* Draggable Vertex Circles for selected Polygon */}
                    {isSelected && canvasPts.map((pt, vIdx) => (
                      <circle
                        key={`v-${sec.id}-${vIdx}`}
                        cx={pt.x}
                        cy={pt.y}
                        r={6}
                        className="pointer-events-auto fill-white stroke-red-600 stroke-2 cursor-grab active:cursor-grabbing hover:scale-125 transition-transform"
                        onMouseDown={(e) => handleStartDragVertex(e, sec, vIdx)}
                      />
                    ))}
                  </g>
                );
              })}

              {/* 2. In-Progress Polygon Draw */}
              {toolMode === 'polygon' && polygonPoints.length > 0 && (
                <g>
                  {/* Lines between placed vertices */}
                  {polygonPoints.length > 1 && (
                    <polyline
                      points={polygonPoints.map((p) => `${p.x},${p.y}`).join(' ')}
                      className="fill-none stroke-emerald-400 stroke-2"
                    />
                  )}

                  {/* Rubberband Line to mouse cursor */}
                  {currentCursorPos && polygonPoints.length > 0 && (
                    <line
                      x1={polygonPoints[polygonPoints.length - 1].x}
                      y1={polygonPoints[polygonPoints.length - 1].y}
                      x2={currentCursorPos.x}
                      y2={currentCursorPos.y}
                      className="stroke-emerald-300 stroke-2 stroke-dashed stroke-dasharray-[4,4]"
                    />
                  )}

                  {/* Polygon fill preview */}
                  {polygonPoints.length >= 2 && currentCursorPos && (
                    <polygon
                      points={`${polygonPoints.map((p) => `${p.x},${p.y}`).join(' ')} ${currentCursorPos.x},${currentCursorPos.y}`}
                      className="fill-emerald-500/20 stroke-none"
                    />
                  )}

                  {/* Vertex Nodes */}
                  {polygonPoints.map((pt, idx) => (
                    <circle
                      key={`poly-node-${idx}`}
                      cx={pt.x}
                      cy={pt.y}
                      r={idx === 0 ? 7 : 5}
                      className={`${idx === 0 ? 'fill-amber-400 stroke-white stroke-2 animate-pulse' : 'fill-emerald-400 stroke-slate-900 stroke-1'}`}
                    />
                  ))}
                </g>
              )}

              {/* 3. In-Progress Freestyle Lasso Draw */}
              {toolMode === 'freestyle' && freestylePoints.length > 1 && (
                <polyline
                  points={freestylePoints.map((p) => `${p.x},${p.y}`).join(' ')}
                  className="fill-purple-500/20 stroke-purple-400 stroke-2 stroke-dasharray-[3,3]"
                />
              )}
            </svg>

            {/* Standard Rectangular Section Overlays */}
            {currentPageSections.map((sec) => {
              const isPolygon = (sec.shapeType === 'polygon' || sec.shapeType === 'freestyle') && sec.polygonPoints && sec.polygonPoints.length > 2;
              const { leftPercent, topPercent, widthPercent, heightPercent } = pdfToCanvasRect(sec);
              const isSelected = selectedSectionId === sec.id;

              // Title badge & Action bar positioning for both Rectangle and Polygon
              return (
                <div
                  key={sec.id}
                  id={`editor-section-${sec.id}`}
                  style={{
                    left: `${leftPercent}%`,
                    top: `${topPercent}%`,
                    width: `${widthPercent}%`,
                    height: `${heightPercent}%`,
                  }}
                  className={`absolute group transition-colors select-none ${
                    isPolygon
                      ? 'pointer-events-none' // Polygon handled by SVG layer, this container holds floating controls
                      : isSelected
                        ? 'border-2 border-red-500 bg-red-500/25 shadow-xl z-20 pointer-events-auto'
                        : sec.enabled
                          ? 'border-2 border-dashed border-sky-500 bg-sky-500/15 hover:bg-sky-500/25 hover:border-sky-400 z-10 pointer-events-auto'
                          : 'border-2 border-dashed border-slate-400 bg-slate-500/10 z-0 opacity-50 pointer-events-auto'
                  }`}
                  onClick={(e) => {
                    if (isPolygon) return;
                    e.stopPropagation();
                    if (toolMode !== 'hand' && !isSpacePressed) {
                      setSelectedSectionId(sec.id);
                    }
                  }}
                  onMouseDown={(e) => {
                    if (!isPolygon) handleStartMoveSection(e, sec);
                  }}
                >
                  {/* Title & Category Badge on Hotspot */}
                  <div className="absolute top-1 left-1 max-w-[95%] pointer-events-none z-20">
                    <div className="flex items-center gap-1 bg-[#0B2240]/95 text-white text-[10px] px-2 py-0.5 rounded shadow-md font-bold truncate border border-white/20">
                      {isPolygon ? (
                        <Shapes className="w-2.5 h-2.5 text-emerald-400 shrink-0" />
                      ) : (
                        <Tag className="w-2.5 h-2.5 text-amber-400 shrink-0" />
                      )}
                      <span className="truncate">{sec.title}</span>
                    </div>
                  </div>

                  {/* Corner Resize Handles when Rectangle section is selected */}
                  {isSelected && !isPolygon && (
                    <>
                      <div
                        className="absolute -top-2 -left-2 w-4 h-4 bg-white border-2 border-red-600 rounded-full cursor-nwse-resize shadow-md hover:scale-125 transition-transform"
                        onMouseDown={(e) => handleStartResize(e, sec, 'nw')}
                      />
                      <div
                        className="absolute -top-2 -right-2 w-4 h-4 bg-white border-2 border-red-600 rounded-full cursor-nesw-resize shadow-md hover:scale-125 transition-transform"
                        onMouseDown={(e) => handleStartResize(e, sec, 'ne')}
                      />
                      <div
                        className="absolute -bottom-2 -right-2 w-4 h-4 bg-white border-2 border-red-600 rounded-full cursor-nwse-resize shadow-md hover:scale-125 transition-transform"
                        onMouseDown={(e) => handleStartResize(e, sec, 'se')}
                      />
                      <div
                        className="absolute -bottom-2 -left-2 w-4 h-4 bg-white border-2 border-red-600 rounded-full cursor-nesw-resize shadow-md hover:scale-125 transition-transform"
                        onMouseDown={(e) => handleStartResize(e, sec, 'sw')}
                      />
                    </>
                  )}

                  {/* Floating Action Menu for selected Section (both Box and Polygon) */}
                  {isSelected && (
                    <div 
                      className="absolute -bottom-10 left-1/2 -translate-x-1/2 bg-[#0B2240] text-white px-2.5 py-1 rounded-lg shadow-2xl flex items-center gap-1.5 z-30 pointer-events-auto border border-white/20 whitespace-nowrap"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={() => handleOpenEditSection(sec)}
                        className="p-1 hover:bg-white/20 rounded text-slate-200 hover:text-white"
                        title="माहिती संपादित करा"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      {onPreviewSection && (
                        <button
                          onClick={() => onPreviewSection(sec)}
                          className="p-1 hover:bg-white/20 rounded text-amber-300"
                          title="वाचक प्रीव्ह्यू पहा"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => handleToggleEnabled(sec.id)}
                        className="p-1 hover:bg-white/20 rounded text-slate-200"
                        title={sec.enabled ? 'सक्रिय (Active)' : 'निष्क्रिय (Disabled)'}
                      >
                        {sec.enabled ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <EyeOff className="w-3.5 h-3.5 text-slate-400" />}
                      </button>
                      <button
                        onClick={() => handleDeleteSection(sec.id)}
                        className="p-1 hover:bg-red-600/50 rounded text-red-400 hover:text-red-200"
                        title="हटवा"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Active Drawing Rectangle Box Preview */}
            {isDrawingRect && currentDrawBox && (
              <div
                className="absolute border-2 border-dashed border-red-500 bg-red-500/20 pointer-events-none"
                style={{
                  left: `${currentDrawBox.x}px`,
                  top: `${currentDrawBox.y}px`,
                  width: `${currentDrawBox.width}px`,
                  height: `${currentDrawBox.height}px`,
                }}
              >
                <div className="absolute -top-5 left-0 bg-red-600 text-white text-[10px] px-1.5 py-0.5 rounded font-mono font-bold shadow-md">
                  {Math.round(currentDrawBox.width)} × {Math.round(currentDrawBox.height)}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar: Page Sections List & Management */}
        <aside className="w-80 bg-slate-900 border-l border-slate-800 flex flex-col shrink-0 shadow-lg select-none">
          <div className="p-3 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-amber-400" />
              <h3 className="font-bold text-xs text-slate-200">
                पान {currentPage} वरील भाग ({currentPageSections.length})
              </h3>
            </div>
            
            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  setToolMode('draw');
                  setPolygonPoints([]);
                  setSelectedSectionId(null);
                }}
                className="px-2 py-1 bg-red-600 hover:bg-red-500 text-white font-bold rounded text-[10px] flex items-center gap-0.5 cursor-pointer shadow-xs active:scale-95"
                title="नवीन आयताकार बॉक्स जोडा"
              >
                <Square className="w-2.5 h-2.5" />
                <span>बॉक्स</span>
              </button>

              <button
                onClick={() => {
                  setToolMode('polygon');
                  setPolygonPoints([]);
                  setSelectedSectionId(null);
                }}
                className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded text-[10px] flex items-center gap-0.5 cursor-pointer shadow-xs active:scale-95"
                title="नवीन बहुभुज / L-Shape जोडा"
              >
                <Shapes className="w-2.5 h-2.5 text-amber-300" />
                <span>बहुभुज</span>
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
            {currentPageSections.length === 0 ? (
              <div className="text-center py-12 px-4 text-slate-500 text-xs">
                <Crosshair className="w-8 h-8 mx-auto mb-2 text-slate-600 opacity-60" />
                <p className="font-semibold text-slate-400">या पानावर कोणताही बातमी भाग मॅप केलेला नाही.</p>
                <p className="mt-1 text-[11px] text-slate-500">वरील "आयताकार (Box)" किंवा "बहुभुज (Polygon)" निवडून मॅपिंग सुरू करा.</p>
              </div>
            ) : (
              currentPageSections.map((sec, idx) => {
                const isSelected = selectedSectionId === sec.id;
                const isPoly = (sec.shapeType === 'polygon' || sec.shapeType === 'freestyle') && sec.polygonPoints && sec.polygonPoints.length > 2;

                return (
                  <div
                    key={sec.id}
                    onClick={() => setSelectedSectionId(sec.id)}
                    className={`p-2.5 rounded-lg border text-xs transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-slate-800 border-red-500 ring-1 ring-red-500 shadow-md'
                        : 'bg-slate-800/60 border-slate-700/60 hover:bg-slate-800 hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-1.5">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                          <span className="font-mono text-[10px] font-bold text-slate-400">
                            #{idx + 1}
                          </span>
                          <span className="px-1.5 py-0.2 bg-[#0B2240] text-amber-300 font-bold rounded text-[10px] truncate">
                            {sec.category}
                          </span>
                          {isPoly ? (
                            <span className="text-[9px] bg-emerald-950 text-emerald-300 border border-emerald-700/60 px-1 rounded flex items-center gap-0.5">
                              <Shapes className="w-2.5 h-2.5" />
                              <span>{sec.polygonPoints?.length} बिंदू</span>
                            </span>
                          ) : (
                            <span className="text-[9px] bg-slate-700 text-slate-300 px-1 rounded">
                              आयताकार
                            </span>
                          )}
                          {!sec.enabled && (
                            <span className="text-[9px] bg-slate-700 text-slate-400 px-1 rounded">
                              निष्क्रिय
                            </span>
                          )}
                        </div>
                        <h4 className="font-bold text-slate-100 truncate text-xs">
                          {sec.title}
                        </h4>
                      </div>

                      {/* Controls */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEditSection(sec);
                          }}
                          className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-700"
                          title="संपादित करा"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>

                        {onPreviewSection && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onPreviewSection(sec);
                            }}
                            className="p-1 text-slate-400 hover:text-amber-400 rounded hover:bg-slate-700"
                            title="वाचक प्रीव्ह्यू"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        )}

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteSection(sec.id);
                          }}
                          className="p-1 text-slate-400 hover:text-red-400 rounded hover:bg-slate-700"
                          title="हटवा"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Coordinates metadata */}
                    <div className="mt-2 pt-2 border-t border-slate-700/60 flex items-center justify-between text-[10px] font-mono text-slate-400">
                      <span>X:{sec.x}, Y:{sec.y}</span>
                      <span>आकार: {sec.width}×{sec.height} pt</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Quick Help Footer */}
          <div className="p-3 bg-slate-950 border-t border-slate-800 text-[11px] text-slate-400 flex items-center gap-1.5">
            <HelpCircle className="w-4 h-4 text-slate-500 shrink-0" />
            <span>मॅप केलेले भाग जतन केल्यानंतर वाचकांना थेट वाचता येतील.</span>
          </div>
        </aside>

      </div>

      {/* 4. Section Details Modal (Popup after drawing or editing) */}
      {isSectionModalOpen && editingSection && (
        <div 
          className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs"
          onClick={() => setIsSectionModalOpen(false)}
        >
          <div 
            className="bg-slate-900 border-2 border-slate-700 w-full max-w-md p-5 shadow-2xl text-slate-100"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b-2 border-slate-700 pb-3 mb-4">
              <h3 className="font-bold text-sm text-white flex items-center gap-2 font-khand">
                <Tag className="w-4 h-4 text-amber-400" />
                <span>
                  {editingSection.shapeType === 'polygon' || editingSection.shapeType === 'freestyle'
                    ? 'बहुभुज / फ्रीस्टाईल बातमी तपशील'
                    : 'बातमी भाग तपशील (Section Details)'}
                </span>
              </h3>
              <button
                onClick={() => setIsSectionModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 border border-slate-700 hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveSectionDetails} className="space-y-3.5 text-xs">
              {/* Title Box Field */}
              <div className="border-2 border-slate-700 bg-slate-800 focus-within:border-red-500">
                <div className="bg-slate-900 px-3 py-1 border-b border-slate-700 text-[10px] font-mono font-bold text-slate-400 uppercase">
                  बातमी / जाहिरातीचे नाव किंवा शीर्षक (TITLE) *
                </div>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="उदा. वाशीम जिल्हा परिषद पाणी पुरवठा योजना निर्णय..."
                  required
                  className="w-full bg-transparent px-3 py-2 text-white border-none outline-none font-bold focus:ring-0"
                />
              </div>

              {/* Category Selection Box Field */}
              <div className="border-2 border-slate-700 bg-slate-800 focus-within:border-red-500">
                <div className="bg-slate-900 px-3 py-1 border-b border-slate-700 text-[10px] font-mono font-bold text-slate-400 uppercase">
                  श्रेणी (CATEGORY) *
                </div>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  className="w-full bg-slate-800 px-3 py-2 text-white border-none outline-none font-bold focus:ring-0 cursor-pointer"
                >
                  {CATEGORY_OPTIONS.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {formCategory === 'इतर' && (
                <div className="border-2 border-slate-700 bg-slate-800 focus-within:border-red-500">
                  <div className="bg-slate-900 px-3 py-1 border-b border-slate-700 text-[10px] font-mono font-bold text-slate-400 uppercase">
                    इतर श्रेणीचे नाव (CUSTOM CATEGORY)
                  </div>
                  <input
                    type="text"
                    value={formCustomCategory}
                    onChange={(e) => setFormCustomCategory(e.target.value)}
                    placeholder="उदा. आरोग्य विशेष, महिला मंच..."
                    className="w-full bg-transparent px-3 py-2 text-white border-none outline-none font-bold focus:ring-0"
                  />
                </div>
              )}

              {/* Optional Description Box Field */}
              <div className="border-2 border-slate-700 bg-slate-800 focus-within:border-red-500">
                <div className="bg-slate-900 px-3 py-1 border-b border-slate-700 text-[10px] font-mono font-bold text-slate-400 uppercase">
                  वर्णन किंवा उपशीर्षक (DESCRIPTION)
                </div>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="वाचकांसाठी संक्षिप्त माहिती..."
                  rows={2}
                  className="w-full bg-transparent px-3 py-2 text-white border-none outline-none resize-none focus:ring-0"
                />
              </div>

              {/* Enabled toggle */}
              <div className="flex items-center gap-2 p-2 bg-slate-800 border-2 border-slate-700">
                <input
                  type="checkbox"
                  id="section-enabled-checkbox"
                  checked={formEnabled}
                  onChange={(e) => setFormEnabled(e.target.checked)}
                  className="w-4 h-4 rounded-none border-2 border-slate-500 text-red-600 focus:ring-0 cursor-pointer"
                />
                <label htmlFor="section-enabled-checkbox" className="font-semibold text-slate-300 cursor-pointer text-xs">
                  वाचकांसाठी हा बातमी भाग क्लिक करण्यायोग्य ठेवा (Enable Hotspot)
                </label>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t-2 border-slate-700 font-mono">
                <button
                  type="button"
                  onClick={() => setIsSectionModalOpen(false)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border-2 border-slate-600 font-bold cursor-pointer"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#8B0000] hover:bg-[#700000] text-white border-2 border-red-950 font-bold cursor-pointer shadow-xs"
                >
                  SAVE SECTION
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
