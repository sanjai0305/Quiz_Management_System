import React, { useState, useEffect } from 'react';
import { Accessibility, Type, Eye, Volume2, X, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export function AccessibilityMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const [fontSize, setFontSize] = useState(() => localStorage.getItem('pref_font_size') || 'normal');
  const [highContrast, setHighContrast] = useState(() => localStorage.getItem('pref_high_contrast') === 'true');
  const [ttsEnabled, setTtsEnabled] = useState(() => localStorage.getItem('pref_tts') === 'true');

  useEffect(() => {
    const root = document.documentElement;
    
    // Font Size
    if (fontSize === 'large') {
      root.style.fontSize = '115%';
    } else if (fontSize === 'extra-large') {
      root.style.fontSize = '130%';
    } else {
      root.style.fontSize = '100%';
    }
    localStorage.setItem('pref_font_size', fontSize);

    // High Contrast
    if (highContrast) {
      root.classList.add('high-contrast');
    } else {
      root.classList.remove('high-contrast');
    }
    localStorage.setItem('pref_high_contrast', String(highContrast));

    // TTS
    localStorage.setItem('pref_tts', String(ttsEnabled));
  }, [fontSize, highContrast, ttsEnabled]);

  return (
    <div className="fixed bottom-6 right-6 z-[1000]">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="bg-white border-4 border-[#141414] shadow-[8px_8px_0px_0px_rgba(20,20,20,1)] p-6 rounded-3xl w-72 mb-4 space-y-6"
          >
            <div className="flex justify-between items-center">
              <h3 className="font-black uppercase text-sm tracking-widest">Accessibility</h3>
              <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-gray-100 rounded-lg">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-[10px] font-bold uppercase opacity-40">
                  <Type size={14} /> Font Size
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {['normal', 'large', 'extra-large'].map(size => (
                    <button
                      key={size}
                      onClick={() => setFontSize(size)}
                      className={`py-2 text-[10px] font-black uppercase border-2 rounded-xl transition-all ${
                        fontSize === size ? 'bg-[#141414] text-white border-[#141414]' : 'border-gray-100 hover:border-[#141414]'
                      }`}
                    >
                      {size.split('-')[0]}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-[10px] font-bold uppercase opacity-40">
                  <Eye size={14} /> Visual
                </div>
                <button
                  onClick={() => setHighContrast(!highContrast)}
                  className={`w-full py-3 px-4 flex justify-between items-center border-2 rounded-2xl font-bold text-xs transition-all ${
                    highContrast ? 'bg-indigo-50 border-indigo-600 text-indigo-700' : 'border-gray-100'
                  }`}
                >
                  High Contrast Mode
                  {highContrast ? <Check size={16} /> : <div className="w-4 h-4 rounded border border-gray-300" />}
                </button>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-[10px] font-bold uppercase opacity-40">
                  <Volume2 size={14} /> Audio
                </div>
                <button
                  onClick={() => setTtsEnabled(!ttsEnabled)}
                  className={`w-full py-3 px-4 flex justify-between items-center border-2 rounded-2xl font-bold text-xs transition-all ${
                    ttsEnabled ? 'bg-emerald-50 border-emerald-600 text-emerald-700' : 'border-gray-100'
                  }`}
                >
                  Screen Reader (TTS)
                  {ttsEnabled ? <Check size={16} /> : <div className="w-4 h-4 rounded border border-gray-300" />}
                </button>
              </div>
            </div>

            <p className="text-[8px] font-bold uppercase opacity-30 text-center">Settings are saved automatically</p>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-14 h-14 rounded-2xl border-4 border-[#141414] shadow-[4px_4px_0px_0px_rgba(20,20,20,1)] flex items-center justify-center transition-all hover:translate-x-1 hover:translate-y-1 hover:shadow-none ${
          isOpen ? 'bg-white' : 'bg-indigo-600 text-white'
        }`}
      >
        <Accessibility size={28} />
      </button>
    </div>
  );
}
