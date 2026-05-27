import re

app_path = "frontend/src/App.tsx"
with open(app_path, "r", encoding="utf-8") as f:
    code = f.read()

# 1. Add "Systemadmin" button in navigation tab headers under Economy
target_nav = """                {userProfile?.role === 'admin' && (
                  <button onClick={() => setActiveTab('analytics')} className={`nav-tab ${activeTab === 'analytics' ? 'active' : ''}`}>
                    <TrendingUp />
                    <span>Ekonomi &amp; Statistik</span>
                  </button>
                )}"""

replacement_nav = """                {userProfile?.role === 'admin' && (
                  <>
                    <button onClick={() => setActiveTab('analytics')} className={`nav-tab ${activeTab === 'analytics' ? 'active' : ''}`}>
                      <TrendingUp />
                      <span>Ekonomi &amp; Statistik</span>
                    </button>
                    <button onClick={() => setActiveTab('admin')} className={`nav-tab ${activeTab === 'admin' ? 'active' : ''}`}>
                      <ShieldCheck />
                      <span>Systemadmin</span>
                    </button>
                  </>
                )}"""

if target_nav in code:
    code = code.replace(target_nav, replacement_nav)
    print("Replaced navigation tabs successfully")
else:
    code = code.replace(target_nav.replace("\n", "\r\n"), replacement_nav)
    print("Replaced navigation tabs successfully with CRLF")

# 2. Main navigation header right: remove ShieldCheck button
target_header_right = """            <div className="header-right">
              {userProfile?.role === 'admin' && (
                <button onClick={() => setAdminPanelOpen(true)} className="btn btn-ghost btn-icon" title="Admin-panel" style={{ color: 'var(--color-accent)' }}>
                  <ShieldCheck />
                </button>
              )}
              <button onClick={() => setSettingsModalOpen(true)} className="btn btn-ghost btn-icon" title="Inställningar">"""

replacement_header_right = """            <div className="header-right">
              <button onClick={() => setSettingsModalOpen(true)} className="btn btn-ghost btn-icon" title="Inställningar">"""

if target_header_right in code:
    code = code.replace(target_header_right, replacement_header_right)
    print("Replaced header right successfully")
else:
    code = code.replace(target_header_right.replace("\n", "\r\n"), replacement_header_right)
    print("Replaced header right successfully with CRLF")

# 3. Main hub-grid: add ShieldCheck card
target_hub = """                  {userProfile?.role === 'admin' && (
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
                  )}"""

replacement_hub = """                  {userProfile?.role === 'admin' && (
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
                          <h3 style={{ margin: '0 0 8px 0', fontSize: '1.2rem', fontWeight: 700 }}>Systemadmin</h3>
                          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 20 }}>Hantera systeminställningar, projektkategorier, rabattkoder, Swish och PayPal.</p>
                        </div>
                        <button onClick={() => setActiveTab('admin')} className="btn btn-secondary btn-full" style={{ borderColor: 'var(--color-primary)', color: 'var(--color-primary)' }}>
                          <span>Hantera system</span>
                          <ArrowRight style={{ marginLeft: 6, width: 16, height: 16 }} />
                        </button>
                      </div>
                    </>
                  )}"""

if target_hub in code:
    code = code.replace(target_hub, replacement_hub)
    print("Replaced hub successfully")
else:
    code = code.replace(target_hub.replace("\n", "\r\n"), replacement_hub)
    print("Replaced hub successfully with CRLF")

with open(app_path, "w", encoding="utf-8") as f:
    f.write(code)
print("apply_full_refactor.py part 1 finished.")
