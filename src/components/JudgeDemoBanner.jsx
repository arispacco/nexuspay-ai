// src/components/JudgeDemoBanner.jsx
import React from 'react';
import { PlayCircle, Sparkles, CheckCircle2, AlertTriangle, Scale, Lock } from 'lucide-react';

export default function JudgeDemoBanner({ onSelectScenario, activeScenario }) {
  const scenarios = [
    {
      id: 'scenario-auto-release',
      title: 'Full-Stack Agent ($350)',
      tag: 'Auto-Release',
      icon: <CheckCircle2 size={16} color="#10B981" />,
      desc: 'Atlas & Nova negotiate KYA contract, lock $350 in PayPal Escrow, audit code with DLP Shield, and execute instant PayPal capture.',
      badgeClass: 'badge-success'
    },
    {
      id: 'scenario-zk-nda',
      title: 'Enterprise NDA Repo ($600)',
      tag: 'Zero-Knowledge',
      icon: <Lock size={16} color="#0070BA" />,
      desc: 'Proprietary code NEVER leaves private CI! Verify HMAC-SHA256 test attestation proof and unlock PayPal Escrow with 0% code exposure.',
      badgeClass: 'badge-paypal'
    },
    {
      id: 'scenario-revision',
      title: 'Broken Syntax Build ($180)',
      tag: 'Escrow Guard',
      icon: <AlertTriangle size={16} color="#F59E0B" />,
      desc: 'Static AST & AI inspector detects syntax defects (68% score), freezes PayPal payout, and returns actionable fix checklist.',
      badgeClass: 'badge-warning'
    },
    {
      id: 'scenario-dispute',
      title: 'API Scope Dispute ($500)',
      tag: 'AI Tribunal',
      icon: <Scale size={16} color="#2563EB" />,
      desc: 'Buyer contests missing secondary items. AI Arbitrator rules 75/25 split and executes 1-click PayPal refund + merchant release.',
      badgeClass: 'badge-paypal'
    }
  ];

  return (
    <div style={{
      backgroundColor: 'var(--bg-subtle)',
      border: '1px solid var(--border-subtle)',
      borderRadius: '12px',
      padding: '1.15rem 1.25rem',
      marginBottom: '1.5rem'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Sparkles size={18} color="var(--paypal-blue)" />
          <h2 style={{ fontSize: '0.95rem', fontWeight: 700, letterSpacing: '-0.01em', color: 'var(--text-main)' }}>
            Interactive Judge Quick-Run Scenarios (1-Click End-to-End Flows)
          </h2>
        </div>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          Zero API keys required • Powered by <code>@paypal/agent-toolkit</code> + Sandbox v2
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.75rem' }}>
        {scenarios.map((s) => {
          const isSelected = activeScenario === s.id;
          return (
            <div
              key={s.id}
              id={`preset-${s.id}`}
              onClick={() => onSelectScenario(s.id)}
              className="surface-card"
              style={{
                padding: '0.85rem 1rem',
                cursor: 'pointer',
                borderColor: isSelected ? 'var(--paypal-blue)' : 'var(--border-subtle)',
                backgroundColor: isSelected ? 'var(--bg-surface-hover)' : 'var(--bg-surface)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '0.45rem'
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem', gap: '0.35rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, fontSize: '0.84rem' }}>
                    {s.icon}
                    <span>{s.title}</span>
                  </div>
                  <span className={`badge ${s.badgeClass}`} style={{ fontSize: '0.62rem' }}>
                    {s.tag}
                  </span>
                </div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                  {s.desc}
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.74rem', fontWeight: 700, color: 'var(--paypal-blue)', marginTop: '0.2rem' }}>
                <PlayCircle size={14} /> Launch Scenario
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
