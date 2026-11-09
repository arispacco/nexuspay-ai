// src/components/DisputeArbitrator.jsx
import React, { useState } from 'react';
import { Scale, CheckCircle2, ArrowRightLeft, ShieldCheck, Sparkles, AlertCircle, FileText } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function DisputeArbitrator({ onDisputeResolved, sandboxConfig, onTelemetryRefresh }) {
  const [disputeCase, setDisputeCase] = useState({
    contractId: 'SMA-3204',
    title: 'Fintech Mobile UI & PayPal SDK Integration',
    totalBudget: 500,
    clientClaim:
      'Freelancer delivered the core screens and PayPal checkout flow, but missed the secondary tablet breakpoints and had a minor delay.',
    freelancerClaim:
      'All 8 primary screens, PayPal Smart Buttons, and capture hooks were delivered and verified. Tablet breakpoints were an unscheduled bonus.'
  });

  const [isArbitrating, setIsArbitrating] = useState(false);
  const [arbitrationResult, setArbitrationResult] = useState(null);
  const [isExecutingSettlement, setIsExecutingSettlement] = useState(false);
  const [settlementExecuted, setSettlementExecuted] = useState(false);

  const handleArbitrate = async () => {
    setIsArbitrating(true);
    setSettlementExecuted(false);
    try {
      const res = await fetch('/api/arbitrate-dispute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contract: {
            id: disputeCase.contractId,
            title: disputeCase.title,
            totalBudget: disputeCase.totalBudget
          },
          clientClaim: disputeCase.clientClaim,
          freelancerClaim: disputeCase.freelancerClaim,
          geminiApiKey: sandboxConfig?.geminiApiKey
        })
      });

      const data = await res.json();
      setTimeout(() => {
        setIsArbitrating(false);
        setArbitrationResult(data);
      }, 450);
    } catch (err) {
      console.error(err);
      setIsArbitrating(false);
    }
  };

  const handleExecuteSettlement = async () => {
    setIsExecutingSettlement(true);
    try {
      const refundAmt = arbitrationResult?.allocation?.clientRefundAmount || Math.round(disputeCase.totalBudget * 0.75);
      const res = await fetch('/api/paypal/refund-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          captureId: `CAP-ARB-${disputeCase.contractId}`,
          amount: refundAmt,
          reason: arbitrationResult?.summary || 'Equitable 3-way arbitration settlement executed',
          clientId: sandboxConfig?.clientId,
          clientSecret: sandboxConfig?.clientSecret
        })
      });

      const data = await res.json();
      setSettlementExecuted(true);
      setIsExecutingSettlement(false);
      confetti({ particleCount: 75, spread: 65, origin: { y: 0.6 } });
      if (onDisputeResolved) onDisputeResolved(data);
      if (onTelemetryRefresh) onTelemetryRefresh();
    } catch (err) {
      console.error(err);
      setIsExecutingSettlement(false);
    }
  };

  const buyerRefundPercent = arbitrationResult?.allocation?.clientRefundPercent ?? 75;
  const sellerPayoutPercent = arbitrationResult?.allocation?.freelancerPayoutPercent ?? 25;
  const protocolFeePercent = 0;

  const buyerRefundAmount = arbitrationResult?.allocation?.clientRefundAmount ?? Math.round(disputeCase.totalBudget * (buyerRefundPercent / 100));
  const sellerPayoutAmount = arbitrationResult?.allocation?.freelancerPayoutAmount ?? (disputeCase.totalBudget - buyerRefundAmount);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.5rem', alignItems: 'start' }}>
      {/* Left Column: Side-by-side Buyer & Seller Claims with Evidence Chips */}
      <div className="surface-card" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.15rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '9px',
              backgroundColor: 'rgba(0, 48, 135, 0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--pp-navy)'
            }}>
              <Scale size={19} />
            </div>
            <div>
              <h2 className="card-h3" style={{ fontSize: '1.05rem', fontWeight: 800 }}>
                Escrow Dispute Tribunal
              </h2>
              <p className="body-secondary" style={{ fontSize: '0.78rem' }}>
                Impartial AI mediation of contested deliverables
              </p>
            </div>
          </div>
          <span className="status-pill badge-locked">
            IN MEDIATION
          </span>
        </div>

        {/* Contract Meta Card */}
        <div style={{
          backgroundColor: 'var(--bg-subtle)',
          padding: '0.95rem 1.15rem',
          borderRadius: '10px',
          border: '1px solid var(--border-subtle)',
          marginBottom: '1.25rem'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem', fontSize: '0.82rem' }}>
            <span style={{ color: 'var(--text-muted)' }}>Contested Agreement:</span>
            <span className="font-mono" style={{ fontWeight: 700 }}>{disputeCase.contractId}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem', fontSize: '0.82rem' }}>
            <span style={{ color: 'var(--text-muted)' }}>Scope:</span>
            <span style={{ fontWeight: 600, color: 'var(--text-primary)', textAlign: 'right', maxWidth: '65%' }}>
              {disputeCase.title}
            </span>
          </div>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            paddingTop: '0.65rem',
            borderTop: '1px solid var(--border-subtle)',
            marginTop: '0.45rem'
          }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>Vaulted Escrow Total:</span>
            <span className="font-mono" style={{ fontWeight: 800, fontSize: '1.2rem', color: 'var(--pp-blue)' }}>
              ${disputeCase.totalBudget}.00 USD
            </span>
          </div>
        </div>

        {/* Side-by-side or stacked claims */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.25rem' }}>
          {/* Buyer Claim Card */}
          <div style={{
            padding: '1rem',
            borderRadius: '10px',
            backgroundColor: 'var(--bg-subtle)',
            border: '1px solid var(--border-subtle)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.82rem', fontWeight: 700 }}>
                <span className="avatar-chip buyer">A</span>
                <span>Buyer Claim (Atlas Mandate)</span>
              </div>
              <span className="status-pill badge-zk" style={{ fontSize: '0.64rem' }}>Claimant</span>
            </div>

            <textarea
              rows={3}
              value={disputeCase.clientClaim}
              onChange={(e) => setDisputeCase({ ...disputeCase, clientClaim: e.target.value })}
              style={{
                width: '100%',
                padding: '0.65rem 0.8rem',
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '8px',
                fontSize: '0.82rem',
                lineHeight: 1.45,
                color: 'var(--text-primary)',
                resize: 'vertical',
                marginBottom: '0.6rem'
              }}
            />

            {/* Buyer Evidence Chips */}
            <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
              <span className="status-pill badge-locked" style={{ fontSize: '0.64rem' }}>
                Primary Checkout Flow OK
              </span>
              <span className="status-pill badge-dispute" style={{ fontSize: '0.64rem' }}>
                Missing Tablet Breakpoints
              </span>
              <span className="status-pill badge-locked" style={{ fontSize: '0.64rem' }}>
                12h Timeline Delay
              </span>
            </div>
          </div>

          {/* Freelancer Rebuttal Card */}
          <div style={{
            padding: '1rem',
            borderRadius: '10px',
            backgroundColor: 'var(--bg-subtle)',
            border: '1px solid var(--border-subtle)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.82rem', fontWeight: 700 }}>
                <span className="avatar-chip seller">N</span>
                <span>Freelancer Defense (Nova Agent)</span>
              </div>
              <span className="status-pill badge-released" style={{ fontSize: '0.64rem' }}>Respondent</span>
            </div>

            <textarea
              rows={3}
              value={disputeCase.freelancerClaim}
              onChange={(e) => setDisputeCase({ ...disputeCase, freelancerClaim: e.target.value })}
              style={{
                width: '100%',
                padding: '0.65rem 0.8rem',
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '8px',
                fontSize: '0.82rem',
                lineHeight: 1.45,
                color: 'var(--text-primary)',
                resize: 'vertical',
                marginBottom: '0.6rem'
              }}
            />

            {/* Freelancer Evidence Chips */}
            <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
              <span className="status-pill badge-released" style={{ fontSize: '0.64rem' }}>
                8 Core Screens Complete
              </span>
              <span className="status-pill badge-released" style={{ fontSize: '0.64rem' }}>
                PayPal Smart Buttons Verified
              </span>
              <span className="status-pill badge-zk" style={{ fontSize: '0.64rem' }}>
                Tablet Layout Out of Initial Scope
              </span>
            </div>
          </div>
        </div>

        <button
          id="btn-convene-tribunal"
          type="button"
          onClick={handleArbitrate}
          disabled={isArbitrating}
          className="btn btn-primary"
          style={{ width: '100%', padding: '0.75rem', fontSize: '0.875rem' }}
        >
          {isArbitrating ? (
            <>
              <Sparkles size={16} /> AI Tribunal Evaluating Scope &amp; Evidence...
            </>
          ) : (
            <>
              <Scale size={16} /> Convene AI Arbitration Tribunal
            </>
          )}
        </button>
      </div>

      {/* Right Column: Visual 3-Way Split Dial & AI Reasoning Panel */}
      <div className="surface-card" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.15rem' }}>
          <h3 className="card-h3" style={{ fontSize: '1rem', fontWeight: 700 }}>
            Arbitration Tribunal Resolution
          </h3>
          {arbitrationResult && (
            <span className="status-pill badge-released">
              RULING FINALIZED
            </span>
          )}
        </div>

        {arbitrationResult ? (
          <div>
            {/* Tribunal Ruling Executive Summary */}
            <div style={{
              padding: '0.95rem 1.15rem',
              borderRadius: '10px',
              backgroundColor: 'rgba(0, 112, 186, 0.08)',
              border: '1px solid rgba(0, 112, 186, 0.22)',
              fontSize: '0.82rem',
              lineHeight: 1.5,
              color: 'var(--text-primary)',
              marginBottom: '1.25rem'
            }}>
              <strong>Impartial Tribunal Ruling:</strong> {arbitrationResult.ruling}
            </div>

            {/* Visual 3-Way Arbitration Split Dial / Proportional Bar */}
            <div style={{
              backgroundColor: 'var(--bg-subtle)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '10px',
              padding: '1.15rem',
              marginBottom: '1.25rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                <span className="body-secondary" style={{ fontSize: '0.76rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Visual 3-Way Escrow Settlement Allocation
                </span>
                <span className="font-mono" style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  100% Capital Parity
                </span>
              </div>

              {/* 3-segment proportion bar */}
              <div style={{
                height: '14px',
                borderRadius: '9999px',
                overflow: 'hidden',
                display: 'flex',
                backgroundColor: 'var(--bg-sunken)',
                marginBottom: '1rem',
                border: '1px solid var(--border-subtle)'
              }}>
                <div
                  style={{
                    width: `${buyerRefundPercent}%`,
                    backgroundColor: 'var(--pp-blue)',
                    transition: 'width 0.4s ease'
                  }}
                  title={`Buyer Refund: ${buyerRefundPercent}%`}
                />
                <div
                  style={{
                    width: `${sellerPayoutPercent}%`,
                    backgroundColor: '#10B981',
                    transition: 'width 0.4s ease'
                  }}
                  title={`Freelancer Payout: ${sellerPayoutPercent}%`}
                />
                <div
                  style={{
                    width: `${protocolFeePercent}%`,
                    backgroundColor: 'var(--text-faint)'
                  }}
                  title="Protocol Fee: $0.00 (0%)"
                />
              </div>

              {/* 3-Way Split Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.65rem' }}>
                {/* 1. Client Refund */}
                <div style={{
                  padding: '0.75rem 0.6rem',
                  borderRadius: '8px',
                  backgroundColor: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  textAlign: 'center'
                }}>
                  <div className="body-secondary" style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    Buyer Refund ({buyerRefundPercent}%)
                  </div>
                  <div className="font-mono" style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--pp-blue)', marginTop: '0.2rem' }}>
                    ${buyerRefundAmount}.00
                  </div>
                </div>

                {/* 2. Freelancer Payout */}
                <div style={{
                  padding: '0.75rem 0.6rem',
                  borderRadius: '8px',
                  backgroundColor: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  textAlign: 'center'
                }}>
                  <div className="body-secondary" style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    Freelancer ({sellerPayoutPercent}%)
                  </div>
                  <div className="font-mono" style={{ fontSize: '1.15rem', fontWeight: 800, color: '#10B981', marginTop: '0.2rem' }}>
                    ${sellerPayoutAmount}.00
                  </div>
                </div>

                {/* 3. Protocol Fee */}
                <div style={{
                  padding: '0.75rem 0.6rem',
                  borderRadius: '8px',
                  backgroundColor: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  textAlign: 'center'
                }}>
                  <div className="body-secondary" style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    Protocol Fee (0%)
                  </div>
                  <div className="font-mono" style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                    $0.00
                  </div>
                </div>
              </div>
            </div>

            {/* AI Reasoning Breakdown Panel */}
            <div style={{ marginBottom: '1.25rem' }}>
              <span className="body-secondary" style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.5rem' }}>
                AI Jurisprudence Analysis &amp; Contract Scope Evidence
              </span>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {arbitrationResult.analysisBreakdown?.map((factor, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: '0.7rem 0.85rem',
                      borderRadius: '8px',
                      backgroundColor: 'var(--bg-subtle)',
                      border: '1px solid var(--border-subtle)',
                      fontSize: '0.8rem',
                      lineHeight: 1.45
                    }}
                  >
                    <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{factor.factor}: </span>
                    <span style={{ color: 'var(--text-secondary)' }}>{factor.finding}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 1-Click PayPal Settlement Execution */}
            {!settlementExecuted ? (
              <button
                id="btn-execute-split-refund"
                type="button"
                onClick={handleExecuteSettlement}
                disabled={isExecutingSettlement}
                className="btn btn-paypal"
                style={{ width: '100%', padding: '0.85rem', fontSize: '0.92rem' }}
              >
                <ArrowRightLeft size={18} />
                <span>{isExecutingSettlement ? 'Executing PayPal Split Refund...' : 'Execute 1-Click PayPal Settlement'}</span>
              </button>
            ) : (
              <div style={{
                padding: '1rem',
                borderRadius: '8px',
                backgroundColor: 'var(--status-released-bg)',
                border: '1px solid var(--status-released-border)',
                color: 'var(--status-released-text)',
                fontSize: '0.84rem',
                textAlign: 'center'
              }}>
                <CheckCircle2 size={24} style={{ margin: '0 auto 0.35rem auto' }} />
                <div style={{ fontWeight: 800, fontSize: '0.98rem' }}>PayPal Settlement Executed &amp; Ledger Updated!</div>
                <div className="font-mono" style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>
                  Refunded ${buyerRefundAmount}.00 to buyer • Released ${sellerPayoutAmount}.00 to freelancer • Escrow status: ARBITRATED_SPLIT
                </div>
              </div>
            )}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '3.5rem 1rem', color: 'var(--text-muted)', fontSize: '0.84rem', lineHeight: 1.5 }}>
            Review the contested claims on the left and click <strong>Convene AI Arbitration Tribunal</strong> to compute an impartial 3-way split allocation and execute PayPal settlement.
          </div>
        )}
      </div>
    </div>
  );
}
