import axios from '../../apiClient';
import React, { useState } from 'react';
import { supabase } from '../../supabaseClient';
import {
  Search,
  ScanLine,
  ArrowRight,
  ShoppingBag,
  ShoppingCart,
  CheckCircle2,
  X
} from 'lucide-react';
import type { Product, Variant, CartItem } from '../../types';

interface PosTabProps {
  products: Product[];
  cart: CartItem[];
  posDiscount: number;
  addToCart: (product: Product, variant: Variant) => void;
  updateCartQty: (variantId: number, qty: number) => void;
  clearPosCart: () => void;
  updatePosOrderDiscount: (discount: number) => void;
  handlePOSCheckout: (paymentMethod?: string) => Promise<void>;
  apiBaseUrl: string;
  getAxiosConfig: () => any;
  hasAllAccess?: boolean;
  projectsList?: string[];
  projectConfigs?: Record<string, { checkout_mode: string; delivery_method: string; shipping_cost: number }>;
  swishMerchantId?: string;
}

export const PosTab: React.FC<PosTabProps> = ({
  products,
  cart,
  posDiscount,
  addToCart,
  updateCartQty,
  clearPosCart,
  updatePosOrderDiscount,
  handlePOSCheckout,
  apiBaseUrl,
  getAxiosConfig,
  hasAllAccess = false,
  projectsList = [],
  projectConfigs = {},
  swishMerchantId = '',
}) => {
  // --- POS TAB SPECIFIC VISUAL STATES ---
  const [posShowCartMobile, setPosShowCartMobile] = useState(false);
  const [posCategory, setPosCategory] = useState('all');
  const [posSearch, setPosSearch] = useState('');
  const [selectedVariants, setSelectedVariants] = useState<Record<number, number>>({});

  // --- SCANNER SIMULATOR STATES ---
  const [scanModalOpen, setScanModalOpen] = useState(false);
  const [scanSkuInput, setScanSkuInput] = useState('');
  const [scanMessage, setScanMessage] = useState('');

  // --- SWISH POS STATES ---
  const [swishModalOpen, setSwishModalOpen] = useState(false);

  // Categories list – use projectsList if available so empty projects appear too
  const categoriesList = projectsList.length > 0
    ? projectsList
    : Array.from(new Set(products.map((p) => p.category)));

  const isPlaceholderProduct = (p: Product) => {
    return p.name.startsWith('Startprodukt (') && p.description === 'Placeholder för nyskapat projekt.';
  };

  // Filter products for POS
  const filteredPosProducts = products.filter((p) => {
    if (isPlaceholderProduct(p)) return false;
    const matchesSearch =
      p.name.toLowerCase().includes(posSearch.toLowerCase()) ||
      p.category.toLowerCase().includes(posSearch.toLowerCase());
    const matchesCategory = posCategory === 'all' || p.category === posCategory;
    return matchesSearch && matchesCategory;
  });

  // Totals for POS Cart
  const cartTotalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const cartOriginalTotal = cart.reduce((sum, item) => sum + item.variant.selling_price * item.quantity, 0);
  const cartCurrentTotal = cart.reduce(
    (sum, item) => sum + (item.selling_price ?? item.variant.selling_price) * item.quantity,
    0
  );
  const cartSavings = cartOriginalTotal - cartCurrentTotal;

  // Determine if Swish should be available based on cart items and project configs
  const isSwishEnabledInCart = cart.length > 0 && cart.some(item => {
    const config = projectConfigs[item.product.category] || projectConfigs['Alla'];
    return config && (config.checkout_mode === 'ecommerce' || config.checkout_mode === 'both');
  });

  // Generate Swish QR URL if modal is open
  // Format: C{merchantId};{amount};{message};0
  // API: https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=...
  const swishQrData = `C${swishMerchantId};${cartCurrentTotal};Kassa;0`;
  const swishQrUrl = swishMerchantId ? `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(swishQrData)}` : '';

  // Handle Scan Submit
  const handleBarcodeScan = async (e: React.FormEvent) => {
    e.preventDefault();
    setScanMessage('');
    if (!scanSkuInput.trim()) return;

    try {
      const res = await axios.post(
        `${apiBaseUrl}/api/scan`,
        { sku: scanSkuInput.trim() },
        getAxiosConfig()
      );
      if (res.data.success && res.data.found) {
        const found = res.data.variant;
        const prod = products.find((p) => p.id === found.product_id);
        if (prod) {
          addToCart(prod, found);
          setScanMessage(`Hittade: ${found.product_name} - ${found.size} (${found.color}) och lade till i kassan!`);
          setScanSkuInput('');
        }
      } else {
        setScanMessage(res.data.message || 'Koden hittades inte.');
      }
    } catch (err) {
      setScanMessage('Koppling till skanner misslyckades.');
    }
  };

  return (
    <div className="tab-pane">
      <div className={`pos-wrapper ${posShowCartMobile ? 'show-cart' : ''}`} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20 }}>
        {/* Left Side: Products grid */}
        <div className="pos-products-panel glass-card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
            <h2 style={{ margin: 0, fontSize: '1.3rem' }}>Kassa &amp; Snabbköp</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button onClick={() => { setScanModalOpen(true); setScanMessage(''); }} className="btn btn-accent btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <ScanLine style={{ width: 14, height: 14 }} />
                <span>Skanna</span>
              </button>
              <select value={posCategory} onChange={(e) => setPosCategory(e.target.value)} className="custom-select" style={{ minWidth: 150, padding: '6px 12px', fontSize: '0.8rem' }}>
                {(hasAllAccess || categoriesList.length > 1) && (
                  <option value="all">Alla kategorier</option>
                )}
                {categoriesList.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="search-bar" style={{ margin: '0 0 15px 0', position: 'relative' }}>
            <Search className="search-icon" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', width: 16, height: 16, color: 'var(--text-muted)' }} />
            <input type="text" value={posSearch} onChange={(e) => setPosSearch(e.target.value)} placeholder="Sök produkt efter namn..." style={{ width: '100%', padding: '8px 12px 8px 36px', fontSize: '0.85rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-light)', color: 'var(--text-primary)', borderRadius: 'var(--radius-sm)' }} />
          </div>
          
          <div id="pos-products-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 15, maxHeight: '60vh', overflowY: 'auto', paddingRight: 5 }}>
            {filteredPosProducts.map((p) => (
              <div key={p.id} className="pos-product-card glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
                <div className="pos-shoe-photo">
                  {p.imageUrl ? (
                    <img src={p.imageUrl} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div className="pos-img-placeholder">👟</div>
                  )}
                </div>
                <div className="pos-product-card-info" style={{ padding: 10 }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>{p.category}</span>
                  <strong style={{ display: 'block', fontSize: '0.9rem', marginBottom: 8, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</strong>
                
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {p.variants.map((v) => {
                        const isSelected = selectedVariants[p.id] === v.id;
                        return (
                          <button
                            key={v.id}
                            disabled={v.stock <= 0}
                            onClick={() => setSelectedVariants({ ...selectedVariants, [p.id]: isSelected ? 0 : v.id })}
                            style={{
                              padding: '6px 10px',
                              background: isSelected ? 'rgba(139, 92, 246, 0.2)' : 'rgba(255,255,255,0.03)',
                              border: isSelected ? '1px solid var(--color-primary)' : '1px solid var(--border-light)',
                              borderRadius: 6,
                              color: v.stock <= 0 ? 'var(--text-muted)' : isSelected ? 'white' : 'var(--text-secondary)',
                              cursor: v.stock <= 0 ? 'not-allowed' : 'pointer',
                              opacity: v.stock <= 0 ? 0.4 : 1,
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              minWidth: 45
                            }}
                          >
                            <span style={{ fontSize: '0.85rem', fontWeight: isSelected ? 700 : 500 }}>{v.size || 'U'}</span>
                            {v.color && <span style={{ fontSize: '0.65rem', marginTop: 2 }}>{v.color}</span>}
                          </button>
                        );
                      })}
                    </div>
                    
                    {(() => {
                      const selectedId = selectedVariants[p.id];
                      const selectedVariant = p.variants.find((v) => v.id === selectedId);
                      
                      return (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            {selectedVariant ? (
                              <>
                                {selectedVariant.original_price && selectedVariant.original_price > selectedVariant.selling_price && (
                                  <span style={{ fontSize: '0.65rem', textDecoration: 'line-through', color: 'var(--text-muted)' }}>{selectedVariant.original_price} kr</span>
                                )}
                                <strong style={{ color: selectedVariant.original_price && selectedVariant.original_price > selectedVariant.selling_price ? 'var(--color-success)' : '#38bdf8', fontSize: '1rem' }}>{selectedVariant.selling_price} kr</strong>
                              </>
                            ) : (
                              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Välj variant</span>
                            )}
                          </div>
                          
                          <button
                            disabled={!selectedVariant || selectedVariant.stock <= 0}
                            onClick={() => {
                              if (selectedVariant) {
                                addToCart(p, selectedVariant);
                                setSelectedVariants({ ...selectedVariants, [p.id]: 0 }); // unselect
                              }
                            }}
                            className="btn btn-primary btn-sm"
                            style={{ padding: '6px 12px', fontWeight: 600, display: 'flex', gap: 6, alignItems: 'center' }}
                          >
                            <ShoppingBag style={{ width: 14, height: 14 }} />
                            Lägg till
                          </button>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Side: POS Checkout Cart */}
        <div className="pos-cart-panel glass-card" style={{ padding: 20, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: 'fit-content' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <button
                onClick={() => setPosShowCartMobile(false)}
                className="pos-mobile-back-btn"
                style={{ margin: 0 }}
              >
                <ArrowRight style={{ width: 14, height: 14, transform: 'rotate(180deg)' }} />
                <span>Tillbaka</span>
              </button>
              <button
                onClick={() => setPosShowCartMobile(false)}
                className="pos-cart-close-x"
                aria-label="Stäng varukorg"
              >
                <X />
              </button>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, borderBottom: '1px solid var(--border-light)', paddingBottom: 10 }}>
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <ShoppingBag style={{ color: 'var(--color-primary)' }} />
                <span>Aktuell order</span>
              </h3>
              <button onClick={clearPosCart} className="btn btn-ghost btn-xs" style={{ color: 'var(--text-muted)' }}>Rensa</button>
            </div>
            
            <div style={{ background: 'rgba(139,92,246,0.06)', border: '1px solid rgba(139,92,246,0.2)', borderRadius: 'var(--radius-sm)', padding: 10, marginBottom: 15 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Rabatt denna order:</span>
                <span className="badge" style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444', fontSize: '0.8rem', fontWeight: 700 }}>{posDiscount}%</span>
              </div>
              <input type="range" min="0" max="90" step="5" value={posDiscount} onChange={(e) => updatePosOrderDiscount(parseInt(e.target.value))} style={{ width: '100%', accentColor: 'var(--color-primary)', cursor: 'pointer' }} />
            </div>

            <div id="pos-cart-items" style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: '35vh', overflowY: 'auto', paddingRight: 5 }}>
              {cart.map((item) => (
                <div key={item.variant.id} className="pos-cart-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <strong style={{ display: 'block', fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.product.name}</strong>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>St: {item.variant.size} ({item.variant.color})</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <input type="number" min="0" max={item.variant.stock} value={item.quantity} onChange={(e) => updateCartQty(item.variant.id, parseInt(e.target.value) || 0)} style={{ width: 50, padding: 4, background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-light)', color: 'white', borderRadius: 4, textAlign: 'center' }} />
                    <strong style={{ fontSize: '0.9rem', color: 'var(--color-success)' }}>{(item.selling_price ?? item.variant.selling_price) * item.quantity} kr</strong>
                  </div>
                </div>
              ))}
              {cart.length === 0 && (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
                  <ShoppingCart style={{ width: 36, height: 36, margin: '0 auto 10px auto', opacity: 0.5 }} />
                  <p>Varukorgen är tom.<br />Klicka på en variant till vänster för att lägga till.</p>
                </div>
              )}
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: 15, marginTop: 15 }}>
            {posDiscount > 0 && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  <span>Ordinarie pris:</span>
                  <span style={{ textDecoration: 'line-through' }}>{cartOriginalTotal} kr</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: '0.8rem', color: '#10b981' }}>
                  <span>Du sparar:</span>
                  <span>{cartSavings} kr</span>
                </div>
              </>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              <span>Totalt antal:</span>
              <span>{cartTotalItems} st</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 15, fontSize: '1.15rem', fontWeight: 800 }}>
              <span>Summa att betala:</span>
              <span>{cartCurrentTotal} kr</span>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button onClick={() => handlePOSCheckout('paypal')} disabled={cart.length === 0} className="btn btn-primary btn-full btn-lg" style={{ padding: 14, fontWeight: 700, background: '#0070ba', borderColor: '#0070ba' }}>
                <CheckCircle2 style={{ width: 16, height: 16 }} />
                <span>Betalt via PayPal</span>
              </button>

              {isSwishEnabledInCart && swishMerchantId && (
                <button onClick={() => setSwishModalOpen(true)} disabled={cart.length === 0} className="btn btn-primary btn-full btn-lg" style={{ padding: 14, fontWeight: 700, background: '#22c55e', borderColor: '#22c55e', color: 'white' }}>
                  <img src="https://www.getswish.se/content/uploads/2021/04/Swish-Logo-Primary-Light-BG.png" alt="Swish" style={{ height: 16, objectFit: 'contain' }} />
                  <span>Betala med Swish</span>
                </button>
              )}
            </div>
          </div>
        </div>
        
        {/* Floating Mobile Cart Button */}
        <button
          onClick={() => setPosShowCartMobile(true)}
          className="pos-mobile-cart-btn"
        >
          <ShoppingCart style={{ width: 16, height: 16 }} />
          <span>Visa order ({cart.reduce((sum, item) => sum + item.quantity, 0)} st)</span>
        </button>
      </div>

      {/* ==================== BARCODE SCANNER MODAL ==================== */}
      {scanModalOpen && (
        <div className="modal-overlay">
          <div className="modal-card glass-modal modal-sm" style={{ maxWidth: 400 }}>
            <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2>Skanna streckkod</h2>
              <button className="btn-close" onClick={() => { setScanModalOpen(false); setScanMessage(''); }}><X /></button>
            </div>
            <div className="modal-body">
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: 15, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)', marginBottom: 20 }}>
                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  Skanna eller mata in streckkoden (SKU) manuellt nedan för att simulera den anslutna laserläsaren.
                </p>
              </div>

              <form onSubmit={handleBarcodeScan}>
                <div className="input-container" style={{ marginBottom: 15 }}>
                  <label>Ange streckkod / SKU</label>
                  <input type="text" value={scanSkuInput} onChange={(e) => setScanSkuInput(e.target.value)} required placeholder="T.ex. LGR-ADID-42-BLK..." style={{ width: '100%', padding: 10, background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-light)', color: 'white', borderRadius: 4 }} />
                </div>

                <button type="submit" className="btn btn-primary btn-full">Sök streckkod</button>
              </form>

              {scanMessage && (
                <div style={{ marginTop: 15, padding: 12, background: 'rgba(139,92,246,0.1)', border: '1px solid var(--color-primary)', borderRadius: 4, textAlign: 'center', fontSize: '0.85rem' }}>
                  {scanMessage}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ==================== SWISH QR MODAL ==================== */}
      {swishModalOpen && (
        <div className="modal-overlay">
          <div className="modal-card glass-modal modal-sm" style={{ maxWidth: 400, textAlign: 'center' }}>
            <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2>Swish-betalning</h2>
              <button className="btn-close" onClick={() => setSwishModalOpen(false)}><X /></button>
            </div>
            <div className="modal-body" style={{ padding: '20px 0' }}>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-success)', marginBottom: 20 }}>
                {cartCurrentTotal} kr
              </h3>
              
              <div style={{ background: 'white', padding: 15, borderRadius: 10, display: 'inline-block', marginBottom: 25 }}>
                <img src={swishQrUrl} alt="Swish QR Code" style={{ width: 220, height: 220, display: 'block' }} />
              </div>
              
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: 25, padding: '0 20px' }}>
                Be kunden scanna QR-koden ovan med sin Swish-app. När betalningen är mottagen klickar du på knappen nedan för att slutföra.
              </p>

              <button 
                onClick={() => {
                  setSwishModalOpen(false);
                  handlePOSCheckout('swish');
                }} 
                className="btn btn-success btn-full btn-lg" 
                style={{ fontWeight: 700 }}
              >
                <CheckCircle2 style={{ width: 18, height: 18 }} />
                Betalning Mottagen (Slutför)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
