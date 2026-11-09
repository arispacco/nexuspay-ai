// src/components/SettingsModal.jsx
import React, { useState } from 'react';
import { X, Settings, CheckCircle2, AlertCircle, Eye, EyeOff, ShieldCheck, KeyRound } from 'lucide-react';

export default function SettingsModal({ onClose, config, onSaveConfig }) {
  const [clientId, setClientId] = useState(config?.clientId || '');
  const [clientSecret, setClientSecret] = useState(config?.clientSecret || '');
  const [geminiApiKey, setGeminiApiKey] = useState(config?.geminiApiKey || '');
  const [showSecret, setShowSecret] = useState(false);
  const [showGemini, setShowGemini] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/validate-paypal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId, clientSecret })
      });
      const data = await res.json();
      setTestResult(data);
    } catch (e) {
      setTestResult({ valid: false, message: e.message || 'Validation request failed' });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = () => {
    onSaveConfig({ clientId, clientSecret, geminiApiKey });
    onClose();
  };

  const handleReset = () => {
    setClientId('');
    setClientSecret('');
    setGeminiApiKey('');
    onSaveConfig({ clientId: '', clientSecret: '', geminiApiKey: '' });
    setTestResult({ valid: true, message: 'Reset to default zero-friction Sandbox & Deterministic AST mode.' });
  };

  return (
    <div className="modal-backdrop">
      <div className="fintech-modal" style={{ maxWidth: '520px', padding: '1.75rem', position: 'relative' }}>
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close settings"
          style={{
            position: 'absolute',
            top: '1.15rem',
            right: '1.15rem',
            background: 'transparent',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            padding: '0.25rem',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <X size={20} />
        </button>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
          <div style={{
            width: '38px',
            height: '38px',
            borderRadius: '10px',
            backgroundColor: 'rgba(0, 48, 135, 0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--pp-navy)',
            flexShrink: 0
          }}>
            <Settings size={20} />
          </div>
          <div>
            <h3 className="card-h3" style={{ fontSize: '1.12rem', fontWeight: 800 }}>
              Sandbox &amp; LLM Configuration
            </h3>
            <p className="body-secondary" style={{ fontSize: '0.78rem' }}>
              Connect live PayPal Developer Sandbox and Gemini 2.5 Flash keys
            </p>
          </div>
        </div>

        {/* Zero-friction Note for Hackathon Judges */}
        <div style={{
          padding: '0.85rem 1rem',
          backgroundColor: 'rgba(0, 112, 186, 0.08)',
          border: '1px solid rgba(0, 112, 186, 0.22)',
          borderRadius: '9px',
          fontSize: '0.78rem',
          lineHeight: 1.5,
          color: 'var(--text-primary)',
          marginBottom: '1.25rem'
        }}>
          <strong>Zero-Setup Mode Active by Default:</strong> Hackathon judges can test all PayPal escrow locks, invoices, DLP scrubbing, ZK attestation proofs, and dispute settlements immediately without entering credentials.
        </div>

        {/* Input Fields */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.95rem', marginBottom: '1.25rem' }}>
          <div>
            <label className="body-secondary" style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, marginBottom: '0.3rem' }}>
              PayPal Sandbox Client ID
            </label>
            <input
              type="text"
              placeholder="AUn-6fK9... (leave empty for zero-lag sandbox mode)"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              style={{
                width: '100%',
                padding: '0.65rem 0.85rem',
                borderRadius: '8px',
                border: '1px solid var(--border-subtle)',
                backgroundColor: 'var(--bg-subtle)',
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.82rem'
              }}
            />
          </div>

          <div>
            <label className="body-secondary" style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, marginBottom: '0.3rem' }}>
              PayPal Sandbox Client Secret
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showSecret ? 'text' : 'password'}
                placeholder="EK6x... (leave empty for zero-lag sandbox mode)"
                value={clientSecret}
                onChange={(e) => setClientSecret(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.65rem 2.4rem 0.65rem 0.85rem',
                  borderRadius: '8px',
                  border: '1px solid var(--border-subtle)',
                  backgroundColor: 'var(--bg-subtle)',
                  color: 'var(--text-primary)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.82rem'
                }}
              />
              <button
                type="button"
                onClick={() => setShowSecret(!showSecret)}
                style={{
                  position: 'absolute',
                  right: '0.75rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '0.2rem'
                }}
              >
                {showSecret ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          <div>
            <label className="body-secondary" style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, marginBottom: '0.3rem' }}>
              Google Gemini API Key (Optional — Upgrades to Live Gemini 2.5 Flash ZDR)
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showGemini ? 'text' : 'password'}
                placeholder="AIzaSy... (optional)"
                value={geminiApiKey}
                onChange={(e) => setGeminiApiKey(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.65rem 2.4rem 0.65rem 0.85rem',
                  borderRadius: '8px',
                  border: '1px solid var(--border-subtle)',
                  backgroundColor: 'var(--bg-subtle)',
                  color: 'var(--text-primary)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.82rem'
                }}
              />
              <button
                type="button"
                onClick={() => setShowGemini(!showGemini)}
                style={{
                  position: 'absolute',
                  right: '0.75rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '0.2rem'
                }}
              >
                {showGemini ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>
        </div>

        {/* Validation Output Banner */}
        {testResult && (
          <div style={{
            padding: '0.75rem 0.95rem',
            borderRadius: '8px',
            backgroundColor: testResult.valid ? 'var(--status-released-bg)' : 'var(--status-locked-bg)',
            border: `1px solid ${testResult.valid ? 'var(--status-released-border)' : 'var(--status-locked-border)'}`,
            color: testResult.valid ? 'var(--status-released-text)' : 'var(--status-locked-text)',
            fontSize: '0.78rem',
            marginBottom: '1.15rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.55rem'
          }}>
            {testResult.valid ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            <span>{testResult.message}</span>
          </div>
        )}

        {/* Footer Actions */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.65rem' }}>
          <button
            type="button"
            onClick={handleReset}
            className="btn btn-outline btn-sm"
          >
            Reset Defaults
          </button>

          <div style={{ display: 'flex', gap: '0.55rem' }}>
            <button
              type="button"
              onClick={handleTest}
              disabled={testing || (!clientId && !clientSecret)}
              className="btn btn-outline btn-sm"
            >
              {testing ? 'Verifying Auth...' : 'Verify PayPal Auth'}
            </button>

            <button
              type="button"
              onClick={handleSave}
              className="btn btn-primary btn-sm"
            >
              Save Configuration
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
