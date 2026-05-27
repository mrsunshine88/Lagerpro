import re

app_path = "frontend/src/App.tsx"
with open(app_path, "r", encoding="utf-8") as f:
    code = f.read()

# Let's find index positions of the markers to replace the Settings Modal and the Admin Modal
# Settings Modal start marker: "{settingsModalOpen && ("
# Settings Modal end / Update profile start marker: "{/* ==================== UPDATE PROFILE SUBMODAL ==================== */}"
# Admin Modal start marker: "{/* ==================== ADMIN PANEL (USER CRUD) ==================== */}"
# Admin Modal end marker: right before the final return closing tags "    </div>\n  );\n}" or "    </div>\r\n  );\r\n}"

settings_start_idx = code.find("{settingsModalOpen && (")
profile_start_idx = code.find("{/* ==================== UPDATE PROFILE SUBMODAL ==================== */}")
admin_start_idx = code.find("{/* ==================== ADMIN PANEL (USER CRUD) ==================== */}")

if settings_start_idx == -1 or profile_start_idx == -1 or admin_start_idx == -1:
    print("CRITICAL ERROR: Markers not found in App.tsx!")
    print(f"settings_start_idx: {settings_start_idx}")
    print(f"profile_start_idx: {profile_start_idx}")
    print(f"admin_start_idx: {admin_start_idx}")
    exit(1)

print("Found all markers successfully!")

# Let's construct the replacement block for the settings modal
pruned_settings_modal = """{settingsModalOpen && (
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

      """

# Let's verify what lies between profile_start_idx and admin_start_idx. It is the UPDATE PROFILE SUBMODAL.
# Let's extract it.
profile_submodal_block = code[profile_start_idx:admin_start_idx]

# Let's construct the replacement block for everything from settings_start_idx to the end of the file!
# The end of the file after the Admin panel modal is the closing of the app container:
# "    </div>\n  );\n}"
# We will append the custom confirmState and toasts overlays right before the final closing div.

custom_overlays_and_closings = """

      {/* ==================== PREMIUM GLASSMORPHIC TOASTS ==================== */}
      <div style={{
        position: 'fixed',
        top: 20,
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
"""

# Assemble the new tail code block
new_tail = pruned_settings_modal + profile_submodal_block + custom_overlays_and_closings

# Slice and replace
new_code = code[:settings_start_idx] + new_tail

with open(app_path, "w", encoding="utf-8") as f:
    f.write(new_code)

print("Settings and Admin modals successfully pruned and replaced with overlays at the bottom.")
