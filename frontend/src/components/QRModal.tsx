import React, { useRef } from 'react';
import { X, Printer } from 'lucide-react';
import type { Variant } from '../types';
import Barcode from 'react-barcode';

interface QRModalProps {
  isOpen: boolean;
  onClose: () => void;
  variant: Variant | null;
  apiBaseUrl: string;
}

export const QRModal: React.FC<QRModalProps> = ({
  isOpen,
  onClose,
  variant,
}) => {
  const barcodeRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !variant) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-card glass-modal modal-xs text-center" style={{ maxWidth: 450 }}>
        <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2>Streckkod för variant</h2>
          <button className="btn-close" onClick={onClose}><X /></button>
        </div>
        <div className="modal-body" style={{ padding: 20 }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'block', marginBottom: 15 }}>
            Storlek: {variant.size} | Färg: {variant.color}
          </span>
          
          <div ref={barcodeRef} style={{ background: 'white', padding: '20px', borderRadius: 8, display: 'inline-block', marginBottom: 20, width: '100%', overflow: 'hidden' }}>
            {(() => {
              const isEan13Compatible = /^\d{12,13}$/.test(variant.sku);
              return (
                <Barcode 
                  value={variant.sku} 
                  format={isEan13Compatible ? "EAN13" : "CODE128"} 
                  width={isEan13Compatible ? 2 : 1.5} 
                  height={80} 
                  displayValue={true} 
                  fontSize={14} 
                  margin={0} 
                  background="#ffffff" 
                  lineColor="#000000" 
                />
              );
            })()}
          </div>
          
          <button 
            className="btn btn-secondary btn-full" 
            onClick={() => {
              if (barcodeRef.current) {
                const printWindow = window.open('', '_blank');
                if (printWindow) {
                  printWindow.document.write(`
                    <html>
                      <head>
                        <title>Skriv ut streckkod</title>
                        <style>
                          body { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; }
                          .label { text-align: center; font-family: sans-serif; margin-bottom: 10px; }
                        </style>
                      </head>
                      <body>
                        <div class="label">
                          <strong>LagerPro</strong><br>
                          <small>Storlek: ${variant.size} | Färg: ${variant.color}</small>
                        </div>
                        ${barcodeRef.current.innerHTML}
                        <script>
                          window.onload = function() {
                            setTimeout(function() {
                              window.print();
                              window.close();
                            }, 250);
                          };
                        </script>
                      </body>
                    </html>
                  `);
                  printWindow.document.close();
                }
              }
            }}
            style={{ padding: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
          >
            <Printer style={{ width: 16, height: 16 }} />
            <span>Skriv ut streckkod (Prislapp)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
