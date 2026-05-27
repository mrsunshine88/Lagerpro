app_path = "frontend/src/App.tsx"
with open(app_path, "r", encoding="utf-8") as f:
    code = f.read()

target = """            {/* --- TAB: ANALYTICS (ADMIN ONLY) --- */}
            {activeTab === 'analytics' && userProfile?.role === 'admin' && analytics && (
              <AnalyticsTab
                analytics={analytics}
                fetchAnalytics={fetchAnalytics}
                fetchProducts={fetchProducts}
                apiBaseUrl={API_BASE_URL}
                getAxiosConfig={getAxiosConfig}
              />
            )}"""

replacement = """            {/* --- TAB: ANALYTICS (ADMIN ONLY) --- */}
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
                  <h2 style={{ fontSize: '1.6rem', margin: 0, fontWeight: 800 }}>Systemadministration</h2>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: 4 }}>
                    Hantera systeminställningar, projektkategorier, personalkonton, rabattkoder samt kopplingar till Swish och PayPal.
                  </p>
                </div>

                <div className="settings-tabs-list" style={{ marginBottom: 20, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button type="button" onClick={() => setAdminActiveTab('users')} className={`btn btn-sm ${adminActiveTab === 'users' ? 'btn-primary' : 'btn-ghost'}`}>Personalkonton</button>
                  <button type="button" onClick={() => setAdminActiveTab('projects')} className={`btn btn-sm ${adminActiveTab === 'projects' ? 'btn-primary' : 'btn-ghost'}`}>Kategorier &amp; Marginal</button>
                  <button type="button" onClick={() => setAdminActiveTab('discount_codes')} className={`btn btn-sm ${adminActiveTab === 'discount_codes' ? 'btn-primary' : 'btn-ghost'}`}>Rabattkoder</button>
                  <button type="button" onClick={() => setAdminActiveTab('paypal')} className={`btn btn-sm ${adminActiveTab === 'paypal' ? 'btn-primary' : 'btn-ghost'}`}>PayPal Integration</button>
                  <button type="button" onClick={() => setAdminActiveTab('swish')} className={`btn btn-sm ${adminActiveTab === 'swish' ? 'btn-primary' : 'btn-ghost'}`}>Swish Integration</button>
                  <button type="button" onClick={() => setAdminActiveTab('simulation')} className={`btn btn-sm ${adminActiveTab === 'simulation' ? 'btn-primary' : 'btn-ghost'}`}>Utvecklarsimulering</button>
                </div>

                <div className="glass-card" style={{ padding: 24, minHeight: 400 }}>
                  
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
                              <option value="Allmänt">Allmänt (Standard)</option>
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
                                  <span>PostNord hemleverans</span>
                                </label>
                              </div>
                            </div>
                          </div>

                          {(settingDeliveryMethod === 'shipping' || settingDeliveryMethod === 'shipping_pickup') && (
                            <div className="input-container" style={{ marginBottom: 15 }}>
                              <label>Fraktavgift vid hemleverans (kr)</label>
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
                              <option value="Allmänt">Allmänt</option>
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
                                  {d.discount_percent}% rabatt
                                  {d.free_shipping && <span style={{ color: '#60a5fa', marginLeft: 8 }}>+ Fri frakt</span>}
                                </td>
                                <td style={{ padding: '8px 12px', color: 'var(--text-secondary)' }}>
                                  {d.valid_until ? new Date(d.valid_until).toLocaleDateString('sv-SE') : 'Tills vidare'}
                                </td>
                                <td style={{ padding: '8px 12px', textAlign: 'right' }}>
                                  <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                                    <button
                                      onClick={() => {
                                        setEditingDiscountId(d.id);
                                        setNewDiscountCode(d.code);
                                        setNewDiscountProject(d.project);
                                        setNewDiscountPercent(d.discount_percent);
                                        setNewDiscountFreeShipping(d.free_shipping);
                                        setNewDiscountValidUntil(d.valid_until ? d.valid_until.substring(0, 10) : '');
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
                            <option value="Allmänt">Allmänt</option>
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
            )}"""

if target in code:
    code = code.replace(target, replacement)
    print("Replaced admin pane successfully")
else:
    code = code.replace(target.replace("\n", "\r\n"), replacement)
    print("Replaced admin pane successfully with CRLF")

with open(app_path, "w", encoding="utf-8") as f:
    f.write(code)

print("apply_full_refactor_part3 completed.")
