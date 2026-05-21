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
    allowedProjects: 'all'
};

let posCart = [];
let posSelectedProduct = null;
let posSelectedSize = null;
let posSelectedColor = null;

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

async function initApp() {
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
    
    detectSystemPaths();
    
    const loginBtn = document.getElementById('login-btn');
    if (loginBtn) {
        initLoginWall();
    } else {
        await loadSessionInfo();
        loadInventory();
        setupEventListeners();
    }
}

function detectSystemPaths() {
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn && !isLocal) {
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
    
    dropdown.innerHTML = '<option value="all">Alla skoarter (Alla tillåtna projekt)</option>';
    if (hubDropdown) {
        hubDropdown.innerHTML = '<option value="all">Alla projekt / Skoarter</option>';
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
    
    dropdown.value = currentValue;
    if (hubDropdown) hubDropdown.value = currentHubValue;
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
                    <td class="cell-color">
                        <span class="color-dot" style="background-color: ${getColorHex(v.color)};"></span>
                        <span>${v.color}</span>
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
                ${state.userRole === 'admin' ? `
                <div class="prod-card-actions">
                    <button class="btn btn-ghost btn-icon btn-sm" onclick="editProduct(${p.id})" title="Redigera">
                        <i data-lucide="edit-3" style="width: 16px; height: 16px;"></i>
                    </button>
                    <button class="btn btn-ghost btn-icon btn-sm" onclick="deleteProduct(${p.id})" style="color: var(--color-danger);" title="Ta bort">
                        <i data-lucide="trash-2" style="width: 16px; height: 16px;"></i>
                    </button>
                </div>
                ` : ''}
            </div>
            <div class="product-card-body">
                <table class="variants-list">
                    <thead>
                        <tr>
                            <th>Storlek</th>
                            <th>Färg</th>
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
        tipText.innerHTML = "Inga sko-paket registrerade än. Ladda upp en Excel-fil för att påbörja din nollpunktsanalys!";
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
            
            tipText.innerHTML = `<span style="color:var(--color-success); font-weight:700;">Grattis! Hela din sko-investering är betald.</span> Varje krona du säljer för nu är ren nettovinst rakt ner i fickan!`;
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
                    Inga försäljningar registrerade än. Minska lagersaldot på en sko för att skapa en försäljning!
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
    document.getElementById('product-modal-title').textContent = "Registrera Ny Sko";
    document.getElementById('product-form').reset();
    document.getElementById('prod-desc').value = '';
    
    const tbody = document.getElementById('variants-tbody');
    tbody.innerHTML = '';
    
    addVariantRow();
    
    showModal('product-modal');
}

function addVariantRow(size = '', color = '', stock = '0', pPrice = '0', sPrice = '399', sku = '', oPrice = '') {
    const tbody = document.getElementById('variants-tbody');
    const row = document.createElement('tr');
    row.className = 'variant-edit-row';
    const activeOPrice = oPrice || sPrice || '399';
    row.innerHTML = `
        <td><input type="text" class="edit-size" required placeholder="T.ex. 42" value="${size}"></td>
        <td><input type="text" class="edit-color" required placeholder="T.ex. Svart" value="${color}"></td>
        <td><input type="number" class="edit-stock" required min="0" value="${stock}"></td>
        <td><input type="number" class="edit-p-price" required min="0" placeholder="Kostnad" value="${pPrice}"></td>
        <td><input type="number" class="edit-s-price" required min="0" placeholder="Säljpris" value="${sPrice}"></td>
        <td><input type="number" class="edit-o-price" required min="0" placeholder="Nypris" value="${activeOPrice}"></td>
        <td><input type="text" class="edit-sku" placeholder="Auto-genereras" value="${sku}"></td>
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

function removeVariantRow(button) {
    const rows = document.querySelectorAll('.variant-edit-row');
    if (rows.length > 1) {
        button.closest('tr').remove();
    } else {
        alert("En produkt måste innehålla minst en storlek/variant.");
    }
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
        alert("Vänligen lägg till minst en färg/storlek variant.");
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
            alert("Kunde inte spara produkten: " + data.error);
        }
    } catch (err) {
        console.error("Fel vid sparning av produkt:", err);
    }
}

async function deleteProduct(productId) {
    if (!confirm("Är du säker på att du vill radera denna produkt och alla dess storlekar/varianter permanent?")) {
        return;
    }
    
    try {
        const res = await fetch(`/api/products/${productId}`, { method: 'DELETE' });
        if (res.ok) {
            loadInventory();
        } else {
            alert("Misslyckades att ta bort produkten.");
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
    
    const tbody = document.getElementById('variants-tbody');
    tbody.innerHTML = '';
    
    product.variants.forEach(v => {
        addVariantRow(v.size, v.color, v.stock, v.purchase_price, v.selling_price, v.sku, v.original_price);
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
        
        try {
            await fetch(`/api/products/${productId}`, { method: 'DELETE' });
            
            const response = await fetch('/api/products', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, category, description, variants })
            });
            
            const data = await response.json();
            if (data.success) {
                closeModal('product-modal');
                loadInventory();
            }
        } catch (e) {
            console.error(e);
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
            alert(data.error || "Ett fel uppstod vid analys av filen.");
            openExcelModal();
        }
    } catch (e) {
        alert("Det gick inte att skicka filen till servern.");
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
            alert("Det gick inte att slutföra importen: " + data.error);
            verifyStep.classList.remove('hide');
            loadingStep.classList.add('hide');
        }
    } catch (e) {
        alert("Ett nätverksfel uppstod.");
        verifyStep.classList.remove('hide');
        loadingStep.classList.add('hide');
    }
}

// ==================== BARCODE SCANNER HANDLERS ====================
function onScanSuccess(decodedText) {
    stopScanner();
    searchScannedSKU(decodedText);
}

function onScanFailure() {}

function handleManualSkuSearch() {
    const sku = document.getElementById('manual-sku').value.trim();
    if (!sku) return;
    stopScanner();
    searchScannedSKU(sku);
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
            resultCard.innerHTML = `
                <div class="result-prod-title">${v.product_name}</div>
                <div class="result-meta">
                    Skoart: <span>${v.product_category}</span> | 
                    Storlek: <span>${v.size}</span> | 
                    Färg: <span>${v.color}</span>
                </div>
                <div style="display: flex; align-items: center; justify-content: space-between;">
                    <span>Aktuellt lagersaldo:</span>
                    <div class="stock-adjust-group">
                        <button class="btn-stock-adj" onclick="adjustScannedStock(${v.id}, -1)">-</button>
                        <span class="stock-display" id="scan-stock-val">${v.stock}</span>
                        <button class="btn-stock-adj" onclick="adjustScannedStock(${v.id}, 1)">+</button>
                    </div>
                </div>
            `;
            
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
                    <span>Registrera ny sko med denna kod</span>
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
}

async function handleSavePassword() {
    const pw = document.getElementById('settings-pw').value.trim();
    const msg = document.getElementById('settings-msg');
    
    if (pw.length < 4) {
        alert("Lösenordet måste vara minst 4 tecken långt.");
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
            alert(data.error);
        }
    } catch (e) {
        alert("Kunde inte spara lösenord.");
    }
}

// ==================== TAB SWITCHING LOGIC ====================
function switchTab(targetTab) {
    const hubBtn = document.getElementById('tab-hub-btn');
    const posBtn = document.getElementById('tab-pos-btn');
    const invBtn = document.getElementById('tab-inventory-btn');
    const anaBtn = document.getElementById('tab-analytics-btn');
    
    const hubContent = document.getElementById('tab-hub-content');
    const posContent = document.getElementById('tab-pos-content');
    const invContent = document.getElementById('tab-inventory-content');
    const anaContent = document.getElementById('tab-analytics-content');
    
    if (!invBtn || !anaBtn) return;
    
    state.activeTab = targetTab;
    
    if (hubBtn) hubBtn.classList.remove('active');
    if (posBtn) posBtn.classList.remove('active');
    invBtn.classList.remove('active');
    anaBtn.classList.remove('active');
    
    if (hubContent) hubContent.classList.add('hide');
    if (posContent) posContent.classList.add('hide');
    invContent.classList.add('hide');
    anaContent.classList.add('hide');
    
    if (targetTab === 'hub') {
        if (hubBtn) hubBtn.classList.add('active');
        if (hubContent) hubContent.classList.remove('hide');
    } else if (targetTab === 'pos') {
        if (posBtn) posBtn.classList.add('active');
        if (posContent) posContent.classList.remove('hide');
        loadPosProducts();
        renderPosCart();
    } else if (targetTab === 'inventory') {
        invBtn.classList.add('active');
        invContent.classList.remove('hide');
        loadInventory();
    } else {
        if (state.userRole !== 'admin') {
            alert("Endast administratörer har tillgång till Ekonomi & Statistik.");
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
                    <button class="btn btn-ghost btn-icon btn-xs" onclick="openEditUserModal(${u.id}, '${u.email}', '${u.role}', '${u.allowed_projects}')" title="Redigera" style="margin-right:5px; padding:4px;">
                        <i data-lucide="edit-3" style="width:14px; height:14px;"></i>
                    </button>
                    <button class="btn btn-ghost btn-icon btn-xs" onclick="deleteUser(${u.id})" style="color:var(--color-danger); padding:4px;" title="Ta bort">
                        <i data-lucide="trash-2" style="width:14px; height:14px;"></i>
                    </button>
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
        projSelect.innerHTML = '<option value="all">Alla projekt</option>';
        
        projects.sort().forEach(p => {
            const li = document.createElement('li');
            li.style.display = 'flex';
            li.style.justify = 'space-between';
            li.style.alignItems = 'center';
            li.style.padding = '8px 12px';
            li.style.background = 'rgba(255,255,255,0.01)';
            li.style.border = '1px solid var(--border-light)';
            li.style.borderRadius = 'var(--radius-sm)';
            
            li.innerHTML = `
                <span style="font-weight:600;">${p}</span>
                <div class="badge-container" style="display:flex; align-items:center; gap:10px;">
                    <span class="badge" style="font-size:0.7rem; color:var(--text-muted);">Laddar uppgifter...</span>
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
                
                const selectHtml = `
                    <div style="display:flex; flex-wrap:wrap; align-items:center; gap:16px;">
                        <div style="display:flex; align-items:center; gap:6px;">
                            <label style="font-size:0.75rem; color:var(--text-secondary); margin:0;">Kampanjrabatt:</label>
                            <select class="custom-select" style="padding:4px 8px; font-size:0.75rem; min-width:90px; border-color:var(--color-primary); background:var(--bg-card);" onchange="setProjectDiscount('${p}', this.value)">
                                <option value="0" ${discount === 0 ? 'selected' : ''}>Ingen</option>
                                <option value="10" ${discount === 10 ? 'selected' : ''}>10% Rabatt</option>
                                <option value="20" ${discount === 20 ? 'selected' : ''}>20% Rabatt</option>
                                <option value="30" ${discount === 30 ? 'selected' : ''}>30% Rabatt</option>
                                <option value="40" ${discount === 40 ? 'selected' : ''}>40% Rabatt</option>
                                <option value="50" ${discount === 50 ? 'selected' : ''}>50% Rabatt</option>
                                <option value="60" ${discount === 60 ? 'selected' : ''}>60% Rabatt</option>
                                <option value="70" ${discount === 70 ? 'selected' : ''}>70% Rabatt</option>
                                <option value="80" ${discount === 80 ? 'selected' : ''}>80% Rabatt</option>
                                <option value="90" ${discount === 90 ? 'selected' : ''}>90% Rabatt</option>
                            </select>
                        </div>
                        <div style="display:flex; align-items:center; gap:6px;">
                            <label style="font-size:0.75rem; color:var(--text-secondary); margin:0;">Klumpsumma inköp:</label>
                            <input type="number" class="custom-select" placeholder="0 kr" value="${investment > 0 ? investment : ''}" style="width:85px; padding:4px 8px; font-size:0.75rem; border-color:var(--color-primary); background:var(--bg-card); text-align:right;" onchange="saveProjectInvestment('${p}', this.value)">
                            <span style="font-size:0.75rem; color:var(--text-muted);">kr</span>
                        </div>
                    </div>
                `;
                const container = li.querySelector('.badge-container');
                if (container) container.innerHTML = selectHtml;
            })
            .catch(err => {
                const container = li.querySelector('.badge-container');
                if (container) container.innerHTML = `<span class="badge stock-low" style="font-size:0.7rem;">Error</span>`;
            });
            
            const opt = document.createElement('option');
            opt.value = p;
            opt.textContent = p;
            projSelect.appendChild(opt);
        });
        
        if (typeof lucide !== 'undefined') lucide.createIcons();
    } catch (e) {
        console.error("Fel vid laddning av projekt:", e);
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
            alert(data.error || "Kunde inte spara rabatt.");
        }
    } catch (e) {
        alert("Ett nätverksfel uppstod.");
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
            alert(data.error || "Kunde inte spara investering.");
        }
    } catch (e) {
        alert("Ett nätverksfel uppstod.");
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
            alert(d.error);
        }
    } catch (e) {
        alert("Fel vid skapande av projekt.");
    }
}

async function populateUserProjectsSelect(selectedProjects = []) {
    const select = document.getElementById('user-projects-select');
    if (!select) return;
    
    select.innerHTML = '<option value="all">Alla projekt</option>';
    
    try {
        const response = await fetch('/api/projects');
        if (response.ok) {
            const projects = await response.json();
            
            projects.sort().forEach(p => {
                const opt = document.createElement('option');
                opt.value = p;
                opt.textContent = p;
                select.appendChild(opt);
            });
            
            // Set selected projects
            for (let i = 0; i < select.options.length; i++) {
                const opt = select.options[i];
                if (selectedProjects.includes('all')) {
                    opt.selected = (opt.value === 'all');
                } else {
                    opt.selected = selectedProjects.includes(opt.value);
                }
            }
        }
    } catch (e) {
        console.error("Kunde inte hämta projekt för användarhanteraren:", e);
    }
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
    
    // Grab selected projects
    const select = document.getElementById('user-projects-select');
    const selectedVals = Array.from(select.selectedOptions).map(opt => opt.value);
    const allowed_projects = selectedVals.includes('all') ? 'all' : selectedVals.join(',');
    
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
            alert(data.error || "Misslyckades att spara användaren.");
        }
    } catch (e) {
        alert("Ett nätverksfel uppstod.");
    }
}

async function deleteUser(id) {
    if (!confirm("Är du säker på att du vill radera denna användare permanent?")) return;
    
    try {
        const res = await fetch(`/api/users/${id}`, { method: 'DELETE' });
        const data = await res.json();
        if (data.success) {
            await loadAdminUsers();
        } else {
            alert(data.error || "Kunde inte radera användare.");
        }
    } catch (e) {
        alert("Nätverksfel vid radering.");
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
    document.getElementById('scan-shortcut-btn').addEventListener('click', openScannerModal);
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
            if (confirm("Vill du logga ut från fjärråtkomsten?")) {
                await fetch('/api/logout', { method: 'POST' });
                window.location.reload();
            }
        });
    }
    
    document.getElementById('confirm-import-btn').addEventListener('click', saveConfirmedImport);
    document.getElementById('back-to-upload-btn').addEventListener('click', openExcelModal);
    document.getElementById('save-pw-btn').addEventListener('click', handleSavePassword);
    
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
}

function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('hide');
        document.body.style.overflow = 'hidden';
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('hide');
        document.body.style.overflow = '';
        if (modalId === 'scan-modal') {
            stopScanner();
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
        posFilter.innerHTML = '<option value="all">Alla kategorier</option>';
        Array.from(state.categories).sort().forEach(cat => {
            const opt = document.createElement('option');
            opt.value = cat;
            opt.textContent = cat;
            posFilter.appendChild(opt);
        });
    }
    
    const filtered = state.products.filter(p => {
        if (catFilter !== 'all' && p.category !== catFilter) return false;
        if (query) {
            return p.name.toLowerCase().includes(query) || p.category.toLowerCase().includes(query);
        }
        return true;
    });
    
    if (filtered.length === 0) {
        grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--text-muted);">Inga skor matchar sökningen.</div>`;
        return;
    }
    
    filtered.forEach(p => {
        const hasStock = p.variants.some(v => v.stock > 0);
        const totalStock = p.variants.reduce((s, v) => s + v.stock, 0);
        
        // Use original_price as base, selling_price as the already-discounted price
        const baseVariant = p.variants.find(v => v.stock > 0) || p.variants[0];
        const originalPrice = baseVariant ? (baseVariant.original_price || baseVariant.selling_price) : 0;
        const currentSellingPrice = baseVariant ? baseVariant.selling_price : 0;
        
        // Effective price = apply order-level discount to original_price if set, else use selling_price
        const effectivePrice = posOrderDiscountPct > 0
            ? Math.round(originalPrice * (1 - posOrderDiscountPct / 100))
            : currentSellingPrice;
        
        const showDiscount = effectivePrice < originalPrice && originalPrice > 0;
        const discountPct = showDiscount ? Math.round((1 - effectivePrice / originalPrice) * 100) : 0;
        
        const card = document.createElement('div');
        card.className = 'glass-card fade-in';
        card.style.cssText = `padding:15px;cursor:${hasStock ? 'pointer' : 'not-allowed'};opacity:${hasStock ? '1' : '0.5'};transition:all 0.2s ease;display:flex;flex-direction:column;justify-content:space-between;border:1px solid var(--border-light);border-radius:var(--radius-md);position:relative;overflow:hidden;`;
        
        if (hasStock) {
            card.onmouseover = () => { card.style.borderColor = 'var(--color-primary)'; card.style.transform = 'translateY(-2px)'; card.style.boxShadow = 'var(--shadow-primary)'; };
            card.onmouseout = () => { card.style.borderColor = 'var(--border-light)'; card.style.transform = 'translateY(0)'; card.style.boxShadow = 'none'; };
            card.onclick = () => openPosVariantSelection(p.id);
        }
        
        card.innerHTML = `
            <div>
                <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:8px;">
                    <span class="badge" style="font-size:0.65rem;background:rgba(255,255,255,0.04);color:var(--text-muted);">${p.category}</span>
                    <span class="stock-badge ${hasStock ? 'stock-ok' : 'stock-empty'}" style="font-size:0.65rem;padding:1px 6px;">${hasStock ? totalStock + ' par' : 'Slut'}</span>
                </div>
                <h4 style="margin:0 0 10px 0;font-size:1rem;font-weight:700;color:var(--text-primary);">${p.name}</h4>
            </div>
            <div style="display:flex;flex-direction:column;gap:2px;">
                ${showDiscount ? `<span style="color:var(--text-muted);font-size:0.72rem;text-decoration:line-through;">${formatMoney(originalPrice)}</span>` : `<span style="color:var(--text-muted);font-size:0.72rem;">Nypris: ${formatMoney(originalPrice)}</span>`}
                <div style="display:flex;align-items:center;gap:6px;">
                    <strong style="color:${showDiscount ? '#4ade80' : 'var(--color-primary)'};font-size:1.05rem;">${formatMoney(effectivePrice)}</strong>
                    ${showDiscount ? `<span class="badge" style="background:rgba(239,68,68,0.15);color:#ef4444;font-size:0.65rem;font-weight:700;padding:1px 5px;">-${discountPct}%</span>` : ''}
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
            alert(`Kan inte lägga till fler. Endast ${v.stock} par finns i lager.`);
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
                <p>Varukorgen är tom.<br>Klicka på en sko för att lägga till.</p>
            </div>`;
        if (typeof lucide !== 'undefined') lucide.createIcons();
        document.getElementById('pos-total-items-count').textContent = '0 st';
        document.getElementById('pos-cart-total-price').textContent = '0 kr';
        document.getElementById('pos-checkout-btn').disabled = true;
        document.getElementById('pos-original-price-row').style.display = 'none';
        document.getElementById('pos-savings-row').style.display = 'none';
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
    
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

function adjustPosCartQty(index, change) {
    const item = posCart[index];
    if (!item) return;
    
    const newQty = item.quantity + change;
    if (newQty <= 0) {
        removePosCartItem(index);
    } else if (newQty > item.maxStock) {
        alert(`Kan inte öka antal. Endast ${item.maxStock} par finns i lager.`);
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
            alert(data.error || "Ett fel uppstod under betalningen.");
            checkoutBtn.disabled = false;
            checkoutBtn.innerHTML = oldText;
            if (typeof lucide !== 'undefined') lucide.createIcons();
        }
    } catch (e) {
        alert("Ett nätverksfel uppstod.");
        checkoutBtn.disabled = false;
        checkoutBtn.innerHTML = oldText;
        if (typeof lucide !== 'undefined') lucide.createIcons();
    }
}

