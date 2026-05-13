import React from 'react';

interface QRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  url: string;
}

export const QRCodeModal: React.FC<QRCodeModalProps> = ({ isOpen, onClose, url }) => {
  if (!isOpen) return null;

  // Use standard Black on White for maximum compatibility and scanning reliability
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(url)}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-cyan-500/50 rounded-2xl p-8 max-w-sm w-full shadow-[0_0_50px_rgba(6,182,212,0.3)] relative flex flex-col items-center">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
        
        <div className="text-center w-full">
          <h2 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-fuchsia-500 mb-2">
            Deploy to Mobile AR
          </h2>
          <p className="text-slate-400 text-sm mb-4">
            Scan to launch AR mode.
          </p>
          
          {/* White background container for the QR code to ensure it's scannable */}
          <div className="bg-white p-4 rounded-xl mx-auto mb-4 w-64 h-64 flex items-center justify-center shadow-inner">
            <img 
              src={qrUrl} 
              alt="Scan for AR" 
              className="w-full h-full object-contain mix-blend-multiply" 
              loading="eager"
            />
          </div>

          <p className="text-[10px] text-slate-500 mb-4 px-2">
            Note: If running locally, ensure your mobile device is on the same network or use a tunnel URL.
          </p>

          <div className="flex items-center justify-center gap-2 text-xs text-cyan-600 font-mono">
            <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse"></span>
            WAITING FOR DEVICE...
          </div>
        </div>
      </div>
    </div>
  );
};