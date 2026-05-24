import React, { useState } from 'react';
import { PackageSearch, Mail, Lock, ArrowRight, X } from 'lucide-react';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (email: string, password: string) => Promise<void>;
  loginError: string | null;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  onLogin,
  loginError,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setLoading(true);
    try {
      await onLogin(email.trim(), password);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-card glass-modal modal-sm" style={{ maxWidth: 400, padding: 20 }}>
        <div className="modal-header" style={{ border: 'none', paddingBottom: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="logo" style={{ margin: '0 auto' }}>
            <PackageSearch className="logo-icon" />
            <h1>LAGER<span>PRO</span></h1>
          </div>
          <button className="btn-close modal-close-btn" onClick={onClose}><X /></button>
        </div>
        <div className="modal-body" style={{ paddingTop: 10 }}>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textAlign: 'center', marginBottom: 20 }}>
            Detta gränssnitt är för butikspersonal. Logga in för att hantera lager, kassa och bokningar.
          </p>
          <form onSubmit={handleSubmit}>
            <div className="input-container" style={{ marginBottom: 12 }}>
              <label>E-postadresse</label>
              <div className="input-group" style={{ position: 'relative' }}>
                <Mail style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', width: 16, height: 16, color: 'var(--text-muted)' }} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Din e-postadress..."
                  required
                  style={{ width: '100%', padding: '10px 12px 10px 36px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-light)', color: 'white', borderRadius: 'var(--radius-sm)' }}
                />
              </div>
            </div>
            <div className="input-container" style={{ marginBottom: 20 }}>
              <label>Lösenord</label>
              <div className="input-group" style={{ position: 'relative' }}>
                <Lock style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', width: 16, height: 16, color: 'var(--text-muted)' }} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Ange lösenord..."
                  required
                  style={{ width: '100%', padding: '10px 12px 10px 36px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-light)', color: 'white', borderRadius: 'var(--radius-sm)' }}
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary btn-full"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            >
              <span>{loading ? 'Loggar in...' : 'Logga in'}</span>
              <ArrowRight style={{ width: 16, height: 16 }} />
            </button>
            {loginError && <p style={{ marginTop: 15, textAlign: 'center', color: 'var(--color-danger)', fontSize: '0.85rem' }}>{loginError}</p>}
          </form>
        </div>
      </div>
    </div>
  );
};
