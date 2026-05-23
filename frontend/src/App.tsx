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

// --- TYPINGS ---
interface Variant {
  id: number;
  sku: string;
  stock: number;
  size: string;
  color: string;
  purchase_price: number;
  selling_price: number;
  original_price: number;
}

interface Product {
  id: number;
  name: string;
  category: string;
  description?: string;
  variants: Variant[];
  createdAt?: string;
}

interface Booking {
  id: number;
  customer_first_name: string;
  customer_last_name: string;
  customer_phone: string;
  status: 'pending' | 'reserved' | 'confirmed' | 'cancelled';
  created_at: string;
  size: string;
  color: string;
  sku: string;
  selling_price: number;
  purchase_price: number;
  product_name: string;
  product_category: string;
  discount_code?: string;
  discount_percent?: number;
  original_selling_price?: number;
  message?: string;
  payment_status?: string;
  delivery_method?: string;
  shipping_address?: string;
  shipping_cost?: number;
}

interface CartItem {
  product: Product;
  variant: Variant;
  quantity: number;
  selling_price?: number;
}

interface UserProfile {
  id: number;
  email: string;
  role: 'admin' | 'user';
  allowed_projects: string;
}

interface ProjectSummary {
  name: string;
  stock_count: number;
  stock_cost: number;
  potential_sales: number;
  total_investment: number;
  total_revenue: number;
  net_profit: number;
  be_percentage: number;
  cost_per_shoe: number;
}

interface AnalyticsData {
  is_lump_sum: boolean;
  stock_metrics: {
    total_cost: number;
    potential_sales: number;
    potential_profit: number;
  };
  break_even: {
    total_investment: number;
    total_revenue: number;
    net_profit: number;
  };
  financials: Record<string, {
    revenue: number;
    cost: number;
    profit: number;
    margin: number;
  }>;
  recent_sales: any[];
  project_summaries: ProjectSummary[];
}

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

  // --- FILTERS & SEARCH STATE ---
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [hideOutOfStock, setHideOutOfStock] = useState(true);

  // PUBLIC BOOKING FILTERS
  const [publicSearch, setPublicSearch] = useState('');
  const [publicCategory, setPublicCategory] = useState('all');
  const [publicSize, setPublicSize] = useState('all');
  const [publicMaxPrice, setPublicMaxPrice] = useState('');

  // --- POS CART ---
  const [cart, setCart] = useState<CartItem[]>([]);
  const [posSearch, setPosSearch] = useState('');
  const [posCategory, setPosCategory] = useState('all');
  const [posDiscount, setPosDiscount] = useState(0);

  // --- MODALS / DIALOGS ---
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');

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

  // QR Modal
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [qrVariant, setQrVariant] = useState<Variant | null>(null);

  // Scanner Simulator Modal
  const [scanModalOpen, setScanModalOpen] = useState(false);
  const [scanSkuInput, setScanSkuInput] = useState('');
  const [scanMessage, setScanMessage] = useState('');

  // Public Booking Modal
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [selectedBookingVariant, setSelectedBookingVariant] = useState<any | null>(null);
  if (false) { setSelectedBookingVariant(null); }
  const [bookingFirstName, setBookingFirstName] = useState('');
  const [bookingLastName, setBookingLastName] = useState('');
  const [bookingPhone, setBookingPhone] = useState('');
  const [bookingDiscountCode, setBookingDiscountCode] = useState('');
  const [bookingMessage, setBookingMessage] = useState('');
  const [bookingDiscountPercent, setBookingDiscountPercent] = useState(0);
  const [bookingDiscountValid, setBookingDiscountValid] = useState(false);
  const [bookingDiscountError, setBookingDiscountError] = useState('');
  const [bookingSuccessModalOpen, setBookingSuccessModalOpen] = useState(false);

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
  const [posShowCartMobile, setPosShowCartMobile] = useState(false);

  // Swish Global settings
  const [swishMerchantId, setSwishMerchantId] = useState('');
  const [swishCert, setSwishCert] = useState('');
  const [swishKey, setSwishKey] = useState('');
  const [swishHasCert, setSwishHasCert] = useState(false);
  const [swishHasKey, setSwishHasKey] = useState(false);

  // Project e-commerce configs in settings modal
  const [settingCheckoutMode, setSettingCheckoutMode] = useState('booking');
  const [settingDeliveryMethod, setSettingDeliveryMethod] = useState('pickup');
  const [settingShippingCost, setSettingShippingCost] = useState(0);

  // Public Shopping Cart states
  const [publicCart, setPublicCart] = useState<any[]>([]);
  const [cartModalOpen, setCartModalOpen] = useState(false);
  const [cartDiscountCode, setCartDiscountCode] = useState('');
  const [cartDiscountPercent, setCartDiscountPercent] = useState(0);
  const [cartDiscountValid, setCartDiscountValid] = useState(false);
  const [cartDiscountError, setCartDiscountError] = useState('');
  const [cartDiscountFreeShipping, setCartDiscountFreeShipping] = useState(false);
  const [purchasedItems, setPurchasedItems] = useState<any[]>([]);
  
  // Checkout & Payment states
  const [checkoutFirstName, setCheckoutFirstName] = useState('');
  const [checkoutLastName, setCheckoutLastName] = useState('');
  const [checkoutPhone, setCheckoutPhone] = useState('');
  const [checkoutDeliveryMethod, setCheckoutDeliveryMethod] = useState('pickup');
  const [checkoutShippingAddress, setCheckoutShippingAddress] = useState('');
  const [checkoutMessage, setCheckoutMessage] = useState('');
  
  // Payment status
  const [paymentStep, setPaymentStep] = useState<'idle' | 'swish_waiting' | 'swish_success' | 'swish_failed' | 'booking_success'>('idle');
  const [activePaymentId, setActivePaymentId] = useState('');
  const [activePaymentIsMock, setActivePaymentIsMock] = useState(false);
  const [createdBookingIds, setCreatedBookingIds] = useState<number[]>([]);

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

  // Manage POS tab body class for mobile styling
  useEffect(() => {
    if (activeTab === 'pos') {
      document.body.classList.add('pos-tab-active');
    } else {
      document.body.classList.remove('pos-tab-active');
      setPosShowCartMobile(false);
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

  const addToPublicCart = (prodName: string, prodCat: string, variant: any) => {
    const exists = publicCart.find(item => item.variant.id === variant.id);
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

    setPublicCart([...publicCart, {
      variant,
      product_name: prodName,
      product_category: prodCat,
      quantity: 1
    }]);
    
    alert(`Lade till "${prodName} - Storlek ${variant.size}" i varukorgen!`);
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
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    try {
      const res = await axios.post(`${API_BASE_URL}/api/login`, {
        email: loginEmail,
        password: loginPassword
      });
      if (res.data.success && res.data.access_token) {
        localStorage.setItem('token', res.data.access_token);
        setToken(res.data.access_token);
        setLoginModalOpen(false);
        setLoginEmail('');
        setLoginPassword('');
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
  const handleConfirmBooking = async (id: number) => {
    try {
      await axios.post(`${API_BASE_URL}/api/bookings/${id}/confirm`, {}, getAxiosConfig());
      fetchBookings();
      if (userProfile?.role === 'admin') fetchAnalytics();
    } catch (e) {
      alert('Kunde inte bekräfta bokningen');
    }
  };

  const handleReserveBooking = async (id: number) => {
    try {
      await axios.post(`${API_BASE_URL}/api/bookings/${id}/reserve`, {}, getAxiosConfig());
      fetchBookings();
    } catch (e) {
      alert('Kunde inte markera som reserverad');
    }
  };

  const handleCancelBooking = async (id: number) => {
    try {
      await axios.post(`${API_BASE_URL}/api/bookings/${id}/cancel`, {}, getAxiosConfig());
      fetchBookings();
      fetchProducts();
      if (userProfile?.role === 'admin') fetchAnalytics();
    } catch (e) {
      alert('Kunde inte avbryta bokningen');
    }
  };

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
        await axios.put(`${API_BASE_URL}/api/products/${editingProduct.id}`, payload, getAxiosConfig());
      } else {
        await axios.post(`${API_BASE_URL}/api/products`, payload, getAxiosConfig());
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
      const res = await axios.post(`${API_BASE_URL}/api/import-excel`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`
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

  const handleConfirmExcelImport = async () => {
    if (excelProposals.length === 0) return;
    try {
      await axios.post(
        `${API_BASE_URL}/api/confirm-import`,
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

  // Scanner Simulator Barcode Scan
  const handleBarcodeScan = async (e: React.FormEvent) => {
    e.preventDefault();
    setScanMessage('');
    if (!scanSkuInput.trim()) return;

    try {
      const res = await axios.post(`${API_BASE_URL}/api/scan`, { sku: scanSkuInput.trim() }, getAxiosConfig());
      if (res.data.success && res.data.found) {
        const found = res.data.variant;
        // Search product
        const prod = products.find((p) => p.id === found.product_id);
        if (prod) {
          addToCart(prod, found);
          setScanMessage(`Hittade: ${found.product_name} - ${found.size} (${found.color}) och lade till i kassan!`);
          setScanSkuInput('');
        }
      } else {
        setScanMessage(res.data.message || 'Koden hittades inte.');
      }
    } catch (e) {
      setScanMessage('Koppling till skanner misslyckades.');
    }
  };

  // Booking Discount Realtime check
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
        `${API_BASE_URL}/api/public/discount-codes/validate?code=${encodeURIComponent(code)}&category=${encodeURIComponent(category)}`
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

  // Cart Discount Realtime check
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
        `${API_BASE_URL}/api/public/discount-codes/validate?code=${encodeURIComponent(code)}&category=${encodeURIComponent(category)}`
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

  // Cart Batch Checkout / Swish Payment
  const handleCheckoutCart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (publicCart.length === 0) return;

    // Retrieve the configuration of the first item (all items share same mode since mixing is prevented!)
    const cat = publicCart[0].product_category;
    const config = projectConfigs[cat] || { checkout_mode: 'booking', delivery_method: 'pickup', shipping_cost: 0 };
    
    const isEcom = config.checkout_mode === 'ecommerce';
    const isShipping = isEcom && checkoutDeliveryMethod === 'shipping';
    const shippingCost = isShipping ? (cartDiscountValid && cartDiscountFreeShipping ? 0 : (config.shipping_cost || 0)) : 0;

    try {
      // 1. Create bookings in a batch
      const res = await axios.post(`${API_BASE_URL}/api/public/bookings/batch`, {
        items: publicCart.map(item => ({ variant_id: item.variant.id })),
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

        // 2. If it's a pure booking, complete immediately!
        if (!isEcom) {
          setPublicCart([]);
          fetchPublicProducts();
          setPaymentStep('booking_success');
        } else {
          // 3. E-commerce: Initiate Swish Payment
          setPaymentStep('swish_waiting');
          try {
            const payRes = await axios.post(`${API_BASE_URL}/api/public/payments/swish/initiate`, {
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

  const simulateSwishCompletion = async () => {
    if (!activePaymentId) return;
    try {
      const res = await axios.post(`${API_BASE_URL}/api/public/payments/swish/simulate-mock`, {
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

  // Swish Polling effect
  useEffect(() => {
    if (paymentStep !== 'swish_waiting' || createdBookingIds.length === 0) return;
    
    let timer: any;
    const checkStatus = async () => {
      try {
        const res = await axios.get(
          `${API_BASE_URL}/api/public/bookings/payment-status?ids=${createdBookingIds.join(',')}`
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
  }, [paymentStep, createdBookingIds]);

  // Public Booking Submit
  const handlePublicBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBookingVariant) return;

    try {
      const res = await axios.post(`${API_BASE_URL}/api/public/bookings`, {
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

  // Filtered POS Products
  const filteredPosProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(posSearch.toLowerCase()) ||
      p.category.toLowerCase().includes(posSearch.toLowerCase());

    const matchesCategory = posCategory === 'all' || p.category === posCategory;

    return matchesSearch && matchesCategory;
  });

  // Unique categories for selectors
  const categoriesList = Array.from(new Set(products.map((p) => p.category)));
  const publicCategoriesList = Array.from(new Set(publicProducts.map((p) => p.category)));
  const publicSizesList = Array.from(
    new Set(publicProducts.flatMap((p) => p.variants.map((v: any) => v.size)).filter(Boolean))
  );

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
      }
    }
  }, [selectedSettingProject, settingsModalOpen, userProfile]);

  // Main UI render
  return (
    <div className="dark-theme">
      {/* --- IF PUBLIC CATALOG USER --- */}
      {!token ? (
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
                  <div key={p.id} className="glass-card product-card">
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
                               <button onClick={() => addToPublicCart(p.name, p.category, v)} className="btn btn-primary btn-xs">
                                {projectConfigs[p.category]?.checkout_mode === 'ecommerce' ? 'Köp' : 'Boka'}
                               </button>
                            </div>
                          </div>
                        ))}
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
        </div>
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
              <div className="tab-pane">
                <div className={`pos-wrapper ${posShowCartMobile ? 'show-cart' : ''}`} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20 }}>
                  <div className="pos-products-panel glass-card" style={{ padding: 20 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
                      <h2 style={{ margin: 0, fontSize: '1.3rem' }}>Kassa &amp; Snabbköp</h2>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <button onClick={() => setScanModalOpen(true)} className="btn btn-accent btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <ScanLine style={{ width: 14, height: 14 }} />
                          <span>Skanna</span>
                        </button>
                        <select value={posCategory} onChange={(e) => setPosCategory(e.target.value)} className="custom-select" style={{ minWidth: 150, padding: '6px 12px', fontSize: '0.8rem' }}>
                          <option value="all">Alla kategorier</option>
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
                        <div key={p.id} className="pos-product-card glass-panel" style={{ padding: 12 }}>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>{p.category}</span>
                          <strong style={{ display: 'block', fontSize: '0.9rem', marginBottom: 8, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</strong>
                          
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            {p.variants.map((v) => (
                              <button
                                key={v.id}
                                disabled={v.stock <= 0}
                                onClick={() => addToCart(p, v)}
                                className={`pos-variant-btn ${v.stock <= 0 ? 'disabled' : ''}`}
                                style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 6px', fontSize: '0.75rem', borderRadius: 4, cursor: v.stock > 0 ? 'pointer' : 'default', border: '1px solid var(--border-light)', background: 'rgba(255,255,255,0.01)' }}
                              >
                                <span>Storlek: {v.size} {v.color ? `(${v.color})` : ''}</span>
                                <strong>{v.selling_price} kr ({v.stock} st)</strong>
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pos-cart-panel glass-card" style={{ padding: 20, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: 'fit-content' }}>
                    <div>
                      <button
                        onClick={() => setPosShowCartMobile(false)}
                        className="pos-mobile-back-btn"
                        style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}
                      >
                        <ArrowRight style={{ width: 14, height: 14, transform: 'rotate(180deg)' }} />
                        <span>Tillbaka till produkter</span>
                      </button>
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
                      <button onClick={handlePOSCheckout} disabled={cart.length === 0} className="btn btn-primary btn-full btn-lg" style={{ padding: 14, fontWeight: 700 }}>
                        <CheckCircle2 style={{ width: 16, height: 16 }} />
                        <span>Slutför &amp; Registrera Köp</span>
                      </button>
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
              </div>
            )}

            {/* --- TAB: INVENTORY --- */}
            {activeTab === 'inventory' && (
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
                      <p>{analytics?.break_even?.total_revenue ? 'Se Ekonomi' : 'Aktiva'}</p>
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

                      <button onClick={() => setScanModalOpen(true)} className="btn btn-accent" style={{ display: 'flex', alignItems: 'center', gap: 6, height: 42 }}>
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
                      <div key={p.id} className="glass-card product-card">
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
                                    await axios.delete(`${API_BASE_URL}/api/products/${p.id}`, getAxiosConfig());
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
                                    <button onClick={async () => { await axios.post(`${API_BASE_URL}/api/variants/${v.id}/stock`, { change: -1 }, getAxiosConfig()); fetchProducts(); }} className="btn btn-ghost btn-xs" style={{ minWidth: 20, padding: 2 }}>-</button>
                                    <strong style={{ minWidth: 30, textAlign: 'center', fontSize: '0.85rem' }}>{v.stock} st</strong>
                                    <button onClick={async () => { await axios.post(`${API_BASE_URL}/api/variants/${v.id}/stock`, { change: 1 }, getAxiosConfig()); fetchProducts(); }} className="btn btn-ghost btn-xs" style={{ minWidth: 20, padding: 2 }}>+</button>
                                  </div>
                                  <span style={{ fontWeight: 700, color: 'var(--color-success)', fontSize: '0.85rem' }}>{v.selling_price} kr</span>
                                  <button onClick={() => { setQrVariant(v); setQrModalOpen(true); }} className="btn btn-ghost btn-icon btn-xs" title="Visa QR"><Eye style={{ width: 14, height: 14 }} /></button>
                                </div>
                              </div>
                            ))}
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
              </div>
            )}

            {/* --- TAB: BOOKINGS --- */}
            {activeTab === 'bookings' && (
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
            )}

            {/* --- TAB: ANALYTICS (ADMIN ONLY) --- */}
            {activeTab === 'analytics' && userProfile?.role === 'admin' && analytics && (
              <div className="tab-pane">
                <section className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
                  <h2>Ekonomisk Uppföljning &amp; Statistik</h2>
                  <button onClick={fetchAnalytics} className="btn btn-secondary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <RefreshCw style={{ width: 14, height: 14 }} />
                    <span>Uppdatera rapport</span>
                  </button>
                </section>

                <section className="stats-grid">
                  <div className="stat-card glass-card">
                    <div className="stat-icon purple-gradient">
                      <Wallet />
                    </div>
                    <div className="stat-info">
                      <h3>Bundet Kapital (Lagerkostnad)</h3>
                      <p>{analytics.stock_metrics.total_cost.toLocaleString('sv-SE')} kr</p>
                      <span>Baserat på genomsnittliga inköpspriser</span>
                    </div>
                  </div>
                  <div className="stat-card glass-card">
                    <div className="stat-icon pink-gradient">
                      <PiggyBank />
                    </div>
                    <div className="stat-info">
                      <h3>Lager Försäljningsvärde</h3>
                      <p>{analytics.stock_metrics.potential_sales.toLocaleString('sv-SE')} kr</p>
                      <span>Vid 100% försäljning</span>
                    </div>
                  </div>
                  <div className="stat-card glass-card">
                    <div className="stat-icon green-gradient">
                      <Sparkles />
                    </div>
                    <div className="stat-info">
                      <h3>Potentiell Bruttovinst</h3>
                      <p>{analytics.stock_metrics.potential_profit.toLocaleString('sv-SE')} kr</p>
                      <span>Lagersaldo vinstpotential</span>
                    </div>
                  </div>
                </section>

                <section className="break-even-section glass-card" style={{ padding: 25, marginBottom: 30 }}>
                  <div className="be-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
                    <div className="be-header-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Gauge style={{ color: 'var(--color-accent)', width: 24, height: 24 }} />
                      <h3 style={{ margin: 0 }}>Nollpunktsanalys (Hela verksamheten)</h3>
                    </div>
                    <span className="badge" style={{ background: analytics.break_even.net_profit >= 0 ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)', color: analytics.break_even.net_profit >= 0 ? 'var(--color-success)' : '#f59e0b' }}>
                      {analytics.break_even.net_profit >= 0 ? 'Break-Even Nått!' : 'Investeringsfas'}
                    </span>
                  </div>
                  
                  <div className="be-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20, marginBottom: 20 }}>
                    <div className="be-stat">
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Totala Paketinköp (Investerat)</span>
                      <strong style={{ display: 'block', fontSize: '1.5rem', marginTop: 4 }}>{analytics.break_even.total_investment.toLocaleString('sv-SE')} kr</strong>
                    </div>
                    <div className="be-stat">
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Ackumulerad Försäljning</span>
                      <strong style={{ display: 'block', fontSize: '1.5rem', marginTop: 4 }}>{analytics.break_even.total_revenue.toLocaleString('sv-SE')} kr</strong>
                    </div>
                    <div className="be-stat highlight" style={{ background: 'rgba(255,255,255,0.02)', padding: 12, borderRadius: 6 }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Faktisk Nettovinst (Kassaflöde)</span>
                      <strong style={{ display: 'block', fontSize: '1.5rem', color: analytics.break_even.net_profit >= 0 ? 'var(--color-success)' : 'white', marginTop: 4 }}>{analytics.break_even.net_profit.toLocaleString('sv-SE')} kr</strong>
                    </div>
                  </div>

                  <div className="be-progress-wrapper">
                    <div className="be-progress-labels" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 6 }}>
                      <span>Start (0%)</span>
                      <span style={{ fontWeight: 600, color: 'var(--color-primary)' }}>
                        {analytics.break_even.total_investment > 0
                          ? Math.round((analytics.break_even.total_revenue / analytics.break_even.total_investment) * 100)
                          : 0}%
                      </span>
                      <span>Break-Even (100%+)</span>
                    </div>
                    <div className="be-progress-track" style={{ width: '100%', height: 10, background: 'rgba(255,255,255,0.05)', borderRadius: 5, overflow: 'hidden', marginBottom: 10 }}>
                      <div
                        className="be-progress-fill"
                        style={{
                          height: '100%',
                          background: 'var(--color-primary)',
                          width: `${Math.min(
                            100,
                            analytics.break_even.total_investment > 0
                              ? (analytics.break_even.total_revenue / analytics.break_even.total_investment) * 100
                              : 0
                          )}%`
                        }}
                      ></div>
                    </div>
                    {analytics.break_even.net_profit < 0 ? (
                      <p style={{ margin: 0, fontSize: '0.85rem', color: '#fbbf24' }}>
                        Sälj för ytterligare <strong>{(-analytics.break_even.net_profit).toLocaleString('sv-SE')} kr</strong> för att nå break-even.
                      </p>
                    ) : (
                      <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--color-success)' }}>
                        Du har passerat break-even-gränsen med <strong>{analytics.break_even.net_profit.toLocaleString('sv-SE')} kr</strong> i ren nettovinst!
                      </p>
                    )}
                  </div>
                </section>

                <section className="projects-portfolio-section">
                  <div className="section-header" style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 15 }}>
                    <FolderKanban style={{ color: 'var(--color-accent)' }} />
                    <h3 style={{ margin: 0 }}>Aktiv Projektportfölj (Individuella partier)</h3>
                  </div>
                  
                  <div className="projects-portfolio-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 20, marginBottom: 30 }}>
                    {analytics.project_summaries.map((p) => (
                      <div key={p.name} className="glass-card project-card" style={{ padding: 15 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                          <h4 style={{ margin: 0, fontSize: '1.1rem' }}>{p.name}</h4>
                          <span className="badge" style={{ fontSize: '0.75rem' }}>{Math.round(p.be_percentage)}% BE</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: '0.85rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>Lager saldo:</span>
                            <strong>{p.stock_count} st</strong>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>Kostnad i lager:</span>
                            <span className="val-muted">{p.stock_cost.toLocaleString('sv-SE')} kr</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>Total investering:</span>
                            <span>{p.total_investment.toLocaleString('sv-SE')} kr</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>Ackumulerade intäkter:</span>
                            <span style={{ color: 'var(--color-success)', fontWeight: 600 }}>{p.total_revenue.toLocaleString('sv-SE')} kr</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-light)', paddingTop: 6, marginTop: 4 }}>
                            <span>Kassaflöde netto:</span>
                            <strong style={{ color: p.net_profit >= 0 ? 'var(--color-success)' : '#f59e0b' }}>{p.net_profit.toLocaleString('sv-SE')} kr</strong>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
                            <span>Beräknad sko-kostnad:</span>
                            <span>{p.cost_per_shoe.toFixed(2)} kr/st</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
                
                <section className="recent-sales-history">
                  <h3 style={{ marginBottom: 12 }}>Senaste registrerade försäljningar</h3>
                  <div className="glass-card" style={{ padding: 0 }}>
                    <table className="custom-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border-light)' }}>
                          <th style={{ padding: '10px 15px' }}>Produkt</th>
                          <th style={{ padding: '10px 15px' }}>Storlek/Färg</th>
                          <th style={{ padding: '10px 15px' }}>Kategori</th>
                          <th style={{ padding: '10px 15px' }}>Antal</th>
                          <th style={{ padding: '10px 15px' }}>Pris st</th>
                          <th style={{ padding: '10px 15px' }}>Snittkostnad st</th>
                          <th style={{ padding: '10px 15px' }}>Vinst st</th>
                          <th style={{ padding: '10px 15px' }}>Datum</th>
                        </tr>
                      </thead>
                      <tbody>
                        {analytics.recent_sales.map((s, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid var(--border-light)' }}>
                            <td style={{ padding: '10px 15px' }}><strong>{s.model_name}</strong></td>
                            <td style={{ padding: '10px 15px' }}>St: {s.size} ({s.color || 'Uni'})</td>
                            <td style={{ padding: '10px 15px' }}><span className="category-tag">{s.category}</span></td>
                            <td style={{ padding: '10px 15px' }}>{s.quantity} st</td>
                            <td style={{ padding: '10px 15px' }}><strong style={{ color: 'var(--color-success)' }}>{s.selling_price} kr</strong></td>
                            <td style={{ padding: '10px 15px' }}>{s.purchase_price ? `${s.purchase_price.toFixed(1)} kr` : '0 kr'}</td>
                            <td style={{ padding: '10px 15px' }}><strong style={{ color: s.selling_price - s.purchase_price >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>{(s.selling_price - s.purchase_price).toFixed(1)} kr</strong></td>
                            <td style={{ padding: '10px 15px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{new Date(s.created_at).toLocaleString('sv-SE')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              </div>
            )}
          </main>
        </div>
      )}

      {/* ==================== LOGIN MODAL ==================== */}
      {loginModalOpen && (
        <div className="modal-overlay">
          <div className="modal-card glass-modal modal-sm" style={{ maxWidth: 400, padding: 20 }}>
            <div className="modal-header" style={{ border: 'none', paddingBottom: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="logo" style={{ margin: '0 auto' }}>
                <PackageSearch className="logo-icon" />
                <h1>LAGER<span>PRO</span></h1>
              </div>
              <button className="btn-close modal-close-btn" onClick={() => setLoginModalOpen(false)}><X /></button>
            </div>
            <div className="modal-body" style={{ paddingTop: 10 }}>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textAlign: 'center', marginBottom: 20 }}>Detta gränssnitt är för butikspersonal. Logga in för att hantera lager, kassa och bokningar.</p>
              <form onSubmit={handleLogin}>
                <div className="input-container" style={{ marginBottom: 12 }}>
                  <label>E-postadresse</label>
                  <div className="input-group" style={{ position: 'relative' }}>
                    <Mail style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', width: 16, height: 16, color: 'var(--text-muted)' }} />
                    <input type="email" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} placeholder="Din e-postadress..." required style={{ width: '100%', padding: '10px 12px 10px 36px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-light)', color: 'white', borderRadius: 'var(--radius-sm)' }} />
                  </div>
                </div>
                <div className="input-container" style={{ marginBottom: 20 }}>
                  <label>Lösenord</label>
                  <div className="input-group" style={{ position: 'relative' }}>
                    <Lock style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', width: 16, height: 16, color: 'var(--text-muted)' }} />
                    <input type="password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} placeholder="Ange lösenord..." required style={{ width: '100%', padding: '10px 12px 10px 36px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-light)', color: 'white', borderRadius: 'var(--radius-sm)' }} />
                  </div>
                </div>
                <button type="submit" className="btn btn-primary btn-full" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <span>Logga in</span>
                  <ArrowRight style={{ width: 16, height: 16 }} />
                </button>
                {loginError && <p style={{ marginTop: 15, textAlign: 'center', color: 'var(--color-danger)', fontSize: '0.85rem' }}>{loginError}</p>}
              </form>
            </div>
          </div>
        </div>
      )}

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
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15, marginBottom: 12 }}>
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
                      <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1fr 2fr 2fr 40px', gap: 8, alignItems: 'center' }}>
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

      {/* ==================== QR CODE MODAL ==================== */}
      {qrModalOpen && qrVariant && (
        <div className="modal-overlay">
          <div className="modal-card glass-modal modal-xs text-center" style={{ maxWidth: 400 }}>
            <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2>QR-kod för variant</h2>
              <button className="btn-close" onClick={() => setQrModalOpen(false)}><X /></button>
            </div>
            <div className="modal-body" style={{ padding: 20 }}>
              <strong style={{ fontSize: '1.05rem', display: 'block', marginBottom: 5 }}>SKU: {qrVariant.sku}</strong>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'block', marginBottom: 15 }}>Storlek: {qrVariant.size} | Färg: {qrVariant.color}</span>
              
              <div style={{ background: 'white', padding: 15, borderRadius: 8, display: 'inline-block', marginBottom: 15 }}>
                <img src={`${API_BASE_URL}/api/generate-qr/${qrVariant.id}`} alt={`QR for ${qrVariant.sku}`} style={{ width: 200, height: 200 }} />
              </div>
              
              <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Skanna QR-koden med en mobiltelefon eller surfplatta för att öppna produkten i butiken.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ==================== SETTINGS MODAL ==================== */}
      {settingsModalOpen && (
        <div className="modal-overlay">
          <div className="modal-card glass-modal modal-md" style={{ maxWidth: 550 }}>
            <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2>Lagerinställningar</h2>
              <button className="btn-close" onClick={() => setSettingsModalOpen(false)}><X /></button>
            </div>
            <div className="modal-body" style={{ maxHeight: '75vh', overflowY: 'auto' }}>
              
              <div style={{ borderBottom: '1px solid var(--border-light)', paddingBottom: 20, marginBottom: 20 }}>
                <h3>Din profil &amp; Lösenord</h3>
                <button onClick={() => { setProfileEmail(userProfile?.email || ''); setProfileModalOpen(true); }} className="btn btn-secondary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <User style={{ width: 14, height: 14 }} />
                  <span>Uppdatera profiluppgifter</span>
                </button>
              </div>

              {userProfile?.role === 'admin' && (
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

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15, marginBottom: 15 }}>
                        <div className="input-container">
                          <label>Investerat kapital (Lump-sum, kr)</label>
                          <input type="number" min="0" value={settingInvestment} onChange={(e) => setSettingInvestment(parseFloat(e.target.value) || 0)} style={{ width: '100%', padding: 10, background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-light)', color: 'white', borderRadius: 4 }} />
                        </div>
                        <div className="input-container">
                          <label>Standardrabatt (%)</label>
                          <input type="number" min="0" max="100" value={settingDiscount} onChange={(e) => setSettingDiscount(parseFloat(e.target.value) || 0)} style={{ width: '100%', padding: 10, background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-light)', color: 'white', borderRadius: 4 }} />
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15, marginBottom: 15 }}>
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

                  <div style={{ borderBottom: '1px solid var(--border-light)', paddingBottom: 20, marginBottom: 20 }}>
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

                  <div style={{ borderBottom: '1px solid var(--border-light)', paddingBottom: 20, marginBottom: 20 }}>
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

                  <div>
                    <h3>Hantera Rabattkoder</h3>
                    <form onSubmit={handleSaveDiscountCode} style={{ marginBottom: 15, background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-light)', padding: 12, borderRadius: 6 }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.2fr 0.8fr 1.2fr 0.8fr', gap: 10, marginBottom: 12 }}>
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
                  {/* Print-specific style to ensure it looks beautiful and fits on a mobile/paper screen */}
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
                        Ordernummer: {createdBookingIds.map(id => `#${id}`).join(', ')}
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
                      const originalTotal = purchasedItems.reduce((sum, item) => sum + (item.variant.selling_price * item.quantity), 0);
                      const discountAmount = cartDiscountValid ? Math.round(originalTotal * (cartDiscountPercent / 100)) : 0;
                      
                      const firstItem = purchasedItems[0] || {};
                      const cat = firstItem.product_category;
                      const config = projectConfigs[cat] || { shipping_cost: 0 };
                      const hasFreeShipping = cartDiscountValid && cartDiscountFreeShipping;
                      const shippingCost = (checkoutDeliveryMethod === 'shipping') ? (hasFreeShipping ? 0 : (config.shipping_cost || 0)) : 0;
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
                        // Clear checkout states
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
                    
                    // Math calculations
                    const originalTotal = publicCart.reduce((sum, item) => sum + (item.variant.selling_price * item.quantity), 0);
                    const discountAmount = cartDiscountValid ? Math.round(originalTotal * (cartDiscountPercent / 100)) : 0;
                    const isFreeShippingApplied = cartDiscountValid && cartDiscountFreeShipping;
                    const shippingCost = (isEcom && hasShipping && checkoutDeliveryMethod === 'shipping') ? (isFreeShippingApplied ? 0 : (config.shipping_cost || 0)) : 0;
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
                                    onClick={() => setPublicCart(publicCart.filter(c => c.variant.id !== item.variant.id))}
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
}
