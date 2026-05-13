import { useState, useEffect, useRef } from 'react';
import { FilesetResolver, GestureRecognizer, FaceLandmarker } from '@mediapipe/tasks-vision';

export const useMediaPipe = () => {
  const [gestureRecognizer, setGestureRecognizer] = useState<GestureRecognizer | null>(null);
  const [faceLandmarker, setFaceLandmarker] = useState<FaceLandmarker | null>(null);
  const [isModelLoading, setIsModelLoading] = useState(true);

  useEffect(() => {
    // Suppress harmless MediaPipe C++ WASM warnings globally
    const originalWarn = console.warn;
    console.warn = (...args) => {
      if (typeof args[0] === 'string' && (args[0].includes('Feedback manager') || args[0].includes('Using NORM_RECT without IMAGE_DIMENSIONS'))) {
        return;
      }
      originalWarn.apply(console, args);
    };

    const originalError = console.error;
    console.error = (...args) => {
      if (typeof args[0] === 'string' && (args[0].includes('procrustes_solver.cc:206') || args[0].includes('Design matrix norm is too small') || args[0].includes('CalculatorGraph::Run() failed'))) {
        return;
      }
      originalError.apply(console, args);
    };

    const originalLog = console.log;
    console.log = (...args) => {
      if (typeof args[0] === 'string' && args[0].includes('Created TensorFlow Lite XNNPACK delegate for CPU')) {
        return;
      }
      originalLog.apply(console, args);
    };

    const originalInfo = console.info;
    console.info = (...args) => {
      if (typeof args[0] === 'string' && args[0].includes('Created TensorFlow Lite XNNPACK delegate for CPU')) {
        return;
      }
      originalInfo.apply(console, args);
    };

    const loadModels = async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
        );

        const gr = await GestureRecognizer.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              "https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task",
            delegate: "GPU"
          },
          runningMode: "VIDEO",
          numHands: 1
        });

        const fl = await FaceLandmarker.createFromOptions(vision, {
           baseOptions: {
             modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
             delegate: "GPU"
           },
           runningMode: "VIDEO",
           outputFaceBlendshapes: false,
           outputFacialTransformationMatrixes: true,
           numFaces: 1
        });

        setGestureRecognizer(gr);
        setFaceLandmarker(fl);
        setIsModelLoading(false);
      } catch (err) {
        console.error("Failed to load MediaPipe models:", err);
      }
    };

    loadModels();
  }, []);

  return { gestureRecognizer, faceLandmarker, isModelLoading };
};
