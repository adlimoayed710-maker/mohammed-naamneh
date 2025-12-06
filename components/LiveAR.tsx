import React, { useRef, useState, useEffect, useCallback } from 'react';
import { SmileStyle, ToothShade } from '../types';
import { generateSmile } from '../services/geminiService';
import { Button } from './Button';
import { FilesetResolver, FaceLandmarker, FaceLandmarkerResult } from "@mediapipe/tasks-vision";

interface LiveARProps {
  onCapture: (original: string, generated: string, style: SmileStyle, shade: ToothShade) => void;
  onClose: () => void;
}

// Transform state for stabilizing the AI overlay
interface TransformState {
  x: number;
  y: number;
  scale: number;
  rotation: number;
}

export const LiveAR: React.FC<LiveARProps> = ({ onCapture, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null); // For processing
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null); // For HUD drawing
  const [stream, setStream] = useState<MediaStream | null>(null);
  
  // AI Image State
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isActive, setIsActive] = useState(true);
  
  // Tracking & Stabilization State
  const [landmarker, setLandmarker] = useState<FaceLandmarker | null>(null);
  const [trackingReady, setTrackingReady] = useState(false);
  const [faceDetected, setFaceDetected] = useState(false);
  const snapshotLandmarksRef = useRef<any>(null); // Landmarks when the AI image was generated
  const [overlayTransform, setOverlayTransform] = useState<TransformState>({ x: 0, y: 0, scale: 1, rotation: 0 });
  const [isAlignmentStable, setIsAlignmentStable] = useState(true);

  // Settings state
  const [selectedStyle, setSelectedStyle] = useState<SmileStyle>(SmileStyle.HOLLYWOOD);
  const [selectedShade, setSelectedShade] = useState<ToothShade>(ToothShade.BL1);

  // Refs for loop access
  const stateRef = useRef({
    selectedStyle,
    selectedShade,
    isActive,
    isProcessing,
    processedImage
  });

  useEffect(() => {
    stateRef.current = { selectedStyle, selectedShade, isActive, isProcessing, processedImage };
  }, [selectedStyle, selectedShade, isActive, isProcessing, processedImage]);

  // 1. Initialize MediaPipe Face Landmarker
  useEffect(() => {
    const initLandmarker = async () => {
      try {
        const filesetResolver = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.8/wasm"
        );
        const faceLandmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
          baseOptions: {
            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task`,
            delegate: "GPU"
          },
          outputFaceBlendshapes: false,
          runningMode: "VIDEO",
          numFaces: 1
        });
        setLandmarker(faceLandmarker);
        setTrackingReady(true);
      } catch (e) {
        console.error("Failed to load FaceLandmarker", e);
      }
    };
    initLandmarker();
  }, []);

  // 2. Start Camera
  useEffect(() => {
    const startCamera = async () => {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } } 
        });
        setStream(mediaStream);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      } catch (err) {
        console.error("Camera access denied:", err);
      }
    };
    startCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // 3. Tracking Loop (Animation Frame)
  useEffect(() => {
    if (!landmarker || !videoRef.current || !trackingReady) return;

    let requestID: number;
    const video = videoRef.current;
    
    const trackFrame = () => {
      if (video.videoWidth > 0 && video.videoHeight > 0) {
        const startTimeMs = performance.now();
        const results = landmarker.detectForVideo(video, startTimeMs);

        // Update detection state
        setFaceDetected(results.faceLandmarks.length > 0);

        // Draw HUD
        drawFuturisticHUD(results);

        // Calculate Stabilization Transform
        if (results.faceLandmarks.length > 0 && snapshotLandmarksRef.current) {
          calculateTransform(results.faceLandmarks[0], snapshotLandmarksRef.current);
        } else if (!stateRef.current.processedImage) {
           // Reset if no image
           setOverlayTransform({ x: 0, y: 0, scale: 1, rotation: 0 });
        }
      }
      requestID = requestAnimationFrame(trackFrame);
    };

    trackFrame();
    return () => cancelAnimationFrame(requestID);
  }, [landmarker, trackingReady]);

  // Helper: Calculate Transform between Current and Snapshot
  const calculateTransform = (currentLandmarks: any[], snapshotLandmarks: any[]) => {
    // We use specific landmarks for stable tracking:
    // 1 (Nose Tip), 33 (Left Eye inner), 263 (Right Eye inner), 152 (Chin)
    
    // 1. Position Delta (Translation) - based on Nose Tip (Index 1)
    const videoWidth = videoRef.current?.videoWidth || 1;
    const videoHeight = videoRef.current?.videoHeight || 1;
    
    const currNose = currentLandmarks[1];
    const snapNose = snapshotLandmarks[1];

    const dx = (currNose.x - snapNose.x) * videoWidth;
    const dy = (currNose.y - snapNose.y) * videoHeight;

    // 2. Scale Delta - based on eye distance
    const getDist = (p1: any, p2: any) => Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
    
    const currEyeDist = getDist(currentLandmarks[33], currentLandmarks[263]);
    const snapEyeDist = getDist(snapshotLandmarks[33], snapshotLandmarks[263]);
    const scale = currEyeDist / (snapEyeDist || 1);

    // 3. Rotation Delta - based on angle between eyes
    const getAngle = (p1: any, p2: any) => Math.atan2(p2.y - p1.y, p2.x - p1.x);
    const currAngle = getAngle(currentLandmarks[33], currentLandmarks[263]);
    const snapAngle = getAngle(snapshotLandmarks[33], snapshotLandmarks[263]);
    const rotation = currAngle - snapAngle;

    // Safety threshold
    const totalMovement = Math.abs(dx) + Math.abs(dy);
    if (totalMovement > 200) { 
        setIsAlignmentStable(false);
    } else {
        setIsAlignmentStable(true);
        setOverlayTransform({ x: dx, y: dy, scale, rotation });
    }
  };

  const drawFuturisticHUD = (results: FaceLandmarkerResult) => {
    const canvas = overlayCanvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Mirror drawing context to match mirrored video
    ctx.save();
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);

    if (results.faceLandmarks.length > 0) {
      const landmarks = results.faceLandmarks[0];
      
      // Draw Mouth Box
      const lipsUpper = landmarks[13];
      const lipsLower = landmarks[14];
      const mouthLeft = landmarks[61];
      const mouthRight = landmarks[291];
      
      const mx = mouthLeft.x * canvas.width;
      const my = lipsUpper.y * canvas.height - 20;
      const mw = (mouthRight.x - mouthLeft.x) * canvas.width;
      const mh = (lipsLower.y - lipsUpper.y) * canvas.height + 40;
      
      // Draw brackets around mouth
      ctx.lineWidth = 2;
      ctx.strokeStyle = stateRef.current.isProcessing ? '#bc13fe' : '#00f3ff'; 
      ctx.shadowBlur = 10;
      ctx.shadowColor = ctx.strokeStyle;

      ctx.beginPath();
      // TL
      ctx.moveTo(mx - 10, my + 10);
      ctx.lineTo(mx - 10, my - 10);
      ctx.lineTo(mx + 10, my - 10);
      // TR
      ctx.moveTo(mx + mw - 10, my - 10);
      ctx.lineTo(mx + mw + 10, my - 10);
      ctx.lineTo(mx + mw + 10, my + 10);
      // BL
      ctx.moveTo(mx - 10, my + mh - 10);
      ctx.lineTo(mx - 10, my + mh + 10);
      ctx.lineTo(mx + 10, my + mh + 10);
      // BR
      ctx.moveTo(mx + mw - 10, my + mh + 10);
      ctx.lineTo(mx + mw + 10, my + mh + 10);
      ctx.lineTo(mx + mw + 10, my + mh - 10);
      ctx.stroke();

      // Connecting dots
      ctx.fillStyle = '#fff';
      [1, 152, 263, 33, 61, 291].forEach(idx => {
          const p = landmarks[idx];
          ctx.beginPath();
          ctx.arc(p.x * canvas.width, p.y * canvas.height, 2, 0, 2 * Math.PI);
          ctx.fill();
      });

    } else {
        // Draw "Scanning" text
        ctx.scale(-1, 1); // Flip back for text
        ctx.translate(-canvas.width, 0);
        
        ctx.font = "20px Cairo";
        ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
        ctx.textAlign = "center";
        ctx.fillText("جاري البحث عن وجه...", canvas.width / 2, canvas.height / 2);
    }
    ctx.restore();
  };

  // 4. AI Processing Logic
  const runGenAI = useCallback(async () => {
    const { isActive, isProcessing, selectedStyle, selectedShade } = stateRef.current;
    
    // Guard clauses
    if (!isActive || isProcessing || !videoRef.current || !canvasRef.current || !landmarker || !faceDetected) {
      return;
    }

    setIsProcessing(true);

    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      // Use higher resolution for AI
      canvas.width = 1280; 
      canvas.height = 720;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Draw current video frame to canvas
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // CRITICAL: Update anchor to current frame
        const startTimeMs = performance.now();
        const snapshotResult = landmarker.detectForVideo(video, startTimeMs);
        if (snapshotResult.faceLandmarks.length > 0) {
            snapshotLandmarksRef.current = snapshotResult.faceLandmarks[0];
            setOverlayTransform({ x: 0, y: 0, scale: 1, rotation: 0 });
        }

        const imageBase64 = canvas.toDataURL('image/jpeg', 0.85);
        
        // Generate Smile
        const result = await generateSmile(imageBase64, selectedStyle, selectedShade);
        setProcessedImage(result);
      }
    } catch (error) {
      console.error("Frame processing error:", error);
    } finally {
      setIsProcessing(false);
    }
  }, [faceDetected, landmarker]);

  // 5. Automatic Loop
  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;
    let shouldRun = true;

    const loop = async () => {
      if (!shouldRun) return;
      await runGenAI();
      // Wait 3 seconds between auto-updates to allow stability, 
      // but interactions will trigger immediate updates.
      timeoutId = setTimeout(loop, 3000); 
    };

    loop();

    return () => {
      shouldRun = false;
      clearTimeout(timeoutId);
    };
  }, [runGenAI]);

  // 6. Reactive Update on Settings Change
  useEffect(() => {
    // Trigger immediately when user changes style or shade
    if(stateRef.current.isActive && !stateRef.current.isProcessing) {
        runGenAI();
    }
  }, [selectedStyle, selectedShade, runGenAI]);


  const handleCapture = () => {
    if (processedImage && canvasRef.current && videoRef.current) {
       // Capture high res original
       const video = videoRef.current;
       const canvas = canvasRef.current;
       canvas.width = video.videoWidth;
       canvas.height = video.videoHeight;
       const ctx = canvas.getContext('2d');
       if (ctx) {
          ctx.translate(canvas.width, 0);
          ctx.scale(-1, 1);
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const original = canvas.toDataURL('image/jpeg', 0.95);
          onCapture(original, processedImage, selectedStyle, selectedShade);
       }
    }
  };

  const toggleActive = () => {
    setIsActive(!isActive);
    if (!isActive) {
      setProcessedImage(null);
      setOverlayTransform({ x: 0, y: 0, scale: 1, rotation: 0 });
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Header HUD */}
      <div className="absolute top-0 left-0 right-0 p-4 z-20 flex justify-between items-start bg-gradient-to-b from-black/80 to-transparent">
         <div className="flex gap-2">
            <Button variant="secondary" onClick={onClose} className="!px-3">
              <span className="text-xl">✕</span>
            </Button>
            <div className="px-4 py-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 backdrop-blur-md flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${faceDetected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></span>
              <span className="text-cyan-400 font-mono text-sm hidden md:inline">
                {faceDetected ? 'TARGET LOCKED' : 'SEARCHING...'}
              </span>
            </div>
         </div>
         
         {/* Live Toggle */}
         <button 
           onClick={toggleActive}
           className={`px-6 py-2 rounded-xl font-bold transition-all border ${isActive ? 'bg-green-500/20 text-green-400 border-green-500' : 'bg-red-500/20 text-red-400 border-red-500'}`}
         >
           {isActive ? 'إيقاف مؤقت' : 'استئناف'}
         </button>
      </div>

      {/* Main Viewport */}
      <div className="relative flex-1 bg-black overflow-hidden flex items-center justify-center">
        {/* Container to handle Aspect Ratio */}
        <div className="relative w-full h-full max-w-[1280px] max-h-[720px] aspect-video">
            {/* Video Feed (Source) */}
            <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            muted
            className="absolute inset-0 w-full h-full object-cover transform -scale-x-100"
            />
            
            {/* HUD Overlay Canvas */}
            <canvas 
                ref={overlayCanvasRef}
                className="absolute inset-0 w-full h-full pointer-events-none z-20"
            />

            {/* Hidden Processing Canvas - REQUIRED */}
            <canvas ref={canvasRef} className="hidden" />

            {/* Processed Overlay with AR Transform */}
            {processedImage && isAlignmentStable && (
            <div 
                className="absolute inset-0 z-10 overflow-hidden"
                style={{
                    transform: `
                        translate3d(${overlayTransform.x}px, ${overlayTransform.y}px, 0) 
                        scale(${overlayTransform.scale}) 
                        rotate(${-overlayTransform.rotation}rad)
                    `,
                    transformOrigin: 'center center',
                    transition: 'transform 0.1s linear' 
                }}
            >
                <img 
                    src={processedImage} 
                    alt="AI Preview" 
                    className="w-full h-full object-cover transform -scale-x-100 opacity-100" 
                />
            </div>
            )}
            
            {/* Loading Indicator */}
            {isProcessing && isActive && (
            <div className="absolute top-4 right-4 z-30">
                <div className="flex items-center gap-2 px-3 py-1 bg-black/60 rounded-full border border-cyan-500/30">
                    <div className="w-4 h-4 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-xs text-cyan-300 font-mono">AI PROCESSING</span>
                </div>
            </div>
            )}

            {/* Warning if tracking lost or unstable */}
            {processedImage && !isAlignmentStable && (
                <div className="absolute inset-0 flex items-center justify-center z-30 bg-black/20 backdrop-blur-[2px]">
                    <div className="text-red-400 font-mono text-xl border border-red-500/50 p-4 rounded bg-black/50">
                        RE-ALIGNING...
                    </div>
                </div>
            )}
        </div>
      </div>

      {/* Controls HUD */}
      <div className="absolute bottom-0 left-0 right-0 p-6 z-30 bg-gradient-to-t from-black via-black/90 to-transparent">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col md:flex-row gap-6 items-end">
            
            {/* Style Selector */}
            <div className="flex-1 w-full space-y-2">
              <label className="text-cyan-300 text-xs font-bold uppercase tracking-wider">نمط الابتسامة</label>
              <div className="flex overflow-x-auto gap-2 pb-2 scrollbar-hide">
                {Object.values(SmileStyle).map(style => (
                  <button
                    key={style}
                    onClick={() => setSelectedStyle(style as SmileStyle)}
                    className={`whitespace-nowrap px-4 py-2 rounded-lg text-sm transition-all border ${
                      selectedStyle === style 
                        ? 'bg-cyan-500 text-white border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.5)]' 
                        : 'bg-white/10 text-gray-300 border-white/10 hover:bg-white/20'
                    }`}
                  >
                    {style.split(' ')[0]}
                  </button>
                ))}
              </div>
            </div>

            {/* Shade Selector */}
            <div className="flex-1 w-full space-y-2">
              <label className="text-purple-300 text-xs font-bold uppercase tracking-wider">درجة اللون</label>
              <div className="flex overflow-x-auto gap-2 pb-2 scrollbar-hide">
                {Object.values(ToothShade).map(shade => (
                  <button
                    key={shade}
                    onClick={() => setSelectedShade(shade as ToothShade)}
                    className={`whitespace-nowrap px-4 py-2 rounded-lg text-sm transition-all border ${
                      selectedShade === shade 
                        ? 'bg-purple-500 text-white border-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.5)]' 
                        : 'bg-white/10 text-gray-300 border-white/10 hover:bg-white/20'
                    }`}
                  >
                    {shade.split(' ')[0]}
                  </button>
                ))}
              </div>
            </div>

            {/* Capture Action */}
            <div className="shrink-0 w-full md:w-auto">
               <Button 
                 onClick={handleCapture} 
                 disabled={!processedImage}
                 className="w-full md:w-auto h-16 !text-lg !rounded-2xl bg-gradient-to-r from-pink-500 to-rose-500 border-pink-400 shadow-[0_0_20px_rgba(236,72,153,0.5)]"
                 icon="✨"
               >
                 اعتماد الصورة
               </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};