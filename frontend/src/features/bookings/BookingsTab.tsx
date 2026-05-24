import React from 'react';
import axios from 'axios';
import { RefreshCw } from 'lucide-react';
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

  return (
    <div className="tab-pane">
      <section className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
        <h2>Orderhistorik &amp; Kundreservationer</h2>
        <button onClick={fetchBookings} className="btn btn-secondary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <RefreshCw style={{ width: 14, height: 14 }} />
          <span>Ladda om listan</span>
        </button>
      </section>

      <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="custom-table bookings-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border-light)' }}>
                <th style={{ padding: '12px 15px' }}>Boknings-ID</th>
                <th style={{ padding: '12px 15px' }}>Kundnamn</th>
                <th style={{ padding: '12px 15px' }}>Telefon</th>
                <th style={{ padding: '12px 15px' }}>Produkt / Storlek / Färg</th>
                <th style={{ padding: '12px 15px' }}>Pris</th>
                <th style={{ padding: '12px 15px' }}>Datum</th>
                <th style={{ padding: '12px 15px' }}>Status</th>
                <th style={{ padding: '12px 15px', textAlign: 'right' }}>Åtgärder</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((b) => (
                <tr key={b.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                  <td data-label="Bokning ID" style={{ padding: '12px 15px' }}><strong>#{b.id}</strong></td>
                  <td data-label="Kundnamn" style={{ padding: '12px 15px' }}>
                    <div>
                      {b.customer_first_name} {b.customer_last_name}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                        {b.payment_status === 'paid' ? (
                          <span className="badge" style={{ display: 'inline-block', padding: '2px 6px', fontSize: '0.7rem', fontWeight: 600, background: 'rgba(16, 185, 129, 0.15)', color: 'var(--color-success)', border: '1px solid rgba(16, 185, 129, 0.3)' }}>✓ BETALD (Swish)</span>
                        ) : b.payment_status === 'refunded' ? (
                          <span className="badge" style={{ display: 'inline-block', padding: '2px 6px', fontSize: '0.7rem', fontWeight: 600, background: 'rgba(239, 68, 68, 0.15)', color: 'var(--color-danger)', border: '1px solid rgba(239, 68, 68, 0.3)' }}>ÅTERBETALD</span>
                        ) : (
                          <span className="badge" style={{ display: 'inline-block', padding: '2px 6px', fontSize: '0.7rem', fontWeight: 600, background: 'rgba(255, 255, 255, 0.05)', color: 'var(--text-secondary)' }}>BUTIKSBETALNING</span>
                        )}
                        {b.delivery_method === 'shipping' ? (
                          <span className="badge" style={{ display: 'inline-block', padding: '2px 6px', fontSize: '0.7rem', fontWeight: 600, background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa', border: '1px solid rgba(59, 130, 246, 0.3)' }}>FRAKTAS (PostNord)</span>
                        ) : (
                          <span className="badge" style={{ display: 'inline-block', padding: '2px 6px', fontSize: '0.7rem', fontWeight: 600, background: 'rgba(255, 255, 255, 0.05)', color: 'var(--text-secondary)' }}>HÄMTAS I BUTIK</span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td data-label="Telefon" style={{ padding: '12px 15px' }}><a href={`tel:${b.customer_phone}`} style={{ color: 'var(--color-primary)' }}>{b.customer_phone}</a></td>
                  <td data-label="Produkt / Storlek / Färg" style={{ padding: '12px 15px' }}>
                    <strong>{b.product_name}</strong>
                    <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>St: {b.size} | Färg: {b.color || 'Uni'} | SKU: {b.sku}</span>
                    {b.message && (
                      <div style={{ marginTop: 6, padding: '4px 8px', background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.15)', borderRadius: 4, fontSize: '0.8rem', color: '#fbbf24', maxWidth: 280, whiteSpace: 'normal', wordBreak: 'break-word' }}>
                        <strong>Meddelande:</strong> "{b.message}"
                      </div>
                    )}
                    {b.delivery_method === 'shipping' && b.shipping_address && (
                      <div style={{ marginTop: 6, padding: '6px 10px', background: 'rgba(59, 130, 246, 0.08)', border: '1px solid rgba(59, 130, 246, 0.15)', borderRadius: 4, fontSize: '0.8rem', color: '#93c5fd', maxWidth: 280, whiteSpace: 'normal', wordBreak: 'break-word' }}>
                        <strong>Mottagaradress:</strong>
                        <span style={{ display: 'block', marginTop: 2 }}>{b.shipping_address}</span>
                        {b.shipping_cost !== undefined && b.shipping_cost > 0 && <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 2 }}>Fraktavgift: {b.shipping_cost} kr</span>}
                      </div>
                    )}
                  </td>
                  <td data-label="Pris" style={{ padding: '12px 15px' }}>
                    <strong>{b.selling_price} kr</strong>
                    {b.discount_code && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginTop: 4 }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--color-success)', fontWeight: 600 }}>Kod: {b.discount_code} (-{b.discount_percent}%)</span>
                        <span style={{ fontSize: '0.7rem', textDecoration: 'line-through', color: 'var(--text-muted)' }}>Ord: {b.original_selling_price} kr</span>
                      </div>
                    )}
                  </td>
                  <td data-label="Datum" style={{ padding: '12px 15px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{new Date(b.created_at).toLocaleString('sv-SE')}</td>
                  <td data-label="Status" style={{ padding: '12px 15px' }}>
                    <span className={`status-badge status-${b.status}`}>
                      {b.status === 'pending' && (b.payment_status === 'swish_pending' ? 'Väntar Swish' : 'Väntar')}
                      {b.status === 'reserved' && 'Undanlagd'}
                      {b.status === 'confirmed' && (b.payment_status === 'paid' ? 'Överlämnad' : 'Hämtad')}
                      {b.status === 'cancelled' && (b.payment_status === 'refunded' ? 'Återbetald' : b.payment_status === 'expired' ? 'Utgått Swish' : 'Avbruten')}
                    </span>
                  </td>
                  <td data-label="Åtgärder" style={{ padding: '12px 15px', textAlign: 'right' }}>
                    {b.status === 'pending' && (
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                        <button onClick={() => handleReserveBooking(b.id)} className="btn btn-secondary btn-xs" style={{ borderColor: 'var(--color-accent)', color: 'var(--color-accent)' }}>Reservera</button>
                        <button onClick={() => handleConfirmBooking(b.id)} className="btn btn-success btn-xs">{b.payment_status === 'paid' ? 'Bekräfta överlämning' : 'Bekräfta hämtning'}</button>
                        <button onClick={() => handleCancelBooking(b.id)} className="btn btn-ghost btn-xs" style={{ color: 'var(--color-danger)' }}>Avbryt</button>
                      </div>
                    )}
                    {b.status === 'reserved' && (
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                        <button onClick={() => handleConfirmBooking(b.id)} className="btn btn-success btn-xs">{b.payment_status === 'paid' ? 'Bekräfta överlämning' : 'Bekräfta hämtning'}</button>
                        <button onClick={() => handleCancelBooking(b.id)} className="btn btn-ghost btn-xs" style={{ color: 'var(--color-danger)' }}>Avbryt</button>
                      </div>
                    )}
                    {b.status === 'confirmed' && (
                      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{b.payment_status === 'paid' ? 'Överlämnad' : 'Hämtad'}</span>
                        <button
                          onClick={() => {
                            if (confirm(`Är du säker på att du vill ångra köpet för bokning #${b.id}? Skorna återförs till lagret (+1) och omsättningen justeras tillbaka på ekonomisidan.`)) {
                              handleCancelBooking(b.id);
                            }
                          }}
                          className="btn btn-ghost btn-xs"
                          style={{ color: 'var(--color-danger)', border: '1px solid rgba(239, 68, 68, 0.25)', padding: '2px 8px', borderRadius: 4 }}
                        >
                          Ångra köp
                        </button>
                      </div>
                    )}
                    {b.status === 'cancelled' && (
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {b.payment_status === 'refunded' ? 'Återbetald (Ångrad)' : b.payment_status === 'expired' ? 'Utgått Swish' : 'Raderad/Återställd'}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              {bookings.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                    Inga bokningar har registrerats än.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
