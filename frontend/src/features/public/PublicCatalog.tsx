import axios from '../../apiClient';
import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js';
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
  Trash2,
  CalendarRange,
  CreditCard,
  Truck,
  Printer,
  Download,
  ChevronLeft,
  ArrowLeft
} from 'lucide-react';
import type { Product, Variant } from '../../types';

interface PublicCatalogProps {
  publicProducts: any[];
  fetchPublicProducts: () => Promise<void>;
  projectConfigs?: Record<string, { checkout_mode: string; delivery_method: string; shipping_cost: number }>;
  setLoginModalOpen: (open: boolean) => void;
  apiBaseUrl: string;
}

export const PublicCatalog: React.FC<PublicCatalogProps> = ({
  publicProducts,
  fetchPublicProducts,
  setLoginModalOpen,
  apiBaseUrl,
}) => {
  // --- PUBLIC BOOKING FILTERS ---
  const [publicSearch, setPublicSearch] = useState('');
  const [publicCategory, setPublicCategory] = useState('all');
  const [publicSize, setPublicSize] = useState('all');
  const [publicMaxPrice, setPublicMaxPrice] = useState('');

  // --- PDP states ---
  const [selectedPDPProduct, setSelectedPDPProduct] = useState<any | null>(null);
  const [pdpSelectedVariantId, setPdpSelectedVariantId] = useState<number | null>(null);

  // --- PUBLIC SHOPPING CART states ---
  const [publicCart, setPublicCart] = useState<any[]>([]);
  const [cartModalOpen, setCartModalOpen] = useState(false);
  const [cartDiscountCode, setCartDiscountCode] = useState('');
  const [cartDiscountPercent, setCartDiscountPercent] = useState(0);
  const [cartDiscountValid, setCartDiscountValid] = useState(false);
  const [cartDiscountError, setCartDiscountError] = useState('');
  const [cartDiscountFreeShipping, setCartDiscountFreeShipping] = useState(false);
  const [purchasedItems, setPurchasedItems] = useState<any[]>([]);
  const [selectedPublicVariants, setSelectedPublicVariants] = useState<Record<number, number>>({});

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
  const [checkoutModeSelected, setCheckoutModeSelected] = useState<'booking' | 'ecommerce'>('ecommerce');

  // --- LOCAL CART CONFIG: fetched fresh from server per project (never cached) ---
  

  // --- STOREFRONT state ---
  const [storefront, setStorefront] = useState<{ company_name: string; banner_url: string }>({ company_name: 'Företaget AB', banner_url: '' });

  useEffect(() => {
    axios.get(`${apiBaseUrl}/api/public/settings/storefront`)
      .then(res => setStorefront(res.data))
      .catch(err => console.error(err));
  }, [apiBaseUrl]);

  // --- PAYPAL states ---
  const [paypalClientId, setPaypalClientId] = useState('');
  const [paymentMethodSelected, setPaymentMethodSelected] = useState<'swish' | 'paypal'>('swish');

  useEffect(() => {
    axios.get(`${apiBaseUrl}/api/public/paypal/client-id`)
      .then(res => setPaypalClientId(res.data.client_id))
      .catch(err => console.error(err));
  }, [apiBaseUrl]);

  const [cartConfig, setCartConfig] = useState<{ checkout_mode: string; delivery_method: string; shipping_cost: number } | null>(null);

  // When the cart's project changes, fetch the latest config from server
  useEffect(() => {
    const project = publicCart.length > 0 ? publicCart[0].product_category : null;
    if (!project) {
      setCartConfig(null);
      return;
    }
    axios
      .get(`${apiBaseUrl}/api/public/projects/config?project=${encodeURIComponent(project)}`)
      .then((res) => {
        setCartConfig(res.data);
        // Apply delivery default
        if (res.data.delivery_method === 'shipping') {
          setCheckoutDeliveryMethod('shipping');
        } else {
          setCheckoutDeliveryMethod('pickup');
        }
        // Apply checkout mode default
        if (res.data.checkout_mode === 'ecommerce') {
          setCheckoutModeSelected('ecommerce');
        } else {
          setCheckoutModeSelected('booking');
        }
      })
      .catch(() => {
        setCartConfig({ checkout_mode: 'booking', delivery_method: 'pickup', shipping_cost: 0 });
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [publicCart.length > 0 ? publicCart[0].product_category : null, apiBaseUrl]);

  // Lock body scroll when cart modal is open
  useEffect(() => {
    const isMobilePDP = selectedPDPProduct && window.innerWidth <= 768;
    if (cartModalOpen || isMobilePDP) {
      document.body.style.overflow = 'hidden';
      // Prevent layout shift from scrollbar disappearing
      document.body.style.paddingRight = `${window.innerWidth - document.documentElement.clientWidth}px`;
    } else {
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    }
    return () => {
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    };
  }, [cartModalOpen, selectedPDPProduct]);

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

  const isPlaceholderProduct = (p: any) => {
    return p.name.startsWith('Startprodukt (') && p.description === 'Placeholder för nyskapat projekt.';
  };

  // Filtered Public Products
  const filteredPublicProducts = publicProducts.filter((p) => {
    if (isPlaceholderProduct(p)) return false;
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

    if (publicCart.length > 0) {
      const existingCat = publicCart[0].product_category;
      if (prodCat !== existingCat) {
        alert(
          `Du kan inte blanda produkter från olika projekt i samma varukorg. Vänligen slutför din befintliga bokning/order först!`
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

    const config = cartConfig || { checkout_mode: 'booking', delivery_method: 'pickup', shipping_cost: 0 };

    const isEcom = checkoutDeliveryMethod === 'shipping' || (config.checkout_mode === 'both' ? checkoutModeSelected === 'ecommerce' : config.checkout_mode === 'ecommerce');
    const hasShipping = config.delivery_method === 'shipping' || config.delivery_method === 'shipping_pickup';
    const isShipping = config.delivery_method === 'shipping' || (hasShipping && checkoutDeliveryMethod === 'shipping');
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

  const loadHtml2Pdf = (): Promise<any> => {
    return new Promise((resolve, reject) => {
      if ((window as any).html2pdf) {
        resolve((window as any).html2pdf);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
      script.onload = () => resolve((window as any).html2pdf);
      script.onerror = () => reject(new Error('Kunde inte ladda PDF-generatorn.'));
      document.head.appendChild(script);
    });
  };

  const downloadReceiptAsFile = async () => {
    try {
      const html2pdf = (await loadHtml2Pdf()) as any;
      const element = document.getElementById('receipt-card-print');
      if (!element) return;

      const opt = {
        margin:       [12, 12, 12, 12],
        filename:     `kvitto-order-${createdBookingIds.join('-') || 'kvitto'}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { 
          scale: 2.5, 
          useCORS: true, 
          backgroundColor: '#0b0f19'
        },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };

      html2pdf().from(element).set(opt).save();
    } catch (error) {
      alert('Det gick inte att ladda ner kvittot som PDF. Kontrollera din internetanslutning och försök igen.');
    }
  };

  return (
    <div id="public-container">
      <header className="glass-header">
        <div className="header-left">
          <div className="logo">
            <PackageSearch className="logo-icon animate-float" />
            <h1>{storefront.company_name}</h1>
          </div>
          <span className="badge" style={{ background: 'rgba(217, 70, 239, 0.15)', color: 'var(--color-accent)', border: '1px solid rgba(217, 70, 239, 0.3)', fontWeight: 700, marginLeft: 10, fontSize: '0.75rem', letterSpacing: 0.5 }}>KUNDPORTAL</span>
        </div>
        <div className="header-right" style={{ display: 'flex', gap: 8, alignItems: 'center', overflow: 'visible' }}>
          {publicCart.length > 0 && (
            <div style={{ position: 'relative', display: 'inline-flex' }}>
              <button onClick={() => setCartModalOpen(true)} className="btn btn-primary" id="public-cart-btn" style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 6, background: 'var(--color-accent)', borderColor: 'var(--color-accent)', padding: '8px 14px' }}>
                <ShoppingCart style={{ width: 16, height: 16 }} />
                <span className="desktop-only">Visa varukorg</span>
              </button>
              <span style={{
                position: 'absolute',
                top: -8,
                right: -8,
                background: '#ef4444',
                color: 'white',
                fontSize: '0.65rem',
                fontWeight: 800,
                borderRadius: '50%',
                minWidth: 20,
                height: 20,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0 4px',
                boxShadow: '0 2px 6px rgba(239,68,68,0.6)',
                border: '2px solid var(--bg-primary)',
                zIndex: 10,
                pointerEvents: 'none'
              }}>{publicCart.length}</span>
            </div>
          )}
          <button onClick={() => setLoginModalOpen(true)} className="btn btn-ghost" style={{ border: '1px solid var(--border-light)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 6 }}>
            <LogIn style={{ width: 16, height: 16 }} />
            <span className="desktop-only">Personalinloggning</span>
          </button>
        </div>
      </header>

      <main className="content-wrapper">
        {storefront.banner_url ? (
          <div className="welcome-banner" style={{ width: '100%', marginBottom: 30, overflow: 'hidden', borderRadius: 12 }}>
            <img src={storefront.banner_url} alt={storefront.company_name} style={{ width: '100%', height: 'auto', display: 'block' }} />
          </div>
        ) : (
          <div className="welcome-banner glass-card" style={{ padding: 40, textAlign: 'center', marginBottom: 30, background: 'linear-gradient(135deg, rgba(217,70,239,0.05) 0%, rgba(139,92,246,0.05) 100%)', border: '1px solid var(--border-light)' }}>
            <Sparkles style={{ width: 48, height: 48, color: 'var(--color-accent)', marginBottom: 15 }} className="animate-float" />
            <h2 style={{ fontSize: '2rem', margin: '0 0 10px 0', fontWeight: 800, letterSpacing: -0.5 }}>{storefront.company_name} Kundportal</h2>
            <p style={{ fontSize: '1.05rem', color: 'var(--text-secondary)', margin: '0 auto', maxWidth: 650, lineHeight: 1.6 }}>
              Välkommen! Hitta dina favoritprodukter, välj din storlek och beställ enkelt direkt online. Beroende på inställningar kan du få det fraktat hem eller boka för upphämtning.
            </p>
          </div>
        )}

        <section className="controls-panel glass-card" style={{ marginBottom: 30, padding: 20 }}>
          <div className="search-filter-row" style={{ display: 'flex', gap: 15, flexWrap: 'wrap', alignItems: 'center' }}>
            <div className="search-box" style={{ flex: 2, minWidth: 250, position: 'relative' }}>
              <Search style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', width: 16, height: 16 }} />
              <input type="text" value={publicSearch} onChange={(e) => setPublicSearch(e.target.value)} placeholder="Sök efter produkt, färg, storlek eller kategori..." style={{ width: '100%', padding: '10px 12px 10px 40px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)' }} />
            </div>
            
            <div className="filter-box" style={{ flex: 1, minWidth: 130 }}>
              <select value={publicCategory} onChange={(e) => setPublicCategory(e.target.value)} className="custom-select" style={{ width: '100%', height: 42 }}>
                <option value="all">Alla kategorier</option>
                {publicCategoriesList.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            
            <div className="filter-box" style={{ flex: 1, minWidth: 130 }}>
              <select value={publicSize} onChange={(e) => setPublicSize(e.target.value)} className="custom-select" style={{ width: '100%', height: 42 }}>
                <option value="all">Alla storlekar</option>
                {publicSizesList.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>


            <div className="filter-box" style={{ flex: 1, minWidth: 130, position: 'relative' }}>
              <Tag style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', width: 14, height: 14, pointerEvents: 'none' }} />
              <input type="number" value={publicMaxPrice} onChange={(e) => setPublicMaxPrice(e.target.value)} placeholder="Max pris (kr)" min="0" step="50" style={{ width: '100%', height: 42, padding: '10px 12px 10px 36px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', boxSizing: 'border-box' }} />
            </div>
          </div>
        </section>

        <section className="products-section">
        {selectedPDPProduct ? (
          <div className="pdp-container pdp-mobile-fullscreen animate-fade-in glass-card" style={{ maxWidth: 1000, margin: '0 auto', background: 'var(--bg-main)', border: 'none' }}>
            <div style={{ padding: '20px 25px', borderBottom: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <button onClick={() => { setSelectedPDPProduct(null); setPdpSelectedVariantId(null); }} className="btn btn-ghost" style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary)' }}>
                <ArrowLeft style={{ width: 18, height: 18 }} /> Tillbaka till katalogen
              </button>
              {publicCart.length > 0 && (
                <div style={{ position: 'relative', display: 'inline-flex' }}>
                  <button onClick={() => setCartModalOpen(true)} className="btn btn-primary" id="pdp-cart-btn" style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 6, background: 'var(--color-accent)', borderColor: 'var(--color-accent)', padding: '8px 14px' }}>
                    <ShoppingCart style={{ width: 16, height: 16 }} />
                    <span className="desktop-only">Visa varukorg</span>
                  </button>
                  <span style={{ position: 'absolute', top: -5, right: -5, background: '#ef4444', color: 'white', borderRadius: '50%', width: 18, height: 18, fontSize: '0.65rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
                    {publicCart.reduce((sum, item) => sum + item.cart_qty, 0)}
                  </span>
                </div>
              )}
            </div>
            <div className="pdp-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', minHeight: 500 }}>
              <div style={{ display: 'flex', flexWrap: 'wrap' }}>
                {/* Image Gallery Side */}
                <div className="pdp-image-container" style={{ flex: '1 1 500px', minWidth: 300, background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                  {selectedPDPProduct.variants && selectedPDPProduct.variants.find((v:any) => v.id === pdpSelectedVariantId)?.image_url ? (
                    <img src={selectedPDPProduct.variants.find((v:any) => v.id === pdpSelectedVariantId)?.image_url} alt={selectedPDPProduct.name} style={{ width: '100%', height: '100%', maxHeight: '600px', objectFit: 'contain' }} />
                  ) : selectedPDPProduct.imageUrl ? (
                    <img src={selectedPDPProduct.imageUrl} alt={selectedPDPProduct.name} style={{ width: '100%', height: '100%', maxHeight: '600px', objectFit: 'contain' }} />
                  ) : (
                    <div style={{ fontSize: '5rem', opacity: 0.2, padding: '100px 0' }}>👟</div>
                  )}
                  {selectedPDPProduct.is_sponsored && (
                    <span style={{ position: 'absolute', top: 20, left: 20, background: 'rgba(255,255,255,0.9)', color: '#000', padding: '4px 8px', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', borderRadius: 4 }}>Sponsrad</span>
                  )}
                </div>

                {/* Details Side */}
                <div className="pdp-details-container" style={{ flex: '1 1 400px', padding: 40, display: 'flex', flexDirection: 'column' }}>
                  <div style={{ marginBottom: 25 }}>
                    {selectedPDPProduct.brand && <h2 style={{ fontFamily: 'var(--font-title)', fontSize: '1.2rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 5 }}>{selectedPDPProduct.brand}</h2>}
                    <h1 style={{ fontFamily: 'var(--font-title)', fontSize: '2rem', fontWeight: 600, marginBottom: 15 }}>{selectedPDPProduct.name}</h1>
                    
                    {(() => {
                      const v = selectedPDPProduct.variants && selectedPDPProduct.variants.length > 0 ? selectedPDPProduct.variants[0] : null;
                      if (!v) return null;
                      const hasDiscount = v.original_price && v.original_price > v.selling_price;
                      const discountPercent = hasDiscount ? Math.round(((v.original_price - v.selling_price) / v.original_price) * 100) : 0;
                      return (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
                          <span style={{ fontSize: '1.5rem', fontWeight: 800, color: hasDiscount ? 'var(--color-danger)' : 'var(--text-primary)' }}>{v.selling_price} kr</span>
                          {hasDiscount && (
                            <>
                              <span style={{ textDecoration: 'line-through', color: 'var(--text-muted)', fontSize: '1.1rem' }}>{v.original_price} kr</span>
                              <span style={{ background: 'var(--color-danger)', color: 'white', padding: '4px 8px', borderRadius: 4, fontSize: '0.8rem', fontWeight: 700 }}>-{discountPercent}%</span>
                            </>
                          )}
                        </div>
                      );
                    })()}
                  </div>

                  <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 30, fontSize: '0.95rem' }}>{selectedPDPProduct.description}</p>

                  <div style={{ marginBottom: 30 }}>
                    <h4 style={{ fontSize: '0.9rem', textTransform: 'uppercase', color: 'var(--text-primary)', fontWeight: 600, marginBottom: 15 }}>Välj storlek</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: 10 }}>
                      {selectedPDPProduct.variants.map((v: any) => {
                        const isSelected = pdpSelectedVariantId === v.id;
                        const isOutOfStock = v.stock <= 0;
                        return (
                          <button
                            key={v.id}
                            disabled={isOutOfStock}
                            onClick={() => setPdpSelectedVariantId(v.id)}
                            style={{
                              padding: '12px 0',
                              background: isSelected ? 'var(--text-primary)' : 'rgba(255,255,255,0.08)',
                              border: isSelected ? '1px solid var(--text-primary)' : '1px solid var(--border-light)',
                              color: isSelected ? 'var(--bg-main)' : (isOutOfStock ? 'rgba(255,255,255,0.2)' : 'var(--text-primary)'),
                              borderRadius: 4,
                              cursor: isOutOfStock ? 'not-allowed' : 'pointer',
                              fontWeight: 600,
                              fontSize: '1rem',
                              position: 'relative',
                              transition: 'all 0.2s',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center'
                            }}
                          >
                            <span>{v.size || 'UNI'}</span>
                            {isOutOfStock && <div style={{ position: 'absolute', width: '100%', height: 1, background: 'rgba(255,255,255,0.2)', top: '50%', transform: 'rotate(-15deg)' }}></div>}
                            {v.color && <span style={{ fontSize: '0.65rem', marginTop: 4, fontWeight: 400, opacity: 0.8 }}>{v.color}</span>}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div style={{ marginTop: 'auto', display: 'flex', gap: 15 }}>
                    <button
                      disabled={!pdpSelectedVariantId}
                      onClick={() => {
                        const variant = selectedPDPProduct.variants.find((v:any) => v.id === pdpSelectedVariantId);
                        if (variant) {
                          setPublicCart(prev => {
                            const existing = prev.find(p => p.variant.id === variant.id);
                            if (existing) return prev.map(p => p.variant.id === variant.id ? { ...p, cart_qty: p.cart_qty + 1 } : p);
                            return [...prev, { variant, product: selectedPDPProduct, cart_qty: 1 }];
                          });
                          setCartModalOpen(true);
                          setPdpSelectedVariantId(null);
                        }
                      }}
                      className="btn btn-primary"
                      style={{ 
                        flex: 1, 
                        padding: '16px 0', 
                        fontSize: '1.1rem', 
                        fontWeight: 700, 
                        borderRadius: 4,
                        opacity: !pdpSelectedVariantId ? 0.6 : 1,
                        cursor: !pdpSelectedVariantId ? 'not-allowed' : 'pointer'
                      }}
                    >
                      <ShoppingCart style={{ width: 18, height: 18, marginRight: 8 }} />
                      {!pdpSelectedVariantId ? 'Välj storlek först' : 'Lägg till i varukorgen'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div id="public-catalog-grid" className="products-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '20px 15px' }}>
              {filteredPublicProducts.map((p) => {
                const firstVariant = p.variants && p.variants.length > 0 ? p.variants[0] : null;
                const hasDiscount = firstVariant && firstVariant.original_price && firstVariant.original_price > firstVariant.selling_price;
                const discountPercent = hasDiscount ? Math.round(((firstVariant.original_price - firstVariant.selling_price) / firstVariant.original_price) * 100) : 0;
                const displayImage = firstVariant && firstVariant.image_url ? firstVariant.image_url : p.imageUrl;
                const colors = Array.from(new Set(p.variants.map((v:any) => v.color).filter(Boolean)));
                
                return (
                  <div 
                    key={p.id} 
                    className="product-card" 
                    onClick={() => { setSelectedPDPProduct(p); setPdpSelectedVariantId(null); }}
                    style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', position: 'relative' }}
                  >
                    <div className="catalog-image-box" style={{ position: 'relative', background: 'rgba(255,255,255,0.02)', paddingBottom: '130%', overflow: 'hidden', borderRadius: 4, marginBottom: 12 }}>
                      {displayImage ? (
                        <img src={displayImage} alt={p.name} className="catalog-img-element" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3rem', opacity: 0.1 }}>👟</div>
                      )}
                      
                      {p.is_sponsored && (
                        <span style={{ position: 'absolute', top: 10, left: 10, background: 'rgba(255,255,255,0.9)', color: '#000', padding: '2px 6px', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', borderRadius: 2 }}>Sponsrad</span>
                      )}
                    </div>

                    <div style={{ padding: '0 4px' }}>
                      {p.brand && <div style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: 2 }}>{p.brand}</div>}
                      <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
                      {colors.length > 0 && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 6 }}>Färger: {colors.join(', ')}</div>}
                      
                      {firstVariant && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
                          <span style={{ fontWeight: 800, color: hasDiscount ? '#ef4444' : 'var(--text-primary)', fontSize: '1.1rem' }}>{firstVariant.selling_price} kr</span>
                          {hasDiscount && (
                            <>
                              <span style={{ textDecoration: 'line-through', color: 'var(--text-muted)', fontSize: '0.85rem' }}>{firstVariant.original_price} kr</span>
                              <span style={{ background: '#ef4444', color: '#fff', padding: '2px 6px', fontSize: '0.75rem', fontWeight: 700, borderRadius: 4 }}>-{discountPercent}%</span>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {!selectedPDPProduct && filteredPublicProducts.length === 0 && (
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

                <div className="settings-grid-2col" style={{ marginBottom: 15 }}>
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
        <div className="modal-overlay cart-modal-overlay">
          <div className="modal-card glass-modal modal-md cart-modal-card" style={{ maxWidth: 520 }}>
            <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2>Varukorg &amp; Kassa</h2>
              <button className="btn-close" onClick={() => setCartModalOpen(false)}><X /></button>
            </div>
            
            <div className="modal-body" style={{ maxHeight: '85vh', overflowY: 'auto', overflowX: 'hidden' }}>
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

                  {/* Professional PDF Receipt Card */}
                  <div id="receipt-card-print" style={{
                    background: '#ffffff',
                    color: '#1a1a2e',
                    borderRadius: 8,
                    border: '1px solid #e2e8f0',
                    marginBottom: 20,
                    fontFamily: 'Georgia, serif',
                    overflow: 'hidden'
                  }}>
                    {/* Header band */}
                    <div style={{
                      background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
                      padding: '28px 30px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <div>
                        <div style={{ color: '#a78bfa', fontSize: '1.4rem', fontWeight: 900, letterSpacing: 1, fontFamily: 'Arial, sans-serif' }}>
                          LAGER<span style={{ color: '#ffffff' }}>PRO</span>
                        </div>
                        <div style={{ color: '#94a3b8', fontSize: '0.75rem', marginTop: 4, fontFamily: 'Arial, sans-serif' }}>
                          Orderbekräftelse
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ color: '#ffffff', fontSize: '1.5rem', fontWeight: 800, fontFamily: 'Arial, sans-serif' }}>
                          {createdBookingIds.map((id) => `#${id}`).join(', ')}
                        </div>
                        <div style={{ color: '#94a3b8', fontSize: '0.75rem', marginTop: 2, fontFamily: 'Arial, sans-serif' }}>
                          {new Date().toLocaleDateString('sv-SE', { year: 'numeric', month: 'long', day: 'numeric' })}
                        </div>
                      </div>
                    </div>

                    {/* Body */}
                    <div style={{ padding: '28px 30px' }}>

                      {/* Status badge */}
                      <div style={{ textAlign: 'center', marginBottom: 28 }}>
                        <span style={{
                          display: 'inline-block',
                          background: paymentStep === 'swish_success' ? '#dcfce7' : '#fef3c7',
                          color: paymentStep === 'swish_success' ? '#166534' : '#92400e',
                          padding: '6px 20px',
                          borderRadius: 50,
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          fontFamily: 'Arial, sans-serif',
                          letterSpacing: 0.5
                        }}>
                          {paymentStep === 'swish_success' ? '✓ BETALD' : '⏳ BOKAD – BETALAS VID HÄMTNING'}
                        </span>
                      </div>

                      {/* Two-column: customer + delivery */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>
                        {/* Customer info */}
                        <div style={{ background: '#f8fafc', borderRadius: 6, padding: '16px 18px', border: '1px solid #e2e8f0' }}>
                          <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#64748b', letterSpacing: 1, textTransform: 'uppercase', fontFamily: 'Arial, sans-serif', marginBottom: 10, borderBottom: '1px solid #e2e8f0', paddingBottom: 6 }}>
                            Kunduppgifter
                          </div>
                          <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1e293b', fontFamily: 'Arial, sans-serif', marginBottom: 4 }}>
                            {checkoutFirstName} {checkoutLastName}
                          </div>
                          <div style={{ fontSize: '0.8rem', color: '#475569', fontFamily: 'Arial, sans-serif' }}>
                            📞 {checkoutPhone}
                          </div>
                        </div>

                        {/* Delivery info */}
                        <div style={{ background: '#f8fafc', borderRadius: 6, padding: '16px 18px', border: '1px solid #e2e8f0' }}>
                          <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#64748b', letterSpacing: 1, textTransform: 'uppercase', fontFamily: 'Arial, sans-serif', marginBottom: 10, borderBottom: '1px solid #e2e8f0', paddingBottom: 6 }}>
                            Leverans & Betalning
                          </div>
                          <div style={{ fontSize: '0.8rem', color: '#1e293b', fontFamily: 'Arial, sans-serif', marginBottom: 4 }}>
                            <strong>Leverans:</strong>{' '}
                            {checkoutDeliveryMethod === 'shipping' ? 'PostNord Hemleverans' : 'Hämtas i butik'}
                          </div>
                          {checkoutDeliveryMethod === 'shipping' && checkoutShippingAddress && (
                            <div style={{ fontSize: '0.75rem', color: '#64748b', fontFamily: 'Arial, sans-serif', marginBottom: 4 }}>
                              {checkoutShippingAddress}
                            </div>
                          )}
                          <div style={{ fontSize: '0.8rem', color: '#1e293b', fontFamily: 'Arial, sans-serif' }}>
                            <strong>Betalsätt:</strong>{' '}
                            {paymentStep === 'swish_success' ? 'Swish – Betald online' : 'Betalas i butik'}
                          </div>
                        </div>
                      </div>

                      {/* Products table */}
                      <div style={{ marginBottom: 24 }}>
                        <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#64748b', letterSpacing: 1, textTransform: 'uppercase', fontFamily: 'Arial, sans-serif', marginBottom: 10 }}>
                          Beställda varor
                        </div>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', fontFamily: 'Arial, sans-serif' }}>
                          <thead>
                            <tr style={{ background: '#f1f5f9' }}>
                              <th style={{ padding: '8px 12px', textAlign: 'left', color: '#475569', fontWeight: 600, fontSize: '0.75rem' }}>Produkt</th>
                              <th style={{ padding: '8px 12px', textAlign: 'center', color: '#475569', fontWeight: 600, fontSize: '0.75rem' }}>Storlek / Färg</th>
                              <th style={{ padding: '8px 12px', textAlign: 'center', color: '#475569', fontWeight: 600, fontSize: '0.75rem' }}>Antal</th>
                              <th style={{ padding: '8px 12px', textAlign: 'right', color: '#475569', fontWeight: 600, fontSize: '0.75rem' }}>Pris</th>
                            </tr>
                          </thead>
                          <tbody>
                            {purchasedItems.map((item, idx) => (
                              <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0', background: idx % 2 === 0 ? '#ffffff' : '#fafafa' }}>
                                <td style={{ padding: '10px 12px', color: '#1e293b', fontWeight: 600 }}>{item.product_name}</td>
                                <td style={{ padding: '10px 12px', textAlign: 'center', color: '#475569' }}>
                                  {item.variant.size} / {item.variant.color || 'Uni'}
                                </td>
                                <td style={{ padding: '10px 12px', textAlign: 'center', color: '#475569' }}>{item.quantity || 1} st</td>
                                <td style={{ padding: '10px 12px', textAlign: 'right', color: '#1e293b', fontWeight: 700 }}>{item.variant.selling_price} kr</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Price summary */}
                      {(() => {
                        const originalTotal = purchasedItems.reduce((sum, item) => sum + item.variant.selling_price * item.quantity, 0);
                        const discountAmount = cartDiscountValid ? Math.round(originalTotal * (cartDiscountPercent / 100)) : 0;
                        const config = cartConfig || { shipping_cost: 0 };
                        const hasFreeShipping = cartDiscountValid && cartDiscountFreeShipping;
                        const shippingCost = checkoutDeliveryMethod === 'shipping' ? (hasFreeShipping ? 0 : (config as any).shipping_cost || 0) : 0;
                        const finalTotal = originalTotal - discountAmount + shippingCost;
                        return (
                          <div style={{ maxWidth: 280, marginLeft: 'auto', background: '#f8fafc', borderRadius: 6, border: '1px solid #e2e8f0', padding: '14px 18px', fontFamily: 'Arial, sans-serif', fontSize: '0.85rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, color: '#475569' }}>
                              <span>Produktsumma</span>
                              <span>{originalTotal} kr</span>
                            </div>
                            {cartDiscountValid && (
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, color: '#16a34a' }}>
                                <span>Rabatt (-{cartDiscountPercent}%)</span>
                                <span>−{discountAmount} kr</span>
                              </div>
                            )}
                            {checkoutDeliveryMethod === 'shipping' && (
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, color: '#2563eb' }}>
                                <span>Frakt</span>
                                <span>{hasFreeShipping ? 'Gratis' : `+${shippingCost} kr`}</span>
                              </div>
                            )}
                            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '2px solid #1e293b', paddingTop: 10, marginTop: 6, fontSize: '1.05rem', fontWeight: 800, color: '#1e293b' }}>
                              <span>TOTALT</span>
                              <span>{finalTotal} kr</span>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Footer note */}
                      <div style={{ marginTop: 28, paddingTop: 16, borderTop: '1px solid #e2e8f0', textAlign: 'center', color: '#94a3b8', fontSize: '0.72rem', fontFamily: 'Arial, sans-serif' }}>
                        Tack för ditt köp! · Spara detta kvitto som bevis på din beställning · Ordernummer {createdBookingIds.map((id) => `#${id}`).join(', ')}
                      </div>
                    </div>
                  </div>


                  <div className="no-print" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      <button
                        type="button"
                        onClick={() => window.print()}
                        className="btn btn-primary"
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '10px', fontSize: '0.85rem' }}
                      >
                        <Printer style={{ width: 16, height: 16 }} />
                        <span>Skriv ut kvitto</span>
                      </button>
                      <button
                        type="button"
                        onClick={downloadReceiptAsFile}
                        className="btn btn-secondary"
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '10px', fontSize: '0.85rem', borderColor: 'var(--color-primary)', color: 'white' }}
                      >
                        <Download style={{ width: 16, height: 16 }} />
                        <span>Ladda ner kvitto</span>
                      </button>
                    </div>
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
                    const config = cartConfig || { checkout_mode: 'booking', delivery_method: 'pickup', shipping_cost: 0 };
                    
                    const isEcom = checkoutDeliveryMethod === 'shipping' || (config.checkout_mode === 'both' ? checkoutModeSelected === 'ecommerce' : config.checkout_mode === 'ecommerce');
                    const hasShipping = config.delivery_method === 'shipping' || config.delivery_method === 'shipping_pickup';
                    const isShipping = config.delivery_method === 'shipping' || (hasShipping && checkoutDeliveryMethod === 'shipping');
                    
                    const originalTotal = publicCart.reduce((sum, item) => sum + item.variant.selling_price * item.quantity, 0);
                    const discountAmount = cartDiscountValid ? Math.round(originalTotal * (cartDiscountPercent / 100)) : 0;
                    const isFreeShippingApplied = cartDiscountValid && cartDiscountFreeShipping;
                    const shippingCost = isShipping ? (isFreeShippingApplied ? 0 : config.shipping_cost || 0) : 0;
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
                        <div className="settings-grid-2col" style={{ marginBottom: 12 }}>
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

                        {/* 1. Leveransmetod Selector */}
                        {config.delivery_method === 'shipping_pickup' ? (
                          <div style={{ marginBottom: 15 }}>
                            <label style={{ display: 'block', marginBottom: 8, fontSize: '0.85rem', fontWeight: 600 }}>Leveransmetod *</label>
                            <div className="settings-grid-2col" style={{ gap: 10 }}>
                              <button
                                type="button"
                                onClick={() => setCheckoutDeliveryMethod('pickup')}
                                className={`btn btn-sm ${checkoutDeliveryMethod === 'pickup' ? 'btn-primary' : 'btn-secondary'}`}
                                style={{ padding: 10, fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                              >
                                <MapPin style={{ width: 14, height: 14 }} />
                                <span>Hämta i butik (0 kr)</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setCheckoutDeliveryMethod('shipping')}
                                className={`btn btn-sm ${checkoutDeliveryMethod === 'shipping' ? 'btn-primary' : 'btn-secondary'}`}
                                style={{ padding: 10, fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                              >
                                <Truck style={{ width: 14, height: 14 }} />
                                <span>PostNord Frakt ({isFreeShippingApplied ? 'Gratis' : `+${config.shipping_cost} kr`})</span>
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div style={{ marginBottom: 15, padding: '10px 12px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-light)', borderRadius: 6 }}>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Leveransmetod</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600, fontSize: '0.9rem', color: config.delivery_method === 'shipping' ? '#60a5fa' : '#fbbf24' }}>
                              {config.delivery_method === 'shipping' ? (
                                <>
                                  <Truck style={{ width: 16, height: 16, color: '#60a5fa' }} />
                                  <span>PostNord Hemleverans ({isFreeShippingApplied ? 'Fri frakt' : `+${config.shipping_cost} kr`})</span>
                                </>
                              ) : (
                                <>
                                  <MapPin style={{ width: 16, height: 16, color: '#fbbf24' }} />
                                  <span>Hämta i butik (Kostnadsfritt)</span>
                                </>
                              )}
                            </div>
                          </div>
                        )}

                        {/* 2. Betalsätt Selector */}
                        {checkoutDeliveryMethod === 'shipping' ? (
                          <div style={{ marginBottom: 15 }}>
                            <label style={{ display: 'block', marginBottom: 8, fontSize: '0.85rem', fontWeight: 600 }}>Betalsätt online *</label>
                            <div className="settings-grid-2col" style={{ gap: 10 }}>
                              <button
                                type="button"
                                onClick={() => setPaymentMethodSelected('swish')}
                                className={`btn btn-sm ${paymentMethodSelected === 'swish' ? 'btn-primary' : 'btn-secondary'}`}
                                style={{ padding: 10, fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                              >
                                <CreditCard style={{ width: 16, height: 16 }} />
                                <span>Swish</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setPaymentMethodSelected('paypal')}
                                className={`btn btn-sm ${paymentMethodSelected === 'paypal' ? 'btn-primary' : 'btn-secondary'}`}
                                style={{ padding: 10, fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                              >
                                <CreditCard style={{ width: 16, height: 16 }} />
                                <span>PayPal / Kort</span>
                              </button>
                            </div>
                          </div>
                        ) : config.checkout_mode === 'both' ? (
                          /* Pickup allows choosing between pay in store vs Swish online */
                          <div style={{ marginBottom: 15 }}>
                            <label style={{ display: 'block', marginBottom: 8, fontSize: '0.85rem', fontWeight: 600 }}>Betalsätt *</label>
                            <div className="settings-grid-2col" style={{ gap: 10 }}>
                              <button
                                type="button"
                                onClick={() => setCheckoutModeSelected('booking')}
                                className={`btn btn-sm ${checkoutModeSelected === 'booking' ? 'btn-primary' : 'btn-secondary'}`}
                                style={{ padding: 10, fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                              >
                                <CalendarRange style={{ width: 16, height: 16 }} />
                                <span>Gratis Butiksbokning</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setCheckoutModeSelected('ecommerce')}
                                className={`btn btn-sm ${checkoutModeSelected === 'ecommerce' ? 'btn-primary' : 'btn-secondary'}`}
                                style={{ padding: 10, fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                              >
                                <CreditCard style={{ width: 16, height: 16 }} />
                                <span>Kortbetalning / Swish (Online)</span>
                              </button>
                            </div>
                          </div>
                        ) : (
                          /* Forced to single checkout mode if pickup chosen */
                          <div style={{ marginBottom: 15, padding: '10px 12px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-light)', borderRadius: 6 }}>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Betalsätt</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600, fontSize: '0.9rem', color: config.checkout_mode === 'ecommerce' ? 'var(--color-success)' : 'white', flexWrap: 'wrap' }}>
                              {config.checkout_mode === 'ecommerce' ? (
                                <>
                                  <CreditCard style={{ width: 16, height: 16, color: 'var(--color-success)', flexShrink: 0 }} />
                                  <span>Direktbetalning online via Swish</span>
                                </>
                              ) : (
                                <>
                                  <CalendarRange style={{ width: 16, height: 16, color: 'var(--color-accent)', flexShrink: 0 }} />
                                  <span style={{ wordBreak: 'break-word' }}>Kostnadsfri Butiksbokning (Betala vid hämtning)</span>
                                </>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Delivery Address if Postnord chosen */}
                        {hasShipping && checkoutDeliveryMethod === 'shipping' && (
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
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                              <span style={{ color: 'var(--text-secondary)', flexShrink: 0 }}>Produktsumma:</span>
                              <span style={{ fontWeight: 600 }}>{originalTotal} kr</span>
                            </div>
                            
                            {cartDiscountValid && (
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, color: 'var(--color-success)', fontWeight: 600 }}>
                                <span style={{ flexShrink: 1, fontSize: '0.8rem' }}>Rabatt (Kod: {cartDiscountCode.toUpperCase()} -{cartDiscountPercent}%):</span>
                                <span style={{ flexShrink: 0 }}>-{discountAmount} kr</span>
                              </div>
                            )}

                            {hasShipping && checkoutDeliveryMethod === 'shipping' && (
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, color: '#60a5fa' }}>
                                <span style={{ flexShrink: 0 }}>PostNord Hemleverans:</span>
                                <span style={{ flexShrink: 0 }}>{isFreeShippingApplied ? '0 kr (Fri frakt)' : `+${config.shipping_cost} kr`}</span>
                              </div>
                            )}

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, borderTop: '1px solid var(--border-light)', paddingTop: 8, marginTop: 4, fontSize: '1.05rem', fontWeight: 800 }}>
                              <span style={{ flexShrink: 0 }}>Totalt {isEcom ? 'att betala' : 'att boka'}:</span>
                              <span style={{ color: 'var(--color-success)', flexShrink: 0 }}>{finalTotal} kr</span>
                            </div>
                          </div>
                        </div>

                        {/* Submit Button */}
                        {isEcom && paymentMethodSelected === 'paypal' ? (
                          <div style={{ marginTop: 15 }}>
                            {paypalClientId ? (
                              <PayPalScriptProvider options={{ clientId: paypalClientId, currency: 'SEK' }}>
                                <PayPalButtons
                                  style={{ layout: 'vertical' }}
                                  createOrder={(data, actions) => {
                                    return actions.order.create({
                                      intent: 'CAPTURE',
                                      purchase_units: [{
                                        amount: {
                                          currency_code: 'SEK',
                                          value: finalTotal.toString()
                                        }
                                      }]
                                    });
                                  }}
                                  onApprove={async (data, actions) => {
                                    const details = await actions.order?.capture();
                                    // Trigger backend save
                                    try {
                                      await axios.post(`${apiBaseUrl}/api/public/bookings/batch`, {
                                        items: publicCart.map(item => ({ variantId: item.variant_id, qty: item.cart_qty })),
                                        firstName: checkoutFirstName,
                                        lastName: checkoutLastName,
                                        phone: checkoutPhone,
                                        discountCode: cartDiscountCode,
                                        message: checkoutMessage,
                                        deliveryMethod: checkoutDeliveryMethod,
                                        shippingAddress: checkoutShippingAddress,
                                        shippingCost: config.shipping_cost,
                                        paymentStatus: 'paid_paypal'
                                      });
                                      setPublicCart([]);
                                      fetchPublicProducts();
                                      setPaymentStep('booking_success');
                                    } catch (err) {
                                      alert('Kunde inte spara bokningen i systemet efter betalning.');
                                    }
                                  }}
                                />
                              </PayPalScriptProvider>
                            ) : (
                              <div>Laddar PayPal...</div>
                            )}
                          </div>
                        ) : (
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
                        )}
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
