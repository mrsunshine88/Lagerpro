import React, { useState, useEffect, useMemo } from 'react';
import axios from './apiClient';
import { supabase } from './supabaseClient';
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
  Edit3,
  Save,
  ExternalLink,
  Activity,
  Users,
  Settings2,
  Image,
  Key,
  Zap,
  MapPin,
  Ticket,
  Truck,
  RefreshCw,
  Eye,
  Menu
} from 'lucide-react';
import './App.css';

// --- CONFIGURATION ---
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

// --- MODULAR IMPORTS ---
import type { Variant, Product, Booking, CartItem, UserProfile, ProjectSummary, AnalyticsData } from './types';
import { LoginModal } from './components/LoginModal';
import { QRModal } from './components/QRModal';
import { PosTab } from './features/pos/PosTab';
import { InventoryTab } from './features/inventory/InventoryTab';
import { BookingsTab } from './features/bookings/BookingsTab';
import { ShippingTab } from './features/shipping/ShippingTab';
import { AnalyticsTab } from './features/analytics/AnalyticsTab';
import { PublicCatalog } from './features/public/PublicCatalog';
import InstallPWA from './components/InstallPWA';

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

  // --- PERMISSION FILTERING ---
  // For non-admin users: filter projects, products and bookings to only their allowed ones
  const allowedProjectsList = useMemo(() => {
    if (!userProfile || userProfile.role === 'admin') return projectsList;
    const rawAllowed = (userProfile.allowed_projects || '').trim();
    if (rawAllowed === 'all' || rawAllowed === '') return projectsList;
    const allowed = rawAllowed.split(',').map((p) => p.trim()).filter(Boolean);
    if (allowed.length === 0) return projectsList;
    return projectsList.filter((p) => allowed.includes(p));
  }, [projectsList, userProfile]);

  const allowedProducts = useMemo(() => {
    if (!userProfile || userProfile.role === 'admin') return products;
    const rawAllowed = (userProfile.allowed_projects || '').trim();
    if (rawAllowed === 'all' || rawAllowed === '') return products;
    const allowed = rawAllowed.split(',').map((p) => p.trim()).filter(Boolean);
    if (allowed.length === 0) return products;
    return products.filter((p) => allowed.includes(p.category));
  }, [products, userProfile]);

  const allowedBookings = useMemo(() => {
    if (!userProfile || userProfile.role === 'admin') return bookings;
    const rawAllowed = (userProfile.allowed_projects || '').trim();
    if (rawAllowed === 'all' || rawAllowed === '') return bookings;
    const allowed = rawAllowed.split(',').map((p) => p.trim()).filter(Boolean);
    if (allowed.length === 0) return bookings;
    return bookings.filter((b) => allowed.includes(b.product_category));
  }, [bookings, userProfile]);
  const [usersList, setUsersList] = useState<UserProfile[]>([]);

  // --- NAVIGATION TAB ---
  const [activeTab, setActiveTab] = useState<'hub' | 'pos' | 'inventory' | 'bookings' | 'shipping' | 'analytics' | 'admin'>('hub');
  const [adminActiveTab, setAdminActiveTab] = useState<'users' | 'projects' | 'storefront' | 'discount_codes' | 'shipping' | 'swish' | 'paypal' | 'simulation'>('users');
  const [confirmState, setConfirmState] = useState<{ message: string; resolve: (val: boolean) => void } | null>(null);
  const [toasts, setToasts] = useState<{ id: number; message: string; type: 'success' | 'error' | 'info' }[]>([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const triggerToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  useEffect(() => {
    window.alert = (message: string) => {
      let type: 'success' | 'error' | 'info' = 'info';
      const lower = message.toLowerCase();
      if (lower.includes('lyckades') || lower.includes('klar') || lower.includes('sparade') || lower.includes('skapad') || lower.includes('tack för') || lower.includes('lade till')) {
        type = 'success';
      } else if (lower.includes('misslyckades') || lower.includes('fel') || lower.includes('kunde inte') || lower.includes('ogiltig') || lower.includes('felaktig')) {
        type = 'error';
      }
      triggerToast(message, type);
    };

    (window as any).confirm = (message: string) => {
      return new Promise<boolean>((resolve) => {
        setConfirmState({ message, resolve });
      });
    };
  }, []);

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
  const [selectedSettingProject, setSelectedSettingProject] = useState('Alla');
  const [settingInvestment, setSettingInvestment] = useState<number | ''>(0);
  const [settingDiscount, setSettingDiscount] = useState<number | ''>(0);
  const [newProjectName, setNewProjectName] = useState('');

  // Discount Codes Admin Management
  const [discountCodes, setDiscountCodes] = useState<any[]>([]);
  const [newDiscountCode, setNewDiscountCode] = useState('');
  const [newDiscountProject, setNewDiscountProject] = useState('Alla');
  const [newDiscountPercent, setNewDiscountPercent] = useState<number | ''>(0);
  const [newDiscountFreeShipping, setNewDiscountFreeShipping] = useState(false);
  const [newDiscountValidUntil, setNewDiscountValidUntil] = useState('');
  const [editingDiscountId, setEditingDiscountId] = useState<number | null>(null);



  // Storefront settings
  const [storefrontCompany, setStorefrontCompany] = useState('Företaget AB');
  const [storefrontBanner, setStorefrontBanner] = useState('');
  const [storefrontBannerFile, setStorefrontBannerFile] = useState<File | null>(null);
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);

  // Shipping settings
  const [shippingProvider, setShippingProvider] = useState('postnord');
  const [shippingPostnordKey, setShippingPostnordKey] = useState('');
  const [shippingDhlKey, setShippingDhlKey] = useState('');
  const [shippingDhlAccount, setShippingDhlAccount] = useState('');

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
  const [targetSyncProject, setTargetSyncProject] = useState('Alla');
  
  // Webhook Simulation settings
  const [simulatedSku, setSimulatedSku] = useState('');
  const [simulatedQty, setSimulatedQty] = useState(1);
  const [simulatedPrice, setSimulatedPrice] = useState(1000);
  const [isSimulatingPurchase, setIsSimulatingPurchase] = useState(false);
  const [isResettingSimulations, setIsResettingSimulations] = useState(false);

  const [settingsActiveTab, setSettingsActiveTab] = useState<'profile' | 'projects' | 'discount_codes' | 'shipping' | 'swish' | 'paypal' | 'simulation'>('profile');

  const [settingCheckoutMode, setSettingCheckoutMode] = useState('booking');
  const [settingDeliveryMethod, setSettingDeliveryMethod] = useState('pickup');
  const [settingShippingCost, setSettingShippingCost] = useState<number | ''>(0);
  const [settingPublicVisible, setSettingPublicVisible] = useState(true);

  // Map of project configurations loaded publicly for catalog
  const [projectConfigs, setProjectConfigs] = useState<Record<string, { checkout_mode: string; delivery_method: string; shipping_cost: number; public_visible?: boolean }>>({});

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
      // Fetch profile from database instead of decoding Supabase JWT
      axios.get(`${API_BASE_URL}/api/users/profile`, getAxiosConfig())
        .then(res => {
          if (res.data) {
            setUserProfile(res.data);
          } else {
            handleLogout();
          }
        })
        .catch(() => {
          handleLogout();
        });
    } else {
      setUserProfile(null);
      fetchPublicProducts();
    }
  }, [token]);

  // --- SUPABASE REALTIME ---
  useEffect(() => {
    if (!token) return;

    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bookings' },
        (payload: any) => {
          console.log('Realtime bookings update received:', payload);
          fetchBookings();
          fetchProducts();
          fetchPublicProducts();
          fetchAnalytics();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'variants' },
        (payload: any) => {
          console.log('Realtime variants update received:', payload);
          fetchProducts();
          fetchPublicProducts();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'products' },
        (payload: any) => {
          console.log('Realtime products update received:', payload);
          fetchProducts();
          fetchPublicProducts();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'transactions' },
        (payload: any) => {
          console.log('Realtime transactions update received:', payload);
          fetchAnalytics();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'settings' },
        (payload: any) => {
          console.log('Realtime settings update received:', payload);
          fetchProjects();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [token]);


  // Fetch full data if logged in
  useEffect(() => {
    if (token && userProfile) {
      fetchProducts();
      fetchBookings();
      fetchProjects();
      
      // Fetch public swish info for POS
      axios.get(`${API_BASE_URL}/api/public/settings/swish-info`).then(res => {
        if (res.data && res.data.merchant_id) {
          setSwishMerchantId(res.data.merchant_id);
        }
      }).catch(() => {});

      axios.get(`${API_BASE_URL}/api/settings/shipping`, { headers: { Authorization: `Bearer ${token}` } }).then(res => {
        setShippingProvider(res.data.provider);
        setShippingPostnordKey(res.data.postnord_key);
        setShippingDhlKey(res.data.dhl_key);
        setShippingDhlAccount(res.data.dhl_account);
      }).catch(() => {});

      axios.get(`${API_BASE_URL}/api/settings/storefront`, { headers: { Authorization: `Bearer ${token}` } }).then(res => {
        setStorefrontCompany(res.data.company_name);
        setStorefrontBanner(res.data.banner_url);
      }).catch(() => {});

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
    if (!categories.includes('Alla')) {
      categories.push('Alla');
    }
    const configs: Record<string, any> = { ...projectConfigs };
    for (const cat of categories) {
      if (configs[cat as string] !== undefined) continue; // Skip if already fetched or failed
      try {
        const res = await axios.get(`${API_BASE_URL}/api/public/projects/config?project=${encodeURIComponent(cat as string)}`);
        configs[cat as string] = res.data;
      } catch (e) {
        configs[cat as string] = null;
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
  const handlePOSCheckout = async (paymentMethod?: string) => {
    if (cart.length === 0) return;
    try {
      const items = cart.map((item) => ({
        variantId: item.variant.id,
        quantity: item.quantity,
        selling_price: item.selling_price
      }));
      await axios.post(`${API_BASE_URL}/api/pos/checkout`, { items, paymentMethod }, getAxiosConfig());
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
            discount_percent: newDiscountPercent === '' ? 0 : newDiscountPercent,
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
            discount_percent: newDiscountPercent === '' ? 0 : newDiscountPercent,
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
          investment: settingInvestment === '' ? 0 : settingInvestment
        },
        getAxiosConfig()
      );

      await axios.post(
        `${API_BASE_URL}/api/projects/discount`,
        {
          project: selectedSettingProject,
          discount_percent: settingDiscount === '' ? 0 : settingDiscount
        },
        getAxiosConfig()
      );

      await axios.post(
        `${API_BASE_URL}/api/projects/config`,
        {
          project: selectedSettingProject,
          checkout_mode: settingCheckoutMode,
          delivery_method: settingDeliveryMethod,
          shipping_cost: settingShippingCost === '' ? 0 : settingShippingCost,
          public_visible: settingPublicVisible
        },
        getAxiosConfig()
      );

      const configs = { ...projectConfigs };
      configs[selectedSettingProject] = {
        checkout_mode: settingCheckoutMode,
        delivery_method: settingDeliveryMethod,
        shipping_cost: settingShippingCost === '' ? 0 : settingShippingCost,
        public_visible: settingPublicVisible
      };
      setProjectConfigs(configs);

      fetchProducts();
      fetchPublicProducts();
      fetchAnalytics();
      alert('Inställningar sparade!');
    } catch (e) {
      alert('Kunde inte spara inställningar.');
    }
  };



  const handleSaveStorefront = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      let finalBannerUrl = storefrontBanner;
      
      if (storefrontBannerFile) {
        setIsUploadingBanner(true);
        const formData = new FormData();
        formData.append('image', storefrontBannerFile);
        const uploadRes = await axios.post(`${API_BASE_URL}/api/upload/image`, formData, { headers: { Authorization: `Bearer ${token}` } });
        if (uploadRes.data.success) {
          finalBannerUrl = uploadRes.data.url;
          setStorefrontBanner(finalBannerUrl);
          setStorefrontBannerFile(null);
        } else {
          alert('Det gick inte att ladda upp bilden.');
          setIsUploadingBanner(false);
          return;
        }
        setIsUploadingBanner(false);
      }

      await axios.post(`${API_BASE_URL}/api/settings/storefront`, {
        company_name: storefrontCompany,
        banner_url: finalBannerUrl
      }, { headers: { Authorization: `Bearer ${token}` } });
      alert('Butiksdesign sparad!');
    } catch (err) {
      alert('Misslyckades att spara butiksdesign.');
      setIsUploadingBanner(false);
    }
  };

  const handleSaveShippingSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_BASE_URL}/api/settings/shipping`, {
        provider: shippingProvider,
        postnord_key: shippingPostnordKey,
        dhl_key: shippingDhlKey,
        dhl_account: shippingDhlAccount
      }, { headers: { Authorization: `Bearer ${token}` } });
      alert('Fraktinställningar sparades!');
    } catch (err) {
      alert('Misslyckades att spara fraktinställningar.');
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

  const handleSyncPaypalCatalog = async (targetProject?: string) => {
    if (!confirm(`Är du säker på att du vill hämta alla skoprodukter från PayPal? Detta ansluter till ditt PayPal-konto och lägger till dem i Lagerpro${targetProject ? ` under projektet "${targetProject}"` : ''}.`)) return;
    setIsSyncing(true);
    try {
      const res = await axios.post(`${API_BASE_URL}/api/paypal/sync`, { targetProject }, getAxiosConfig());
      alert(`Synkning klar! Hämtade och skapade ${res.data.count} nya sko-varianter från PayPal.`);
      fetchProducts();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Kunde inte synka från PayPal. Kontrollera dina API-nycklar och anslutning.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSimulateWebhookPurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!simulatedSku.trim()) {
      alert('Vänligen välj eller ange en streckkod / SKU.');
      return;
    }
    setIsSimulatingPurchase(true);
    try {
      const payload = {
        event_type: "PAYMENT.CAPTURE.COMPLETED",
        is_simulation: true,
        simulated_items: [
          {
            sku: simulatedSku.trim(),
            quantity: simulatedQty,
            price: simulatedPrice
          }
        ]
      };
      const res = await axios.post(`${API_BASE_URL}/api/webhooks/paypal`, payload, getAxiosConfig());
      if (res.data.success) {
        alert(`Simulering lyckades! ${res.data.message}`);
        fetchProducts();
        if (userProfile?.role === 'admin') fetchAnalytics();
      } else {
        alert(`Simulering misslyckades: ${res.data.message}`);
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Koppling till webhook-simulator misslyckades.');
    } finally {
      setIsSimulatingPurchase(false);
    }
  };

  const handleResetSimulations = async () => {
    if (!confirm('Är du säker på att du vill nollställa alla simulerade köp? Detta lägger tillbaka skosaldon i lagret och raderar testtransaktionerna permanent från ekonomifliken.')) return;
    setIsResettingSimulations(true);
    try {
      const res = await axios.post(`${API_BASE_URL}/api/paypal/simulate/reset`, {}, getAxiosConfig());
      if (res.data.success) {
        alert(`Nollställning lyckades! Återställde saldon och raderade ${res.data.count} testtransaktioner.`);
        fetchProducts();
        if (userProfile?.role === 'admin') fetchAnalytics();
      } else {
        alert(`Kunde inte nollställa: ${res.data.message}`);
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Koppling till återställnings-API:et misslyckades.');
    } finally {
      setIsResettingSimulations(false);
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
          setSettingPublicVisible(res.data.public_visible !== false); // Default to true
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
      <InstallPWA />
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
              
              <nav className={`nav-tabs-wrapper ${mobileMenuOpen ? 'open' : ''}`}>
                <button onClick={() => { setActiveTab('hub'); setMobileMenuOpen(false); }} className={`nav-tab ${activeTab === 'hub' ? 'active' : ''}`}>
                  <Home />
                  <span>Startmeny</span>
                </button>
                <button onClick={() => { setActiveTab('pos'); setMobileMenuOpen(false); }} className={`nav-tab ${activeTab === 'pos' ? 'active' : ''}`}>
                  <ShoppingCart />
                  <span>Kassa (POS)</span>
                </button>
                <button onClick={() => { setActiveTab('inventory'); setMobileMenuOpen(false); }} className={`nav-tab ${activeTab === 'inventory' ? 'active' : ''}`}>
                  <LayoutGrid />
                  <span>Lagerregister</span>
                </button>
                <button onClick={() => { setActiveTab('bookings'); setMobileMenuOpen(false); }} className={`nav-tab ${activeTab === 'bookings' ? 'active' : ''}`}>
                  <CalendarCheck />
                  <span>Order</span>
                  {allowedBookings.filter((b) => b.status === 'pending').length > 0 && (
                    <span className="bookings-notif-badge">{allowedBookings.filter((b) => b.status === 'pending').length}</span>
                  )}
                </button>
                <button onClick={() => { setActiveTab('shipping'); setMobileMenuOpen(false); }} className={`nav-tab ${activeTab === 'shipping' ? 'active' : ''}`}>
                  <Truck />
                  <span>Fraktsedlar</span>
                  {allowedBookings.filter((b) => b.delivery_method === 'shipping' && b.status === 'pending').length > 0 && (
                    <span className="bookings-notif-badge" style={{ background: 'var(--color-primary)' }}>{allowedBookings.filter((b) => b.delivery_method === 'shipping' && b.status === 'pending').length}</span>
                  )}
                </button>
                {userProfile?.role === 'admin' && (
                  <>
                    <button onClick={() => { setActiveTab('analytics'); setMobileMenuOpen(false); }} className={`nav-tab ${activeTab === 'analytics' ? 'active' : ''}`}>
                      <TrendingUp />
                      <span>Ekonomi &amp; Statistik</span>
                    </button>
                    <button onClick={() => { setActiveTab('admin'); setMobileMenuOpen(false); }} className={`nav-tab ${activeTab === 'admin' ? 'active' : ''}`}>
                      <ShieldCheck />
                      <span>Admin</span>
                    </button>
                  </>
                )}
                <div className="mobile-only" style={{ height: 1, background: 'var(--border-light)', margin: '10px 0' }}></div>
                <button 
                  onClick={() => { setMobileMenuOpen(false); setProfileEmail(userProfile?.email || ''); setProfileModalOpen(true); }} 
                  className="nav-tab mobile-only"
                >
                  <Settings />
                  <span>Inställningar</span>
                </button>
                <button 
                  onClick={() => { setMobileMenuOpen(false); handleLogout(); }} 
                  className="nav-tab mobile-only" 
                  style={{ color: '#ef4444' }}
                >
                  <LogOut />
                  <span>Logga ut</span>
                </button>
              </nav>
            </div>
            
            <div className="header-right">
              <button className="mobile-menu-toggle mobile-only" onClick={() => setMobileMenuOpen(!mobileMenuOpen)} title="Meny">
                {mobileMenuOpen ? <X style={{ width: 22, height: 22 }} /> : <Menu style={{ width: 22, height: 22 }} />}
              </button>
              <button onClick={() => { setProfileEmail(userProfile?.email || ''); setProfileModalOpen(true); }} className="btn btn-ghost btn-icon desktop-only" title="Inställningar">
                <Settings style={{ width: 18, height: 18 }} />
              </button>
              <button onClick={handleLogout} className="btn btn-ghost btn-icon desktop-only" title="Logga ut">
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
                      <h3 style={{ margin: '0 0 8px 0', fontSize: '1.2rem', fontWeight: 700 }}>Order</h3>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 20 }}>Hantera kundreservationer. Godkänn, reservera eller avbryt inkomna bokningar direkt.</p>
                    </div>
                    <button onClick={() => setActiveTab('bookings')} className="btn btn-secondary btn-full" style={{ borderColor: '#ec4899', color: '#ec4899' }}>
                      <span>Visa order</span>
                      <ArrowRight style={{ marginLeft: 6, width: 16, height: 16 }} />
                    </button>
                  </div>

                  {userProfile?.role === 'admin' && (
                    <>
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

                      <div className="glass-card hub-card" style={{ padding: 25, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%' }}>
                        <div>
                          <div style={{ width: 48, height: 48, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(139,92,246,0.12)', color: 'var(--color-primary)', marginBottom: 20 }}>
                            <ShieldCheck style={{ width: 24, height: 24 }} />
                          </div>
                          <h3 style={{ margin: '0 0 8px 0', fontSize: '1.2rem', fontWeight: 700 }}>Admin</h3>
                          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 20 }}>Hantera systeminställningar, projektkategorier, rabattkoder, Swish och PayPal.</p>
                        </div>
                        <button onClick={() => setActiveTab('admin')} className="btn btn-secondary btn-full" style={{ borderColor: 'var(--color-primary)', color: 'var(--color-primary)' }}>
                          <span>Hantera system</span>
                          <ArrowRight style={{ marginLeft: 6, width: 16, height: 16 }} />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* --- TAB: KASSA (POS) --- */}
            {activeTab === 'pos' && (
              <PosTab
                products={allowedProducts}
                cart={cart}
                posDiscount={posDiscount}
                addToCart={addToCart}
                updateCartQty={updateCartQty}
                clearPosCart={clearPosCart}
                updatePosOrderDiscount={updatePosOrderDiscount}
                handlePOSCheckout={handlePOSCheckout}
                apiBaseUrl={API_BASE_URL}
                getAxiosConfig={getAxiosConfig}
                hasAllAccess={userProfile?.role === 'admin' || userProfile?.allowed_projects === 'all'}
                projectsList={allowedProjectsList}
                projectConfigs={projectConfigs}
                swishMerchantId={swishMerchantId}
              />
            )}

            {/* --- TAB: INVENTORY --- */}
            {activeTab === 'inventory' && (
              <InventoryTab
                products={allowedProducts}
                fetchProducts={fetchProducts}
                userProfile={userProfile}
                projectsList={allowedProjectsList}
                fetchAnalytics={fetchAnalytics}
                setQrVariant={setQrVariant}
                setQrModalOpen={setQrModalOpen}
                addToCart={addToCart}
                apiBaseUrl={API_BASE_URL}
                getAxiosConfig={getAxiosConfig}
                stockMetricsTotalCost={analytics?.stock_metrics?.total_cost || 0}
                totalSoldUnits={analytics?.total_sold_units || 0}
              />
            )}

            {/* --- TAB: BOOKINGS --- */}
            {activeTab === 'bookings' && (
              <BookingsTab
                bookings={allowedBookings}
                fetchBookings={fetchBookings}
                userProfile={userProfile}
                fetchAnalytics={fetchAnalytics}
                fetchProducts={fetchProducts}
                apiBaseUrl={API_BASE_URL}
                getAxiosConfig={getAxiosConfig}
              />
            )}

            {/* --- TAB: SHIPPING --- */}
            {activeTab === 'shipping' && (
              <ShippingTab
                bookings={allowedBookings}
                fetchBookings={fetchBookings}
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

            {/* --- TAB: SYSTEMADMIN (ADMIN ONLY) --- */}
            {activeTab === 'admin' && userProfile?.role === 'admin' && (
              <div className="tab-pane">
                <div className="welcome-banner glass-card" style={{ padding: 25, marginBottom: 25, background: 'linear-gradient(135deg, rgba(139,92,246,0.06) 0%, rgba(5,7,12,0.3) 100%)', border: '1px solid var(--border-light)' }}>
                  <h2 style={{ fontSize: '1.6rem', margin: 0, fontWeight: 800 }}>Administration</h2>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: 4 }}>
                    Hantera systeminställningar, projektkategorier, personalkonton, rabattkoder samt kopplingar till Swish och PayPal.
                  </p>
                </div>

                <div className="settings-tabs-list desktop-only" style={{ marginBottom: 20, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button type="button" onClick={() => setAdminActiveTab('users')} className={`btn btn-sm ${adminActiveTab === 'users' ? 'btn-primary' : 'btn-ghost'}`}>Personalkonton</button>
                  <button type="button" onClick={() => setAdminActiveTab('storefront')} className={`btn btn-sm ${adminActiveTab === 'storefront' ? 'btn-primary' : 'btn-ghost'}`}>Butiksdesign</button>
                  <button type="button" onClick={() => setAdminActiveTab('projects')} className={`btn btn-sm ${adminActiveTab === 'projects' ? 'btn-primary' : 'btn-ghost'}`}>Kategorier &amp; Marginal</button>
                  <button type="button" onClick={() => setAdminActiveTab('discount_codes')} className={`btn btn-sm ${adminActiveTab === 'discount_codes' ? 'btn-primary' : 'btn-ghost'}`}>Rabattkoder</button>
                  <button type="button" onClick={() => setAdminActiveTab('paypal')} className={`btn btn-sm ${adminActiveTab === 'paypal' ? 'btn-primary' : 'btn-ghost'}`}>PayPal Integration</button>
                  <button type="button" onClick={() => setAdminActiveTab('swish')} className={`btn btn-sm ${adminActiveTab === 'swish' ? 'btn-primary' : 'btn-ghost'}`}>Swish Integration</button>
                  <button type="button" onClick={() => setAdminActiveTab('simulation')} className={`btn btn-sm ${adminActiveTab === 'simulation' ? 'btn-primary' : 'btn-ghost'}`}>Utvecklarsimulering</button>
                </div>

                <div className="mobile-only" style={{ marginBottom: 20 }}>
                  <label style={{ display: 'block', marginBottom: 6, fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Välj admin-sektion:</label>
                  <select
                    value={adminActiveTab}
                    onChange={(e) => setAdminActiveTab(e.target.value as any)}
                    className="custom-select"
                    style={{ width: '100%', height: 42 }}
                  >
                    <option value="users">Personalkonton</option>
                    <option value="storefront">Butiksdesign</option>
                    <option value="projects">Kategorier &amp; Marginal</option>
                    <option value="discount_codes">Rabattkoder</option>
                    <option value="paypal">PayPal Integration</option>
                    <option value="swish">Swish Integration</option>
                    <option value="simulation">Utvecklarsimulering</option>
                  </select>
                </div>

                <div className="glass-card" style={{ padding: 24, minHeight: 400 }}>
                  
                  {/* SUB-TAB: storefront (BUTIKSDESIGN) */}
                  {adminActiveTab === 'storefront' && (
                    <div>
                      <h3>Anpassa Kundportal & Butiksdesign</h3>
                      <form onSubmit={handleSaveStorefront} style={{ marginBottom: 20 }}>
                        <div className="input-container" style={{ marginBottom: 12 }}>
                          <label>Företagsnamn / Butikens namn *</label>
                          <input
                            type="text"
                            placeholder="T.ex. Min Fina Butik AB"
                            value={storefrontCompany}
                            onChange={(e) => setStorefrontCompany(e.target.value)}
                            required
                            style={{ width: '100%', padding: 10, background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-light)', color: 'white', borderRadius: 4 }}
                          />
                        </div>

                        <div className="input-container" style={{ marginBottom: 15 }}>
                          <label>Bannerbild / Logotyp</label>
                          <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 10 }}>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => setStorefrontBannerFile(e.target.files ? e.target.files[0] : null)}
                              style={{ flex: 1, padding: 8, background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-light)', color: 'white', borderRadius: 4 }}
                            />
                            {isUploadingBanner && <span style={{ fontSize: '0.8rem', color: '#60a5fa' }}>Laddar upp och optimerar...</span>}
                          </div>
                          
                          <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Eller klistra in en bildlänk (URL):</label>
                          <input
                            type="url"
                            placeholder="T.ex. https://exempel.se/bild.png"
                            value={storefrontBanner}
                            onChange={(e) => { setStorefrontBanner(e.target.value); setStorefrontBannerFile(null); }}
                            style={{ width: '100%', padding: 10, background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-light)', color: 'white', borderRadius: 4 }}
                          />
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginTop: 4 }}>
                            Laddar du upp en bild från datorn så krymps och komprimeras den automatiskt.
                          </span>
                        </div>

                        {storefrontBanner && (
                          <div style={{ marginBottom: 15 }}>
                            <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Förhandsgranskning (Maxhöjd 200px):</label>
                            <div style={{ marginTop: 8, padding: 10, background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-light)', borderRadius: 6, display: 'flex', justifyContent: 'center' }}>
                              <img src={storefrontBanner} alt="Banner Preview" style={{ maxHeight: 200, maxWidth: '100%', objectFit: 'contain' }} />
                            </div>
                          </div>
                        )}

                        <button type="submit" className="btn btn-primary btn-sm">Spara Design</button>
                      </form>
                    </div>
                  )}

                  {/* SUB-TAB: users (STAFF CRUD) */}
                  {adminActiveTab === 'users' && (
                    <div>
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
                            <label style={{ display: 'block', marginBottom: 6 }}>Tillåtna Projekt / Kategori-partier</label>
                            <div style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
                              <select
                                className="custom-select"
                                style={{ flex: 1, height: 42 }}
                                value=""
                                onChange={(e) => {
                                  const val = e.target.value;
                                  if (!val) return;
                                  if (val === 'all') {
                                    setAdminUserProjects('all');
                                  } else {
                                    const currentList = adminUserProjects === 'all' ? [] : adminUserProjects.split(',').map((p) => p.trim()).filter(Boolean);
                                    if (!currentList.includes(val)) {
                                      const newList = [...currentList, val];
                                      setAdminUserProjects(newList.join(', '));
                                    }
                                  }
                                }}
                              >
                                <option value="">-- Välj projekt att tillåta --</option>
                                <option value="all">Alla projekt (all)</option>
                                {projectsList.map((p) => (
                                  <option key={p} value={p}>{p}</option>
                                ))}
                              </select>
                            </div>

                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                              {(() => {
                                const list = adminUserProjects === 'all'
                                  ? ['all']
                                  : adminUserProjects.split(',').map((p) => p.trim()).filter(Boolean);
                                
                                return list.map((proj) => (
                                  <span key={proj} className="badge" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', fontSize: '0.8rem', background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.3)', borderRadius: 16 }}>
                                    <span>{proj === 'all' ? 'Alla projekt (all)' : proj}</span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (proj === 'all') {
                                          setAdminUserProjects('');
                                        } else {
                                          const newList = list.filter((p) => p !== proj && p !== 'all');
                                          setAdminUserProjects(newList.join(', '));
                                        }
                                      }}
                                      style={{ border: 'none', background: 'none', color: 'var(--color-danger)', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}
                                    >
                                      <X style={{ width: 14, height: 14 }} />
                                    </button>
                                  </span>
                                ));
                              })()}
                            </div>
                          </div>

                          <div style={{ display: 'flex', gap: 10 }}>
                            <button type="submit" className="btn btn-primary">{editingUserId ? 'Spara ändringar' : 'Skapa användare'}</button>
                            {editingUserId && (
                              <button type="button" onClick={() => { setEditingUserId(null); setAdminUserEmail(''); setAdminUserPassword(''); setAdminUserRole('user'); setAdminUserProjects('all'); }} className="btn btn-ghost">Avbryt redigering</button>
                            )}
                          </div>
                        </form>
                      </div>

                      <div style={{ marginTop: 25 }}>
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
                  )}

                  {/* SUB-TAB: projects (KATEGORIER & SETTINGS WITH CHECKBOXES) */}
                  {adminActiveTab === 'projects' && (
                    <div>
                      <div style={{ borderBottom: '1px solid var(--border-light)', paddingBottom: 20, marginBottom: 20 }}>
                        <h3>Partiinvesteringar &amp; Marginal</h3>
                        <form onSubmit={handleUpdateSettings}>
                          <div className="input-container" style={{ marginBottom: 12 }}>
                            <label>Välj kategori / projektparti</label>
                            <select value={selectedSettingProject} onChange={(e) => setSelectedSettingProject(e.target.value)} className="custom-select" style={{ width: '100%', height: 42 }}>
                              <option value="Alla">Alla projekt (Standard)</option>
                              {projectsList.map((p) => (
                                <option key={p} value={p}>{p}</option>
                              ))}
                            </select>
                          </div>

                          <div className="settings-grid-2col" style={{ marginBottom: 15 }}>
                            <div className="input-container">
                              <label>Investerat kapital (Lump-sum, kr)</label>
                              <input type="number" min="0" value={settingInvestment} onChange={(e) => { const val = e.target.value; setSettingInvestment(val === '' ? '' : parseFloat(val)); }} style={{ width: '100%', padding: 10, background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-light)', color: 'white', borderRadius: 4 }} />
                            </div>
                            <div className="input-container">
                              <label>Standardrabatt (%)</label>
                              <input type="number" min="0" max="100" value={settingDiscount} onChange={(e) => { const val = e.target.value; setSettingDiscount(val === '' ? '' : parseFloat(val)); }} style={{ width: '100%', padding: 10, background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-light)', color: 'white', borderRadius: 4 }} />
                            </div>
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
                            <div className="input-container">
                              <label style={{ display: 'block', marginBottom: 8, fontSize: '0.85rem', fontWeight: 600 }}>Betalsätt</label>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, background: 'rgba(255,255,255,0.02)', padding: 12, borderRadius: 6, border: '1px solid var(--border-light)' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: '0.85rem' }}>
                                  <input
                                    type="checkbox"
                                    checked={settingCheckoutMode === 'booking' || settingCheckoutMode === 'both'}
                                    onChange={(e) => {
                                      const isBookingChecked = e.target.checked;
                                      const isSwishChecked = settingCheckoutMode === 'ecommerce' || settingCheckoutMode === 'both';
                                      if (isBookingChecked && isSwishChecked) {
                                        setSettingCheckoutMode('both');
                                      } else if (isBookingChecked) {
                                        setSettingCheckoutMode('booking');
                                      } else if (isSwishChecked) {
                                        setSettingCheckoutMode('ecommerce');
                                      } else {
                                        alert('Du måste välja minst ett betalsätt!');
                                      }
                                    }}
                                    style={{ width: 16, height: 16, accentColor: 'var(--color-primary)', cursor: 'pointer' }}
                                  />
                                  <span>Gratis Butiksbokning</span>
                                </label>
                                <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: '0.85rem' }}>
                                  <input
                                    type="checkbox"
                                    checked={settingCheckoutMode === 'ecommerce' || settingCheckoutMode === 'both'}
                                    onChange={(e) => {
                                      const isSwishChecked = e.target.checked;
                                      const isBookingChecked = settingCheckoutMode === 'booking' || settingCheckoutMode === 'both';
                                      if (isBookingChecked && isSwishChecked) {
                                        setSettingCheckoutMode('both');
                                      } else if (isSwishChecked) {
                                        setSettingCheckoutMode('ecommerce');
                                      } else if (isBookingChecked) {
                                        setSettingCheckoutMode('booking');
                                      } else {
                                        alert('Du måste välja minst ett betalsätt!');
                                      }
                                    }}
                                    style={{ width: 16, height: 16, accentColor: 'var(--color-primary)', cursor: 'pointer' }}
                                  />
                                  <span>Direktbetalning online via Swish</span>
                                </label>
                              </div>
                            </div>

                            <div className="input-container">
                              <label style={{ display: 'block', marginBottom: 8, fontSize: '0.85rem', fontWeight: 600 }}>Leveranssätt</label>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, background: 'rgba(255,255,255,0.02)', padding: 12, borderRadius: 6, border: '1px solid var(--border-light)' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: '0.85rem' }}>
                                  <input
                                    type="checkbox"
                                    checked={settingDeliveryMethod === 'pickup' || settingDeliveryMethod === 'shipping_pickup'}
                                    onChange={(e) => {
                                      const isPickupChecked = e.target.checked;
                                      const isShippingChecked = settingDeliveryMethod === 'shipping' || settingDeliveryMethod === 'shipping_pickup';
                                      if (isPickupChecked && isShippingChecked) {
                                        setSettingDeliveryMethod('shipping_pickup');
                                      } else if (isPickupChecked) {
                                        setSettingDeliveryMethod('pickup');
                                      } else if (isShippingChecked) {
                                        setSettingDeliveryMethod('shipping');
                                      } else {
                                        alert('Du måste välja minst ett leveranssätt!');
                                      }
                                    }}
                                    style={{ width: 16, height: 16, accentColor: 'var(--color-primary)', cursor: 'pointer' }}
                                  />
                                  <span>Upphämtning i butik</span>
                                </label>
                                <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: '0.85rem' }}>
                                  <input
                                    type="checkbox"
                                    checked={settingDeliveryMethod === 'shipping' || settingDeliveryMethod === 'shipping_pickup'}
                                    onChange={(e) => {
                                      const isShippingChecked = e.target.checked;
                                      const isPickupChecked = settingDeliveryMethod === 'pickup' || settingDeliveryMethod === 'shipping_pickup';
                                      if (isPickupChecked && isShippingChecked) {
                                        setSettingDeliveryMethod('shipping_pickup');
                                      } else if (isShippingChecked) {
                                        setSettingDeliveryMethod('shipping');
                                      } else if (isPickupChecked) {
                                        setSettingDeliveryMethod('pickup');
                                      } else {
                                        alert('Du måste välja minst ett leveranssätt!');
                                      }
                                    }}
                                    style={{ width: 16, height: 16, accentColor: 'var(--color-primary)', cursor: 'pointer' }}
                                  />
                                  <span>PostNord till ombud</span>
                                </label>
                              </div>
                            </div>
                          </div>

                          <div className="input-container" style={{ marginBottom: 15 }}>
                            <label style={{ display: 'block', marginBottom: 8, fontSize: '0.85rem', fontWeight: 600 }}>Kundportal Synlighet</label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: '0.85rem', background: 'rgba(255,255,255,0.02)', padding: 12, borderRadius: 6, border: '1px solid var(--border-light)' }}>
                              <input
                                type="checkbox"
                                checked={settingPublicVisible}
                                onChange={(e) => setSettingPublicVisible(e.target.checked)}
                                style={{ width: 16, height: 16, accentColor: 'var(--color-primary)', cursor: 'pointer' }}
                              />
                              <span>Kundportal (Visa varor för detta projekt)</span>
                            </label>
                          </div>

                          {(settingDeliveryMethod === 'shipping' || settingDeliveryMethod === 'shipping_pickup') && (
                            <div className="input-container" style={{ marginBottom: 15 }}>
                              <label>Fraktavgift vid ombud (kr)</label>
                              <input
                                type="number"
                                min="0"
                                value={settingShippingCost}
                                onChange={(e) => { const val = e.target.value; setSettingShippingCost(val === '' ? '' : parseFloat(val)); }}
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

                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
                          {projectsList.map((p) => (
                            <div key={p} className="badge" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', fontSize: '0.8rem' }}>
                              <span>{p}</span>
                              <button onClick={() => handleDeleteProject(p)} style={{ border: 'none', background: 'none', color: 'var(--color-danger)', cursor: 'pointer', padding: 0 }}><X style={{ width: 14, height: 14 }} /></button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* SUB-TAB: discount_codes (RABATTKODER) */}
                  {adminActiveTab === 'discount_codes' && (
                    <div>
                      <h3>Hantera Rabattkoder</h3>

                      <form onSubmit={handleSaveDiscountCode} style={{ marginBottom: 15, background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-light)', padding: 12, borderRadius: 6 }}>
                        <div className="discount-form-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12, marginBottom: 12 }}>
                          <div className="input-container">
                            <label style={{ fontSize: '0.75rem', marginBottom: 4 }}>Välj projekt/kategori</label>
                            <select
                              value={newDiscountProject}
                              onChange={(e) => setNewDiscountProject(e.target.value)}
                              className="custom-select"
                              style={{ width: '100%', height: 38, fontSize: '0.85rem' }}
                            >
                              <option value="Alla">Alla projekt</option>
                              {projectsList.map((p) => (
                                <option key={p} value={p}>{p}</option>
                              ))}
                            </select>
                          </div>

                          <div className="input-container">
                            <label style={{ fontSize: '0.75rem', marginBottom: 4 }}>Rabattkod (Minst 3 tecken) *</label>
                            <input
                              type="text"
                              value={newDiscountCode}
                              onChange={(e) => setNewDiscountCode(e.target.value.toUpperCase())}
                              required
                              placeholder="T.ex. VÅRPROMO"
                              style={{ width: '100%', padding: '8px 10px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-light)', color: 'white', borderRadius: 4, fontSize: '0.85rem' }}
                            />
                          </div>

                          <div className="input-container">
                            <label style={{ fontSize: '0.75rem', marginBottom: 4 }}>Rabattsats (%) *</label>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={newDiscountPercent}
                              onChange={(e) => { const val = e.target.value; setNewDiscountPercent(val === '' ? '' : parseFloat(val)); }}
                              required
                              style={{ width: '100%', padding: '8px 10px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-light)', color: 'white', borderRadius: 4, fontSize: '0.85rem' }}
                            />
                          </div>

                          <div className="input-container">
                            <label style={{ fontSize: '0.75rem', marginBottom: 4 }}>Giltig t.o.m. (Valfritt)</label>
                            <input
                              type="date"
                              value={newDiscountValidUntil}
                              onChange={(e) => setNewDiscountValidUntil(e.target.value)}
                              style={{ width: '100%', padding: '6px 10px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-light)', color: 'white', borderRadius: 4, fontSize: '0.85rem', colorScheme: 'dark' }}
                            />
                          </div>

                          <div className="input-container" style={{ display: 'flex', alignItems: 'center', height: '100%', paddingTop: 18 }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.8' }}>
                              <input
                                type="checkbox"
                                checked={newDiscountFreeShipping}
                                onChange={(e) => setNewDiscountFreeShipping(e.target.checked)}
                                style={{ width: 16, height: 16, accentColor: 'var(--color-primary)', cursor: 'pointer' }}
                              />
                              <span>Fri frakt?</span>
                            </label>
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: 8 }}>
                          <button type="submit" className="btn btn-primary btn-xs">
                            {editingDiscountId ? 'Uppdatera kod' : 'Skapa rabattkod'}
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
                              className="btn btn-ghost btn-xs"
                            >
                              Avbryt
                            </button>
                          )}
                        </div>
                      </form>

                      <div style={{ border: '1px solid var(--border-light)', borderRadius: 4, overflow: 'hidden' }}>
                        <table className="custom-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', textAlign: 'left' }}>
                          <thead>
                            <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--border-light)' }}>
                              <th style={{ padding: '8px 12px' }}>Kod</th>
                              <th style={{ padding: '8px 12px' }}>Projekt / Parti</th>
                              <th style={{ padding: '8px 12px' }}>Effekt</th>
                              <th style={{ padding: '8px 12px' }}>Giltighet</th>
                              <th style={{ padding: '8px 12px', textAlign: 'right' }}>Åtgärder</th>
                            </tr>
                          </thead>
                          <tbody>
                            {discountCodes.map((d) => (
                              <tr key={d.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                                <td style={{ padding: '8px 12px' }}>
                                  <span className="badge" style={{ background: 'rgba(139,92,246,0.15)', color: 'var(--color-primary)', fontWeight: 700 }}>
                                    {d.code}
                                  </span>
                                </td>
                                <td style={{ padding: '8px 12px' }}><strong>{d.project}</strong></td>
                                <td style={{ padding: '8px 12px' }}>
                                  {(d.discountPercent ?? d.discount_percent)}% rabatt
                                  {(d.freeShipping ?? d.free_shipping) && <span style={{ color: '#60a5fa', marginLeft: 8 }}>+ Fri frakt</span>}
                                </td>
                                <td style={{ padding: '8px 12px', color: 'var(--text-secondary)' }}>
                                  {(d.validUntil ?? d.valid_until) ? new Date(d.validUntil ?? d.valid_until).toLocaleDateString('sv-SE') : 'Tills vidare'}
                                </td>
                                <td style={{ padding: '8px 12px', textAlign: 'right' }}>
                                  <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                                    <button
                                      onClick={() => {
                                        setEditingDiscountId(d.id);
                                        setNewDiscountCode(d.code);
                                        setNewDiscountProject(d.project);
                                        setNewDiscountPercent(d.discountPercent ?? d.discount_percent ?? 0);
                                        setNewDiscountFreeShipping(d.freeShipping ?? d.free_shipping ?? false);
                                        const vu = d.validUntil ?? d.valid_until;
                                        setNewDiscountValidUntil(vu ? vu.substring(0, 10) : '');
                                      }}
                                      className="btn btn-ghost btn-icon btn-xs"
                                    >
                                      <Edit style={{ width: 14, height: 14 }} />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteDiscountCode(d.id, d.code)}
                                      className="btn btn-ghost btn-icon btn-xs"
                                      style={{ color: 'var(--color-danger)' }}
                                    >
                                      <Trash2 style={{ width: 14, height: 14 }} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                            {discountCodes.length === 0 && (
                              <tr>
                                <td colSpan={5} style={{ textAlign: 'center', padding: 15, color: 'var(--text-muted)' }}>
                                  Inga rabattkoder skapade än.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* SUB-TAB: paypal (PAYPAL KEYS AND SYNCER) */}
                  {adminActiveTab === 'paypal' && (
                    <div>
                      <h3>PayPal Integration &amp; Katalogsynkning</h3>
                      <form onSubmit={handleSavePaypalSettings} style={{ marginBottom: 20 }}>
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
                          <label>PayPal Kategorifilter — synka bara produkter från denna kategori</label>
                          <select
                            value={paypalCategoryFilter}
                            onChange={(e) => setPaypalCategoryFilter(e.target.value)}
                            className="custom-select"
                            style={{ width: '100%', height: 42 }}
                          >
                            <option value="">Alla kategorier</option>
                            {projectsList.map((p) => (
                              <option key={p} value={p}>{p}</option>
                            ))}
                          </select>
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

                        <button type="submit" className="btn btn-primary btn-sm">Spara PayPal-nycklar</button>
                      </form>

                      <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-light)', padding: 15, borderRadius: 6 }}>
                        <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'block', marginBottom: 8 }}>Välj destinationsprojekt i Lagerpro för PayPal-synkning:</label>
                        <div style={{ display: 'flex', gap: 10 }}>
                          <select
                            value={targetSyncProject}
                            onChange={(e) => setTargetSyncProject(e.target.value)}
                            className="custom-select"
                            style={{ flex: 1, height: 38 }}
                          >
                            <option value="Alla">Alla projekt</option>
                            {projectsList.map((p) => (
                              <option key={p} value={p}>{p}</option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={() => handleSyncPaypalCatalog(targetSyncProject)}
                            disabled={isSyncing || !paypalClientId}
                            className="btn btn-secondary btn-sm"
                            style={{ borderColor: 'var(--color-accent)', color: 'var(--color-accent)', height: 38 }}
                          >
                            {isSyncing ? 'Synkar...' : 'Hämta skoprodukter'}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  
                  {/* SUB-TAB: shipping (FRAKT) */}
                  {adminActiveTab === 'shipping' && (
                    <div>
                      <h3>Frakt & Logistik (PostNord / DHL)</h3>
                      <form onSubmit={handleSaveShippingSettings}>
                        <div className="input-container" style={{ marginBottom: 15 }}>
                          <label>Aktivt Fraktbolag *</label>
                          <select
                            value={shippingProvider}
                            onChange={(e) => setShippingProvider(e.target.value)}
                            className="custom-select"
                            style={{ width: '100%', height: 42 }}
                          >
                            <option value="postnord">PostNord (Standard API)</option>
                            <option value="dhl">DHL (Standard API)</option>
                          </select>
                        </div>

                        <h4 style={{ marginTop: 20 }}>PostNord API-nycklar</h4>
                        <div className="input-container" style={{ marginBottom: 12 }}>
                          <label>PostNord API Key</label>
                          <input
                            type="text"
                            placeholder="Klistra in din PostNord API-nyckel..."
                            value={shippingPostnordKey}
                            onChange={(e) => setShippingPostnordKey(e.target.value)}
                            style={{ width: '100%', padding: 10, background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-light)', color: 'white', borderRadius: 4 }}
                          />
                        </div>

                        <h4 style={{ marginTop: 20 }}>DHL API-nycklar</h4>
                        <div className="input-container" style={{ marginBottom: 12 }}>
                          <label>DHL API Key</label>
                          <input
                            type="text"
                            placeholder="Klistra in din DHL API-nyckel..."
                            value={shippingDhlKey}
                            onChange={(e) => setShippingDhlKey(e.target.value)}
                            style={{ width: '100%', padding: 10, background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-light)', color: 'white', borderRadius: 4 }}
                          />
                        </div>
                        <div className="input-container" style={{ marginBottom: 12 }}>
                          <label>DHL Kundnummer (Account Number)</label>
                          <input
                            type="text"
                            placeholder="T.ex. 123456789"
                            value={shippingDhlAccount}
                            onChange={(e) => setShippingDhlAccount(e.target.value)}
                            style={{ width: '100%', padding: 10, background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-light)', color: 'white', borderRadius: 4 }}
                          />
                        </div>

                        <button type="submit" className="btn btn-primary btn-sm" style={{ marginTop: 15 }}>Spara fraktinställningar</button>
                      </form>
                    </div>
                  )}

                  {/* SUB-TAB: swish (SWISH API SETTINGS) */}
                  {adminActiveTab === 'swish' && (
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

                  {/* SUB-TAB: simulation (DEVELOPER WEBHOOK SIMULATOR) */}
                  {adminActiveTab === 'simulation' && (
                    <div>
                      <h3>Utvecklarverktyg &amp; Webhook-simulering</h3>
                      
                      <div style={{ background: 'rgba(245, 158, 11, 0.06)', border: '1px dashed rgba(245, 158, 11, 0.3)', padding: 12, borderRadius: 6, marginBottom: 20 }}>
                        <p style={{ margin: 0, fontSize: '0.8rem', color: '#fbbf24', lineHeight: 1.5 }}>
                          <strong>Testläge:</strong> Här kan du simulera ett PayPal-köp och testa hur Lagerpro uppdaterar lagersaldot och bokför intäkten automatiskt under <strong>Ekonomi</strong>. Genom att nollställa testerna återställs alla lagersaldon till sitt ursprungliga skick.
                        </p>
                      </div>

                      <form onSubmit={handleSimulateWebhookPurchase} style={{ marginBottom: 25 }}>
                        <div className="input-container" style={{ marginBottom: 12 }}>
                          <label>Målsko / Variant att sälja *</label>
                          <select
                            value={simulatedSku}
                            onChange={(e) => {
                              setSimulatedSku(e.target.value);
                              const matched = products.flatMap(p => p.variants).find(v => v.sku === e.target.value);
                              if (matched) {
                                setSimulatedPrice(matched.selling_price);
                              }
                            }}
                            required
                            className="custom-select"
                            style={{ width: '100%', height: 42 }}
                          >
                            <option value="">-- Välj en sko från lagret --</option>
                            {products.flatMap(p => 
                              p.variants.map(v => (
                                <option key={v.sku} value={v.sku}>
                                  {p.name} - Storlek {v.size} {v.color ? `(${v.color})` : ''} [SKU: {v.sku}] (Saldo: {v.stock} st)
                                </option>
                              ))
                            )}
                          </select>
                          {(() => {
                            const parentProd = products.find(p => p.variants.some(v => v.sku === simulatedSku));
                            if (parentProd && parentProd.name.startsWith('Startprodukt (')) {
                              return (
                                <span style={{ display: 'block', fontSize: '0.8rem', color: '#fbbf24', marginTop: 6, lineHeight: 1.4 }}>
                                  💡 <strong>Obs!</strong> Detta är projektets dolda startprodukt. För att se hur köpet uppdateras live i lager, kassa och kundportal, skapa en **riktig produkt** i <em>Lagerregister</em> först (eller synka från PayPal) och välj den här!
                                </span>
                              );
                            }
                            return null;
                          })()}
                        </div>

                        <div className="settings-grid-2col">
                          <div className="input-container">
                            <label>Antal par att sälja</label>
                            <input
                              type="number"
                              min="1"
                              value={simulatedQty}
                              onChange={(e) => setSimulatedQty(parseInt(e.target.value) || 1)}
                              required
                              style={{ width: '100%', padding: 10, background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-light)', color: 'white', borderRadius: 4 }}
                            />
                          </div>
                          <div className="input-container">
                            <label>Simulerat försäljningspris per st (kr)</label>
                            <input
                              type="number"
                              min="0"
                              value={simulatedPrice}
                              onChange={(e) => setSimulatedPrice(parseFloat(e.target.value) || 0)}
                              required
                              style={{ width: '100%', padding: 10, background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-light)', color: 'white', borderRadius: 4 }}
                            />
                          </div>
                        </div>

                        <button
                          type="submit"
                          disabled={isSimulatingPurchase || !simulatedSku}
                          className="btn btn-primary btn-full"
                          style={{ marginTop: 15 }}
                        >
                          {isSimulatingPurchase ? 'Skickar simulerad betalning...' : 'Skicka simulerat köp (PayPal Webhook)'}
                        </button>
                      </form>

                      <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: 20 }}>
                        <h4 style={{ margin: '0 0 8px 0', color: 'var(--color-danger)' }}>Återställ &amp; Nollställ Testerna</h4>
                        <p style={{ margin: '0 0 15px 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          Ta bort alla fiktiva simulationstransaktioner och återställ lagersaldona för de påverkade skovarianterna till hur de var innan du påbörjade testerna.
                        </p>
                        <button
                          type="button"
                          onClick={handleResetSimulations}
                          disabled={isResettingSimulations}
                          className="btn btn-secondary btn-full"
                          style={{ borderColor: 'var(--color-danger)', color: 'var(--color-danger)' }}
                        >
                          {isResettingSimulations ? 'Nollställer...' : '🧹 Nollställ och ta bort simulerade testköp'}
                        </button>
                      </div>
                    </div>
                  )}

                </div>
              </div>
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
          <div className="modal-card glass-modal modal-sm" style={{ maxWidth: 400 }}>
            <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2>Inställningar</h2>
              <button className="btn-close" onClick={() => setSettingsModalOpen(false)}><X /></button>
            </div>
            <div className="modal-body" style={{ paddingBottom: 10 }}>
              <h3>Din profil &amp; Lösenord</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 15 }}>
                Uppdatera din e-postadress eller byt ditt lösenord för inloggning till Lagerpro.
              </p>
              <button onClick={() => { setProfileEmail(userProfile?.email || ''); setProfileModalOpen(true); }} className="btn btn-primary btn-full" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <User style={{ width: 14, height: 14 }} />
                <span>Uppdatera profiluppgifter</span>
              </button>
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

      

      {/* ==================== PREMIUM GLASSMORPHIC TOASTS ==================== */}
      <div className="premium-toast-container" style={{
        position: 'fixed',
        bottom: 20,
        right: 20,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        pointerEvents: 'none'
      }}>
        {toasts.map((t) => (
          <div
            key={t.id}
            onClick={() => setToasts(prev => prev.filter(x => x.id !== t.id))}
            style={{
              padding: '12px 20px',
              borderRadius: 8,
              background: t.type === 'success' 
                ? 'rgba(16, 185, 129, 0.15)' 
                : t.type === 'error' 
                  ? 'rgba(239, 68, 68, 0.15)' 
                  : 'rgba(59, 130, 246, 0.15)',
              border: t.type === 'success'
                ? '1px solid rgba(16, 185, 129, 0.3)'
                : t.type === 'error'
                  ? '1px solid rgba(239, 68, 68, 0.3)'
                  : '1px solid rgba(59, 130, 246, 0.3)',
              color: t.type === 'success'
                ? 'var(--color-success)'
                : t.type === 'error'
                  ? 'var(--color-danger)'
                  : '#60a5fa',
              backdropFilter: 'blur(12px)',
              boxShadow: 'var(--shadow-lg)',
              pointerEvents: 'auto',
              cursor: 'pointer',
              fontSize: '0.9rem',
              fontWeight: 600,
              minWidth: 260,
              maxWidth: 380,
              animation: 'slideIn 0.3s ease forwards',
              display: 'flex',
              alignItems: 'center',
              gap: 10
            }}
          >
            <div style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: t.type === 'success'
                ? 'var(--color-success)'
                : t.type === 'error'
                  ? 'var(--color-danger)'
                  : '#60a5fa'
            }} />
            <div style={{ flex: 1, wordBreak: 'break-word' }}>{t.message}</div>
          </div>
        ))}
      </div>

      {/* ==================== PREMIUM GLASSMORPHIC CONFIRM MODAL ==================== */}
      {confirmState && (
        <div className="modal-overlay" style={{ zIndex: 10000, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}>
          <div className="modal-card glass-modal modal-sm" style={{ maxWidth: 400, animation: 'scaleUp 0.2s ease forwards', background: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(20px)', border: '1px solid var(--border-light)', borderRadius: 12, padding: 24, boxShadow: 'var(--shadow-lg)' }}>
            <div className="modal-header" style={{ borderBottom: '1px solid var(--border-light)', paddingBottom: 12, marginBottom: 15 }}>
              <h2 style={{ fontSize: '1.2rem', color: 'var(--color-accent)', display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}>
                <Sparkles style={{ width: 18, height: 18, color: 'var(--color-accent)' }} />
                <span>Bekräfta åtgärd</span>
              </h2>
            </div>
            <div className="modal-body" style={{ padding: '0 0 20px 0' }}>
              <p style={{ fontSize: '0.95rem', color: 'var(--text-primary)', lineHeight: 1.5, margin: 0 }}>
                {confirmState.message}
              </p>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', borderTop: '1px solid var(--border-light)', paddingTop: 15 }}>
              <button
                type="button"
                onClick={() => {
                  confirmState.resolve(false);
                  setConfirmState(null);
                }}
                className="btn btn-ghost btn-sm"
                style={{ padding: '8px 16px' }}
              >
                Avbryt
              </button>
              <button
                type="button"
                onClick={() => {
                  confirmState.resolve(true);
                  setConfirmState(null);
                }}
                className="btn btn-primary btn-sm"
                style={{ padding: '8px 20px', background: 'var(--color-accent)', borderColor: 'var(--color-accent)' }}
              >
                Bekräfta
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
