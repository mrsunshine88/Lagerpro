import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Home,
  ShoppingCart,
  LayoutGrid,
  TrendingUp,
  ShieldCheck,
  Settings,
  LogOut,
  ArrowRight,
  ShoppingBag,
  ScanLine,
  Plus,
  FileSpreadsheet,
  Wallet,
  PiggyBank,
  Gauge,
  FolderKanban,
  Trash2,
  Edit,
  Lock,
  Mail,
  CheckCircle2,
  PackageSearch,
  LogIn,
  Sparkles,
  Search,
  Tag,
  PackageOpen,
  X,
  User,
  CalendarCheck,
  Check,
  MapPin,
  RefreshCw,
  Eye
} from 'lucide-react';
import './App.css';

// --- CONFIGURATION ---
const API_BASE_URL = 'http://localhost:3000';

// --- MODULAR IMPORTS ---
import type { Variant, Product, Booking, CartItem, UserProfile, ProjectSummary, AnalyticsData } from './types';
import { LoginModal } from './components/LoginModal';
import { QRModal } from './components/QRModal';
import { PosTab } from './features/pos/PosTab';
import { InventoryTab } from './features/inventory/InventoryTab';
import { BookingsTab } from './features/bookings/BookingsTab';
import { AnalyticsTab } from './features/analytics/AnalyticsTab';
import { PublicCatalog } from './features/public/PublicCatalog';

export default function App() {
  // --- AUTH STATE ---
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  
  // --- CORE DATA STATE ---
  const [products, setProducts] = useState<Product[]>([]);
  const [publicProducts, setPublicProducts] = useState<any[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [projectsList, setProjectsList] = useState<string[]>([]);
  const [usersList, setUsersList] = useState<UserProfile[]>([]);

  // --- NAVIGATION TAB ---
  const [activeTab, setActiveTab] = useState<'hub' | 'pos' | 'inventory' | 'bookings' | 'analytics'>('hub');

  // --- POS CART ---
  const [cart, setCart] = useState<CartItem[]>([]);
  const [posDiscount, setPosDiscount] = useState(0);

  // --- MODALS / DIALOGS ---
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // QR Modal
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [qrVariant, setQrVariant] = useState<Variant | null>(null);

  // Settings / Account Modal
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [profileEmail, setProfileEmail] = useState('');
  const [profilePassword, setProfilePassword] = useState('');
  
  // Settings / Investments Modal
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [selectedSettingProject, setSelectedSettingProject] = useState('Allmänt');
  const [settingInvestment, setSettingInvestment] = useState(0);
  const [settingDiscount, setSettingDiscount] = useState(0);
  const [newProjectName, setNewProjectName] = useState('');

  // Discount Codes Admin Management
  const [discountCodes, setDiscountCodes] = useState<any[]>([]);
  const [newDiscountCode, setNewDiscountCode] = useState('');
  const [newDiscountProject, setNewDiscountProject] = useState('Allmänt');
  const [newDiscountPercent, setNewDiscountPercent] = useState(0);
  const [newDiscountFreeShipping, setNewDiscountFreeShipping] = useState(false);
  const [newDiscountValidUntil, setNewDiscountValidUntil] = useState('');
  const [editingDiscountId, setEditingDiscountId] = useState<number | null>(null);

  // Swish Global settings
  const [swishMerchantId, setSwishMerchantId] = useState('');
  const [swishCert, setSwishCert] = useState('');
  const [swishKey, setSwishKey] = useState('');
  const [swishHasCert, setSwishHasCert] = useState(false);
  const [swishHasKey, setSwishHasKey] = useState(false);

  // PayPal Global settings
  const [paypalClientId, setPaypalClientId] = useState('');
  const [paypalClientSecret, setPaypalClientSecret] = useState('');
  const [paypalWebhookId, setPaypalWebhookId] = useState('');
  const [paypalMode, setPaypalMode] = useState('sandbox');
  const [paypalHasSecret, setPaypalHasSecret] = useState(false);
  const [paypalCategoryFilter, setPaypalCategoryFilter] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [settingsActiveTab, setSettingsActiveTab] = useState<'profile' | 'projects' | 'discount_codes' | 'swish' | 'paypal'>('profile');

  // Project e-commerce configs in settings modal
  const [settingCheckoutMode, setSettingCheckoutMode] = useState('booking');
  const [settingDeliveryMethod, setSettingDeliveryMethod] = useState('pickup');
  const [settingShippingCost, setSettingShippingCost] = useState(0);

  // Map of project configurations loaded publicly for catalog
  const [projectConfigs, setProjectConfigs] = useState<Record<string, { checkout_mode: string; delivery_method: string; shipping_cost: number }>>({});

  // Admin User Panel
  const [adminPanelOpen, setAdminPanelOpen] = useState(false);
  const [adminUserEmail, setAdminUserEmail] = useState('');
  const [adminUserPassword, setAdminUserPassword] = useState('');
  const [adminUserRole, setAdminUserRole] = useState<'admin' | 'user'>('user');
  const [adminUserProjects, setAdminUserProjects] = useState('all');
  const [editingUserId, setEditingUserId] = useState<number | null>(null);

  // --- MOBILE VIEWS ---

  // Axios config
  const getAxiosConfig = () => {
    return {
      headers: {
        Authorization: `Bearer ${token}`
      }
    };
  };

  // --- FETCH EFFECT ---
  useEffect(() => {
    if (token) {
      // Decode JWT profile
      try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
          window
            .atob(base64)
            .split('')
            .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
            .join('')
        );
        const payload = JSON.parse(jsonPayload);
        setUserProfile({
          id: payload.sub,
          email: payload.email,
          role: payload.role,
          allowed_projects: payload.allowedProjects
        });
      } catch (e) {
        // Token invalid
        handleLogout();
      }
    } else {
      setUserProfile(null);
      fetchPublicProducts();
    }
  }, [token]);

  // Fetch full data if logged in
  useEffect(() => {
    if (token && userProfile) {
      fetchProducts();
      fetchBookings();
      fetchProjects();
      if (userProfile.role === 'admin') {
        fetchAnalytics();
        fetchUsers();
        fetchDiscountCodes();
      }
    }
  }, [token, userProfile]);



  // Manage POS tab body class for mobile styling
  useEffect(() => {
    if (activeTab === 'pos') {
      document.body.classList.add('pos-tab-active');
    } else {
      document.body.classList.remove('pos-tab-active');
    }
  }, [activeTab]);

  // --- API CALLS ---
  const fetchPublicConfigsForProducts = async (prods: any[]) => {
    const categories = Array.from(new Set(prods.map((p: any) => p.category).filter(Boolean)));
    const configs: Record<string, any> = { ...projectConfigs };
    for (const cat of categories) {
      if (configs[cat as string]) continue; // Skip if already fetched
      try {
        const res = await axios.get(`${API_BASE_URL}/api/public/projects/config?project=${encodeURIComponent(cat as string)}`);
        configs[cat as string] = res.data;
      } catch (e) {
        configs[cat as string] = { checkout_mode: 'booking', delivery_method: 'pickup', shipping_cost: 0 };
      }
    }
    setProjectConfigs(configs);
  };

  const fetchProducts = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/products`, getAxiosConfig());
      setProducts(res.data);
      fetchPublicConfigsForProducts(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchPublicProducts = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/public/products`);
      setPublicProducts(res.data);
      fetchPublicConfigsForProducts(res.data);
    } catch (e) {
      console.error(e);
    }
  };



  const fetchBookings = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/bookings`, getAxiosConfig());
      setBookings(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/analytics`, getAxiosConfig());
      setAnalytics(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchProjects = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/projects`, getAxiosConfig());
      setProjectsList(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/users`, getAxiosConfig());
      setUsersList(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchDiscountCodes = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/discount-codes`, getAxiosConfig());
      setDiscountCodes(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  // --- AUTHENTICATION ---
  const handleLogin = async (email: string, password: string) => {
    setLoginError('');
    try {
      const res = await axios.post(`${API_BASE_URL}/api/login`, {
        email,
        password
      });
      if (res.data.success && res.data.access_token) {
        localStorage.setItem('token', res.data.access_token);
        setToken(res.data.access_token);
        setLoginModalOpen(false);
      } else {
        setLoginError(res.data.error || 'Inloggning misslyckades.');
      }
    } catch (err: any) {
      setLoginError(err.response?.data?.error || 'Felaktig e-postadress eller lösenord.');
    }
  };

  const handleLogout = async () => {
    try {
      await axios.post(`${API_BASE_URL}/api/logout`);
    } catch (e) {}
    localStorage.removeItem('token');
    setToken(null);
    setUserProfile(null);
    setActiveTab('hub');
    setCart([]);
  };

  // --- ACTIONS ---


  // POS Checkout
  const handlePOSCheckout = async () => {
    if (cart.length === 0) return;
    try {
      const items = cart.map((item) => ({
        variantId: item.variant.id,
        quantity: item.quantity,
        selling_price: item.selling_price
      }));
      await axios.post(`${API_BASE_URL}/api/pos/checkout`, { items }, getAxiosConfig());
      setCart([]);
      fetchProducts();
      if (userProfile?.role === 'admin') fetchAnalytics();
      alert('Köp registrerat framgångsrikt!');
    } catch (err: any) {
      alert(err.response?.data?.error || 'Ett fel uppstod vid checkout.');
    }
  };







  // Discount Codes Admin Management
  const handleSaveDiscountCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDiscountCode.trim()) return;
    try {
      if (editingDiscountId) {
        await axios.post(
          `${API_BASE_URL}/api/discount-codes/${editingDiscountId}`,
          {
            code: newDiscountCode.trim(),
            project: newDiscountProject,
            discount_percent: newDiscountPercent,
            free_shipping: newDiscountFreeShipping,
            valid_until: newDiscountValidUntil || null
          },
          getAxiosConfig()
        );
        alert('Rabattkod uppdaterad!');
      } else {
        await axios.post(
          `${API_BASE_URL}/api/discount-codes`,
          {
            code: newDiscountCode.trim(),
            project: newDiscountProject,
            discount_percent: newDiscountPercent,
            free_shipping: newDiscountFreeShipping,
            valid_until: newDiscountValidUntil || null
          },
          getAxiosConfig()
        );
        alert('Rabattkod skapad!');
      }
      setNewDiscountCode('');
      setNewDiscountPercent(0);
      setNewDiscountFreeShipping(false);
      setNewDiscountValidUntil('');
      setEditingDiscountId(null);
      fetchDiscountCodes();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Kunde inte spara rabattkoden.');
    }
  };

  const handleDeleteDiscountCode = async (id: number, code: string) => {
    if (!confirm(`Är du säker på att du vill radera rabattkoden "${code}"?`)) return;
    try {
      await axios.delete(`${API_BASE_URL}/api/discount-codes/${id}`, getAxiosConfig());
      alert('Rabattkoden raderad.');
      fetchDiscountCodes();
    } catch (e) {
      alert('Kunde inte radera rabattkod.');
    }
  };



  // Settings update
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileEmail.trim()) return;
    try {
      const res = await axios.post(
        `${API_BASE_URL}/api/settings/profile`,
        {
          email: profileEmail.trim(),
          password: profilePassword ? profilePassword.trim() : undefined
        },
        getAxiosConfig()
      );
      if (res.data.success) {
        setProfileModalOpen(false);
        setProfilePassword('');
        alert(res.data.message);
        // Refresh token profile email
        if (userProfile) {
          setUserProfile({ ...userProfile, email: res.data.email });
        }
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Kunde inte uppdatera profilen.');
    }
  };

  // Set Project investments & settings
  const handleUpdateSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.post(
        `${API_BASE_URL}/api/projects/investment`,
        {
          project: selectedSettingProject,
          investment: settingInvestment
        },
        getAxiosConfig()
      );

      await axios.post(
        `${API_BASE_URL}/api/projects/discount`,
        {
          project: selectedSettingProject,
          discount_percent: settingDiscount
        },
        getAxiosConfig()
      );

      await axios.post(
        `${API_BASE_URL}/api/projects/config`,
        {
          project: selectedSettingProject,
          checkout_mode: settingCheckoutMode,
          delivery_method: settingDeliveryMethod,
          shipping_cost: settingShippingCost
        },
        getAxiosConfig()
      );

      // Force refresh of public configurations map
      const configs = { ...projectConfigs };
      configs[selectedSettingProject] = {
        checkout_mode: settingCheckoutMode,
        delivery_method: settingDeliveryMethod,
        shipping_cost: settingShippingCost
      };
      setProjectConfigs(configs);

      fetchAnalytics();
      alert('Inställningar sparade!');
    } catch (e) {
      alert('Kunde inte spara inställningar.');
    }
  };

  const handleSaveSwishSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.post(
        `${API_BASE_URL}/api/settings/swish`,
        {
          merchant_id: swishMerchantId.trim(),
          cert: swishCert.trim(),
          key: swishKey.trim()
        },
        getAxiosConfig()
      );
      setSwishCert('');
      setSwishKey('');
      setSwishHasCert(true);
      setSwishHasKey(true);
      alert('Swish API nycklar och certifikat har sparats och aktiverats!');
    } catch (e) {
      alert('Kunde inte spara Swish-uppgifter.');
    }
  };

  const handleSavePaypalSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.post(
        `${API_BASE_URL}/api/paypal/config`,
        {
          client_id: paypalClientId.trim(),
          client_secret: paypalClientSecret.trim(),
          webhook_id: paypalWebhookId.trim(),
          mode: paypalMode,
          category_filter: paypalCategoryFilter.trim(),
        },
        getAxiosConfig(),
      );
      setPaypalClientSecret('');
      setPaypalHasSecret(true);
      alert('PayPal-inställningarna har sparats och aktiverats!');
    } catch (err: any) {
      alert(err.response?.data?.error || 'Kunde inte spara PayPal-uppgifter.');
    }
  };

  const handleSyncPaypalCatalog = async () => {
    if (!confirm('Är du säker på att du vill hämta alla skoprodukter från PayPal? Detta ansluter till ditt PayPal-konto och lägger till dem i Lagerpro.')) return;
    setIsSyncing(true);
    try {
      const res = await axios.post(`${API_BASE_URL}/api/paypal/sync`, {}, getAxiosConfig());
      alert(`Synkning klar! Hämtade och skapade ${res.data.count} nya skovarianter från PayPal.`);
      fetchProducts();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Kunde inte synka från PayPal. Kontrollera dina API-nycklar och anslutning.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return;
    try {
      await axios.post(`${API_BASE_URL}/api/projects`, { name: newProjectName.trim() }, getAxiosConfig());
      setNewProjectName('');
      fetchProjects();
      alert('Projekt/Kategori skapad!');
    } catch (e) {
      alert('Kunde inte skapa projekt.');
    }
  };

  const handleDeleteProject = async (name: string) => {
    if (!confirm(`Är du säker på att du vill radera projektet "${name}"? Det kommer att tas bort från alla användares behörigheter.`)) return;
    try {
      await axios.delete(`${API_BASE_URL}/api/projects`, {
        data: { name },
        ...getAxiosConfig()
      });
      fetchProjects();
      alert('Projektet har raderats.');
    } catch (e) {
      alert('Kunde inte radera projekt.');
    }
  };

  // Admin User CRUD
  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminUserEmail.trim()) return;
    try {
      if (editingUserId) {
        await axios.put(
          `${API_BASE_URL}/api/users/${editingUserId}`,
          {
            password: adminUserPassword ? adminUserPassword : undefined,
            role: adminUserRole,
            allowed_projects: adminUserProjects
          },
          getAxiosConfig()
        );
      } else {
        await axios.post(
          `${API_BASE_URL}/api/users`,
          {
            email: adminUserEmail.trim(),
            password: adminUserPassword,
            role: adminUserRole,
            allowed_projects: adminUserProjects
          },
          getAxiosConfig()
        );
      }
      setAdminUserEmail('');
      setAdminUserPassword('');
      setAdminUserRole('user');
      setAdminUserProjects('all');
      setEditingUserId(null);
      fetchUsers();
      alert('Användare sparad!');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Kunde inte spara användare.');
    }
  };

  const handleDeleteUser = async (id: number) => {
    if (!confirm('Är du säker på att du vill radera denna användare?')) return;
    try {
      await axios.delete(`${API_BASE_URL}/api/users/${id}`, getAxiosConfig());
      fetchUsers();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Kunde inte radera användare.');
    }
  };

  // --- CART MECHANICS ---
  const addToCart = (product: Product, variant: Variant) => {
    const existing = cart.find((item) => item.variant.id === variant.id);
    if (existing) {
      if (existing.quantity >= variant.stock) {
        alert('Lagersaldo otillräckligt.');
        return;
      }
      setCart(
        cart.map((item) =>
          item.variant.id === variant.id ? { ...item, quantity: item.quantity + 1 } : item
        )
      );
    } else {
      if (variant.stock <= 0) {
        alert('Produkten är slut i lager.');
        return;
      }
      setCart([...cart, { product, variant, quantity: 1 }]);
    }
  };

  const updateCartQty = (variantId: number, qty: number) => {
    if (qty <= 0) {
      setCart(cart.filter((item) => item.variant.id !== variantId));
      return;
    }
    const item = cart.find((i) => i.variant.id === variantId);
    if (item && qty > item.variant.stock) {
      alert('Lagersaldo otillräckligt.');
      return;
    }
    setCart(
      cart.map((item) =>
        item.variant.id === variantId ? { ...item, quantity: qty } : item
      )
    );
  };

  const clearPosCart = () => {
    setCart([]);
  };

  // Discount calculation
  const updatePosOrderDiscount = (discount: number) => {
    setPosDiscount(discount);
    setCart(
      cart.map((item) => {
        const discountedPrice = item.variant.selling_price * (1 - discount / 100);
        return {
          ...item,
          selling_price: Math.round(discountedPrice)
        };
      })
    );
  };





  // Totals for POS Cart
  const cartTotalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const cartOriginalTotal = cart.reduce((sum, item) => sum + item.variant.selling_price * item.quantity, 0);
  const cartCurrentTotal = cart.reduce(
    (sum, item) => sum + (item.selling_price ?? item.variant.selling_price) * item.quantity,
    0
  );
  const cartSavings = cartOriginalTotal - cartCurrentTotal;

  // Render Category investment info
  useEffect(() => {
    if (token && selectedSettingProject) {
      // Fetch setting details for investment and discount
      axios
        .get(`${API_BASE_URL}/api/projects/investment?project=${selectedSettingProject}`, getAxiosConfig())
        .then((res) => setSettingInvestment(res.data.investment || 0))
        .catch(() => {});

      axios
        .get(`${API_BASE_URL}/api/projects/discount?project=${selectedSettingProject}`, getAxiosConfig())
        .then((res) => setSettingDiscount(res.data.discount_percent || 0))
        .catch(() => {});

      axios
        .get(`${API_BASE_URL}/api/public/projects/config?project=${selectedSettingProject}`)
        .then((res) => {
          setSettingCheckoutMode(res.data.checkout_mode || 'booking');
          setSettingDeliveryMethod(res.data.delivery_method || 'pickup');
          setSettingShippingCost(res.data.shipping_cost || 0);
        })
        .catch(() => {});

      if (userProfile?.role === 'admin') {
        axios
          .get(`${API_BASE_URL}/api/settings/swish`, getAxiosConfig())
          .then((res) => {
            setSwishMerchantId(res.data.merchant_id || '');
            setSwishHasCert(res.data.has_cert);
            setSwishHasKey(res.data.has_key);
          })
          .catch(() => {});

        axios
          .get(`${API_BASE_URL}/api/paypal/config`, getAxiosConfig())
          .then((res) => {
            setPaypalClientId(res.data.client_id || '');
            setPaypalWebhookId(res.data.webhook_id || '');
            setPaypalMode(res.data.mode || 'sandbox');
            setPaypalCategoryFilter(res.data.category_filter || '');
            setPaypalHasSecret(res.data.has_secret);
          })
          .catch(() => {});
      }
    }
  }, [selectedSettingProject, settingsModalOpen, userProfile]);

  // Main UI render
  return (
    <div className="dark-theme">
      {/* --- IF PUBLIC CATALOG USER --- */}
      {!token ? (
        <PublicCatalog
          publicProducts={publicProducts}
          fetchPublicProducts={fetchPublicProducts}
          projectConfigs={projectConfigs}
          setLoginModalOpen={setLoginModalOpen}
          apiBaseUrl={API_BASE_URL}
        />
      ) : (
        /* --- IF STAFF LOGGED IN APP CONTAINER --- */
        <div id="app-container">
          <header className="glass-header">
            <div className="header-left">
              <div className="logo">
                <PackageSearch className="logo-icon animate-float" />
                <h1>LAGER<span>PRO</span></h1>
              </div>
              
              <nav className="nav-tabs-wrapper">
                <button onClick={() => setActiveTab('hub')} className={`nav-tab ${activeTab === 'hub' ? 'active' : ''}`}>
                  <Home />
                  <span>Startmeny</span>
                </button>
                <button onClick={() => setActiveTab('pos')} className={`nav-tab ${activeTab === 'pos' ? 'active' : ''}`}>
                  <ShoppingCart />
                  <span>Kassa (POS)</span>
                </button>
                <button onClick={() => setActiveTab('inventory')} className={`nav-tab ${activeTab === 'inventory' ? 'active' : ''}`}>
                  <LayoutGrid />
                  <span>Lagerregister</span>
                </button>
                <button onClick={() => setActiveTab('bookings')} className={`nav-tab ${activeTab === 'bookings' ? 'active' : ''}`}>
                  <CalendarCheck />
                  <span>Bokningar</span>
                  {bookings.filter((b) => b.status === 'pending').length > 0 && (
                    <span className="bookings-notif-badge">{bookings.filter((b) => b.status === 'pending').length}</span>
                  )}
                </button>
                {userProfile?.role === 'admin' && (
                  <button onClick={() => setActiveTab('analytics')} className={`nav-tab ${activeTab === 'analytics' ? 'active' : ''}`}>
                    <TrendingUp />
                    <span>Ekonomi &amp; Statistik</span>
                  </button>
                )}
              </nav>
            </div>
            
            <div className="header-right">
              {userProfile?.role === 'admin' && (
                <button onClick={() => setAdminPanelOpen(true)} className="btn btn-ghost btn-icon" title="Admin-panel" style={{ color: 'var(--color-accent)' }}>
                  <ShieldCheck />
                </button>
              )}
              <button onClick={() => setSettingsModalOpen(true)} className="btn btn-ghost btn-icon" title="Inställningar">
                <Settings />
              </button>
              <button onClick={handleLogout} className="btn btn-ghost btn-icon" title="Logga ut">
                <LogOut />
              </button>
            </div>
          </header>

          <main className="content-wrapper">
            {/* --- TAB: WELCOME HUB --- */}
            {activeTab === 'hub' && (
              <div className="tab-pane">
                <div className="welcome-banner glass-card" style={{ padding: 40, textAlign: 'center', marginBottom: 30, background: 'linear-gradient(135deg, rgba(139,92,246,0.1) 0%, rgba(5,7,12,0.4) 100%)', border: '1px solid var(--border-light)' }}>
                  <PackageSearch className="logo-icon animate-float" style={{ width: 60, height: 60, color: 'var(--color-primary)', marginBottom: 15 }} />
                  <h2>Välkommen till LAGER<span>PRO</span></h2>
                  <p style={{ fontSize: '1rem', color: 'var(--text-secondary)', margin: '0 auto', maxWidth: 600 }}>
                    Här har du en total koncernöversikt och lagerstyrning. Välj en funktion nedan för att komma igång.
                  </p>
                  <div style={{ marginTop: 20, display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 12px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-light)', borderRadius: 30 }}>
                    <span className="color-dot" style={{ backgroundColor: 'var(--color-success)', width: 8, height: 8 }}></span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Inloggad som: <strong style={{ color: 'var(--text-primary)' }}>{userProfile?.email}</strong></span>
                    <span className="badge" style={{ fontSize: '0.7rem', padding: '2px 8px' }}>{userProfile?.role === 'admin' ? 'Admin' : 'Personal'}</span>
                  </div>
                </div>

                <div className="hub-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 20 }}>
                  <div className="glass-card hub-card" style={{ padding: 25, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%' }}>
                    <div>
                      <div style={{ width: 48, height: 48, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(139,92,246,0.12)', color: 'var(--color-primary)', marginBottom: 20 }}>
                        <ShoppingCart style={{ width: 24, height: 24 }} />
                      </div>
                      <h3 style={{ margin: '0 0 8px 0', fontSize: '1.2rem', fontWeight: 700 }}>Kassa (POS)</h3>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 20 }}>Sälj produkter snabbt och enkelt. Välj variant, ange antal och slutför köp direkt.</p>
                    </div>
                    <button onClick={() => setActiveTab('pos')} className="btn btn-primary btn-full">
                      <span>Öppna kassa</span>
                      <ArrowRight style={{ marginLeft: 6, width: 16, height: 16 }} />
                    </button>
                  </div>

                  <div className="glass-card hub-card" style={{ padding: 25, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%' }}>
                    <div>
                      <div style={{ width: 48, height: 48, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(99,102,241,0.12)', color: '#818cf8', marginBottom: 20 }}>
                        <LayoutGrid style={{ width: 24, height: 24 }} />
                      </div>
                      <h3 style={{ margin: '0 0 8px 0', fontSize: '1.2rem', fontWeight: 700 }}>Lagerregister</h3>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 20 }}>Sök i lagret, se storlekar och registrera försäljningar.</p>
                    </div>
                    <button onClick={() => setActiveTab('inventory')} className="btn btn-secondary btn-full" style={{ borderColor: '#818cf8', color: '#818cf8' }}>
                      <span>Öppna lager</span>
                      <ArrowRight style={{ marginLeft: 6, width: 16, height: 16 }} />
                    </button>
                  </div>

                  <div className="glass-card hub-card" style={{ padding: 25, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%' }}>
                    <div>
                      <div style={{ width: 48, height: 48, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(236,72,153,0.12)', color: '#ec4899', marginBottom: 20 }}>
                        <CalendarCheck style={{ width: 24, height: 24 }} />
                      </div>
                      <h3 style={{ margin: '0 0 8px 0', fontSize: '1.2rem', fontWeight: 700 }}>Bokningar</h3>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 20 }}>Hantera kundreservationer. Godkänn, reservera eller avbryt inkomna bokningar direkt.</p>
                    </div>
                    <button onClick={() => setActiveTab('bookings')} className="btn btn-secondary btn-full" style={{ borderColor: '#ec4899', color: '#ec4899' }}>
                      <span>Visa bokningar</span>
                      <ArrowRight style={{ marginLeft: 6, width: 16, height: 16 }} />
                    </button>
                  </div>

                  {userProfile?.role === 'admin' && (
                    <div className="glass-card hub-card" style={{ padding: 25, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%' }}>
                      <div>
                        <div style={{ width: 48, height: 48, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(16,185,129,0.12)', color: 'var(--color-success)', marginBottom: 20 }}>
                          <TrendingUp style={{ width: 24, height: 24 }} />
                        </div>
                        <h3 style={{ margin: '0 0 8px 0', fontSize: '1.2rem', fontWeight: 700 }}>Ekonomi &amp; Statistik</h3>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 20 }}>Följ upp kostnader, vinst, marginaler och se din break-even kalkyl för alla partier.</p>
                      </div>
                      <button onClick={() => setActiveTab('analytics')} className="btn btn-secondary btn-full" style={{ borderColor: 'var(--color-success)', color: 'var(--color-success)' }}>
                        <span>Visa ekonomi</span>
                        <ArrowRight style={{ marginLeft: 6, width: 16, height: 16 }} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* --- TAB: KASSA (POS) --- */}
            {activeTab === 'pos' && (
              <PosTab
                products={products}
                cart={cart}
                posDiscount={posDiscount}
                addToCart={addToCart}
                updateCartQty={updateCartQty}
                clearPosCart={clearPosCart}
                updatePosOrderDiscount={updatePosOrderDiscount}
                handlePOSCheckout={handlePOSCheckout}
                apiBaseUrl={API_BASE_URL}
                getAxiosConfig={getAxiosConfig}
              />
            )}

            {/* --- TAB: INVENTORY --- */}
            {activeTab === 'inventory' && (
              <InventoryTab
                products={products}
                fetchProducts={fetchProducts}
                userProfile={userProfile}
                projectsList={projectsList}
                fetchAnalytics={fetchAnalytics}
                setQrVariant={setQrVariant}
                setQrModalOpen={setQrModalOpen}
                addToCart={addToCart}
                apiBaseUrl={API_BASE_URL}
                getAxiosConfig={getAxiosConfig}
                stockMetricsTotalCost={analytics?.stock_metrics?.total_cost || 0}
              />
            )}

            {/* --- TAB: BOOKINGS --- */}
            {activeTab === 'bookings' && (
              <BookingsTab
                bookings={bookings}
                fetchBookings={fetchBookings}
                userProfile={userProfile}
                fetchAnalytics={fetchAnalytics}
                fetchProducts={fetchProducts}
                apiBaseUrl={API_BASE_URL}
                getAxiosConfig={getAxiosConfig}
              />
            )}

            {/* --- TAB: ANALYTICS (ADMIN ONLY) --- */}
            {activeTab === 'analytics' && userProfile?.role === 'admin' && analytics && (
              <AnalyticsTab
                analytics={analytics}
                fetchAnalytics={fetchAnalytics}
                fetchProducts={fetchProducts}
                apiBaseUrl={API_BASE_URL}
                getAxiosConfig={getAxiosConfig}
              />
            )}
          </main>
        </div>
      )}

      {/* ==================== LOGIN MODAL ==================== */}
      <LoginModal
        isOpen={loginModalOpen}
        onClose={() => setLoginModalOpen(false)}
        onLogin={handleLogin}
        loginError={loginError}
      />







      {/* ==================== QR CODE MODAL ==================== */}
      <QRModal
        isOpen={qrModalOpen}
        onClose={() => setQrModalOpen(false)}
        variant={qrVariant}
        apiBaseUrl={API_BASE_URL}
      />

      {/* ==================== SETTINGS MODAL ==================== */}
      {settingsModalOpen && (
        <div className="modal-overlay">
          <div className="modal-card glass-modal modal-md" style={{ maxWidth: 550 }}>
            <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2>Lagerinställningar</h2>
              <button className="btn-close" onClick={() => setSettingsModalOpen(false)}><X /></button>
            </div>
            <div className="modal-body" style={{ maxHeight: '75vh', overflowY: 'auto', paddingTop: 10 }}>
              
              <div className="settings-tabs-list">
                <button type="button" onClick={() => setSettingsActiveTab('profile')} className={`btn btn-xs ${settingsActiveTab === 'profile' ? 'btn-primary' : 'btn-ghost'}`}>Profil &amp; Lösenord</button>
                {userProfile?.role === 'admin' && (
                  <>
                    <button type="button" onClick={() => setSettingsActiveTab('projects')} className={`btn btn-xs ${settingsActiveTab === 'projects' ? 'btn-primary' : 'btn-ghost'}`}>Partier &amp; Kategorier</button>
                    <button type="button" onClick={() => setSettingsActiveTab('discount_codes')} className={`btn btn-xs ${settingsActiveTab === 'discount_codes' ? 'btn-primary' : 'btn-ghost'}`}>Rabattkoder</button>
                    <button type="button" onClick={() => setSettingsActiveTab('swish')} className={`btn btn-xs ${settingsActiveTab === 'swish' ? 'btn-primary' : 'btn-ghost'}`}>Swish-nycklar</button>
                    <button type="button" onClick={() => setSettingsActiveTab('paypal')} className={`btn btn-xs ${settingsActiveTab === 'paypal' ? 'btn-primary' : 'btn-ghost'}`}>PayPal-kassa</button>
                  </>
                )}
              </div>

              {settingsActiveTab === 'profile' && (
                <div style={{ paddingBottom: 10 }}>
                  <h3>Din profil &amp; Lösenord</h3>
                  <button onClick={() => { setProfileEmail(userProfile?.email || ''); setProfileModalOpen(true); }} className="btn btn-secondary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <User style={{ width: 14, height: 14 }} />
                    <span>Uppdatera profiluppgifter</span>
                  </button>
                </div>
              )}

              {userProfile?.role === 'admin' && (
                <>
                  {settingsActiveTab === 'projects' && (
                    <>
                      <div style={{ borderBottom: '1px solid var(--border-light)', paddingBottom: 20, marginBottom: 20 }}>
                        <h3>Partiinvesteringar &amp; Marginal</h3>
                        <form onSubmit={handleUpdateSettings}>
                          <div className="input-container" style={{ marginBottom: 12 }}>
                            <label>Välj kategori / projektparti</label>
                            <select value={selectedSettingProject} onChange={(e) => setSelectedSettingProject(e.target.value)} className="custom-select" style={{ width: '100%', height: 42 }}>
                              <option value="Allmänt">Allmänt</option>
                              <option value="Skor">Skor</option>
                              <option value="Krukor">Krukor</option>
                              <option value="Utemöbler">Utemöbler</option>
                              {projectsList.map((p) => (
                                <option key={p} value={p}>{p}</option>
                              ))}
                            </select>
                          </div>

                          <div className="settings-grid-2col">
                            <div className="input-container">
                              <label>Investerat kapital (Lump-sum, kr)</label>
                              <input type="number" min="0" value={settingInvestment} onChange={(e) => setSettingInvestment(parseFloat(e.target.value) || 0)} style={{ width: '100%', padding: 10, background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-light)', color: 'white', borderRadius: 4 }} />
                            </div>
                            <div className="input-container">
                              <label>Standardrabatt (%)</label>
                              <input type="number" min="0" max="100" value={settingDiscount} onChange={(e) => setSettingDiscount(parseFloat(e.target.value) || 0)} style={{ width: '100%', padding: 10, background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-light)', color: 'white', borderRadius: 4 }} />
                            </div>
                          </div>

                          <div className="settings-grid-2col">
                            <div className="input-container">
                              <label>Betalsätt</label>
                              <select
                                value={settingCheckoutMode}
                                onChange={(e) => setSettingCheckoutMode(e.target.value)}
                                className="custom-select"
                                style={{ width: '100%', height: 42 }}
                              >
                                <option value="booking">Gratis Butiksbokning</option>
                                <option value="ecommerce">Direktbetalning online via Swish</option>
                              </select>
                            </div>
                            <div className="input-container">
                              <label>Leveranssätt</label>
                              <select
                                value={settingDeliveryMethod}
                                onChange={(e) => setSettingDeliveryMethod(e.target.value)}
                                className="custom-select"
                                style={{ width: '100%', height: 42 }}
                              >
                                <option value="pickup">Endast upphämtning i butik</option>
                                <option value="shipping_pickup">Aktivera PostNord hemleverans</option>
                              </select>
                            </div>
                          </div>

                          {settingDeliveryMethod === 'shipping_pickup' && (
                            <div className="input-container" style={{ marginBottom: 15 }}>
                              <label>Fraktavgift vid hemleverans (kr)</label>
                              <input
                                type="number"
                                min="0"
                                value={settingShippingCost}
                                onChange={(e) => setSettingShippingCost(parseFloat(e.target.value) || 0)}
                                style={{ width: '100%', padding: 10, background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-light)', color: 'white', borderRadius: 4 }}
                              />
                            </div>
                          )}

                          <button type="submit" className="btn btn-primary btn-sm">Spara partiinställningar</button>
                        </form>
                      </div>

                      <div>
                        <h3>Skapa / Ta bort projektkategorier</h3>
                        <div style={{ display: 'flex', gap: 10, marginBottom: 15 }}>
                          <input type="text" placeholder="Nytt projektnamn..." value={newProjectName} onChange={(e) => setNewProjectName(e.target.value)} style={{ flex: 1, padding: 10, background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-light)', color: 'white', borderRadius: 4 }} />
                          <button onClick={handleCreateProject} className="btn btn-primary btn-sm">Skapa</button>
                        </div>

                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                          {projectsList.map((p) => (
                            <div key={p} className="badge" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', fontSize: '0.8rem' }}>
                              <span>{p}</span>
                              <button onClick={() => handleDeleteProject(p)} style={{ border: 'none', background: 'none', color: 'var(--color-danger)', cursor: 'pointer', padding: 0 }}><X style={{ width: 14, height: 14 }} /></button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}

                  {settingsActiveTab === 'swish' && (
                    <div>
                      <h3>Swish API-nycklar (Näthandel)</h3>
                      <form onSubmit={handleSaveSwishSettings}>
                        <div className="input-container" style={{ marginBottom: 12 }}>
                          <label>Swish-nummer (Merchant ID) *</label>
                          <input
                            type="text"
                            placeholder="T.ex. 1231112233"
                            value={swishMerchantId}
                            onChange={(e) => setSwishMerchantId(e.target.value)}
                            required
                            style={{ width: '100%', padding: 10, background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-light)', color: 'white', borderRadius: 4 }}
                          />
                        </div>

                        <div className="input-container" style={{ marginBottom: 12 }}>
                          <label style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>SSL Client Certificate (PEM-format)</span>
                            {swishHasCert && <span style={{ color: 'var(--color-success)', fontSize: '0.8rem', fontWeight: 600 }}>✓ Certifikat sparat</span>}
                          </label>
                          <textarea
                            placeholder="Klistra in hela certifikattexten (inklusive -----BEGIN CERTIFICATE-----) här..."
                            value={swishCert}
                            onChange={(e) => setSwishCert(e.target.value)}
                            style={{ width: '100%', height: 100, padding: 10, background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-light)', color: 'white', borderRadius: 4, fontFamily: 'monospace', fontSize: '0.8rem' }}
                          />
                        </div>

                        <div className="input-container" style={{ marginBottom: 15 }}>
                          <label style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>SSL Client Private Key (KEY-format)</span>
                            {swishHasKey && <span style={{ color: 'var(--color-success)', fontSize: '0.8rem', fontWeight: 600 }}>✓ Privat nyckel sparad</span>}
                          </label>
                          <textarea
                            placeholder="Klistra in hela nyckeltexten (inklusive -----BEGIN PRIVATE KEY-----) här..."
                            value={swishKey}
                            onChange={(e) => setSwishKey(e.target.value)}
                            style={{ width: '100%', height: 100, padding: 10, background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-light)', color: 'white', borderRadius: 4, fontFamily: 'monospace', fontSize: '0.8rem' }}
                          />
                        </div>

                        <button type="submit" className="btn btn-primary btn-sm">Spara Swish-uppgifter</button>
                      </form>
                    </div>
                  )}

                  {settingsActiveTab === 'paypal' && (
                    <div>
                      <h3>PayPal Integration &amp; Katalogsynkning</h3>
                      <form onSubmit={handleSavePaypalSettings}>
                        <div className="input-container" style={{ marginBottom: 12 }}>
                          <label>PayPal Client ID *</label>
                          <input
                            type="text"
                            placeholder="Klistra in ditt PayPal Client ID..."
                            value={paypalClientId}
                            onChange={(e) => setPaypalClientId(e.target.value)}
                            required
                            style={{ width: '100%', padding: 10, background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-light)', color: 'white', borderRadius: 4 }}
                          />
                        </div>

                        <div className="input-container" style={{ marginBottom: 12 }}>
                          <label style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>PayPal Client Secret</span>
                            {paypalHasSecret && <span style={{ color: 'var(--color-success)', fontSize: '0.8rem', fontWeight: 600 }}>✓ Secret sparad</span>}
                          </label>
                          <input
                            type="password"
                            placeholder={paypalHasSecret ? "••••••••••••••••••••" : "Klistra in ditt PayPal Client Secret..."}
                            value={paypalClientSecret}
                            onChange={(e) => setPaypalClientSecret(e.target.value)}
                            required={!paypalHasSecret}
                            style={{ width: '100%', padding: 10, background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-light)', color: 'white', borderRadius: 4 }}
                          />
                        </div>

                        <div className="input-container" style={{ marginBottom: 12 }}>
                          <label>PayPal Webhook ID (för säljsynk)</label>
                          <input
                            type="text"
                            placeholder="Klistra in ditt PayPal Webhook ID..."
                            value={paypalWebhookId}
                            onChange={(e) => setPaypalWebhookId(e.target.value)}
                            style={{ width: '100%', padding: 10, background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-light)', color: 'white', borderRadius: 4 }}
                          />
                        </div>

                        <div className="input-container" style={{ marginBottom: 12 }}>
                          <label>PayPal Kategorifilter (t.ex. FOOTWEAR, SHOES eller tomt för alla)</label>
                          <input
                            type="text"
                            placeholder="T.ex. FOOTWEAR..."
                            value={paypalCategoryFilter}
                            onChange={(e) => setPaypalCategoryFilter(e.target.value)}
                            style={{ width: '100%', padding: 10, background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-light)', color: 'white', borderRadius: 4 }}
                          />
                        </div>

                        <div className="input-container" style={{ marginBottom: 15 }}>
                          <label>PayPal Miljö (Mode)</label>
                          <select
                            value={paypalMode}
                            onChange={(e) => setPaypalMode(e.target.value)}
                            className="custom-select"
                            style={{ width: '100%', height: 42 }}
                          >
                            <option value="sandbox">Sandbox (Testmiljö)</option>
                            <option value="live">Live (Skarpt läge)</option>
                          </select>
                        </div>

                        <div className="settings-actions-flex">
                          <button type="submit" className="btn btn-primary btn-sm">Spara PayPal-nycklar</button>
                          <button
                            type="button"
                            onClick={handleSyncPaypalCatalog}
                            disabled={isSyncing || !paypalClientId}
                            className="btn btn-secondary btn-sm"
                            style={{ borderColor: 'var(--color-accent)', color: 'var(--color-accent)' }}
                          >
                            {isSyncing ? 'Synkar produkter...' : 'Hämta skoprodukter från PayPal'}
                          </button>
                        </div>
                      </form>
                    </div>
                  )}

                  {settingsActiveTab === 'discount_codes' && (
                    <div>
                      <h3>Hantera Rabattkoder</h3>

                    <form onSubmit={handleSaveDiscountCode} style={{ marginBottom: 15, background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-light)', padding: 12, borderRadius: 6 }}>
                      <div className="discount-form-grid">
                        <div className="input-container">
                          <label style={{ fontSize: '0.75rem', marginBottom: 4 }}>Välj projekt/kategori</label>
                          <select
                            value={newDiscountProject}
                            onChange={(e) => setNewDiscountProject(e.target.value)}
                            className="custom-select"
                            style={{ width: '100%', height: 38, fontSize: '0.85rem' }}
                          >
                            <option value="Alla">Alla projekt</option>
                            <option value="Allmänt">Allmänt</option>
                            <option value="Skor">Skor</option>
                            <option value="Krukor">Krukor</option>
                            <option value="Utemöbler">Utemöbler</option>
                            {projectsList.map((p) => (
                              <option key={p} value={p}>{p}</option>
                            ))}
                          </select>
                        </div>
                        <div className="input-container">
                          <label style={{ fontSize: '0.75rem', marginBottom: 4 }}>Rabattkod</label>
                          <input
                            type="text"
                            placeholder="T.ex. LARS"
                            value={newDiscountCode}
                            onChange={(e) => setNewDiscountCode(e.target.value)}
                            required
                            style={{ width: '100%', padding: 8, background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-light)', color: 'white', borderRadius: 4, height: 38 }}
                          />
                        </div>
                        <div className="input-container">
                          <label style={{ fontSize: '0.75rem', marginBottom: 4 }}>Rabatt (%)</label>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            placeholder="20"
                            value={newDiscountPercent}
                            onChange={(e) => setNewDiscountPercent(parseFloat(e.target.value) || 0)}
                            required
                            style={{ width: '100%', padding: 8, background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-light)', color: 'white', borderRadius: 4, height: 38 }}
                          />
                        </div>
                        <div className="input-container">
                          <label style={{ fontSize: '0.75rem', marginBottom: 4 }}>Giltig t.o.m (Valfritt)</label>
                          <input
                            type="date"
                            value={newDiscountValidUntil}
                            onChange={(e) => setNewDiscountValidUntil(e.target.value)}
                            style={{ width: '100%', padding: 8, background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-light)', color: 'white', borderRadius: 4, height: 38 }}
                          />
                        </div>
                        <div className="input-container" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', paddingBottom: 6 }}>
                          <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: '0.85rem', userSelect: 'none', color: 'white', marginTop: 4 }}>
                            <input
                              type="checkbox"
                              checked={newDiscountFreeShipping}
                              onChange={(e) => setNewDiscountFreeShipping(e.target.checked)}
                              style={{ width: 16, height: 16, cursor: 'pointer', accentColor: 'var(--color-primary)' }}
                            />
                            <span>Fri frakt</span>
                          </label>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button type="submit" className="btn btn-primary btn-sm" style={{ flex: 1 }}>
                          {editingDiscountId ? 'Spara ändringar' : 'Skapa rabattkod'}
                        </button>
                        {editingDiscountId && (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingDiscountId(null);
                              setNewDiscountCode('');
                              setNewDiscountPercent(0);
                              setNewDiscountFreeShipping(false);
                              setNewDiscountValidUntil('');
                            }}
                            className="btn btn-ghost btn-sm"
                          >
                            Avbryt
                          </button>
                        )}
                      </div>
                    </form>

                    <h4 style={{ marginBottom: 8, fontSize: '0.85rem' }}>Aktiva rabattkoder</h4>
                    <div style={{ border: '1px solid var(--border-light)', borderRadius: 4, overflow: 'hidden', background: 'rgba(0,0,0,0.1)' }}>
                      <table className="custom-table discount-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', textAlign: 'left' }}>
                        <thead>
                          <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--border-light)' }}>
                            <th style={{ padding: '6px 10px' }}>Kod</th>
                            <th style={{ padding: '6px 10px' }}>Projekt</th>
                            <th style={{ padding: '6px 10px' }}>Rabatt</th>
                            <th style={{ padding: '6px 10px' }}>Fri frakt</th>
                            <th style={{ padding: '6px 10px' }}>Giltighetstid</th>
                            <th style={{ padding: '6px 10px', textAlign: 'right' }}>Åtgärder</th>
                          </tr>
                        </thead>
                        <tbody>
                          {discountCodes.map((dc) => (
                            <tr key={dc.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                              <td data-label="Kod" style={{ padding: '6px 10px' }}><strong>{dc.code}</strong></td>
                              <td data-label="Projekt" style={{ padding: '6px 10px' }}><span className="category-tag" style={{ fontSize: '0.7rem', padding: '2px 6px' }}>{dc.project}</span></td>
                              <td data-label="Rabatt" style={{ padding: '6px 10px' }}><strong style={{ color: 'var(--color-success)' }}>-{dc.discountPercent}%</strong></td>
                              <td data-label="Fri frakt" style={{ padding: '6px 10px' }}>
                                {dc.freeShipping ? (
                                  <span className="badge" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '2px 6px', fontSize: '0.7rem' }}>Ja</span>
                                ) : (
                                  <span className="badge" style={{ background: 'rgba(255, 255, 255, 0.05)', color: 'var(--text-secondary)', border: '1px solid rgba(255, 255, 255, 0.1)', padding: '2px 6px', fontSize: '0.7rem' }}>Nej</span>
                                )}
                              </td>
                              <td data-label="Giltighetstid" style={{ padding: '6px 10px' }}>
                                {(() => {
                                  if (!dc.validUntil) {
                                    return (
                                      <span className="badge" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '2px 6px', fontSize: '0.7rem' }}>
                                        För alltid
                                      </span>
                                    );
                                  }
                                  const expired = new Date() > new Date(dc.validUntil);
                                  if (expired) {
                                    return (
                                      <span className="badge" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '2px 6px', fontSize: '0.7rem' }}>
                                        Utgått ({dc.validUntil.split('T')[0]})
                                      </span>
                                    );
                                  } else {
                                    return (
                                      <span className="badge" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa', border: '1px solid rgba(59, 130, 246, 0.3)', padding: '2px 6px', fontSize: '0.7rem' }}>
                                        Giltig t.o.m {dc.validUntil.split('T')[0]}
                                      </span>
                                    );
                                  }
                                })()}
                              </td>
                              <td data-label="Åtgärder" style={{ padding: '6px 10px', textAlign: 'right' }}>
                                <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                                  <button
                                    onClick={() => {
                                      setEditingDiscountId(dc.id);
                                      setNewDiscountCode(dc.code);
                                      setNewDiscountProject(dc.project);
                                      setNewDiscountPercent(dc.discountPercent);
                                      setNewDiscountFreeShipping(dc.freeShipping || false);
                                      setNewDiscountValidUntil(dc.validUntil ? dc.validUntil.split('T')[0] : '');
                                    }}
                                    className="btn btn-ghost btn-icon btn-xs"
                                    title="Redigera"
                                  >
                                    <Edit style={{ width: 12, height: 12 }} />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteDiscountCode(dc.id, dc.code)}
                                    className="btn btn-ghost btn-icon btn-xs"
                                    style={{ color: 'var(--color-danger)' }}
                                    title="Radera"
                                  >
                                    <Trash2 style={{ width: 12, height: 12 }} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                          {discountCodes.length === 0 && (
                            <tr>
                              <td colSpan={4} style={{ textAlign: 'center', padding: 15, color: 'var(--text-muted)' }}>
                                Inga rabattkoder skapade än.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </>
            )}
            </div>
          </div>
        </div>
      )}

      {/* ==================== UPDATE PROFILE SUBMODAL ==================== */}
      {profileModalOpen && (
        <div className="modal-overlay" style={{ zIndex: 1100 }}>
          <div className="modal-card glass-modal modal-sm" style={{ maxWidth: 400 }}>
            <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2>Uppdatera profiluppgifter</h2>
              <button className="btn-close" onClick={() => setProfileModalOpen(false)}><X /></button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleUpdateProfile}>
                <div className="input-container" style={{ marginBottom: 12 }}>
                  <label>E-postadress *</label>
                  <input type="email" value={profileEmail} onChange={(e) => setProfileEmail(e.target.value)} required placeholder="Din e-postadress..." style={{ width: '100%', padding: 10, background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-light)', color: 'white', borderRadius: 4 }} />
                </div>
                <div className="input-container" style={{ marginBottom: 20 }}>
                  <label>Nytt lösenord (valfritt, lämna tomt för oförändrat)</label>
                  <input type="password" value={profilePassword} onChange={(e) => setProfilePassword(e.target.value)} placeholder="Minst 4 tecken..." style={{ width: '100%', padding: 10, background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-light)', color: 'white', borderRadius: 4 }} />
                </div>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                  <button type="button" onClick={() => setProfileModalOpen(false)} className="btn btn-ghost">Avbryt</button>
                  <button type="submit" className="btn btn-primary">Spara profil</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ==================== ADMIN PANEL (USER CRUD) ==================== */}
      {adminPanelOpen && userProfile?.role === 'admin' && (
        <div className="modal-overlay">
          <div className="modal-card glass-modal modal-md" style={{ maxWidth: 600 }}>
            <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2>Admin: Personalhantering</h2>
              <button className="btn-close" onClick={() => setAdminPanelOpen(false)}><X /></button>
            </div>
            <div className="modal-body" style={{ maxHeight: '75vh', overflowY: 'auto' }}>
              
              <div style={{ borderBottom: '1px solid var(--border-light)', paddingBottom: 20, marginBottom: 20 }}>
                <h3>{editingUserId ? 'Redigera personalkonto' : 'Lägg till personal'}</h3>
                <form onSubmit={handleSaveUser}>
                  <div className="input-container" style={{ marginBottom: 12 }}>
                    <label>E-postadress *</label>
                    <input type="email" value={adminUserEmail} onChange={(e) => setAdminUserEmail(e.target.value)} disabled={!!editingUserId} required placeholder="T.ex. personal@lagerpro.se..." style={{ width: '100%', padding: 10, background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-light)', color: 'white', borderRadius: 4 }} />
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15, marginBottom: 15 }}>
                    <div className="input-container">
                      <label>Lösenord {editingUserId ? '(valfritt)' : '*'}</label>
                      <input type="password" value={adminUserPassword} onChange={(e) => setAdminUserPassword(e.target.value)} required={!editingUserId} placeholder="Minst 4 tecken..." style={{ width: '100%', padding: 10, background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-light)', color: 'white', borderRadius: 4 }} />
                    </div>
                    <div className="input-container">
                      <label>Behörighetsroll</label>
                      <select value={adminUserRole} onChange={(e) => setAdminUserRole(e.target.value as any)} className="custom-select" style={{ width: '100%', height: 42 }}>
                        <option value="user">Standardpersonal</option>
                        <option value="admin">Administratör (Full behörighet)</option>
                      </select>
                    </div>
                  </div>

                  <div className="input-container" style={{ marginBottom: 15 }}>
                    <label>Tillåtna Projekt / Kategori-partier (all eller komma-separerad lista)</label>
                    <input type="text" value={adminUserProjects} onChange={(e) => setAdminUserProjects(e.target.value)} placeholder="T.ex. Krukor, Skor eller all för alla partier..." style={{ width: '100%', padding: 10, background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-light)', color: 'white', borderRadius: 4 }} />
                  </div>

                  <div style={{ display: 'flex', gap: 10 }}>
                    <button type="submit" className="btn btn-primary">{editingUserId ? 'Spara ändringar' : 'Skapa användare'}</button>
                    {editingUserId && (
                      <button type="button" onClick={() => { setEditingUserId(null); setAdminUserEmail(''); setAdminUserPassword(''); setAdminUserRole('user'); setAdminUserProjects('all'); }} className="btn btn-ghost">Avbryt redigering</button>
                    )}
                  </div>
                </form>
              </div>

              <div>
                <h3>Registrerade personalkonton</h3>
                <div style={{ border: '1px solid var(--border-light)', borderRadius: 4, overflow: 'hidden' }}>
                  <table className="custom-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--border-light)' }}>
                        <th style={{ padding: '8px 12px' }}>Användare</th>
                        <th style={{ padding: '8px 12px' }}>Roll</th>
                        <th style={{ padding: '8px 12px' }}>Tillåtna projekt</th>
                        <th style={{ padding: '8px 12px', textAlign: 'right' }}>Åtgärder</th>
                      </tr>
                    </thead>
                    <tbody>
                      {usersList.map((u) => (
                        <tr key={u.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                          <td style={{ padding: '8px 12px' }}><strong>{u.email}</strong></td>
                          <td style={{ padding: '8px 12px' }}><span className="badge" style={{ background: u.role === 'admin' ? 'rgba(139,92,246,0.15)' : 'rgba(255,255,255,0.05)' }}>{u.role}</span></td>
                          <td style={{ padding: '8px 12px' }}><code style={{ fontSize: '0.75rem' }}>{u.allowed_projects}</code></td>
                          <td style={{ padding: '8px 12px', textAlign: 'right' }}>
                            {u.id !== 1 && u.email !== 'apersson508@gmail.com' ? (
                              <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                                <button onClick={() => { setEditingUserId(u.id); setAdminUserEmail(u.email); setAdminUserRole(u.role); setAdminUserProjects(u.allowed_projects); }} className="btn btn-ghost btn-icon btn-xs"><Edit style={{ width: 14, height: 14 }} /></button>
                                <button onClick={() => handleDeleteUser(u.id)} className="btn btn-ghost btn-icon btn-xs" style={{ color: 'var(--color-danger)' }}><Trash2 style={{ width: 14, height: 14 }} /></button>
                              </div>
                            ) : (
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Skyddat huvudkonto</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}


    </div>
  );
}
