
import React, { useState } from 'react';
import { DEFAULT_MODELS } from '../constants';

interface ControlPanelProps {
  onSelectModel: (url: string, name: string) => void;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  animations: string[];
  currentAnimation: string | null;
  onPlayAnimation: (anim: string) => void;
  activeModelName: string;
  isRemoteControlActive: boolean;
  onToggleRemoteControl: () => void;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
  onSelectModel,
  onUpload,
  animations,
  currentAnimation,
  onPlayAnimation,
  activeModelName,
  isRemoteControlActive,
  onToggleRemoteControl
}) => {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className={`absolute top-4 left-4 z-20 flex flex-col transition-all duration-300 ${isOpen ? 'h-[90vh]' : 'h-auto'}`}>
      
      {/* Toggle Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="mb-2 w-10 h-10 bg-slate-900/80 backdrop-blur border border-cyan-500/30 rounded-lg flex items-center justify-center text-cyan-400 hover:bg-slate-800 transition-colors shadow-lg"
      >
        <svg className={`w-6 h-6 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
      </button>

      {/* Main Panel */}
      <div className={`
        bg-slate-900/90 backdrop-blur-xl border border-cyan-500/20 rounded-2xl w-72 overflow-hidden flex flex-col shadow-2xl transition-all duration-500 ease-in-out
        ${isOpen ? 'flex-1 opacity-100 translate-x-0' : 'h-0 opacity-0 -translate-x-4 pointer-events-none'}
      `}>
        <div className="p-5 flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-cyan-900">
          <div className="mb-6">
            <h1 className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-fuchsia-500 bg-clip-text text-transparent mb-1">
              HoloChat AR
            </h1>
            <p className="text-[10px] text-cyan-200/40 uppercase tracking-[0.2em] font-mono">System v3.0</p>
          </div>

          {/* Model Selection */}
          <div className="mb-6">
            <h3 className="text-xs font-bold text-cyan-400 mb-3 uppercase tracking-wider flex items-center font-mono">
              <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full mr-2"></span>
              Select Asset
            </h3>
            <div className="space-y-2">
              {DEFAULT_MODELS.map((model) => (
                <button
                  key={model.name}
                  onClick={() => onSelectModel(model.url, model.name)}
                  className={`w-full text-left p-3 rounded-xl border transition-all duration-200 text-sm ${
                    activeModelName === model.name
                      ? 'bg-cyan-900/30 border-cyan-500/50 text-cyan-100 shadow-[0_0_10px_rgba(6,182,212,0.1)]'
                      : 'bg-slate-800/50 border-transparent text-slate-400 hover:bg-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="font-semibold">{model.name}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Upload */}
          <div className="mb-6">
             <h3 className="text-xs font-bold text-fuchsia-400 mb-3 uppercase tracking-wider flex items-center font-mono">
              <span className="w-1.5 h-1.5 bg-fuchsia-400 rounded-full mr-2"></span>
              Import Data
            </h3>
            <label className="group flex flex-col items-center justify-center w-full h-16 border border-dashed border-slate-600 rounded-xl cursor-pointer hover:border-fuchsia-500/50 hover:bg-fuchsia-500/5 transition-all">
              <div className="flex items-center space-x-2">
                <svg className="w-4 h-4 text-slate-400 group-hover:text-fuchsia-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                <span className="text-xs text-slate-400 group-hover:text-fuchsia-300 font-medium">Upload .GLB</span>
              </div>
              <input type="file" className="hidden" accept=".glb,.gltf" onChange={onUpload} />
            </label>
          </div>

          {/* Animations */}
          <div className="mb-6">
            <h3 className="text-xs font-bold text-cyan-400 mb-3 uppercase tracking-wider flex items-center font-mono">
              <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full mr-2"></span>
              Motion Matrix
            </h3>
            {animations.length === 0 ? (
              <div className="text-xs text-slate-600 italic p-2 border border-slate-800 rounded">No sequences found.</div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {animations.map((anim) => (
                  <button
                    key={anim}
                    onClick={() => onPlayAnimation(anim)}
                    className={`px-2 py-2 text-[10px] rounded-lg border uppercase tracking-wide transition-all truncate ${
                      currentAnimation === anim
                        ? 'bg-fuchsia-600 text-white border-fuchsia-500 shadow-lg shadow-fuchsia-900/50'
                        : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:bg-slate-700 hover:text-white'
                    }`}
                    title={anim}
                  >
                    {anim}
                  </button>
                ))}
                <button
                   onClick={() => onPlayAnimation("")}
                   className="col-span-2 px-2 py-1.5 text-[10px] rounded-lg border border-red-500/30 text-red-400 uppercase tracking-wide hover:bg-red-500/10 transition-colors mt-2"
                >
                  Terminate Sequence
                </button>
              </div>
            )}
          </div>

          {/* Remote Control Toggle */}
          <div className="flex-1">
             <h3 className="text-xs font-bold text-emerald-400 mb-3 uppercase tracking-wider flex items-center font-mono">
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full mr-2"></span>
              Neural Link (Beta)
            </h3>
            <button
              onClick={onToggleRemoteControl}
              className={`w-full py-3 px-4 rounded-xl border flex items-center justify-center gap-2 transition-all font-bold tracking-wide text-sm ${
                isRemoteControlActive
                  ? 'bg-red-500/20 border-red-500/50 text-red-400 hover:bg-red-500/30 shadow-[0_0_15px_rgba(239,68,68,0.2)]'
                  : 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
              }`}
            >
              {isRemoteControlActive ? (
                <>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Disable Telepresence
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Enable Telepresence
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
