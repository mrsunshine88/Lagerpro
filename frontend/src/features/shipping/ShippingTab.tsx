import axios from '../../apiClient';
import React, { useState } from 'react';
import { RefreshCw, Search, Truck, Printer, PackageCheck, MapPin } from 'lucide-react';
import type { Booking } from '../../types';

interface ShippingTabProps {
  bookings: Booking[];
  fetchBookings: () => Promise<void>;
  apiBaseUrl: string;
  getAxiosConfig: () => any;
}

export const ShippingTab: React.FC<ShippingTabProps> = ({
  bookings,
  fetchBookings,
  apiBaseUrl,
  getAxiosConfig,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBookingIds, setSelectedBookingIds] = useState<number[]>([]);
  const [activeTab, setActiveTab] = useState<'unfulfilled' | 'fulfilled'>('unfulfilled');

  const shippingBookings = bookings.filter(b => b.delivery_method === 'shipping');
  const unfulfilled = shippingBookings.filter(b => b.status === 'pending' || b.status === 'reserved');
  const fulfilled = shippingBookings.filter(b => b.status === 'confirmed');

  const displayList = activeTab === 'unfulfilled' ? unfulfilled : fulfilled;
  
  const filteredList = displayList.filter(b => 
    b.customer_first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.customer_last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.id.toString().includes(searchTerm)
  );

  const toggleSelect = (id: number) => {
    setSelectedBookingIds(prev => 
      prev.includes(id) ? prev.filter(bId => bId !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    if (selectedBookingIds.length === filteredList.length) {
      setSelectedBookingIds([]);
    } else {
      setSelectedBookingIds(filteredList.map(b => b.id));
    }
  };

  const handleCreateLabels = async () => {
    if (selectedBookingIds.length === 0) return;
    try {
      // Mock API call to create multiple labels
      for (const id of selectedBookingIds) {
        await axios.post(`${apiBaseUrl}/api/admin/shipping/${id}/label`, {}, getAxiosConfig());
      }
      setSelectedBookingIds([]);
      fetchBookings();
    } catch (e) {
      alert('Kunde inte skapa fraktsedlar');
    }
  };

  const handleMarkAsShipped = async () => {
    if (selectedBookingIds.length === 0) return;
    try {
      for (const id of selectedBookingIds) {
        await axios.post(`${apiBaseUrl}/api/bookings/${id}/confirm`, {}, getAxiosConfig());
      }
      setSelectedBookingIds([]);
      fetchBookings();
    } catch (e) {
      alert('Kunde inte markera som skickade');
    }
  };

  return (
    <div className="admin-content">
      <div className="admin-header">
        <div>
          <h2>Fraktsedlar & Leveranser</h2>
          <p>Hantera Shopify-liknande frakt och spårning.</p>
        </div>
        <button onClick={fetchBookings} className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <RefreshCw style={{ width: 16, height: 16 }} /> Uppdatera
        </button>
      </div>

      <div className="admin-tabs" style={{ marginBottom: 20, display: 'flex', gap: 10, borderBottom: '1px solid var(--border-color)', paddingBottom: 10 }}>
        <button 
          className={`btn ${activeTab === 'unfulfilled' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => { setActiveTab('unfulfilled'); setSelectedBookingIds([]); }}
        >
          Ohanterade ordrar ({unfulfilled.length})
        </button>
        <button 
          className={`btn ${activeTab === 'fulfilled' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => { setActiveTab('fulfilled'); setSelectedBookingIds([]); }}
        >
          Skickade ({fulfilled.length})
        </button>
      </div>

      <div className="search-bar" style={{ marginBottom: '20px', display: 'flex', gap: 10, alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: 400 }}>
          <Search style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input 
            type="text" 
            placeholder="Sök order-ID eller namn..." 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: '100%', padding: '10px 10px 10px 40px', borderRadius: 8, border: '1px solid var(--border-color)' }}
          />
        </div>

        {activeTab === 'unfulfilled' && selectedBookingIds.length > 0 && (
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={handleCreateLabels} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Printer style={{ width: 16, height: 16 }} />
              Skapa Fraktsedel ({selectedBookingIds.length})
            </button>
            <button onClick={handleMarkAsShipped} className="btn btn-success" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <PackageCheck style={{ width: 16, height: 16 }} />
              Markera skickade
            </button>
          </div>
        )}
      </div>

      <div className="table-responsive">
        <table className="table" style={{ minWidth: 800 }}>
          <thead>
            <tr>
              {activeTab === 'unfulfilled' && (
                <th style={{ width: 40, textAlign: 'center' }}>
                  <input type="checkbox" checked={selectedBookingIds.length === filteredList.length && filteredList.length > 0} onChange={selectAll} />
                </th>
              )}
              <th>Order ID</th>
              <th>Kund</th>
              <th>Produkt</th>
              <th>Fraktadress</th>
              <th>Status</th>
              <th>Spårningsnummer</th>
            </tr>
          </thead>
          <tbody>
            {filteredList.length === 0 ? (
              <tr>
                <td colSpan={activeTab === 'unfulfilled' ? 7 : 6} style={{ textAlign: 'center', padding: '30px' }}>
                  Inga {activeTab === 'unfulfilled' ? 'ohanterade' : 'skickade'} ordrar hittades.
                </td>
              </tr>
            ) : (
              filteredList.map(b => (
                <tr key={b.id} style={{ background: selectedBookingIds.includes(b.id) ? 'var(--bg-highlight)' : 'transparent' }}>
                  {activeTab === 'unfulfilled' && (
                    <td style={{ textAlign: 'center' }}>
                      <input type="checkbox" checked={selectedBookingIds.includes(b.id)} onChange={() => toggleSelect(b.id)} />
                    </td>
                  )}
                  <td>#{b.id}</td>
                  <td>{b.customer_first_name} {b.customer_last_name}</td>
                  <td>{b.product_name || `SKU: ${b.sku}`}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.85rem' }}>
                      <MapPin style={{ width: 12, height: 12 }} />
                      {b.shipping_address || 'Okänd adress'}
                    </div>
                  </td>
                  <td>
                    <span className={`status-badge status-${b.status}`}>
                      {b.status === 'pending' && 'Väntar'}
                      {b.status === 'reserved' && 'Bokad'}
                      {b.status === 'confirmed' && 'Skickad'}
                    </span>
                  </td>
                  <td>
                    {b.tracking_number ? (
                      <a href={b.shipping_label_url || '#'} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--color-primary)', textDecoration: 'none' }}>
                        <Truck style={{ width: 14, height: 14 }} />
                        {b.tracking_number}
                      </a>
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Ej skapad</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
