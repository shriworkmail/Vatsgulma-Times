import { X, Layers } from 'lucide-react';
import { PageData } from '../types';

interface ThumbnailSidebarProps {
  pages: PageData[];
  currentPage: number;
  onSelectPage: (pageNumber: number) => void;
  isOpen: boolean;
  onClose: () => void;
  editionTitle?: string;
  editionDate?: string;
}

export function ThumbnailSidebar({
  pages,
  currentPage,
  onSelectPage,
  isOpen,
  onClose,
  editionDate = '',
}: ThumbnailSidebarProps) {
  if (!isOpen) return null;

  return (
    <>
      {/* Mobile Backdrop */}
      <div 
        className="fixed inset-0 bg-black/40 z-30 md:hidden backdrop-blur-xs"
        onClick={onClose}
      />

      {/* Slim Sidebar Drawer directly near paper with sharp corners */}
      <aside
        id="epaper-thumbnail-sidebar"
        className={`
          fixed md:static inset-y-0 left-0 z-35
          w-36 sm:w-40 md:w-44 bg-white text-slate-800 flex flex-col shrink-0
          border-r border-slate-300 shadow-xl md:shadow-none
          transition-all duration-300 ease-in-out rounded-none
          ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
          h-full select-none font-marathi-sans overflow-hidden
        `}
      >
        {/* Header with sharp corners */}
        <div className="p-2.5 pl-3 bg-[#0B2240] text-white border-b border-[#07182E] flex items-center justify-between shrink-0 rounded-none">
          <div className="flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-amber-400" />
            <h2 className="text-[11px] sm:text-xs font-bold text-white tracking-wide">
              पृष्ठे ({pages.length})
            </h2>
          </div>

          <button
            onClick={onClose}
            className="p-1 text-slate-300 hover:text-white hover:bg-white/15 transition-colors cursor-pointer rounded-none md:hidden"
            title="बंद करा (Close)"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Thumbnails Scrollable List with generous left-side space, tight item spacing and clean space when the last page ends */}
        <div className="flex-1 overflow-y-auto pl-4 sm:pl-5 pr-2.5 py-2.5 space-y-2.5 bg-slate-50 custom-scrollbar pb-10 sm:pb-12">
          {pages.map((page) => {
            const isActive = page.pageNumber === currentPage;

            return (
              <div
                key={page.pageNumber}
                onClick={() => {
                  onSelectPage(page.pageNumber);
                  if (window.innerWidth < 768) onClose();
                }}
                className={`
                  group cursor-pointer overflow-hidden transition-all duration-200 ease-out transform rounded-none
                  ${
                    isActive
                      ? 'border-2 border-[#8B0000] ring-2 ring-[#8B0000]/40 shadow-md scale-[1.01] bg-white'
                      : 'border border-slate-300 hover:border-slate-500 hover:shadow-2xs bg-white'
                  }
                `}
                title={`पृष्ठ क्र. ${page.pageNumber}`}
              >
                {/* Thumbnail Canvas Frame with sharp rectangular corners and no captions */}
                <div className="relative aspect-[3/4.2] w-full bg-slate-100 flex items-center justify-center overflow-hidden rounded-none">
                  {page.thumbnailUrl ? (
                    <img
                      src={page.thumbnailUrl}
                      alt={`पान ${page.pageNumber}`}
                      className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-200 ease-out rounded-none"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-slate-400 p-1 text-center">
                      <span className="text-xs font-bold font-mono text-slate-500">{page.pageNumber}</span>
                    </div>
                  )}

                  {/* Active Page Indicator Border */}
                  {isActive && (
                    <div className="absolute inset-0 border-2 border-[#8B0000] pointer-events-none rounded-none transition-all duration-200" />
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        {editionDate && (
          <div className="p-1.5 bg-white border-t border-slate-200 text-center text-[10px] text-slate-400 shrink-0 font-medium rounded-none">
            <span>{editionDate}</span>
          </div>
        )}
      </aside>
    </>
  );
}
