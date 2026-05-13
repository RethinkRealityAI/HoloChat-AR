import React, { useRef, useState, useEffect } from 'react';
import { motion, useDragControls } from 'framer-motion';
import { Camera, SwitchCamera } from 'lucide-react';
import { useMediaPipe } from '../hooks/useMediaPipe';

interface RemoteControlOverlayProps {
  onGesture: (gesture: string) => void;
  onHeadPose: (yaw: number, pitch: number) => void;
}

export const RemoteControlOverlay: React.FC<RemoteControlOverlayProps> = ({ onGesture, onHeadPose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [isExpanded, setIsExpanded] = useState(false);
  const [debugText, setDebugText] = useState<string>('Initializing...');
  const { gestureRecognizer, faceLandmarker, isModelLoading } = useMediaPipe();
  const requestRef = useRef<number>(0);
  const lastVideoTimeRef = useRef<number>(-1);
  const dragControls = useDragControls();
  
  const sizeMultiplier = isExpanded ? 1.5 : 1;
  const width = 240 * sizeMultiplier;
  const height = 320 * sizeMultiplier;
  
  // Start Camera
  useEffect(() => {
    let currentStream: MediaStream | null = null;
    
    const initCamera = async () => {
      try {
        if (stream) {
          stream.getTracks().forEach(t => t.stop());
        }
        currentStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode }
        });
        setStream(currentStream);
        if (videoRef.current) {
          videoRef.current.srcObject = currentStream;
        }
      } catch (err) {
        console.error("Remote camera error:", err);
      }
    };
    initCamera();

    return () => {
      if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [facingMode]);

  // Processing loop
  useEffect(() => {
    const processVideo = () => {
      if (!isModelLoading && videoRef.current && gestureRecognizer && faceLandmarker) {
        const video = videoRef.current;
        if (video.currentTime !== lastVideoTimeRef.current && video.readyState >= 2 && video.videoWidth > 0) {
          lastVideoTimeRef.current = video.currentTime;
          let startTimeMs = performance.now();
          
          try {
            // Detect Hand Gestures
            const gestureResult = gestureRecognizer.recognizeForVideo(video, startTimeMs);
            if (gestureResult && gestureResult.gestures.length > 0) {
               const categoryName = gestureResult.gestures[0][0].categoryName;
               const score = gestureResult.gestures[0][0].score;
               setDebugText(`Gesture: ${categoryName} (${(score*100).toFixed(0)}%)`);
               if (score > 0.6 && categoryName !== 'None') {
                  onGesture(categoryName);
               } else {
                  onGesture('None');
               }
            } else {
               setDebugText('No Hand Detected');
               onGesture('None');
            }

            // Detect Face
            const faceResult = faceLandmarker.detectForVideo(video, startTimeMs);
            if (faceResult && faceResult.facialTransformationMatrixes && faceResult.facialTransformationMatrixes.length > 0) {
               const matrix = faceResult.facialTransformationMatrixes[0].data;
               // Extract rough yaw and pitch from the rotation matrix
               // The 4x4 matrix is column-major.
               // m00, m10, m20, m30
               // m01, m11, m21, m31
               // m02, m12, m22, m32
               // m03, m13, m23, m33
               const r11 = matrix[0], r21 = matrix[1], r31 = matrix[2];
               const r12 = matrix[4], r22 = matrix[5], r32 = matrix[6];
               const r13 = matrix[8], r23 = matrix[9], r33 = matrix[10];

               const pitch = Math.atan2(-r32, r33) * (180 / Math.PI);
               const yaw = Math.atan2(r31, Math.sqrt(r32*r32 + r33*r33)) * (180 / Math.PI);
               
               // Invert yaw if facing front camera so it mirrors nicely
               const adjustedYaw = facingMode === 'user' ? -yaw : yaw;
               onHeadPose(adjustedYaw, pitch);
            }
          } catch (error: any) {
            if (error && error.message && error.message.includes('procrustes_solver')) {
              // Ignore known face geometry calculation failure
            } else {
              console.error("MediaPipe detection error:", error);
            }
          }
        }
      }
      requestRef.current = requestAnimationFrame(processVideo);
    };

    requestRef.current = requestAnimationFrame(processVideo);
    return () => cancelAnimationFrame(requestRef.current);
  }, [isModelLoading, gestureRecognizer, faceLandmarker, facingMode]);

  return (
    <motion.div
      drag
      dragConstraints={{ left: -300, right: 300, top: -100, bottom: 800 }}
      dragControls={dragControls}
      dragMomentum={false}
      initial={{ opacity: 0, scale: 0.8, y: 0 }}
      animate={{ opacity: 1, scale: 1, width, height }}
      exit={{ opacity: 0, scale: 0.8 }}
      className="absolute top-6 right-6 z-40 bg-slate-900 border-2 border-emerald-500/50 rounded-2xl shadow-[0_0_20px_rgba(16,185,129,0.3)] flex flex-col overflow-hidden"
    >
      <div 
        className="w-full h-8 min-h-8 bg-emerald-500/20 border-b border-emerald-500/30 flex justify-between items-center px-3 cursor-grab active:cursor-grabbing"
        onPointerDown={(e) => dragControls.start(e)}
      >
        <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-2 pointer-events-none">
           <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></div>
           Telepresence
        </span>
        <div className="flex gap-3">
          <button 
            onPointerDown={(e) => e.stopPropagation()}
            className="text-emerald-400 hover:text-emerald-200 transition-colors"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isExpanded ? "M6 18L18 6M6 6l12 12" : "M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"} /></svg>
          </button>
          <button 
            onPointerDown={(e) => e.stopPropagation()}
            className="text-emerald-400 hover:text-emerald-200 transition-colors"
            onClick={() => setFacingMode(prev => prev === 'user' ? 'environment' : 'user')}
          >
            <SwitchCamera size={16} />
          </button>
        </div>
      </div>

      <div className="flex-1 relative bg-black">
        {isModelLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
             <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mb-2"></div>
             <p className="text-[10px] text-emerald-400/70 font-mono">Loading Neural Modules...</p>
          </div>
        )}
        <video 
          ref={videoRef} 
          autoPlay 
          playsInline 
          muted 
          className="w-full h-full object-cover"
          style={{ transform: facingMode === 'user' ? 'scaleX(-1)' : 'none' }}
        />
        {/* Helper overlay text */}
        <div className="absolute bottom-2 left-0 w-full text-center pointer-events-none">
           <p className="text-xs text-white font-mono mb-1 font-bold bg-black/50 inline-block px-2 py-1 rounded">{debugText}</p>
           <p className="text-[10px] text-emerald-400 font-mono drop-shadow-md bg-black/50 inline-block px-1 rounded block mx-auto w-max">
             Gestures: Thumb Up, Peace, Fist, Open Palm
           </p>
        </div>
      </div>
    </motion.div>
  );
};
