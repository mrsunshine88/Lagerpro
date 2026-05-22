// ==================== CUSTOM DIALOG HELPERS ====================
function showConfirm({ title = 'Bekräfta åtgärd', msg = '', okLabel = 'Bekräfta', cancelLabel = 'Avbryt', type = 'warning', okBtnClass = 'btn-danger' } = {}) {
    return new Promise(resolve => {
        const overlay    = document.getElementById('custom-confirm-overlay');
        const iconWrap   = document.getElementById('custom-confirm-icon-wrap');
        const iconEl     = document.getElementById('custom-confirm-icon');
        const titleEl    = document.getElementById('custom-confirm-title');
        const msgEl      = document.getElementById('custom-confirm-msg');
        const okBtn      = document.getElementById('custom-confirm-ok-btn');
        const cancelBtn  = document.getElementById('custom-confirm-cancel-btn');
        const okLabelEl  = document.getElementById('custom-confirm-ok-label');
        const canLabelEl = document.getElementById('custom-confirm-cancel-label');
        if (!overlay) { resolve(window.confirm(msg)); return; }
        const iconMap = { warning: 'alert-triangle', danger: 'trash-2', info: 'info', success: 'check-circle-2', neutral: 'log-out' };
        iconWrap.className = 'custom-dialog-icon-wrap icon-' + type;
        iconEl.setAttribute('data-lucide', iconMap[type] || 'alert-triangle');
        titleEl.textContent    = title;
        msgEl.textContent      = msg;
        okLabelEl.textContent  = okLabel;
        canLabelEl.textContent = cancelLabel;
        okBtn.className = 'btn ' + okBtnClass;
        overlay.classList.remove('hide');
        if (typeof lucide !== 'undefined') lucide.createIcons();
        function cleanup(result) {
            overlay.classList.add('hide');
            okBtn.removeEventListener('click', onOk);
            cancelBtn.removeEventListener('click', onCancel);
            resolve(result);
        }
        function onOk()     { cleanup(true);  }
        function onCancel() { cleanup(false); }
        okBtn.addEventListener('click', onOk);
        cancelBtn.addEventListener('click', onCancel);
    });
}

function showAlert({ title, msg = '', type = 'info' } = {}) {
    return new Promise(resolve => {
        const overlay  = document.getElementById('custom-alert-overlay');
        const iconWrap = document.getElementById('custom-alert-icon-wrap');
        const iconEl   = document.getElementById('custom-alert-icon');
        const titleEl  = document.getElementById('custom-alert-title');
        const msgEl    = document.getElementById('custom-alert-msg');
        const okBtn    = document.getElementById('custom-alert-ok-btn');
        if (!overlay) { window.alert(msg); resolve(); return; }
        const iconMap  = { warning: 'alert-triangle', danger: 'alert-circle', info: 'info', success: 'check-circle-2', neutral: 'info' };
        const titleMap = { warning: 'Varning', danger: 'Fel', info: 'Information', success: 'Klart!', neutral: 'Information' };
        iconWrap.className = 'custom-dialog-icon-wrap icon-' + type;
        iconEl.setAttribute('data-lucide', iconMap[type] || 'info');
        titleEl.textContent = title || titleMap[type] || 'Information';
        msgEl.textContent   = msg;
        overlay.classList.remove('hide');
        if (typeof lucide !== 'undefined') lucide.createIcons();
        function onOk() {
            overlay.classList.add('hide');
            okBtn.removeEventListener('click', onOk);
            resolve();
        }
        okBtn.addEventListener('click', onOk);
    });
}

function showToast(msg, type = 'info', duration = 4500) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const iconMap  = { success: 'check-circle-2', error: 'x-circle', warning: 'alert-triangle', info: 'info' };
    const titleMap = { success: 'Klart!', error: 'Fel', warning: 'Varning', info: 'Info' };
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <div class="toast-icon"><i data-lucide="${iconMap[type] || 'info'}"></i></div>
        <div class="toast-body">
            <strong>${titleMap[type] || 'Info'}</strong>
            <span>${msg}</span>
        </div>
        <button class="toast-close" title="Stäng"><i data-lucide="x"></i></button>
        <div class="toast-progress" style="animation-duration:${duration}ms;"></div>
    `;
    container.appendChild(toast);
    if (typeof lucide !== 'undefined') lucide.createIcons();
    function dismiss() {
        toast.classList.add('toast-hiding');
        toast.addEventListener('animationend', () => toast.remove(), { once: true });
    }
    toast.querySelector('.toast-close').addEventListener('click', (e) => { e.stopPropagation(); dismiss(); });
    toast.addEventListener('click', dismiss);
    setTimeout(dismiss, duration);
}

// ==================== STATE MANAGEMENT ====================
let state = {
    products: [],
    categories: new Set(),
    activeFilterCategory: 'all',
    activeSearchQuery: '',
    activeTab: 'hub', // 'hub', 'inventory' or 'analytics'
    html5QrScanner: null,
    hideOutOfStock: true,
    userRole: 'user', // loaded dynamically ('admin' or 'user')
    userEmail: '',
    allowedProjects: 'all',
    barcodeTargetInput: null
};

let posCart = [];
let posSelectedProduct = null;
let posSelectedSize = null;
let posSelectedColor = null;

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', () => {
    initApp();
    initPWA();
});

async function initApp() {
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
    
    detectSystemPaths();
    
    const loginBtn = document.getElementById('login-btn');
    if (loginBtn) {
        initLoginWall();
        initPublicCatalog();
    } else {
        await loadSessionInfo();
        loadInventory();
        setupEventListeners();
        fetchAndRefreshBookingsBadge();
        setInterval(fetchAndRefreshBookingsBadge, 20000);
        // Auto-refresh analytics every 60s when on analytics tab
        setInterval(() => {
            if (state.activeTab === 'analytics' && state.userRole === 'admin') {
                loadAnalytics();
            }
        }, 60000);
    }
}

function detectSystemPaths() {
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.classList.remove('hide');
    }
    
    const localIpEl = document.getElementById('local-ip-address');
    if (localIpEl) {
        localIpEl.textContent = `http://${window.location.host}`;
    }
}

// ==================== LOAD USER SESSION INFO ====================
async function loadSessionInfo() {
    try {
        const response = await fetch('/api/session-info');
        if (response.status === 401) {
            window.location.reload();
            return;
        }
        const data = await response.json();
        state.userRole = data.role;
        state.userEmail = data.email;
        state.allowedProjects = data.allowed_projects;
        
        // Update greeting details in Welcome Hub
        const hubEmailEl = document.getElementById('hub-user-email');
        if (hubEmailEl) hubEmailEl.textContent = data.email;
        
        const roleBadge = document.getElementById('hub-user-role-badge');
        if (roleBadge) {
            roleBadge.textContent = data.role === 'admin' ? 'Administratör' : 'Standard Användare';
            roleBadge.className = data.role === 'admin' ? 'badge stock-ok animate-pulse-accent' : 'badge stock-low';
        }
        
        applyRolePermissions();
        
        // Show proper initial tab
        switchTab('hub');
        
    } catch (e) {
        console.error("Kunde inte läsa sessionsinformation:", e);
    }
}

function applyRolePermissions() {
    if (state.userRole === 'admin') {
        document.querySelectorAll('.admin-only').forEach(el => el.classList.remove('hide'));
    } else {
        document.querySelectorAll('.admin-only').forEach(el => el.classList.add('hide'));
    }
}

// ==================== LOGIN WALL LOGIC ====================
function initLoginWall() {
    const loginBtn = document.getElementById('login-btn');
    const emailInput = document.getElementById('login-email');
    const passwordInput = document.getElementById('login-password');
    const errorEl = document.getElementById('login-error');
    
    const attemptLogin = async () => {
        const email = emailInput ? emailInput.value.trim() : '';
        const password = passwordInput ? passwordInput.value : '';
        
        if (!email || !password) {
            errorEl.textContent = 'Vänligen fyll i både e-post och lösenord.';
            errorEl.classList.remove('hide');
            return;
        }
        
        try {
            const res = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            
            if (res.ok) {
                window.location.reload();
            } else {
                const data = await res.json();
                errorEl.textContent = data.error || 'Felaktig e-post eller lösenord';
                errorEl.classList.remove('hide');
            }
        } catch (e) {
            errorEl.textContent = 'Kunde inte ansluta till servern.';
            errorEl.classList.remove('hide');
        }
    };
    
    if (loginBtn) loginBtn.addEventListener('click', attemptLogin);
    
    const triggerOnEnter = (el) => {
        if (el) {
            el.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') attemptLogin();
            });
        }
    };
    
    triggerOnEnter(emailInput);
    triggerOnEnter(passwordInput);
}

// ==================== LOAD INVENTORY ====================
async function loadInventory() {
    showLoader(true);
    try {
        const response = await fetch('/api/products');
        if (response.status === 401) {
            window.location.reload();
            return;
        }
        
        state.products = await response.json();
        
        state.categories.clear();
        state.products.forEach(p => {
            if (p.category) state.categories.add(p.category.trim());
        });
        
        updateCategoryFilterDropdown();
        updateDashboardStats();
        renderProducts();
        
        if (state.activeTab === 'analytics' && state.userRole === 'admin') {
            loadAnalytics();
        }
        
    } catch (error) {
        console.error("Fel vid laddning av lager:", error);
    } finally {
        showLoader(false);
    }
}

function showLoader(show) {
    const loader = document.getElementById('inventory-loading');
    const grid = document.getElementById('products-grid');
    const empty = document.getElementById('inventory-empty');
    
    if (show) {
        if (loader) loader.classList.remove('hide');
        if (grid) grid.classList.add('hide');
        if (empty) empty.classList.add('hide');
    } else {
        if (loader) loader.classList.add('hide');
    }
}

// ==================== STATS DASHBOARD ====================
async function updateDashboardStats() {
    let totalStock = 0;
    let totalModels = state.products.length;
    
    state.products.forEach(p => {
        p.variants.forEach(v => {
            totalStock += v.stock;
        });
    });
    
    const totalStockEl = document.getElementById('stat-total-stock');
    const totalModelsEl = document.getElementById('stat-total-models');
    const totalSoldEl = document.getElementById('stat-total-sold');
    
    if (totalStockEl) totalStockEl.textContent = totalStock;
    if (totalModelsEl) totalModelsEl.textContent = totalModels;
    
    try {
        const response = await fetch('/api/inventory/sold');
        if (response.ok) {
            const data = await response.json();
            if (totalSoldEl) totalSoldEl.textContent = data.total_sold;
        }
    } catch (e) {
        console.error("Kunde inte hämta sålda par:", e);
    }
}

// ==================== FILTER DROPDOWN ====================
function updateCategoryFilterDropdown() {
    const dropdown = document.getElementById('category-filter');
    const hubDropdown = document.getElementById('hub-project-select');
    if (!dropdown) return;
    const currentValue = dropdown.value;
    const currentHubValue = hubDropdown ? hubDropdown.value : 'all';
    
    // Only show "Alla" option if the user has access to all projects
    const hasFullAccess = state.allowedProjects === 'all' || state.userRole === 'admin';
    
    if (hasFullAccess) {
        dropdown.innerHTML = '<option value="all">Alla produktkategorier (Alla tillåtna projekt)</option>';
        if (hubDropdown) {
            hubDropdown.innerHTML = '<option value="all">Alla projekt / Produktkategorier</option>';
        }
    } else {
        dropdown.innerHTML = '';
        if (hubDropdown) hubDropdown.innerHTML = '';
    }
    
    Array.from(state.categories).sort().forEach(cat => {
        const option = document.createElement('option');
        option.value = cat;
        option.textContent = cat;
        dropdown.appendChild(option);
        
        if (hubDropdown) {
            const hubOption = document.createElement('option');
            hubOption.value = cat;
            hubOption.textContent = cat;
            hubDropdown.appendChild(hubOption);
        }
    });
    
    // Restore previous selection if valid, otherwise pick first available option
    if (currentValue && dropdown.querySelector(`option[value="${currentValue}"]`)) {
        dropdown.value = currentValue;
    } else {
        dropdown.value = dropdown.options[0] ? dropdown.options[0].value : 'all';
    }
    state.activeFilterCategory = dropdown.value;
    
    if (hubDropdown) {
        if (currentHubValue && hubDropdown.querySelector(`option[value="${currentHubValue}"]`)) {
            hubDropdown.value = currentHubValue;
        } else {
            hubDropdown.value = hubDropdown.options[0] ? hubDropdown.options[0].value : 'all';
        }
    }
}

// ==================== RENDER PRODUCTS GRID ====================
function renderProducts() {
    const grid = document.getElementById('products-grid');
    const empty = document.getElementById('inventory-empty');
    if (!grid) return;
    
    grid.innerHTML = '';
    
    const query = state.activeSearchQuery.toLowerCase().trim();
    const catFilter = state.activeFilterCategory;
    
    // Advanced variant and product filtering
    const filtered = [];
    
    state.products.forEach(p => {
        // 1. Filter by category (project) first
        if (catFilter !== 'all' && p.category !== catFilter) return;
        
        // 2. Filter variants inside this product
        const matchingVariants = p.variants.filter(v => {
            // A. Hide out of stock filter
            if (state.hideOutOfStock && v.stock === 0) return false;
            
            // B. Search query filter
            if (query !== '') {
                const terms = query.split(/\s+/).filter(t => t.length > 0);
                
                // All terms must match either the product or the specific variant
                return terms.every(term => {
                    const isSizeTerm = /^\d{2}$/.test(term); // exact 2-digit number like "38"
                    
                    if (isSizeTerm) {
                        return v.size === term;
                    }
                    
                    // General loose substring match for this term
                    const matchModel = p.name.toLowerCase().includes(term);
                    const matchCat = p.category.toLowerCase().includes(term);
                    const matchDesc = p.description && p.description.toLowerCase().includes(term);
                    const matchColor = v.color.toLowerCase().includes(term);
                    const matchSku = v.sku.toLowerCase().includes(term);
                    
                    return matchModel || matchCat || matchDesc || matchColor || matchSku;
                });
            }
            
            return true;
        });
        
        // Only render the card if it has matching variants left
        if (matchingVariants.length > 0) {
            filtered.push({
                ...p,
                variants: matchingVariants
            });
        }
    });
    
    const resCountEl = document.getElementById('results-count');
    if (resCountEl) resCountEl.textContent = `${filtered.length} modeller hittade`;
    
    if (filtered.length === 0) {
        grid.classList.add('hide');
        if (empty) empty.classList.remove('hide');
        return;
    }
    
    if (empty) empty.classList.add('hide');
    grid.classList.remove('hide');
    
    filtered.forEach(p => {
        const card = document.createElement('article');
        card.className = 'product-card glass-card fade-in';
        
        let variantsRowsHtml = '';
        p.variants.forEach(v => {
            let stockClass = 'stock-ok';
            if (v.stock === 0) stockClass = 'stock-empty';
            else if (v.stock === 1) stockClass = 'stock-low';
            
            const hasDiscount = v.original_price && v.original_price > v.selling_price;
            const discountPct = hasDiscount ? Math.round(((v.original_price - v.selling_price) / v.original_price) * 100) : 0;
            
            let priceHtml = '';
            if (hasDiscount) {
                priceHtml = `
                    <div style="display:flex; flex-direction:column; gap:3px; font-size:0.85rem; line-height:1.3;">
                        <span style="color:var(--text-muted); font-size:0.72rem; font-weight:500; text-transform:uppercase; letter-spacing:0.4px;">Ord. nypris:</span>
                        <span style="color:var(--text-secondary); font-size:0.82rem; font-weight:500;">${formatMoney(v.original_price)}</span>
                        <span style="color:var(--text-muted); font-size:0.72rem; font-weight:500; text-transform:uppercase; letter-spacing:0.4px; margin-top:2px;">Vårt pris: <span class="badge" style="background:rgba(239,68,68,0.15); color:#ef4444; font-size:0.65rem; padding:1px 5px; font-weight:700; border:1px solid rgba(239,68,68,0.25);">-${discountPct}%</span></span>
                        <span style="color:#f0fdf4; font-weight:800; font-size:1rem;">${formatMoney(v.selling_price)}</span>
                    </div>
                `;
            } else {
                const displayOriginal = v.original_price && v.original_price > 0 ? v.original_price : v.selling_price;
                priceHtml = `
                    <div style="display:flex; flex-direction:column; gap:3px; font-size:0.85rem; line-height:1.3;">
                        <span style="color:var(--text-muted); font-size:0.72rem; font-weight:500; text-transform:uppercase; letter-spacing:0.4px;">Ord. nypris:</span>
                        <span style="color:var(--text-secondary); font-size:0.82rem;">${formatMoney(displayOriginal)}</span>
                        <span style="color:var(--text-muted); font-size:0.72rem; font-weight:500; text-transform:uppercase; letter-spacing:0.4px; margin-top:2px;">Säljpris:</span>
                        <span style="color:var(--text-primary); font-weight:800; font-size:1rem;">${formatMoney(v.selling_price)}</span>
                    </div>
                `;
            }
            
            let purchasePriceHtml = '';
            if (state.userRole === 'admin' && v.purchase_price > 0) {
                purchasePriceHtml = `<span style="color:var(--text-muted); font-size:0.85rem; font-weight:normal; margin-right:4px;">${formatMoney(v.purchase_price)} / </span>`;
            }
            
            variantsRowsHtml += `
                <tr data-variant-id="${v.id}">
                    <td class="cell-size" style="font-weight:700; color:var(--color-primary);">${v.size}</td>
                    <td>
                        <div class="cell-color">
                            <span class="color-dot" style="background-color: ${getColorHex(v.color)};"></span>
                            <span>${v.color}</span>
                        </div>
                    </td>
                    <td class="col-size-color" style="display:none;">
                        <div class="cell-size-color-combined">
                            <span class="cell-size-combined">${v.size}</span>
                            <div class="cell-color-combined">
                                <span class="color-dot" style="background-color: ${getColorHex(v.color)};"></span>
                                <span>${v.color}</span>
                            </div>
                        </div>
                    </td>
                    <td>
                        <div class="stock-adjust-group">
                            <button class="btn-stock-adj minus-btn" onclick="adjustStock(${v.id}, -1)">-</button>
                            <span class="stock-display" id="stock-val-${v.id}">${v.stock}</span>
                            <button class="btn-stock-adj plus-btn" onclick="adjustStock(${v.id}, 1)">+</button>
                        </div>
                    </td>
                    <td>
                        <span class="stock-badge ${stockClass}" id="stock-badge-${v.id}">
                            ${v.stock === 0 ? 'Slut' : v.stock === 1 ? 'Endast 1 kvar' : 'I lager'}
                        </span>
                    </td>
                    <td style="font-weight:600; color:var(--text-secondary);">
                        <div style="display:flex; align-items:center;">
                            ${purchasePriceHtml}${priceHtml}
                        </div>
                    </td>
                    <td>
                        <span class="cell-sku" onclick="viewQrCode(${v.id}, '${p.name}', '${v.size}', '${v.color}', '${v.sku}')" title="Visa QR-kod">
                            <i data-lucide="qr-code" style="width: 14px; height: 14px;"></i>
                            <span>${v.sku}</span>
                        </span>
                    </td>
                </tr>
            `;
        });
        
        const hasOriginalPrice = p.variants.some(v => v.original_price > 0);
        let priceHeader = 'Säljpris';
        if (state.userRole === 'admin' && p.variants.some(v => v.purchase_price > 0)) {
            priceHeader = 'Inköp / Prisinfo';
        } else if (hasOriginalPrice) {
            priceHeader = 'Prisinfo (Nypris / Sälj)';
        }
        
        card.innerHTML = `
            <div class="product-card-header">
                <div class="prod-title-group">
                    <h3>
                        <span>${p.name}</span>
                        <span class="prod-type-tag">${p.category}</span>
                    </h3>
                    ${p.description ? `<p>${p.description}</p>` : ''}
                </div>
                <div class="prod-card-actions">
                    ${state.userRole === 'admin' || state.userRole === 'user' ? `
                    <button class="btn btn-ghost btn-icon btn-sm" onclick="editProduct(${p.id})" title="Redigera">
                        <i data-lucide="edit-3" style="width: 16px; height: 16px;"></i>
                    </button>
                    ` : ''}
                    ${state.userRole === 'admin' ? `
                    <button class="btn btn-ghost btn-icon btn-sm" onclick="deleteProduct(${p.id})" style="color: var(--color-danger);" title="Ta bort">
                        <i data-lucide="trash-2" style="width: 16px; height: 16px;"></i>
                    </button>
                    ` : ''}
                </div>
            </div>
            <div class="product-card-body">
                <table class="variants-list">
                    <thead>
                        <tr>
                            <th>Storlek</th>
                            <th>Färg</th>
                            <th class="col-size-color" style="display:none;">Storlek / Färg</th>
                            <th>Lagersaldo</th>
                            <th>Status</th>
                            <th>${priceHeader}</th>
                            <th>SKU / Streckkod</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${variantsRowsHtml}
                    </tbody>
                </table>
            </div>
        `;
        
        grid.appendChild(card);
    });
    
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
}

// Simple color helper for hex values of dots
function getColorHex(colorName) {
    const colors = {
        'svart': '#1e293b',
        'vit': '#f8fafc',
        'beige': '#f5f5dc',
        'blå': '#3b82f6',
        'marinblå': '#1e3a8a',
        'marin': '#1e3a8a',
        'röd': '#ef4444',
        'rosa': '#ec4899',
        'olivgrön': '#65a30d',
        'grå': '#64748b',
        'brun': '#78350f',
        'mörkbrun': '#451a03',
        'konjak': '#9a3412',
        'guld': '#eab308'
    };
    return colors[colorName.toLowerCase().trim()] || '#64748b';
}

function formatMoney(amount) {
    return new Intl.NumberFormat('sv-SE', { style: 'currency', currency: 'SEK', maximumFractionDigits: 0 }).format(amount);
}

// ==================== QUICK STOCK ADJUSTMENT ====================
async function adjustStock(variantId, change) {
    const stockValEl = document.getElementById(`stock-val-${variantId}`);
    const badgeEl = document.getElementById(`stock-badge-${variantId}`);
    if (!stockValEl) return;
    
    let currentVal = parseInt(stockValEl.textContent);
    let newVal = Math.max(0, currentVal + change);
    stockValEl.textContent = newVal;
    
    stockValEl.style.transform = 'scale(1.3)';
    stockValEl.style.color = change > 0 ? 'var(--color-success)' : 'var(--color-danger)';
    setTimeout(() => {
        stockValEl.style.transform = 'scale(1)';
        stockValEl.style.color = '';
    }, 200);
    
    badgeEl.className = 'stock-badge';
    if (newVal === 0) {
        badgeEl.textContent = 'Slut';
        badgeEl.classList.add('stock-empty');
    } else if (newVal === 1) {
        badgeEl.textContent = 'Endast 1 kvar';
        badgeEl.classList.add('stock-low');
    } else {
        badgeEl.textContent = 'I lager';
        badgeEl.classList.add('stock-ok');
    }
    
    try {
        const response = await fetch(`/api/variants/${variantId}/stock`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ change })
        });
        
        const data = await response.json();
        if (data.success) {
            stockValEl.textContent = data.new_stock;
            state.products.forEach(p => {
                p.variants.forEach(v => {
                    if (v.id === variantId) v.stock = data.new_stock;
                });
            });
            updateDashboardStats();
            
            if (state.activeTab === 'analytics' && state.userRole === 'admin') {
                loadAnalytics();
            }
        } else {
            loadInventory();
        }
    } catch (e) {
        console.error("Kunde inte justera lager:", e);
        loadInventory();
    }
}

// ==================== LOAD & RENDER FINANCIAL METRICS ====================
async function loadAnalytics() {
    if (state.userRole !== 'admin') return;
    try {
        const response = await fetch('/api/analytics');
        if (response.status === 401) {
            window.location.reload();
            return;
        }
        
        const data = await response.json();
        renderAnalytics(data);
        
    } catch (e) {
        console.error("Fel vid laddning av statistik:", e);
    }
}

function renderAnalytics(data) {
    // 1. Stock Capital Metrics
    document.getElementById('stat-capital-cost').textContent = formatMoney(data.stock_metrics.total_cost);
    document.getElementById('stat-capital-potential').textContent = formatMoney(data.stock_metrics.potential_sales);
    document.getElementById('stat-capital-profit').textContent = formatMoney(data.stock_metrics.potential_profit);
    
    // Update labels dynamically if a package-wide lump sum is used
    const costTitleEl = document.querySelector('#stat-capital-cost').closest('.stat-info').querySelector('h3');
    const profitTitleEl = document.querySelector('#stat-capital-profit').closest('.stat-info').querySelector('h3');
    const costSubEl = document.querySelector('#stat-capital-cost').closest('.stat-info').querySelector('span');
    const profitSubEl = document.querySelector('#stat-capital-profit').closest('.stat-info').querySelector('span');
    
    if (data.is_lump_sum) {
        if (costTitleEl) costTitleEl.textContent = "Total Investering (Klumpsumma)";
        if (costSubEl) costSubEl.textContent = "Hela projektets kostnad";
        if (profitTitleEl) profitTitleEl.textContent = "Potentiell Nettovinst";
        if (profitSubEl) profitSubEl.textContent = "Vinst efter täckt investering";
    } else {
        if (costTitleEl) costTitleEl.textContent = "Bundet Kapital (Lagerkostnad)";
        if (costSubEl) costSubEl.textContent = "Baserat på inköpspriser";
        if (profitTitleEl) profitTitleEl.textContent = "Potentiell Bruttovinst";
        if (profitSubEl) profitSubEl.textContent = "Lagersaldo vinstpotential";
    }
    
    // 2. Break-Even Section
    const be = data.break_even;
    document.getElementById('be-total-investment').textContent = formatMoney(be.total_investment);
    document.getElementById('be-total-revenue').textContent = formatMoney(be.total_revenue);
    
    const netProfitEl = document.getElementById('be-net-profit');
    const netProfitSub = document.getElementById('be-net-profit-sub');
    const statusBadge = document.getElementById('be-status-badge');
    const progressBar = document.getElementById('be-progress-bar');
    const progressPercent = document.getElementById('be-progress-percent');
    const tipText = document.getElementById('be-tip-text');
    
    netProfitEl.textContent = formatMoney(be.net_profit);
    
    if (be.total_investment === 0) {
        statusBadge.textContent = "Inga inköp";
        statusBadge.className = "badge";
        progressBar.style.width = "0%";
        progressPercent.textContent = "0%";
        netProfitEl.className = "";
        netProfitSub.textContent = "Nettokassaflöde";
        tipText.innerHTML = "Inga varupaket registrerade än. Ladda upp en Excel-fil för att påbörja din nollpunktsanalys!";
    } else {
        const percentage = (be.total_revenue / be.total_investment) * 100;
        progressBar.style.width = `${Math.min(100, percentage)}%`;
        progressPercent.textContent = `${percentage.toFixed(0)}%`;
        
        if (percentage < 100) {
            statusBadge.textContent = "Nollpunkt ej nådd";
            statusBadge.className = "badge stock-low";
            
            netProfitEl.className = "val-muted";
            netProfitSub.textContent = "Kvar till break-even";
            netProfitEl.textContent = "-" + formatMoney(be.total_investment - be.total_revenue);
            
            tipText.innerHTML = `Sälj för ytterligare <strong style="color:var(--color-primary);">${formatMoney(be.total_investment - be.total_revenue)}</strong> för att nå break-even och börja göra ren nettovinst!`;
        } else {
            statusBadge.textContent = "Nollpunkt nådd! 🚀";
            statusBadge.className = "badge stock-ok animate-pulse-accent";
            
            netProfitEl.className = "val-success";
            netProfitSub.textContent = "Faktisk nettovinst";
            netProfitEl.textContent = "+" + formatMoney(be.net_profit);
            
            tipText.innerHTML = `<span style="color:var(--color-success); font-weight:700;">Grattis! Hela din varuinvestering är betald.</span> Varje krona du säljer för nu är ren nettovinst rakt ner i fickan!`;
        }
    }
    
    // 3. Render Individual Project Summaries (Projektportfölj)
    const portfolioGrid = document.getElementById('projects-portfolio-grid');
    const projectCountEl = document.getElementById('portfolio-project-count');
    
    portfolioGrid.innerHTML = '';
    
    if (!data.project_summaries || data.project_summaries.length === 0) {
        projectCountEl.textContent = '0 aktiva partier';
        portfolioGrid.innerHTML = `
            <div style="grid-column: 1/-1; text-align:center; padding: 40px; color:var(--text-muted);">
                Inga produktgrupper eller projekt registrerade. Lägg till produkter för att starta portföljen.
            </div>
        `;
    } else {
        projectCountEl.textContent = `${data.project_summaries.length} aktiva partier`;
        
        data.project_summaries.forEach(proj => {
            const card = document.createElement('article');
            card.className = 'project-portfolio-card glass-card fade-in';
            
            const profitText = proj.net_profit >= 0 ? `+${formatMoney(proj.net_profit)}` : `-${formatMoney(Math.abs(proj.net_profit))}`;
            const profitClass = proj.net_profit >= 0 ? 'val-success' : 'val-muted';
            
            let statusText = 'Ej påbörjad';
            let statusClass = 'stock-empty';
            if (proj.be_percentage >= 100) {
                statusText = 'Betalt! 🚀';
                statusClass = 'stock-ok';
            } else if (proj.be_percentage > 0) {
                statusText = `${proj.be_percentage.toFixed(0)}% täcken`;
                statusClass = 'stock-low';
            }
            
            card.innerHTML = `
                <div class="project-card-top">
                    <div>
                        <h4>${proj.name}</h4>
                        <span class="stock-badge ${statusClass}" style="margin-top:4px; display:inline-block;">${statusText}</span>
                    </div>
                    <span class="badge" style="font-size:0.75rem;">${proj.stock_count} st i lager</span>
                </div>
                
                <div class="project-stats-mini">
                    <div class="p-mini-box">
                        <span>Investerat</span>
                        <strong>${formatMoney(proj.total_investment)}</strong>
                    </div>
                    <div class="p-mini-box">
                        <span>Ackumulerat</span>
                        <strong>${formatMoney(proj.total_revenue)}</strong>
                    </div>
                </div>
                
                <div class="be-progress-wrapper" style="gap:5px;">
                    <div class="be-progress-track" style="height: 6px;">
                        <div class="be-progress-fill" style="width: ${Math.min(100, proj.be_percentage)}%;"></div>
                    </div>
                </div>
                
                <div class="project-card-footer">
                    <div>
                        <span style="font-size:0.7rem; color:var(--text-muted); display:block;">Nettovinst/Likviditet</span>
                        <strong class="${profitClass}" style="font-size:1.1rem; font-weight:700;">${profitText}</strong>
                    </div>
                    <button class="view-project-btn" onclick="openProjectInInventory('${proj.name}')">
                        <span>Öppna i lager</span>
                        <i data-lucide="arrow-right" style="width: 14px; height: 14px;"></i>
                    </button>
                </div>
            `;
            
            portfolioGrid.appendChild(card);
        });
    }
    
    // 4. Periods Metrics
    const periods = ['today', 'week', 'month'];
    periods.forEach(p => {
        const stats = data.financials[p];
        document.getElementById(`perf-${p}-revenue`).textContent = formatMoney(stats.revenue);
        document.getElementById(`perf-${p}-cost`).textContent = formatMoney(stats.cost);
        document.getElementById(`perf-${p}-profit`).textContent = formatMoney(stats.profit);
        
        const marginEl = document.getElementById(`perf-${p}-margin`);
        marginEl.textContent = `${stats.margin.toFixed(0)}% marginal`;
        
        marginEl.className = 'badge';
        if (stats.margin >= 50) {
            marginEl.style.backgroundColor = 'rgba(16, 185, 129, 0.12)';
            marginEl.style.color = 'var(--color-success)';
        } else if (stats.margin >= 30) {
            marginEl.style.backgroundColor = 'rgba(139, 92, 246, 0.12)';
            marginEl.style.color = 'var(--color-primary)';
        } else {
            marginEl.style.backgroundColor = 'rgba(245, 158, 11, 0.12)';
            marginEl.style.color = 'var(--color-warning)';
        }
    });
    
    // 5. Render Recent Sales Log
    const tbody = document.getElementById('sales-history-tbody');
    tbody.innerHTML = '';
    
    if (data.recent_sales.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="9" style="text-align:center; color: var(--text-muted); padding:30px;">
                    Inga försäljningar registrerade än. Minska lagersaldot på en produkt för att skapa en försäljning!
                </td>
            </tr>
        `;
        return;
    }
    
    data.recent_sales.forEach(sale => {
        const profit = sale.selling_price - sale.purchase_price;
        const margin = sale.selling_price > 0 ? (profit / sale.selling_price * 100) : 0;
        
        const dateObj = new Date(sale.created_at);
        let timeStr = dateObj.toLocaleDateString('sv-SE', { month: 'short', day: 'numeric' }) + ' ' + dateObj.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' });
        
        const today = new Date();
        if (dateObj.toDateString() === today.toDateString()) {
            timeStr = `Idag ${dateObj.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })}`;
        }
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td style="color:var(--text-secondary); font-size:0.8rem;">${timeStr}</td>
            <td><span class="wizard-badge" style="font-size:0.7rem;">${sale.category}</span></td>
            <td style="font-weight:600;">${sale.model_name}</td>
            <td class="cell-size">${sale.size}</td>
            <td style="color:var(--text-secondary);">${sale.color}</td>
            <td style="color:var(--text-muted);">${formatMoney(sale.purchase_price)}</td>
            <td style="font-weight:600;">${formatMoney(sale.selling_price)}</td>
            <td class="val-success" style="font-weight:600;">+${formatMoney(profit)}</td>
            <td><span class="badge" style="font-size:0.75rem;">${margin.toFixed(0)}%</span></td>
        `;
        tbody.appendChild(row);
    });
    
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
}

// QUICK LINK FROM ANALYTICS TO INVENTORY FILTER
function openProjectInInventory(projectName) {
    state.activeFilterCategory = projectName;
    
    const dropdown = document.getElementById('category-filter');
    if (dropdown) dropdown.value = projectName;
    
    switchTab('inventory');
}

// ==================== MANUAL ADD/EDIT PRODUCT ====================
function openAddProductModal() {
    document.getElementById('product-modal-title').textContent = "Registrera Ny Produkt";
    document.getElementById('product-form').reset();
    document.getElementById('prod-desc').value = '';
    
    const bulkDiscount = document.getElementById('bulk-product-discount');
    if (bulkDiscount) bulkDiscount.value = '';
    
    const tbody = document.getElementById('variants-tbody');
    tbody.innerHTML = '';
    
    addVariantRow();
    
    showModal('product-modal');
}

function addVariantRow(size = '', color = '', stock = '0', pPrice = '0', sPrice = '399', sku = '', oPrice = '', variantId = '') {
    const tbody = document.getElementById('variants-tbody');
    const row = document.createElement('tr');
    row.className = 'variant-edit-row';
    const activeOPrice = oPrice || sPrice || '399';
    row.innerHTML = `
        <input type="hidden" class="edit-variant-id" value="${variantId}">
        <td><input type="text" class="edit-size" required placeholder="T.ex. 42" value="${size}"></td>
        <td><input type="text" class="edit-color" required placeholder="T.ex. Svart" value="${color}"></td>
        <td><input type="number" class="edit-stock" required min="0" value="${stock}"></td>
        <td><input type="number" class="edit-p-price" required min="0" placeholder="Kostnad" value="${pPrice}"></td>
        <td><input type="number" class="edit-s-price" required min="0" placeholder="Säljpris" value="${sPrice}"></td>
        <td><input type="number" class="edit-o-price" required min="0" placeholder="Nypris" value="${activeOPrice}"></td>
        <td>
            <div class="sku-scan-container">
                <input type="text" class="edit-sku" placeholder="Auto-genereras" value="${sku}">
                <button type="button" class="btn-sku-scan" onclick="scanSkuForField(this)" title="Skanna med kameran">
                    <i data-lucide="camera" style="width: 16px; height: 16px;"></i>
                </button>
            </div>
        </td>
        <td>
            <button type="button" class="btn-remove-row" onclick="removeVariantRow(this)">
                <i data-lucide="trash-2" style="width: 16px; height: 16px;"></i>
            </button>
        </td>
    `;
    tbody.appendChild(row);
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
}

function scanSkuForField(button) {
    const input = button.closest('.sku-scan-container').querySelector('.edit-sku');
    state.barcodeTargetInput = input;
    openScannerModal();
}

function focusNextSkuInput(currentInput) {
    if (!currentInput) return;
    const rows = Array.from(document.querySelectorAll('.variant-edit-row'));
    const currentRow = currentInput.closest('tr');
    const currentIndex = rows.indexOf(currentRow);
    if (currentIndex !== -1 && currentIndex < rows.length - 1) {
        const nextRow = rows[currentIndex + 1];
        const nextInput = nextRow.querySelector('.edit-sku');
        if (nextInput) {
            nextInput.focus();
            nextInput.select();
        }
    }
}

function removeVariantRow(button) {
    const rows = document.querySelectorAll('.variant-edit-row');
    if (rows.length > 1) {
        button.closest('tr').remove();
    } else {
        showToast("En produkt måste innehålla minst en storlek/variant.", 'warning');
    }
}

function applyBulkProductDiscount(val) {
    if (val === '') return;
    const discountPct = parseFloat(val);
    const rows = document.querySelectorAll('.variant-edit-row');
    rows.forEach(row => {
        const oPriceInput = row.querySelector('.edit-o-price');
        const sPriceInput = row.querySelector('.edit-s-price');
        if (oPriceInput && sPriceInput) {
            let oPrice = parseFloat(oPriceInput.value) || parseFloat(sPriceInput.value) || 0;
            if (oPrice > 0) {
                const newSPrice = discountPct === 0 ? oPrice : Math.round(oPrice * (1.0 - discountPct / 100.0));
                sPriceInput.value = newSPrice;
                if (!oPriceInput.value || parseFloat(oPriceInput.value) === 0) {
                    oPriceInput.value = oPrice;
                }
            }
        }
    });
}

async function handleProductFormSubmit(e) {
    e.preventDefault();
    
    const name = document.getElementById('prod-name').value.trim();
    const category = document.getElementById('prod-category').value.trim();
    const description = document.getElementById('prod-desc').value.trim();
    
    const variantRows = document.querySelectorAll('.variant-edit-row');
    const variants = [];
    
    variantRows.forEach(row => {
        const size = row.querySelector('.edit-size').value.trim();
        const color = row.querySelector('.edit-color').value.trim();
        const stock = parseInt(row.querySelector('.edit-stock').value) || 0;
        const purchase_price = parseFloat(row.querySelector('.edit-p-price').value) || 0.0;
        const selling_price = parseFloat(row.querySelector('.edit-s-price').value) || 0.0;
        const original_price = parseFloat(row.querySelector('.edit-o-price').value) || selling_price;
        const sku = row.querySelector('.edit-sku').value.trim();
        
        if (size && color) {
            variants.push({ size, color, stock, purchase_price, selling_price, original_price, sku });
        }
    });
    
    if (variants.length === 0) {
        showToast("Vänligen lägg till minst en färg/storlek variant.", 'warning');
        return;
    }
    
    try {
        const response = await fetch('/api/products', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, category, description, variants })
        });
        
        const data = await response.json();
        if (data.success) {
            closeModal('product-modal');
            loadInventory();
        } else {
            showToast("Kunde inte spara produkten: " + data.error, 'error');
        }
    } catch (err) {
        console.error("Fel vid sparning av produkt:", err);
    }
}

async function deleteProduct(productId) {
    const confirmed = await showConfirm({
        title: 'Radera produkt',
        msg: 'Är du säker på att du vill radera denna produkt och alla dess storlekar/varianter permanent? Åtgärden kan inte ångras.',
        type: 'danger',
        okLabel: 'Ja, radera'
    });
    if (!confirmed) return;
    
    try {
        const res = await fetch(`/api/products/${productId}`, { method: 'DELETE' });
        if (res.ok) {
            loadInventory();
        } else {
            showToast("Misslyckades att ta bort produkten.", 'error');
        }
    } catch (e) {
        console.error(e);
    }
}

function editProduct(productId) {
    const product = state.products.find(p => p.id === productId);
    if (!product) return;
    
    document.getElementById('product-modal-title').textContent = "Redigera produkt";
    document.getElementById('prod-name').value = product.name;
    document.getElementById('prod-category').value = product.category;
    document.getElementById('prod-desc').value = product.description || '';
    
    const bulkDiscount = document.getElementById('bulk-product-discount');
    if (bulkDiscount) bulkDiscount.value = '';
    
    const tbody = document.getElementById('variants-tbody');
    tbody.innerHTML = '';
    
    product.variants.forEach(v => {
        addVariantRow(v.size, v.color, v.stock, v.purchase_price, v.selling_price, v.sku, v.original_price, v.id);
    });
    
    const form = document.getElementById('product-form');
    
    form.onsubmit = async (e) => {
        e.preventDefault();
        
        const name = document.getElementById('prod-name').value.trim();
        const category = document.getElementById('prod-category').value.trim();
        const description = document.getElementById('prod-desc').value.trim();
        
        const variantRows = document.querySelectorAll('.variant-edit-row');
        const variants = [];
        
        variantRows.forEach(row => {
            const variantIdVal = row.querySelector('.edit-variant-id') ? row.querySelector('.edit-variant-id').value : '';
            const size = row.querySelector('.edit-size').value.trim();
            const color = row.querySelector('.edit-color').value.trim();
            const stock = parseInt(row.querySelector('.edit-stock').value) || 0;
            const purchase_price = parseFloat(row.querySelector('.edit-p-price').value) || 0.0;
            const selling_price = parseFloat(row.querySelector('.edit-s-price').value) || 0.0;
            const original_price = parseFloat(row.querySelector('.edit-o-price').value) || selling_price;
            const sku = row.querySelector('.edit-sku').value.trim();
            
            if (size && color) {
                const variantObj = { size, color, stock, purchase_price, selling_price, original_price, sku };
                if (variantIdVal) {
                    variantObj.id = parseInt(variantIdVal);
                }
                variants.push(variantObj);
            }
        });
        
        try {
            const response = await fetch(`/api/products/${productId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, category, description, variants })
            });
            
            const data = await response.json();
            if (data.success) {
                closeModal('product-modal');
                loadInventory();
            } else {
                showToast("Kunde inte spara produkten: " + data.error, 'error');
            }
        } catch (e) {
            console.error(e);
            showToast("Ett fel uppstod vid uppdatering av produkten.", 'error');
        }
        
        form.onsubmit = handleProductFormSubmit;
    };
    
    showModal('product-modal');
}

// ==================== BARCODE SCANNER ====================
function openScannerModal() {
    showModal('scan-modal');
    document.getElementById('scan-result').classList.add('hide');
    document.getElementById('manual-sku').value = '';
    
    state.html5QrScanner = new Html5Qrcode("reader");
    const config = { fps: 10, qrbox: { width: 250, height: 150 } };
    
    state.html5QrScanner.start(
        { facingMode: "environment" }, 
        config, 
        onScanSuccess, 
        onScanFailure
    ).catch(err => {
        console.warn("Kamerastart misslyckades:", err);
    });
}

function stopScanner() {
    if (state.html5QrScanner) {
        state.html5QrScanner.stop().then(() => {
            state.html5QrScanner = null;
        }).catch(err => console.error(err));
    }
}

// ==================== EXCEL IMPORT WIZARD ====================
function openExcelModal() {
    showModal('excel-modal');
    document.getElementById('import-step-upload').classList.remove('hide');
    document.getElementById('import-step-verify').classList.add('hide');
    document.getElementById('import-loading').classList.add('hide');
    document.getElementById('excel-file-input').value = '';
    
    document.getElementById('batch-total-package-price').value = '';
    document.getElementById('batch-purchase-price').value = '150';
    document.getElementById('batch-selling-price').value = '399';
}

function setupExcelDropEvents() {
    const dropZone = document.getElementById('excel-drop-zone');
    const fileInput = document.getElementById('excel-file-input');
    
    if (!dropZone) return;
    
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('dragover');
    });
    
    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('dragover');
    });
    
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleUploadedExcelFile(files[0]);
        }
    });
    
    fileInput.addEventListener('change', () => {
        if (fileInput.files.length > 0) {
            handleUploadedExcelFile(fileInput.files[0]);
        }
    });
}

async function handleUploadedExcelFile(file) {
    const uploadStep = document.getElementById('import-step-upload');
    const verifyStep = document.getElementById('import-step-verify');
    const loadingStep = document.getElementById('import-loading');
    
    uploadStep.classList.add('hide');
    loadingStep.classList.remove('hide');
    
    const formData = new FormData();
    formData.append('file', file);
    
    try {
        const response = await fetch('/api/import-excel', {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (data.success) {
            loadingStep.classList.add('hide');
            verifyStep.classList.remove('hide');
            renderImportWizardTable(data.proposals);
        } else {
            showToast(data.error || "Ett fel uppstod vid analys av filen.", 'error');
            openExcelModal();
        }
    } catch (e) {
        showToast("Det gick inte att skicka filen till servern.", 'error');
        openExcelModal();
    }
}

// BATCH PRICING APPLICATION TO IMPORT
function applyBatchPricing() {
    const defaultP = document.getElementById('batch-purchase-price').value || '150';
    const defaultS = document.getElementById('batch-selling-price').value || '399';
    
    document.querySelectorAll('.wiz-p-input').forEach(input => input.value = defaultP);
    document.querySelectorAll('.wiz-s-input').forEach(input => input.value = defaultS);
}

// TOTAL BATCH PACKAGE PRICE LISTENER
function handleTotalPackagePriceInput() {
    const totalPackagePrice = parseFloat(document.getElementById('batch-total-package-price').value);
    if (isNaN(totalPackagePrice) || totalPackagePrice <= 0) return;
    
    let totalStock = 0;
    document.querySelectorAll('.wiz-stock-input').forEach(input => {
        totalStock += parseInt(input.value) || 0;
    });
    
    if (totalStock > 0) {
        const avgPurchasePrice = Math.round(totalPackagePrice / totalStock);
        
        document.getElementById('batch-purchase-price').value = avgPurchasePrice;
        document.querySelectorAll('.wiz-p-input').forEach(input => input.value = avgPurchasePrice);
    }
}

function renderImportWizardTable(proposals) {
    const tbody = document.getElementById('wizard-tbody');
    tbody.innerHTML = '';
    
    proposals.forEach(p => {
        const row = document.createElement('tr');
        row.className = 'wizard-row';
        row.dataset.rowJson = JSON.stringify(p);
        
        let variantsHtml = '';
        p.variants.forEach((v, vIdx) => {
            const isNeedVerify = v.confidence === 'needs_verification';
            
            let colorOptionsHtml = '';
            p.available_colors.forEach(col => {
                const selected = col.toLowerCase() === v.color.toLowerCase() ? 'selected' : '';
                colorOptionsHtml += `<option value="${col}" ${selected}>${col}</option>`;
            });
            
            variantsHtml += `
                <div class="wizard-var-row ${isNeedVerify ? 'needs-verify' : ''}" data-variant-index="${vIdx}" style="display:flex; flex-wrap:wrap; gap:8px;">
                    <span class="wiz-size-tag">Stl ${v.size}</span>
                    <select class="wiz-color-select" title="Färg">
                        ${colorOptionsHtml}
                    </select>
                    <div style="display:flex; align-items:center; gap: 4px;">
                        <span style="font-size:0.75rem; color:var(--text-secondary);">Antal:</span>
                        <input type="number" class="wiz-stock-input" value="${v.stock}" min="0">
                    </div>
                    <div style="display:flex; align-items:center; gap: 4px;">
                        <span style="font-size:0.75rem; color:var(--text-muted);">Inköp:</span>
                        <input type="number" class="wiz-p-input" value="150" style="width:50px; text-align:center; padding:4px; background:rgba(5,7,12,0.8); border:1px solid var(--border-light); border-radius:4px; color:var(--text-primary); font-size:0.8rem;">
                    </div>
                    <div style="display:flex; align-items:center; gap: 4px;">
                        <span style="font-size:0.75rem; color:var(--text-muted);">Sälj:</span>
                        <input type="number" class="wiz-s-input" value="399" style="width:55px; text-align:center; padding:4px; background:rgba(5,7,12,0.8); border:1px solid var(--border-light); border-radius:4px; color:var(--text-primary); font-size:0.8rem;">
                    </div>
                </div>
            `;
        });
        
        row.innerHTML = `
            <td class="wizard-row-idx">#${p.row_index}</td>
            <td><span class="wizard-badge">${p.category}</span></td>
            <td style="font-weight:600;">${p.model}</td>
            <td style="font-family:monospace; color:var(--text-secondary);">${p.original_sizes}</td>
            <td>
                <div class="wizard-variants-container">
                    ${variantsHtml}
                </div>
            </td>
            <td style="font-weight:700; font-size:1.05rem; text-align:center;">${p.total_stock}</td>
        `;
        
        tbody.appendChild(row);
    });
}

async function saveConfirmedImport() {
    const rows = document.querySelectorAll('.wizard-row');
    const items = [];
    
    rows.forEach(row => {
        const originalData = JSON.parse(row.dataset.rowJson);
        const varRows = row.querySelectorAll('.wizard-var-row');
        const confirmedVariants = [];
        
        varRows.forEach(vRow => {
            const vIdx = parseInt(vRow.dataset.variantIndex);
            const size = originalData.variants[vIdx].size;
            const color = vRow.querySelector('.wiz-color-select').value;
            const stock = parseInt(vRow.querySelector('.wiz-stock-input').value) || 0;
            const purchase_price = parseFloat(vRow.querySelector('.wiz-p-input').value) || 0.0;
            const selling_price = parseFloat(vRow.querySelector('.wiz-s-input').value) || 0.0;
            
            confirmedVariants.push({ size, color, stock, purchase_price, selling_price });
        });
        
        items.push({
            category: originalData.category,
            model: originalData.model,
            variants: confirmedVariants
        });
    });
    
    const verifyStep = document.getElementById('import-step-verify');
    const loadingStep = document.getElementById('import-loading');
    const loadingText = document.getElementById('import-loading-text');
    
    verifyStep.classList.add('hide');
    loadingStep.classList.remove('hide');
    loadingText.textContent = "Sparar produkter i databasen...";
    
    try {
        const response = await fetch('/api/confirm-import', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ items })
        });
        
        const data = await response.json();
        if (data.success) {
            closeModal('excel-modal');
            loadInventory();
        } else {
            showToast("Det gick inte att slutföra importen: " + data.error, 'error');
            verifyStep.classList.remove('hide');
            loadingStep.classList.add('hide');
        }
    } catch (e) {
        showToast("Ett nätverksfel uppstod.", 'error');
        verifyStep.classList.remove('hide');
        loadingStep.classList.add('hide');
    }
}

// ==================== BARCODE SCANNER HANDLERS ====================
function onScanSuccess(decodedText) {
    stopScanner();
    if (state.barcodeTargetInput) {
        state.barcodeTargetInput.value = decodedText;
        state.barcodeTargetInput.dispatchEvent(new Event('input', { bubbles: true }));
        
        const nextInputTarget = state.barcodeTargetInput;
        state.barcodeTargetInput = null;
        closeModal('scan-modal');
        
        focusNextSkuInput(nextInputTarget);
    } else {
        searchScannedSKU(decodedText);
    }
}

function onScanFailure() {}

function handleManualSkuSearch() {
    const sku = document.getElementById('manual-sku').value.trim();
    if (!sku) return;
    stopScanner();
    if (state.barcodeTargetInput) {
        state.barcodeTargetInput.value = sku;
        state.barcodeTargetInput.dispatchEvent(new Event('input', { bubbles: true }));
        
        const nextInputTarget = state.barcodeTargetInput;
        state.barcodeTargetInput = null;
        closeModal('scan-modal');
        
        focusNextSkuInput(nextInputTarget);
    } else {
        searchScannedSKU(sku);
    }
}

async function searchScannedSKU(sku) {
    const resultCard = document.getElementById('scan-result');
    resultCard.innerHTML = '<div class="spinner"></div>';
    resultCard.classList.remove('hide');
    resultCard.classList.remove('error');
    
    try {
        const response = await fetch('/api/scan', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sku })
        });
        
        const data = await response.json();
        
        if (data.success && data.found) {
            const v = data.variant;
            resultCard.className = 'scan-result-card';
            
            // Check if we're in POS mode (kassa tab active)
            const inPosMode = document.body.classList.contains('pos-tab-active');
            
            resultCard.innerHTML = `
                <div class="result-prod-title">${v.product_name}</div>
                <div class="result-meta">
                    Kategori: <span>${v.product_category}</span> | 
                    Storlek: <span>${v.size}</span> | 
                    Färg: <span>${v.color}</span>
                </div>
                ${inPosMode ? `
                <div style="margin-top:12px;">
                    <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:10px; font-size:0.82rem; color:var(--text-muted);">
                        <span>Lagersaldo: <strong style="color:var(--text-primary);">${v.stock} st</strong></span>
                        ${v.stock === 0 ? '<span style="color:#ef4444; font-weight:700;">⚠️ Slut i lager</span>' : ''}
                    </div>
                    <button class="btn btn-primary btn-full" style="padding:13px; font-size:0.95rem; font-weight:700; gap:8px;"
                        onclick="addScannedToCart(${v.id}, '${v.product_name.replace(/'/g,"\\'")}', '${v.product_category.replace(/'/g,"\\'")}', '${v.size}', '${v.color}', ${v.selling_price}, ${v.original_price || v.selling_price}, ${v.stock})"
                        ${v.stock === 0 ? 'disabled' : ''}>
                        <i data-lucide="shopping-cart" style="width:18px;height:18px;"></i>
                        Lägg i varukorg
                    </button>
                </div>
                ` : `
                <div style="margin-top:12px; display:flex; flex-direction:column; gap:12px;">
                    <div style="display: flex; align-items: center; justify-content: space-between;">
                        <span>Aktuellt lagersaldo:</span>
                        <div class="stock-adjust-group">
                            <button class="btn-stock-adj" onclick="adjustScannedStock(${v.id}, -1)">-</button>
                            <span class="stock-display" id="scan-stock-val">${v.stock}</span>
                            <button class="btn-stock-adj" onclick="adjustScannedStock(${v.id}, 1)">+</button>
                        </div>
                    </div>
                    ${(state.userRole === 'admin' || state.userRole === 'user') ? `
                    <button class="btn btn-primary btn-full" style="padding:13px; font-size:0.95rem; font-weight:700; gap:8px;"
                        onclick="closeModal('scan-modal'); editProduct(${v.product_id});">
                        <i data-lucide="edit-3" style="width:18px;height:18px;"></i>
                        Redigera produkt
                    </button>
                    ` : ''}
                </div>
                `}
            `;
            
            if (typeof lucide !== 'undefined') lucide.createIcons();

            
            const mainRow = document.querySelector(`tr[data-variant-id="${v.id}"]`);
            if (mainRow) {
                mainRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
                mainRow.style.backgroundColor = 'rgba(139, 92, 246, 0.15)';
                setTimeout(() => mainRow.style.backgroundColor = '', 3000);
            }
            
        } else {
            resultCard.className = 'scan-result-card error';
            resultCard.innerHTML = `
                <div class="result-prod-title" style="color: var(--color-danger);">Koden hittades inte</div>
                <p class="result-meta">${data.message || 'Denna streckkod finns inte registrerad i systemet än.'}</p>
                ${state.userRole === 'admin' ? `
                <button class="btn btn-secondary btn-sm" onclick="closeModal('scan-modal'); openAddProductModal();">
                    <i data-lucide="plus"></i>
                    <span>Registrera ny produkt med denna kod</span>
                </button>
                ` : ''}
            `;
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
        }
    } catch (e) {
        resultCard.innerHTML = '<p class="error-msg">Nätverksfel vid sökning.</p>';
    }
}

async function adjustScannedStock(variantId, change) {
    const scanStockVal = document.getElementById('scan-stock-val');
    if (!scanStockVal) return;
    
    let current = parseInt(scanStockVal.textContent);
    let newVal = Math.max(0, current + change);
    scanStockVal.textContent = newVal;
    
    await adjustStock(variantId, change);
}

function addScannedToCart(variantId, productName, category, size, color, sellingPrice, originalPrice, maxStock) {
    if (maxStock <= 0) {
        showToast('Denna variant är slut i lager.', 'warning');
        return;
    }
    
    const existing = posCart.find(item => item.variantId === variantId);
    if (existing) {
        if (existing.quantity + 1 > existing.maxStock) {
            showToast(`Kan inte lägga till fler. Endast ${existing.maxStock} par finns i lager.`, 'warning');
            return;
        }
        existing.quantity += 1;
    } else {
        // Apply order discount if active
        const effectivePrice = posOrderDiscountPct > 0
            ? Math.round(originalPrice * (1 - posOrderDiscountPct / 100))
            : sellingPrice;
        
        posCart.push({
            variantId,
            productName,
            category,
            size,
            color,
            originalPrice,
            sellingPrice: effectivePrice,
            maxStock,
            quantity: 1
        });
    }
    
    renderPosCart();
    
    // Show success feedback then close modal
    const btn = document.querySelector('#scan-result .btn-primary');
    if (btn) {
        btn.innerHTML = '<i data-lucide="check-circle" style="width:18px;height:18px;"></i> Lagd i varukorgen!';
        btn.style.background = 'linear-gradient(135deg, #10b981, #059669)';
        btn.disabled = true;
        if (typeof lucide !== 'undefined') lucide.createIcons();
    }
    
    setTimeout(() => {
        closeModal('scan-modal');
    }, 800);
}

// ==================== QR CODE VIEWER ====================
function viewQrCode(variantId, model, size, color, sku) {
    const modal = document.getElementById('qr-modal');
    document.getElementById('qr-modal-title').textContent = `${model}`;
    document.getElementById('qr-sku-text').textContent = sku;
    
    const qrImg = document.getElementById('qr-image');
    qrImg.src = `/api/generate-qr/${variantId}`;
    
    document.getElementById('print-qr-btn').onclick = () => {
        const printWin = window.open('', '_blank');
        printWin.document.write(`
            <html>
            <head>
                <title>Skriv ut streckkod</title>
                <style>
                    body { font-family: sans-serif; text-align: center; padding: 40px; }
                    img { max-width: 250px; }
                    .sku { font-size: 24px; font-weight: bold; font-family: monospace; margin-top: 15px; }
                    .meta { font-size: 16px; color: #555; margin-top: 5px; }
                </style>
            </head>
            <body onload="window.print(); window.close();">
                <h2>${model}</h2>
                <img src="/api/generate-qr/${variantId}" />
                <div class="sku">${sku}</div>
                <div class="meta">Storlek: ${size} | Färg: ${color}</div>
            </body>
            </html>
        `);
        printWin.document.close();
    };
    
    showModal('qr-modal');
}

// ==================== SETTINGS MODAL ====================
async function openSettingsModal() {
    showModal('settings-modal');
    document.getElementById('settings-msg').classList.add('hide');
    document.getElementById('settings-pw').value = '';
    
    // Populate profile settings
    const emailInput = document.getElementById('profile-email');
    const pwInput = document.getElementById('profile-pw');
    const successMsg = document.getElementById('profile-msg');
    const errMsg = document.getElementById('profile-err-msg');
    
    if (emailInput) emailInput.value = state.userEmail || '';
    if (pwInput) pwInput.value = '';
    if (successMsg) successMsg.classList.add('hide');
    if (errMsg) errMsg.classList.add('hide');
}

async function handleSaveProfile() {
    const email = document.getElementById('profile-email').value.trim();
    const pw = document.getElementById('profile-pw').value.trim();
    const successMsg = document.getElementById('profile-msg');
    const errMsg = document.getElementById('profile-err-msg');
    
    successMsg.classList.add('hide');
    errMsg.classList.add('hide');
    
    if (!email) {
        errMsg.textContent = "E-postadressen får inte vara tom.";
        errMsg.classList.remove('hide');
        return;
    }
    
    if (pw && pw.length < 4) {
        errMsg.textContent = "Lösenordet måste vara minst 4 tecken långt.";
        errMsg.classList.remove('hide');
        return;
    }
    
    try {
        const response = await fetch('/api/settings/profile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: email, password: pw })
        });
        
        const data = await response.json();
        if (response.ok) {
            successMsg.textContent = data.message;
            successMsg.classList.remove('hide');
            state.userEmail = email; // Update local state email
            
            // Update greeting details in Welcome Hub
            const hubEmailEl = document.getElementById('hub-user-email');
            if (hubEmailEl) hubEmailEl.textContent = email;
            
            document.getElementById('profile-pw').value = ''; // Clear pw field
        } else {
            errMsg.textContent = data.error || "Kunde inte spara profilinställningar.";
            errMsg.classList.remove('hide');
        }
    } catch (err) {
        errMsg.textContent = "Ett anslutningsfel uppstod. Kontrollera nätverket.";
        errMsg.classList.remove('hide');
    }
}

async function handleSavePassword() {
    const pw = document.getElementById('settings-pw').value.trim();
    const msg = document.getElementById('settings-msg');
    
    if (pw.length < 4) {
        showToast("Lösenordet måste vara minst 4 tecken långt.", 'warning');
        return;
    }
    
    try {
        const response = await fetch('/api/settings/password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password: pw })
        });
        
        const data = await response.json();
        if (data.success) {
            msg.textContent = data.message;
            msg.classList.remove('hide');
            setTimeout(() => msg.classList.add('hide'), 3000);
        } else {
            showToast(data.error, 'error');
        }
    } catch (e) {
        showToast("Kunde inte spara lösenord.", 'error');
    }
}

// ==================== TAB SWITCHING LOGIC ====================
function switchTab(targetTab) {
    const hubBtn = document.getElementById('tab-hub-btn');
    const posBtn = document.getElementById('tab-pos-btn');
    const invBtn = document.getElementById('tab-inventory-btn');
    const bookBtn = document.getElementById('tab-bookings-btn');
    const anaBtn = document.getElementById('tab-analytics-btn');
    
    const hubContent = document.getElementById('tab-hub-content');
    const posContent = document.getElementById('tab-pos-content');
    const invContent = document.getElementById('tab-inventory-content');
    const bookContent = document.getElementById('tab-bookings-content');
    const anaContent = document.getElementById('tab-analytics-content');
    
    if (!invBtn || !anaBtn) return;
    
    state.activeTab = targetTab;
    
    if (hubBtn) hubBtn.classList.remove('active');
    if (posBtn) posBtn.classList.remove('active');
    invBtn.classList.remove('active');
    if (bookBtn) bookBtn.classList.remove('active');
    anaBtn.classList.remove('active');
    
    if (hubContent) hubContent.classList.add('hide');
    if (posContent) posContent.classList.add('hide');
    invContent.classList.add('hide');
    if (bookContent) bookContent.classList.add('hide');
    anaContent.classList.add('hide');
    
    // Visa/dölj "Visa Varukorg"-knappen beroende på aktiv flik
    if (targetTab === 'pos') {
        document.body.classList.add('pos-tab-active');
    } else {
        document.body.classList.remove('pos-tab-active');
    }

    if (targetTab === 'hub') {
        if (hubBtn) hubBtn.classList.add('active');
        if (hubContent) hubContent.classList.remove('hide');
    } else if (targetTab === 'pos') {
        if (posBtn) posBtn.classList.add('active');
        if (posContent) posContent.classList.remove('hide');
        loadPosProducts();
        renderPosCart();
        // Uppdatera Lucide-ikoner i den nytillagda knappen
        if (window.lucide) lucide.createIcons();
    } else if (targetTab === 'inventory') {
        invBtn.classList.add('active');
        invContent.classList.remove('hide');
        loadInventory();
    } else if (targetTab === 'bookings') {
        if (bookBtn) bookBtn.classList.add('active');
        if (bookContent) bookContent.classList.remove('hide');
        loadBookings();
    } else {
        if (state.userRole !== 'admin') {
            showToast("Endast administratörer har tillgång till Ekonomi & Statistik.", 'warning');
            switchTab('hub');
            return;
        }
        anaBtn.classList.add('active');
        anaContent.classList.remove('hide');
        loadAnalytics();
    }
}

function openHubProject() {
    const hubDropdown = document.getElementById('hub-project-select');
    if (hubDropdown) {
        state.activeFilterCategory = hubDropdown.value;
        const dropdown = document.getElementById('category-filter');
        if (dropdown) dropdown.value = hubDropdown.value;
    }
    switchTab('inventory');
}

// ==================== ADMIN PANEL FUNCTIONS ====================
async function openAdminPanel() {
    showModal('admin-modal');
    switchAdminTab('users');
    await loadAdminUsers();
    await loadAdminProjects();
}

function switchAdminTab(tab) {
    const uBtn = document.getElementById('admin-tab-users');
    const pBtn = document.getElementById('admin-tab-projects');
    const uSect = document.getElementById('admin-sect-users');
    const pSect = document.getElementById('admin-sect-projects');
    
    if (tab === 'users') {
        uBtn.className = 'btn btn-sm btn-primary';
        pBtn.className = 'btn btn-sm btn-secondary';
        uSect.classList.remove('hide');
        pSect.classList.add('hide');
    } else {
        uBtn.className = 'btn btn-sm btn-secondary';
        pBtn.className = 'btn btn-sm btn-primary';
        uSect.classList.add('hide');
        pSect.classList.remove('hide');
    }
}

async function loadAdminUsers() {
    try {
        const response = await fetch('/api/users');
        const users = await response.json();
        
        const tbody = document.getElementById('admin-users-tbody');
        tbody.innerHTML = '';
        
        users.forEach(u => {
            const row = document.createElement('tr');
            
            const isMaster = u.id === 1 || u.email.trim().toLowerCase() === 'apersson508@gmail.com' || u.email.trim().toLowerCase() === 'apersson508@gmai..com';
            let actionsHtml = '';
            if (isMaster) {
                actionsHtml = `
                    <span class="badge" style="font-size:0.75rem; background:rgba(212,163,89,0.1); color:#d4a359; border:1px solid rgba(212,163,89,0.2); padding: 4px 10px; border-radius: 4px; display: inline-flex; align-items: center; gap: 4px; font-weight: 600;">
                        <i data-lucide="shield-check" style="width:14px; height:14px;"></i>Skyddat Huvudkonto
                    </span>
                `;
            } else {
                actionsHtml = `
                    <button class="btn btn-ghost btn-icon btn-xs" onclick="openEditUserModal(${u.id}, '${u.email}', '${u.role}', '${u.allowed_projects}')" title="Redigera" style="margin-right:5px; padding:4px;">
                        <i data-lucide="edit-3" style="width:14px; height:14px;"></i>
                    </button>
                    <button class="btn btn-ghost btn-icon btn-xs" onclick="deleteUser(${u.id})" style="color:var(--color-danger); padding:4px;" title="Ta bort">
                        <i data-lucide="trash-2" style="width:14px; height:14px;"></i>
                    </button>
                `;
            }
            
            row.innerHTML = `
                <td style="font-weight:600;">${u.email}</td>
                <td>
                    <span class="badge ${u.role === 'admin' ? 'stock-ok animate-pulse-accent' : 'stock-low'}" style="font-size:0.75rem;">
                        ${u.role === 'admin' ? 'Administratör' : 'Standard Användare'}
                    </span>
                </td>
                <td style="color:var(--text-secondary); max-width:250px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
                    ${u.allowed_projects === 'all' ? 'Alla projekt' : u.allowed_projects}
                </td>
                <td style="text-align:right;">
                    ${actionsHtml}
                </td>
            `;
            tbody.appendChild(row);
        });
        
        if (typeof lucide !== 'undefined') lucide.createIcons();
        
    } catch (e) {
        console.error("Fel vid laddning av användare:", e);
    }
}

async function loadAdminProjects() {
    try {
        const response = await fetch('/api/projects');
        const projects = await response.json();
        
        const list = document.getElementById('admin-projects-list');
        list.innerHTML = '';
        
        const projSelect = document.getElementById('user-projects-select');
        if (projSelect) {
            projSelect.innerHTML = '<option value="all">Alla projekt</option>';
        }
        
        if (projects.length === 0) {
            list.innerHTML = '<li style="color:var(--text-muted); font-size:0.85rem; padding:12px 0; text-align:center;">Inga projekt skapade ännu.</li>';
        }
        
        projects.sort().forEach(p => {
            const li = document.createElement('li');
            li.className = 'project-item';
            
            // Header: project name + delete button
            li.innerHTML = `
                <div class="project-item-header">
                    <span class="project-item-title">
                        <i data-lucide="folder" style="width:14px;height:14px;vertical-align:middle;margin-right:6px;color:var(--color-primary);"></i>
                        ${p}
                    </span>
                    <button class="project-item-delete-btn" onclick="deleteProject('${p.replace(/'/g, "\\'")}')">
                        <i data-lucide="trash-2"></i>
                        Ta bort
                    </button>
                </div>
                <div class="project-item-controls">
                    <div class="project-control-group">
                        <label>Kampanjrabatt:</label>
                        <select class="custom-select" onchange="setProjectDiscount('${p.replace(/'/g, "\\'")}', this.value)">
                            <option value="0">Ingen</option>
                            <option value="10">10% Rabatt</option>
                            <option value="20">20% Rabatt</option>
                            <option value="30">30% Rabatt</option>
                            <option value="40">40% Rabatt</option>
                            <option value="50">50% Rabatt</option>
                            <option value="60">60% Rabatt</option>
                            <option value="70">70% Rabatt</option>
                            <option value="80">80% Rabatt</option>
                            <option value="90">90% Rabatt</option>
                        </select>
                    </div>
                    <div class="project-control-group">
                        <label>Klumpsumma inköp:</label>
                        <input type="number" class="custom-select" placeholder="0" style="text-align:right;" onchange="saveProjectInvestment('${p.replace(/'/g, "\\'")}', this.value)">
                        <span class="project-unit">kr</span>
                    </div>
                </div>
            `;
            list.appendChild(li);
            
            // Async fetch discount and investment for this project
            Promise.all([
                fetch(`/api/projects/discount?project=${encodeURIComponent(p)}`).then(res => res.json()),
                fetch(`/api/projects/investment?project=${encodeURIComponent(p)}`).then(res => res.json())
            ])
            .then(([discountData, invData]) => {
                const discount = discountData.discount_percent || 0;
                const investment = invData.investment || 0;
                
                // Set discount select value
                const sel = li.querySelector('.project-item-controls select');
                if (sel) sel.value = String(discount);
                
                // Set investment input value
                const inv = li.querySelector('.project-item-controls input[type="number"]');
                if (inv) inv.value = investment > 0 ? investment : '';
            })
            .catch(() => {
                // silently ignore per-project load errors
            });
            
            if (projSelect) {
                const opt = document.createElement('option');
                opt.value = p;
                opt.textContent = p;
                projSelect.appendChild(opt);
            }
        });
        
        if (typeof lucide !== 'undefined') lucide.createIcons();
    } catch (e) {
        console.error("Fel vid laddning av projekt:", e);
    }
}

async function deleteProject(projectName) {
    const confirmed = await showConfirm({
        title: `Radera projekt "${projectName}"?`,
        msg: 'Detta tar permanent bort alla produkter, varianter, försäljning och bokningar som tillhör projektet. Åtgärden kan inte ångras!',
        type: 'danger',
        okLabel: 'Ja, radera allt'
    });
    if (!confirmed) return;
    
    try {
        const res = await fetch('/api/projects', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: projectName })
        });
        const data = await res.json();
        if (data.success) {
            await loadAdminProjects();
            await loadInventory();
        } else {
            showToast(data.error || 'Kunde inte radera projektet.', 'error');
        }
    } catch (e) {
        showToast('Nätverksfel – kunde inte radera projektet.', 'error');
    }
}

async function setProjectDiscount(project, discountPercent) {
    try {
        const res = await fetch('/api/projects/discount', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ project, discount_percent: parseFloat(discountPercent) })
        });
        const data = await res.json();
        if (data.success) {
            // Reload inventory immediately
            await loadInventory();
            console.log(`Rabatt på ${project} satt till ${discountPercent}%`);
        } else {
            showToast(data.error || "Kunde inte spara rabatt.", 'error');
        }
    } catch (e) {
        showToast("Ett nätverksfel uppstod.", 'error');
    }
}

async function saveProjectInvestment(project, investmentVal) {
    try {
        const res = await fetch('/api/projects/investment', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ project, investment: parseFloat(investmentVal) || 0.0 })
        });
        const data = await res.json();
        if (data.success) {
            // Reload analytics to refresh Break-even charts instantly!
            loadAnalytics();
            console.log(`Sparade investering på ${project}: ${investmentVal} kr`);
        } else {
            showToast(data.error || "Kunde inte spara investering.", 'error');
        }
    } catch (e) {
        showToast("Ett nätverksfel uppstod.", 'error');
    }
}

async function handleCreateProject() {
    const input = document.getElementById('new-project-name');
    const name = input.value.trim();
    if (!name) return;
    
    try {
        const res = await fetch('/api/projects', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ name })
        });
        if (res.ok) {
            input.value = '';
            await loadAdminProjects();
            await loadInventory();
        } else {
            const d = await res.json();
            showToast(d.error, 'error');
        }
    } catch (e) {
        showToast("Fel vid skapande av projekt.", 'error');
    }
}

async function populateUserProjectsSelect(selectedProjects = []) {
    const container = document.getElementById('user-projects-checkboxes');
    if (!container) return;
    container.innerHTML = '';

    // "Alla projekt" toggle row
    const allChecked = selectedProjects.includes('all');
    const allRow = document.createElement('label');
    allRow.className = 'proj-check-row proj-check-all';
    allRow.innerHTML = `
        <input type="checkbox" id="proj-cb-all" value="all" ${allChecked ? 'checked' : ''}>
        <span class="proj-check-icon"><i data-lucide="layers" style="width:13px;height:13px;"></i></span>
        <span>Alla projekt</span>
    `;
    container.appendChild(allRow);

    const allCb = allRow.querySelector('input');
    allCb.addEventListener('change', () => {
        if (allCb.checked) {
            // Uncheck all specific projects
            container.querySelectorAll('input[type="checkbox"]:not(#proj-cb-all)').forEach(cb => cb.checked = false);
        }
    });

    try {
        const response = await fetch('/api/projects');
        if (response.ok) {
            const projects = await response.json();
            projects.sort().forEach(p => {
                const row = document.createElement('label');
                row.className = 'proj-check-row';
                const isChecked = !allChecked && selectedProjects.includes(p);
                row.innerHTML = `
                    <input type="checkbox" value="${p}" ${isChecked ? 'checked' : ''}>
                    <span class="proj-check-icon"><i data-lucide="folder" style="width:13px;height:13px;"></i></span>
                    <span>${p}</span>
                `;
                const cb = row.querySelector('input');
                cb.addEventListener('change', () => {
                    if (cb.checked) {
                        // Uncheck "Alla projekt" when a specific one is chosen
                        allCb.checked = false;
                    }
                });
                container.appendChild(row);
            });
        }
    } catch (e) {
        console.error("Kunde inte hämta projekt för användarhanteraren:", e);
    }

    if (typeof lucide !== 'undefined') lucide.createIcons();
}

async function openCreateUserModal() {
    document.getElementById('user-modal-title').textContent = 'Skapa Användare';
    document.getElementById('edit-user-id').value = '';
    document.getElementById('user-email-input').value = '';
    document.getElementById('user-email-input').disabled = false;
    document.getElementById('user-password-input').value = '';
    document.getElementById('user-password-input').required = true;
    document.getElementById('user-password-label').textContent = 'Lösenord';
    document.getElementById('user-role-select').value = 'user';
    
    await populateUserProjectsSelect(['all']);
    
    showModal('user-form-modal');
}

async function openEditUserModal(id, email, role, allowedProjects) {
    document.getElementById('user-modal-title').textContent = 'Redigera Användare';
    document.getElementById('edit-user-id').value = id;
    document.getElementById('user-email-input').value = email;
    document.getElementById('user-email-input').disabled = true; // Cannot edit email key
    document.getElementById('user-password-input').value = '';
    document.getElementById('user-password-input').required = false; // Optional password change
    document.getElementById('user-password-label').textContent = 'Lösenord (Lämna tomt för att behålla nuvarande)';
    document.getElementById('user-role-select').value = role;
    
    const projectsList = allowedProjects.split(',').map(p => p.trim());
    await populateUserProjectsSelect(projectsList);
    
    showModal('user-form-modal');
}

async function handleUserFormSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('edit-user-id').value;
    const email = document.getElementById('user-email-input').value.trim();
    const password = document.getElementById('user-password-input').value;
    const role = document.getElementById('user-role-select').value;
    
    // Grab selected projects from checkboxes
    const container = document.getElementById('user-projects-checkboxes');
    const checkedBoxes = Array.from(container.querySelectorAll('input[type="checkbox"]:checked')).map(cb => cb.value);
    const allowed_projects = checkedBoxes.includes('all') || checkedBoxes.length === 0 ? 'all' : checkedBoxes.join(',');
    
    const isEdit = id !== '';
    const url = isEdit ? `/api/users/${id}` : '/api/users';
    const method = isEdit ? 'PUT' : 'POST';
    
    const payload = { role, allowed_projects };
    if (!isEdit) payload.email = email;
    if (password) payload.password = password;
    
    try {
        const response = await fetch(url, {
            method,
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(payload)
        });
        
        const data = await response.json();
        if (data.success) {
            closeModal('user-form-modal');
            await loadAdminUsers();
        } else {
            showToast(data.error || "Misslyckades att spara användaren.", 'error');
        }
    } catch (e) {
        showToast("Ett nätverksfel uppstod.", 'error');
    }
}

async function deleteUser(id) {
    const confirmed = await showConfirm({
        title: 'Radera användare',
        msg: 'Är du säker på att du vill radera denna användare permanent? Åtgärden kan inte ångras.',
        type: 'danger',
        okLabel: 'Ja, radera'
    });
    if (!confirmed) return;
    
    try {
        const res = await fetch(`/api/users/${id}`, { method: 'DELETE' });
        const data = await res.json();
        if (data.success) {
            await loadAdminUsers();
        } else {
            showToast(data.error || "Kunde inte radera användare.", 'error');
        }
    } catch (e) {
        showToast("Nätverksfel vid radering.", 'error');
    }
}

// ==================== EVENT LISTENERS SETUP ====================
function setupEventListeners() {
    const hubTabBtn = document.getElementById('tab-hub-btn');
    if (hubTabBtn) hubTabBtn.addEventListener('click', () => switchTab('hub'));
    
    const logoEl = document.querySelector('.logo');
    if (logoEl) {
        logoEl.style.cursor = 'pointer';
        logoEl.addEventListener('click', () => switchTab('hub'));
    }

    document.getElementById('tab-pos-btn').addEventListener('click', () => switchTab('pos'));
    document.getElementById('tab-inventory-btn').addEventListener('click', () => switchTab('inventory'));
    
    const bookingsTabBtn = document.getElementById('tab-bookings-btn');
    if (bookingsTabBtn) {
        bookingsTabBtn.addEventListener('click', () => switchTab('bookings'));
    }
    
    document.getElementById('tab-analytics-btn').addEventListener('click', () => switchTab('analytics'));
    
    document.getElementById('refresh-analytics-btn').addEventListener('click', loadAnalytics);
    
    // Batch pricing in Excel Wizard
    document.getElementById('apply-batch-pricing-btn').addEventListener('click', applyBatchPricing);
    
    // Total package price input key listener
    document.getElementById('batch-total-package-price').addEventListener('input', handleTotalPackagePriceInput);

    // Search Inputs
    const searchInput = document.getElementById('search-input');
    const clearSearchBtn = document.getElementById('clear-search');
    
    searchInput.addEventListener('input', (e) => {
        state.activeSearchQuery = e.target.value;
        if (state.activeSearchQuery) {
            clearSearchBtn.classList.remove('hide');
        } else {
            clearSearchBtn.classList.add('hide');
        }
        renderProducts();
    });
    
    clearSearchBtn.addEventListener('click', () => {
        searchInput.value = '';
        state.activeSearchQuery = '';
        clearSearchBtn.classList.add('hide');
        renderProducts();
    });
    
    document.getElementById('category-filter').addEventListener('change', (e) => {
        state.activeFilterCategory = e.target.value;
        renderProducts();
    });
    
    // Checkbox toggle: Visa endast i lager / Göm slutartiklar
    const hideToggle = document.getElementById('hide-out-of-stock-toggle');
    if (hideToggle) {
        hideToggle.addEventListener('change', (e) => {
            state.hideOutOfStock = e.target.checked;
            renderProducts();
        });
    }
    
    document.getElementById('add-product-btn').addEventListener('click', openAddProductModal);
    document.getElementById('empty-add-btn').addEventListener('click', openAddProductModal);
    document.getElementById('import-excel-btn').addEventListener('click', openExcelModal);
    const scanShortcutBtn = document.getElementById('scan-shortcut-btn');
    if (scanShortcutBtn) {
        scanShortcutBtn.addEventListener('click', openScannerModal);
    }
    document.getElementById('settings-btn').addEventListener('click', openSettingsModal);
    
    // Admin Panel Listeners
    const adminBtn = document.getElementById('admin-panel-btn');
    if (adminBtn) adminBtn.addEventListener('click', openAdminPanel);
    
    const adminTabU = document.getElementById('admin-tab-users');
    const adminTabP = document.getElementById('admin-tab-projects');
    if (adminTabU) adminTabU.addEventListener('click', () => switchAdminTab('users'));
    if (adminTabP) adminTabP.addEventListener('click', () => switchAdminTab('projects'));
    
    const createUserBtn = document.getElementById('create-user-btn');
    if (createUserBtn) createUserBtn.addEventListener('click', openCreateUserModal);
    
    const saveProjBtn = document.getElementById('save-project-btn');
    if (saveProjBtn) saveProjBtn.addEventListener('click', handleCreateProject);
    
    const userForm = document.getElementById('admin-user-form');
    if (userForm) userForm.addEventListener('submit', handleUserFormSubmit);
    
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            const ok = await showConfirm({
                title: 'Logga ut',
                msg: 'Vill du logga ut från LAGERPRO?',
                type: 'neutral',
                okLabel: 'Logga ut',
                okBtnClass: 'btn-secondary',
                cancelLabel: 'Avbryt'
            });
            if (ok) {
                await fetch('/api/logout', { method: 'POST' });
                window.location.reload();
            }
        });
    }
    
    document.getElementById('confirm-import-btn').addEventListener('click', saveConfirmedImport);
    document.getElementById('back-to-upload-btn').addEventListener('click', openExcelModal);
    document.getElementById('save-pw-btn').addEventListener('click', handleSavePassword);
    
    const saveProfileBtn = document.getElementById('save-profile-btn');
    if (saveProfileBtn) {
        saveProfileBtn.addEventListener('click', handleSaveProfile);
    }
    
    document.getElementById('manual-sku-btn').addEventListener('click', handleManualSkuSearch);
    document.getElementById('manual-sku').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleManualSkuSearch();
    });
    
    const closeButtons = document.querySelectorAll('.modal-close-btn');
    closeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const overlay = btn.closest('.modal-overlay');
            if (overlay) {
                closeModal(overlay.id);
            }
        });
    });
    
    document.getElementById('stop-scan-btn').addEventListener('click', stopScanner);
    document.getElementById('add-variant-row-btn').addEventListener('click', () => addVariantRow());
    document.getElementById('product-form').addEventListener('submit', handleProductFormSubmit);
    
    // POS Event listeners
    const posSearch = document.getElementById('pos-search-input');
    if (posSearch) {
        posSearch.addEventListener('input', loadPosProducts);
    }
    const posFilter = document.getElementById('pos-category-filter');
    if (posFilter) {
        posFilter.addEventListener('change', loadPosProducts);
    }
    
    setupExcelDropEvents();

    // Intercept Enter key in variant SKU edits to prevent submit and shift focus
    const variantsTbodyEl = document.getElementById('variants-tbody');
    if (variantsTbodyEl) {
        variantsTbodyEl.addEventListener('keydown', (e) => {
            if (e.target && e.target.classList.contains('edit-sku')) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    focusNextSkuInput(e.target);
                }
            }
        });

        // Auto-select SKU text on focus
        variantsTbodyEl.addEventListener('focusin', (e) => {
            if (e.target && e.target.classList.contains('edit-sku')) {
                setTimeout(() => {
                    e.target.select();
                }, 50);
            }
        });
    }
}

function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('hide');
        document.body.style.overflow = 'hidden';
        document.body.classList.add('modal-active');
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('hide');
        document.body.style.overflow = '';
        
        // Remove modal-active if no other modal overlays are currently visible
        const openModals = document.querySelectorAll('.modal-overlay:not(.hide)');
        if (openModals.length === 0) {
            document.body.classList.remove('modal-active');
        }
        
        if (modalId === 'scan-modal') {
            stopScanner();
            state.barcodeTargetInput = null;
        }
    }
}

// ==================== KASSA (POS) CONTROLLER FUNCTIONS ====================
let posOrderDiscountPct = 0; // 0-90, overrides project default for this order

function updatePosOrderDiscount(val) {
    posOrderDiscountPct = parseInt(val);
    const display = document.getElementById('pos-discount-display');
    if (display) {
        display.textContent = `${posOrderDiscountPct}%`;
        if (posOrderDiscountPct >= 50) {
            display.style.background = 'rgba(239,68,68,0.25)';
            display.style.color = '#ef4444';
        } else if (posOrderDiscountPct > 0) {
            display.style.background = 'rgba(139,92,246,0.2)';
            display.style.color = 'var(--color-primary)';
        } else {
            display.style.background = 'rgba(100,116,139,0.15)';
            display.style.color = 'var(--text-muted)';
        }
    }
    renderPosCart();
}

function getPosEffectivePrice(originalPrice) {
    // Apply order-level override if set, otherwise use variant's selling_price
    if (posOrderDiscountPct > 0) {
        return Math.round(originalPrice * (1 - posOrderDiscountPct / 100));
    }
    return originalPrice;
}

function loadPosProducts() {
    const grid = document.getElementById('pos-products-grid');
    if (!grid) return;
    
    grid.innerHTML = '';
    
    const query = (document.getElementById('pos-search-input').value || '').toLowerCase().trim();
    const catFilter = document.getElementById('pos-category-filter').value;
    
    const posFilter = document.getElementById('pos-category-filter');
    if (posFilter && posFilter.options.length <= 1) {
        // Only show "Alla kategorier" if the user has access to all projects
        const hasFullAccess = state.allowedProjects === 'all' || state.userRole === 'admin';
        if (hasFullAccess) {
            posFilter.innerHTML = '<option value="all">Alla kategorier</option>';
        } else {
            posFilter.innerHTML = '';
        }
        Array.from(state.categories).sort().forEach(cat => {
            const opt = document.createElement('option');
            opt.value = cat;
            opt.textContent = cat;
            posFilter.appendChild(opt);
        });
        // If no "all" option and nothing pre-selected, pick first
        if (!hasFullAccess && posFilter.options.length > 0 && !posFilter.value) {
            posFilter.value = posFilter.options[0].value;
        }
    }
    
    const filtered = state.products.filter(p => {
        if (catFilter !== 'all' && p.category !== catFilter) return false;
        if (query) {
            return p.name.toLowerCase().includes(query) || p.category.toLowerCase().includes(query);
        }
        return true;
    });
    
    if (filtered.length === 0) {
        grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--text-muted);">Inga produkter matchar sökningen.</div>`;
        return;
    }
    
    filtered.forEach(p => {
        const hasStock = p.variants.some(v => v.stock > 0);
        const totalStock = p.variants.reduce((s, v) => s + v.stock, 0);
        
        // Use original_price as base, selling_price as the already-discounted price
        const baseVariant = p.variants.find(v => v.stock > 0) || p.variants[0];
        const originalPrice = baseVariant ? (baseVariant.original_price || baseVariant.selling_price) : 0;
        const currentSellingPrice = baseVariant ? baseVariant.selling_price : 0;
        
        // Grid always shows the standard campaign price (selling_price)
        const effectivePrice = currentSellingPrice;
        
        const showDiscount = effectivePrice < originalPrice && originalPrice > 0;
        const discountPct = showDiscount ? Math.round((1 - effectivePrice / originalPrice) * 100) : 0;
        
        const card = document.createElement('div');
        card.className = `pos-product-card glass-card${hasStock ? '' : ' out-of-stock'}`;

        if (hasStock) {
            card.onclick = () => openPosVariantSelection(p.id);
        }

        // Build size pills (show first 4, then +N)
        const inStockVariants = p.variants.filter(v => v.stock > 0);
        let sizePillsHtml = '';
        const maxShow = 4;
        inStockVariants.slice(0, maxShow).forEach(v => {
            sizePillsHtml += `<span style="background:rgba(139,92,246,0.15);color:var(--color-primary);border:1px solid rgba(139,92,246,0.3);border-radius:4px;padding:1px 6px;font-size:0.65rem;font-weight:600;">${v.size}</span>`;
        });
        if (inStockVariants.length > maxShow) {
            sizePillsHtml += `<span style="color:var(--text-muted);font-size:0.65rem;">+${inStockVariants.length - maxShow}</span>`;
        }
        if (!hasStock) {
            sizePillsHtml = `<span style="color:#ef4444;font-size:0.65rem;font-weight:600;">Slut i lager</span>`;
        }

        // Image: use first in-stock variant's SKU, fallback to first variant
        const imgVariant = inStockVariants[0] || p.variants[0];
        const imgSku = imgVariant ? imgVariant.sku : '';

        card.innerHTML = `
            <div class="pos-shoe-photo">
                ${imgSku
                    ? `<img src="/static/shoe_images/${imgSku}.jpg" alt="${p.name}" onerror="this.parentElement.innerHTML='<span class=\\'pos-img-placeholder\\'>👟</span>'">`
                    : `<span class="pos-img-placeholder">👟</span>`
                }
            </div>
            <div class="pos-product-card-info">
                <div class="pos-product-card-badges">
                    <span class="badge" style="font-size:0.6rem;background:rgba(255,255,255,0.04);color:var(--text-muted);padding:1px 5px;">${p.category}</span>
                    <span class="stock-badge ${hasStock ? 'stock-ok' : 'stock-empty'}" style="font-size:0.6rem;padding:1px 5px;">${hasStock ? totalStock + ' par' : 'Slut'}</span>
                </div>
                <h4 style="margin:0 0 5px 0;font-size:0.9rem;font-weight:700;color:var(--text-primary);line-height:1.2;">${p.name}</h4>
                <div style="display:flex;flex-wrap:wrap;gap:3px;margin-bottom:6px;">${sizePillsHtml}</div>
                <div style="display:flex;flex-direction:column;gap:1px;margin-top:auto;">
                    ${showDiscount
                        ? `<span style="color:var(--text-muted);font-size:0.68rem;text-decoration:line-through;">${formatMoney(originalPrice)}</span>`
                        : `<span style="color:var(--text-muted);font-size:0.68rem;">Nypris: ${formatMoney(originalPrice)}</span>`
                    }
                    <div style="display:flex;align-items:center;gap:5px;">
                        <strong style="color:${showDiscount ? '#4ade80' : 'var(--color-primary)'};font-size:1rem;">${formatMoney(effectivePrice)}</strong>
                        ${showDiscount ? `<span class="badge" style="background:rgba(239,68,68,0.15);color:#ef4444;font-size:0.6rem;font-weight:700;padding:1px 5px;">-${discountPct}%</span>` : ''}
                    </div>
                </div>
            </div>
        `;
        grid.appendChild(card);

    });
}

function openPosVariantSelection(productId) {
    const p = state.products.find(prod => prod.id === productId);
    if (!p) return;
    
    posSelectedProduct = p;
    posSelectedSize = null;
    posSelectedColor = null;
    
    document.getElementById('pos-modal-product-name').textContent = p.name;
    document.getElementById('pos-modal-product-desc').textContent = `${p.category} — Välj storlek och färg nedan för snabbköp.`;
    
    // Sizes grid
    const sizesGrid = document.getElementById('pos-modal-sizes-grid');
    sizesGrid.innerHTML = '';
    const uniqueSizes = Array.from(new Set(p.variants.filter(v => v.stock > 0).map(v => v.size))).sort();
    
    uniqueSizes.forEach(sz => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'btn btn-secondary';
        btn.style.cssText = 'padding: 8px 16px; border-radius: 50%; min-width: 45px; height: 45px; display:inline-flex; align-items:center; justify-content:center; font-weight:bold; font-size:0.9rem; margin-bottom: 5px;';
        btn.textContent = sz;
        btn.onclick = () => {
            document.querySelectorAll('#pos-modal-sizes-grid button').forEach(b => b.className = 'btn btn-secondary');
            btn.className = 'btn btn-primary animate-pulse-accent';
            posSelectedSize = sz;
            posSelectedColor = null;
            updatePosColorsGrid();
            updatePosModalAddBtn();
        };
        sizesGrid.appendChild(btn);
    });
    
    const colorsGrid = document.getElementById('pos-modal-colors-grid');
    colorsGrid.innerHTML = '<span style="font-size:0.8rem; color:var(--text-muted);">Välj storlek först...</span>';
    
    document.getElementById('pos-modal-stock-info').style.display = 'none';
    updatePosModalAddBtn();
    
    showModal('pos-variant-modal');
}

function updatePosColorsGrid() {
    const colorsGrid = document.getElementById('pos-modal-colors-grid');
    if (!colorsGrid || !posSelectedProduct || !posSelectedSize) return;
    
    colorsGrid.innerHTML = '';
    const matchingVariants = posSelectedProduct.variants.filter(v => v.size === posSelectedSize && v.stock > 0);
    
    matchingVariants.forEach(v => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'btn btn-secondary';
        btn.style.cssText = 'padding: 8px 12px; display:inline-flex; align-items:center; gap:8px; border-radius:30px; font-size:0.8rem; font-weight:600; margin-bottom: 5px;';
        
        btn.innerHTML = `
            <span class="color-dot" style="background-color: ${getColorHex(v.color)}; width:12px; height:12px; margin:0;"></span>
            <span>${v.color}</span>
        `;
        
        btn.onclick = () => {
            document.querySelectorAll('#pos-modal-colors-grid button').forEach(b => b.className = 'btn btn-secondary');
            btn.className = 'btn btn-primary animate-pulse-accent';
            posSelectedColor = v.color;
            
            const stockInfo = document.getElementById('pos-modal-stock-info');
            stockInfo.style.display = 'block';
            stockInfo.className = 'badge stock-ok';
            stockInfo.textContent = `Lagersaldo: ${v.stock} par tillgängliga`;
            
            updatePosModalAddBtn();
        };
        colorsGrid.appendChild(btn);
    });
}

function updatePosModalAddBtn() {
    const btn = document.getElementById('pos-modal-add-btn');
    if (!btn) return;
    btn.disabled = !(posSelectedProduct && posSelectedSize && posSelectedColor);
}

function addSelectedToPosCart() {
    if (!posSelectedProduct || !posSelectedSize || !posSelectedColor) return;
    
    const v = posSelectedProduct.variants.find(v => v.size === posSelectedSize && v.color === posSelectedColor);
    if (!v) return;
    
    // original_price = Cinnamon's retail price (ord. nypris)
    const originalPrice = v.original_price || v.selling_price;
    // selling_price on variant = already discounted (project-level from admin)
    // If slider override is active, apply to original_price instead
    const effectivePrice = posOrderDiscountPct > 0
        ? Math.round(originalPrice * (1 - posOrderDiscountPct / 100))
        : v.selling_price;
    
    const existing = posCart.find(item => item.variantId === v.id);
    if (existing) {
        if (existing.quantity + 1 <= v.stock) {
            existing.quantity += 1;
        } else {
            showToast(`Kan inte lägga till fler. Endast ${v.stock} par finns i lager.`, 'warning');
            return;
        }
    } else {
        posCart.push({
            variantId: v.id,
            productName: posSelectedProduct.name,
            category: posSelectedProduct.category,
            size: v.size,
            color: v.color,
            originalPrice: originalPrice,       // ord. nypris (Cinnamon)
            sellingPrice: effectivePrice,        // faktiskt säljpris denna order
            maxStock: v.stock,
            quantity: 1
        });
    }
    
    closeModal('pos-variant-modal');
    renderPosCart();
}

function renderPosCart() {
    const cartItemsContainer = document.getElementById('pos-cart-items');
    if (!cartItemsContainer) return;
    
    // Re-apply order discount to all items in cart (slider may have changed)
    posCart.forEach(item => {
        if (posOrderDiscountPct > 0) {
            item.sellingPrice = Math.round(item.originalPrice * (1 - posOrderDiscountPct / 100));
        } else {
            // Restore to variant's actual selling_price (project level discount)
            const prod = state.products.find(p => p.variants.some(v => v.id === item.variantId));
            if (prod) {
                const variant = prod.variants.find(v => v.id === item.variantId);
                if (variant) item.sellingPrice = variant.selling_price;
            }
        }
    });
    
    cartItemsContainer.innerHTML = '';
    
    if (posCart.length === 0) {
        cartItemsContainer.innerHTML = `
            <div style="text-align:center;padding:40px 20px;color:var(--text-muted);font-size:0.85rem;">
                <i data-lucide="shopping-cart" style="width:36px;height:36px;stroke-width:1.5;margin-bottom:10px;opacity:0.5;"></i>
                <p>Varukorgen är tom.<br>Klicka på en produkt för att lägga till.</p>
            </div>`;
        if (typeof lucide !== 'undefined') lucide.createIcons();
        document.getElementById('pos-total-items-count').textContent = '0 st';
        document.getElementById('pos-cart-total-price').textContent = '0 kr';
        document.getElementById('pos-checkout-btn').disabled = true;
        document.getElementById('pos-original-price-row').style.display = 'none';
        document.getElementById('pos-savings-row').style.display = 'none';
        
        // Update mobile cart badge
        const mobBadge = document.getElementById('pos-mobile-cart-badge');
        if (mobBadge) mobBadge.textContent = '0';
        return;
    }
    
    let totalQty = 0;
    let totalDiscountedPrice = 0;
    let totalOriginalPrice = 0;
    
    posCart.forEach((item, index) => {
        totalQty += item.quantity;
        totalDiscountedPrice += item.sellingPrice * item.quantity;
        totalOriginalPrice += item.originalPrice * item.quantity;
        
        const hasDiscount = item.sellingPrice < item.originalPrice;
        const itemDiscountPct = hasDiscount ? Math.round((1 - item.sellingPrice / item.originalPrice) * 100) : 0;
        
        const div = document.createElement('div');
        div.style.cssText = 'padding:10px 12px;background:rgba(255,255,255,0.02);border:1px solid var(--border-light);border-radius:var(--radius-sm);';
        
        div.innerHTML = `
            <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px;">
                <div style="flex:1;">
                    <div style="font-weight:700;font-size:0.88rem;color:var(--text-primary);">${item.productName}</div>
                    <div style="font-size:0.72rem;color:var(--text-muted);margin-top:1px;">Stl ${item.size} | ${item.color}</div>
                </div>
                <button onclick="removePosCartItem(${index})" class="btn btn-ghost btn-icon btn-xs" style="color:var(--color-danger);padding:2px;" title="Ta bort">
                    <i data-lucide="x" style="width:13px;height:13px;"></i>
                </button>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:center;">
                <div style="display:flex;align-items:center;gap:6px;">
                    <div class="stock-adjust-group" style="margin:0;">
                        <button class="btn-stock-adj minus-btn" onclick="adjustPosCartQty(${index}, -1)" style="padding:2px 8px;">-</button>
                        <span class="stock-display" style="font-size:0.85rem;min-width:24px;">${item.quantity}</span>
                        <button class="btn-stock-adj plus-btn" onclick="adjustPosCartQty(${index}, 1)" style="padding:2px 8px;">+</button>
                    </div>
                    <span style="font-size:0.72rem;color:var(--text-muted);">par</span>
                </div>
                <div style="text-align:right;">
                    ${hasDiscount ? `<div style="font-size:0.72rem;color:var(--text-muted);text-decoration:line-through;">${formatMoney(item.originalPrice * item.quantity)}</div>` : ''}
                    <div style="display:flex;align-items:center;gap:5px;">
                        <strong style="color:${hasDiscount ? '#4ade80' : 'var(--text-primary)'};font-size:0.92rem;">${formatMoney(item.sellingPrice * item.quantity)}</strong>
                        ${hasDiscount ? `<span class="badge" style="background:rgba(239,68,68,0.15);color:#ef4444;font-size:0.6rem;font-weight:700;padding:1px 4px;">-${itemDiscountPct}%</span>` : ''}
                    </div>
                </div>
            </div>`;
        cartItemsContainer.appendChild(div);
    });
    
    const savings = totalOriginalPrice - totalDiscountedPrice;
    
    document.getElementById('pos-total-items-count').textContent = `${totalQty} st`;
    document.getElementById('pos-cart-total-price').textContent = formatMoney(totalDiscountedPrice);
    document.getElementById('pos-checkout-btn').disabled = false;
    
    const origRow = document.getElementById('pos-original-price-row');
    const savingsRow = document.getElementById('pos-savings-row');
    if (savings > 0) {
        origRow.style.display = 'flex';
        savingsRow.style.display = 'flex';
        document.getElementById('pos-original-total').textContent = formatMoney(totalOriginalPrice);
        document.getElementById('pos-savings-amount').textContent = formatMoney(savings);
    } else {
        origRow.style.display = 'none';
        savingsRow.style.display = 'none';
    }
    
    // Update mobile cart badge
    const mobBadge = document.getElementById('pos-mobile-cart-badge');
    if (mobBadge) mobBadge.textContent = totalQty;
    
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

function adjustPosCartQty(index, change) {
    const item = posCart[index];
    if (!item) return;
    
    const newQty = item.quantity + change;
    if (newQty <= 0) {
        removePosCartItem(index);
    } else if (newQty > item.maxStock) {
        showToast(`Kan inte öka antal. Endast ${item.maxStock} par finns i lager.`, 'warning');
    } else {
        item.quantity = newQty;
        renderPosCart();
    }
}

function removePosCartItem(index) {
    posCart.splice(index, 1);
    renderPosCart();
}

function clearPosCart() {
    posCart = [];
    renderPosCart();
}

async function checkoutPosOrder() {
    if (posCart.length === 0) return;
    
    const checkoutBtn = document.getElementById('pos-checkout-btn');
    const oldText = checkoutBtn.innerHTML;
    checkoutBtn.disabled = true;
    checkoutBtn.innerHTML = '<span class="spinner" style="width:16px;height:16px;border-width:2px;display:inline-block;margin-right:8px;"></span>Bearbetar köp...';
    
    // Build payload with actual discounted selling_price
    const items = posCart.map(item => ({
        variantId: item.variantId,
        quantity: item.quantity,
        selling_price: item.sellingPrice   // actual price sold for (economics tracking)
    }));
    
    try {
        const res = await fetch('/api/pos/checkout', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ items })
        });
        
        const data = await res.json();
        if (data.success) {
            checkoutBtn.className = 'btn btn-success btn-full btn-lg animate-pulse-accent';
            checkoutBtn.innerHTML = '<i data-lucide="check-circle" style="margin-right:8px;"></i>Köp registrerat! 🎉';
            if (typeof lucide !== 'undefined') lucide.createIcons();
            
            posCart = [];
            // Reset order discount slider
            posOrderDiscountPct = 0;
            const slider = document.getElementById('pos-order-discount');
            if (slider) slider.value = 0;
            updatePosOrderDiscount(0);
            
            setTimeout(async () => {
                checkoutBtn.className = 'btn btn-primary btn-full btn-lg';
                checkoutBtn.innerHTML = oldText;
                if (typeof lucide !== 'undefined') lucide.createIcons();
                await loadInventory();
                loadPosProducts();
                renderPosCart();
            }, 2000);
        } else {
            showToast(data.error || "Ett fel uppstod under betalningen.", 'error');
            checkoutBtn.disabled = false;
            checkoutBtn.innerHTML = oldText;
            if (typeof lucide !== 'undefined') lucide.createIcons();
        }
    } catch (e) {
        showToast("Ett nätverksfel uppstod.", 'error');
        checkoutBtn.disabled = false;
        checkoutBtn.innerHTML = oldText;
        if (typeof lucide !== 'undefined') lucide.createIcons();
    }
}

function toggleMobileCart(show) {
    const posWrapper = document.querySelector('.pos-wrapper');
    if (posWrapper) {
        if (show) {
            posWrapper.classList.add('show-cart');
        } else {
            posWrapper.classList.remove('show-cart');
        }
    }
}


// ==================== PUBLIC CUSTOMER CATALOG & BOOKING SYSTEM ====================

// Public State Filter Properties
state.publicProducts = [];
state.publicSelectedCategory = 'all';
state.publicSelectedSize = 'all';
state.publicSearchQuery = '';
state.publicMaxPrice = null;

// In-memory active booking variables
let activeBookingVariant = null;

function initPublicCatalog() {
    // Show login modal trigger
    const showLoginBtn = document.getElementById('show-login-modal-btn');
    if (showLoginBtn) {
        showLoginBtn.addEventListener('click', () => {
            const loginModal = document.getElementById('login-modal-overlay');
            if (loginModal) {
                loginModal.classList.remove('hide');
                document.body.style.overflow = 'hidden';
            }
        });
    }

    // Public Filters
    const publicSearchInput = document.getElementById('public-search');
    if (publicSearchInput) {
        publicSearchInput.addEventListener('input', (e) => {
            state.publicSearchQuery = e.target.value.toLowerCase().trim();
            renderPublicCatalog();
        });
    }

    const publicCategoryFilter = document.getElementById('public-category-filter');
    if (publicCategoryFilter) {
        publicCategoryFilter.addEventListener('change', (e) => {
            state.publicSelectedCategory = e.target.value;
            renderPublicCatalog();
        });
    }

    const publicSizeFilter = document.getElementById('public-size-filter');
    if (publicSizeFilter) {
        publicSizeFilter.addEventListener('change', (e) => {
            state.publicSelectedSize = e.target.value;
            renderPublicCatalog();
        });
    }

    const publicMaxPriceInput = document.getElementById('public-max-price');
    if (publicMaxPriceInput) {
        publicMaxPriceInput.addEventListener('input', (e) => {
            const val = e.target.value.trim();
            state.publicMaxPrice = val !== '' ? parseFloat(val) : null;
            renderPublicCatalog();
        });
    }

    // Form submission
    const bookingForm = document.getElementById('public-booking-form');
    if (bookingForm) {
        bookingForm.addEventListener('submit', handlePublicBookingSubmit);
    }

    // Load actual products
    loadPublicProducts();
}

async function loadPublicProducts() {
    try {
        const response = await fetch('/api/public/products');
        if (!response.ok) throw new Error("Kunde inte läsa produktregister.");
        const data = await response.json();
        
        state.publicProducts = data;
        
        // Extract filters dynamically
        populatePublicFilters();
        
        // Initial render
        renderPublicCatalog();
    } catch (e) {
        console.error("Fel vid laddning av kundkatalog:", e);
        const grid = document.getElementById('public-catalog-grid');
        if (grid) {
            grid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: var(--color-danger); padding: 40px 10px;">
                <i data-lucide="alert-triangle" style="width:40px; height:40px; margin-bottom:10px;"></i>
                <h3>Ett fel uppstod vid laddning av katalogen</h3>
                <p>Vänligen försök igen senare.</p>
            </div>`;
            if (typeof lucide !== 'undefined') lucide.createIcons();
        }
    }
}

function populatePublicFilters() {
    const categories = new Set();
    const sizes = new Set();
    
    state.publicProducts.forEach(p => {
        if (p.category) categories.add(p.category.trim());
        if (p.variants) {
            p.variants.forEach(v => {
                if (v.stock > 0 && v.size) {
                    sizes.add(v.size.toString().trim());
                }
            });
        }
    });

    const categorySelect = document.getElementById('public-category-filter');
    if (categorySelect) {
        categorySelect.innerHTML = '<option value="all">Alla kategorier</option>';
        Array.from(categories).sort().forEach(cat => {
            categorySelect.innerHTML += `<option value="${cat}">${cat}</option>`;
        });
    }

    const sizeSelect = document.getElementById('public-size-filter');
    if (sizeSelect) {
        sizeSelect.innerHTML = '<option value="all">Alla storlekar</option>';
        Array.from(sizes).sort((a,b) => parseFloat(a) - parseFloat(b)).forEach(sz => {
            sizeSelect.innerHTML += `<option value="${sz}">Storlek ${sz}</option>`;
        });
    }
}

function renderPublicCatalog() {
    const grid = document.getElementById('public-catalog-grid');
    const emptyState = document.getElementById('public-empty-state');
    if (!grid) return;
    
    grid.innerHTML = '';
    let matchesCount = 0;
    
    state.publicProducts.forEach(p => {
        // Apply search query filter (name, description, category, size, color)
        const matchSearch = !state.publicSearchQuery || 
            p.name.toLowerCase().includes(state.publicSearchQuery) || 
            (p.description && p.description.toLowerCase().includes(state.publicSearchQuery)) ||
            p.category.toLowerCase().includes(state.publicSearchQuery) ||
            (p.variants && p.variants.some(v => 
                v.size.toString().toLowerCase().includes(state.publicSearchQuery) ||
                (v.color && v.color.toLowerCase().includes(state.publicSearchQuery))
            ));
            
        // Apply category filter
        const matchCategory = state.publicSelectedCategory === 'all' || p.category === state.publicSelectedCategory;
        
        // Filter variants that match size filter
        let filteredVariants = p.variants || [];
        if (state.publicSelectedSize !== 'all') {
            filteredVariants = filteredVariants.filter(v => v.size.toString() === state.publicSelectedSize.toString());
        }
        
        // Also filter variants by search query on size/color if search is active
        if (state.publicSearchQuery) {
            const q = state.publicSearchQuery;
            const sizeOrColorMatch = filteredVariants.some(v => 
                v.size.toString().toLowerCase().includes(q) ||
                (v.color && v.color.toLowerCase().includes(q))
            );
            // Only filter to matching variants if query is a size/color match (not a name/desc/cat match)
            const nameDescCatMatch = p.name.toLowerCase().includes(q) || 
                (p.description && p.description.toLowerCase().includes(q)) ||
                p.category.toLowerCase().includes(q);
            if (!nameDescCatMatch && sizeOrColorMatch) {
                filteredVariants = filteredVariants.filter(v =>
                    v.size.toString().toLowerCase().includes(q) ||
                    (v.color && v.color.toLowerCase().includes(q))
                );
            }
        }
        
        // Filter variants by max price if set
        if (state.publicMaxPrice !== null) {
            filteredVariants = filteredVariants.filter(v => v.selling_price <= state.publicMaxPrice);
        }
        
        // Product must have variants and match search/category filters to be displayed
        if (matchSearch && matchCategory && filteredVariants.length > 0) {
            matchesCount++;
            
            // Render the card
            const defaultVariant = filteredVariants[0];
            const card = document.createElement('div');
            card.className = 'product-card glass-card';
            card.id = `public-product-${p.id}`;
            
            // Calculate initial discount
            const hasDiscount = defaultVariant.original_price > defaultVariant.selling_price;
            const discountPct = hasDiscount ? Math.round(((defaultVariant.original_price - defaultVariant.selling_price) / defaultVariant.original_price) * 100) : 0;
            
            // Build the variants pills
            let pillsHtml = '';
            filteredVariants.forEach((v, index) => {
                pillsHtml += `<button type="button" class="variant-pill-btn ${index === 0 ? 'active' : ''}" 
                    data-variant-id="${v.id}"
                    onclick="selectPublicVariant(this, ${p.id}, ${v.id}, '${v.sku}', ${v.selling_price}, ${v.original_price}, ${v.stock}, '${v.size}', '${v.color}')">
                    ${v.size} (${v.color})
                </button>`;
            });

            card.innerHTML = `
                <div class="product-card-badge">
                    <span class="category-tag">${p.category}</span>
                </div>
                
                <!-- Variant image wrapper with fallback shadow box -->
                <div class="shoe-photo-box">
                    <img id="img-${p.id}" src="/static/shoe_images/${defaultVariant.sku}.jpg" alt="${p.name}" onerror="handlePublicImageError(this, '${p.name}')">
                </div>
                
                <div class="product-card-body">
                    <h3 class="product-title">${p.name}</h3>
                    <p class="product-desc" style="font-size:0.85rem; color:var(--text-secondary); margin-bottom:15px; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;">
                        ${p.description || 'Ingen tillgänglig beskrivning.'}
                    </p>
                    
                    <div class="selection-section" style="margin-bottom:15px;">
                        <span style="font-size:0.75rem; color:var(--text-muted); display:block; margin-bottom:6px; font-weight:600; text-transform:uppercase;">Välj variant (storlek/färg):</span>
                        <div class="variant-pills-container" style="display:flex; flex-wrap:wrap; gap:6px; max-height: 80px; overflow-y: auto; padding-right:4px;">
                            ${pillsHtml}
                        </div>
                    </div>
                    
                    <div class="card-footer-row" style="display:flex; justify-content:space-between; align-items:center; margin-top:15px; border-top:1px solid var(--border-light); padding-top:12px;">
                        <div class="price-block" style="display:flex; flex-direction:column; gap:2px;">
                            <div style="display:flex; align-items:baseline; gap:8px;">
                                <span class="selling-price" id="price-${p.id}" style="font-size:1.15rem; font-weight:800; color:var(--text-primary);">${defaultVariant.selling_price} kr</span>
                                <span class="original-price ${hasDiscount ? '' : 'hide'}" id="orig-price-${p.id}" style="font-size:0.85rem; text-decoration:line-through; color:var(--text-muted);">${defaultVariant.original_price} kr</span>
                            </div>
                            <span class="discount-badge ${hasDiscount ? '' : 'hide'}" id="discount-${p.id}" style="font-size:0.7rem; background:rgba(239,68,68,0.15); color:var(--color-danger); border:1px solid rgba(239,68,68,0.25); border-radius:4px; padding:1px 6px; width:fit-content; font-weight:700;">-${discountPct}% rabatt</span>
                        </div>
                        
                        <button type="button" class="btn btn-accent btn-sm" id="book-btn-${p.id}" style="display:flex; align-items:center; gap:6px; padding:8px 14px;" 
                            onclick="openPublicBookingModal(${p.id}, ${defaultVariant.id}, '${p.name}', '${defaultVariant.size}', '${defaultVariant.color}', ${defaultVariant.selling_price})">
                            <i data-lucide="calendar-plus" style="width:14px; height:14px;"></i>
                            <span>Boka</span>
                        </button>
                    </div>
                </div>
            `;
            grid.appendChild(card);
        }
    });

    if (matchesCount === 0) {
        emptyState.classList.remove('hide');
    } else {
        emptyState.classList.add('hide');
    }
    
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

function handlePublicImageError(img, name) {
    img.style.display = 'none';
    const parent = img.parentElement;
    parent.classList.add('fallback-box');
    
    // Check if fallback label already exists to prevent duplicate icons
    if (!parent.querySelector('.fallback-icon-wrapper')) {
        parent.innerHTML = `
            <div class="fallback-icon-wrapper" style="display:flex; flex-direction:column; align-items:center; justify-content:center; gap:10px; width:100%; height:100%;">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" style="width:48px; height:48px; color:var(--color-primary); opacity:0.65;">
                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                    <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
                    <line x1="12" y1="22.08" x2="12" y2="12"/>
                </svg>
                <span style="font-size:0.7rem; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.5px; font-weight:600;">Bild saknas</span>
            </div>
        `;
    }
}

function selectPublicVariant(btn, productId, variantId, sku, sellingPrice, originalPrice, stock, size, color) {
    const siblings = btn.parentElement.querySelectorAll('.variant-pill-btn');
    siblings.forEach(s => s.classList.remove('active'));
    btn.classList.add('active');
    
    // Update Image
    const img = document.getElementById(`img-${productId}`);
    if (img) {
        const parent = img.parentElement;
        if (parent.classList.contains('fallback-box')) {
            parent.classList.remove('fallback-box');
            parent.innerHTML = `<img id="img-${productId}" src="/static/shoe_images/${sku}.jpg" alt="Produkt" onerror="handlePublicImageError(this, 'Produkt')">`;
        } else {
            img.src = `/static/shoe_images/${sku}.jpg`;
            img.style.display = 'block';
        }
    }
    
    // Update Prices
    const priceEl = document.getElementById(`price-${productId}`);
    const origPriceEl = document.getElementById(`orig-price-${productId}`);
    const discountEl = document.getElementById(`discount-${productId}`);
    
    if (priceEl) priceEl.textContent = `${sellingPrice} kr`;
    
    if (originalPrice > sellingPrice) {
        if (origPriceEl) {
            origPriceEl.textContent = `${originalPrice} kr`;
            origPriceEl.classList.remove('hide');
        }
        if (discountEl) {
            const discountPct = Math.round(((originalPrice - sellingPrice) / originalPrice) * 100);
            discountEl.textContent = `-${discountPct}% rabatt`;
            discountEl.classList.remove('hide');
        }
    } else {
        if (origPriceEl) origPriceEl.classList.add('hide');
        if (discountEl) discountEl.classList.add('hide');
    }
    
    // Update booking button onclick
    const bookBtn = document.getElementById(`book-btn-${productId}`);
    if (bookBtn) {
        bookBtn.setAttribute('onclick', `openPublicBookingModal(${productId}, ${variantId}, 'Produkt', '${size}', '${color}', ${sellingPrice})`);
    }
}

function openPublicBookingModal(productId, variantId, productName, size, color, price) {
    // Lookup full product name from state for accurate summary
    const prod = state.publicProducts.find(p => p.id === productId);
    const finalName = prod ? prod.name : productName;
    const finalCategory = prod ? prod.category : '';
    
    activeBookingVariant = {
        id: variantId,
        productName: finalName,
        category: finalCategory,
        size: size,
        color: color,
        price: price
    };
    
    document.getElementById('booking-variant-id').value = variantId;
    
    const summary = document.getElementById('public-booking-summary');
    if (summary) {
        summary.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <div>
                    <h4 style="margin:0; color:var(--text-primary); font-size:1rem;">${finalName}</h4>
                    <span style="font-size:0.75rem; color:var(--text-muted);">${finalCategory} &bull; Färg: ${color}</span>
                </div>
                <div style="text-align:right;">
                    <span style="font-size:1.1rem; font-weight:800; color:var(--color-accent); display:block;">Storlek ${size}</span>
                    <span style="font-size:0.85rem; color:var(--text-secondary); font-weight:600;">Pris: ${price} kr</span>
                </div>
            </div>
        `;
    }
    
    // Reset fields
    document.getElementById('booking-first-name').value = '';
    document.getElementById('booking-last-name').value = '';
    document.getElementById('booking-phone').value = '';
    
    const modal = document.getElementById('public-booking-modal');
    if (modal) {
        modal.classList.remove('hide');
        document.body.style.overflow = 'hidden';
    }
}

async function handlePublicBookingSubmit(e) {
    e.preventDefault();
    
    const variantId = parseInt(document.getElementById('booking-variant-id').value);
    const firstName = document.getElementById('booking-first-name').value.trim();
    const lastName = document.getElementById('booking-last-name').value.trim();
    const phone = document.getElementById('booking-phone').value.trim();
    
    if (!variantId || !firstName || !lastName || !phone) {
        showToast("Vänligen fyll i alla fält.", 'warning');
        return;
    }
    
    try {
        const response = await fetch('/api/public/bookings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                variant_id: variantId,
                first_name: firstName,
                last_name: lastName,
                phone: phone
            })
        });
        
        const data = await response.json();
        if (response.ok) {
            closeModal('public-booking-modal');
            
            // Open success modal
            const successModal = document.getElementById('booking-success-modal');
            if (successModal) {
                successModal.classList.remove('hide');
                document.body.style.overflow = 'hidden';
            }
            
            // Reload catalog list to update stock amounts
            loadPublicProducts();
        } else {
            showToast(data.error || "Det gick inte att slutföra bokningen.", 'error');
        }
    } catch (err) {
        showToast("Ett nätverksfel uppstod. Kontrollera din anslutning.", 'error');
    }
}


// ==================== ADMIN RESERVATIONS / BOOKINGS CRM ====================

// Cache bookings data
state.bookings = [];

async function loadBookings() {
    const tbody = document.getElementById('bookings-tbody');
    if (!tbody) return;
    
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color: var(--text-muted); padding:30px;">Laddar bokningar...</td></tr>';
    
    try {
        const response = await fetch('/api/bookings');
        if (response.status === 401) {
            window.location.reload();
            return;
        }
        const data = await response.json();
        state.bookings = data;
        renderBookings();
    } catch (e) {
        console.error("Fel vid laddning av bokningar:", e);
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color: var(--color-danger); padding:30px;">Kunde inte hämta bokningar från servern.</td></tr>';
    }
}

function renderBookings() {
    updateBookingsBadge();
    const tbody = document.getElementById('bookings-tbody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    const searchQuery = (document.getElementById('bookings-search-input')?.value || '').toLowerCase().trim();
    const statusFilter = document.getElementById('bookings-status-filter')?.value || 'all';
    
    let filteredBookings = state.bookings;
    
    // Status Filter
    if (statusFilter !== 'all') {
        filteredBookings = filteredBookings.filter(b => b.status === statusFilter);
    }
    
    // Search Query Filter
    if (searchQuery) {
        filteredBookings = filteredBookings.filter(b => {
            const customerName = `${b.customer_first_name} ${b.customer_last_name}`.toLowerCase();
            return customerName.includes(searchQuery) ||
                b.customer_phone.includes(searchQuery) ||
                b.product_name.toLowerCase().includes(searchQuery) ||
                (b.sku && b.sku.toLowerCase().includes(searchQuery));
        });
    }
    
    if (filteredBookings.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color: var(--text-muted); padding:40px;">Inga bokningar matchar dina filter.</td></tr>';
        return;
    }
    
    filteredBookings.forEach(b => {
        const tr = document.createElement('tr');
        
        // Status Badge
        let statusBadge = '';
        if (b.status === 'pending') {
            statusBadge = '<span class="badge" style="white-space: nowrap; background:rgba(245,158,11,0.15); color:#fbbf24; border:1px solid rgba(245,158,11,0.3);">Ny</span>';
        } else if (b.status === 'reserved') {
            statusBadge = '<span class="badge" style="white-space: nowrap; background:rgba(59,130,246,0.15); color:#60a5fa; border:1px solid rgba(59,130,246,0.3);">Bokad</span>';
        } else if (b.status === 'confirmed') {
            statusBadge = '<span class="badge" style="white-space: nowrap; background:rgba(16,185,129,0.15); color:#34d399; border:1px solid rgba(16,185,129,0.3);">Köpt</span>';
        } else {
            statusBadge = '<span class="badge" style="white-space: nowrap; background:rgba(239,68,68,0.15); color:#f87171; border:1px solid rgba(239,68,68,0.3);">Nekad</span>';
        }
        
        // Actions
        let actionsHtml = '';
        if (b.status === 'pending') {
            actionsHtml = `
                <div style="display:flex; gap:8px; justify-content:flex-end;">
                    <button class="btn btn-sm btn-booking-blue" style="padding:5px 10px; font-size:0.75rem; display:flex; align-items:center; gap:4px;" onclick="reserveBooking(${b.id})" title="Markera som bokad och lägg undan produkterna">
                        <i data-lucide="bookmark" style="width:12px; height:12px;"></i>
                        <span>Bokad</span>
                    </button>
                    <button class="btn btn-sm btn-booking-red" style="padding:5px 10px; font-size:0.75rem; display:flex; align-items:center; gap:4px;" onclick="cancelBooking(${b.id})" title="Neka / Avbryt bokning">
                        <i data-lucide="x" style="width:12px; height:12px;"></i>
                        <span>Neka</span>
                    </button>
                </div>
            `;
        } else if (b.status === 'reserved') {
            actionsHtml = `
                <div style="display:flex; gap:8px; justify-content:flex-end;">
                    <button class="btn btn-sm btn-booking-green" style="padding:5px 10px; font-size:0.75rem; display:flex; align-items:center; gap:4px;" onclick="confirmBooking(${b.id})" title="Godkänn och logga som köp">
                        <i data-lucide="check" style="width:12px; height:12px;"></i>
                        <span>Köpt</span>
                    </button>
                    <button class="btn btn-sm btn-booking-red" style="padding:5px 10px; font-size:0.75rem; display:flex; align-items:center; gap:4px;" onclick="cancelBooking(${b.id})" title="Neka / Avbryt bokning">
                        <i data-lucide="x" style="width:12px; height:12px;"></i>
                        <span>Neka</span>
                    </button>
                </div>
            `;
        } else {
            actionsHtml = '<span style="font-size:0.75rem; color:var(--text-muted);">Slutförd</span>';
        }
        
        // Date Formatter
        const dateStr = b.created_at ? new Date(b.created_at.replace(' ', 'T')).toLocaleDateString('sv-SE', {
            hour: '2-digit',
            minute: '2-digit'
        }) : 'Okänt datum';

        tr.innerHTML = `
            <td data-label="Bokning ID">#${b.id}</td>
            <td data-label="Produkt &amp; Detaljer">
                <strong style="color:var(--text-primary); font-size: 0.95rem;">${b.product_name}</strong>
                <span style="display:block; font-size:0.75rem; color:var(--text-muted); margin-top: 4px;">
                    Storlek <span class="badge stock-ok" style="font-weight:700; padding: 2px 6px; font-size: 0.7rem; margin-right: 4px;">${b.size}</span> &bull; Färg: ${b.color} &bull; Pris: <strong>${b.selling_price} kr</strong>
                </span>
                <span style="display:block; font-size:0.68rem; color:var(--text-muted); opacity: 0.7; margin-top: 2px;">
                    ${b.product_category || 'Produkt'} &bull; ${b.sku || 'Inget SKU'}
                </span>
            </td>
            <td data-label="Kund &amp; Kontakt">
                <strong style="color:var(--text-primary); font-size: 0.95rem;">${b.customer_first_name} ${b.customer_last_name}</strong>
                <span style="display:block; font-size:0.75rem; margin-top: 4px;">
                    <a href="tel:${b.customer_phone}" style="color:var(--color-accent); text-decoration:none; font-weight:600;">
                        <i data-lucide="phone" style="width:10px; height:10px; display:inline-block; vertical-align:middle; margin-right:4px;"></i>${b.customer_phone}
                    </a>
                </span>
                <span style="display:block; font-size:0.7rem; color:var(--text-muted); margin-top: 2px;">
                    <i data-lucide="calendar" style="width:10px; height:10px; display:inline-block; vertical-align:middle; margin-right:4px;"></i>${dateStr}
                </span>
            </td>
            <td data-label="Status">${statusBadge}</td>
            <td data-label="Åtgärder" style="text-align:right;">${actionsHtml}</td>
        `;
        
        tbody.appendChild(tr);
    });
    
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

function filterBookings() {
    renderBookings();
}

async function confirmBooking(bookingId) {
    const confirmed = await showConfirm({
        title: 'Bekräfta köp',
        msg: 'Vill du bekräfta att kunden har köpt produkterna? Detta registrerar en försäljning i kassaflödet och låser bokningen.',
        type: 'success',
        okLabel: 'Ja, bekräfta köp',
        okBtnClass: 'btn-success'
    });
    if (!confirmed) return;
    
    try {
        const response = await fetch(`/api/bookings/${bookingId}/confirm`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        
        const data = await response.json();
        if (response.ok) {
            loadBookings();
            
            // If the user has the analytics open, we should flag reload
            if (state.activeTab === 'analytics') {
                loadAnalytics();
            }
        } else {
            showToast(data.error || "Kunde inte godkänna bokningen.", 'error');
        }
    } catch (e) {
        showToast("Ett nätverksfel uppstod vid bekräftelsen.", 'error');
    }
}

async function cancelBooking(bookingId) {
    const confirmed = await showConfirm({
        title: 'Avbryt bokning',
        msg: 'Vill du neka/avbryta denna bokning? Produkten återförs automatiskt till lagersaldot och görs tillgänglig igen.',
        type: 'warning',
        okLabel: 'Ja, avbryt bokning'
    });
    if (!confirmed) return;
    
    try {
        const response = await fetch(`/api/bookings/${bookingId}/cancel`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        
        const data = await response.json();
        if (response.ok) {
            loadBookings();
        } else {
            showToast(data.error || "Kunde inte avbryta bokningen.", 'error');
        }
    } catch (e) {
        showToast("Ett nätverksfel uppstod vid avbrutandet.", 'error');
    }
}

async function reserveBooking(bookingId) {
    try {
        const response = await fetch(`/api/bookings/${bookingId}/reserve`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        
        const data = await response.json();
        if (response.ok) {
            loadBookings();
        } else {
            showToast(data.error || "Kunde inte markera som bokad.", 'error');
        }
    } catch (e) {
        showToast("Ett nätverksfel uppstod.", 'error');
    }
}

// ==================== BOOKINGS REAL-TIME NOTIFICATIONS ====================
function updateBookingsBadge() {
    const badge = document.getElementById('bookings-notif-badge');
    if (!badge) return;
    
    // Count pending bookings only
    const pendingCount = state.bookings.filter(b => b.status === 'pending').length;
    
    if (pendingCount > 0) {
        badge.textContent = pendingCount;
        badge.classList.remove('hide');
    } else {
        badge.textContent = '0';
        badge.classList.add('hide');
    }
}

async function fetchAndRefreshBookingsBadge() {
    // If the login button exists, we are in customer view. Do not poll to avoid 401s.
    if (document.getElementById('login-btn')) return;
    
    try {
        const response = await fetch('/api/bookings');
        if (response.status === 401) {
            // Unauthorized (session expired), do not redirect in background, just stop
            return;
        }
        if (!response.ok) return;
        const data = await response.json();
        state.bookings = data;
        updateBookingsBadge();
        
        // If they are currently active on the bookings tab, also live-update the list!
        if (state.activeTab === 'bookings') {
            renderBookings();
        }
    } catch (e) {
        console.error("Fel vid bakgrundsuppdatering av bokningsnotiser:", e);
    }
}

// ==================== PWA PROGRESSIVE WEB APP SETUP ====================
let deferredPrompt = null;

function initPWA() {
    // 1. Register Service Worker
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/sw.js')
                .then(reg => {
                    console.log('[PWA] Service Worker registrerad med scope:', reg.scope);
                })
                .catch(err => {
                    console.error('[PWA] Service Worker registrering misslyckades:', err);
                });
        });
    }
    
    // 2. Listen for BeforeInstallPrompt event
    window.addEventListener('beforeinstallprompt', (e) => {
        // Prevent Chrome 67 and earlier from automatically showing the prompt
        e.preventDefault();
        // Stash the event so it can be triggered later.
        deferredPrompt = e;
        
        console.log('[PWA] beforeinstallprompt triggad. Appen är redo att installeras!');
        
        // Only show install UI on mobile/tablet devices, not on desktop
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) 
                      || (window.innerWidth <= 768 && 'ontouchstart' in window);
        
        if (!isMobile) {
            console.log('[PWA] Desktop-enhet detekterad – installationsknapp döljs.');
            return;
        }
        
        // Show install button in Settings Modal (for staff)
        const settingsInstallSection = document.getElementById('pwa-install-section');
        if (settingsInstallSection) {
            settingsInstallSection.classList.remove('hide');
        }
        
        // Show install button in Public Header (for customers / visitor view)
        const publicInstallBtn = document.getElementById('pwa-public-install-btn');
        if (publicInstallBtn) {
            publicInstallBtn.classList.remove('hide');
        }
    });
    
    // Helper function to execute installation
    const triggerInstall = async () => {
        if (!deferredPrompt) return;
        
        // Show the install prompt
        deferredPrompt.prompt();
        
        // Wait for the user to respond to the prompt
        const { outcome } = await deferredPrompt.userChoice;
        console.log(`[PWA] Användarens val för installation: ${outcome}`);
        
        // We've used the prompt, and can't use it again, discard it
        deferredPrompt = null;
        
        // Hide our custom buttons/sections
        hidePwaInstallUI();
    };
    
    // Bind click events
    const installBtn = document.getElementById('pwa-install-btn');
    if (installBtn) {
        installBtn.addEventListener('click', triggerInstall);
    }
    
    const publicInstallBtn = document.getElementById('pwa-public-install-btn');
    if (publicInstallBtn) {
        publicInstallBtn.addEventListener('click', triggerInstall);
    }
    
    // 3. Listen for AppInstalled event
    window.addEventListener('appinstalled', (evt) => {
        console.log('[PWA] LAGERPRO installerades framgångsrikt!');
        hidePwaInstallUI();
    });
}

function hidePwaInstallUI() {
    const settingsInstallSection = document.getElementById('pwa-install-section');
    if (settingsInstallSection) {
        settingsInstallSection.classList.add('hide');
    }
    const publicInstallBtn = document.getElementById('pwa-public-install-btn');
    if (publicInstallBtn) {
        publicInstallBtn.classList.add('hide');
    }
}


