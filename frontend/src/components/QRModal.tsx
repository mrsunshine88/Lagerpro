import React from 'react';
import { X } from 'lucide-react';
import type { Variant } from '../types';

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
  apiBaseUrl,
}) => {
  if (!isOpen || !variant) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-card glass-modal modal-xs text-center" style={{ maxWidth: 400 }}>
        <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2>QR-kod för variant</h2>
          <button className="btn-close" onClick={onClose}><X /></button>
        </div>
        <div className="modal-body" style={{ padding: 20 }}>
          <strong style={{ fontSize: '1.05rem', display: 'block', marginBottom: 5 }}>SKU: {variant.sku}</strong>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'block', marginBottom: 15 }}>
            Storlek: {variant.size} | Färg: {variant.color}
          </span>
          
          <div style={{ background: 'white', padding: 15, borderRadius: 8, display: 'inline-block', marginBottom: 15 }}>
            <img src={`${apiBaseUrl}/api/generate-qr/${variant.id}`} alt={`QR for ${variant.sku}`} style={{ width: 200, height: 200 }} />
          </div>
          
          <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Skanna QR-koden med en mobiltelefon eller surfplatta för att öppna produkten i butiken.
          </p>
        </div>
      </div>
    </div>
  );
};
