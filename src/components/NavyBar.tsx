import React from 'react';
import { Sparkles, Radio } from 'lucide-react';

export function NavyBar() {
  return (
    <div 
      id="epaper-navy-bar"
      className="bg-[#0B2240] text-white py-1.5 px-3 sm:px-4 shadow-2xs font-marathi-sans select-none border-t border-b border-[#081B33] shrink-0 overflow-hidden relative"
    >
      <div className="max-w-[1700px] mx-auto flex items-center gap-2 sm:gap-3 text-xs sm:text-sm">
        {/* Welcome Tag Badge */}
        <div className="shrink-0 flex items-center gap-1.5 bg-[#8B0000] text-amber-300 px-2.5 py-0.5 font-bold text-[11px] sm:text-xs uppercase tracking-wide z-10 shadow-xs">
          <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
          <span>स्वागतम्</span>
        </div>

        {/* Continuous Welcome Marquee Strip */}
        <div className="flex-1 overflow-hidden relative whitespace-nowrap">
          <div className="animate-marquee inline-block font-medium tracking-wide text-slate-100 text-xs sm:text-sm cursor-default">
            <span>
              वत्सगुल्म टाईम्स (Vatsagulma Times) ई-पेपर मध्ये आपले सहर्ष स्वागत आहे • ताज्या, विश्वासार्ह आणि निर्भीड बातम्यांसाठी दररोज वाचत राहा • आपली संस्कृती, आपला वसा ! • वाशीम, अकोला, बुलढाणा, यवतमाळ व विदर्भातील ताज्या घडामोडींचा वेध • दैनिक वत्सगुल्म टाईम्स •&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
            </span>
            <span>
              वत्सगुल्म टाईम्स (Vatsagulma Times) ई-पेपर मध्ये आपले सहर्ष स्वागत आहे • ताज्या, विश्वासार्ह आणि निर्भीड बातम्यांसाठी दररोज वाचत राहा • आपली संस्कृती, आपला वसा ! • वाशीम, अकोला, बुलढाणा, यवतमाळ व विदर्भातील ताज्या घडामोडींचा वेध • दैनिक वत्सगुल्म टाईम्स •&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
