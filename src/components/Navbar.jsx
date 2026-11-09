// src/components/Navbar.jsx
import React from 'react';
import { ShieldCheck, Moon, Sun, Settings, Zap, ArrowRightLeft, Table, CheckCircle2 } from 'lucide-react';

export default function Navbar({ 
  theme, 
  onToggleTheme, 
  onOpenSettings, 
  activeTab, 
  setActiveTab,
  sandboxConfig 
}) {
  return (
    <header style={{
      backgroundColor: 'var(--bg-surface)',
      borderBottom: '1px solid var(--border-subtle)',
      position: 'sticky',
      top: 0,
      zIndex: 50,
      transition: 'background-color 0.18s ease, border-color 0.18s ease'
    }}>
      <div className="app-container" style={{ 
        paddingTop: '0.75rem',
        paddingBottom: '0.75rem',
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        flexWrap: 'wrap', 
        gap: '0.85rem' 
      }}>
        {/* Brand Typographic Lockup */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '9px',
            backgroundColor: 'var(--pp-navy)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#FFFFFF',
            fontWeight: 800,
            fontSize: '1.15rem',
            letterSpacing: '-0.02em',
            boxShadow: '0 2px 4px rgba(0, 48, 135, 0.25)',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            N
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
              <span style={{ 
                fontWeight: 800, 
                fontSize: '1.15rem', 
                letterSpacing: '-0.03em', 
                color: 'var(--text-primary)' 
              }}>
                Nexus<span style={{ color: 'var(--pp-blue)' }}>Pay</span> <span style={{ fontWeight: 400, color: 'var(--text-secondary)' }}>AI</span>
              </span>
              <span className="micro-label" style={{ 
                color: 'var(--text-muted)',
                letterSpacing: '0.08em',
                padding: '0.1rem 0.35rem',
                backgroundColor: 'var(--bg-sunken)',
                borderRadius: '4px',
                border: '1px solid var(--border-subtle)'
              }}>
                PROTOCOL v2.0
              </span>
            </div>
            <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', letterSpacing: '-0.01em', marginTop: '1px' }}>
              Autonomous Agentic Commerce &amp; Milestone Escrow on PayPal
            </p>
          </div>
        </div>

        {/* Institutional Navigation Tabs */}
        <nav style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '0.25rem', 
          backgroundColor: 'var(--bg-subtle)', 
          padding: '0.25rem', 
          borderRadius: '9px',
          border: '1px solid var(--border-subtle)'
        }}>
          <button 
            id="nav-tab-negotiate"
            onClick={() => setActiveTab('negotiate')}
            className="btn btn-sm"
            style={{ 
              backgroundColor: activeTab === 'negotiate' ? 'var(--bg-surface)' : 'transparent',
              color: activeTab === 'negotiate' ? 'var(--text-primary)' : 'var(--text-muted)',
              border: activeTab === 'negotiate' ? '1px solid var(--border-default)' : '1px solid transparent',
              boxShadow: activeTab === 'negotiate' ? 'var(--shadow-xs)' : 'none',
              fontWeight: activeTab === 'negotiate' ? 600 : 500
            }}
          >
            <Zap size={14} color={activeTab === 'negotiate' ? 'var(--pp-blue)' : 'currentColor'} /> 
            Agent Negotiation
          </button>

          <button 
            id="nav-tab-deliverable"
            onClick={() => setActiveTab('deliverable')}
            className="btn btn-sm"
            style={{ 
              backgroundColor: activeTab === 'deliverable' ? 'var(--bg-surface)' : 'transparent',
              color: activeTab === 'deliverable' ? 'var(--text-primary)' : 'var(--text-muted)',
              border: activeTab === 'deliverable' ? '1px solid var(--border-default)' : '1px solid transparent',
              boxShadow: activeTab === 'deliverable' ? 'var(--shadow-xs)' : 'none',
              fontWeight: activeTab === 'deliverable' ? 600 : 500
            }}
          >
            <ShieldCheck size={14} color={activeTab === 'deliverable' ? '#10B981' : 'currentColor'} /> 
            AI Verification
          </button>

          <button 
            id="nav-tab-dispute"
            onClick={() => setActiveTab('dispute')}
            className="btn btn-sm"
            style={{ 
              backgroundColor: activeTab === 'dispute' ? 'var(--bg-surface)' : 'transparent',
              color: activeTab === 'dispute' ? 'var(--text-primary)' : 'var(--text-muted)',
              border: activeTab === 'dispute' ? '1px solid var(--border-default)' : '1px solid transparent',
              boxShadow: activeTab === 'dispute' ? 'var(--shadow-xs)' : 'none',
              fontWeight: activeTab === 'dispute' ? 600 : 500
            }}
          >
            <ArrowRightLeft size={14} color={activeTab === 'dispute' ? '#F59E0B' : 'currentColor'} /> 
            Dispute Tribunal
          </button>

          <button 
            id="nav-tab-ledger"
            onClick={() => setActiveTab('ledger')}
            className="btn btn-sm"
            style={{ 
              backgroundColor: activeTab === 'ledger' ? 'var(--bg-surface)' : 'transparent',
              color: activeTab === 'ledger' ? 'var(--text-primary)' : 'var(--text-muted)',
              border: activeTab === 'ledger' ? '1px solid var(--border-default)' : '1px solid transparent',
              boxShadow: activeTab === 'ledger' ? 'var(--shadow-xs)' : 'none',
              fontWeight: activeTab === 'ledger' ? 600 : 500
            }}
          >
            <Table size={14} color={activeTab === 'ledger' ? 'var(--pp-blue)' : 'currentColor'} /> 
            AG Grid Ledger
          </button>
        </nav>

        {/* Status, Protocol Metrics & Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          {/* Protocol Metrics (Compact Pill) */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '0.3rem 0.65rem',
            backgroundColor: 'var(--bg-subtle)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '8px',
            fontSize: '0.72rem',
            color: 'var(--text-secondary)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span className="micro-label" style={{ color: 'var(--text-muted)' }}>VAULT:</span>
              <span className="font-mono" style={{ fontWeight: 700, color: 'var(--text-primary)' }}>$1,630</span>
            </div>
            <span style={{ color: 'var(--border-strong)' }}>|</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span className="micro-label" style={{ color: 'var(--text-muted)' }}>ZK:</span>
              <span style={{ fontWeight: 600, color: 'var(--status-released-text)' }}>PASS</span>
            </div>
          </div>

          {/* Crisp PayPal Sandbox Status Indicator (No Gimmicky Pulse) */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem',
            padding: '0.32rem 0.7rem',
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-default)',
            borderRadius: '9999px',
            fontSize: '0.74rem',
            fontWeight: 600,
            color: 'var(--text-secondary)',
            boxShadow: 'var(--shadow-xs)'
          }}>
            <span style={{ 
              width: '6px', 
              height: '6px', 
              borderRadius: '50%', 
              backgroundColor: '#10B981', 
              display: 'inline-block' 
            }} />
            <span>PayPal Sandbox (US)</span>
          </div>

          {/* Theme Toggle */}
          <button 
            id="theme-toggle-btn"
            onClick={onToggleTheme}
            className="btn btn-outline btn-sm"
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Obsidian Dark Mode'}
            style={{ width: '34px', height: '34px', padding: 0 }}
          >
            {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
          </button>

          {/* Settings Modal Trigger */}
          <button 
            id="settings-modal-trigger"
            onClick={onOpenSettings}
            className="btn btn-outline btn-sm"
            title="Configure PayPal Credentials & Gemini API"
            style={{ width: '34px', height: '34px', padding: 0 }}
          >
            <Settings size={15} />
          </button>
        </div>
      </div>
    </header>
  );
}
