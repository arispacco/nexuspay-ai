// src/components/AgentNegotiator.jsx
import React, { useState } from 'react';
import { Bot, Zap, ShieldCheck, DollarSign, FileText, Lock, Receipt, CheckCircle2, Clock } from 'lucide-react';

export default function AgentNegotiator({
  onTriggerPayPalDeposit,
  activeAgreement,
  negotiationTranscript,
  isNegotiating,
  onStartNegotiation,
  sandboxConfig,
  onTelemetryRefresh
}) {
  const [projectTitle, setProjectTitle] = useState('Autonomous E-Commerce Recommender');
  const [projectScope, setProjectScope] = useState(
    'React checkout UI with PayPal Smart Buttons, webhook handler, and Python recommendation microservice'
  );
  const [budget, setBudget] = useState(350);
  const [freelancerSkills, setFreelancerSkills] = useState('React, Python, PayPal REST API, AI Embeddings');
  const [ndaRequired, setNdaRequired] = useState(true);
  const [invoiceInfo, setInvoiceInfo] = useState(null);
  const [generatingInvoice, setGeneratingInvoice] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setInvoiceInfo(null);
    onStartNegotiation({
      projectTitle,
      projectScope,
      initialBudget: budget,
      freelancerSkills,
      ndaRequired
    });
  };

  const handleCreatePayPalInvoice = async () => {
    if (!activeAgreement) return;
    setGeneratingInvoice(true);
    try {
      const res = await fetch('/api/paypal/create-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agreement: activeAgreement,
          clientId: sandboxConfig?.clientId,
          clientSecret: sandboxConfig?.clientSecret
        })
      });
      const data = await res.json();
      setInvoiceInfo(data);
      if (onTelemetryRefresh) onTelemetryRefresh();
    } catch (err) {
      console.error('Invoice issuance failed:', err);
    } finally {
      setGeneratingInvoice(false);
    }
  };

  // Helper to ensure 40/60 split display for milestones
  const getDisplayMilestones = (agreement) => {
    if (!agreement) return [];
    if (agreement.milestones && agreement.milestones.length >= 2) {
      return agreement.milestones;
    }
    const total = Number(agreement.totalBudget || 350);
    const m1Amount = Math.round(total * 0.4);
    const m2Amount = total - m1Amount;
    return [
      {
        id: 'M1',
        name: 'Milestone 1 (40% Initial Core Gate)',
        amount: m1Amount,
        criteria: [
          'Modular ES architecture with clean exports',
          'PayPal Smart Buttons checkout component with error guards'
        ]
      },
      {
        id: 'M2',
        name: 'Milestone 2 (60% Production Deployment Gate)',
        amount: m2Amount,
        criteria: [
          'Inbound PayPal webhook idempotency handler',
          'Autonomous deliverable test coverage and AST audit pass'
        ]
      }
    ];
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.5rem', alignItems: 'start' }}>
      {/* Left Column: RFP Mandate Builder */}
      <div className="surface-card" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
          <div style={{
            width: '38px',
            height: '38px',
            borderRadius: '9px',
            backgroundColor: 'rgba(0, 48, 135, 0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--pp-navy)',
            flexShrink: 0
          }}>
            <Bot size={20} />
          </div>
          <div>
            <h2 className="card-h3" style={{ fontSize: '1.05rem', fontWeight: 800 }}>
              Agentic RFP Mandate Builder
            </h2>
            <p className="body-secondary" style={{ fontSize: '0.78rem' }}>
              Define delegated parameters for Atlas (Buyer) &amp; Nova (Seller)
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label
              htmlFor="rfp-title"
              style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.35rem' }}
            >
              Project Deliverable Title
            </label>
            <input
              id="rfp-title"
              type="text"
              value={projectTitle}
              onChange={(e) => setProjectTitle(e.target.value)}
              style={{
                width: '100%',
                padding: '0.65rem 0.85rem',
                borderRadius: '8px',
                border: '1px solid var(--border-subtle)',
                backgroundColor: 'var(--bg-subtle)',
                color: 'var(--text-primary)',
                fontSize: '0.875rem'
              }}
              required
            />
          </div>

          <div>
            <label
              htmlFor="rfp-scope"
              style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.35rem' }}
            >
              Technical Scope &amp; Acceptance Gates
            </label>
            <textarea
              id="rfp-scope"
              value={projectScope}
              onChange={(e) => setProjectScope(e.target.value)}
              rows={3}
              style={{
                width: '100%',
                padding: '0.65rem 0.85rem',
                borderRadius: '8px',
                border: '1px solid var(--border-subtle)',
                backgroundColor: 'var(--bg-subtle)',
                color: 'var(--text-primary)',
                fontSize: '0.85rem',
                lineHeight: 1.45,
                resize: 'vertical'
              }}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
            <div>
              <label
                htmlFor="rfp-budget"
                style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.35rem' }}
              >
                Budget Ceiling (USD)
              </label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '0.875rem' }}>$</span>
                <input
                  id="rfp-budget"
                  type="number"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem 0.65rem 1.75rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border-subtle)',
                    backgroundColor: 'var(--bg-subtle)',
                    color: 'var(--text-primary)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.875rem'
                  }}
                  min="50"
                  max="50000"
                  required
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="rfp-skills"
                style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.35rem' }}
              >
                Required Tech Stack
              </label>
              <input
                id="rfp-skills"
                type="text"
                value={freelancerSkills}
                onChange={(e) => setFreelancerSkills(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  borderRadius: '8px',
                  border: '1px solid var(--border-subtle)',
                  backgroundColor: 'var(--bg-subtle)',
                  color: 'var(--text-primary)',
                  fontSize: '0.875rem'
                }}
              />
            </div>
          </div>

          {/* Enterprise Confidentiality & NDA Toggle */}
          <label
            htmlFor="rfp-nda"
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.75rem',
              padding: '0.85rem',
              borderRadius: '8px',
              backgroundColor: 'var(--bg-subtle)',
              border: '1px solid var(--border-subtle)',
              cursor: 'pointer'
            }}
          >
            <input
              id="rfp-nda"
              type="checkbox"
              checked={ndaRequired}
              onChange={(e) => setNdaRequired(e.target.checked)}
              style={{ marginTop: '0.2rem', accentColor: 'var(--pp-navy)' }}
            />
            <div style={{ fontSize: '0.78rem', lineHeight: 1.45 }}>
              <div style={{ fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Lock size={13} color="var(--pp-blue)" /> Strict Enterprise NDA &amp; Privacy Shield
              </div>
              <span style={{ color: 'var(--text-muted)' }}>
                Activates RAM DLP secret masking and Zero-Knowledge HMAC-SHA256 CI verification (zero source code exposed).
              </span>
            </div>
          </label>

          <button
            id="btn-launch-negotiation"
            type="submit"
            disabled={isNegotiating}
            className="btn btn-primary"
            style={{ width: '100%', padding: '0.75rem', fontSize: '0.875rem' }}
          >
            {isNegotiating ? (
              <>
                <Zap size={16} /> Agents Bargaining via KYA Protocol...
              </>
            ) : (
              <>
                <Zap size={16} /> Launch Dual-Agent Negotiation
              </>
            )}
          </button>
        </form>
      </div>

      {/* Right Column: Live Transcript & Co-signed Agreement */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {/* Live Transcript Stream */}
        <div className="surface-card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <h3 className="card-h3" style={{ fontSize: '1rem', fontWeight: 700 }}>
              Autonomous Negotiation Transcript
            </h3>
            <span className={`status-pill ${isNegotiating ? 'badge-warning' : 'badge-zk'}`}>
              {isNegotiating ? 'Live Bargaining' : 'KYA Verified Stream'}
            </span>
          </div>

          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.85rem',
            maxHeight: '280px',
            overflowY: 'auto',
            paddingRight: '0.35rem'
          }}>
            {negotiationTranscript && negotiationTranscript.length > 0 ? (
              negotiationTranscript.map((t, idx) => {
                const isBuyer = t.agent === 'BuyerAgent' || t.speaker === 'Buyer' || t.name?.includes('Atlas');
                const avatarLetter = isBuyer ? 'A' : 'N';
                const displayName = isBuyer ? 'Atlas (Buyer Agent)' : 'Nova (Seller Agent)';
                const roleLabel = isBuyer ? 'Buyer Mandate' : 'Seller Agent';

                return (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: isBuyer ? 'flex-start' : 'flex-end',
                      width: '100%'
                    }}
                  >
                    {/* Header with avatar chip, name, role badge, timestamp */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.45rem',
                      marginBottom: '0.25rem',
                      fontSize: '0.74rem'
                    }}>
                      <span className={`avatar-chip ${isBuyer ? 'buyer' : 'seller'}`}>{avatarLetter}</span>
                      <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{displayName}</span>
                      <span className="body-secondary" style={{ fontSize: '0.68rem', color: 'var(--text-faint)' }}>• {roleLabel}</span>
                      {t.timestamp && (
                        <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
                          <Clock size={10} /> {new Date(t.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>
                      )}
                    </div>

                    {/* Chat Bubble */}
                    <div style={{
                      maxWidth: '88%',
                      padding: '0.75rem 0.95rem',
                      borderRadius: isBuyer ? '4px 12px 12px 12px' : '12px 4px 12px 12px',
                      backgroundColor: isBuyer ? 'var(--bg-subtle)' : 'rgba(0, 112, 186, 0.08)',
                      border: isBuyer ? '1px solid var(--border-subtle)' : '1px solid rgba(0, 112, 186, 0.22)',
                      fontSize: '0.82rem',
                      lineHeight: 1.5,
                      color: 'var(--text-primary)'
                    }}>
                      {t.message || t.text}
                    </div>
                  </div>
                );
              })
            ) : (
              <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--text-muted)', fontSize: '0.84rem' }}>
                Launch the negotiation on the left or select an Executive Scenario to watch <strong>Atlas</strong> and <strong>Nova</strong> negotiate milestone splits and KYA mandates.
              </div>
            )}
          </div>
        </div>

        {/* Co-signed KYA Smart Milestone Agreement Card (Clean Fintech Surface Card) */}
        {activeAgreement && (
          <div className="surface-card-elevated" style={{ padding: '1.5rem' }}>
            {/* Agreement Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FileText size={18} color="var(--pp-blue)" />
                <span className="font-mono" style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                  {activeAgreement.id}
                </span>
                {activeAgreement.ndaProtected && (
                  <span className="privacy-chip zk" style={{ fontSize: '0.68rem' }}>
                    <Lock size={11} /> NDA PROTECTED
                  </span>
                )}
              </div>
              <span className="status-pill badge-released">
                KYA CO-SIGNED (40/60)
              </span>
            </div>

            <h4 className="card-h3" style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '0.35rem' }}>
              {activeAgreement.title}
            </h4>
            <p className="body-secondary" style={{ fontSize: '0.8125rem', marginBottom: '1rem' }}>
              {activeAgreement.scope}
            </p>

            {/* KYA Mandate Verification Strip */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '0.75rem',
              marginBottom: '1rem'
            }}>
              <div style={{
                padding: '0.65rem 0.8rem',
                borderRadius: '8px',
                backgroundColor: 'var(--bg-subtle)',
                border: '1px solid var(--border-subtle)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 700, fontSize: '0.76rem', color: 'var(--pp-navy)' }}>
                  <ShieldCheck size={14} />
                  <span>Atlas Mandate (Buyer)</span>
                </div>
                <div className="font-mono" style={{ color: 'var(--text-muted)', fontSize: '0.7rem', marginTop: '3px' }}>
                  KYA-PP-ATLAS • Max Spend: ${activeAgreement.totalBudget}
                </div>
              </div>

              <div style={{
                padding: '0.65rem 0.8rem',
                borderRadius: '8px',
                backgroundColor: 'var(--bg-subtle)',
                border: '1px solid var(--border-subtle)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 700, fontSize: '0.76rem', color: '#10B981' }}>
                  <ShieldCheck size={14} />
                  <span>Nova Mandate (Seller)</span>
                </div>
                <div className="font-mono" style={{ color: 'var(--text-muted)', fontSize: '0.7rem', marginTop: '3px' }}>
                  KYA-PP-NOVA • Merchant Verified
                </div>
              </div>
            </div>

            {/* Milestones Itemization (40/60 Split) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '1.2rem' }}>
              {getDisplayMilestones(activeAgreement).map((m, mIdx) => (
                <div
                  key={m.id || mIdx}
                  style={{
                    padding: '0.75rem 0.95rem',
                    borderRadius: '8px',
                    backgroundColor: 'var(--bg-subtle)',
                    border: '1px solid var(--border-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '0.75rem'
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.84rem', color: 'var(--text-primary)' }}>
                      {m.name}
                    </div>
                    <div className="body-secondary" style={{ fontSize: '0.74rem', marginTop: '2px' }}>
                      {Array.isArray(m.criteria) ? m.criteria.join(' • ') : m.criteria}
                    </div>
                  </div>
                  <div className="font-mono" style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--pp-blue)', whiteSpace: 'nowrap' }}>
                    ${Number(m.amount).toFixed(2)}
                  </div>
                </div>
              ))}
            </div>

            {/* PayPal Milestone Invoice Confirmation (if issued) */}
            {invoiceInfo && (
              <div style={{
                padding: '0.75rem 0.95rem',
                borderRadius: '8px',
                backgroundColor: 'var(--status-released-bg)',
                border: '1px solid var(--status-released-border)',
                color: 'var(--status-released-text)',
                fontSize: '0.78rem',
                marginBottom: '1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '0.5rem'
              }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontWeight: 600 }}>
                  <CheckCircle2 size={16} />
                  <span>PayPal Invoice <code>{invoiceInfo.invoiceId}</code> created via MCP <code>create_invoice</code></span>
                </span>
                <span className="font-mono" style={{ fontWeight: 700 }}>#{invoiceInfo.invoiceNumber}</span>
              </div>
            )}

            {/* Total Budget & Dual PayPal Action Row */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingTop: '0.95rem',
              borderTop: '1px solid var(--border-subtle)',
              flexWrap: 'wrap',
              gap: '0.85rem'
            }}>
              <div>
                <span className="body-secondary" style={{ fontSize: '0.74rem', display: 'block' }}>Total Escrow Commitment</span>
                <span className="font-mono" style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  ${Number(activeAgreement.totalBudget).toFixed(2)}{' '}
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500 }}>USD</span>
                </span>
              </div>

              <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                <button
                  id="btn-create-paypal-invoice"
                  type="button"
                  onClick={handleCreatePayPalInvoice}
                  disabled={generatingInvoice}
                  className="btn btn-outline btn-sm"
                  style={{ padding: '0.65rem 0.95rem' }}
                >
                  <Receipt size={15} />
                  <span>{generatingInvoice ? 'Issuing...' : 'PayPal Invoice'}</span>
                </button>

                <button
                  id="btn-fund-paypal-escrow"
                  type="button"
                  onClick={() => onTriggerPayPalDeposit(activeAgreement)}
                  className="btn btn-paypal"
                  style={{ padding: '0.65rem 1.25rem', fontSize: '0.875rem' }}
                >
                  <DollarSign size={16} />
                  <span>Deposit Escrow via PayPal</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
