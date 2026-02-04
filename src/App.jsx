import React, { useState, useRef, useEffect } from 'react';
import Tesseract from 'tesseract.js';
import { Upload, ShieldCheck, Download, Trash2, Loader2, Paintbrush, Lock } from 'lucide-react';

export default function App() {
  const [image, setImage] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);

  // Initialize canvas context whenever the image state changes
  useEffect(() => {
    if (image && canvasRef.current) {
      ctxRef.current = canvasRef.current.getContext('2d');
    }
  }, [image]);

  const handleUpload = (e) => {
    const file = e.target.files[0];
    if (!file || !file.type.startsWith('image/')) {
      alert("Please upload an image file (PNG or JPG).");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        setImage(event.target.result);
        // Delay ensures React renders the canvas element before we draw to it
        setTimeout(() => {
          const canvas = canvasRef.current;
          if (canvas) {
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            ctxRef.current = ctx;
          }
        }, 150);
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const autoRedact = async () => {
    if (!canvasRef.current) return;
    setIsProcessing(true);
    try {
      const { data: { words } } = await Tesseract.recognize(canvasRef.current, 'eng');
      const sensitivePatterns = /[@]|(\d{4,})|IBAN|Total|Address|Phone|Invoice|Amount/gi;

      words.forEach(word => {
        if (sensitivePatterns.test(word.text) || word.confidence < 50) {
          ctxRef.current.fillStyle = 'black';
          ctxRef.current.fillRect(
            word.bbox.x0 - 4, 
            word.bbox.y0 - 4, 
            (word.bbox.x1 - word.bbox.x0) + 8, 
            (word.bbox.y1 - word.bbox.y0) + 8
          );
        }
      });
    } catch (err) {
      console.error("OCR Error:", err);
      alert("Error scanning image.");
    }
    setIsProcessing(false);
  };

  const startDrawing = (e) => {
    if (!ctxRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = canvasRef.current.width / rect.width;
    const scaleY = canvasRef.current.height / rect.height;
    ctxRef.current.beginPath();
    ctxRef.current.moveTo((e.clientX - rect.left) * scaleX, (e.clientY - rect.top) * scaleY);
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing || !ctxRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = canvasRef.current.width / rect.width;
    const scaleY = canvasRef.current.height / rect.height;
    ctxRef.current.lineTo((e.clientX - rect.left) * scaleX, (e.clientY - rect.top) * scaleY);
    ctxRef.current.strokeStyle = 'black';
    ctxRef.current.lineWidth = 25;
    ctxRef.current.lineCap = 'round';
    ctxRef.current.stroke();
  };

  const stopDrawing = () => {
    if (ctxRef.current) ctxRef.current.closePath();
    setIsDrawing(false);
  };

  const downloadImage = () => {
    const link = document.createElement('a');
    link.download = 'sanitized_invoice.png';
    link.href = canvasRef.current.toDataURL('image/png');
    link.click();
  };

  const btnStyle = (bg, disabled = false) => ({
    background: disabled ? '#ccc' : bg,
    color: 'white',
    border: 'none',
    padding: '12px 20px',
    borderRadius: '8px',
    cursor: disabled ? 'not-allowed' : 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontWeight: '600',
    transition: 'opacity 0.2s'
  });

  return (
    <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', padding: '20px', maxWidth: '1000px', margin: '0 auto', color: '#1f2937' }}>
      <nav style={{ textAlign: 'center', marginBottom: '40px', paddingTop: '20px' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: '800', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
          <Lock size={32} color="#4f46e5" /> StealthInvoice
        </h1>
        <p style={{ color: '#6b7280', marginTop: '10px' }}>Securely redact sensitive info before sharing. 100% Private.</p>
      </nav>

      {!image ? (
        <div style={{ border: '3px dashed #e5e7eb', borderRadius: '24px', padding: '80px 20px', textAlign: 'center', background: '#f9fafb' }}>
          <input type="file" onChange={handleUpload} id="upload" hidden accept="image/*" />
          <label htmlFor="upload" style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ background: '#4f46e5', color: 'white', padding: '15px', borderRadius: '50%', marginBottom: '15px' }}>
              <Upload size={30} />
            </div>
            <span style={{ fontSize: '1.25rem', fontWeight: '600' }}>Click to upload invoice</span>
            <span style={{ color: '#9ca3af', marginTop: '5px' }}>Supports PNG, JPG, or Screenshots</span>
          </label>
        </div>
      ) : (
        <div style={{ background: 'white', borderRadius: '16px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', padding: '24px', border: '1px solid #f3f4f6' }}>
          <div style={{ overflow: 'auto', marginBottom: '24px', borderRadius: '8px', border: '1px solid #e5e7eb', maxHeight: '70vh', background: '#374151' }}>
            <canvas 
              ref={canvasRef} 
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              style={{ cursor: 'crosshair', display: 'block', margin: '0 auto', backgroundColor: 'white' }} 
            />
          </div>
          
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', justifyContent: 'center', alignItems: 'center' }}>
            <button onClick={autoRedact} disabled={isProcessing} style={btnStyle('#4f46e5', isProcessing)}>
              {isProcessing ? <Loader2 style={{ animation: 'spin 1s linear infinite' }} /> : <ShieldCheck size={18} />}
              {isProcessing ? "Analyzing..." : "Auto-Redact"}
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', background: '#f3f4f6', borderRadius: '8px', fontSize: '0.85rem', color: '#4b5563' }}>
              <Paintbrush size={16} /> <span>Manual: Click & drag on image</span>
            </div>
            <button onClick={downloadImage} style={btnStyle('#10b981')}>
              <Download size={18} /> Download
            </button>
            <button onClick={() => setImage(null)} style={btnStyle('#ef4444')}>
              <Trash2 size={18} />
            </button>
          </div>
        </div>
      )}

      <footer style={{ marginTop: '60px', borderTop: '1px solid #e5e7eb', paddingTop: '30px', textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginBottom: '15px', color: '#6b7280', fontSize: '0.9rem' }}>
          <span>✓ Local Processing</span>
          <span>✓ No Server Uploads</span>
          <span>✓ Permanent Redaction</span>
        </div>
        <p style={{ fontSize: '0.8rem', color: '#9ca3af', maxWidth: '600px', margin: '0 auto' }}>
          StealthInvoice uses browser-based OCR and Canvas manipulation. When you redact an area, the underlying pixel data is permanently overwritten before export. Please check that all required data has been redacted and use the manual tool provided if further redaction is required. We will not be held liable for the release of any sensitive data.
        </p>
      </footer>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
