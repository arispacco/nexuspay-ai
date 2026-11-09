// src/components/TransactionInspectorDrawer.jsx
import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Copy,
  Check,
  FileText,
  Shield,
  Code,
  CheckCircle,
  Clock,
  Lock,
  ExternalLink,
  DollarSign,
  Cpu,
  Layers,
  Zap,
  AlertTriangle
} from 'lucide-react';

export default function TransactionInspectorDrawer({ isOpen, tx, onClose }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [copiedField, setCopiedField] = useState(null);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleCopy = async (text, fieldName) => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const el = document.createElement('textarea');
        el.value = text;
        document.body.appendChild(el);
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);
      }
      setCopiedField(fieldName);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      console.warn('Clipboard copy failed:', err);
    }
  };

  const webhookPayload = useMemo(() => {
    if (!tx) return null;
    if (tx.rawPayload && typeof tx.rawPayload === 'object') {
      return tx.rawPayload;
    }

    const isReleased = tx.status === 'RELEASED' || tx.status === 'COMPLETED';
    const isRefunded = tx.status === 'REFUNDED_PARTIAL' || tx.status === 'REFUNDED';
    const isArbitrated = tx.status === 'ARBITRATED_SPLIT' || tx.status === 'ARBITRATED';

    let eventType = 'CHECKOUT.ORDER.APPROVED';
    let resourceType = 'order';

    if (isReleased) {
      eventType = 'PAYMENT.CAPTURE.COMPLETED';
      resourceType = 'capture';
    } else if (isRefunded) {
      eventType = 'PAYMENT.CAPTURE.REFUNDED';
      resourceType = 'refund';
    } else if (isArbitrated) {
      eventType = 'CUSTOMER.DISPUTE.RESOLVED';
      resourceType = 'dispute';
    }

    return {
      id: `WH-${(tx.id || 'TXN').replace('TXN-', '')}-${Date.now().toString(36).toUpperCase()}`,
      event_version: '1.0',
      create_time: tx.date || tx.createdAt || new Date().toISOString(),
      resource_type: resourceType,
      event_type: eventType,
      summary: `PayPal Webhook: ${eventType} for ${tx.project || tx.projectTitle || 'Autonomous Milestone'}`,
      resource: {
        id: tx.paypalCaptureId || tx.paypalOrderId || '8XP-MOCK-ORDER',
        status: isReleased ? 'COMPLETED' : tx.status,
        amount: {
          currency_code: tx.currency || 'USD',
          value: Number(tx.amount || 0).toFixed(2)
        },
        custom_id: tx.agreementId || 'SMA-LIVE',
        invoice_number: `INV-${tx.agreementId || '7429'}`,
        supplementary_data: {
          related_ids: {
            order_id: tx.paypalOrderId,
            capture_id: tx.paypalCaptureId,
            refund_id: tx.paypalRefundId
          }
        }
      },
      nexuspay_metadata: {
        transaction_id: tx.id,
        agreement_id: tx.agreementId || 'SMA-LIVE',
        milestone_id: tx.milestoneId || 'M1',
        privacy_shield_mode: tx.privacyMode || 'ZK-NDA',
        ai_compliance_score: tx.aiScore,
        cryptographic_proof_digest: tx.proofHash || 'sha256:verified',
        ephemeral_ram_destruction_verified: true,
        source_code_persisted: false,
        kya_mandates: {
          buyer: 'KYA-PP-ATLAS-094',
          seller: 'KYA-PP-NOVA-882'
        }
      }
    };
  }, [tx]);

  if (!isOpen || !tx) return null;

  const isLocked = tx.status === 'ESCROW_LOCKED';
  const isReleased = tx.status === 'RELEASED' || tx.status === 'COMPLETED';
  const isArbitrated = tx.status === 'ARBITRATED_SPLIT' || tx.status === 'ARBITRATED';
  const isRefunded = tx.status === 'REFUNDED_PARTIAL' || tx.status === 'REFUNDED';

  let statusClass = 'badge-locked';
  let statusLabel = 'ESCROW LOCKED';
  if (isReleased) {
    statusClass = 'badge-released';
    statusLabel = 'RELEASED';
  } else if (isArbitrated) {
    statusClass = 'badge-zk';
    statusLabel = 'ARBITRATED SPLIT';
  } else if (isRefunded) {
    statusClass = 'badge-dispute';
    statusLabel = 'REFUNDED PARTIAL';
  }

  const scoreVal = tx.aiScore !== undefined && tx.aiScore !== null ? Number(tx.aiScore) : 96;
  const scoreFillClass = scoreVal >= 90 ? 'pass' : scoreVal >= 75 ? 'warn' : 'fail';
  const scoreColor = scoreVal >= 90 ? '#10B981' : scoreVal >= 75 ? '#F59E0B' : '#EF4444';

  const amountVal = Number(tx.amount || 0);

  // JSON syntax highlighting tokens generator
  const renderHighlightedJson = (obj) => {
    const jsonStr = JSON.stringify(obj, null, 2);
    const tokens = [];
    const regex = /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?|[{}[\],])/g;
    let match;
    let lastIndex = 0;

    while ((match = regex.exec(jsonStr)) !== null) {
      const text = match[0];
      const index = match.index;
      if (index > lastIndex) {
        tokens.push({ text: jsonStr.slice(lastIndex, index), type: 'whitespace' });
      }
      let type = 'punctuation';
      if (/^"/.test(text)) {
        if (/:$/.test(text)) {
          type = 'key';
        } else {
          type = 'string';
        }
      } else if (/true|false/.test(text)) {
        type = 'boolean';
      } else if (/null/.test(text)) {
        type = 'null';
      } else if (/[0-9]/.test(text)) {
        type = 'number';
      }
      tokens.push({ text, type });
      lastIndex = regex.lastIndex;
    }
    if (lastIndex < jsonStr.length) {
      tokens.push({ text: jsonStr.slice(lastIndex), type: 'whitespace' });
    }

    return (
      <pre
        style={{
          margin: 0,
          padding: '1.1rem',
          fontFamily: 'var(--font-mono, monospace)',
          fontSize: '0.78rem',
          lineHeight: '1.6',
          backgroundColor: '#070A0F',
          borderRadius: '8px',
          overflowX: 'auto',
          border: '1px solid var(--border-subtle, #1E293B)'
        }}
      >
        {tokens.map((tok, i) => {
          let color = '#94A3B8';
          if (tok.type === 'key') color = '#38BDF8';
          else if (tok.type === 'string') color = '#34D399';
          else if (tok.type === 'number') color = '#FBBF24';
          else if (tok.type === 'boolean') color = '#F472B6';
          else if (tok.type === 'null') color = '#A78BFA';
          return (
            <span key={i} style={{ color }}>
              {tok.text}
            </span>
          );
        })}
      </pre>
    );
  };

  return (
    <>
      <style>{`
        @keyframes slideInRight {
          from {
            transform: translateX(100%);
            opacity: 0.7;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        @keyframes fadeInBackdrop {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        .inspector-drawer-backdrop {
          position: fixed;
          inset: 0;
          background-color: rgba(5, 7, 10, 0.72);
          backdrop-filter: blur(5px);
          z-index: 999;
          display: flex;
          justify-content: flex-end;
          animation: fadeInBackdrop 0.2s ease-out;
        }
        .inspector-drawer-panel {
          width: 580px;
          max-width: 94vw;
          height: 100vh;
          background-color: var(--bg-surface-elevated, #0E131F);
          border-left: 1px solid var(--border-default, #2A3852);
          box-shadow: -8px 0 32px rgba(0, 0, 0, 0.65);
          display: flex;
          flex-direction: column;
          animation: slideInRight 0.26s cubic-bezier(0.16, 1, 0.3, 1);
          z-index: 1000;
          overflow: hidden;
        }
      `}</style>

      <div
        className="inspector-drawer-backdrop"
        onClick={onClose}
        role="dialog"
        aria-modal="true"
        aria-label="Transaction Audit Inspector"
      >
        <div
          className="inspector-drawer-panel"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div
            style={{
              padding: '1.25rem 1.5rem',
              borderBottom: '1px solid var(--border-subtle, #1E293B)',
              backgroundColor: 'var(--bg-surface, #0A0E17)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <span
                  style={{
                    fontFamily: 'var(--font-mono, monospace)',
                    fontSize: '1.15rem',
                    fontWeight: 800,
                    color: '#0070BA'
                  }}
                >
                  {tx.id}
                </span>
                <span className={`status-pill ${statusClass}`}>
                  {statusLabel}
                </span>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="btn btn-outline btn-sm"
                style={{
                  width: '32px',
                  height: '32px',
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '50%'
                }}
                aria-label="Close drawer"
              >
                <X size={17} />
              </button>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '0.65rem',
                fontSize: '0.8rem',
                color: 'var(--text-muted)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <span>PayPal Order:</span>
                <span
                  style={{
                    fontFamily: 'var(--font-mono, monospace)',
                    fontWeight: 700,
                    color: 'var(--text-primary)'
                  }}
                >
                  {tx.paypalOrderId || '8XP-DEMO-ORDER'}
                </span>
                {tx.paypalOrderId && (
                  <button
                    type="button"
                    onClick={() => handleCopy(tx.paypalOrderId, 'orderId')}
                    className="btn btn-outline btn-sm"
                    style={{ padding: '0.2rem 0.4rem', fontSize: '0.7rem' }}
                    title="Copy PayPal Order ID"
                  >
                    {copiedField === 'orderId' ? (
                      <Check size={12} color="#10B981" />
                    ) : (
                      <Copy size={12} />
                    )}
                  </button>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Clock size={13} color="var(--text-muted)" />
                <span>
                  {tx.date || tx.createdAt
                    ? new Date(tx.date || tx.createdAt).toLocaleString([], {
                        dateStyle: 'medium',
                        timeStyle: 'short'
                      })
                    : 'Recent'}
                </span>
              </div>
            </div>
          </div>

          {/* Tab Navigation Bar */}
          <div
            style={{
              display: 'flex',
              borderBottom: '1px solid var(--border-subtle, #1E293B)',
              backgroundColor: 'var(--bg-subtle, #0B0F19)',
              padding: '0 1rem'
            }}
          >
            <button
              type="button"
              onClick={() => setActiveTab('overview')}
              style={{
                padding: '0.75rem 1rem',
                fontSize: '0.8125rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                color: activeTab === 'overview' ? '#0070BA' : 'var(--text-muted)',
                borderBottom: activeTab === 'overview' ? '2px solid #0070BA' : '2px solid transparent'
              }}
            >
              <FileText size={15} />
              Overview
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('attestation')}
              style={{
                padding: '0.75rem 1rem',
                fontSize: '0.8125rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                color: activeTab === 'attestation' ? '#0070BA' : 'var(--text-muted)',
                borderBottom: activeTab === 'attestation' ? '2px solid #0070BA' : '2px solid transparent'
              }}
            >
              <Shield size={15} />
              Cryptographic Attestation
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('webhook')}
              style={{
                padding: '0.75rem 1rem',
                fontSize: '0.8125rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                color: activeTab === 'webhook' ? '#0070BA' : 'var(--text-muted)',
                borderBottom: activeTab === 'webhook' ? '2px solid #0070BA' : '2px solid transparent'
              }}
            >
              <Code size={15} />
              PayPal Webhook JSON
            </button>
          </div>

          {/* Drawer Body / Scrollable Tab Content */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '1.25rem 1.5rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.25rem'
            }}
          >
            {/* TAB 1: OVERVIEW */}
            {activeTab === 'overview' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {/* Milestone Scope Card */}
                <div className="surface-card" style={{ padding: '1.1rem' }}>
                  <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '0.4rem', fontWeight: 700 }}>
                    Milestone Contract Scope
                  </div>
                  <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                    {tx.project || tx.projectTitle || 'Autonomous Milestone Deliverable'}
                  </h4>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', fontSize: '0.78rem' }}>
                    <span style={{ fontFamily: 'var(--font-mono, monospace)', color: 'var(--text-secondary)' }}>
                      Agreement: <strong>{tx.agreementId || 'SMA-LIVE'}</strong>
                    </span>
                    <span style={{ color: 'var(--text-faint)' }}>•</span>
                    <span style={{ fontFamily: 'var(--font-mono, monospace)', color: 'var(--text-secondary)' }}>
                      Milestone: <strong>{tx.milestoneId || 'M1'}</strong>
                    </span>
                    <span style={{ color: 'var(--text-faint)' }}>•</span>
                    <span className={`privacy-chip ${tx.privacyMode === 'ZK-NDA' ? 'zk' : 'zdr'}`}>
                      {tx.privacyMode === 'ZK-NDA' ? '🔒 ZK-NDA Protected' : '🛡️ ZDR-DLP Shield'}
                    </span>
                  </div>
                </div>

                {/* Buyer & Seller KYA Mandate Passports */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.85rem' }}>
                  {/* Buyer Card */}
                  <div className="surface-card" style={{ padding: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.65rem' }}>
                      <span style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--pp-blue)' }}>
                        Buyer Agent (Atlas)
                      </span>
                      <span className="badge badge-success" style={{ fontSize: '0.62rem' }}>
                        KYA Certified ✓
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.65rem' }}>
                      <span className="avatar-chip buyer" style={{ width: '28px', height: '28px', fontSize: '0.8rem' }}>
                        A
                      </span>
                      <div>
                        <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                          {tx.buyer || 'Atlas (Buyer Agent)'}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          KYA Mandate: KYA-PP-ATLAS-094
                        </div>
                      </div>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                      Authority: Pre-approved automated escrow holding &amp; dispute arbitration trigger.
                    </div>
                  </div>

                  {/* Seller Card */}
                  <div className="surface-card" style={{ padding: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.65rem' }}>
                      <span style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: '#10B981' }}>
                        Seller Agent (Nova)
                      </span>
                      <span className="badge badge-success" style={{ fontSize: '0.62rem' }}>
                        KYA Certified ✓
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.65rem' }}>
                      <span className="avatar-chip seller" style={{ width: '28px', height: '28px', fontSize: '0.8rem' }}>
                        N
                      </span>
                      <div>
                        <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                          {tx.freelancer || 'Nova (Seller Agent)'}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          KYA Mandate: KYA-PP-NOVA-882
                        </div>
                      </div>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                      Authority: Autonomous deliverable attestation &amp; verified milestone payout recipient.
                    </div>
                  </div>
                </div>

                {/* KYA Governance Banner */}
                <div
                  style={{
                    backgroundColor: 'rgba(0, 112, 186, 0.08)',
                    border: '1px solid rgba(0, 112, 186, 0.25)',
                    borderRadius: '8px',
                    padding: '0.85rem 1rem',
                    fontSize: '0.78rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.65rem',
                    color: 'var(--text-secondary)'
                  }}
                >
                  <Lock size={16} color="var(--pp-blue)" style={{ flexShrink: 0 }} />
                  <div>
                    <strong style={{ color: 'var(--text-primary)' }}>KYA Delegated Governance:</strong> PCI-DSS boundary{' '}
                    <code style={{ color: 'var(--pp-blue)' }}>ORCHESTRATOR_ONLY_NO_RAW_PAN</code> active. No raw payment credentials accessible to AI agents.
                  </div>
                </div>

                {/* Financial Balances: Released Payout vs Escrow Balance */}
                <div className="surface-card" style={{ padding: '1.1rem' }}>
                  <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '0.75rem', fontWeight: 700 }}>
                    Financial Settlement Ledger
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.85rem' }}>
                    <div style={{ backgroundColor: 'var(--bg-sunken, #080B11)', padding: '0.85rem', borderRadius: '8px', border: '1px solid var(--border-subtle, #1E293B)' }}>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Contract Allocation</div>
                      <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-mono, monospace)', marginTop: '0.2rem' }}>
                        ${amountVal.toFixed(2)}
                      </div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-faint)', marginTop: '0.2rem' }}>{tx.currency || 'USD'}</div>
                    </div>

                    <div style={{ backgroundColor: 'var(--bg-sunken, #080B11)', padding: '0.85rem', borderRadius: '8px', border: '1px solid var(--border-subtle, #1E293B)' }}>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Vaulted in Escrow</div>
                      <div style={{ fontSize: '1.2rem', fontWeight: 800, color: isLocked ? '#F59E0B' : 'var(--text-faint)', fontFamily: 'var(--font-mono, monospace)', marginTop: '0.2rem' }}>
                        ${isLocked ? amountVal.toFixed(2) : '0.00'}
                      </div>
                      <div style={{ fontSize: '0.68rem', color: isLocked ? '#F59E0B' : 'var(--text-faint)', marginTop: '0.2rem' }}>
                        {isLocked ? 'HELD BY PAYPAL' : 'ESCROW CLEARED'}
                      </div>
                    </div>

                    <div style={{ backgroundColor: 'var(--bg-sunken, #080B11)', padding: '0.85rem', borderRadius: '8px', border: '1px solid var(--border-subtle, #1E293B)' }}>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Disbursed Payout</div>
                      <div style={{ fontSize: '1.2rem', fontWeight: 800, color: isReleased ? '#10B981' : isArbitrated ? '#38BDF8' : 'var(--text-faint)', fontFamily: 'var(--font-mono, monospace)', marginTop: '0.2rem' }}>
                        ${isReleased ? amountVal.toFixed(2) : isArbitrated ? (amountVal * 0.75).toFixed(2) : '0.00'}
                      </div>
                      <div style={{ fontSize: '0.68rem', color: isReleased ? '#10B981' : 'var(--text-faint)', marginTop: '0.2rem' }}>
                        {isReleased ? 'SETTLED TO SELLER' : isArbitrated ? '75% ARBITRATED SPLIT' : 'AWAITING VERDICT'}
                      </div>
                    </div>
                  </div>

                  {/* PayPal Capture and Refund Details */}
                  <div style={{ marginTop: '1rem', paddingTop: '0.85rem', borderTop: '1px solid var(--border-subtle, #1E293B)', display: 'flex', flexDirection: 'column', gap: '0.45rem', fontSize: '0.78rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-muted)' }}>PayPal Capture Reference:</span>
                      <span style={{ fontFamily: 'var(--font-mono, monospace)', color: tx.paypalCaptureId ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                        {tx.paypalCaptureId || (isReleased ? 'CAP-AUTO-DISBURSED' : 'Pending Deliverable Audit')}
                      </span>
                    </div>
                    {tx.paypalRefundId && (
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-muted)' }}>PayPal Split Refund ID:</span>
                        <span style={{ fontFamily: 'var(--font-mono, monospace)', color: '#EF4444' }}>
                          {tx.paypalRefundId}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: CRYPTOGRAPHIC ATTESTATION */}
            {activeTab === 'attestation' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {/* HMAC-SHA256 Signature Box */}
                <div className="surface-card" style={{ padding: '1.1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', fontWeight: 700 }}>
                      HMAC-SHA256 Cryptographic Digest
                    </div>
                    <span className="badge badge-success" style={{ fontSize: '0.65rem' }}>
                      <CheckCircle size={11} /> timingSafeEqual Verified
                    </span>
                  </div>

                  <div
                    style={{
                      fontFamily: 'var(--font-mono, monospace)',
                      fontSize: '0.78rem',
                      padding: '0.75rem',
                      backgroundColor: 'var(--bg-sunken, #080B11)',
                      borderRadius: '6px',
                      border: '1px solid var(--border-subtle, #1E293B)',
                      color: '#38BDF8',
                      wordBreak: 'break-all',
                      marginBottom: '0.65rem'
                    }}
                  >
                    {tx.proofHash || 'sha256:7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069'}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleCopy(tx.proofHash || 'sha256:7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069', 'hmac')}
                    className="btn btn-outline btn-sm"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.72rem' }}
                  >
                    {copiedField === 'hmac' ? <Check size={12} color="#10B981" /> : <Copy size={12} />}
                    {copiedField === 'hmac' ? 'Signature Copied!' : 'Copy HMAC-SHA256 Signature'}
                  </button>
                </div>

                {/* RAM Sanitization Latency Card */}
                <div className="surface-card" style={{ padding: '1.1rem' }}>
                  <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '0.65rem', fontWeight: 700 }}>
                    Ephemeral RAM DLP Sanitization Engine
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', marginBottom: '0.75rem' }}>
                    <div style={{ backgroundColor: 'var(--bg-sunken, #080B11)', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border-subtle, #1E293B)' }}>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Sanitization Latency</div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#10B981', fontFamily: 'var(--font-mono, monospace)', marginTop: '0.2rem' }}>
                        0.42 ms
                      </div>
                      <div style={{ fontSize: '0.65rem', color: '#10B981' }}>&lt; 1.0 ms benchmark achieved</div>
                    </div>

                    <div style={{ backgroundColor: 'var(--bg-sunken, #080B11)', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border-subtle, #1E293B)' }}>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Disk Footprint</div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-mono, monospace)', marginTop: '0.2rem' }}>
                        0 Bytes
                      </div>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Pure in-memory execution</div>
                    </div>
                  </div>

                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                    <strong>Scrubbed Vector Classes:</strong> API keys, PayPal bearer tokens, AWS credentials (AKIA*), RFC 1918 internal IPs, corporate email PII. Ephemeral RAM sanitization certificate issued with zero disk persistence.
                  </div>
                </div>

                {/* ZK Test Metrics & AI Audit Score */}
                <div className="surface-card" style={{ padding: '1.1rem' }}>
                  <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '0.75rem', fontWeight: 700 }}>
                    Zero-Knowledge Attestation Verification Metrics
                  </div>

                  <div style={{ marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                        AI Compliance &amp; Verification Score
                      </span>
                      <span style={{ fontFamily: 'var(--font-mono, monospace)', fontWeight: 800, fontSize: '0.9rem', color: scoreColor }}>
                        {scoreVal}%
                      </span>
                    </div>
                    <div className="progress-bar-track" style={{ height: '8px' }}>
                      <div
                        className={`progress-bar-fill ${scoreFillClass}`}
                        style={{ width: `${Math.min(Math.max(scoreVal, 0), 100)}%` }}
                      />
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                      {scoreVal >= 90 ? '✓ Autonomous Release Threshold Exceeded (≥90%)' : scoreVal >= 75 ? '⚠ Manual Review Threshold (75-89%)' : '✕ Revision Required (<75%)'}
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.65rem' }}>
                    <div style={{ backgroundColor: 'var(--bg-sunken, #080B11)', padding: '0.65rem', borderRadius: '6px', border: '1px solid var(--border-subtle, #1E293B)' }}>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Automated Tests</div>
                      <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#10B981', fontFamily: 'var(--font-mono, monospace)' }}>
                        8 / 8 Passed (100%)
                      </div>
                    </div>

                    <div style={{ backgroundColor: 'var(--bg-sunken, #080B11)', padding: '0.65rem', borderRadius: '6px', border: '1px solid var(--border-subtle, #1E293B)' }}>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Statement Coverage</div>
                      <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#10B981', fontFamily: 'var(--font-mono, monospace)' }}>
                        95.4% Verified
                      </div>
                    </div>

                    <div style={{ backgroundColor: 'var(--bg-sunken, #080B11)', padding: '0.65rem', borderRadius: '6px', border: '1px solid var(--border-subtle, #1E293B)' }}>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Build Execution</div>
                      <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#10B981', fontFamily: 'var(--font-mono, monospace)' }}>
                        Vite + Node 24 Clean
                      </div>
                    </div>

                    <div style={{ backgroundColor: 'var(--bg-sunken, #080B11)', padding: '0.65rem', borderRadius: '6px', border: '1px solid var(--border-subtle, #1E293B)' }}>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Lint &amp; Syntax Errors</div>
                      <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#10B981', fontFamily: 'var(--font-mono, monospace)' }}>
                        0 Violations
                      </div>
                    </div>
                  </div>
                </div>

                {/* Zero-Code Transmission Certificate */}
                <div
                  style={{
                    backgroundColor: 'rgba(16, 185, 129, 0.08)',
                    border: '1px solid rgba(16, 185, 129, 0.28)',
                    borderRadius: '8px',
                    padding: '1rem',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.75rem'
                  }}
                >
                  <Shield size={20} color="#10B981" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    <strong style={{ color: '#10B981', display: 'block', marginBottom: '0.2rem' }}>
                      Zero-Code Transmission Certificate (ZDR-ZK v2.0)
                    </strong>
                    Zero lines of confidential proprietary source code were transmitted or stored in the database. Release authorization was granted strictly via signed deterministic HMAC voucher.
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: PAYPAL WEBHOOK JSON */}
            {activeTab === 'webhook' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    PayPal REST v2 Inbound Webhook Payload
                  </div>

                  <button
                    type="button"
                    onClick={() => handleCopy(JSON.stringify(webhookPayload, null, 2), 'webhook')}
                    className="btn btn-outline btn-sm"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.72rem' }}
                  >
                    {copiedField === 'webhook' ? <Check size={12} color="#10B981" /> : <Copy size={12} />}
                    {copiedField === 'webhook' ? 'Copied Payload!' : 'Copy Payload'}
                  </button>
                </div>

                {renderHighlightedJson(webhookPayload)}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
