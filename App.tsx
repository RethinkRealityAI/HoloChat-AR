import React, { useState, useEffect, useRef } from 'react';
import { ControlPanel } from './components/ControlPanel';
import { ChatInterface } from './components/ChatInterface';
import { QRCodeModal } from './components/QRCodeModal';
import { RemoteControlOverlay } from './components/RemoteControlOverlay';
import { DEFAULT_MODELS } from './constants';
import { ChatMessage } from './types';
import { generateChatResponse } from './services/geminiService';

const App: React.FC = () => {
  const [modelUrl, setModelUrl] = useState<string>(DEFAULT_MODELS[0].url);
  const [modelName, setModelName] = useState<string>(DEFAULT_MODELS[0].name);
  const [animations, setAnimations] = useState<string[]>([]);
  const [currentAnimation, setCurrentAnimation] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [isAR, setIsAR] = useState(false);
  const [isRemoteControlActive, setIsRemoteControlActive] = useState(false);
  const [toastMessage, setToastMessage] = useState<{message: string, time: number} | null>(null);
  const lastGestureRef = useRef<string | null>(null);

  const [modelPosition, setModelPosition] = useState({ x: 0, y: 0, z: 0 });
  const [modelAngles, setModelAngles] = useState({ pitch: 0, yaw: 0, roll: 0 });
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [targetReticle, setTargetReticle] = useState<{x: number, y: number, name: string} | null>(null);

  const modelViewerRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => {
        setToastMessage(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  const initAudio = () => {
    if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    }
    if (audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume();
    }
  };

  const handleSelectModel = (url: string, name: string) => {
    setAnimations([]); 
    setCurrentAnimation(null);
    setMessages([]); 
    setModelUrl(url);
    setModelName(name);
  };

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setModelUrl(url);
      setModelName(file.name.replace('.glb', '').replace('.gltf', ''));
    }
  };

  const handleModelLoad = () => {
    const viewer = modelViewerRef.current;
    if (viewer && viewer.availableAnimations) {
      setAnimations(viewer.availableAnimations);
    }
  };

  const handleARStatus = (event: any) => {
    if (event.detail.status === 'session-started') {
      setIsAR(true);
    } else if (event.detail.status === 'not-presenting') {
      setIsAR(false);
    }
  };

  const lastGestureSpeechRef = useRef<number>(0);

  const handleGesture = async (gesture: string) => {
    if (gesture === lastGestureRef.current) return;
    lastGestureRef.current = gesture;

    if (gesture !== 'None') {
      setToastMessage({ message: `Neural Command: ${gesture}`, time: Date.now() });
    }

    let animToPlay = '';
    const animMap: { [key: string]: string[] } = {
      'Thumb_Up': ['yes', 'agree', 'nod', 'thumbs_up', 'thumbsup', 'dance', 'jump'],
      'Victory': ['wave', 'greet', 'hello', 'peace', 'victory', 'cheer'],
      'Closed_Fist': ['punch', 'fight', 'attack', 'walk', 'run', 'angry', 'no'],
      'Open_Palm': ['idle', 'stop', 'stand', 'wait']
    };

    if (animMap[gesture]) {
      for (const keyword of animMap[gesture]) {
        const match = animations.find(a => a.toLowerCase().includes(keyword));
        if (match) {
          animToPlay = match;
          break;
        }
      }
    }

    if (animToPlay) {
      handlePlayAnimation(animToPlay);
    } else if (gesture === 'Open_Palm') {
      handlePlayAnimation('');
    }

    const now = Date.now();
    if (gesture !== 'None' && (now - lastGestureSpeechRef.current > 8000)) {
       lastGestureSpeechRef.current = now;
       // Fast pre-determined responses, or we can use AI.
       // It's faster and more responsive to use pre-determined phrases with AI voice.
       const phraseMap: { [key: string]: string } = {
          'Thumb_Up': 'Systems nominal!',
          'Victory': 'Greetings! I see you.',
          'Closed_Fist': 'Ready for action.',
          'Open_Palm': 'Awaiting input.'
       };
       const phrase = phraseMap[gesture];
       if (phrase) {
          playSpeech(phrase, animToPlay || undefined);
       }
    }
  };

  const handleHeadPose = (yaw: number, pitch: number) => {
    setModelAngles({
      pitch: pitch,
      yaw: -yaw * 1.5, // Amplify yaw for better 3D turning tracking
      roll: 0
    });
  };

  const handlePlayAnimation = (animName: string) => {
    setCurrentAnimation(animName);
    const viewer = modelViewerRef.current;
    if (viewer) {
      viewer.animationName = animName;
      animName ? viewer.play() : viewer.pause();
    }
  };

  const playSpeech = (text: string, explicitAnimation?: string) => {
    if (!('speechSynthesis' in window)) return;
    
    // Stop any ongoing speech
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Try to find a good English voice
    const voices = window.speechSynthesis.getVoices();
    const englishVoice = voices.find(v => v.lang.startsWith('en-') && (v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Microsoft')));
    if (englishVoice) utterance.voice = englishVoice;
    
    utterance.rate = 1.1; // Slightly faster
    utterance.pitch = 1.2; // Slightly higher pitch for a "digital" feel
    
    const prevAnim = currentAnimation;
    
    if (!explicitAnimation) {
      const talkAnim = animations.find(a => 
        ['talk', 'speak', 'gesture', 'head'].some(keyword => a.toLowerCase().includes(keyword))
      );

      if (talkAnim) {
        handlePlayAnimation(talkAnim);
      }
    }
    
    utterance.onend = () => {
      handlePlayAnimation(prevAnim || "");
    };

    window.speechSynthesis.speak(utterance);
  };

  useEffect(() => {
    let stream: MediaStream | null = null;
    const startCamera = async () => {
      if (isRemoteControlActive) {
        setCameraStream(prev => {
          if (prev) prev.getTracks().forEach(t => t.stop());
          return null;
        });
        return;
      }

      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          setCameraError("Camera API not available");
          return;
        }
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        setCameraStream(stream);
        setCameraError(null);
      } catch (err: any) {
        setCameraError(err.message || "Camera access denied");
      }
    };
    startCamera();
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [isRemoteControlActive]);

  useEffect(() => {
    if (videoRef.current && cameraStream) {
      videoRef.current.srcObject = cameraStream;
    }
  }, [cameraStream]);

  const captureImage = async (): Promise<string | undefined> => {
    if (isAR && (window as any).xrSession) {
      return new Promise((resolve) => {
        const session = (window as any).xrSession;
        session.requestAnimationFrame(async (time: number, frame: any) => {
          try {
            const gl = session.renderState.baseLayer.context;
            if (!(window as any).XRWebGLBinding) {
              console.warn("XRWebGLBinding not available");
              resolve(undefined);
              return;
            }
            if (!(window as any).xrBinding) {
              (window as any).xrBinding = new (window as any).XRWebGLBinding(session, gl);
            }
            const binding = (window as any).xrBinding;
            
            const refSpace = await session.requestReferenceSpace('local');
            const pose = frame.getViewerPose(refSpace);
            
            if (pose && pose.views.length > 0) {
              const view = pose.views[0];
              if (view.camera) {
                const cameraTexture = binding.getCameraImage(view.camera);
                if (!cameraTexture) {
                  resolve(undefined);
                  return;
                }
                const width = view.camera.width;
                const height = view.camera.height;
                
                // Save current state
                const currentFb = gl.getParameter(gl.FRAMEBUFFER_BINDING);
                const currentProgram = gl.getParameter(gl.CURRENT_PROGRAM);
                const currentActiveTexture = gl.getParameter(gl.ACTIVE_TEXTURE);
                const currentTextureBinding = gl.getParameter(gl.TEXTURE_BINDING_2D);
                const currentViewport = gl.getParameter(gl.VIEWPORT);

                const fb = gl.createFramebuffer();
                gl.bindFramebuffer(gl.FRAMEBUFFER, fb);

                const targetTexture = gl.createTexture();
                gl.bindTexture(gl.TEXTURE_2D, targetTexture);
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
                gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, targetTexture, 0);

                const vsSource = `
                  attribute vec2 a_position;
                  varying vec2 v_texcoord;
                  void main() {
                    gl_Position = vec4(a_position, 0.0, 1.0);
                    v_texcoord = a_position * 0.5 + 0.5;
                  }
                `;
                const fsSource = `
                  precision mediump float;
                  varying vec2 v_texcoord;
                  uniform sampler2D u_texture;
                  void main() {
                    gl_FragColor = texture2D(u_texture, v_texcoord);
                  }
                `;
                
                const vs = gl.createShader(gl.VERTEX_SHADER)!;
                gl.shaderSource(vs, vsSource);
                gl.compileShader(vs);
                
                const fs = gl.createShader(gl.FRAGMENT_SHADER)!;
                gl.shaderSource(fs, fsSource);
                gl.compileShader(fs);
                
                const program = gl.createProgram()!;
                gl.attachShader(program, vs);
                gl.attachShader(program, fs);
                gl.linkProgram(program);
                gl.useProgram(program);

                const buffer = gl.createBuffer();
                gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
                gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
                  -1.0, -1.0,
                   1.0, -1.0,
                  -1.0,  1.0,
                  -1.0,  1.0,
                   1.0, -1.0,
                   1.0,  1.0
                ]), gl.STATIC_DRAW);
                
                const positionLocation = gl.getAttribLocation(program, "a_position");
                gl.enableVertexAttribArray(positionLocation);
                gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

                gl.activeTexture(gl.TEXTURE0);
                gl.bindTexture(gl.TEXTURE_2D, cameraTexture);
                const textureLocation = gl.getUniformLocation(program, "u_texture");
                gl.uniform1i(textureLocation, 0);

                gl.viewport(0, 0, width, height);
                gl.drawArrays(gl.TRIANGLES, 0, 6);

                const pixels = new Uint8Array(width * height * 4);
                gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

                // Cleanup
                gl.deleteBuffer(buffer);
                gl.deleteProgram(program);
                gl.deleteShader(vs);
                gl.deleteShader(fs);
                gl.deleteTexture(targetTexture);
                gl.deleteFramebuffer(fb);

                // Restore state
                gl.bindFramebuffer(gl.FRAMEBUFFER, currentFb);
                if (currentProgram) gl.useProgram(currentProgram);
                gl.activeTexture(currentActiveTexture);
                gl.bindTexture(gl.TEXTURE_2D, currentTextureBinding);
                if (currentViewport) gl.viewport(currentViewport[0], currentViewport[1], currentViewport[2], currentViewport[3]);

                const canvas2d = document.createElement('canvas');
                canvas2d.width = width;
                canvas2d.height = height;
                const ctx = canvas2d.getContext('2d');
                if (!ctx) {
                  resolve(undefined);
                  return;
                }
                
                const imageData = ctx.createImageData(width, height);
                for (let y = 0; y < height; y++) {
                  for (let x = 0; x < width; x++) {
                    const srcIndex = (y * width + x) * 4;
                    const destIndex = ((height - y - 1) * width + x) * 4;
                    imageData.data[destIndex] = pixels[srcIndex];
                    imageData.data[destIndex + 1] = pixels[srcIndex + 1];
                    imageData.data[destIndex + 2] = pixels[srcIndex + 2];
                    imageData.data[destIndex + 3] = pixels[srcIndex + 3];
                  }
                }
                ctx.putImageData(imageData, 0, 0);
                resolve(canvas2d.toDataURL('image/jpeg').split(',')[1]);
                return;
              }
            }
            resolve(undefined);
          } catch (err) {
            console.error("Error capturing AR camera frame:", err);
            resolve(undefined);
          }
        });
      });
    } else if (videoRef.current && cameraStream) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return undefined;
      ctx.drawImage(videoRef.current, 0, 0);
      return canvas.toDataURL('image/jpeg').split(',')[1];
    }
    return undefined;
  };

  const handleSendMessage = async (text: string) => {
    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', text, timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setIsProcessing(true);

    const imageBase64 = await captureImage();

    const response = await generateChatResponse(messages, text, modelName, animations, imageBase64);
    const responseText = response.text;
    
    if (response.walkTarget) {
      const { x, y, name } = response.walkTarget;
      
      const targetX = (x / 100) * window.innerWidth;
      const targetY = (y / 100) * window.innerHeight;
      
      setTargetReticle({ x: targetX, y: targetY, name });

      const viewer = modelViewerRef.current;
      if (viewer) {
        const startX = modelPosition.x;
        const startZ = modelPosition.z;
        
        // Map 0-100% to roughly -2 to +2 meters
        const dx = ((x - 50) / 50) * 2;
        const dz = ((y - 50) / 50) * 2;
        
        const endX = startX + dx;
        const endZ = startZ + dz;

        const angleRad = Math.atan2(dx, dz);
        const angleDeg = angleRad * (180 / Math.PI);
        setModelAngles(prev => ({ ...prev, yaw: angleDeg }));

        const walkAnim = animations.find(a => a.toLowerCase().includes('walk') || a.toLowerCase().includes('run'));
        if (walkAnim) {
          handlePlayAnimation(walkAnim);
        }

        const startTime = performance.now();
        const duration = 4000;

        const animate = (time: number) => {
          const elapsed = time - startTime;
          const progress = Math.min(elapsed / duration, 1);
          
          setModelPosition({
            x: startX + (endX - startX) * progress,
            y: 0,
            z: startZ + (endZ - startZ) * progress
          });
          
          if (progress < 1) {
            requestAnimationFrame(animate);
          } else {
            handlePlayAnimation(currentAnimation || animations[0] || "");
            setTargetReticle(null);
          }
        };
        requestAnimationFrame(animate);
      } else {
        setTimeout(() => setTargetReticle(null), 4000);
      }
    } else if (response.animationToPlay) {
      handlePlayAnimation(response.animationToPlay);
    }

    const modelMsg: ChatMessage = { id: (Date.now() + 1).toString(), role: 'model', text: responseText, timestamp: Date.now() };
    setMessages(prev => [...prev, modelMsg]);

    setIsProcessing(false);
    playSpeech(responseText, response.animationToPlay || (response.walkTarget ? 'walk' : undefined));
  };

  const handleEnterAR = () => {
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (isMobile && modelViewerRef.current) {
      modelViewerRef.current.activateAR();
    } else {
      setShowQR(true);
    }
  };

  useEffect(() => {
    const viewer = modelViewerRef.current;
    if (viewer) {
      viewer.addEventListener('load', handleModelLoad);
      viewer.addEventListener('ar-status', handleARStatus);
    }
    return () => {
      viewer?.removeEventListener('load', handleModelLoad);
      viewer?.removeEventListener('ar-status', handleARStatus);
    };
  }, [modelUrl]);

  return (
    <div className="flex h-screen w-screen bg-slate-950 text-white font-sans overflow-hidden" onClick={initAudio}>
      <ControlPanel
        onSelectModel={handleSelectModel}
        onUpload={handleUpload}
        animations={animations}
        currentAnimation={currentAnimation}
        onPlayAnimation={handlePlayAnimation}
        activeModelName={modelName}
        isRemoteControlActive={isRemoteControlActive}
        onToggleRemoteControl={() => setIsRemoteControlActive(!isRemoteControlActive)}
      />

      <div className="flex-1 relative bg-slate-950 overflow-hidden transition-colors duration-1000">
        {/* Background */}
        <div className="absolute inset-0 z-0">
          {cameraStream ? (
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              muted 
              className="w-full h-full object-cover opacity-80"
            />
          ) : (
            <div className={`w-full h-full relative transition-all duration-1000 ${isRemoteControlActive ? 'bg-slate-900' : 'bg-slate-950'}`}>
               <div className="absolute inset-0 [mask-image:linear-gradient(to_bottom,transparent,black)]">
                  <div className={`absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] [transform:perspective(500px)_rotateX(60deg)] [transform-origin:center_bottom] transition-all duration-1000 ${isRemoteControlActive ? 'opacity-100' : 'opacity-0'}`}></div>
               </div>
               
               {!isRemoteControlActive && (
                 <div className="absolute inset-0 opacity-10 pointer-events-none transition-opacity duration-1000" 
                      style={{ backgroundImage: 'radial-gradient(circle, #06b6d4 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
               )}

               {isRemoteControlActive && (
                 <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(16,185,129,0.15),transparent_50%)] pointer-events-none transition-opacity duration-1000 animate-pulse" />
               )}
            </div>
          )}
        </div>

        {targetReticle && (
          <div 
            className="absolute z-10 pointer-events-none flex flex-col items-center justify-center"
            style={{ left: targetReticle.x, top: targetReticle.y, transform: 'translate(-50%, -50%)' }}
          >
            <div className="w-16 h-16 border-2 border-fuchsia-500 rounded-full animate-ping absolute"></div>
            <div className="w-16 h-16 border-4 border-fuchsia-500 rounded-full flex items-center justify-center relative">
              <div className="w-2 h-2 bg-fuchsia-500 rounded-full"></div>
            </div>
            <span className="mt-2 text-fuchsia-400 font-mono text-xs bg-slate-900/80 px-2 py-1 rounded border border-fuchsia-500/30">
              TARGET: {targetReticle.name.toUpperCase()}
            </span>
          </div>
        )}

        <div className="w-full h-full relative z-10 flex items-center justify-center">
          <model-viewer
            key={modelUrl}
            ref={modelViewerRef}
            src={modelUrl}
            class="w-full h-full"
            style={{ width: '100%', height: '100%', display: 'block', outline: 'none' }}
            camera-controls
            auto-rotate
            shadow-intensity="2"
            exposure="1.2"
            environment-image="neutral"
            orientation={`${modelAngles.pitch}deg ${modelAngles.yaw}deg ${modelAngles.roll}deg`}
            ar
            ar-modes="webxr scene-viewer quick-look"
            ar-placement="floor"
            autoplay
            crossorigin="anonymous"
            camera-orbit="auto auto auto"
            min-camera-orbit="auto auto auto"
            max-camera-orbit="auto auto auto"
          >
             <div slot="poster" className="absolute inset-0 flex items-center justify-center bg-transparent">
                <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
             </div>
             <div slot="ar-button" style={{ display: 'none' }}></div> 

             {/* AR UI Overlay */}
             {isAR && (
               <div slot="ar-ui" className="absolute inset-0 pointer-events-none">
                 <div className="pointer-events-auto w-full h-full">
                   <ChatInterface messages={messages} onSendMessage={handleSendMessage} isProcessing={isProcessing} />
                 </div>
               </div>
             )}
          </model-viewer>

          {/* Glow Overlay */}
          <div className={`absolute inset-0 pointer-events-none transition-all duration-300 z-30 ${toastMessage ? 'shadow-[inset_0_0_150px_rgba(16,185,129,0.3)] bg-emerald-500/5' : ''}`} />

          {/* Toast Message */}
          {toastMessage && (
            <div className="absolute top-10 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
              <div className="bg-emerald-900/80 border border-emerald-400 text-emerald-100 px-6 py-3 rounded-full backdrop-blur-md shadow-[0_0_20px_rgba(16,185,129,0.4)] animate-in fade-in slide-in-from-top-4 font-mono font-bold tracking-widest text-sm flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
                {toastMessage.message}
              </div>
            </div>
          )}

          {/* 3D UI Overlay */}
          {!isAR && (
            <div className="absolute inset-0 pointer-events-none z-20">
              <div className="absolute top-6 right-6 pointer-events-auto">
                <button 
                  onClick={handleEnterAR}
                  className="flex items-center gap-2 bg-fuchsia-600 hover:bg-fuchsia-500 text-white font-bold py-3 px-8 rounded-full shadow-[0_0_30px_rgba(192,38,211,0.4)] border border-fuchsia-400/50 transition-all active:scale-95"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2 1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5" /></svg>
                  <span>Initialize AR</span>
                </button>
              </div>

              <div className="pointer-events-auto w-full h-full">
                <ChatInterface messages={messages} onSendMessage={handleSendMessage} isProcessing={isProcessing} />
              </div>
            </div>
          )}
        </div>

        <QRCodeModal isOpen={showQR} onClose={() => setShowQR(false)} url={window.location.href} />
        
        {isRemoteControlActive && (
          <RemoteControlOverlay onGesture={handleGesture} onHeadPose={handleHeadPose} />
        )}

        <div className="absolute bottom-4 left-4 text-[10px] text-slate-500 pointer-events-none hidden md:block">
            <p>HoloChat Neural Interface • WebXR v3.2</p>
        </div>
      </div>
    </div>
  );
};

export default App;
