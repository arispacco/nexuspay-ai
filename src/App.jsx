// src/App.jsx — a guided four-step flow (Agree, Fund, Deliver, Paid) plus a deals table.
import React, { useCallback, useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import { api } from './api.js';
import AgreeStep, { Contract } from './components/AgreeStep.jsx';
import FundStep from './components/FundStep.jsx';
import DeliverStep from './components/DeliverStep.jsx';
import PaidStep from './components/PaidStep.jsx';
import DealsPage from './components/DealsPage.jsx';
import HoodDrawer from './components/HoodDrawer.jsx';

const STEPS = ['Agree', 'Fund', 'Deliver', 'Paid'];
const STORAGE_KEY = 'nexuspay.dealId';

function stageOf(deal, reviewing) {
  if (!deal || reviewing) return 0;
  const allPaid = deal.milestones.length > 0 && deal.milestones.every((m) => m.status === 'RELEASED');
  if (allPaid || ['COMPLETED', 'ARBITRATED_SPLIT'].includes(deal.escrowStatus)) return 3;
  if (deal.paypalAuthorizationId) return 2;
  return 1;
}

const COPY = [
  { title: 'Pay for work only when it’s done.', lede: 'Two AI agents write the contract, PayPal holds the money, and AI checks the delivery before anything is paid.' },
  { title: 'Put the money on hold', lede: null },
  { title: 'Check the delivery', lede: null },
  { title: 'Done', lede: null }
];

export default function App() {
  const [view, setView] = useState('deal');
  const [status, setStatus] = useState(null);
  const [deal, setDeal] = useState(null);
  const [transcript, setTranscript] = useState([]);
  const [reviewing, setReviewing] = useState(false);
  const [flash, setFlash] = useState('');
  const [hood, setHood] = useState(false);

  const load = useCallback(async (id) => {
    const data = await api(`/api/agreements/${id}`);
    setDeal(data);
    localStorage.setItem(STORAGE_KEY, data.id);
    return data;
  }, []);

  useEffect(() => {
    api('/api/status').then(setStatus).catch(() => setStatus(null));
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) load(saved).catch(() => localStorage.removeItem(STORAGE_KEY));
  }, [load]);

  const stage = stageOf(deal, reviewing);

  function startOver() {
    localStorage.removeItem(STORAGE_KEY);
    setDeal(null);
    setTranscript([]);
    setReviewing(false);
    setFlash('');
    setView('deal');
  }

  async function refresh(message = '') {
    await load(deal.id);
    setFlash(message);
  }

  async function resume(id) {
    try {
      await load(id);
      setTranscript([]);
      setReviewing(false);
      setFlash('');
      setView('deal');
    } catch {
      /* ignore unknown deal */
    }
  }

  const copy = COPY[stage];
  const title = stage === 0 && deal ? 'Review the contract' : copy.title;
  const lede = stage === 0 && deal ? 'Drafted by the two agents. Nothing is charged yet.' : copy.lede;

  return (
    <>
      <header className="topbar">
        <div className="topbar-inner">
          <div className="brand">
            <span className="brand-mark" aria-hidden="true">
              <Check size={16} color="#fff" strokeWidth={3} />
            </span>
            NexusPay
          </div>
          <nav className="nav" aria-label="Main">
            <button aria-current={view === 'deal' ? 'page' : undefined} onClick={() => setView('deal')}>Deal</button>
            <button aria-current={view === 'deals' ? 'page' : undefined} onClick={() => setView('deals')}>All deals</button>
          </nav>
          <div className="topbar-right">
            {status && (
              <>
                <span className={`chip ${status.paypal === 'live' ? 'live' : 'sim'}`} title="Whether PayPal calls reach the real sandbox">
                  <i />
                  {status.paypal === 'live' ? 'PayPal sandbox' : 'PayPal simulated'}
                </span>
                <span className="chip" title="Which engine reviews the deliveries">
                  <i style={{ background: status.ai === 'gemini' ? 'var(--ok)' : undefined }} />
                  {status.ai === 'gemini' ? 'AI: Gemini' : 'AI: rule-based'}
                </span>
              </>
            )}
            <button className="link-btn" onClick={() => setHood(true)}>How it works</button>
          </div>
        </div>
      </header>

      <main className={`page ${view === 'deals' ? 'wide' : ''}`}>
        {view === 'deals' ? (
          <DealsPage onResume={resume} />
        ) : (
          <>
            <ol className="stepper" aria-label="Progress" style={{ listStyle: 'none', padding: 0 }}>
              {STEPS.map((label, i) => (
                <React.Fragment key={label}>
                  <li className={`step ${i === stage ? 'active' : i < stage ? 'done' : ''}`} aria-current={i === stage ? 'step' : undefined}>
                    <b>{i < stage ? <Check size={14} strokeWidth={3} /> : i + 1}</b>
                    <span>{label}</span>
                  </li>
                  {i < STEPS.length - 1 && <div className={`step-bar ${i < stage ? 'done' : ''}`} />}
                </React.Fragment>
              ))}
            </ol>

            <div className="head">
              <h1>{title}</h1>
              {lede && <p className="lede">{lede}</p>}
            </div>

            {flash && <div className="notice" style={{ marginBottom: 16 }}>{flash}</div>}

            {stage === 0 && !deal && (
              <AgreeStep
                onDrafted={(agreement, talk) => {
                  setDeal(agreement);
                  setTranscript(talk);
                  setReviewing(true);
                  localStorage.setItem(STORAGE_KEY, agreement.id);
                }}
              />
            )}

            {stage === 0 && deal && (
              <div className="card">
                <Contract deal={deal} transcript={transcript} />
                <div className="actions">
                  <button className="btn primary" onClick={() => setReviewing(false)}>Looks good, continue</button>
                  <button className="btn ghost" onClick={startOver}>Start over</button>
                </div>
              </div>
            )}

            {stage === 1 && <FundStep key={deal.id} deal={deal} status={status} onFunded={() => refresh('The money is on hold. The freelancer can start.')} />}
            {stage === 2 && <DeliverStep key={`${deal.id}-${deal.milestones.filter((m) => m.status === 'RELEASED').length}`} deal={deal} onChanged={refresh} />}
            {stage === 3 && <PaidStep deal={deal} onNew={startOver} onSeeDeals={() => setView('deals')} />}
          </>
        )}
      </main>

      {hood && <HoodDrawer status={status} onClose={() => setHood(false)} />}
    </>
  );
}
