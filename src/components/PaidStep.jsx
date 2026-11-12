// src/components/PaidStep.jsx — step 4: receipt.
import React, { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import { api, money } from '../api.js';

export default function PaidStep({ deal, onNew, onSeeDeals }) {
  const [rows, setRows] = useState([]);

  useEffect(() => {
    api('/api/transactions')
      .then((d) => setRows(d.transactions.filter((t) => t.agreementId === deal.id && ['COMPLETED', 'ARBITRATED_SPLIT'].includes(t.status)).reverse()))
      .catch(() => setRows([]));
  }, [deal.id]);

  const paid = rows.reduce((sum, r) => sum + r.amount, 0);
  const refunded = Math.max(0, Math.round((deal.totalBudget - paid) * 100) / 100);

  return (
    <div className="card">
      <div className="big-check">
        <Check size={28} />
      </div>
      <h2>{refunded > 0 ? 'Settled' : 'Everything is paid'}</h2>
      <p className="sub">
        {refunded > 0
          ? `The freelancer received ${money(paid, deal.currency)} and ${money(refunded, deal.currency)} went back to the buyer.`
          : `The freelancer received ${money(paid, deal.currency)} for “${deal.title}”.`}
      </p>

      <div className="receipt">
        {rows.map((r) => (
          <div key={r.id}>
            <span>{r.project.replace(`${deal.title} `, '').replace(/^\(|\)$/g, '')}</span>
            <span className="mono">{r.paypalCaptureId || 'no capture'} · {money(r.amount, r.currency)}</span>
          </div>
        ))}
        {refunded > 0 && (
          <div>
            <span>Returned to the buyer</span>
            <span>{money(refunded, deal.currency)}</span>
          </div>
        )}
        <div className="total">
          <span>Paid out</span>
          <span>{money(paid, deal.currency)}</span>
        </div>
      </div>

      <div className="actions">
        <button className="btn primary" onClick={onNew}>Start another deal</button>
        <button className="btn ghost" onClick={onSeeDeals}>See all deals</button>
      </div>
    </div>
  );
}
