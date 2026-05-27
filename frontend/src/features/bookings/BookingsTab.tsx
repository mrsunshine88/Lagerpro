import React, { useState } from 'react';
import axios from 'axios';
import { RefreshCw, Search, X, MessageSquare, ChevronRight, Phone, MapPin, Package, Tag, CreditCard } from 'lucide-react';
import type { Booking, UserProfile } from '../../types';

interface BookingsTabProps {
  bookings: Booking[];
  fetchBookings: () => Promise<void>;
  userProfile: UserProfile | null;
  fetchAnalytics: () => Promise<void>;
  fetchProducts: () => Promise<void>;
  apiBaseUrl: string;
  getAxiosConfig: () => any;
}

export const BookingsTab: React.FC<BookingsTabProps> = ({
  bookings,
  fetchBookings,
  userProfile,
  fetchAnalytics,
  fetchProducts,
  apiBaseUrl,
  getAxiosConfig,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  const handleConfirmBooking = async (id: number) => {
    try {
      await axios.post(`${apiBaseUrl}/api/bookings/${id}/confirm`, {}, getAxiosConfig());
      fetchBookings();
      if (userProfile?.role === 'admin') fetchAnalytics();
    } catch (e) {
      alert('Kunde inte bekräfta bokningen');
    }
  };

  const handleReserveBooking = async (id: number) => {
    try {
      await axios.post(`${apiBaseUrl}/api/bookings/${id}/reserve`, {}, getAxiosConfig());
      fetchBookings();
    } catch (e) {
      alert('Kunde inte markera som reserverad');
    }
  };

  const handleCancelBooking = async (id: number) => {
    try {
      await axios.post(`${apiBaseUrl}/api/bookings/${id}/cancel`, {}, getAxiosConfig());
      fetchBookings();
      fetchProducts();
      if (userProfile?.role === 'admin') fetchAnalytics();
    } catch (e) {
      alert('Kunde inte avbryta bokningen');
    }
  };

  const filteredBookings = bookings.filter((b) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      (b.customer_first_name || '').toLowerCase().includes(term) ||
      (b.customer_last_name || '').toLowerCase().includes(term) ||
      (b.customer_phone || '').toLowerCase().includes(term) ||
      (b.product_name || '').toLowerCase().includes(term) ||
      b.id.toString() === term
    );
  });

  return (
    <div className="tab-pane">
      <section className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15, flexWrap: 'wrap', gap: 10 }}>
        <h2>Orderhistorik &amp; Kundreservationer</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ position: 'relative' }}>
            <Search style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', width: 14, height: 14, color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Sök namn, tel, id..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                padding: '6px 10px 6px 30px',
                background: 'rgba(0,0,0,0.2)',
                border: '1px solid var(--border-light)',
                borderRadius: 4,
                color: 'white',
                fontSize: '0.85rem',
                width: 220
              }}
            />
          </div>
          <button onClick={fetchBookings} className="btn btn-secondary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <RefreshCw style={{ width: 14, height: 14 }} />
            <span>Ladda om listan</span>
          </button>
        </div>
      </section>

      <div className="glass-card no-padding-mobile" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="custom-table bookings-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border-light)' }}>
                <th style={{ padding: '12px 15px' }}>Kundnamn</th>
                <th style={{ padding: '12px 15px' }}>Projekt</th>
                <th style={{ padding: '12px 15px' }}>Meddelande</th>
                <th style={{ padding: '12px 15px' }}>Leverans</th>
                <th style={{ padding: '12px 15px' }}>Betalning</th>
                <th style={{ padding: '12px 15px' }}>Status</th>
                <th style={{ padding: '12px 15px', textAlign: 'right' }}>Åtgärd</th>
              </tr>
            </thead>
            <tbody>
              {filteredBookings.map((b) => (
                <tr 
                  key={b.id} 
                  style={{ borderBottom: '1px solid var(--border-light)', cursor: 'pointer', transition: 'background 0.2s' }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  onClick={() => setSelectedBooking(b)}
                >
                  <td data-label="Kundnamn" style={{ padding: '12px 15px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontWeight: 600 }}>{b.customer_first_name} {b.customer_last_name}</span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>#{b.id}</span>
                    </div>
                  </td>
                  <td data-label="Projekt" style={{ padding: '12px 15px' }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{b.product_category}</span>
                  </td>
                  <td data-label="Meddelande" style={{ padding: '12px 15px' }}>
                    {b.message ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#fbbf24', fontSize: '0.8rem' }}>
                        <MessageSquare style={{ width: 14, height: 14 }} />
                        <span style={{ maxWidth: 150, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.message}</span>
                      </div>
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>-</span>
                    )}
                  </td>
                  <td data-label="Leverans" style={{ padding: '12px 15px' }}>
                    {b.delivery_method === 'shipping' ? (
                      <span className="badge" style={{ padding: '2px 6px', fontSize: '0.7rem', fontWeight: 600, background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa', border: '1px solid rgba(59, 130, 246, 0.3)' }}>POSTNORD</span>
                    ) : (
                      <span className="badge" style={{ padding: '2px 6px', fontSize: '0.7rem', fontWeight: 600, background: 'rgba(255, 255, 255, 0.05)', color: 'var(--text-secondary)' }}>HÄMTAS I BUTIK</span>
                    )}
                  </td>
                  <td data-label="Betalning" style={{ padding: '12px 15px' }}>
                    {b.payment_status === 'paid' ? (
                      <span className="badge" style={{ padding: '2px 6px', fontSize: '0.7rem', fontWeight: 600, background: 'rgba(16, 185, 129, 0.15)', color: 'var(--color-success)', border: '1px solid rgba(16, 185, 129, 0.3)' }}>✓ BETALD</span>
                    ) : b.payment_status === 'refunded' ? (
                      <span className="badge" style={{ padding: '2px 6px', fontSize: '0.7rem', fontWeight: 600, background: 'rgba(239, 68, 68, 0.15)', color: 'var(--color-danger)', border: '1px solid rgba(239, 68, 68, 0.3)' }}>ÅTERBETALD</span>
                    ) : (
                      <span className="badge" style={{ padding: '2px 6px', fontSize: '0.7rem', fontWeight: 600, background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', border: '1px solid rgba(245, 158, 11, 0.3)' }}>EJ BETALD</span>
                    )}
                  </td>
                  <td data-label="Status" style={{ padding: '12px 15px' }}>
                    <span className={`status-badge status-${b.status}`}>
                      {b.status === 'pending' && (b.payment_status === 'swish_pending' ? 'Väntar Swish' : 'Väntar')}
                      {b.status === 'reserved' && 'Undanlagd'}
                      {b.status === 'confirmed' && (b.payment_status === 'paid' ? 'Överlämnad' : 'Hämtad')}
                      {b.status === 'cancelled' && (b.payment_status === 'refunded' ? 'Återbetald' : b.payment_status === 'expired' ? 'Utgått Swish' : 'Avbruten')}
                    </span>
                  </td>
                  <td data-label="Åtgärd" style={{ padding: '12px 15px', textAlign: 'right' }}>
                    <button 
                      className="btn btn-ghost btn-xs" 
                      onClick={(e) => { e.stopPropagation(); setSelectedBooking(b); }}
                      style={{ padding: 4 }}
                    >
                      <ChevronRight style={{ width: 16, height: 16, color: 'var(--text-secondary)' }} />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredBookings.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                    Inga bokningar har registrerats än.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- KUNDKORT MODAL --- */}
      {selectedBooking && (
        <div className="modal-overlay" onClick={() => setSelectedBooking(null)}>
          <div className="modal-content glass-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 500, padding: 0, overflow: 'hidden' }}>
            
            {/* Modal Header */}
            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '20px 24px', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                  <h2 style={{ margin: 0, fontSize: '1.4rem' }}>{selectedBooking.customer_first_name} {selectedBooking.customer_last_name}</h2>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', background: 'rgba(0,0,0,0.3)', padding: '2px 6px', borderRadius: 4 }}>#{selectedBooking.id}</span>
                </div>
                <a href={`tel:${selectedBooking.customer_phone}`} style={{ color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.9rem', textDecoration: 'none' }}>
                  <Phone style={{ width: 14, height: 14 }} />
                  {selectedBooking.customer_phone}
                </a>
              </div>
              <button onClick={() => setSelectedBooking(null)} className="btn btn-ghost" style={{ padding: 4, margin: -4 }}>
                <X style={{ width: 20, height: 20 }} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '24px' }}>
              
              {/* Product Info */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 20 }}>
                <div style={{ width: 40, height: 40, borderRadius: 8, background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Package style={{ width: 20, height: 20, color: 'var(--text-secondary)' }} />
                </div>
                <div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>{selectedBooking.product_name}</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', flexWrap: 'wrap', gap: '8px 12px' }}>
                    <span>St: <strong>{selectedBooking.size}</strong></span>
                    <span>Färg: <strong>{selectedBooking.color || 'Uni'}</strong></span>
                    <span>SKU: {selectedBooking.sku}</span>
                  </div>
                </div>
              </div>

              {/* Message */}
              {selectedBooking.message && (
                <div style={{ marginBottom: 20, padding: '12px 16px', background: 'rgba(245, 158, 11, 0.05)', borderLeft: '3px solid #fbbf24', borderRadius: '0 8px 8px 0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#fbbf24', fontSize: '0.8rem', fontWeight: 600, marginBottom: 4 }}>
                    <MessageSquare style={{ width: 14, height: 14 }} /> Kundens meddelande
                  </div>
                  <div style={{ fontSize: '0.9rem', color: 'var(--text-primary)', fontStyle: 'italic' }}>
                    "{selectedBooking.message}"
                  </div>
                </div>
              )}

              {/* Two Column Details */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24, paddingBottom: 24, borderBottom: '1px solid var(--border-light)' }}>
                
                {/* Left Column: Delivery */}
                <div>
                  <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--text-muted)', marginBottom: 8, fontWeight: 700 }}>Leverans</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <MapPin style={{ width: 16, height: 16, color: 'var(--text-secondary)' }} />
                    <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>
                      {selectedBooking.delivery_method === 'shipping' ? 'PostNord' : 'Hämtas i butik'}
                    </span>
                  </div>
                  {selectedBooking.delivery_method === 'shipping' && selectedBooking.shipping_address && (
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginLeft: 24, lineHeight: 1.4 }}>
                      {selectedBooking.shipping_address}
                    </div>
                  )}
                </div>

                {/* Right Column: Payment */}
                <div>
                  <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--text-muted)', marginBottom: 8, fontWeight: 700 }}>Betalning</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <CreditCard style={{ width: 16, height: 16, color: 'var(--text-secondary)' }} />
                    <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>
                      {selectedBooking.payment_status === 'paid' ? 'Betald (Swish)' : selectedBooking.payment_status === 'refunded' ? 'Återbetald' : 'Ej betald (Butik)'}
                    </span>
                  </div>
                  <div style={{ marginLeft: 24 }}>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>{selectedBooking.selling_price} kr</div>
                    {selectedBooking.discount_code && (
                      <div style={{ fontSize: '0.8rem', color: 'var(--color-success)', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                        <Tag style={{ width: 12, height: 12 }} />
                        {selectedBooking.discount_code} (-{selectedBooking.discount_percent}%)
                      </div>
                    )}
                    {selectedBooking.shipping_cost !== undefined && selectedBooking.shipping_cost > 0 && (
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                        + Frakt {selectedBooking.shipping_cost} kr
                      </div>
                    )}
                  </div>
                </div>

              </div>

              {/* Status & Actions */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--text-muted)', marginBottom: 6, fontWeight: 700 }}>Nuvarande status</div>
                  <span className={`status-badge status-${selectedBooking.status}`}>
                    {selectedBooking.status === 'pending' && (selectedBooking.payment_status === 'swish_pending' ? 'Väntar Swish' : 'Väntar (Ny)')}
                    {selectedBooking.status === 'reserved' && 'Undanlagd i butik'}
                    {selectedBooking.status === 'confirmed' && (selectedBooking.payment_status === 'paid' ? 'Överlämnad / Skickad' : 'Hämtad i butik')}
                    {selectedBooking.status === 'cancelled' && (selectedBooking.payment_status === 'refunded' ? 'Återbetald (Ångrad)' : selectedBooking.payment_status === 'expired' ? 'Utgått Swish' : 'Avbruten / Raderad')}
                  </span>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 6 }}>
                    Datum: {new Date(selectedBooking.created_at).toLocaleString('sv-SE')}
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
                  {selectedBooking.status === 'pending' && (
                    <>
                      <button onClick={() => { handleConfirmBooking(selectedBooking.id); setSelectedBooking({ ...selectedBooking, status: 'confirmed' }); }} className="btn btn-success" style={{ width: 160 }}>
                        {selectedBooking.payment_status === 'paid' ? 'Bekräfta överlämning' : 'Bekräfta hämtning'}
                      </button>
                      <button onClick={() => { handleReserveBooking(selectedBooking.id); setSelectedBooking({ ...selectedBooking, status: 'reserved' }); }} className="btn btn-secondary" style={{ width: 160, borderColor: 'var(--color-accent)', color: 'var(--color-accent)' }}>
                        Lägg undan
                      </button>
                      <button onClick={() => { handleCancelBooking(selectedBooking.id); setSelectedBooking(null); }} className="btn btn-ghost" style={{ width: 160, color: 'var(--color-danger)' }}>
                        Makulera order
                      </button>
                    </>
                  )}

                  {selectedBooking.status === 'reserved' && (
                    <>
                      <button onClick={() => { handleConfirmBooking(selectedBooking.id); setSelectedBooking({ ...selectedBooking, status: 'confirmed' }); }} className="btn btn-success" style={{ width: 160 }}>
                        {selectedBooking.payment_status === 'paid' ? 'Bekräfta överlämning' : 'Bekräfta hämtning'}
                      </button>
                      <button onClick={() => { handleCancelBooking(selectedBooking.id); setSelectedBooking(null); }} className="btn btn-ghost" style={{ width: 160, color: 'var(--color-danger)' }}>
                        Makulera order
                      </button>
                    </>
                  )}

                  {selectedBooking.status === 'confirmed' && (
                    <button
                      onClick={async () => {
                        if (await window.confirm(`Är du säker på att du vill ångra köpet för bokning #${selectedBooking.id}? Skorna återförs till lagret (+1) och omsättningen justeras tillbaka på ekonomisidan.`)) {
                          handleCancelBooking(selectedBooking.id);
                          setSelectedBooking(null);
                        }
                      }}
                      className="btn btn-ghost"
                      style={{ color: 'var(--color-danger)', border: '1px solid rgba(239, 68, 68, 0.25)' }}
                    >
                      Ångra köp & Återställ
                    </button>
                  )}
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
};
