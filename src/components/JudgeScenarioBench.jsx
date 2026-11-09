// src/components/JudgeScenarioBench.jsx
import React from 'react';
import { Play, CheckCircle2, Lock, AlertTriangle, Scale, SlidersHorizontal } from 'lucide-react';

export default function JudgeScenarioBench({ onSelectScenario, activeScenario }) {
  const scenarios = [
    {
      id: 'scenario-auto-release',
      title: 'Full-Stack Agent',
      amount: '$350',
      tag: 'Auto-Release',
      pillClass: 'badge-released',
      icon: <CheckCircle2 size={15} color="#10B981" />,
      desc: 'Negotiate KYA contract, vault $350 in PayPal Escrow, pass DLP AST audit, and trigger instant capture.',
      actionLabel: 'Run Auto-Release'
    },
    {
      id: 'scenario-zk-nda',
      title: 'Enterprise NDA Repo',
      amount: '$600',
      tag: 'ZK Attestation',
      pillClass: 'badge-zk',
      icon: <Lock size={15} color="#0070BA" />,
      desc: 'Zero-knowledge verification: test HMAC-SHA256 private CI proof & release escrow with 0% code exposure.',
      actionLabel: 'Run ZK Attest'
    },
    {
      id: 'scenario-revision',
      title: 'Broken Syntax Build',
      amount: '$180',
      tag: 'Escrow Guard',
      pillClass: 'badge-locked',
      icon: <AlertTriangle size={15} color="#F59E0B" />,
      desc: 'AST code inspector detects syntax flaws (68% score), freezes PayPal payout, and demands revisions.',
      actionLabel: 'Test Guard Freeze'
    },
    {
      id: 'scenario-dispute',
      title: 'Scope Dispute',
      amount: '$500',
      tag: 'AI Tribunal',
      pillClass: 'badge-dispute',
      icon: <Scale size={15} color="#EF4444" />,
      desc: 'Buyer disputes delayed deliverables. AI Arbitrator calculates 75/25 split & triggers PayPal refunds.',
      actionLabel: 'Open Tribunal'
    }
  ];

  return (
    <section 
      aria-label="Executive Scenario Bench"
      style={{
        backgroundColor: 'var(--bg-surface)',
        border: '1px solid var(--border-subtle)',
        borderRadius: '14px',
        padding: '1rem 1.25rem',
        marginBottom: '1.5rem',
        boxShadow: 'var(--shadow-sm)'
      }}
    >
      {/* Bench Header */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        marginBottom: '0.85rem', 
        flexWrap: 'wrap', 
        gap: '0.65rem',
        borderBottom: '1px solid var(--border-subtle)',
        paddingBottom: '0.65rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <div style={{
            width: '26px',
            height: '26px',
            borderRadius: '6px',
            backgroundColor: 'var(--bg-sunken)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--pp-blue)'
          }}>
            <SlidersHorizontal size={14} />
          </div>
          <div>
            <h2 style={{ fontSize: '0.88rem', fontWeight: 700, letterSpacing: '-0.01em', color: 'var(--text-primary)' }}>
              Executive Scenario Controller
            </h2>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              One-click live scenarios for hackathon evaluation • No external credentials required
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span className="micro-label" style={{ 
            color: 'var(--text-muted)', 
            backgroundColor: 'var(--bg-subtle)',
            padding: '0.2rem 0.5rem',
            borderRadius: '4px',
            border: '1px solid var(--border-subtle)'
          }}>
            @paypal/agent-toolkit • Orders v2 • ZK Shield
          </span>
        </div>
      </div>

      {/* 4 One-Click Presets Grid */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', 
        gap: '0.75rem' 
      }}>
        {scenarios.map((s) => {
          const isSelected = activeScenario === s.id;
          return (
            <div
              key={s.id}
              id={`preset-${s.id}`}
              onClick={() => onSelectScenario(s.id)}
              className="surface-card"
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSelectScenario(s.id); }}
              style={{
                padding: '0.85rem 0.95rem',
                cursor: 'pointer',
                borderColor: isSelected ? 'var(--border-focus)' : 'var(--border-subtle)',
                backgroundColor: isSelected ? 'var(--bg-surface-elevated)' : 'var(--bg-surface)',
                boxShadow: isSelected ? 'var(--shadow-md)' : 'var(--shadow-xs)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '0.65rem',
                position: 'relative'
              }}
            >
              <div>
                {/* Preset Header: Icon + Title + Amount + Pill */}
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between', 
                  marginBottom: '0.35rem', 
                  gap: '0.35rem' 
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    {s.icon}
                    <span style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
                      {s.title}
                    </span>
                    <span className="font-mono" style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--pp-blue)' }}>
                      {s.amount}
                    </span>
                  </div>
                  <span className={`status-pill ${s.pillClass}`} style={{ fontSize: '0.62rem', padding: '0.15rem 0.45rem' }}>
                    {s.tag}
                  </span>
                </div>

                {/* Preset Description */}
                <p style={{ 
                  fontSize: '0.72rem', 
                  color: 'var(--text-secondary)', 
                  lineHeight: 1.45,
                  letterSpacing: '0'
                }}>
                  {s.desc}
                </p>
              </div>

              {/* Execution Action Strip */}
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between', 
                paddingTop: '0.45rem',
                borderTop: '1px solid var(--border-subtle)',
                marginTop: 'auto'
              }}>
                <span style={{ 
                  fontSize: '0.72rem', 
                  fontWeight: 700, 
                  color: isSelected ? 'var(--pp-blue)' : 'var(--text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  letterSpacing: '-0.01em'
                }}>
                  <Play size={12} fill={isSelected ? 'currentColor' : 'none'} />
                  {s.actionLabel}
                </span>

                {isSelected && (
                  <span className="micro-label" style={{ 
                    color: 'var(--pp-blue)',
                    fontSize: '0.65rem',
                    fontWeight: 700
                  }}>
                    ACTIVE
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
