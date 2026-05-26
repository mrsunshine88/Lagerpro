import React, { useState } from 'react';
import axios from 'axios';
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
  const [productCategory, setProductCategory] = useState('Skor');
  const [productDescription, setProductDescription] = useState('');
  const [productVariants, setProductVariants] = useState<Partial<Variant>[]>([]);

  // Excel Import Modal
  const [excelModalOpen, setExcelModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [excelProposals, setExcelProposals] = useState<any[]>([]);
  const [importLoading, setImportLoading] = useState(false);

  // Barcode Scanner Modal (local simulator)
  const [scanModalOpen, setScanModalOpen] = useState(false);
  const [scanSkuInput, setScanSkuInput] = useState('');
  const [scanMessage, setScanMessage] = useState('');

  // Categories list
  const categoriesList = Array.from(new Set(products.map((p) => p.category)));

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

    const payload = {
      name: productName.trim(),
      category: productCategory,
      description: productDescription,
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
            <p>{stockMetricsTotalCost > 0 ? 'Se Ekonomi' : 'Aktiva'}</p>
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
              <option value="all">Alla kategorier/Projekt</option>
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
                <button onClick={() => { setEditingProduct(null); setProductName(''); setProductCategory('Skor'); setProductDescription(''); setProductVariants([]); setProductModalOpen(true); }} className="btn btn-primary" style={{ height: 42 }}>
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

                <div className="variants-section">
                  <div className="variants-list">
                    {p.variants.map((v) => (
                      <div key={v.id} className="variant-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 8px', borderBottom: '1px solid var(--border-light)' }}>
                        <div style={{ display: 'flex', gap: 8, fontSize: '0.8rem' }}>
                          <span style={{ fontWeight: 600 }}>Storlek: {v.size}</span>
                          {v.color && <span style={{ color: 'var(--text-secondary)' }}>Färg: {v.color}</span>}
                          <span className="val-muted" style={{ fontSize: '0.7rem' }}>SKU: {v.sku}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <button onClick={async () => { await axios.post(`${apiBaseUrl}/api/variants/${v.id}/stock`, { change: -1 }, getAxiosConfig()); fetchProducts(); }} className="btn btn-ghost btn-xs" style={{ minWidth: 20, padding: 2 }}>-</button>
                            <strong style={{ minWidth: 30, textAlign: 'center', fontSize: '0.85rem' }}>{v.stock} st</strong>
                            <button onClick={async () => { await axios.post(`${apiBaseUrl}/api/variants/${v.id}/stock`, { change: 1 }, getAxiosConfig()); fetchProducts(); }} className="btn btn-ghost btn-xs" style={{ minWidth: 20, padding: 2 }}>+</button>
                          </div>
                          <span style={{ fontWeight: 700, color: 'var(--color-success)', fontSize: '0.85rem' }}>{v.selling_price} kr</span>
                          <button onClick={() => { setQrVariant(v); setQrModalOpen(true); }} className="btn btn-ghost btn-icon btn-xs" title="Visa QR"><Eye style={{ width: 14, height: 14 }} /></button>
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
                      <option value="Skor">Skor</option>
                      <option value="Krukor">Krukor</option>
                      <option value="Utemöbler">Utemöbler</option>
                      {projectsList.map((p) => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>
                  <div className="input-container">
                    <label>Beskrivning</label>
                    <input type="text" value={productDescription} onChange={(e) => setProductDescription(e.target.value)} placeholder="T.ex. Storlekarna är något små..." style={{ width: '100%', padding: 10, background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-light)', color: 'white', borderRadius: 4 }} />
                  </div>
                </div>

                <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: 15, marginTop: 15 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <h4 style={{ margin: 0 }}>Varianter &amp; Storlekar</h4>
                    <button
                      type="button"
                      onClick={() => setProductVariants([...productVariants, { size: '', color: '', stock: 1, purchase_price: 0, selling_price: 0 }])}
                      className="btn btn-secondary btn-xs"
                    >
                      + Lägg till variant
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {productVariants.map((v, idx) => (
                      <div key={idx} className="variant-edit-row-grid">
                        <input type="text" placeholder="Storlek" value={v.size || ''} onChange={(e) => { const c = [...productVariants]; c[idx].size = e.target.value; setProductVariants(c); }} required style={{ padding: 6, background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-light)', color: 'white', borderRadius: 4 }} />
                        <input type="text" placeholder="Färg" value={v.color || ''} onChange={(e) => { const c = [...productVariants]; c[idx].color = e.target.value; setProductVariants(c); }} style={{ padding: 6, background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-light)', color: 'white', borderRadius: 4 }} />
                        <input type="number" placeholder="Lager" value={v.stock ?? 0} onChange={(e) => { const c = [...productVariants]; c[idx].stock = parseInt(e.target.value) || 0; setProductVariants(c); }} required style={{ padding: 6, background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-light)', color: 'white', borderRadius: 4 }} />
                        <input type="number" placeholder="Inköpspris" value={v.purchase_price ?? 0} onChange={(e) => { const c = [...productVariants]; c[idx].purchase_price = parseFloat(e.target.value) || 0; setProductVariants(c); }} required style={{ padding: 6, background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-light)', color: 'white', borderRadius: 4 }} />
                        <input type="number" placeholder="Säljpris" value={v.selling_price ?? 0} onChange={(e) => { const c = [...productVariants]; c[idx].selling_price = parseFloat(e.target.value) || 0; setProductVariants(c); }} required style={{ padding: 6, background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-light)', color: 'white', borderRadius: 4 }} />
                        <button type="button" onClick={() => setProductVariants(productVariants.filter((_, i) => i !== idx))} className="btn btn-ghost btn-xs" style={{ color: 'var(--color-danger)' }}><Trash2 style={{ width: 16, height: 16 }} /></button>
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
    </div>
  );
};
