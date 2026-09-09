import axios from '../../apiClient';
import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { Html5Qrcode } from 'html5-qrcode';
import {
  LayoutGrid,
  PackageSearch,
  CheckCircle2,
  Search,
  ScanLine,
  Plus,
  FileSpreadsheet,
  Edit,
  Trash2,
  Eye,
  PackageOpen,
  X,
  RefreshCw
} from 'lucide-react';
import type { Product, Variant, UserProfile } from '../../types';

interface InventoryTabProps {
  products: Product[];
  fetchProducts: () => Promise<void>;
  userProfile: UserProfile | null;
  projectsList: string[];
  fetchAnalytics: () => Promise<void>;
  setQrVariant: (variant: Variant | null) => void;
  setQrModalOpen: (open: boolean) => void;
  addToCart: (product: Product, variant: Variant) => void; // Passed down to support scanner modal adding to cart
  apiBaseUrl: string;
  getAxiosConfig: () => any;
  stockMetricsTotalCost: number; // passed down or calculated
  totalSoldUnits?: number;
}

export const InventoryTab: React.FC<InventoryTabProps> = ({
  products,
  fetchProducts,
  userProfile,
  projectsList,
  fetchAnalytics,
  setQrVariant,
  setQrModalOpen,
  addToCart,
  apiBaseUrl,
  getAxiosConfig,
  stockMetricsTotalCost,
  totalSoldUnits,
}) => {
  // --- FILTERS & SEARCH STATE ---
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [hideOutOfStock, setHideOutOfStock] = useState(true);

  // --- MODALS / DIALOGS ---
  // Add/Edit Product Modal
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productName, setProductName] = useState('');
  const [productCategory, setProductCategory] = useState('');
  const [productDescription, setProductDescription] = useState('');
  const [productVariantLabel1, setProductVariantLabel1] = useState('Storlek');
  const [productVariantLabel2, setProductVariantLabel2] = useState('Färg');
  const [productDiscountPercent, setProductDiscountPercent] = useState<number | ''>('');
  const [productVariants, setProductVariants] = useState<Partial<Variant>[]>([]);
  const [activeDiscount, setActiveDiscount] = useState<number>(0);

  // Product Image Upload State
  const [productImageFile, setProductImageFile] = useState<File | null>(null);
  const [productImageUrl, setProductImageUrl] = useState('');
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  // Camera scanning states
  const [cameraScanModalOpen, setCameraScanModalOpen] = useState(false);
  const [activeVariantScanIndex, setActiveVariantScanIndex] = useState<number | null>(null);
  const [cameraScanError, setCameraScanError] = useState('');

  const startCameraScanner = (idx: number) => {
    setActiveVariantScanIndex(idx);
    setCameraScanModalOpen(true);
    setCameraScanError('');
  };

  useEffect(() => {
    let html5Qrcode: Html5Qrcode | null = null;
    if (cameraScanModalOpen && activeVariantScanIndex !== null) {
      const timer = setTimeout(() => {
        html5Qrcode = new Html5Qrcode('scanner-reader');
        const config = { fps: 15, qrbox: { width: 280, height: 160 } };

        html5Qrcode.start(
          { facingMode: 'environment' },
          config,
          (decodedText) => {
            // Play Beep sound
            try {
              const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
              const osc = ctx.createOscillator();
              const gain = ctx.createGain();
              osc.type = 'sine';
              osc.frequency.setValueAtTime(1000, ctx.currentTime);
              gain.gain.setValueAtTime(0.08, ctx.currentTime);
              gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);
              osc.connect(gain);
              gain.connect(ctx.destination);
              osc.start();
              osc.stop(ctx.currentTime + 0.12);
            } catch (err) { }

            const c = [...productVariants];
            c[activeVariantScanIndex].sku = decodedText.trim();
            setProductVariants(c);

            if (html5Qrcode) {
              html5Qrcode.stop().then(() => {
                setCameraScanModalOpen(false);
                setActiveVariantScanIndex(null);
              }).catch(() => {
                setCameraScanModalOpen(false);
                setActiveVariantScanIndex(null);
              });
            }
          },
          () => { } // error callback
        ).catch((err) => {
          setCameraScanError('Kunde inte starta kameran. Kontrollera att du har gett kamerabehörighet och använder en säker anslutning (HTTPS).');
        });
      }, 300);

      return () => {
        clearTimeout(timer);
        if (html5Qrcode && html5Qrcode.isScanning) {
          html5Qrcode.stop().catch((e) => console.error('Error stopping scanner', e));
        }
      };
    }
  }, [cameraScanModalOpen, activeVariantScanIndex]);

  // Fetch discount for a category and apply to all variant selling prices
  const fetchAndApplyDiscount = async (category: string, variants?: Partial<Variant>[]) => {
    try {
      const res = await axios.get(`${apiBaseUrl}/api/projects/discount?project=${encodeURIComponent(category)}`, getAxiosConfig());
      const discount: number = res.data.discount_percent || 0;
      setActiveDiscount(discount);
      
      const currentVariants = variants ?? productVariants;
      // When category discount changes, we only apply it if there is NO product discount overriding it.
      // But actually, we don't know the exact order of states updating here. 
      // It's safer to just set the activeDiscount, and the product variants will recalculate based on it.
      // We need the current productDiscountPercent. It might be stale here, so we use a functional update if we wanted to be perfectly safe, but since this is called on category change, we can read it.
      const appliedDiscount = (productDiscountPercent !== '' && productDiscountPercent > 0) ? productDiscountPercent : discount;
      
      if (currentVariants.length > 0) {
        setProductVariants(currentVariants.map(v => {
          const orig = v.original_price || 0;
          return { ...v, selling_price: orig > 0 ? Math.round(orig * (1 - appliedDiscount / 100)) : 0 };
        }));
      }
    } catch {
      setActiveDiscount(0);
    }
  };


  // Excel Import Modal
  const [excelModalOpen, setExcelModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [excelProposals, setExcelProposals] = useState<any[]>([]);
  const [importLoading, setImportLoading] = useState(false);

  // Barcode Scanner Modal (local simulator)
  const [scanModalOpen, setScanModalOpen] = useState(false);
  const [scanSkuInput, setScanSkuInput] = useState('');
  const [scanMessage, setScanMessage] = useState('');

  // Categories list – deduplicate projectsList and existing product categories
  const categoriesList = Array.from(new Set([
    ...projectsList,
    ...products.map((p) => p.category)
  ]));

  // Filtered Products for Inventory Tab
  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.variants.some(
        (v) =>
          v.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (v.size && v.size.toLowerCase().includes(searchQuery.toLowerCase())) ||
          (v.color && v.color.toLowerCase().includes(searchQuery.toLowerCase()))
      );

    const matchesCategory = categoryFilter === 'all' || p.category === categoryFilter;

    const matchesStock =
      !hideOutOfStock || p.variants.some((v) => v.stock > 0);

    return matchesSearch && matchesCategory && matchesStock;
  });

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

  // Save Product / Variants
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productName.trim()) return;

    let finalImageUrl = productImageUrl;
    if (productImageFile) {
      setIsUploadingImage(true);
      try {
        const token = localStorage.getItem('token');
        const formData = new FormData();
        formData.append('image', productImageFile);
        const uploadRes = await axios.post(`${apiBaseUrl}/api/upload/image`, formData, { headers: { Authorization: `Bearer ${token}` } });
        if (uploadRes.data.success) {
          finalImageUrl = uploadRes.data.url;
          setProductImageUrl(finalImageUrl);
        } else {
          alert('Det gick inte att ladda upp produktbilden.');
          setIsUploadingImage(false);
          return;
        }
      } catch (err) {
        alert('Kunde inte ladda upp bilden.');
        setIsUploadingImage(false);
        return;
      }
      setIsUploadingImage(false);
    }

    const payload = {
      name: productName.trim(),
      category: productCategory,
      description: productDescription,
      image_url: finalImageUrl,
      discount_percent: productDiscountPercent === '' ? null : productDiscountPercent,
      variant_label_1: productVariantLabel1,
      variant_label_2: productVariantLabel2,
      variants: productVariants
    };

    try {
      if (editingProduct) {
        await axios.put(`${apiBaseUrl}/api/products/${editingProduct.id}`, payload, getAxiosConfig());
      } else {
        await axios.post(`${apiBaseUrl}/api/products`, payload, getAxiosConfig());
      }
      setProductModalOpen(false);
      setEditingProduct(null);
      setProductName('');
      setProductDescription('');
      setProductImageUrl('');
      setProductImageFile(null);
      setProductDiscountPercent('');
      setProductVariants([]);
      fetchProducts();
      if (userProfile?.role === 'admin') fetchAnalytics();
    } catch (e) {
      alert('Kunde inte spara produkten.');
    }
  };

  // Excel File Upload
  const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    setSelectedFile(file);
    setImportLoading(true);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await axios.post(`${apiBaseUrl}/api/import-excel`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${getAxiosConfig().headers.Authorization.split(' ')[1]}`
        }
      });
      if (res.data.success) {
        setExcelProposals(res.data.proposals || []);
      } else {
        alert(res.data.error || 'Importering misslyckades.');
      }
    } catch (e) {
      alert('Kunde inte analysera Excel-filen.');
    } finally {
      setImportLoading(false);
    }
  };

  // Confirm Excel Import
  const handleConfirmExcelImport = async () => {
    if (excelProposals.length === 0) return;
    try {
      await axios.post(
        `${apiBaseUrl}/api/confirm-import`,
        { items: excelProposals },
        getAxiosConfig()
      );
      setExcelModalOpen(false);
      setSelectedFile(null);
      setExcelProposals([]);
      fetchProducts();
      if (userProfile?.role === 'admin') fetchAnalytics();
      alert('Excel-importen har slutförts!');
    } catch (e) {
      alert('Kunde inte bekräfta Excel-importen.');
    }
  };

  return (
    <div className="tab-pane">
      <section className="stats-grid">
        <div className="stat-card glass-card">
          <div className="stat-icon purple-gradient">
            <LayoutGrid />
          </div>
          <div className="stat-info">
            <h3>Totalt i lager</h3>
            <p>{products.reduce((sum, p) => sum + p.variants.reduce((vs, v) => vs + v.stock, 0), 0)}</p>
            <span>st produkter</span>
          </div>
        </div>
        <div className="stat-card glass-card">
          <div className="stat-icon pink-gradient">
            <PackageSearch />
          </div>
          <div className="stat-info">
            <h3>Unika modeller</h3>
            <p>{products.length}</p>
            <span>registrerade</span>
          </div>
        </div>
        <div className="stat-card glass-card">
          <div className="stat-icon green-gradient">
            <CheckCircle2 />
          </div>
          <div className="stat-info">
            <h3>Sålda enheter</h3>
            <p>{totalSoldUnits !== undefined && totalSoldUnits > 0 ? totalSoldUnits : (stockMetricsTotalCost > 0 ? 'Se Ekonomi' : '0')}</p>
            <span>produkter</span>
          </div>
        </div>
      </section>

      <section className="controls-panel glass-card" style={{ marginBottom: 30, padding: 20 }}>
        <div style={{ display: 'flex', gap: 15, flexWrap: 'wrap', width: '100%' }}>
          <div className="search-bar" style={{ flex: 1, margin: 0, position: 'relative' }}>
            <Search style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Sök på modell, kategori, färg, storlek eller SKU..." style={{ width: '100%', padding: '10px 12px 10px 40px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-light)', color: 'white', borderRadius: 'var(--radius-sm)' }} />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="custom-select" style={{ minWidth: 200, height: 42 }}>
              {(userProfile?.role === 'admin' || userProfile?.allowed_projects === 'all' || categoriesList.length > 1) && (
                <option value="all">Alla kategorier/Projekt</option>
              )}
              {categoriesList.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

            <label className="toggle-switch-container" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.85rem', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-light)', padding: '8px 12px', borderRadius: 'var(--radius-sm)' }}>
              <input type="checkbox" checked={hideOutOfStock} onChange={(e) => setHideOutOfStock(e.target.checked)} style={{ accentColor: 'var(--color-primary)' }} />
              <span>Visa endast i lager (Göm slut)</span>
            </label>

            <button onClick={() => { setScanModalOpen(true); setScanMessage(''); }} className="btn btn-accent" style={{ display: 'flex', alignItems: 'center', gap: 6, height: 42 }}>
              <ScanLine style={{ width: 16, height: 16 }} />
              <span>Skanna</span>
            </button>

            {userProfile?.role === 'admin' && (
              <>
                <button onClick={() => { setEditingProduct(null); setProductName(''); setProductCategory(projectsList[0] || ''); setProductDescription(''); setProductVariants([]); setProductModalOpen(true); }} className="btn btn-primary" style={{ height: 42 }}>
                  <Plus style={{ width: 16, height: 16, marginRight: 4 }} />
                  <span>Lägg till produkt</span>
                </button>

                <button onClick={() => setExcelModalOpen(true)} className="btn btn-secondary" style={{ height: 42 }}>
                  <FileSpreadsheet style={{ width: 16, height: 16, marginRight: 4 }} />
                  <span>Importera Excel</span>
                </button>
              </>
            )}
          </div>
        </div>
      </section>

      <section className="inventory-section">
        <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
          <h2>Ditt lagerregister</h2>
          <span className="badge">{filteredProducts.length} modeller hittade</span>
        </div>

        <div className="products-grid">
          {filteredProducts.map((p) => (
            <div key={p.id} className="glass-card product-card" style={{ padding: 0, overflow: 'hidden' }}>
              <div className="pos-shoe-photo" style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.2)', borderBottom: '1px solid var(--border-light)', position: 'relative' }}>
                {p.imageUrl ? (
                  <img src={p.imageUrl} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ fontSize: '3rem', opacity: 0.3 }}>👟</div>
                )}
              </div>
              <div style={{ padding: 20 }}>
                <div className="product-info-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <span className="category-tag">{p.category}</span>
                    <h3>{p.name}</h3>
                  </div>
                  {userProfile?.role === 'admin' && (
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        onClick={() => {
                          setEditingProduct(p);
                          setProductName(p.name);
                          setProductCategory(p.category);
                          setProductDescription(p.description || '');
                          setProductImageUrl(p.imageUrl || '');
                          setProductImageFile(null);
                          setProductDiscountPercent(p.discount_percent || '');
                          setProductVariantLabel1(p.variantLabel1 || 'Storlek');
                          setProductVariantLabel2(p.variantLabel2 || 'Färg');
                          setProductVariants(p.variants);
                          setProductModalOpen(true);
                        }}
                        className="btn btn-ghost btn-icon btn-xs"
                        title="Redigera"
                      >
                        <Edit style={{ width: 14, height: 14 }} />
                      </button>
                      <button
                        onClick={async () => {
                          if (confirm(`Är du säker på att du vill ta bort ${p.name}?`)) {
                            await axios.delete(`${apiBaseUrl}/api/products/${p.id}`, getAxiosConfig());
                            fetchProducts();
                          }
                        }}
                        className="btn btn-ghost btn-icon btn-xs"
                        style={{ color: 'var(--color-danger)' }}
                        title="Ta bort"
                      >
                        <Trash2 style={{ width: 14, height: 14 }} />
                      </button>
                    </div>
                  )}
                </div>
                {p.description && <p className="product-desc">{p.description}</p>}

                <div className="variants-section" style={{ padding: '0 15px 15px 15px' }}>
                  <div className="variants-list" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {p.variants.map((v) => (
                      <div key={v.id} className="variant-row" style={{ padding: '8px 10px', background: 'rgba(255,255,255,0.02)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>

                        <div className="variant-details-wrapper" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>{p.variantLabel1 || 'Storlek'}:</span>
                            <span className="variant-size" style={{ fontSize: '0.9rem' }}>{v.size}</span>
                          </div>
                          {v.color && (
                            <span className="variant-color" style={{ color: 'var(--color-primary)', fontWeight: 600, padding: '2px 6px', fontSize: '0.75rem' }}>{v.color}</span>
                          )}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end', flex: '1 1 auto' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 2, background: 'rgba(0,0,0,0.2)', borderRadius: 6, padding: '4px 10px' }}>
                            <strong style={{ minWidth: 20, textAlign: 'center', fontSize: '0.85rem' }}>{v.stock} st</strong>
                          </div>

                          <div style={{ textAlign: 'right' }}>
                            {v.original_price && v.original_price > v.selling_price ? (
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                                <span style={{ fontSize: '0.65rem', textDecoration: 'line-through', color: 'var(--text-muted)' }}>{v.original_price} kr</span>
                                <strong style={{ color: 'var(--color-success)', fontSize: '0.9rem', whiteSpace: 'nowrap' }}>{v.selling_price} kr</strong>
                              </div>
                            ) : (
                              <strong style={{ color: '#38bdf8', fontSize: '0.9rem', whiteSpace: 'nowrap' }}>{v.selling_price} kr</strong>
                            )}
                          </div>

                          <button onClick={() => { setQrVariant(v); setQrModalOpen(true); }} className="btn btn-ghost btn-icon btn-xs" title="Visa streckkod" style={{ padding: 4 }}>
                            <Eye style={{ width: 14, height: 14, color: 'var(--text-muted)' }} />
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

        {filteredProducts.length === 0 && (
          <div className="empty-state">
            <PackageOpen style={{ width: 48, height: 48, color: 'var(--text-muted)', marginBottom: 15 }} />
            <h3>Inga produkter matchar filtren</h3>
            <p>Prova att ändra sökningen eller ladda till nya produkter.</p>
          </div>
        )}
      </section>

      {/* ==================== ADD / EDIT PRODUCT MODAL ==================== */}
      {productModalOpen && (
        <div className="modal-overlay">
          <div className="modal-card glass-modal modal-md" style={{ maxWidth: 650 }}>
            <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2>{editingProduct ? 'Redigera produkt' : 'Lägg till produkt'}</h2>
              <button className="btn-close" onClick={() => setProductModalOpen(false)}><X /></button>
            </div>
            <div className="modal-body" style={{ maxHeight: '75vh', overflowY: 'auto' }}>
              <form onSubmit={handleSaveProduct}>
                <div className="input-container" style={{ marginBottom: 12 }}>
                  <label>Produktnamn *</label>
                  <input type="text" value={productName} onChange={(e) => setProductName(e.target.value)} required placeholder="T.ex. Adidas Ultraboost..." style={{ width: '100%', padding: 10, background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-light)', color: 'white', borderRadius: 4 }} />
                </div>

                <div className="settings-grid-2col">
                  <div className="input-container">
                    <label>Kategori / Projekt *</label>
                    <select value={productCategory} onChange={(e) => setProductCategory(e.target.value)} className="custom-select" style={{ width: '100%', height: 42 }}>
                      {categoriesList.map((p) => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>
                  <div className="input-container">
                    <label>Beskrivning</label>
                    <input type="text" value={productDescription} onChange={(e) => setProductDescription(e.target.value)} placeholder="T.ex. Storlekarna är något små..." style={{ width: '100%', padding: 10, background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-light)', color: 'white', borderRadius: 4 }} />
                  </div>
                </div>

                <div className="input-container" style={{ marginBottom: 15 }}>
                  <label>Produktbild (Frivilligt)</label>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 10 }}>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setProductImageFile(e.target.files ? e.target.files[0] : null)}
                      style={{ flex: 1, padding: 8, background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-light)', color: 'white', borderRadius: 4 }}
                    />
                    {isUploadingImage && <span style={{ fontSize: '0.8rem', color: '#60a5fa' }}>Laddar upp...</span>}
                  </div>
                  
                  <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Eller klistra in en bildlänk (URL):</label>
                  <input
                    type="url"
                    placeholder="T.ex. https://exempel.se/sko.png"
                    value={productImageUrl}
                    onChange={(e) => { setProductImageUrl(e.target.value); setProductImageFile(null); }}
                    style={{ width: '100%', padding: 10, background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-light)', color: 'white', borderRadius: 4 }}
                  />
                </div>

                {productImageUrl && (
                  <div style={{ marginBottom: 15 }}>
                    <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Förhandsgranskning (Maxhöjd 150px):</label>
                    <div style={{ marginTop: 8, padding: 10, background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-light)', borderRadius: 6, display: 'flex', justifyContent: 'center' }}>
                      <img src={productImageUrl} alt="Preview" style={{ maxHeight: 150, maxWidth: '100%', objectFit: 'contain' }} />
                    </div>
                  </div>
                )}

                <div className="input-container" style={{ marginTop: 12 }}>
                  <label>Rabatt (%) på denna produkt</label>
                  <input type="number" value={productDiscountPercent} onChange={(e) => {
                    const newPct = e.target.value === '' ? '' : parseFloat(e.target.value);
                    setProductDiscountPercent(newPct);
                    const appliedDiscount = (newPct !== '' && newPct > 0) ? newPct : activeDiscount;
                    setProductVariants(productVariants.map(v => {
                      const orig = v.original_price || 0;
                      return { ...v, selling_price: orig > 0 ? Math.round(orig * (1 - appliedDiscount / 100)) : 0 };
                    }));
                  }} placeholder="T.ex. 20 (frivilligt)" style={{ width: '100%', padding: 10, background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-light)', color: 'white', borderRadius: 4 }} />
                </div>

                <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: 15, marginTop: 15 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
                      <h4 style={{ margin: 0 }}>Varianter &amp; Storlekar</h4>
                      <button
                        type="button"
                        onClick={() => setProductVariants([...productVariants, { size: '', color: '', stock: 1, purchase_price: 0, selling_price: 0 }])}
                        className="btn btn-secondary btn-xs"
                      >
                        + Lägg till variant
                      </button>
                    </div>
                    <div style={{ display: 'flex', gap: 10 }}>
                      <select value={productVariantLabel1} onChange={(e) => setProductVariantLabel1(e.target.value)} className="custom-select" style={{ height: 28, fontSize: '0.8rem', padding: '0 10px' }}>
                        <option value="Storlek">Storlek</option>
                        <option value="Mått">Mått (L x B x H)</option>
                        <option value="Vikt">Vikt</option>
                        <option value="Volym">Volym</option>
                        <option value="Material">Material</option>
                        <option value="Variant">Variant</option>
                      </select>
                      <select value={productVariantLabel2} onChange={(e) => setProductVariantLabel2(e.target.value)} className="custom-select" style={{ height: 28, fontSize: '0.8rem', padding: '0 10px' }}>
                        <option value="Färg">Färg</option>
                        <option value="Mönster">Mönster</option>
                        <option value="Utförande">Utförande</option>
                        <option value="Material">Material</option>
                      </select>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
                    {productVariants.map((v, idx) => (
                      <div key={idx} style={{ background: 'rgba(255,255,255,0.03)', padding: 15, borderRadius: 8, border: '1px solid var(--border-light)', position: 'relative' }}>
                        <button type="button" onClick={() => setProductVariants(productVariants.filter((_, i) => i !== idx))} title="Ta bort variant" style={{ position: 'absolute', top: 10, right: 10, background: 'transparent', border: 'none', color: 'var(--color-danger)', cursor: 'pointer' }}>
                          <Trash2 size={18} />
                        </button>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 12, paddingRight: 30 }}>
                          <div>
                            <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>{productVariantLabel1 || 'Storlek'}</label>
                            <input type="text" placeholder="..." value={v.size || ''} onChange={(e) => { const c = [...productVariants]; c[idx].size = e.target.value; setProductVariants(c); }} required style={{ width: '100%', padding: '6px 10px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-light)', color: 'white', borderRadius: 4 }} />
                          </div>
                          <div>
                            <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>{productVariantLabel2 || 'Färg'}</label>
                            <input type="text" placeholder="..." value={v.color || ''} onChange={(e) => { const c = [...productVariants]; c[idx].color = e.target.value; setProductVariants(c); }} style={{ width: '100%', padding: '6px 10px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-light)', color: 'white', borderRadius: 4 }} />
                          </div>
                          <div>
                            <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Lager</label>
                            <input type="number" placeholder="0" value={v.stock ?? 0} onChange={(e) => { const c = [...productVariants]; c[idx].stock = parseInt(e.target.value) || 0; setProductVariants(c); }} required style={{ width: '100%', padding: '6px 10px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-light)', color: 'white', borderRadius: 4 }} />
                          </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 12 }}>
                          <div>
                            <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Inköpspris (kr)</label>
                            <input type="number" placeholder="0" value={v.purchase_price ?? 0} onChange={(e) => { const c = [...productVariants]; c[idx].purchase_price = parseFloat(e.target.value) || 0; setProductVariants(c); }} required style={{ width: '100%', padding: '6px 10px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-light)', color: 'white', borderRadius: 4 }} />
                          </div>
                          <div>
                            <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Säljpris (kr)</label>
                            <input type="number" placeholder="0" value={v.selling_price ?? 0} onChange={(e) => { const c = [...productVariants]; const val = parseFloat(e.target.value) || 0; c[idx].selling_price = val; if (!c[idx].original_price) { c[idx].original_price = val; } setProductVariants(c); }} required style={{ width: '100%', padding: '6px 10px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-light)', color: 'white', borderRadius: 4 }} />
                          </div>
                          <div>
                            <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Ord. pris (kr)</label>
                            <input type="number" placeholder="Valfritt" value={v.original_price || ''} onChange={(e) => { const c = [...productVariants]; const val = e.target.value ? parseFloat(e.target.value) : undefined; c[idx].original_price = val; if (val !== undefined) { const appliedDiscount = (productDiscountPercent !== '' && productDiscountPercent > 0) ? productDiscountPercent : activeDiscount; c[idx].selling_price = Math.round(val * (1 - appliedDiscount / 100)); } setProductVariants(c); }} style={{ width: '100%', padding: '6px 10px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-light)', color: 'white', borderRadius: 4 }} />
                          </div>
                        </div>

                        <div>
                          <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Streckkod / SKU (Lämna tom för auto)</label>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <input type="text" placeholder="Streckkod/SKU..." value={v.sku || ''} onChange={(e) => { const c = [...productVariants]; c[idx].sku = e.target.value; setProductVariants(c); }} style={{ flex: 1, padding: '6px 10px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-light)', color: 'white', borderRadius: 4 }} />
                            <button type="button" onClick={() => startCameraScanner(idx)} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0 15px', height: 34 }}>
                              <ScanLine size={16} /> <span className="hide-mobile">Skanna</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 25, borderTop: '1px solid var(--border-light)', paddingTop: 15 }}>
                  <button type="button" onClick={() => setProductModalOpen(false)} className="btn btn-ghost">Avbryt</button>
                  <button type="submit" className="btn btn-primary">Spara produkt</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ==================== EXCEL IMPORT MODAL ==================== */}
      {excelModalOpen && (
        <div className="modal-overlay">
          <div className="modal-card glass-modal modal-md" style={{ maxWidth: 650 }}>
            <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2>Importera Excel-fil</h2>
              <button className="btn-close" onClick={() => setExcelModalOpen(false)}><X /></button>
            </div>
            <div className="modal-body" style={{ maxHeight: '75vh', overflowY: 'auto' }}>
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: 15, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)', marginBottom: 20 }}>
                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  Ladda upp en Excel-mall med kolumnerna: <strong>Produktnamn, Kategori, Storlek, Färg, SKU, Antal, Inköpspris, Försäljningspris</strong>.
                  Systemet kommer automatiskt att analysera raderna och ge ett förslag innan lagret sparas.
                </p>
              </div>

              <div className="input-container" style={{ marginBottom: 20 }}>
                <label>Välj fil (.xlsx eller .xls) *</label>
                <input type="file" accept=".xlsx, .xls" onChange={handleExcelUpload} style={{ display: 'block', width: '100%', padding: '12px 10px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-light)', color: 'white', borderRadius: 4 }} />
                {selectedFile && (
                  <p style={{ fontSize: '0.85rem', color: 'var(--color-success)', marginTop: 8 }}>
                    Vald fil: <strong>{selectedFile.name}</strong> ({(selectedFile.size / 1024).toFixed(1)} KB)
                  </p>
                )}
              </div>

              {importLoading && (
                <div style={{ textAlign: 'center', padding: 20 }}>
                  <RefreshCw className="spinner" style={{ color: 'var(--color-primary)', width: 24, height: 24 }} />
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: 8 }}>Läser in tabeller och rader...</p>
                </div>
              )}

              {excelProposals.length > 0 && (
                <div style={{ marginTop: 20 }}>
                  <h4 style={{ marginBottom: 8 }}>Rader som kommer att importeras ({excelProposals.length} st)</h4>
                  <div style={{ maxHeight: 250, overflowY: 'auto', border: '1px solid var(--border-light)', borderRadius: 4 }}>
                    <table className="custom-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--border-light)' }}>
                          <th style={{ padding: 8 }}>Modell</th>
                          <th style={{ padding: 8 }}>Kategori</th>
                          <th style={{ padding: 8 }}>St/Färg</th>
                          <th style={{ padding: 8 }}>Lager</th>
                          <th style={{ padding: 8 }}>Inköpspris</th>
                          <th style={{ padding: 8 }}>Säljpris</th>
                        </tr>
                      </thead>
                      <tbody>
                        {excelProposals.map((row, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid var(--border-light)' }}>
                            <td style={{ padding: 8 }}>{row.name}</td>
                            <td style={{ padding: 8 }}>{row.category}</td>
                            <td style={{ padding: 8 }}>St: {row.size} ({row.color || 'Uni'})</td>
                            <td style={{ padding: 8 }}>{row.stock} st</td>
                            <td style={{ padding: 8 }}>{row.purchase_price} kr</td>
                            <td style={{ padding: 8 }}>{row.selling_price} kr</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
                    <button onClick={() => setExcelModalOpen(false)} className="btn btn-ghost">Avbryt</button>
                    <button onClick={handleConfirmExcelImport} className="btn btn-primary">Bekräfta &amp; Spara till databas</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

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
      {/* ==================== CAMERA BARCODE SCANNER MODAL ==================== */}
      {cameraScanModalOpen && (
        <div className="modal-overlay" style={{ zIndex: 99999 }}>
          <div className="modal-card glass-modal modal-sm" style={{ maxWidth: 450, padding: 25, position: 'relative' }}>
            <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
              <h2>Skanna streckkod/SKU</h2>
              <button className="btn-close" onClick={() => { setCameraScanModalOpen(false); setActiveVariantScanIndex(null); }}><X /></button>
            </div>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '10px 15px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)', marginBottom: 20, textAlign: 'center', width: '100%' }}>
                <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                  Håll streckkoden framför kameran för att skanna in den till varianten.
                </p>
              </div>

              {cameraScanError && (
                <div style={{ margin: '0 0 15px 0', padding: 12, background: 'rgba(239,68,68,0.12)', border: '1px solid var(--color-danger)', borderRadius: 8, color: '#f87171', fontSize: '0.8rem', textAlign: 'center', lineHeight: 1.4 }}>
                  {cameraScanError}
                </div>
              )}

              {/* Viewport for camera with a scanner laser effect */}
              <div style={{ position: 'relative', width: '100%', height: 260, background: 'black', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '2px solid rgba(255,255,255,0.1)' }}>
                <div id="scanner-reader" style={{ width: '100%', height: '100%' }}></div>

                {/* Visual Scanner Overlay */}
                <div style={{ position: 'absolute', inset: 0, border: '30px solid rgba(0,0,0,0.5)', pointerEvents: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {/* Pulse Frame */}
                  <div style={{ width: '100%', height: '100%', border: '2px solid var(--color-primary)', boxShadow: '0 0 15px rgba(236,72,153,0.3)', borderRadius: 4, position: 'relative' }}>
                    {/* Laser line animation */}
                    <div className="scanner-laser-line" style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: 2, background: '#ec4899', boxShadow: '0 0 8px #ec4899' }}></div>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => { setCameraScanModalOpen(false); setActiveVariantScanIndex(null); }}
                className="btn btn-ghost btn-full"
                style={{ marginTop: 20 }}
              >
                Avbryt skanning
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
