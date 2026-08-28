import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Layers,
  Share2,
  Maximize2
} from 'lucide-react';

interface DateFilterBarProps {
  selectedDate: string;
  onDateChange: (date: string) => void;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onToggleSidebar: () => void;
  isSidebarOpen: boolean;
  onToggleFullscreen?: () => void;
  onPrevEdition?: () => void;
  onNextEdition?: () => void;
  hasPrevEdition?: boolean;
  hasNextEdition?: boolean;
}

export function DateFilterBar({
  selectedDate,
  onDateChange,
  currentPage,
  totalPages,
  onPageChange,
  onToggleSidebar,
  isSidebarOpen,
  onToggleFullscreen,
  onPrevEdition,
  onNextEdition,
  hasPrevEdition = false,
  hasNextEdition = false,
}: DateFilterBarProps) {
  const handleShareWhatsApp = () => {
    const text = encodeURIComponent(
      `वत्सगुल्म टाईम्स वाशीम ई-पेपर (${selectedDate})\nपृष्ठ क्र. ${currentPage}\nवाचण्यासाठी येथे क्लिक करा: ${window.location.href}`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  return (
    <div id="epaper-date-filter" className="bg-white border-b border-slate-200 px-2 sm:px-4 py-1.5 text-slate-900 shadow-2xs select-none font-marathi-sans shrink-0">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-1.5 sm:gap-3">
        
        {/* Left Side: Sidebar Toggle & Date Picker with Paper Change Arrows */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          
          {/* Toggle Sidebar Pages Button */}
          <button
            onClick={onToggleSidebar}
            id="toggle-thumbnail-sidebar-btn"
            className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded text-xs font-bold transition-all border shadow-2xs cursor-pointer ${
              isSidebarOpen 
                ? 'bg-[#0B2240] text-white border-[#0B2240]' 
                : 'bg-white text-slate-800 border-slate-300 hover:bg-slate-50'
            }`}
            title="सर्व पृष्ठे पहा (Show/Hide Pages)"
          >
            <Layers className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-500" />
            <span className="hidden xs:inline">सर्व पृष्ठे</span>
            <span className="text-[11px] opacity-90">({totalPages})</span>
          </button>

          {/* Paper / Edition Change Controls with Date Picker */}
          <div className="flex items-center bg-slate-50 border border-slate-300 rounded shadow-2xs p-0.5">
            {/* Previous Paper / Older Edition Button */}
            {onPrevEdition && (
              <button
                onClick={onPrevEdition}
                disabled={!hasPrevEdition}
                id="prev-paper-btn"
                className="p-1 text-slate-700 hover:text-white hover:bg-[#8B0000] rounded disabled:opacity-25 disabled:hover:bg-transparent disabled:hover:text-slate-700 transition-colors cursor-pointer"
                title="मागील अंक (Previous Paper)"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Date Input */}
            <div className="flex items-center gap-1 sm:gap-1.5 px-1.5 py-0.5">
              <CalendarIcon className="w-3.5 h-3.5 text-[#8B0000] shrink-0" />
              <span className="text-xs font-bold text-slate-700 hidden sm:inline">दिनांक:</span>
              <input
                type="date"
                id="epaper-date-picker-input"
                value={selectedDate}
                onChange={(e) => onDateChange(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-900 focus:outline-hidden cursor-pointer w-[110px] sm:w-auto"
              />
            </div>

            {/* Next Paper / Newer Edition Button */}
            {onNextEdition && (
              <button
                onClick={onNextEdition}
                disabled={!hasNextEdition}
                id="next-paper-btn"
                className="p-1 text-slate-700 hover:text-white hover:bg-[#8B0000] rounded disabled:opacity-25 disabled:hover:bg-transparent disabled:hover:text-slate-700 transition-colors cursor-pointer"
                title="पुढील अंक (Next Paper)"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

        </div>

        {/* Right Side: Page Selector & WhatsApp Share */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          
          {/* Page Jumper Navigation */}
          <div className="flex items-center bg-slate-50 border border-slate-300 rounded p-0.5 shadow-2xs">
            <button
              onClick={() => onPageChange(Math.max(1, currentPage - 1))}
              disabled={currentPage <= 1}
              id="prev-page-btn"
              className="p-1 text-slate-700 hover:text-white hover:bg-[#0B2240] rounded disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-700 transition-colors cursor-pointer"
              title="मागील पान"
            >
              <ChevronLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>

            <div className="px-1 sm:px-2 flex items-center gap-1 text-xs">
              <span className="font-bold text-slate-700 hidden sm:inline">पान:</span>
              <select
                value={currentPage}
                onChange={(e) => onPageChange(Number(e.target.value))}
                className="bg-white border border-slate-200 rounded px-1.5 py-0.5 text-xs font-bold text-[#8B0000] focus:outline-hidden cursor-pointer"
              >
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <option key={p} value={p}>
                    {p} / {totalPages}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage >= totalPages}
              id="next-page-btn"
              className="p-1 text-slate-700 hover:text-white hover:bg-[#0B2240] rounded disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-700 transition-colors cursor-pointer"
              title="पुढील पान"
            >
              <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
          </div>

          {/* Fullscreen Button */}
          {onToggleFullscreen && (
            <button
              onClick={onToggleFullscreen}
              id="header-fullscreen-btn"
              className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 sm:py-1.5 bg-[#0B2240] hover:bg-[#13335A] text-white rounded text-xs font-bold shadow-2xs transition-colors cursor-pointer shrink-0"
              title="फुलस्क्रीन मोड (Full Screen Mode)"
            >
              <Maximize2 className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">फुलस्क्रीन</span>
            </button>
          )}

          {/* Share on WhatsApp */}
          <button
            onClick={handleShareWhatsApp}
            id="share-whatsapp-btn"
            className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 bg-[#25D366] hover:bg-[#1EBE5D] text-white rounded text-xs font-bold shadow-2xs transition-colors cursor-pointer shrink-0"
            title="व्हाट्सअँपवर शेअर करा"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span className="hidden md:inline">शेअर करा</span>
          </button>

        </div>

      </div>
    </div>
  );
}
