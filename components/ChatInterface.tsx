import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage } from '../types';
import { startListening } from '../services/speechUtils';

interface ChatInterfaceProps {
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  isProcessing: boolean;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  messages,
  onSendMessage,
  isProcessing
}) => {
  const [input, setInput] = useState('');
  const [isMinimized, setIsMinimized] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const recognitionRef = useRef<any>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (!isMinimized) {
      scrollToBottom();
    }
  }, [messages, isMinimized]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isProcessing) return;
    onSendMessage(input);
    setInput('');
  };

  const toggleVoice = () => {
    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
    } else {
      setIsListening(true);
      recognitionRef.current = startListening(
        (text) => {
          onSendMessage(text);
          setIsListening(false);
        },
        (err) => {
          console.warn("Speech recognition error:", err);
          setIsListening(false);
        }
      );
    }
  };

  return (
    <div 
      className={`absolute bottom-4 right-4 transition-all duration-500 ease-in-out z-20 flex flex-col items-end
        ${isMinimized ? '' : 'w-96 max-w-[calc(100vw-2rem)] h-[500px] bg-slate-900/90 backdrop-blur-xl border border-cyan-500/30 rounded-2xl shadow-2xl overflow-hidden'}`}
    >
      {/* Minimized View (Glowing Orb + Chat Button) */}
      {isMinimized && (
        <div className="flex items-end gap-4 touch-none">
          {/* Chat Satellite Button */}
          <button 
            onClick={() => setIsMinimized(false)}
            className="w-12 h-12 mb-4 rounded-full bg-slate-800/80 backdrop-blur border border-cyan-500/30 flex items-center justify-center text-cyan-400 hover:bg-slate-700 hover:scale-110 transition-all shadow-[0_0_15px_rgba(6,182,212,0.3)]"
            title="Open Text Chat"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
          </button>

          {/* Voice Orb */}
          <button 
            onClick={toggleVoice}
            className={`relative w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 ${isListening ? 'bg-gradient-to-br from-fuchsia-500 to-cyan-500 scale-105 shadow-[0_0_30px_rgba(192,38,211,0.8)]' : 'bg-gradient-to-br from-cyan-400 to-blue-600 shadow-[0_0_20px_rgba(6,182,212,0.6)] hover:scale-105'}`}
            title="Tap to Speak"
          >
            {/* Outer glow */}
            <div className={`absolute inset-0 rounded-full blur-xl transition-all duration-300 ${isListening ? 'bg-gradient-to-r from-fuchsia-600 to-cyan-600 opacity-100 scale-150 animate-pulse' : 'bg-gradient-to-r from-cyan-500 to-blue-500 opacity-60'}`}></div>
            
            {/* Inner orb */}
            <div className="relative z-10">
              {isListening ? (
                <svg className="w-8 h-8 text-white animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
              ) : (
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
              )}
            </div>
          </button>
        </div>
      )}

      {/* Maximized View */}
      {!isMinimized && (
        <>
          {/* Header */}
          <div className="p-4 border-b border-white/10 flex justify-between items-center bg-slate-900/50 cursor-pointer" onClick={() => setIsMinimized(true)}>
            <div className="flex items-center gap-2">
               <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></div>
               <span className="text-sm font-mono text-cyan-300 uppercase">Neural Link</span>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={(e) => { e.stopPropagation(); setIsMinimized(true); }}
                className="p-1 hover:bg-white/10 rounded"
              >
                <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-cyan-900 scrollbar-track-transparent">
            {messages.length === 0 && (
              <div className="text-center mt-20 opacity-50 select-none">
                <p className="text-cyan-200 font-mono text-sm">Awaiting input sequence...</p>
              </div>
            )}
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] p-3 rounded-2xl text-sm leading-relaxed shadow-lg ${
                    msg.role === 'user'
                      ? 'bg-cyan-600/20 text-cyan-50 border border-cyan-500/30 rounded-tr-none'
                      : 'bg-slate-800 text-slate-200 border border-slate-700 rounded-tl-none'
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}
            {isProcessing && (
              <div className="flex justify-start">
                 <div className="bg-slate-800 p-3 rounded-2xl rounded-tl-none border border-slate-700 flex gap-1 items-center">
                    <span className="text-xs text-fuchsia-400 mr-2 font-mono">THINKING</span>
                    <div className="w-1 h-1 bg-fuchsia-400 rounded-full animate-bounce"></div>
                    <div className="w-1 h-1 bg-fuchsia-400 rounded-full animate-bounce delay-100"></div>
                    <div className="w-1 h-1 bg-fuchsia-400 rounded-full animate-bounce delay-200"></div>
                 </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form onSubmit={handleSubmit} className="p-4 bg-slate-900/50 border-t border-white/10">
            <div className="relative flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask me anything..."
                  className="w-full bg-slate-800 border border-slate-600 rounded-full py-3 px-4 pl-4 pr-10 text-sm text-white focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all placeholder-slate-500"
                  disabled={isProcessing}
                />
                {/* Mic Button */}
                <button
                  type="button"
                  onClick={toggleVoice}
                  className={`absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full transition-all ${
                    isListening 
                      ? 'bg-red-500/20 text-red-400 animate-pulse ring-1 ring-red-500' 
                      : 'text-slate-400 hover:text-cyan-400'
                  }`}
                  title="Speak"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                </button>
              </div>

              <button
                type="submit"
                disabled={!input.trim() || isProcessing}
                className="p-3 bg-gradient-to-br from-cyan-500 to-blue-600 text-white rounded-full disabled:opacity-50 disabled:grayscale shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/40 transition-all transform hover:scale-105 active:scale-95"
              >
                <svg className="w-4 h-4 translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
              </button>
            </div>
          </form>
        </>
      )}
    </div>
  );
};