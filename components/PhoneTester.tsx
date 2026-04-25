
import React, { useState } from 'react';

const COUNTRIES = [
  { code: '+1', name: 'US/CA', flag: '🇺🇸' },
  { code: '+44', name: 'UK', flag: '🇬🇧' },
  { code: '+27', name: 'ZA', flag: '🇿🇦' },
  { code: '+61', name: 'AU', flag: '🇦🇺' },
  { code: '+91', name: 'IN', flag: '🇮🇳' },
  { code: '+33', name: 'FR', flag: '🇫🇷' },
  { code: '+49', name: 'DE', flag: '🇩🇪' },
  { code: '+971', name: 'AE', flag: '🇦🇪' },
  { code: '+81', name: 'JP', flag: '🇯🇵' },
  { code: '+39', name: 'IT', flag: '🇮🇹' },
];

export const PhoneTester: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [selectedCountry, setSelectedCountry] = useState(COUNTRIES[0]);
  const [phone, setPhone] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [status, setStatus] = useState<'idle' | 'calling' | 'success'>('idle');

  const handleCall = () => {
    setStatus('calling');
    setTimeout(() => setStatus('success'), 2000);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-navy-950/60 backdrop-blur-md animate-in fade-in duration-300">
      <div className="glass-card w-full max-w-md rounded-[3rem] p-10 border border-white/20 shadow-2xl animate-in zoom-in-95 duration-300">
        <div className="flex justify-between items-start mb-8">
          <div>
            <h3 className="text-2xl font-bold serif text-navy-900 dark:text-white">Experience Fourcee</h3>
            <p className="text-xs font-bold uppercase tracking-widest text-navy-400 mt-1">Our AI will call you in seconds</p>
          </div>
          <button onClick={onClose} className="text-navy-400 hover:text-navy-900 dark:hover:text-white transition-colors">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {status === 'success' ? (
          <div className="text-center py-10 animate-in bounce-in duration-500">
            <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6 text-white text-2xl">✓</div>
            <p className="font-bold text-navy-900 dark:text-white">Incoming call initiated...</p>
            <p className="text-sm text-navy-400 mt-2 italic">Check your phone. The AI is ready.</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="relative">
              <div className="flex gap-2">
                <div className="relative">
                  <button 
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="h-14 px-4 bg-pearl-50 dark:bg-navy-900 border border-navy-100 dark:border-navy-800 rounded-2xl flex items-center gap-2 text-sm font-bold text-navy-900 dark:text-white hover:border-navy-300 transition-all"
                  >
                    <span className="text-xl">{selectedCountry.flag}</span>
                    <span className="font-mono">{selectedCountry.code}</span>
                  </button>
                  {isDropdownOpen && (
                    <div className="absolute top-full left-0 mt-2 w-56 bg-white dark:bg-navy-900 border border-navy-100 dark:border-navy-800 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in slide-in-from-top-2">
                      <div className="max-h-60 overflow-y-auto custom-scrollbar">
                        {COUNTRIES.map((c) => (
                          <button 
                            key={c.code}
                            className="w-full px-4 py-3 text-left text-sm font-bold hover:bg-navy-50 dark:hover:bg-navy-800 dark:text-white transition-colors flex items-center gap-3"
                            onClick={() => {
                              setSelectedCountry(c);
                              setIsDropdownOpen(false);
                            }}
                          >
                            <span className="text-xl">{c.flag}</span>
                            <span className="flex-1">{c.name}</span>
                            <span className="text-navy-300 text-[10px] font-mono">{c.code}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <input 
                  type="tel"
                  placeholder="000-000-0000"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="flex-1 h-14 px-6 bg-pearl-50 dark:bg-navy-900 border border-navy-100 dark:border-navy-800 rounded-2xl text-navy-900 dark:text-white font-bold focus:outline-navy-900 transition-all placeholder:text-navy-200"
                />
              </div>
            </div>

            <button 
              disabled={!phone || status === 'calling'}
              onClick={handleCall}
              className="w-full py-5 bg-navy-900 dark:bg-white text-white dark:text-navy-950 rounded-full font-bold text-sm uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 shadow-xl"
            >
              {status === 'calling' ? 'Initiating...' : 'Call Me Now →'}
            </button>
            <p className="text-[10px] text-center text-navy-400 uppercase tracking-widest">Available worldwide • High-fidelity voice</p>
          </div>
        )}
      </div>
    </div>
  );
};
