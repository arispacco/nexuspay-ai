// src/components/DealsPage.jsx — every payment movement in an AG Grid table, with a detail drawer.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ModuleRegistry, AllCommunityModule, themeQuartz } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { api, money, shortDate } from '../api.js';

ModuleRegistry.registerModules([AllCommunityModule]);

const theme = themeQuartz.withParams({
  fontFamily: 'Hanken Grotesk, system-ui, sans-serif',
  fontSize: 14,
  accentColor: '#0a4fd6',
  backgroundColor: '#ffffff',
  foregroundColor: '#15181e',
  headerBackgroundColor: '#faf9f5',
  headerTextColor: '#4a5160',
  borderColor: '#e6e3da',
  rowHoverColor: '#f7f6f2',
  wrapperBorderRadius: 0
});

const STATUS = {
  COMPLETED: ['Paid', 'ok'],
  RELEASED: ['Paid', 'ok'],
  ESCROW_AUTHORIZED: ['On hold', 'info'],
  ESCROW_LOCKED: ['On hold', 'info'],
  ARBITRATED_SPLIT: ['Settled by AI', 'warn'],
  REFUNDED_PARTIAL: ['Refunded', 'warn'],
  REFUNDED: ['Refunded', 'warn'],
  DISPUTED: ['Disputed', 'bad']
};

// A deal is fully paid out when its captured rows add up to (or settle) the held amount.
function fullyPaid(all, hold) {
  const paidRows = all.filter((t) => t.agreementId === hold.agreementId && ['COMPLETED', 'ARBITRATED_SPLIT'].includes(t.status));
  if (paidRows.some((t) => t.status === 'ARBITRATED_SPLIT')) return true;
  return paidRows.reduce((sum, t) => sum + t.amount, 0) >= hold.amount;
}

function StatusCell({ value }) {
  const [label, tone] = STATUS[value] || [String(value).replace(/_/g, ' ').toLowerCase(), 'info'];
  return <span className={`pill ${tone}`}>{label}</span>;
}

export default function DealsPage({ onResume }) {
  const [rows, setRows] = useState([]);
  const [filter, setFilter] = useState('');
  const [selected, setSelected] = useState(null);
  const grid = useRef(null);

  useEffect(() => {
    api('/api/transactions')
      .then((d) => {
        // An escrow hold row is redundant once its deal has paid out; keep it only while funds are still held.
        setRows(d.transactions.filter((t) => !(t.status === 'ESCROW_AUTHORIZED' && fullyPaid(d.transactions, t))));
      })
      .catch(() => setRows([]));
  }, []);

  const columns = useMemo(
    () => [
      { field: 'date', headerName: 'When', width: 175, valueFormatter: (p) => shortDate(p.value), sort: 'desc' },
      { field: 'project', headerName: 'Deal', flex: 2, minWidth: 220 },
      { field: 'amount', headerName: 'Amount', width: 120, type: 'rightAligned', valueFormatter: (p) => money(p.value, p.data.currency) },
      { field: 'status', headerName: 'Status', width: 150, cellRenderer: StatusCell },
      { field: 'paypalOrderId', headerName: 'PayPal order', width: 170, cellStyle: { fontFamily: 'IBM Plex Mono, monospace', fontSize: 12.5 } }
    ],
    []
  );

  return (
    <>
      <div className="head">
        <h1>All deals</h1>
        <p className="lede">Every hold, payment and refund, in one place.</p>
      </div>

      <div className="toolbar">
        <input id="deal-search" type="text" placeholder="Search" value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Search deals" />
        <span className="spacer" />
        <button className="btn ghost sm" onClick={() => grid.current?.api.exportDataAsCsv({ fileName: 'nexuspay-deals.csv' })}>
          Export CSV
        </button>
      </div>

      <div className="grid-wrap">
        <AgGridReact
          ref={grid}
          theme={theme}
          rowData={rows}
          columnDefs={columns}
          quickFilterText={filter}
          pagination
          paginationPageSize={10}
          paginationPageSizeSelector={false}
          rowStyle={{ cursor: 'pointer' }}
          onRowClicked={(e) => setSelected(e.data)}
          overlayNoRowsTemplate="No deals yet"
        />
      </div>

      {selected && (
        <>
          <div className="scrim" onClick={() => setSelected(null)} />
          <aside className="drawer" aria-label="Deal details">
            <div className="drawer-head">
              <div>
                <h2>{selected.project}</h2>
                <p className="sub">{money(selected.amount, selected.currency)} · <StatusCell value={selected.status} /></p>
              </div>
              <button className="x" onClick={() => setSelected(null)} aria-label="Close">×</button>
            </div>
            <dl className="kv">
              <dt>Deal</dt><dd className="mono">{selected.agreementId}</dd>
              <dt>Type</dt><dd>{selected.type}</dd>
              <dt>When</dt><dd>{shortDate(selected.date)}</dd>
              <dt>PayPal order</dt><dd className="mono">{selected.paypalOrderId || '–'}</dd>
              <dt>PayPal capture</dt><dd className="mono">{selected.paypalCaptureId || '–'}</dd>
              <dt>Audit score</dt><dd>{selected.aiScore ?? '–'}</dd>
              <dt>Proof</dt><dd className="mono">{selected.proofHash}</dd>
            </dl>
            <details className="plain">
              <summary>Technical details</summary>
              <pre className="json">{JSON.stringify(selected.rawPayload ?? selected, null, 2)}</pre>
            </details>
            <div className="actions">
              <button className="btn ghost sm" onClick={() => onResume(selected.agreementId)}>Open this deal</button>
            </div>
          </aside>
        </>
      )}
    </>
  );
}
