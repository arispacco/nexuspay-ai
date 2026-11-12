// src/components/DeliverStep.jsx — step 3: check the delivery for the current milestone, then pay it.
import React, { useState } from 'react';
import { Check, X, Copy } from 'lucide-react';
import { api, money } from '../api.js';
import DisputePanel from './DisputePanel.jsx';

const SAMPLES = {
  clean: `import React from 'react';
import { PayPalButtons } from '@paypal/react-paypal-js';

export function Checkout({ amount, onPaid }) {
  return (
    <PayPalButtons
      createOrder={(data, actions) =>
        actions.order.create({ purchase_units: [{ amount: { value: String(amount) } }] })
      }
      onApprove={async (data, actions) => {
        try {
          const details = await actions.order.capture();
          onPaid(details);
        } catch (err) {
          console.error('Capture failed', err);
        }
      }}
    />
  );
}`,
  leak: `import React from 'react';
import { PayPalButtons } from '@paypal/react-paypal-js';

// Left in by mistake:
const API_KEY = "test_secret_live_998877665544";
const OWNER = "security-lead@acme-bank.org";

export async function pay(orderId) {
  const res = await fetch("https://10.24.18.92/internal-ledger", {
    method: "POST",
    body: JSON.stringify({ orderId, key: API_KEY })
  });
  return res.json();
}`,
  broken: `// Draft, not finished
function checkout() {
  // TODO: not implemented yet
  if (true) {
    console.log("unfinished");
`
};

const VERDICTS = {
  AUTO_RELEASE_PAYOUT: { tone: 'ok', title: 'Passed. Ready to pay.' },
  MANUAL_CLIENT_REVIEW: { tone: 'warn', title: 'Almost there. Your call.' },
  REVISE_DELIVERABLE: { tone: 'bad', title: 'Not ready. The money stays on hold.' },
  SIGNATURE_TAMPERED: { tone: 'bad', title: 'Report rejected. The signature does not match.' },
  INVALID_ATTESTATION_PROOF: { tone: 'bad', title: 'Report rejected. It is incomplete.' },
  MALFORMED_PAYLOAD: { tone: 'bad', title: 'Report rejected. It cannot be read.' }
};

export default function DeliverStep({ deal, onChanged }) {
  const ordered = deal.milestones;
  const index = ordered.findIndex((m) => m.status !== 'RELEASED');
  const milestone = ordered[index];

  const [mode, setMode] = useState(deal.ndaProtected ? 'attest' : 'code');
  const [code, setCode] = useState(SAMPLES.clean);
  const [report, setReport] = useState('');
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState('');
  const [disputing, setDisputing] = useState(false);
  const [copied, setCopied] = useState(false);

  const command = `npm run attest -- --agreement ${deal.id} --milestone ${milestone.id} --dir ./src`;

  function resetResult() {
    setResult(null);
    setError('');
  }

  async function checkCode() {
    setBusy(true);
    resetResult();
    try {
      const data = await api('/api/verify-deliverable', {
        body: {
          agreementId: deal.id,
          milestoneId: milestone.id,
          milestone: { name: milestone.name, criteria: milestone.criteria },
          deliverableType: 'code',
          deliverableContent: code
        }
      });
      setResult({
        score: data.overallScore,
        verdict: data.verdict,
        text: data.recommendation,
        checks: data.criteriaBreakdown,
        redactions: data.dlpProtection?.redactionCount || 0,
        proof: data.auditCertificate?.hash
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function checkReport() {
    setBusy(true);
    resetResult();
    try {
      let bundle;
      try {
        bundle = JSON.parse(report);
      } catch {
        throw new Error('That is not valid JSON. Paste the full content of attestation.json.');
      }
      const p = bundle?.payload;
      if (p && (p.agreementId !== deal.id || p.milestoneId !== milestone.id)) {
        throw new Error(`This report was issued for ${p.agreementId} / ${p.milestoneId}, not ${deal.id} / ${milestone.id}.`);
      }
      const data = await api('/api/privacy/verify-zk-proof', { body: { attestationBundle: bundle } });
      setResult({
        score: data.overallScore,
        verdict: data.verdict,
        text: data.recommendation || data.reason,
        checks: data.criteriaBreakdown || [],
        redactions: 0,
        proof: bundle.attestationId,
        attested: data.valid
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function sampleReport(forge = false) {
    setError('');
    try {
      const bundle = await api('/api/privacy/generate-zk-proof', {
        body: {
          agreementId: deal.id,
          milestoneId: milestone.id,
          ndaDomain: 'contractor-workstation.private',
          testSuiteSummary: { totalTests: 24, passedTests: 24, coveragePercent: 92, buildPassed: true, lintErrors: 0 }
        }
      });
      if (forge) bundle.hmacSha256Signature = 'deadbeef'.repeat(8);
      setReport(JSON.stringify(bundle, null, 2));
      resetResult();
    } catch (err) {
      setError(err.message);
    }
  }

  async function pay(approved) {
    setPaying(true);
    setError('');
    try {
      const data = await api(`/api/agreements/${deal.id}/milestones/${milestone.id}/release`, {
        body: { score: result.score, proofHash: result.proof, buyerApproved: approved }
      });
      await onChanged(`${money(data.releasedAmount, data.currency)} sent to the freelancer for “${milestone.name.replace(/^Milestone \d+:\s*/, '')}”.`);
    } catch (err) {
      setError(err.message);
      setPaying(false);
    }
  }

  const verdict = result && (VERDICTS[result.verdict] || VERDICTS.REVISE_DELIVERABLE);
  const remaining = ordered.filter((m) => m.status !== 'RELEASED').reduce((sum, m) => sum + m.amount, 0);

  return (
    <>
      <div className="card">
        <div className="mini-steps" aria-hidden="true">
          {ordered.map((m, i) => (
            <span key={m.id} className={m.status === 'RELEASED' ? 'done' : i === index ? 'now' : ''} />
          ))}
        </div>

        <div className="deal-top">
          <div>
            <p className="small">
              Milestone {index + 1} of {ordered.length}
            </p>
            <h2>{milestone.name.replace(/^Milestone \d+:\s*/, '')}</h2>
          </div>
          <div className="amount">
            {money(milestone.amount, deal.currency)}
            <small>to release</small>
          </div>
        </div>

        <ul className="checks" style={{ marginTop: 14 }}>
          {milestone.criteria.map((c) => (
            <li key={c}>
              <Check size={16} />
              {c}
            </li>
          ))}
        </ul>

        <div className="seg" role="group" aria-label="How is the work delivered?">
          <button aria-pressed={mode === 'code'} onClick={() => { setMode('code'); resetResult(); }} disabled={deal.ndaProtected}>
            Share the code
          </button>
          <button aria-pressed={mode === 'attest'} onClick={() => { setMode('attest'); resetResult(); }}>
            Signed test report
          </button>
        </div>

        {mode === 'code' ? (
          <>
            <div className="samples">
              Try:
              <button onClick={() => { setCode(SAMPLES.clean); resetResult(); }}>Good delivery</button>
              <button onClick={() => { setCode(SAMPLES.leak); resetResult(); }}>Leaks a secret</button>
              <button onClick={() => { setCode(SAMPLES.broken); resetResult(); }}>Unfinished</button>
            </div>
            <label htmlFor="delivery-code" className="small" style={{ display: 'none' }}>Delivered code</label>
            <textarea id="delivery-code" className="code" value={code} onChange={(e) => { setCode(e.target.value); resetResult(); }} spellCheck={false} />
            <p className="small" style={{ marginTop: 8 }}>
              Secrets and personal data are removed in memory before the code is analysed, and nothing is stored.
            </p>
            <div className="actions">
              <button className="btn dark" onClick={checkCode} disabled={busy || !code.trim()}>
                {busy && <span className="spinner" />}
                {busy ? 'Checking…' : 'Check the delivery'}
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="sub" style={{ marginBottom: 12 }}>
              {deal.ndaProtected ? 'This project is confidential, so the code stays with the freelancer. ' : ''}
              The freelancer runs this on their own machine. It runs their tests and produces a signed report. Only the results
              are shared, never the code.
            </p>
            <div className="cmd">
              <code>{command}</code>
              <button
                onClick={() => {
                  navigator.clipboard?.writeText(command);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                }}
                aria-label="Copy the command"
              >
                {copied ? 'Copied' : <Copy size={13} />}
              </button>
            </div>
            <div className="samples">
              No project at hand?
              <button onClick={() => sampleReport(false)}>Use a sample report</button>
              <button onClick={() => sampleReport(true)}>Try a forged report</button>
            </div>
            <textarea
              id="delivery-report"
              className="code"
              style={{ minHeight: 170 }}
              value={report}
              onChange={(e) => { setReport(e.target.value); resetResult(); }}
              placeholder="Paste the content of attestation.json here"
              spellCheck={false}
              aria-label="Signed test report"
            />
            <div className="actions">
              <button className="btn dark" onClick={checkReport} disabled={busy || !report.trim()}>
                {busy && <span className="spinner" />}
                {busy ? 'Verifying…' : 'Verify the report'}
              </button>
            </div>
          </>
        )}

        {error && <div className="error">{error}</div>}

        {result && (
          <>
            <div className={`verdict ${verdict.tone}`}>
              <div className="score">
                {result.score}
                <small>/100</small>
              </div>
              <div>
                <h3>{verdict.title}</h3>
                <p>{result.text}</p>
              </div>
            </div>

            {result.checks?.length > 0 && (
              <ul className="checks" style={{ marginTop: 16 }}>
                {result.checks.map((c) => (
                  <li key={c.id || c.criterion} className={c.passed ? 'pass' : 'fail'}>
                    {c.passed ? <Check size={16} /> : <X size={16} />}
                    <span>
                      {c.criterion}
                      {c.notes && <span className="note">{c.notes}</span>}
                    </span>
                  </li>
                ))}
              </ul>
            )}

            {result.redactions > 0 && (
              <div className="notice">
                {result.redactions} secret{result.redactions > 1 ? 's were' : ' was'} found in the delivered code and removed before analysis.
                The freelancer should rotate {result.redactions > 1 ? 'them' : 'it'}.
              </div>
            )}
            {result.attested && (
              <div className="notice">Signature valid. The code was never shared, only the signed test results.</div>
            )}

            {(result.verdict === 'AUTO_RELEASE_PAYOUT' || result.verdict === 'MANUAL_CLIENT_REVIEW') && (
              <div className="actions">
                <button className="btn primary" onClick={() => pay(result.verdict === 'MANUAL_CLIENT_REVIEW')} disabled={paying}>
                  {paying && <span className="spinner" />}
                  {result.verdict === 'MANUAL_CLIENT_REVIEW' ? 'Approve and pay ' : 'Pay '}
                  {money(milestone.amount, deal.currency)}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <div style={{ marginTop: 14, textAlign: 'center' }}>
        <button className="link-btn" onClick={() => setDisputing((v) => !v)}>
          {disputing ? 'Close the dispute' : 'Not happy? Open a dispute'}
        </button>
      </div>

      {disputing && (
        <DisputePanel deal={deal} milestone={milestone} held={remaining} evidenceScore={result?.score} onSettled={onChanged} />
      )}
    </>
  );
}
