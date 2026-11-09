// src/components/DeliverableAuditor.jsx
import React, { useState, useEffect, useMemo } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Code,
  Sparkles,
  DollarSign,
  Lock,
  EyeOff,
  Terminal,
  ShieldAlert,
  KeyRound,
  FileCode,
  Check,
  AlertCircle
} from 'lucide-react';
import confetti from 'canvas-confetti';

const CLEAN_CODE_SAMPLE = `import React from 'react';
import { PayPalButtons } from '@paypal/react-paypal-js';

export function AutonomousCheckout({ amount, onCapture }) {
  return (
    <div className="checkout-card">
      <h3>Instant PayPal Milestone Checkout</h3>
      <PayPalButtons
        style={{ layout: "vertical", color: "gold", shape: "rect" }}
        createOrder={(data, actions) => {
          return actions.order.create({
            purchase_units: [{ amount: { value: String(amount) } }]
          });
        }}
        onApprove={async (data, actions) => {
          try {
            const details = await actions.order.capture();
            onCapture(details);
          } catch (err) {
            console.error("Capture error:", err);
          }
        }}
      />
    </div>
  );
}`;

const SECRET_LEAK_SAMPLE = `import React from 'react';
import { PayPalButtons } from '@paypal/react-paypal-js';

// Developer accidentally left confidential credentials & internal PII in code:
const PAYPAL_CLIENT_SECRET = "EK992837465_proprietary_sandbox_key";
const PROPRIETARY_API_KEY = "test_secret_live_998877665544";
const INTERNAL_CONTACT = "security-lead@acme-bank-nda.org";

export async function verifyAndCaptureOrder(orderId) {
  try {
    const res = await fetch("https://10.24.18.92/internal-ledger", {
      method: "POST",
      body: JSON.stringify({ orderId, PayPalButtons: true })
    });
    return await res.json();
  } catch (err) {
    return { status: "fallback", error: err.message };
  }
}`;

const BROKEN_SYNTAX_SAMPLE = `// Incomplete draft with unbalanced braces and missing PayPal integration
function brokenDraft() {
  // TODO: not implemented yet
  if (true) {
    console.log("unfinished");
`;

export default function DeliverableAuditor({
  agreement,
  initialMode = 'zdr',
  onMilestoneReleased,
  sandboxConfig,
  onTelemetryRefresh
}) {
  const [auditMode, setAuditMode] = useState(initialMode); // 'zdr' | 'zk-nda'
  const [repoUrl, setRepoUrl] = useState('https://github.com/arispacco/nexuspay-ai');
  const [demoUrl, setDemoUrl] = useState('https://nexuspay-ai.onrender.com');
  const [deliverableCode, setDeliverableCode] = useState(CLEAN_CODE_SAMPLE);

  // Zero-Knowledge Proof State
  const [zkBundle, setZkBundle] = useState(null);
  const [zkTestsPassed, setZkTestsPassed] = useState(24);
  const [zkTotalTests] = useState(24);
  const [zkCoverage, setZkCoverage] = useState(95);

  const [isAuditing, setIsAuditing] = useState(false);
  const [auditResult, setAuditResult] = useState(null);
  const [isReleasing, setIsReleasing] = useState(false);
  const [releasedData, setReleasedData] = useState(null);

  useEffect(() => {
    setAuditMode(initialMode || 'zdr');
    setAuditResult(null);
    setReleasedData(null);
  }, [initialMode, agreement?.id]);

  // Real-time client-side DLP pre-flight detection
  const detectedSecretsPreview = useMemo(() => {
    const findings = [];
    if (/(?:test_secret_live_|mock_secret_|sk_test_|AIza)[a-zA-Z0-9_-]{10,}/.test(deliverableCode)) {
      findings.push({ id: 'secret-live', label: 'Live/Test Secret Key', token: 'test_secret_...' });
    }
    if (/PAYPAL_CLIENT_SECRET\s*=\s*["'][^"']+["']|EK[0-9A-Za-z_-]{20,}/.test(deliverableCode)) {
      findings.push({ id: 'pp-secret', label: 'PayPal Secret', token: 'EK99...' });
    }
    if (/[a-zA-Z0-9._%+-]+@acme-bank-nda\.org/.test(deliverableCode)) {
      findings.push({ id: 'pii-email', label: 'Confidential PII Email', token: 'security-lead@...' });
    }
    if (/\b(?:10\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3})\b/.test(deliverableCode)) {
      findings.push({ id: 'priv-ip', label: 'Private Subnet IP', token: '10.24.18.92' });
    }
    return findings;
  }, [deliverableCode]);

  // Code editor lines
  const codeLines = useMemo(() => {
    return deliverableCode.split('\n');
  }, [deliverableCode]);

  // Run ZDR + DLP Code Audit
  const handleRunZdrAudit = async (overrideCode) => {
    const contentToAudit = overrideCode !== undefined ? overrideCode : deliverableCode;
    if (overrideCode !== undefined) setDeliverableCode(overrideCode);

    setIsAuditing(true);
    setAuditResult(null);
    setReleasedData(null);

    try {
      const res = await fetch('/api/verify-deliverable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          milestone: agreement?.milestones?.[0],
          deliverableType: 'code',
          deliverableContent: contentToAudit,
          deliverableUrl: demoUrl,
          repoUrl,
          geminiApiKey: sandboxConfig?.geminiApiKey
        })
      });
      const data = await res.json();
      setTimeout(() => {
        setIsAuditing(false);
        setAuditResult(data);
        if (data.verdict === 'AUTO_RELEASE_PAYOUT') {
          confetti({ particleCount: 50, spread: 60 });
        }
      }, 420);
    } catch (err) {
      console.error(err);
      setIsAuditing(false);
    }
  };

  // Generate + Verify Zero-Knowledge Attestation Proof (0% Source Code Exposed)
  const handleGenerateAndVerifyZkProof = async ({ tamper = false } = {}) => {
    setIsAuditing(true);
    setAuditResult(null);
    setReleasedData(null);

    try {
      const genRes = await fetch('/api/privacy/generate-zk-proof', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agreementId: agreement?.id || 'SMA-NDA-600',
          milestoneId: 'M1',
          ndaDomain: 'enterprise-vault-ci.private',
          testSuiteSummary: {
            totalTests: zkTotalTests,
            passedTests: Number(zkTestsPassed),
            coveragePercent: Number(zkCoverage),
            buildPassed: true,
            lintErrors: 0
          }
        })
      });
      const bundle = await genRes.json();

      const finalBundle = tamper
        ? {
            ...bundle,
            hmacSha256Signature: 'deadbeef00000000tampered99999999deadbeef00000000tampered99999999'
          }
        : bundle;

      setZkBundle(finalBundle);

      const verRes = await fetch('/api/privacy/verify-zk-proof', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attestationBundle: finalBundle })
      });
      const verData = await verRes.json();

      setTimeout(() => {
        setIsAuditing(false);
        setAuditResult(verData);
        if (verData.verdict === 'AUTO_RELEASE_PAYOUT') {
          confetti({ particleCount: 60, spread: 70 });
        }
      }, 380);
    } catch (err) {
      console.error(err);
      setIsAuditing(false);
    }
  };

  // Execute PayPal Capture
  const handleExecutePayPalRelease = async () => {
    setIsReleasing(true);
    try {
      const res = await fetch('/api/paypal/capture-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: agreement?.paypalOrderId || `8XP${Date.now().toString().slice(-8)}`,
          agreementId: agreement?.id || 'SMA-LIVE',
          score: auditResult?.overallScore || 95,
          privacyMode: auditMode === 'zk-nda' ? 'ZK-NDA' : 'ZDR-DLP',
          proofHash: auditResult?.auditCertificate?.hash || 'sha256:verified',
          clientId: sandboxConfig?.clientId,
          clientSecret: sandboxConfig?.clientSecret
        })
      });
      const data = await res.json();
      setReleasedData(data);
      setIsReleasing(false);
      confetti({ particleCount: 95, spread: 80, origin: { y: 0.55 } });
      if (onMilestoneReleased) onMilestoneReleased(data);
      if (onTelemetryRefresh) onTelemetryRefresh();
    } catch (err) {
      console.error(err);
      setIsReleasing(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Mode Toggle Header: Ephemeral RAM DLP vs Zero-Knowledge CI Attestation */}
      <div className="surface-card" style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.85rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 800, fontSize: '0.98rem' }}>
            <Lock size={16} color="var(--pp-blue)" />
            <span>Confidentiality Protocol &amp; Verification Console</span>
          </div>
          <p className="body-secondary" style={{ fontSize: '0.78rem' }}>
            Choose how deliverables are authenticated before triggering autonomous PayPal disbursements:
          </p>
        </div>

        <div style={{
          display: 'flex',
          gap: '0.35rem',
          backgroundColor: 'var(--bg-subtle)',
          padding: '0.25rem',
          borderRadius: '8px',
          border: '1px solid var(--border-subtle)'
        }}>
          <button
            id="mode-zdr"
            type="button"
            onClick={() => { setAuditMode('zdr'); setAuditResult(null); }}
            className={`btn btn-sm ${auditMode === 'zdr' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ fontSize: '0.78rem', padding: '0.4rem 0.85rem' }}
          >
            <EyeOff size={14} />
            <span>Ephemeral RAM DLP Audit</span>
          </button>
          <button
            id="mode-zk-nda"
            type="button"
            onClick={() => { setAuditMode('zk-nda'); setAuditResult(null); }}
            className={`btn btn-sm ${auditMode === 'zk-nda' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ fontSize: '0.78rem', padding: '0.4rem 0.85rem' }}
          >
            <KeyRound size={14} />
            <span>Zero-Knowledge CI Attestation</span>
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.5rem', alignItems: 'start' }}>
        {/* Left Column: Split IDE Code Editor OR ZK Attestation Runner */}
        <div className="surface-card" style={{ padding: '1.5rem' }}>
          {auditMode === 'zdr' ? (
            <div>
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <FileCode size={18} color="var(--pp-blue)" />
                  <h3 className="card-h3" style={{ fontSize: '1.02rem', fontWeight: 700 }}>
                    Deliverable IDE Inspection
                  </h3>
                </div>
                <span className="status-pill badge-zk">
                  RAM-ONLY ZDR
                </span>
              </div>

              {/* Preset Scenario Selectors */}
              <div style={{ display: 'flex', gap: '0.45rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => handleRunZdrAudit(CLEAN_CODE_SAMPLE)}
                  className="btn btn-outline btn-sm"
                  style={{ fontSize: '0.74rem' }}
                >
                  <Check size={12} color="#10B981" />
                  <span>Clean Deliverable (Pass ≥90%)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleRunZdrAudit(SECRET_LEAK_SAMPLE)}
                  className="btn btn-outline btn-sm"
                  style={{ fontSize: '0.74rem' }}
                >
                  <Lock size={12} color="var(--pp-blue)" />
                  <span>Secret Leak (Test DLP Redaction)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleRunZdrAudit(BROKEN_SYNTAX_SAMPLE)}
                  className="btn btn-outline btn-sm"
                  style={{ fontSize: '0.74rem' }}
                >
                  <AlertTriangle size={12} color="#F59E0B" />
                  <span>Syntax Error (Halt Escrow)</span>
                </button>
              </div>

              {/* Repo and Demo URL row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.85rem' }}>
                <div>
                  <label className="body-secondary" style={{ display: 'block', fontSize: '0.74rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                    Repository URL
                  </label>
                  <input
                    type="url"
                    value={repoUrl}
                    onChange={(e) => setRepoUrl(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.55rem 0.75rem',
                      borderRadius: '8px',
                      border: '1px solid var(--border-subtle)',
                      backgroundColor: 'var(--bg-subtle)',
                      color: 'var(--text-primary)',
                      fontSize: '0.8rem'
                    }}
                  />
                </div>
                <div>
                  <label className="body-secondary" style={{ display: 'block', fontSize: '0.74rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                    Live Preview URL
                  </label>
                  <input
                    type="url"
                    value={demoUrl}
                    onChange={(e) => setDemoUrl(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.55rem 0.75rem',
                      borderRadius: '8px',
                      border: '1px solid var(--border-subtle)',
                      backgroundColor: 'var(--bg-subtle)',
                      color: 'var(--text-primary)',
                      fontSize: '0.8rem'
                    }}
                  />
                </div>
              </div>

              {/* Split IDE Code Editor with Line Numbers */}
              <div style={{ marginBottom: '0.85rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                  <label className="body-secondary" style={{ fontSize: '0.76rem', fontWeight: 600 }}>
                    Source Code Gutter ({codeLines.length} lines)
                  </label>
                  <span className="body-secondary" style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    Deterministic AST &amp; Delimiter Inspection
                  </span>
                </div>

                <div style={{
                  display: 'flex',
                  borderRadius: '8px',
                  border: '1px solid var(--border-subtle)',
                  backgroundColor: 'var(--bg-sunken)',
                  overflow: 'hidden',
                  minHeight: '260px'
                }}>
                  {/* Line numbers column */}
                  <div style={{
                    padding: '0.75rem 0.6rem',
                    backgroundColor: 'var(--bg-subtle)',
                    borderRight: '1px solid var(--border-subtle)',
                    userSelect: 'none',
                    textAlign: 'right',
                    color: 'var(--text-faint)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.76rem',
                    lineHeight: '1.45rem',
                    minWidth: '38px'
                  }}>
                    {codeLines.map((_, i) => (
                      <div key={i}>{i + 1}</div>
                    ))}
                  </div>

                  {/* Code textarea */}
                  <textarea
                    value={deliverableCode}
                    onChange={(e) => setDeliverableCode(e.target.value)}
                    rows={Math.max(12, Math.min(codeLines.length, 24))}
                    style={{
                      flex: 1,
                      padding: '0.75rem',
                      backgroundColor: 'transparent',
                      border: 'none',
                      outline: 'none',
                      color: 'var(--text-primary)',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.76rem',
                      lineHeight: '1.45rem',
                      resize: 'vertical',
                      whiteSpace: 'pre',
                      overflowX: 'auto'
                    }}
                  />
                </div>
              </div>

              {/* Real-Time DLP Secret Masking Chips Preview */}
              <div style={{
                padding: '0.75rem 0.9rem',
                borderRadius: '8px',
                backgroundColor: detectedSecretsPreview.length > 0 ? 'rgba(0, 112, 186, 0.08)' : 'var(--bg-subtle)',
                border: `1px solid ${detectedSecretsPreview.length > 0 ? 'rgba(0, 112, 186, 0.28)' : 'var(--border-subtle)'}`,
                marginBottom: '1.15rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.76rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <ShieldCheck size={14} color={detectedSecretsPreview.length > 0 ? 'var(--pp-blue)' : '#10B981'} />
                    {detectedSecretsPreview.length > 0
                      ? `Real-Time DLP: ${detectedSecretsPreview.length} secret token(s) flagged for RAM scrubbing`
                      : 'Real-Time DLP: Code is clean • 0 leaks detected'}
                  </span>
                  <span className="font-mono" style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                    SHA-256 pre-flight
                  </span>
                </div>

                {detectedSecretsPreview.length > 0 && (
                  <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', marginTop: '0.4rem' }}>
                    {detectedSecretsPreview.map((sec) => (
                      <span key={sec.id} className="status-pill badge-zk" style={{ fontSize: '0.64rem' }}>
                        Masked {sec.label} ({sec.token})
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <button
                id="btn-run-zdr-audit"
                type="button"
                onClick={() => handleRunZdrAudit()}
                disabled={isAuditing}
                className="btn btn-primary"
                style={{ width: '100%', padding: '0.75rem', fontSize: '0.875rem' }}
              >
                {isAuditing ? (
                  <>
                    <Sparkles size={16} /> Scrubbing Secrets in RAM &amp; Auditing...
                  </>
                ) : (
                  <>
                    <ShieldCheck size={16} /> Scrub Secrets &amp; Run Autonomous Audit
                  </>
                )}
              </button>
            </div>
          ) : (
            /* ZK Attestation Runner Tab */
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Terminal size={18} color="var(--pp-blue)" />
                  <h3 className="card-h3" style={{ fontSize: '1.02rem', fontWeight: 700 }}>
                    Zero-Knowledge CI Attestation Runner
                  </h3>
                </div>
                <span className="status-pill badge-released">
                  0% CODE TRANSMITTED
                </span>
              </div>

              {/* Protocol Explanation */}
              <div style={{
                padding: '0.85rem',
                borderRadius: '8px',
                backgroundColor: 'rgba(0, 112, 186, 0.08)',
                border: '1px solid rgba(0, 112, 186, 0.22)',
                fontSize: '0.8rem',
                lineHeight: 1.5,
                marginBottom: '1rem',
                color: 'var(--text-primary)'
              }}>
                <strong>How Zero-Knowledge CI Attestation Works:</strong> Proprietary client source code never leaves the developer&apos;s private environment. The local runner computes deterministic test pass metrics and signs them with <strong>HMAC-SHA256</strong>. NexusPay authenticates the cryptographic digest to unlock escrow without source exposure.
              </div>

              {/* Test Metric Inputs */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem', marginBottom: '1rem' }}>
                <div>
                  <label className="body-secondary" style={{ display: 'block', fontSize: '0.76rem', fontWeight: 600, marginBottom: '0.3rem' }}>
                    Private Tests Passed (of {zkTotalTests})
                  </label>
                  <input
                    type="number"
                    min="0"
                    max={zkTotalTests}
                    value={zkTestsPassed}
                    onChange={(e) => setZkTestsPassed(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.6rem 0.8rem',
                      borderRadius: '8px',
                      border: '1px solid var(--border-subtle)',
                      backgroundColor: 'var(--bg-subtle)',
                      color: 'var(--text-primary)',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.875rem'
                    }}
                  />
                </div>
                <div>
                  <label className="body-secondary" style={{ display: 'block', fontSize: '0.76rem', fontWeight: 600, marginBottom: '0.3rem' }}>
                    Private Code Coverage (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={zkCoverage}
                    onChange={(e) => setZkCoverage(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.6rem 0.8rem',
                      borderRadius: '8px',
                      border: '1px solid var(--border-subtle)',
                      backgroundColor: 'var(--bg-subtle)',
                      color: 'var(--text-primary)',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.875rem'
                    }}
                  />
                </div>
              </div>

              {/* CLI Runner Preview */}
              <div style={{
                padding: '0.85rem',
                borderRadius: '8px',
                backgroundColor: 'var(--bg-sunken)',
                border: '1px solid var(--border-subtle)',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.74rem',
                marginBottom: '1.15rem',
                lineHeight: 1.5,
                overflowX: 'auto'
              }}>
                <div style={{ color: 'var(--text-muted)' }}># Run confidential runner locally (zero code transmission):</div>
                <div style={{ color: 'var(--pp-blue)', marginTop: '0.2rem' }}>
                  $ npm run attest -- --agreement {agreement?.id || 'SMA-NDA-600'} --dir ./src
                </div>
                {zkBundle && (
                  <div style={{ marginTop: '0.5rem', color: '#10B981', wordBreak: 'break-all' }}>
                    ✓ Proof: {zkBundle.attestationId} | HMAC: {zkBundle.hmacSha256Signature.slice(0, 32)}...
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                <button
                  id="btn-verify-zk-proof"
                  type="button"
                  onClick={() => handleGenerateAndVerifyZkProof({ tamper: false })}
                  disabled={isAuditing}
                  className="btn btn-primary"
                  style={{ width: '100%', padding: '0.75rem', fontSize: '0.875rem' }}
                >
                  <KeyRound size={16} />
                  <span>Generate &amp; Verify HMAC-SHA256 NDA Proof</span>
                </button>

                <button
                  id="btn-tamper-zk-proof"
                  type="button"
                  onClick={() => handleGenerateAndVerifyZkProof({ tamper: true })}
                  disabled={isAuditing}
                  className="btn btn-outline btn-sm"
                  style={{ borderColor: 'var(--status-dispute-border)', color: 'var(--status-dispute-text)' }}
                >
                  <ShieldAlert size={15} />
                  <span>Security Test: Simulate Forged / Tampered Signature</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Audit Score Gauge, Criteria Checklist, AST Notes & PayPal Release */}
        <div className="surface-card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <h3 className="card-h3" style={{ fontSize: '1rem', fontWeight: 700 }}>
              {auditMode === 'zk-nda' ? 'ZK Attestation Verdict' : 'DLP & AST Inspection Verdict'}
            </h3>
            {auditResult && (
              <span className={`status-pill ${
                auditResult.verdict === 'AUTO_RELEASE_PAYOUT'
                  ? 'badge-released'
                  : auditResult.verdict === 'SIGNATURE_TAMPERED'
                  ? 'badge-dispute'
                  : 'badge-locked'
              }`}>
                {auditResult.verdict}
              </span>
            )}
          </div>

          {auditResult ? (
            <div>
              {/* Score Gauge Card */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '1.15rem',
                borderRadius: '10px',
                backgroundColor: 'var(--bg-subtle)',
                border: '1px solid var(--border-subtle)',
                marginBottom: '1.15rem'
              }}>
                <div>
                  <span className="body-secondary" style={{ fontSize: '0.74rem', display: 'block' }}>Contract Compliance Score</span>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.45rem', marginTop: '0.2rem' }}>
                    <span className="font-mono" style={{
                      fontSize: '2.25rem',
                      fontWeight: 800,
                      color: auditResult.overallScore >= 90
                        ? '#10B981'
                        : auditResult.overallScore === 0
                        ? '#EF4444'
                        : '#F59E0B'
                    }}>
                      {auditResult.overallScore}%
                    </span>
                    <span className="body-secondary" style={{ fontSize: '0.8rem' }}>/ 100%</span>
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <span className="body-secondary" style={{ fontSize: '0.74rem', display: 'block' }}>Escrow Gate Decision</span>
                  <span style={{
                    fontSize: '0.9rem',
                    fontWeight: 700,
                    color: auditResult.overallScore >= 90 ? '#10B981' : '#F59E0B'
                  }}>
                    {auditResult.overallScore >= 90 ? 'Authorized (≥90%)' : 'Locked (<90%)'}
                  </span>
                  <div className="font-mono" style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '3px' }}>
                    {auditResult.privacyMode === 'ZERO_KNOWLEDGE_NDA' ? '0 Bytes Code Transmitted' : 'Zero-Data-Retention'}
                  </div>
                </div>
              </div>

              {/* DLP Scrubbing Certificate Banner */}
              {auditResult.dlpProtection && (
                <div style={{
                  padding: '0.75rem 0.9rem',
                  borderRadius: '8px',
                  backgroundColor: auditResult.dlpProtection.redactionCount > 0 ? 'rgba(0, 112, 186, 0.08)' : 'var(--bg-subtle)',
                  border: `1px solid ${auditResult.dlpProtection.redactionCount > 0 ? 'rgba(0, 112, 186, 0.28)' : 'var(--border-subtle)'}`,
                  marginBottom: '1rem',
                  fontSize: '0.76rem'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 700 }}>
                    <span style={{ color: 'var(--text-primary)' }}>
                      🛡️ RAM DLP Shield: {auditResult.dlpProtection.redactionCount > 0
                        ? `${auditResult.dlpProtection.redactionCount} confidential secret(s) scrubbed in RAM!`
                        : '0 secrets exposed • RAM purged'}
                    </span>
                    <span className="font-mono" style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>
                      {auditResult.dlpProtection.zdrCertificate?.sanitizationLatencyMs}ms
                    </span>
                  </div>
                  {auditResult.dlpProtection.detections?.length > 0 && (
                    <div style={{ marginTop: '0.45rem', display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                      {auditResult.dlpProtection.detections.map((d) => (
                        <span key={d.id} className="status-pill badge-zk" style={{ fontSize: '0.62rem' }}>
                          Masked {d.label} ({d.preview})
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Criteria Checklist with Scores */}
              {auditResult.criteriaBreakdown?.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.15rem' }}>
                  {auditResult.criteriaBreakdown.map((crit) => (
                    <div
                      key={crit.id}
                      style={{
                        padding: '0.7rem 0.85rem',
                        borderRadius: '8px',
                        backgroundColor: 'var(--bg-subtle)',
                        border: '1px solid var(--border-subtle)',
                        fontSize: '0.8rem'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontWeight: 600 }}>
                          {crit.passed
                            ? <CheckCircle2 size={15} color="#10B981" />
                            : <AlertTriangle size={15} color="#F59E0B" />}
                          <span>{crit.criterion}</span>
                        </div>
                        <span className="font-mono" style={{ fontWeight: 800, color: crit.passed ? '#10B981' : '#F59E0B' }}>
                          {crit.score}%
                        </span>
                      </div>
                      {crit.notes && (
                        <div className="body-secondary" style={{ fontSize: '0.74rem', marginTop: '0.25rem', paddingLeft: '1.35rem' }}>
                          {crit.notes}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Recommendation Note */}
              <div style={{
                padding: '0.85rem 1rem',
                borderRadius: '8px',
                backgroundColor:
                  auditResult.verdict === 'AUTO_RELEASE_PAYOUT'
                    ? 'var(--status-released-bg)'
                    : auditResult.verdict === 'SIGNATURE_TAMPERED'
                    ? 'var(--status-dispute-bg)'
                    : 'var(--status-locked-bg)',
                border: `1px solid ${
                  auditResult.verdict === 'AUTO_RELEASE_PAYOUT'
                    ? 'var(--status-released-border)'
                    : auditResult.verdict === 'SIGNATURE_TAMPERED'
                    ? 'var(--status-dispute-border)'
                    : 'var(--status-locked-border)'
                }`,
                color:
                  auditResult.verdict === 'AUTO_RELEASE_PAYOUT'
                    ? 'var(--status-released-text)'
                    : auditResult.verdict === 'SIGNATURE_TAMPERED'
                    ? 'var(--status-dispute-text)'
                    : 'var(--status-locked-text)',
                fontSize: '0.82rem',
                lineHeight: 1.45,
                marginBottom: '1.15rem'
              }}>
                <strong>Verdict:</strong> {auditResult.recommendation}
              </div>

              {/* Cryptographic Digest Box */}
              {auditResult.auditCertificate && (
                <div style={{
                  padding: '0.6rem 0.75rem',
                  borderRadius: '6px',
                  backgroundColor: 'var(--bg-sunken)',
                  border: '1px solid var(--border-subtle)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.72rem',
                  color: 'var(--text-muted)',
                  marginBottom: '1.15rem',
                  wordBreak: 'break-all'
                }}>
                  Proof Hash: {auditResult.auditCertificate.hash}
                </div>
              )}

              {/* Autonomous PayPal Release Action */}
              {auditResult.verdict === 'AUTO_RELEASE_PAYOUT' && !releasedData && (
                <button
                  id="btn-execute-paypal-release"
                  type="button"
                  onClick={handleExecutePayPalRelease}
                  disabled={isReleasing}
                  className="btn btn-paypal"
                  style={{ width: '100%', padding: '0.85rem', fontSize: '0.92rem' }}
                >
                  {isReleasing ? (
                    'Executing Autonomous PayPal Capture...'
                  ) : (
                    <>
                      <DollarSign size={18} /> Execute Autonomous PayPal Escrow Release
                    </>
                  )}
                </button>
              )}

              {/* Confirmation of Funds Disbursed */}
              {releasedData && (
                <div style={{
                  padding: '1rem',
                  borderRadius: '8px',
                  backgroundColor: 'var(--status-released-bg)',
                  border: '1px solid var(--status-released-border)',
                  color: 'var(--status-released-text)',
                  fontSize: '0.84rem',
                  textAlign: 'center'
                }}>
                  <CheckCircle2 size={26} style={{ margin: '0 auto 0.4rem auto' }} />
                  <div style={{ fontWeight: 800, fontSize: '0.98rem' }}>PayPal Escrow Released Instantly!</div>
                  <div className="font-mono" style={{ fontSize: '0.76rem', marginTop: '0.25rem' }}>
                    Capture ID: <strong>{releasedData.captureId}</strong> • Mode: {auditMode === 'zk-nda' ? 'Zero-Knowledge NDA' : 'ZDR + DLP'}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '3.5rem 1rem', color: 'var(--text-muted)', fontSize: '0.84rem', lineHeight: 1.5 }}>
              {auditMode === 'zk-nda'
                ? 'Click "Generate & Verify HMAC-SHA256 NDA Proof" to simulate a confidential CI runner authenticating an enterprise deliverable without source code transmission.'
                : 'Select one of the test presets on the left or click "Scrub Secrets & Run Autonomous Audit" to view real-time AST compliance scores and criteria.'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
