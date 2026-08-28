interface HeaderProps {
  onOpenAdmin?: () => void;
  isAdminLoggedIn?: boolean;
  bannerImageUrl?: string | null;
  chiefEditor?: string;
  execEditor?: string;
  location?: string;
  titleCode?: string;
}

export function Header({ 
  onOpenAdmin, 
  isAdminLoggedIn, 
  bannerImageUrl,
  chiefEditor = 'प्रा. राम धनगर',
  execEditor = 'स्वप्नील रोकडे',
  location = 'वाशीम येथून प्रकाशित',
  titleCode = 'MAHMAR49870'
}: HeaderProps) {
  return (
    <header className="bg-white border-b border-slate-200 text-slate-900 select-none shrink-0 shadow-2xs" id="epaper-header">
      {/* Header Bar: Paper Name on Left Side, Publication details in middle/right, and Header Banner on Right Side */}
      <div className="max-w-[1700px] mx-auto px-3 sm:px-5 py-2 sm:py-2.5 flex flex-col md:flex-row items-center justify-between gap-3 sm:gap-4">
        
        {/* Left Side: Paper Name & Tagline */}
        <div className="flex flex-col items-center md:items-start text-center md:text-left shrink-0">
          <h1 className="font-khand text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#8B0000] tracking-wide leading-none cursor-default">
            वत्सगुल्म टाईम्स
          </h1>
          <p className="font-kokila text-xs sm:text-sm font-bold text-slate-700 tracking-wider mt-0.5 leading-snug">
            आपली संस्कृती, आपला वसा !
          </p>
        </div>

        {/* Center/Right Info: Location & Title Code (2 lines) and Editors (2 lines) */}
        <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 sm:gap-6 text-xs sm:text-sm font-marathi-sans text-slate-800">
          
          {/* Column 1: Location & Title Code in 2 lines */}
          <div className="flex flex-col items-center md:items-start space-y-0.5 border-l-0 md:border-l-2 md:border-slate-200 md:pl-4">
            <span className="font-bold text-slate-900 flex items-center gap-1 text-[11px] sm:text-xs">
              <span>📍</span> {location}
            </span>
            <span className="bg-[#8B0000] text-white px-2 py-0.5 font-bold font-english-clean text-[10px] sm:text-[11px] tracking-wider w-fit shadow-2xs">
              Title Code: {titleCode}
            </span>
          </div>

          {/* Column 2: Chief Editor & Executive Editor in 2 lines */}
          <div className="flex flex-col items-center md:items-start space-y-0.5 border-l-0 md:border-l-2 md:border-slate-200 md:pl-4 text-[11px] sm:text-xs">
            <span className="text-slate-800">
              <strong className="text-[#0B2240] font-bold">मुख्य संपादक:</strong> {chiefEditor}
            </span>
            <span className="text-slate-800">
              <strong className="text-[#0B2240] font-bold">कार्य. संपादक:</strong> {execEditor}
            </span>
          </div>

        </div>

        {/* Right Side: Header Banner Image uploaded from Admin login */}
        {bannerImageUrl ? (
          <div className="shrink-0 max-w-[280px] sm:max-w-[340px] md:max-w-[380px] h-12 sm:h-14 overflow-hidden border border-slate-200 shadow-2xs flex items-center justify-center bg-slate-50">
            <img 
              src={bannerImageUrl} 
              alt="Header Banner" 
              className="w-full h-full object-contain"
            />
          </div>
        ) : (
          <div className="hidden lg:flex items-center justify-center px-3 py-1.5 bg-slate-50 border border-dashed border-slate-300 text-slate-400 text-[11px] font-sans font-medium h-12 shrink-0">
            <span>डिजिटल ई-पेपर आवृत्ती</span>
          </div>
        )}

      </div>
    </header>
  );
}

