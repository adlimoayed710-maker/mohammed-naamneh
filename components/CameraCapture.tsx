import React, { useRef, useState, useCallback } from 'react';
import { Button } from './Button';

interface CameraCaptureProps {
  onCapture: (imageSrc: string) => void;
  onClose: () => void;
}

export const CameraCapture: React.FC<CameraCaptureProps> = ({ onCapture, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);

  const startCamera = useCallback(async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user' } 
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      setError("لا يمكن الوصول للكاميرا");
      console.error(err);
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  }, [stream]);

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1); // Mirror effect fix
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageSrc = canvas.toDataURL('image/jpeg', 0.9);
        stopCamera();
        onCapture(imageSrc);
      }
    }
  };

  React.useEffect(() => {
    startCamera();
    return () => stopCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-xl">
      <div className="w-full max-w-2xl p-6 bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl relative">
        <h3 className="text-xl font-bold text-white mb-4 text-center">التقاط صورة المريض</h3>
        
        {error ? (
          <div className="text-red-400 text-center p-8 border border-red-500/20 rounded-xl bg-red-500/10 mb-4">
            {error}
          </div>
        ) : (
          <div className="relative aspect-video bg-black rounded-xl overflow-hidden border-2 border-cyan-500/50 shadow-[0_0_30px_rgba(6,182,212,0.2)] mb-6 group">
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              className="w-full h-full object-cover transform -scale-x-100"
            />
            <canvas ref={canvasRef} className="hidden" />
            <div className="absolute inset-0 border-2 border-white/20 rounded-xl pointer-events-none">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-64 border-2 border-cyan-400/30 rounded-full"></div>
            </div>
          </div>
        )}

        <div className="flex justify-center gap-4">
          <Button variant="secondary" onClick={() => { stopCamera(); onClose(); }}>
            إلغاء
          </Button>
          {!error && (
            <Button onClick={capturePhoto} icon="📸">
              التقاط
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};