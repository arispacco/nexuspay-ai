// src/components/DisputePanel.jsx — an AI arbitrator splits the money still on hold, then PayPal settles it.
import React, { useState } from 'react';
import { api, money } from '../api.js';

export default function DisputePanel({ deal, milestone, held, evidenceScore, onSettled }) {
  const [buyerClaim, setBuyerClaim] = useState(`The delivery does not meet the agreed checks for “${milestone.name.replace(/^Milestone \d+:\s*/, '')}”.`);
  const [sellerClaim, setSellerClaim] = useState('The work was delivered as specified and passes the agreed checks.');
  const [ruling, setRuling] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function ask() {
    setBusy(true);
    setError('');
    try {
      const data = await api('/api/arbitrate-dispute', {
        body: {
          contract: { title: deal.title, totalBudget: held },
          clientClaim: buyerClaim,
          freelancerClaim: sellerClaim,
          evidenceScore
        }
      });
      setRuling(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function apply() {
    setBusy(true);
    setError('');
    try {
      const a = ruling.allocation;
      const data = await api(`/api/agreements/${deal.id}/settle-dispute`, {
        body: { freelancerAmount: a.freelancerPayoutAmount, clientRefundAmount: a.clientRefundAmount, ruling: ruling.ruling }
      });
      await onSettled(
        `Dispute settled: ${money(data.freelancerPaid, data.currency)} to the freelancer, ${money(data.buyerRefunded, data.currency)} back to the buyer.`
      );
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  const a = ruling?.allocation;

  return (
    <div className="card">
      <h2>Dispute</h2>
      <p className="sub">
        An AI arbitrator decides how the {money(held, deal.currency)} still on hold is split.{' '}
        {Number.isFinite(evidenceScore) ? `It will take the delivery audit (${evidenceScore}/100) into account.` : 'Run a delivery check first to give it hard evidence.'}
      </p>

      <label className="field" htmlFor="claim-buyer" style={{ marginTop: 18 }}>
        <span>Buyer’s claim</span>
        <textarea id="claim-buyer" value={buyerClaim} onChange={(e) => { setBuyerClaim(e.target.value); setRuling(null); }} style={{ minHeight: 72 }} />
      </label>
      <label className="field" htmlFor="claim-seller">
        <span>Freelancer’s answer</span>
        <textarea id="claim-seller" value={sellerClaim} onChange={(e) => { setSellerClaim(e.target.value); setRuling(null); }} style={{ minHeight: 72 }} />
      </label>

      {!ruling && (
        <button className="btn dark" onClick={ask} disabled={busy || !buyerClaim.trim()}>
          {busy && <span className="spinner" />}
          {busy ? 'The arbitrator is deciding…' : 'Ask the arbitrator'}
        </button>
      )}

      {ruling && (
        <>
          <div className="split" aria-hidden="true">
            <i className="a" style={{ width: `${a.freelancerPayoutPercent}%` }} />
            <i className="b" style={{ width: `${a.clientRefundPercent}%` }} />
          </div>
          <div className="split-legend">
            <span>Freelancer {money(a.freelancerPayoutAmount, deal.currency)}</span>
            <span>Buyer {money(a.clientRefundAmount, deal.currency)}</span>
          </div>
          <p className="sub" style={{ marginTop: 14 }}>{ruling.ruling}</p>
          <div className="actions">
            <button className="btn primary" onClick={apply} disabled={busy}>
              {busy && <span className="spinner" />}
              Apply this ruling on PayPal
            </button>
            <button className="btn ghost" onClick={() => setRuling(null)} disabled={busy}>Edit the claims</button>
          </div>
        </>
      )}
      {error && <div className="error">{error}</div>}
    </div>
  );
}
