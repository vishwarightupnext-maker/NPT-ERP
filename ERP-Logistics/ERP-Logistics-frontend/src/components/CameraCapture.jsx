import { useEffect, useRef, useState } from 'react';
import { Camera, RotateCcw, Check, X } from 'lucide-react';

// Reusable webcam capture — used for driver profile photo & live identity
// verification capture. Renders a live preview, lets the user snap a still
// frame to a canvas, then confirm (returns a File) or retake.
const CameraCapture = ({ title = 'Capture Photo', onCapture, onClose }) => {
  const videoRef  = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const [captured, setCaptured] = useState(null); // dataURL
  const [error, setError]       = useState('');

  useEffect(() => {
    let cancelled = false;
    navigator.mediaDevices?.getUserMedia({ video: { facingMode: 'user' } })
      .then(stream => {
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
      })
      .catch(() => setError('Camera access denied or unavailable. Please allow camera permission.'));
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, []);

  const snap = () => {
    const video = videoRef.current, canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    setCaptured(canvas.toDataURL('image/jpeg', 0.9));
  };

  const retake = () => setCaptured(null);

  const confirm = () => {
    canvasRef.current.toBlob(blob => {
      const file = new File([blob], `capture-${Date.now()}.jpg`, { type: 'image/jpeg' });
      onCapture(file, captured);
    }, 'image/jpeg', 0.9);
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-gray-800 flex items-center gap-2"><Camera className="w-4 h-4" /> {title}</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400 hover:text-gray-600" /></button>
        </div>

        {error ? (
          <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
        ) : (
          <div className="relative bg-black rounded-xl overflow-hidden aspect-video">
            {!captured && <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />}
            {captured && <img src={captured} alt="Captured" className="w-full h-full object-cover" />}
          </div>
        )}
        <canvas ref={canvasRef} className="hidden" />

        <div className="flex gap-3 mt-4">
          {!captured ? (
            <button onClick={snap} disabled={!!error}
              className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium px-4 py-2.5 rounded-xl text-sm transition">
              <Camera className="w-4 h-4" /> Capture
            </button>
          ) : (
            <>
              <button onClick={retake}
                className="flex-1 flex items-center justify-center gap-2 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 py-2.5 transition">
                <RotateCcw className="w-4 h-4" /> Retake
              </button>
              <button onClick={confirm}
                className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-4 py-2.5 rounded-xl text-sm transition">
                <Check className="w-4 h-4" /> Use Photo
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default CameraCapture;
