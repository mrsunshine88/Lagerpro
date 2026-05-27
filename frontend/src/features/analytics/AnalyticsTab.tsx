import React from 'react';
import axios from 'axios';
import {
  RefreshCw,
  Wallet,
  PiggyBank,
  Sparkles,
  Gauge,
  FolderKanban
} from 'lucide-react';
import type { AnalyticsData } from '../../types';

interface AnalyticsTabProps {
  analytics: AnalyticsData | null;
  fetchAnalytics: () => Promise<void>;
  fetchProducts: () => Promise<void>;
  apiBaseUrl: string;
  getAxiosConfig: () => any;
}

export const AnalyticsTab: React.FC<AnalyticsTabProps> = ({
  analytics,
  fetchAnalytics,
  fetchProducts,
  apiBaseUrl,
  getAxiosConfig,
}) => {
  if (!analytics) {
    return (
      <div className="tab-pane" style={{ textAlign: 'center', padding: 40 }}>
        <RefreshCw className="spinner" style={{ color: 'var(--color-primary)', width: 24, height: 24 }} />
        <p style={{ marginTop: 10, color: 'var(--text-secondary)' }}>Laddar ekonomisk data...</p>
      </div>
    );
  }

  const handleUndoSale = async (transactionId: number, modelName: string, quantity: number) => {
    if (
      await confirm(
        `Är du säker på att du vill ångra denna försäljning för ${modelName}? Skorna (+${quantity} st) återförs till lagret och försäljningsstatistiken justeras.`
      )
    ) {
      try {
        await axios.delete(`${apiBaseUrl}/api/transactions/${transactionId}`, getAxiosConfig());
        fetchAnalytics();
        fetchProducts();
      } catch (err) {
        console.error(err);
        alert('Kunde inte ångra köpet.');
      }
    }
  };

  return (
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
            <p>{Math.round(analytics.stock_metrics.total_cost).toLocaleString('sv-SE')} kr</p>
            <span>Baserat på genomsnittliga inköpspriser</span>
          </div>
        </div>
        <div className="stat-card glass-card">
          <div className="stat-icon pink-gradient">
            <PiggyBank />
          </div>
          <div className="stat-info">
            <h3>Lager Försäljningsvärde</h3>
            <p>{Math.round(analytics.stock_metrics.potential_sales).toLocaleString('sv-SE')} kr</p>
            <span>Vid 100% försäljning</span>
          </div>
        </div>
        <div className="stat-card glass-card">
          <div className="stat-icon green-gradient">
            <Sparkles />
          </div>
          <div className="stat-info">
            <h3>Potentiell Bruttovinst</h3>
            <p>{Math.round(analytics.stock_metrics.potential_profit).toLocaleString('sv-SE')} kr</p>
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
            <strong style={{ display: 'block', fontSize: '1.5rem', marginTop: 4 }}>{Math.round(analytics.break_even.total_investment).toLocaleString('sv-SE')} kr</strong>
          </div>
          <div className="be-stat">
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Ackumulerad Försäljning</span>
            <strong style={{ display: 'block', fontSize: '1.5rem', marginTop: 4 }}>{Math.round(analytics.break_even.total_revenue).toLocaleString('sv-SE')} kr</strong>
          </div>
          <div className="be-stat highlight" style={{ background: 'rgba(255,255,255,0.02)', padding: 12, borderRadius: 6 }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Faktisk Nettovinst (Kassaflöde)</span>
            <strong style={{ display: 'block', fontSize: '1.5rem', color: analytics.break_even.net_profit >= 0 ? 'var(--color-success)' : 'white', marginTop: 4 }}>{Math.round(analytics.break_even.net_profit).toLocaleString('sv-SE')} kr</strong>
          </div>
        </div>

        <div className="be-progress-wrapper">
          <div className="be-progress-labels" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 10 }}>
            <span style={{ color: 'rgba(255,255,255,0.4)', fontWeight: 600, background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: 4 }}>Start (0%)</span>
            <span style={{ fontWeight: 700, color: 'white', background: 'var(--color-primary)', padding: '2px 10px', borderRadius: 12, boxShadow: '0 2px 8px rgba(99, 102, 241, 0.4)' }}>
              {analytics.break_even.total_investment > 0
                ? Math.round((analytics.break_even.total_revenue / analytics.break_even.total_investment) * 100)
                : 0}% Återvunnet
            </span>
            <span style={{ color: '#fbbf24', fontWeight: 800, background: 'rgba(245, 158, 11, 0.1)', padding: '2px 8px', borderRadius: 4, border: '1px solid rgba(245, 158, 11, 0.2)', boxShadow: '0 0 10px rgba(245, 158, 11, 0.1)' }}>Break-Even (100%+)</span>
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
              Sälj för ytterligare <strong>{Math.round(-analytics.break_even.net_profit).toLocaleString('sv-SE')} kr</strong> för att nå break-even.
            </p>
          ) : (
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--color-success)' }}>
              Du har passerat break-even-gränsen med <strong>{Math.round(analytics.break_even.net_profit).toLocaleString('sv-SE')} kr</strong> i ren nettovinst!
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
                  <span className="val-muted">{Math.round(p.stock_cost).toLocaleString('sv-SE')} kr</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Total investering:</span>
                  <span>{Math.round(p.total_investment).toLocaleString('sv-SE')} kr</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Ackumulerade intäkter:</span>
                  <span style={{ color: 'var(--color-success)', fontWeight: 600 }}>{Math.round(p.total_revenue).toLocaleString('sv-SE')} kr</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-light)', paddingTop: 6, marginTop: 4 }}>
                  <span>Kassaflöde netto:</span>
                  <strong style={{ color: p.net_profit >= 0 ? 'var(--color-success)' : '#f59e0b' }}>{Math.round(p.net_profit).toLocaleString('sv-SE')} kr</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
                  <span>Beräknad sko-kostnad:</span>
                  <span>{Math.round(p.cost_per_shoe).toLocaleString('sv-SE')} kr/st</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
      
      <section className="recent-sales-history">
        <h3 style={{ marginBottom: 12 }}>Senaste registrerade försäljningar</h3>
        <div className="glass-card no-padding-mobile" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="table-container" style={{ overflowX: 'auto', width: '100%', display: 'block', WebkitOverflowScrolling: 'touch' }}>
            <table className="custom-table" style={{ width: '100%', minWidth: '750px', borderCollapse: 'collapse', textAlign: 'left' }}>
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
                  <th style={{ padding: '10px 15px', textAlign: 'right' }}>Åtgärder</th>
                </tr>
              </thead>
              <tbody>
                {analytics.recent_sales.map((s, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid var(--border-light)' }}>
                    <td style={{ padding: '10px 15px' }}><strong>{s.model_name}</strong></td>
                    <td style={{ padding: '10px 15px' }}>St: {s.size} ({s.color || 'Uni'})</td>
                    <td style={{ padding: '10px 15px' }}><span className="category-tag">{s.category}</span></td>
                    <td style={{ padding: '10px 15px' }}>{s.quantity} st</td>
                    <td style={{ padding: '10px 15px' }}><strong style={{ color: 'var(--color-success)' }}>{Math.round(s.selling_price).toLocaleString('sv-SE')} kr</strong></td>
                    <td style={{ padding: '10px 15px' }}>{s.purchase_price ? `${Math.round(s.purchase_price).toLocaleString('sv-SE')} kr` : '0 kr'}</td>
                    <td style={{ padding: '10px 15px' }}><strong style={{ color: s.selling_price - s.purchase_price >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>{Math.round(s.selling_price - s.purchase_price).toLocaleString('sv-SE')} kr</strong></td>
                    <td style={{ padding: '10px 15px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{new Date(s.created_at).toLocaleString('sv-SE')}</td>
                    <td style={{ padding: '10px 15px', textAlign: 'right' }}>
                      <button
                        onClick={() => handleUndoSale(s.id, s.model_name, s.quantity)}
                        className="btn btn-ghost btn-xs"
                        style={{ color: 'var(--color-danger)', border: '1px solid rgba(239, 68, 68, 0.25)', padding: '2px 8px', borderRadius: 4 }}
                      >
                        Ångra köp
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
};
