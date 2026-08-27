import { Shield, Lock } from 'lucide-react';

interface FooterProps {
  onOpenAdmin: () => void;
  isAdminLoggedIn?: boolean;
}

export function Footer({ onOpenAdmin, isAdminLoggedIn }: FooterProps) {
  return (
    <footer 
      id="epaper-footer"
      className="bg-[#0B2240] text-slate-300 text-[11px] px-3 py-1.5 border-t border-[#07182E] flex items-center justify-between gap-2 shrink-0 select-none z-30 font-marathi-sans"
    >
      <div className="flex items-center gap-2 truncate">
        <span className="font-bold text-white tracking-wide font-khand text-sm">
          वत्सगुल्म टाईम्स
        </span>
        <span className="text-slate-400 hidden xs:inline">•</span>
        <span className="text-slate-300 hidden md:inline text-[11px]">
          आपली संस्कृती, आपला वसा ! • RNI No: MAHMAR/2018/76231
        </span>
      </div>

      {/* Powered By Shrinath IT Solutions */}
      <div className="flex items-center gap-1.5 text-[11px] text-slate-300">
        <span className="text-slate-400 font-english-clean">Powered By</span>
        <a
          href="https://www.shrinathit.in"
          target="_blank"
          rel="noopener noreferrer"
          className="text-amber-400 hover:text-amber-300 hover:underline font-semibold font-english-clean transition-colors inline-flex items-center gap-1"
          title="Shrinath IT Solutions"
        >
          <span>Shrinath IT Solutions</span>
          <span className="text-slate-400 text-[10px] hidden sm:inline">(www.shrinathit.in)</span>
        </a>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {/* Admin Login Button: Just icon, no text name */}
        <button
          onClick={onOpenAdmin}
          id="footer-admin-login-btn"
          className="p-1.5 text-slate-300 hover:text-white bg-white/5 hover:bg-white/15 active:scale-95 rounded-full transition-all cursor-pointer border border-white/10 shadow-2xs flex items-center justify-center"
          title={isAdminLoggedIn ? 'संपादक डेस्क' : 'प्रशासक लॉगिन (Admin Login)'}
          aria-label="Admin Login"
        >
          {isAdminLoggedIn ? (
            <Shield className="w-3.5 h-3.5 text-amber-400" />
          ) : (
            <Lock className="w-3.5 h-3.5 text-slate-300 hover:text-white" />
          )}
        </button>
      </div>
    </footer>
  );
}
