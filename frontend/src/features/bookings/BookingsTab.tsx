import axios from '../../apiClient';
import React, { useState } from 'react';
import { supabase } from '../../supabaseClient';
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


  const handleGenerateLabel = async (id: number) => {
    try {
      const res = await axios.post(`${apiBaseUrl}/api/admin/shipping/${id}/label`, {}, getAxiosConfig());
      alert(`Fraktsedel genererad! Spårningsnummer: ${res.data.trackingNumber}`);
      fetchBookings();
    } catch (e) {
      alert('Kunde inte generera fraktsedel');
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
            <div style={{ background: 'linear-gradient(135deg, #6366f1, #a855f7)', padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', color: 'white', borderTopLeftRadius: 'var(--radius-lg)', borderTopRightRadius: 'var(--radius-lg)', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
                  <h2 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 800, letterSpacing: '-0.02em', textShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>{selectedBooking.customer_first_name} {selectedBooking.customer_last_name}</h2>
                  <span style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.9)', background: 'rgba(0,0,0,0.2)', padding: '4px 8px', borderRadius: 6, fontWeight: 600, border: '1px solid rgba(255,255,255,0.1)' }}>#{selectedBooking.id}</span>
                </div>
                <a href={`tel:${selectedBooking.customer_phone}`} style={{ color: 'white', display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.95rem', textDecoration: 'none', background: 'rgba(255,255,255,0.15)', padding: '6px 12px', borderRadius: 20, transition: 'background 0.2s' }}>
                  <Phone style={{ width: 14, height: 14 }} />
                  {selectedBooking.customer_phone}
                </a>
              </div>
              <button onClick={() => setSelectedBooking(null)} className="btn btn-ghost" style={{ padding: 6, margin: -6, color: 'white', background: 'rgba(0,0,0,0.1)', borderRadius: '50%' }}>
                <X style={{ width: 20, height: 20 }} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '30px 24px', background: 'var(--bg-card)' }}>
              
              {/* Product Info */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24, background: 'rgba(255,255,255,0.02)', padding: 16, borderRadius: 12, border: '1px solid var(--border-light)' }}>
                <div style={{ width: 48, height: 48, borderRadius: 10, background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(168, 85, 247, 0.1))', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: '1px solid rgba(168, 85, 247, 0.2)' }}>
                  <Package style={{ width: 24, height: 24, color: '#a855f7' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>{selectedBooking.product_name}</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', flexWrap: 'wrap', gap: '8px 12px' }}>
                    <span style={{ background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: 4 }}>St: <strong style={{ color: 'white' }}>{selectedBooking.size}</strong></span>
                    <span style={{ background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: 4 }}>Färg: <strong style={{ color: 'white' }}>{selectedBooking.color || 'Uni'}</strong></span>
                    <span style={{ color: 'var(--text-muted)' }}>SKU: {selectedBooking.sku}</span>
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
                <div style={{ background: 'rgba(0,0,0,0.2)', padding: 16, borderRadius: 10, border: '1px solid rgba(255,255,255,0.03)' }}>
                  <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--text-muted)', marginBottom: 12, fontWeight: 800 }}>Leverans</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <div style={{ padding: 6, background: 'rgba(59, 130, 246, 0.1)', borderRadius: '50%' }}>
                      <MapPin style={{ width: 16, height: 16, color: '#60a5fa' }} />
                    </div>
                    <span style={{ fontSize: '0.95rem', fontWeight: 600, color: 'white' }}>
                      {selectedBooking.delivery_method === 'shipping' ? 'PostNord' : 'Hämtas i butik'}
                    </span>
                  </div>
                  {selectedBooking.delivery_method === 'shipping' && selectedBooking.shipping_address && (
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginLeft: 34, lineHeight: 1.5, background: 'rgba(255,255,255,0.03)', padding: 8, borderRadius: 6 }}>
                      <div style={{ marginBottom: 6 }}>{selectedBooking.shipping_address}</div>
                      {selectedBooking.tracking_number && (
                        <div style={{ padding: '6px 8px', background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.2)', borderRadius: 4, display: 'flex', flexDirection: 'column', gap: 4 }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#60a5fa', textTransform: 'uppercase' }}>Spårningsnummer</span>
                          <span style={{ fontFamily: 'monospace', color: 'white' }}>{selectedBooking.tracking_number}</span>
                          {selectedBooking.shipping_label_url && (
                            <a href={selectedBooking.shipping_label_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.8rem', color: '#60a5fa', textDecoration: 'underline', marginTop: 2 }}>
                              Ladda ner Fraktsedel (PDF)
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Right Column: Payment */}
                <div style={{ background: 'rgba(0,0,0,0.2)', padding: 16, borderRadius: 10, border: '1px solid rgba(255,255,255,0.03)' }}>
                  <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--text-muted)', marginBottom: 12, fontWeight: 800 }}>Betalning</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <div style={{ padding: 6, background: 'rgba(16, 185, 129, 0.1)', borderRadius: '50%' }}>
                      <CreditCard style={{ width: 16, height: 16, color: '#34d399' }} />
                    </div>
                    <span style={{ fontSize: '0.95rem', fontWeight: 600, color: 'white' }}>
                      {(selectedBooking.payment_status === 'paid' || selectedBooking.payment_status === 'paid_paypal') ? 'Betald' : selectedBooking.payment_status === 'refunded' ? 'Återbetald' : 'Ej betald (Butik)'}
                    </span>
                  </div>
                  <div style={{ marginLeft: 34, marginTop: 8 }}>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-primary)' }}>{selectedBooking.selling_price} kr</div>
                    {selectedBooking.discount_code && (
                      <div style={{ fontSize: '0.8rem', color: 'var(--color-success)', display: 'flex', alignItems: 'center', gap: 4, marginTop: 4, background: 'rgba(16, 185, 129, 0.1)', padding: '2px 6px', borderRadius: 4, width: 'max-content' }}>
                        <Tag style={{ width: 12, height: 12 }} />
                        {selectedBooking.discount_code} (-{selectedBooking.discount_percent}%)
                      </div>
                    )}
                    {selectedBooking.shipping_cost !== undefined && selectedBooking.shipping_cost > 0 && (
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 4 }}>
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
                      {selectedBooking.delivery_method === 'shipping' && !selectedBooking.tracking_number && (
                        <button onClick={() => { handleGenerateLabel(selectedBooking.id); }} className="btn btn-primary" style={{ width: 160 }}>
                          Skapa Fraktsedel
                        </button>
                      )}
                      <button onClick={() => { handleConfirmBooking(selectedBooking.id); setSelectedBooking({ ...selectedBooking, status: 'confirmed' }); }} className="btn btn-success" style={{ width: 160 }}>
                        {selectedBooking.delivery_method === 'shipping' ? 'Bekräfta skickad' : ((selectedBooking.payment_status === 'paid' || selectedBooking.payment_status === 'paid_paypal') ? 'Bekräfta överlämning' : 'Bekräfta hämtning')}
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
                        {selectedBooking.delivery_method === 'shipping' ? 'Bekräfta skickad' : ((selectedBooking.payment_status === 'paid' || selectedBooking.payment_status === 'paid_paypal') ? 'Bekräfta överlämning' : 'Bekräfta hämtning')}
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
