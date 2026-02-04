import React, { useState, useRef } from 'react';
import Tesseract from 'tesseract.js';
import { Upload, ShieldCheck, Download, Trash2, Loader2 } from 'lucide-react';

export default function App() {
  const [image, setImage] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const canvasRef = useRef(null);

  // 1. Updated handleUpload (More patient logic)
  const handleUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      // We set the image state FIRST. This forces React to show the canvas.
      setImage(event.target.result);

      const img = new Image();
      img.onload = () => {
        // Use a tiny timeout to ensure React has put the canvas in the DOM
        setTimeout(() => {
          const canvas = canvasRef.current;
          if (canvas) {
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
          }
        }, 100); 
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  // 1a. Updated HTML (Ensuring the canvas is always available when image exists)
  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', padding: '20px', maxWidth: '900px', margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: '30px' }}>
        <h1>🛡️ StealthInvoice</h1>
        <p>Local-only invoice redaction.</p>
      </div>

      {!image ? (
        <div style={{ border: '3px dashed #ddd', padding: '60px', textAlign: 'center' }}>
          <input type="file" onChange={handleUpload} id="upload" hidden accept="image/*" />
          <label htmlFor="upload" style={{ cursor: 'pointer' }}>
            <p>Click to upload JPG/PNG</p>
          </label>
        </div>
      ) : (
        <div style={{ background: '#fff', padding: '20px', borderRadius: '12px' }}>
          <div style={{ overflow: 'auto', marginBottom: '20px' }}>
            {/* We keep the canvas simple so it's easy for the code to find */}
            <canvas 
              ref={canvasRef} 
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              style={{ cursor: 'crosshair', display: 'block', margin: '0 auto', border: '1px solid #000' }} 
            />
          </div>
          
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
            <button onClick={autoRedact} disabled={isProcessing} style={btnStyle('#4f46e5')}>
              {isProcessing ? "Scanning..." : "Auto-Redact"}
            </button>
            <button onClick={downloadImage} style={btnStyle('#16a34a')}>Download</button>
            <button onClick={() => setImage(null)} style={btnStyle('#dc2626')}>Clear</button>
          </div>
        </div>
      )}
    </div>
  );

  // 2. The "Smart" Scan & Destructive Redaction
  const scanAndRedact = async () => {
    setIsProcessing(true);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    // Run OCR to find text
    const { data: { words } } = await Tesseract.recognize(canvas, 'eng');

    // Logic: If word looks like an email, address fragment, or IBAN, black it out.
    // We use common "trigger" patterns for this evening's MVP
    const sensitivePatterns = /[@]|(\d{4,})|[A-Z]{2}\d{2}/g; 

    words.forEach(word => {
      if (sensitivePatterns.test(word.text) || word.confidence < 60) {
        ctx.fillStyle = 'black';
        // We add a small padding to ensure the text is fully covered
        ctx.fillRect(word.bbox.x0 - 2, word.bbox.y0 - 2, (word.bbox.x1 - word.bbox.x0) + 4, (word.bbox.y1 - word.bbox.y0) + 4);
      }
    });

    setIsProcessing(false);
    alert("Redaction complete! Sensitive patterns were destroyed.");
  };

  // 3. Download the NEW flat file
  const downloadImage = () => {
    const canvas = canvasRef.current;
    const link = document.createElement('a');
    link.download = 'sanitized-invoice.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  return (
    <div style={{ fontFamily: 'sans-serif', padding: '40px', maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
      <header style={{ marginBottom: '40px' }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '10px' }}>🛡️ Invoice Sanitizer</h1>
        <p>100% Private. All processing happens in your browser.</p>
      </header>

      <main style={{ border: '2px dashed #ccc', padding: '20px', borderRadius: '12px', background: '#f9f9f9' }}>
        {!image ? (
          <label style={{ cursor: 'pointer', display: 'block', padding: '40px' }}>
            <Upload size={48} style={{ margin: '0 auto 10px' }} />
            <p>Click to upload an invoice (JPG/PNG)</p>
            <input type="file" onChange={handleUpload} style={{ display: 'none' }} accept="image/*" />
          </label>
        ) : (
          <div>
            <canvas ref={canvasRef} style={{ maxWidth: '100%', height: 'auto', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
            
            <div style={{ marginTop: '20px', display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button 
                onClick={scanAndRedact} 
                disabled={isProcessing}
                style={{ padding: '12px 24px', background: '#000', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                {isProcessing ? <Loader2 className="animate-spin" /> : <ShieldCheck />}
                {isProcessing ? "Scanning..." : "Auto-Redact Info"}
              </button>

              <button 
                onClick={downloadImage} 
                style={{ padding: '12px 24px', background: '#22c55e', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <Download /> Download
              </button>

              <button 
                onClick={() => setImage(null)} 
                style={{ padding: '12px 24px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
              >
                <Trash2 />
              </button>
            </div>
          </div>
        )}
      </main>

      <footer style={{ marginTop: '40px', fontSize: '0.8rem', color: '#666' }}>
        <p><strong>Security Note:</strong> This tool uses destructive canvas rendering. Redacted pixels are physically deleted and cannot be un-blurred.</p>
        <p>Privacy First: We use Tesseract.js for local OCR. Your documents are never uploaded to a server. All redaction is performed on an HTML5 Canvas using destructive pixel manipulation, making it mathematically impossible to recover the hidden data. Please review the created file to ensure that all required details are redacted and use the manual scrubber to delete any additional data</p>
      </footer>
    </div>
  );
}
