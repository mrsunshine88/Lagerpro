import React, { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';

export default function InstallPWA() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    // Only show on mobile devices
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const isIos = /iPhone|iPad|iPod/i.test(navigator.userAgent);
    
    // Check if already installed
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;

    if (!isMobile || isStandalone) {
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Force show prompt after a short delay on mobile
    const timer = setTimeout(() => setShowPrompt(true), 2000);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      clearTimeout(timer);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      setShowPrompt(false);
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    } else {
      const isIos = /iPhone|iPad|iPod/i.test(navigator.userAgent);
      if (isIos) {
        alert('För iPhone: Tryck på "Dela"-knappen i bottenmenyn (fyrkant med pil uppåt) och välj "Lägg till på hemskärmen".');
      } else {
        alert('Tryck på de tre prickarna uppe till höger i din webbläsare och välj "Lägg till på hemskärmen" eller "Installera app".');
      }
      setShowPrompt(false);
    }
  };

  if (!showPrompt) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      background: 'var(--bg-card)',
      borderTop: '1px solid var(--border-light)',
      padding: '16px 20px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      zIndex: 99999,
      boxShadow: '0 -4px 20px rgba(0,0,0,0.5)',
      animation: 'slideUp 0.3s ease-out'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ background: 'var(--color-primary)', padding: 10, borderRadius: 12 }}>
          <Download style={{ width: 24, height: 24, color: '#fff' }} />
        </div>
        <div>
          <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>Ladda ner appen</h4>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Lägg till på startsidan för snabbare åtkomst</p>
        </div>
      </div>
      
      <div style={{ display: 'flex', gap: 10 }}>
        <button 
          onClick={() => setShowPrompt(false)} 
          style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', padding: 8, cursor: 'pointer' }}
        >
          <X style={{ width: 20, height: 20 }} />
        </button>
        <button 
          onClick={handleInstallClick} 
          className="btn btn-primary"
          style={{ padding: '8px 16px', fontSize: '0.9rem' }}
        >
          Installera
        </button>
      </div>
    </div>
  );
}
