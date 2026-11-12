// src/components/AgreeStep.jsx — step 1: describe the job, let the agents draft the contract.
import React, { useState } from 'react';
import { Check } from 'lucide-react';
import { api, money } from '../api.js';

const EXAMPLE = {
  title: 'Checkout page with PayPal',
  scope: 'A responsive checkout page that creates a PayPal order, handles errors and shows a receipt.',
  budget: 400
};

export function Contract({ deal, transcript }) {
  return (
    <>
      <div className="deal-top">
        <div>
          <h2>
            {deal.title}
            {deal.ndaProtected && <span className="tag">Confidential</span>}
          </h2>
          <p className="sub">{deal.scope}</p>
        </div>
        <div className="amount">
          {money(deal.totalBudget, deal.currency)}
          <small>total, in 2 milestones</small>
        </div>
      </div>

      <div className="milestones">
        {deal.milestones.map((m, i) => (
          <div className="ms" key={m.id}>
            <div className="ms-head">
              <span>
                {i + 1}. {m.name.replace(/^Milestone \d+:\s*/, '')}
              </span>
              <span>{money(m.amount, deal.currency)}</span>
            </div>
            <ul className="checks">
              {m.criteria.map((c) => (
                <li key={c}>
                  <Check size={16} />
                  {c}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {transcript?.length > 0 && (
        <details className="plain">
          <summary>See how the agents negotiated</summary>
          <div className="talk">
            {transcript.map((t, i) => (
              <div key={i} className={`bubble ${t.agent === 'SellerAgent' ? 'seller' : ''}`}>
                <b>{t.name.split(' (')[0]}</b>
                {t.message}
              </div>
            ))}
          </div>
        </details>
      )}
    </>
  );
}

export default function AgreeStep({ onDrafted }) {
  const [title, setTitle] = useState('');
  const [scope, setScope] = useState('');
  const [budget, setBudget] = useState('');
  const [nda, setNda] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const valid = title.trim() && scope.trim() && Number(budget) >= 50;

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const data = await api('/api/negotiate', {
        body: { projectTitle: title.trim(), projectScope: scope.trim(), initialBudget: Number(budget), ndaRequired: nda }
      });
      onDrafted(data.agreement, data.transcript);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="card" onSubmit={submit}>
      <label className="field" htmlFor="job-title">
        <span>What do you need done?</span>
        <input id="job-title" type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Checkout page with PayPal" maxLength={90} />
      </label>

      <label className="field" htmlFor="job-scope">
        <span>What should be delivered?</span>
        <textarea id="job-scope" value={scope} onChange={(e) => setScope(e.target.value)} placeholder="A few sentences are enough." />
      </label>

      <div className="row">
        <label className="field" htmlFor="job-budget">
          <span>Your budget (USD)</span>
          <input id="job-budget" type="number" min="50" step="10" value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="400" />
        </label>
      </div>

      <label className="toggle" htmlFor="job-nda">
        <input id="job-nda" type="checkbox" checked={nda} onChange={(e) => setNda(e.target.checked)} />
        <div>
          <strong>Confidential project</strong>
          <span>The code never leaves the freelancer. Delivery is proven with a signed test report instead.</span>
        </div>
      </label>

      {error && <div className="error">{error}</div>}

      <div className="actions">
        <button className="btn primary" type="submit" disabled={!valid || busy}>
          {busy && <span className="spinner" />}
          {busy ? 'Agents are negotiating…' : 'Draft the contract'}
        </button>
        <button
          className="link-btn"
          type="button"
          onClick={() => {
            setTitle(EXAMPLE.title);
            setScope(EXAMPLE.scope);
            setBudget(String(EXAMPLE.budget));
          }}
        >
          Use an example
        </button>
      </div>
    </form>
  );
}
