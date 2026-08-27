import React, { useState } from 'react';
import { Download, Share2, X, Check, Copy, Scissors, Loader2 } from 'lucide-react';

interface SnipModalProps {
  isOpen: boolean;
  onClose: () => void;
  croppedImageUrl: string | null;
  editionDate: string;
  editionTitle?: string;
}

// Helper to compose high-resolution branded newspaper clipping for snippet download
async function createBrandedSnipImage(
  imageSrc: string,
  paperName: string,
  editionDate: string
): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const cropW = img.naturalWidth || img.width;
        const cropH = img.naturalHeight || img.height;

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

        // Clean White Card
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvasW, canvasH);

        // Header - Masthead (Centered)
        ctx.textAlign = 'center';
        ctx.fillStyle = '#8B0000';
        ctx.font = `bold ${Math.round(28 * scale)}px 'Khand', 'Noto Sans Devanagari', 'Mukta', Arial, sans-serif`;
        ctx.textBaseline = 'top';
        ctx.fillText(paperName || 'वत्सगुल्म टाईम्स', canvasW / 2, Math.round(8 * scale));

        // Subtitle (Centered)
        ctx.fillStyle = '#475569';
        ctx.font = `${Math.round(11 * scale)}px 'Noto Sans Devanagari', Arial, sans-serif`;
        ctx.fillText('आपली संस्कृती, आपला वसा ! • डिजिटल ई-पेपर कात्रण', canvasW / 2, Math.round(42 * scale));
        ctx.textAlign = 'left';

        // Header Line
        ctx.strokeStyle = '#8B0000';
        ctx.lineWidth = Math.max(2, Math.round(2 * scale));
        ctx.beginPath();
        ctx.moveTo(padX, headerH - Math.round(4 * scale));
        ctx.lineTo(canvasW - padX, headerH - Math.round(4 * scale));
        ctx.stroke();

        // Image with Dark Red Border
        const imgX = padX;
        const imgY = headerH + Math.round(6 * scale);
        ctx.fillStyle = '#8B0000';
        ctx.fillRect(imgX, imgY, cropW + borderWidth * 2, cropH + borderWidth * 2);
        ctx.drawImage(img, imgX + borderWidth, imgY + borderWidth, cropW, cropH);

        // Footer Strip
        const footerY = imgY + cropH + borderWidth * 2 + Math.round(10 * scale);
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = Math.max(1, Math.round(1 * scale));
        ctx.beginPath();
        ctx.moveTo(padX, footerY - Math.round(4 * scale));
        ctx.lineTo(canvasW - padX, footerY - Math.round(4 * scale));
        ctx.stroke();

        ctx.fillStyle = '#1e293b';
        ctx.font = `bold ${Math.round(11 * scale)}px 'Noto Sans Devanagari', Arial, sans-serif`;
        ctx.textBaseline = 'top';
        ctx.fillText(`दिनांक: ${editionDate}`, padX, footerY);

        ctx.fillStyle = '#8B0000';
        ctx.font = `bold ${Math.round(11 * scale)}px Arial, sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText('www.vatsgulmatimes.in', canvasW / 2, footerY);

        ctx.fillStyle = '#475569';
        ctx.font = `${Math.round(10.5 * scale)}px Arial, sans-serif`;
        ctx.textAlign = 'right';
        ctx.fillText('Powered by Shrinath IT Solutions', canvasW - padX, footerY);

        resolve(canvas.toDataURL('image/jpeg', 0.96));
      } catch (err) {
        console.error('Error in createBrandedSnipImage:', err);
        resolve(imageSrc);
      }
    };
    img.onerror = () => resolve(imageSrc);
    img.src = imageSrc;
  });
}

export function SnipModal({
  isOpen,
  onClose,
  croppedImageUrl,
  editionDate,
  editionTitle = 'वत्सगुल्म टाईम्स',
}: SnipModalProps) {
  const [isCopied, setIsCopied] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  if (!isOpen || !croppedImageUrl) return null;

  const handleDownload = async () => {
    if (isDownloading) return;
    setIsDownloading(true);
    try {
      const brandedUrl = await createBrandedSnipImage(
        croppedImageUrl,
        editionTitle,
        editionDate
      );
      const link = document.createElement('a');
      link.href = brandedUrl;
      link.download = `Vatsagulma_Washim_Katran_${editionDate}_${Date.now().toString().slice(-4)}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Snip download error:', err);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleWhatsAppShare = () => {
    const text = encodeURIComponent(
      `*${editionTitle} - वाशीम ई-पेपर बातमी कात्रण*\n` +
      `📅 दिनांक: ${editionDate}\n` +
      `🌐 वेबसाईट: www.vatsgulmatimes.in\n` +
      `⚡ Powered by Shrinath IT Solutions\n` +
      `🔗 ई-पेपर वाचा: ${window.location.href}`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 select-none font-marathi-sans">
      <div className="bg-white rounded-lg border border-slate-300 shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header: Navy Blue */}
        <div className="bg-[#0B2240] text-white px-4 py-3 flex items-center justify-between border-b border-[#07182E]">
          <div className="flex items-center gap-2">
            <span className="p-1 bg-[#8B0000] text-white rounded font-bold text-xs flex items-center gap-1">
              <Scissors className="w-3.5 h-3.5" />
              कात्रण
            </span>
            <h3 className="text-sm font-bold text-white font-khand tracking-wide">
              {editionTitle} - बातमी कात्रण (Article Clip)
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-300 hover:text-white hover:bg-[#07182E] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Cropped Image Display Frame */}
        <div className="flex-1 overflow-auto p-3 sm:p-4 bg-slate-900 flex items-center justify-center">
          {/* Branded clipping card preview */}
          <div className="bg-white rounded-xs border border-slate-300 shadow-2xl max-w-full overflow-hidden flex flex-col">
            {/* Paper Name Header Above Image (Centered) */}
            <div className="bg-white px-3 py-1.5 border-b-2 border-[#8B0000] flex flex-col items-center justify-center text-center">
              <h1 className="text-[#8B0000] text-lg sm:text-xl font-bold font-khand leading-none">
                {editionTitle}
              </h1>
              <p className="text-[9px] sm:text-[10px] text-slate-500 font-marathi-sans mt-0.5">
                आपली संस्कृती, आपला वसा ! • ई-पेपर आवृत्ती
              </p>
            </div>

            {/* Dark Red Bordered Image */}
            <div className="p-1 bg-white">
              <div className="border-3 border-[#8B0000] overflow-hidden bg-white inline-block">
                <img
                  src={croppedImageUrl}
                  alt="Cropped News Snippet"
                  className="max-h-[50vh] max-w-full object-contain block select-none"
                />
              </div>
            </div>

            {/* Footer Text Below Image */}
            <div className="bg-slate-50 px-3 py-1.5 border-t border-slate-200 text-slate-700 text-[10px] sm:text-[11px] flex flex-wrap items-center justify-between gap-2 select-text">
              <span className="font-semibold text-slate-800">
                दिनांक: <strong className="text-[#8B0000]">{editionDate}</strong>
              </span>
              <span className="font-bold text-[#8B0000] font-english-clean">
                www.vatsgulmatimes.in
              </span>
              <span className="text-slate-500 font-english-clean">
                Powered by Shrinath IT Solutions
              </span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="bg-white p-3 sm:p-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2.5">
          <div className="text-xs text-slate-700">
            दिनांक: <strong className="text-[#8B0000]">{editionDate}</strong> • वाशीम मुख्य आवृत्ती
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleCopyLink}
              className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded text-xs font-bold border border-slate-300 transition-colors shadow-2xs cursor-pointer"
            >
              {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-700" /> : <Copy className="w-3.5 h-3.5 text-slate-700" />}
              <span>{isCopied ? 'लिंक कॉपी झाली!' : 'लिंक कॉपी'}</span>
            </button>

            <button
              onClick={handleWhatsAppShare}
              className="flex items-center gap-1 px-3.5 py-1.5 bg-[#25D366] hover:bg-[#1EBE5D] text-white rounded text-xs font-bold transition-colors shadow-2xs cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>WhatsApp</span>
            </button>

            <button
              onClick={handleDownload}
              disabled={isDownloading}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-[#8B0000] hover:bg-[#700000] text-white rounded text-xs font-bold transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
            >
              {isDownloading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
              <span>{isDownloading ? 'डाऊनलोड होत आहे...' : 'कात्रण डाऊनलोड (JPG)'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
