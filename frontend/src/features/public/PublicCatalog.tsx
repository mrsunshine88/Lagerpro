import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  PackageSearch,
  ShoppingCart,
  LogIn,
  Sparkles,
  Search,
  Tag,
  PackageOpen,
  X,
  Check,
  MapPin,
  CalendarCheck,
  FileSpreadsheet,
  Trash2
} from 'lucide-react';
import type { Product, Variant } from '../../types';

interface PublicCatalogProps {
  publicProducts: any[];
  fetchPublicProducts: () => Promise<void>;
  projectConfigs: Record<string, { checkout_mode: string; delivery_method: string; shipping_cost: number }>;
  setLoginModalOpen: (open: boolean) => void;
  apiBaseUrl: string;
}

export const PublicCatalog: React.FC<PublicCatalogProps> = ({
  publicProducts,
  fetchPublicProducts,
  projectConfigs,
  setLoginModalOpen,
  apiBaseUrl,
}) => {
  // --- PUBLIC BOOKING FILTERS ---
  const [publicSearch, setPublicSearch] = useState('');
  const [publicCategory, setPublicCategory] = useState('all');
  const [publicSize, setPublicSize] = useState('all');
  const [publicMaxPrice, setPublicMaxPrice] = useState('');

  // --- PUBLIC SHOPPING CART states ---
  const [publicCart, setPublicCart] = useState<any[]>([]);
  const [cartModalOpen, setCartModalOpen] = useState(false);
  const [cartDiscountCode, setCartDiscountCode] = useState('');
  const [cartDiscountPercent, setCartDiscountPercent] = useState(0);
  const [cartDiscountValid, setCartDiscountValid] = useState(false);
  const [cartDiscountError, setCartDiscountError] = useState('');
  const [cartDiscountFreeShipping, setCartDiscountFreeShipping] = useState(false);
  const [purchasedItems, setPurchasedItems] = useState<any[]>([]);

  // --- STANDARD BOOKING MODAL states ---
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [selectedBookingVariant, setSelectedBookingVariant] = useState<any | null>(null);
  const [bookingFirstName, setBookingFirstName] = useState('');
  const [bookingLastName, setBookingLastName] = useState('');
  const [bookingPhone, setBookingPhone] = useState('');
  const [bookingDiscountCode, setBookingDiscountCode] = useState('');
  const [bookingMessage, setBookingMessage] = useState('');
  const [bookingDiscountPercent, setBookingDiscountPercent] = useState(0);
  const [bookingDiscountValid, setBookingDiscountValid] = useState(false);
  const [bookingDiscountError, setBookingDiscountError] = useState('');
  const [bookingSuccessModalOpen, setBookingSuccessModalOpen] = useState(false);

  // --- CHECKOUT & PAYMENT states ---
  const [checkoutFirstName, setCheckoutFirstName] = useState('');
  const [checkoutLastName, setCheckoutLastName] = useState('');
  const [checkoutPhone, setCheckoutPhone] = useState('');
  const [checkoutDeliveryMethod, setCheckoutDeliveryMethod] = useState('pickup');
  const [checkoutShippingAddress, setCheckoutShippingAddress] = useState('');
  const [checkoutMessage, setCheckoutMessage] = useState('');

  // --- SWISH SIMULATOR states ---
  const [paymentStep, setPaymentStep] = useState<'idle' | 'swish_waiting' | 'swish_success' | 'swish_failed' | 'booking_success'>('idle');
  const [activePaymentId, setActivePaymentId] = useState('');
  const [activePaymentIsMock, setActivePaymentIsMock] = useState(false);
  const [createdBookingIds, setCreatedBookingIds] = useState<number[]>([]);

  // Derived lists for selectors
  const publicCategoriesList = Array.from(new Set(publicProducts.map((p) => p.category)));
  const publicSizesList = Array.from(
    new Set(publicProducts.flatMap((p) => p.variants.map((v: any) => v.size)).filter(Boolean))
  );

  // Filtered Public Products
  const filteredPublicProducts = publicProducts.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(publicSearch.toLowerCase()) ||
      p.category.toLowerCase().includes(publicSearch.toLowerCase()) ||
      p.variants.some(
        (v: any) =>
          (v.size && v.size.toLowerCase().includes(publicSearch.toLowerCase())) ||
          (v.color && v.color.toLowerCase().includes(publicSearch.toLowerCase()))
      );

    const matchesCategory = publicCategory === 'all' || p.category === publicCategory;

    const matchesSize =
      publicSize === 'all' || p.variants.some((v: any) => v.size === publicSize);

    const matchesPrice =
      !publicMaxPrice ||
      p.variants.some((v: any) => v.selling_price <= parseFloat(publicMaxPrice));

    const matchesStock = p.variants.some((v: any) => v.stock > 0);

    return matchesSearch && matchesCategory && matchesSize && matchesPrice && matchesStock;
  });

  // Swish Polling effect
  useEffect(() => {
    if (paymentStep !== 'swish_waiting' || createdBookingIds.length === 0) return;

    let timer: any;
    const checkStatus = async () => {
      try {
        const res = await axios.get(
          `${apiBaseUrl}/api/public/bookings/payment-status?ids=${createdBookingIds.join(',')}`
        );
        if (res.data.paid) {
          setPaymentStep('swish_success');
          setPublicCart([]);
          fetchPublicProducts();
          clearInterval(timer);
        }
      } catch (e) {
        console.error(e);
      }
    };

    timer = setInterval(checkStatus, 2000);
    return () => clearInterval(timer);
  }, [paymentStep, createdBookingIds, apiBaseUrl, fetchPublicProducts]);

  // Reset booking form when modal opens/closes
  useEffect(() => {
    if (!bookingModalOpen) {
      setBookingFirstName('');
      setBookingLastName('');
      setBookingPhone('');
      setBookingDiscountCode('');
      setBookingMessage('');
      setBookingDiscountPercent(0);
      setBookingDiscountValid(false);
      setBookingDiscountError('');
    }
  }, [bookingModalOpen]);

  // Add Item to Public Cart
  const addToPublicCart = (prodName: string, prodCat: string, variant: any) => {
    const exists = publicCart.find((item) => item.variant.id === variant.id);
    if (exists) {
      alert('Denna storlek finns redan i din varukorg!');
      return;
    }

    const newConfig = projectConfigs[prodCat] || { checkout_mode: 'booking' };

    if (publicCart.length > 0) {
      const existingCat = publicCart[0].product_category;
      const existingConfig = projectConfigs[existingCat] || { checkout_mode: 'booking' };
      if (newConfig.checkout_mode !== existingConfig.checkout_mode) {
        alert(
          `Du kan inte blanda direktköp (näthandel) och butiksbokningar i samma varukorg. Vänligen slutför din befintliga bokning/order först!`
        );
        return;
      }
    }

    setPublicCart([
      ...publicCart,
      {
        variant,
        product_name: prodName,
        product_category: prodCat,
        quantity: 1
      }
    ]);

    alert(`Lade till "${prodName} - Storlek ${variant.size}" i varukorgen!`);
  };

  // Validate discount code for public booking
  const checkBookingDiscountCode = async (code: string, category: string) => {
    setBookingDiscountCode(code);
    if (!code.trim()) {
      setBookingDiscountValid(false);
      setBookingDiscountPercent(0);
      setBookingDiscountError('');
      return;
    }
    try {
      const res = await axios.get(
        `${apiBaseUrl}/api/public/discount-codes/validate?code=${encodeURIComponent(code)}&category=${encodeURIComponent(category)}`
      );
      if (res.data.valid) {
        setBookingDiscountValid(true);
        setBookingDiscountPercent(res.data.discountPercent);
        setBookingDiscountError('');
      } else {
        setBookingDiscountValid(false);
        setBookingDiscountPercent(0);
        setBookingDiscountError(res.data.project ? `Gäller endast kategori "${res.data.project}"` : 'Ogiltig rabattkod');
      }
    } catch (e) {
      setBookingDiscountValid(false);
      setBookingDiscountPercent(0);
      setBookingDiscountError('Kunde inte verifiera koden.');
    }
  };

  // Validate discount code for customer portal cart
  const checkCartDiscountCode = async (code: string) => {
    setCartDiscountCode(code);
    if (!code.trim()) {
      setCartDiscountValid(false);
      setCartDiscountPercent(0);
      setCartDiscountFreeShipping(false);
      setCartDiscountError('');
      return;
    }
    if (publicCart.length === 0) return;
    const category = publicCart[0].product_category;
    try {
      const res = await axios.get(
        `${apiBaseUrl}/api/public/discount-codes/validate?code=${encodeURIComponent(code)}&category=${encodeURIComponent(category)}`
      );
      if (res.data.valid) {
        setCartDiscountValid(true);
        setCartDiscountPercent(res.data.discountPercent);
        setCartDiscountFreeShipping(!!res.data.freeShipping);
        setCartDiscountError('');
      } else {
        setCartDiscountValid(false);
        setCartDiscountPercent(0);
        setCartDiscountFreeShipping(false);
        setCartDiscountError(res.data.project ? `Gäller endast kategori "${res.data.project}"` : 'Ogiltig rabattkod');
      }
    } catch (e) {
      setCartDiscountValid(false);
      setCartDiscountPercent(0);
      setCartDiscountFreeShipping(false);
      setCartDiscountError('Kunde inte verifiera koden.');
    }
  };

  // Customer reservation form submit (direct popup book)
  const handlePublicBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBookingVariant) return;

    try {
      const res = await axios.post(`${apiBaseUrl}/api/public/bookings`, {
        variant_id: selectedBookingVariant.id,
        first_name: bookingFirstName.trim(),
        last_name: bookingLastName.trim(),
        phone: bookingPhone.trim(),
        discount_code: bookingDiscountValid ? bookingDiscountCode.trim() : undefined,
        message: bookingMessage.trim() || undefined
      });
      if (res.data.success) {
        setBookingModalOpen(false);
        setBookingFirstName('');
        setBookingLastName('');
        setBookingPhone('');
        setBookingDiscountCode('');
        setBookingMessage('');
        setBookingDiscountPercent(0);
        setBookingDiscountValid(false);
        setBookingDiscountError('');
        setBookingSuccessModalOpen(true);
        fetchPublicProducts();
      }
    } catch (e) {
      alert('Kunde inte spara bokningen. Kontrollera att det finns i lager.');
    }
  };

  // Checkout Shopping Cart (Batch reservation / Swish Payment)
  const handleCheckoutCart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (publicCart.length === 0) return;

    const cat = publicCart[0].product_category;
    const config = projectConfigs[cat] || { checkout_mode: 'booking', delivery_method: 'pickup', shipping_cost: 0 };

    const isEcom = config.checkout_mode === 'ecommerce';
    const isShipping = isEcom && checkoutDeliveryMethod === 'shipping';
    const shippingCost = isShipping ? (cartDiscountValid && cartDiscountFreeShipping ? 0 : (config.shipping_cost || 0)) : 0;

    try {
      const res = await axios.post(`${apiBaseUrl}/api/public/bookings/batch`, {
        items: publicCart.map((item) => ({ variant_id: item.variant.id })),
        first_name: checkoutFirstName.trim(),
        last_name: checkoutLastName.trim(),
        phone: checkoutPhone.trim(),
        discount_code: cartDiscountValid ? cartDiscountCode.trim() : undefined,
        message: checkoutMessage.trim() || undefined,
        delivery_method: isShipping ? 'shipping' : 'pickup',
        shipping_address: isShipping ? checkoutShippingAddress.trim() : undefined,
        shipping_cost: shippingCost,
        payment_status: isEcom ? 'swish_pending' : 'store_payment'
      });

      if (res.data.success && res.data.booking_ids) {
        const bIds = res.data.booking_ids;
        setCreatedBookingIds(bIds);
        setPurchasedItems(publicCart);

        if (!isEcom) {
          setPublicCart([]);
          fetchPublicProducts();
          setPaymentStep('booking_success');
        } else {
          setPaymentStep('swish_waiting');
          try {
            const payRes = await axios.post(`${apiBaseUrl}/api/public/payments/swish/initiate`, {
              booking_ids: bIds,
              phone_number: checkoutPhone.trim()
            });

            if (payRes.data.success) {
              setActivePaymentId(payRes.data.paymentId);
              setActivePaymentIsMock(payRes.data.isMock);
            }
          } catch (payErr) {
            setPaymentStep('swish_failed');
            alert('Kunde inte starta Swish-betalningen. Kontrollera dina uppgifter.');
          }
        }
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Kunde inte spara dina bokningar. Kontrollera lagersaldot.');
    }
  };

  // Mock Swish checkout completion
  const simulateSwishCompletion = async () => {
    if (!activePaymentId) return;
    try {
      const res = await axios.post(`${apiBaseUrl}/api/public/payments/swish/simulate-mock`, {
        payment_id: activePaymentId
      });
      if (res.data.success) {
        setPaymentStep('swish_success');
        setPublicCart([]);
        fetchPublicProducts();
      }
    } catch (e) {
      alert('Kunde inte simulera Swish-betalning.');
    }
  };

  return (
    <div id="public-container">
      <header className="glass-header">
        <div className="header-left">
          <div className="logo">
            <PackageSearch className="logo-icon animate-float" />
            <h1>LAGER<span>PRO</span></h1>
          </div>
          <span className="badge" style={{ background: 'rgba(217, 70, 239, 0.15)', color: 'var(--color-accent)', border: '1px solid rgba(217, 70, 239, 0.3)', fontWeight: 700, marginLeft: 10, fontSize: '0.75rem', letterSpacing: 0.5 }}>KUNDPORTAL</span>
        </div>
        <div className="header-right" style={{ display: 'flex', gap: 8 }}>
          {publicCart.length > 0 && (
            <button onClick={() => setCartModalOpen(true)} className="btn btn-primary" style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 6, background: 'var(--color-accent)', borderColor: 'var(--color-accent)' }}>
              <ShoppingCart style={{ width: 14, height: 14 }} />
              <span>Visa varukorg ({publicCart.length} par)</span>
            </button>
          )}
          <button onClick={() => setLoginModalOpen(true)} className="btn btn-ghost" style={{ border: '1px solid var(--border-light)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 6 }}>
            <LogIn style={{ width: 14, height: 14 }} />
            <span>Personalinloggning</span>
          </button>
        </div>
      </header>

      <main className="content-wrapper">
        <div className="welcome-banner glass-card" style={{ padding: 40, textAlign: 'center', marginBottom: 30, background: 'linear-gradient(135deg, rgba(217,70,239,0.05) 0%, rgba(139,92,246,0.05) 100%)', border: '1px solid var(--border-light)' }}>
          <Sparkles style={{ width: 48, height: 48, color: 'var(--color-accent)', marginBottom: 15 }} className="animate-float" />
          <h2 style={{ fontSize: '2rem', margin: '0 0 10px 0', fontWeight: 800, letterSpacing: -0.5 }}>Butikens Bokningsportal</h2>
          <p style={{ fontSize: '1.05rem', color: 'var(--text-secondary)', margin: '0 auto', maxWidth: 600, lineHeight: 1.6 }}>
            Hitta dina favoritprodukter, välj variant och reservera direkt online! Dina produkter läggs undan direkt i butiken. Du betalar och hämtar dem enkelt på plats. Ingen registrering eller konto krävs.
          </p>
        </div>

        <section className="controls-panel glass-card" style={{ marginBottom: 30, padding: 20 }}>
          <div className="search-filter-row" style={{ display: 'flex', gap: 15, flexWrap: 'wrap', alignItems: 'center' }}>
            <div className="search-box" style={{ flex: 2, minWidth: 250, position: 'relative' }}>
              <Search style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', width: 16, height: 16 }} />
              <input type="text" value={publicSearch} onChange={(e) => setPublicSearch(e.target.value)} placeholder="Sök efter produkt, färg, storlek eller kategori..." style={{ width: '100%', padding: '10px 12px 10px 40px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)' }} />
            </div>
            
            <div className="filter-box" style={{ flex: 1, minWidth: 150 }}>
              <select value={publicCategory} onChange={(e) => setPublicCategory(e.target.value)} className="custom-select" style={{ width: '100%', height: 42 }}>
                <option value="all">Alla kategorier</option>
                {publicCategoriesList.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            
            <div className="filter-box" style={{ flex: 1, minWidth: 150 }}>
              <select value={publicSize} onChange={(e) => setPublicSize(e.target.value)} className="custom-select" style={{ width: '100%', height: 42 }}>
                <option value="all">Alla storlekar</option>
                {publicSizesList.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div className="filter-box" style={{ flex: 1, minWidth: 150, position: 'relative' }}>
              <Tag style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', width: 14, height: 14, pointerEvents: 'none' }} />
              <input type="number" value={publicMaxPrice} onChange={(e) => setPublicMaxPrice(e.target.value)} placeholder="Max pris (kr)" min="0" step="50" style={{ width: '100%', height: 42, padding: '10px 12px 10px 36px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', boxSizing: 'border-box' }} />
            </div>
          </div>
        </section>

        <section className="products-section">
          <div id="public-catalog-grid" className="products-grid">
            {filteredPublicProducts.map((p) => (
              <div key={p.id} className="glass-card product-card" style={{ padding: 0, overflow: 'hidden' }}>
                <div className="pos-shoe-photo" style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.2)', borderBottom: '1px solid var(--border-light)', position: 'relative' }}>
                  {p.imageUrl ? (
                    <img src={p.imageUrl} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ fontSize: '3rem', opacity: 0.3 }}>👟</div>
                  )}
                </div>
                <div style={{ padding: 20 }}>
                  <div className="product-info-header">
                    <div>
                      <span className="category-tag">{p.category}</span>
                      <h3>{p.name}</h3>
                    </div>
                  </div>
                  {p.description && <p className="product-desc">{p.description}</p>}
                  
                  <div className="variants-section">
                    <h4>Tillgängliga storlekar &amp; färger:</h4>
                    <div className="variants-list" style={{ maxHeight: 200, overflowY: 'auto' }}>
                      {p.variants.filter((v: any) => v.stock > 0).map((v: any) => (
                        <div key={v.id} className="variant-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', borderBottom: '1px solid var(--border-light)' }}>
                          <div style={{ display: 'flex', gap: 10 }}>
                            <span style={{ fontWeight: 700 }}>Storlek: {v.size || 'U'}</span>
                            <span style={{ color: 'var(--text-secondary)' }}>Färg: {v.color || 'Uni'}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            {v.original_price > v.selling_price && (
                              <span style={{ textDecoration: 'line-through', fontSize: '0.8rem', color: 'var(--color-danger)' }}>{v.original_price} kr</span>
                            )}
                            <span style={{ fontWeight: 800, color: 'var(--color-success)' }}>{v.selling_price} kr</span>
                            <button
                              onClick={() => {
                                addToPublicCart(p.name, p.category, v);
                              }}
                              className="btn btn-primary btn-xs"
                            >
                              {projectConfigs[p.category]?.checkout_mode === 'ecommerce' ? 'Köp' : 'Boka'}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredPublicProducts.length === 0 && (
            <div className="empty-state">
              <PackageOpen style={{ width: 48, height: 48, color: 'var(--text-muted)', marginBottom: 15 }} />
              <h3>Inga matchande produkter i lager för tillfället</h3>
              <p>Prova att ändra din sökning eller filter.</p>
            </div>
          )}
        </section>
      </main>
      
      <footer className="app-footer" style={{ marginTop: 50 }}>
        <p>LAGERPRO Kundportal &copy; 2026. Reservera enkelt online och hämta i butik.</p>
      </footer>

      {/* ==================== CUSTOMER BOOKING MODAL ==================== */}
      {bookingModalOpen && selectedBookingVariant && (
        <div className="modal-overlay">
          <div className="modal-card glass-modal modal-sm" style={{ maxWidth: 480 }}>
            <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2>Reservera produkt</h2>
              <button className="btn-close" onClick={() => setBookingModalOpen(false)}><X /></button>
            </div>
            <div className="modal-body">
              <form onSubmit={handlePublicBookingSubmit}>
                <div className="glass-panel" style={{ padding: 15, marginBottom: 20, borderColor: 'var(--color-primary)' }}>
                  <h4 style={{ margin: '0 0 6px 0', color: 'var(--color-primary)' }}>Vald produkt:</h4>
                  <strong>{selectedBookingVariant.product_name}</strong>
                  <div style={{ display: 'flex', gap: 12, fontSize: '0.85rem', marginTop: 4, color: 'var(--text-secondary)' }}>
                    <span>Storlek: {selectedBookingVariant.size}</span>
                    <span>Färg: {selectedBookingVariant.color || 'Uni'}</span>
                    <span>Pris: <strong>{selectedBookingVariant.selling_price} kr</strong></span>
                  </div>
                </div>
                
                <div className="input-container" style={{ marginBottom: 12 }}>
                  <label>Förnamn *</label>
                  <input type="text" value={bookingFirstName} onChange={(e) => setBookingFirstName(e.target.value)} required placeholder="Ditt förnamn..." style={{ width: '100%', padding: 10, background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-light)', color: 'white', borderRadius: 4 }} />
                </div>
                
                <div className="input-container" style={{ marginBottom: 12 }}>
                  <label>Efternamn *</label>
                  <input type="text" value={bookingLastName} onChange={(e) => setBookingLastName(e.target.value)} required placeholder="Ditt efternamn..." style={{ width: '100%', padding: 10, background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-light)', color: 'white', borderRadius: 4 }} />
                </div>
                
                <div className="input-container" style={{ marginBottom: 12 }}>
                  <label>Telefonnummer *</label>
                  <input type="tel" value={bookingPhone} onChange={(e) => setBookingPhone(e.target.value)} required placeholder="T.ex. 070-123 45 67" style={{ width: '100%', padding: 10, background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-light)', color: 'white', borderRadius: 4 }} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15, marginBottom: 15 }}>
                  <div className="input-container">
                    <label>Rabattkod (Frivillig)</label>
                    <input
                      type="text"
                      value={bookingDiscountCode}
                      onChange={(e) => checkBookingDiscountCode(e.target.value, selectedBookingVariant.product_category)}
                      placeholder="T.ex. LARS"
                      style={{
                        width: '100%',
                        padding: 10,
                        background: 'rgba(0,0,0,0.2)',
                        border: bookingDiscountValid ? '1px solid var(--color-success)' : bookingDiscountError ? '1px solid var(--color-danger)' : '1px solid var(--border-light)',
                        color: 'white',
                        borderRadius: 4
                      }}
                    />
                    {bookingDiscountValid && (
                      <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--color-success)', marginTop: 4 }}>
                        ✓ Kod aktiverad! Ger {bookingDiscountPercent}% rabatt.
                      </span>
                    )}
                    {bookingDiscountError && (
                      <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--color-danger)', marginTop: 4 }}>
                        ✗ {bookingDiscountError}
                      </span>
                    )}
                  </div>
                  <div className="input-container">
                    <label>Prisjustering</label>
                    <div style={{ padding: 10, background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-light)', borderRadius: 4, height: 42, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      {bookingDiscountValid ? (
                        <>
                          <span style={{ textDecoration: 'line-through', fontSize: '0.85rem', color: 'var(--text-muted)' }}>{selectedBookingVariant.selling_price} kr</span>
                          <strong style={{ color: 'var(--color-success)', fontSize: '1rem' }}>
                            {Math.round(selectedBookingVariant.selling_price * (1.0 - bookingDiscountPercent / 100.0))} kr
                          </strong>
                        </>
                      ) : (
                        <strong>{selectedBookingVariant.selling_price} kr</strong>
                      )}
                    </div>
                  </div>
                </div>

                <div className="input-container" style={{ marginBottom: 20 }}>
                  <label>Meddelande till butiken (Frivillig)</label>
                  <textarea
                    value={bookingMessage}
                    onChange={(e) => setBookingMessage(e.target.value)}
                    placeholder="T.ex. Önskemål eller när du planerar att hämta..."
                    rows={3}
                    style={{
                      width: '100%',
                      padding: 10,
                      background: 'rgba(0,0,0,0.2)',
                      border: '1px solid var(--border-light)',
                      color: 'white',
                      borderRadius: 4,
                      resize: 'none',
                      fontFamily: 'inherit'
                    }}
                  />
                </div>
                
                <button type="submit" className="btn btn-primary btn-full" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <CalendarCheck />
                  <span>Bekräfta bokning</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ==================== BOOKING SUCCESS MODAL ==================== */}
      {bookingSuccessModalOpen && (
        <div className="modal-overlay">
          <div className="modal-card glass-modal modal-xs text-center" style={{ maxWidth: 400 }}>
            <div className="modal-header" style={{ border: 'none', paddingBottom: 0, display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn-close" onClick={() => setBookingSuccessModalOpen(false)}><X /></button>
            </div>
            <div className="modal-body" style={{ padding: '20px 10px' }}>
              <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'rgba(16,185,129,0.1)', border: '2px solid var(--color-success)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 15px auto' }}>
                <Check style={{ color: 'var(--color-success)', width: 32, height: 32 }} />
              </div>
              <h3 style={{ marginBottom: 8 }}>Din bokning är klar!</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.5, marginBottom: 12 }}>
                Vi har lagt undan dina produkter i butiken åt dig.
              </p>
              <div className="pickup-notice" style={{ background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.25)', borderRadius: 'var(--radius-sm)', padding: 12, margin: '15px 0 20px 0', textAlign: 'left' }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                  <MapPin style={{ color: '#fbbf24', width: 16, height: 16 }} />
                  <strong style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>Hämtas på:</strong>
                </div>
                <span style={{ display: 'block', fontSize: '0.95rem', fontWeight: 700, color: '#fbbf24', marginLeft: 24 }}>Ramdala krukor</span>
                <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginLeft: 24, marginTop: 2 }}>Välkommen att hämta och betala i butiken inom 3 dagar.</span>
              </div>
              <button className="btn btn-success btn-full" onClick={() => setBookingSuccessModalOpen(false)}>Stäng</button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== PUBLIC SHOPPING CART / CHECKOUT MODAL ==================== */}
      {cartModalOpen && (
        <div className="modal-overlay">
          <div className="modal-card glass-modal modal-md" style={{ maxWidth: 520 }}>
            <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2>Varukorg &amp; Kassa</h2>
              <button className="btn-close" onClick={() => setCartModalOpen(false)}><X /></button>
            </div>
            
            <div className="modal-body" style={{ maxHeight: '80vh', overflowY: 'auto' }}>
              {paymentStep === 'swish_waiting' && (
                <div style={{ textAlign: 'center', padding: '30px 10px' }}>
                  <div className="spinner" style={{ border: '4px solid rgba(16,185,129,0.1)', borderLeftColor: 'var(--color-success)', borderRadius: '50%', width: 50, height: 50, animation: 'spin 1s linear infinite', margin: '0 auto 20px auto' }}></div>
                  <style>{`
                    @keyframes spin {
                      0% { transform: rotate(0deg); }
                      100% { transform: rotate(360deg); }
                    }
                  `}</style>
                  <h3 style={{ marginBottom: 10, color: 'var(--color-success)' }}>Väntar på Swish...</h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.5, marginBottom: 20 }}>
                    Öppna din Swish-app i mobilen för att slutföra betalningen. Betalningen registreras automatiskt här så fort den är godkänd.
                  </p>
                  
                  {activePaymentIsMock && (
                    <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px dashed var(--border-light)', padding: 15, borderRadius: 6, marginBottom: 20 }}>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 12 }}>
                        Eftersom du kör i test/simuleringsläge kan du godkänna köpet manuellt nedan:
                      </p>
                      <button type="button" onClick={simulateSwishCompletion} className="btn btn-success btn-sm btn-full" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                        <Check style={{ width: 14, height: 14 }} />
                        <span>Simulera Swish-godkännande</span>
                      </button>
                    </div>
                  )}
                  
                  <button type="button" onClick={() => setPaymentStep('idle')} className="btn btn-ghost btn-sm btn-full" style={{ color: 'var(--color-danger)' }}>
                    Avbryt betalning och gå tillbaka
                  </button>
                </div>
              )}

              {(paymentStep === 'swish_success' || paymentStep === 'booking_success') && (
                <div id="receipt-print-area" style={{ padding: '10px 5px' }}>
                  <style>{`
                    @media print {
                      body * {
                        visibility: hidden !important;
                      }
                      #receipt-print-area, #receipt-print-area * {
                        visibility: visible !important;
                      }
                      #receipt-print-area {
                        position: absolute !important;
                        left: 0 !important;
                        top: 0 !important;
                        width: 100% !important;
                        color: #000 !important;
                        background: #fff !important;
                        padding: 20px !important;
                      }
                      .no-print {
                        display: none !important;
                      }
                      .glass-panel {
                        border: 1px solid #ccc !important;
                        background: none !important;
                        color: #000 !important;
                      }
                      .modal-card {
                        background: #fff !important;
                        border: none !important;
                        box-shadow: none !important;
                      }
                    }
                  `}</style>

                  <div className="no-print" style={{ textAlign: 'center', marginBottom: 20 }}>
                    <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'rgba(16,185,129,0.1)', border: '2px solid var(--color-success)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 15px auto' }}>
                      <Check style={{ color: 'var(--color-success)', width: 32, height: 32 }} />
                    </div>
                    <h3 style={{ marginBottom: 6, fontSize: '1.4rem' }}>
                      {paymentStep === 'swish_success' ? 'Betalning godkänd!' : 'Bokning klar!'}
                    </h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.4, maxWidth: 360, margin: '0 auto' }}>
                      {paymentStep === 'swish_success' 
                        ? 'Tack för ditt köp! Din Swish-betalning har verifierats och dina varor har reserverats.'
                        : 'Vi har lagt undan dina produkter i butiken. Välkommen att hämta!'
                      }
                    </p>
                  </div>

                  {/* Digital Kvitto Card */}
                  <div className="glass-panel" style={{ padding: 20, borderRadius: 8, background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-light)', marginBottom: 20 }}>
                    <div style={{ textAlign: 'center', borderBottom: '1px dashed var(--border-light)', paddingBottom: 15, marginBottom: 15 }}>
                      <h4 style={{ margin: '0 0 4px 0', fontSize: '1.2rem', color: 'var(--color-primary)' }}>ORDERBEKRÄFTELSE</h4>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        Datum: {new Date().toLocaleString('sv-SE')}
                      </span>
                      <div style={{ marginTop: 8, fontSize: '1.1rem', fontWeight: 800, color: 'var(--color-success)' }}>
                        Ordernummer: {createdBookingIds.map((id) => `#${id}`).join(', ')}
                      </div>
                    </div>

                    {/* Customer Info */}
                    <div style={{ marginBottom: 15, fontSize: '0.85rem' }}>
                      <h5 style={{ margin: '0 0 6px 0', color: 'var(--text-secondary)', fontSize: '0.75rem', letterSpacing: 0.5, textTransform: 'uppercase' }}>Kunduppgifter:</h5>
                      <div><strong>Namn:</strong> {checkoutFirstName} {checkoutLastName}</div>
                      <div><strong>Telefon:</strong> {checkoutPhone}</div>
                    </div>

                    {/* Purchased Items */}
                    <div style={{ marginBottom: 15 }}>
                      <h5 style={{ margin: '0 0 6px 0', color: 'var(--text-secondary)', fontSize: '0.75rem', letterSpacing: 0.5, textTransform: 'uppercase' }}>Beställda varor:</h5>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {purchasedItems.map((item, idx) => (
                          <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: 4 }}>
                            <div style={{ flex: 1, marginRight: 12 }}>
                              <span style={{ display: 'block', wordBreak: 'break-word', whiteSpace: 'normal' }}>{item.product_name}</span>
                              <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                                Storlek: {item.variant.size} | Färg: {item.variant.color || 'Uni'}
                              </span>
                            </div>
                            <span style={{ fontWeight: 600 }}>{item.variant.selling_price} kr</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Delivery & Payment Info */}
                    <div style={{ marginBottom: 15, padding: '10px 12px', background: 'rgba(255,255,255,0.02)', borderRadius: 6, border: '1px solid var(--border-light)', fontSize: '0.85rem' }}>
                      <div style={{ marginBottom: 6 }}>
                        <strong>Leveranssätt:</strong>{' '}
                        {checkoutDeliveryMethod === 'shipping' ? (
                          <span style={{ color: '#60a5fa', fontWeight: 600 }}>PostNord Hemleverans</span>
                        ) : (
                          <span style={{ color: '#fbbf24', fontWeight: 600 }}>Hämtas i butik (Ramdala Krukor)</span>
                        )}
                      </div>
                      
                      {checkoutDeliveryMethod === 'shipping' && checkoutShippingAddress && (
                        <div style={{ marginBottom: 6, color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                          <strong>Mottagaradress:</strong> {checkoutShippingAddress}
                        </div>
                      )}

                      <div>
                        <strong>Betalsätt:</strong>{' '}
                        {paymentStep === 'swish_success' ? (
                          <span style={{ color: 'var(--color-success)', fontWeight: 600 }}>✓ Swish (Betald online)</span>
                        ) : (
                          <span style={{ color: 'var(--text-secondary)' }}>Betalas i butik vid upphämtning</span>
                        )}
                      </div>
                    </div>

                    {/* Price Spec */}
                    {(() => {
                      const originalTotal = purchasedItems.reduce((sum, item) => sum + item.variant.selling_price * item.quantity, 0);
                      const discountAmount = cartDiscountValid ? Math.round(originalTotal * (cartDiscountPercent / 100)) : 0;
                      
                      const firstItem = purchasedItems[0] || {};
                      const cat = firstItem.product_category;
                      const config = projectConfigs[cat] || { shipping_cost: 0 };
                      const hasFreeShipping = cartDiscountValid && cartDiscountFreeShipping;
                      const shippingCost = checkoutDeliveryMethod === 'shipping' ? (hasFreeShipping ? 0 : config.shipping_cost || 0) : 0;
                      const finalTotal = originalTotal - discountAmount + shippingCost;

                      return (
                        <div style={{ borderTop: '1px dashed var(--border-light)', paddingTop: 10, fontSize: '0.85rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                            <span style={{ color: 'var(--text-secondary)' }}>Produktsumma:</span>
                            <span>{originalTotal} kr</span>
                          </div>
                          {cartDiscountValid && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-success)', marginBottom: 4 }}>
                              <span>Rabatt (-{cartDiscountPercent}%):</span>
                              <span>-{discountAmount} kr</span>
                            </div>
                          )}
                          {checkoutDeliveryMethod === 'shipping' && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#60a5fa', marginBottom: 4 }}>
                              <span>PostNord Frakt:</span>
                              <span>{hasFreeShipping ? '0 kr (Fri frakt)' : `+${shippingCost} kr`}</span>
                            </div>
                          )}
                          <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-light)', paddingTop: 6, marginTop: 6, fontSize: '1rem', fontWeight: 800 }}>
                            <span>Totalt:</span>
                            <span style={{ color: 'var(--color-success)' }}>{finalTotal} kr</span>
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Actions */}
                  <div className="no-print" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="btn btn-primary btn-full"
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '10px' }}
                    >
                      <FileSpreadsheet style={{ width: 16, height: 16 }} />
                      <span>Skriv ut / Spara PDF</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCartModalOpen(false);
                        setPaymentStep('idle');
                        setCheckoutFirstName('');
                        setCheckoutLastName('');
                        setCheckoutPhone('');
                        setCheckoutShippingAddress('');
                        setCheckoutMessage('');
                        setCartDiscountCode('');
                        setCartDiscountPercent(0);
                        setCartDiscountValid(false);
                        setPurchasedItems([]);
                      }}
                      className="btn btn-ghost btn-full"
                      style={{ padding: '10px' }}
                    >
                      Stäng kvitto
                    </button>
                  </div>
                </div>
              )}

              {paymentStep === 'swish_failed' && (
                <div style={{ textAlign: 'center', padding: '30px 10px' }}>
                  <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'rgba(239,68,68,0.1)', border: '2px solid var(--color-danger)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px auto' }}>
                    <X style={{ color: 'var(--color-danger)', width: 32, height: 32 }} />
                  </div>
                  <h3 style={{ marginBottom: 10, color: 'var(--color-danger)' }}>Betalningen misslyckades</h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.5, marginBottom: 20 }}>
                    Kunde inte slutföra din Swish-betalning. Vänligen kontrollera ditt Swish-nummer eller försök igen.
                  </p>
                  <button type="button" onClick={() => setPaymentStep('idle')} className="btn btn-primary btn-full">
                    Försök igen
                  </button>
                </div>
              )}

              {paymentStep === 'idle' && (
                <>
                  {publicCart.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px 10px' }}>
                      <ShoppingCart style={{ width: 48, height: 48, color: 'var(--text-muted)', marginBottom: 15 }} />
                      <h3>Din varukorg är tom</h3>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: 20 }}>Gå till katalogen och lägg till produkter.</p>
                      <button onClick={() => setCartModalOpen(false)} className="btn btn-primary">Tillbaka till butiken</button>
                    </div>
                  ) : (() => {
                    const firstItem = publicCart[0];
                    const cat = firstItem.product_category;
                    const config = projectConfigs[cat] || { checkout_mode: 'booking', delivery_method: 'pickup', shipping_cost: 0 };
                    
                    const isEcom = config.checkout_mode === 'ecommerce';
                    const hasShipping = config.delivery_method === 'shipping_pickup';
                    
                    const originalTotal = publicCart.reduce((sum, item) => sum + item.variant.selling_price * item.quantity, 0);
                    const discountAmount = cartDiscountValid ? Math.round(originalTotal * (cartDiscountPercent / 100)) : 0;
                    const isFreeShippingApplied = cartDiscountValid && cartDiscountFreeShipping;
                    const shippingCost = isEcom && hasShipping && checkoutDeliveryMethod === 'shipping' ? (isFreeShippingApplied ? 0 : config.shipping_cost || 0) : 0;
                    const finalTotal = originalTotal - discountAmount + shippingCost;

                    return (
                      <form onSubmit={handleCheckoutCart}>
                        {/* Cart items list */}
                        <div style={{ marginBottom: 20 }}>
                          <h4 style={{ color: 'var(--color-primary)', marginBottom: 10 }}>Dina valda produkter:</h4>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {publicCart.map((item) => (
                              <div key={item.variant.id} className="glass-panel" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 15px', background: 'rgba(255,255,255,0.02)' }}>
                                <div style={{ flex: 1, marginRight: 12 }}>
                                  <strong style={{ display: 'block', fontSize: '0.95rem', wordBreak: 'break-word', whiteSpace: 'normal' }}>{item.product_name}</strong>
                                  <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                                    Storlek: {item.variant.size} | Färg: {item.variant.color || 'Uni'}
                                  </span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
                                  <strong style={{ color: 'var(--color-success)', fontSize: '0.95rem' }}>{item.variant.selling_price} kr</strong>
                                  <button
                                    type="button"
                                    onClick={() => setPublicCart(publicCart.filter((c) => c.variant.id !== item.variant.id))}
                                    style={{ border: 'none', background: 'none', color: 'var(--color-danger)', cursor: 'pointer', padding: 4 }}
                                    title="Ta bort"
                                  >
                                    <Trash2 style={{ width: 14, height: 14 }} />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Customer Form */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15, marginBottom: 12 }}>
                          <div className="input-container">
                            <label>Förnamn *</label>
                            <input
                              type="text"
                              value={checkoutFirstName}
                              onChange={(e) => setCheckoutFirstName(e.target.value)}
                              required
                              placeholder="Ditt förnamn..."
                              style={{ width: '100%', padding: 10, background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-light)', color: 'white', borderRadius: 4 }}
                            />
                          </div>
                          <div className="input-container">
                            <label>Efternamn *</label>
                            <input
                              type="text"
                              value={checkoutLastName}
                              onChange={(e) => setCheckoutLastName(e.target.value)}
                              required
                              placeholder="Ditt efternamn..."
                              style={{ width: '100%', padding: 10, background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-light)', color: 'white', borderRadius: 4 }}
                            />
                          </div>
                        </div>

                        <div className="input-container" style={{ marginBottom: 12 }}>
                          <label>Telefonnummer {isEcom && '(för Swish)'} *</label>
                          <input
                            type="tel"
                            value={checkoutPhone}
                            onChange={(e) => setCheckoutPhone(e.target.value)}
                            required
                            placeholder="T.ex. 0701234567"
                            style={{ width: '100%', padding: 10, background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-light)', color: 'white', borderRadius: 4 }}
                          />
                        </div>

                        {/* Discount Code */}
                        <div className="input-container" style={{ marginBottom: 12 }}>
                          <label>Rabattkod (Frivillig)</label>
                          <input
                            type="text"
                            value={cartDiscountCode}
                            onChange={(e) => checkCartDiscountCode(e.target.value)}
                            placeholder="Skriv kod här..."
                            style={{
                              width: '100%',
                              padding: 10,
                              background: 'rgba(0,0,0,0.2)',
                              border: cartDiscountValid ? '1px solid var(--color-success)' : cartDiscountError ? '1px solid var(--color-danger)' : '1px solid var(--border-light)',
                              color: 'white',
                              borderRadius: 4
                            }}
                          />
                          {cartDiscountValid && (
                            <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--color-success)', marginTop: 4 }}>
                              ✓ Kod aktiverad! Ger {cartDiscountPercent}% rabatt.
                            </span>
                          )}
                          {cartDiscountError && (
                            <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--color-danger)', marginTop: 4 }}>
                              ✗ {cartDiscountError}
                            </span>
                          )}
                        </div>

                        {/* Delivery options if ecommerce & shipping option available */}
                        {isEcom && hasShipping && (
                          <div style={{ marginBottom: 15 }}>
                            <label style={{ display: 'block', marginBottom: 8, fontSize: '0.85rem', fontWeight: 600 }}>Leveransmetod *</label>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                              <button
                                type="button"
                                onClick={() => setCheckoutDeliveryMethod('pickup')}
                                className={`btn btn-sm ${checkoutDeliveryMethod === 'pickup' ? 'btn-primary' : 'btn-secondary'}`}
                                style={{ padding: 10, fontSize: '0.85rem' }}
                              >
                                Hämta i butik (0 kr)
                              </button>
                              <button
                                type="button"
                                onClick={() => setCheckoutDeliveryMethod('shipping')}
                                className={`btn btn-sm ${checkoutDeliveryMethod === 'shipping' ? 'btn-primary' : 'btn-secondary'}`}
                                style={{ padding: 10, fontSize: '0.85rem' }}
                              >
                                PostNord Frakt ({isFreeShippingApplied ? 'Gratis' : `+${config.shipping_cost} kr`})
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Delivery Address if Postnord chosen */}
                        {isEcom && hasShipping && checkoutDeliveryMethod === 'shipping' && (
                          <div className="input-container" style={{ marginBottom: 12 }}>
                            <label>Leveransadress *</label>
                            <textarea
                              value={checkoutShippingAddress}
                              onChange={(e) => setCheckoutShippingAddress(e.target.value)}
                              required
                              placeholder="Ange fullständig adress (Gata, Postnummer, Ort)..."
                              style={{ width: '100%', height: 70, padding: 10, background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-light)', color: 'white', borderRadius: 4 }}
                            />
                          </div>
                        )}

                        <div className="input-container" style={{ marginBottom: 20 }}>
                          <label>Meddelande till butiken (Valfritt)</label>
                          <textarea
                            value={checkoutMessage}
                            onChange={(e) => setCheckoutMessage(e.target.value)}
                            placeholder="Skriv dina önskemål eller meddelande här..."
                            style={{ width: '100%', height: 60, padding: 10, background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-light)', color: 'white', borderRadius: 4 }}
                          />
                        </div>

                        {/* Order Summary */}
                        <div className="glass-panel" style={{ padding: 15, marginBottom: 20, background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-light)' }}>
                          <h4 style={{ margin: '0 0 10px 0', borderBottom: '1px solid var(--border-light)', paddingBottom: 6 }}>Prisöversikt:</h4>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: '0.9rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span style={{ color: 'var(--text-secondary)' }}>Produktsumma:</span>
                              <span>{originalTotal} kr</span>
                            </div>
                            
                            {cartDiscountValid && (
                              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-success)', fontWeight: 600 }}>
                                <span>Rabatt (Kod: {cartDiscountCode.toUpperCase()} -{cartDiscountPercent}%):</span>
                                <span>-{discountAmount} kr</span>
                              </div>
                            )}

                            {isEcom && hasShipping && checkoutDeliveryMethod === 'shipping' && (
                              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#60a5fa' }}>
                                <span>PostNord Hemleverans:</span>
                                <span>{isFreeShippingApplied ? '0 kr (Fri frakt)' : `+${config.shipping_cost} kr`}</span>
                              </div>
                            )}

                            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-light)', paddingTop: 8, marginTop: 4, fontSize: '1.05rem', fontWeight: 800 }}>
                              <span>Totalt {isEcom ? 'att betala' : 'att boka'}:</span>
                              <span style={{ color: 'var(--color-success)' }}>{finalTotal} kr</span>
                            </div>
                          </div>
                        </div>

                        {/* Submit Button */}
                        <button type="submit" className="btn btn-success btn-full" style={{ padding: '12px', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                          {isEcom ? (
                            <>
                              <ShoppingCart style={{ width: 18, height: 18 }} />
                              <span>Betala {finalTotal} kr med Swish</span>
                            </>
                          ) : (
                            <>
                              <CalendarCheck style={{ width: 18, height: 18 }} />
                              <span>Bekräfta bokning ({finalTotal} kr)</span>
                            </>
                          )}
                        </button>
                      </form>
                    );
                  })()}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
