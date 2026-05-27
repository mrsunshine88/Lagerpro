import os

app_path = "frontend/src/App.tsx"
with open(app_path, "r", encoding="utf-8") as f:
    code = f.read()

# 1. Update NAVIGATION TAB state and add toasts / confirm modal state
target_nav = """  // --- NAVIGATION TAB ---
  const [activeTab, setActiveTab] = useState<'hub' | 'pos' | 'inventory' | 'bookings' | 'analytics'>('hub');"""

replacement_nav = """  // --- NAVIGATION TAB ---
  const [activeTab, setActiveTab] = useState<'hub' | 'pos' | 'inventory' | 'bookings' | 'analytics' | 'admin'>('hub');
  const [adminActiveTab, setAdminActiveTab] = useState<'users' | 'projects' | 'discount_codes' | 'swish' | 'paypal' | 'simulation'>('users');
  const [confirmState, setConfirmState] = useState<{ message: string; resolve: (val: boolean) => void } | null>(null);
  const [toasts, setToasts] = useState<{ id: number; message: string; type: 'success' | 'error' | 'info' }[]>([]);

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
      if (lower.includes('lyckades') || lower.includes('klar') || lower.includes('sparade') || lower.includes('skapad') || lower.includes('tack för')) {
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
  }, []);"""

if target_nav in code:
    code = code.replace(target_nav, replacement_nav)
    print("Replaced NAVIGATION TAB declaration successfully")
else:
    print("WARNING: NAVIGATION TAB declaration NOT found!")

# 2. Update PayPal target project default to 'Allmänt'
code = code.replace(
    "const [targetSyncProject, setTargetSyncProject] = useState('Skor');",
    "const [targetSyncProject, setTargetSyncProject] = useState('Allmänt');"
)

# 3. Update investment / discount / shipping / discount percent states to support empty string ''
code = code.replace(
    "const [settingInvestment, setSettingInvestment] = useState(0);",
    "const [settingInvestment, setSettingInvestment] = useState<number | ''>(0);"
)
code = code.replace(
    "const [settingDiscount, setSettingDiscount] = useState(0);",
    "const [settingDiscount, setSettingDiscount] = useState<number | ''>(0);"
)
code = code.replace(
    "const [settingShippingCost, setSettingShippingCost] = useState(0);",
    "const [settingShippingCost, setSettingShippingCost] = useState<number | ''>(0);"
)
code = code.replace(
    "const [newDiscountPercent, setNewDiscountPercent] = useState(0);",
    "const [newDiscountPercent, setNewDiscountPercent] = useState<number | ''>(0);"
)

# 4. Replace handleUpdateSettings
target_handler = """  // Set Project investments & settings
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
  };"""

replacement_handler = """  // Set Project investments & settings
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
          shipping_cost: settingShippingCost === '' ? 0 : settingShippingCost
        },
        getAxiosConfig()
      );

      // Force refresh of public configurations map
      const configs = { ...projectConfigs };
      configs[selectedSettingProject] = {
        checkout_mode: settingCheckoutMode,
        delivery_method: settingDeliveryMethod,
        shipping_cost: settingShippingCost === '' ? 0 : settingShippingCost
      };
      setProjectConfigs(configs);

      fetchAnalytics();
      alert('Inställningar sparade!');
    } catch (e) {
      alert('Kunde inte spara inställningar.');
    }
  };"""

if target_handler in code:
    code = code.replace(target_handler, replacement_handler)
    print("Replaced handleUpdateSettings successfully")
else:
    # Try finding it with slightly different spacing
    code = code.replace(target_handler.replace("\n", "\r\n"), replacement_handler)
    print("Applied handleUpdateSettings replace with Windows CRLF conversion check")

# 5. Replace handleSaveDiscountCode
target_discount_save = """      if (editingDiscountId) {
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
        );"""

replacement_discount_save = """      if (editingDiscountId) {
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
        );"""

code = code.replace(target_discount_save, replacement_discount_save)
code = code.replace(target_discount_save.replace("\n", "\r\n"), replacement_discount_save)

with open(app_path, "w", encoding="utf-8") as f:
    f.write(code)
print("Basic refactoring in App.tsx states and handlers completed.")
