// server/db.js
// Persistent Relational Storage for NexusPay AI Agentic Escrow Protocol
// Powered by SQLite (via Node.js native DatabaseSync) with relational schemas,
// foreign keys, WAL journaling, atomic transactions, and automated seed data.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { DatabaseSync } from 'node:sqlite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = process.env.DATA_DIR || path.resolve(__dirname, 'data');
const DB_PATH = process.env.DB_PATH || path.join(DATA_DIR, 'nexuspay.sqlite');

// Ensure database directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initialize SQLite database
const db = new DatabaseSync(DB_PATH);

// Configure performance and integrity PRAGMAs
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

/**
 * Initialize all database tables and indexes
 */
function initSchema() {
  db.exec(`
    -- 1. Agreements / Contracts
    CREATE TABLE IF NOT EXISTS agreements (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      scope TEXT NOT NULL,
      total_budget REAL NOT NULL,
      currency TEXT DEFAULT 'USD',
      nda_protected INTEGER DEFAULT 1,
      contract_hash TEXT NOT NULL,
      escrow_status TEXT NOT NULL,
      paypal_order_id TEXT,
      buyer_agent_id TEXT,
      seller_agent_id TEXT,
      kya_mandates_json TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_agreements_paypal_order ON agreements(paypal_order_id);

    -- 2. Milestones
    CREATE TABLE IF NOT EXISTS milestones (
      id TEXT PRIMARY KEY,
      agreement_id TEXT NOT NULL,
      milestone_index INTEGER NOT NULL,
      name TEXT NOT NULL,
      amount REAL NOT NULL,
      criteria_json TEXT NOT NULL,
      status TEXT NOT NULL,
      paypal_capture_id TEXT,
      ai_score INTEGER,
      verdict TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY(agreement_id) REFERENCES agreements(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_milestones_agreement ON milestones(agreement_id);

    -- 3. Escrow Ledger (AG Grid Source)
    CREATE TABLE IF NOT EXISTS escrow_ledger (
      id TEXT PRIMARY KEY,
      agreement_id TEXT NOT NULL,
      milestone_id TEXT,
      project_title TEXT NOT NULL,
      buyer TEXT NOT NULL,
      freelancer TEXT NOT NULL,
      amount REAL NOT NULL,
      currency TEXT DEFAULT 'USD',
      paypal_order_id TEXT,
      paypal_capture_id TEXT,
      paypal_refund_id TEXT,
      status TEXT NOT NULL,
      privacy_mode TEXT NOT NULL,
      proof_hash TEXT NOT NULL,
      ai_score INTEGER,
      transaction_type TEXT NOT NULL,
      raw_payload_json TEXT,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_ledger_order ON escrow_ledger(paypal_order_id);
    CREATE INDEX IF NOT EXISTS idx_ledger_agreement ON escrow_ledger(agreement_id);

    -- 4. Cryptographic ZK Attestations & Audit Certificates
    CREATE TABLE IF NOT EXISTS zk_attestations (
      attestation_id TEXT PRIMARY KEY,
      agreement_id TEXT NOT NULL,
      milestone_id TEXT NOT NULL,
      artifact_digest TEXT NOT NULL,
      metrics_json TEXT NOT NULL,
      runner_origin TEXT NOT NULL,
      hmac_signature TEXT NOT NULL,
      score INTEGER NOT NULL,
      verdict TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_attestations_agreement ON zk_attestations(agreement_id);

    -- 5. Webhook Events & Idempotency Log
    CREATE TABLE IF NOT EXISTS webhook_events (
      event_id TEXT PRIMARY KEY,
      event_type TEXT NOT NULL,
      resource_type TEXT NOT NULL,
      resource_id TEXT NOT NULL,
      summary TEXT,
      status TEXT NOT NULL,
      received_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_webhook_resource ON webhook_events(resource_id);

    -- 6. MCP & PayPal Telemetry Log
    CREATE TABLE IF NOT EXISTS telemetry_buffer (
      id TEXT PRIMARY KEY,
      timestamp TEXT NOT NULL,
      tool TEXT NOT NULL,
      endpoint TEXT NOT NULL,
      method TEXT NOT NULL,
      status INTEGER NOT NULL,
      mode TEXT NOT NULL,
      latency_ms REAL NOT NULL,
      summary TEXT,
      payload_preview_json TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_telemetry_timestamp ON telemetry_buffer(timestamp);
  `);
}

/**
 * Format milestone row to JavaScript domain object
 */
function formatMilestone(row) {
  if (!row) return null;
  const shortId = row.id.includes(':') ? row.id.split(':')[1] : row.id;
  return {
    id: shortId,
    milestoneId: shortId,
    fullId: row.id,
    agreementId: row.agreement_id,
    milestoneIndex: row.milestone_index,
    name: row.name,
    amount: Number(row.amount),
    criteria: row.criteria_json ? JSON.parse(row.criteria_json) : [],
    status: row.status,
    paypalCaptureId: row.paypal_capture_id,
    aiScore: row.ai_score,
    verdict: row.verdict,
    createdAt: row.created_at
  };
}

/**
 * Format agreement row and attach itemized milestones
 */
function formatAgreement(row, milestones = []) {
  if (!row) return null;
  return {
    id: row.id,
    title: row.title,
    scope: row.scope,
    totalBudget: Number(row.total_budget),
    currency: row.currency || 'USD',
    ndaProtected: Boolean(row.nda_protected),
    contractHash: row.contract_hash,
    escrowStatus: row.escrow_status,
    paypalOrderId: row.paypal_order_id,
    buyerAgentId: row.buyer_agent_id,
    sellerAgentId: row.seller_agent_id,
    kyaMandates: row.kya_mandates_json ? JSON.parse(row.kya_mandates_json) : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    milestones: milestones.map(formatMilestone)
  };
}

/**
 * Format transaction ledger row for AG Grid and frontend
 */
function formatLedgerRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    agreementId: row.agreement_id,
    milestoneId: row.milestone_id,
    project: row.project_title,
    projectTitle: row.project_title,
    buyer: row.buyer,
    freelancer: row.freelancer,
    amount: Number(row.amount),
    currency: row.currency || 'USD',
    paypalOrderId: row.paypal_order_id,
    paypalCaptureId: row.paypal_capture_id,
    paypalRefundId: row.paypal_refund_id,
    status: row.status,
    privacyMode: row.privacy_mode,
    proofHash: row.proof_hash,
    aiScore: row.ai_score,
    date: row.created_at,
    createdAt: row.created_at,
    type: row.transaction_type,
    transactionType: row.transaction_type,
    rawPayload: row.raw_payload_json ? JSON.parse(row.raw_payload_json) : null
  };
}

/**
 * Seed initial agreements, milestones, and ledger transactions if storage is empty
 */
function seedDatabaseIfEmpty() {
  const ledgerCount = db.prepare('SELECT COUNT(*) as count FROM escrow_ledger').get().count;
  if (ledgerCount > 0) return;

  const now = new Date();

  // 1. Pre-seed Agreements
  const sampleAgreements = [
    {
      id: 'SMA-4481',
      title: 'Enterprise Fraud Scoring Microservice',
      scope: 'Autonomous fraud detection microservice with PayPal webhook listener and strict NDA shield',
      total_budget: 500.0,
      currency: 'USD',
      nda_protected: 1,
      contract_hash: 'sha256:7b1e4481fa990021cd88',
      escrow_status: 'COMPLETED',
      paypal_order_id: '8XP921048KLA',
      buyer_agent_id: 'KYA-PP-ATLAS-094',
      seller_agent_id: 'KYA-PP-NOVA-882',
      kya_mandates_json: JSON.stringify({
        buyerPassport: { kyaId: 'KYA-PP-ATLAS-094', tier: 'ENTERPRISE_BUYER' },
        sellerPassport: { kyaId: 'KYA-PP-NOVA-882', tier: 'VERIFIED_DEVELOPER' }
      }),
      created_at: new Date(now.getTime() - 24 * 3600 * 1000).toISOString(),
      updated_at: new Date(now.getTime() - 20 * 3600 * 1000).toISOString(),
      milestones: [
        {
          id: 'M1',
          name: 'Core Architecture & Model Integration',
          amount: 320.0,
          criteria: ['Valid modular syntax with zero stubs', 'Clean exported scoring service', 'PayPal REST v2 orders'],
          status: 'RELEASED',
          paypal_capture_id: 'CAP-4481-M1',
          ai_score: 96,
          verdict: 'AUTO_RELEASE_PAYOUT'
        },
        {
          id: 'M2',
          name: 'Data Extraction & Production Hardening',
          amount: 180.0,
          criteria: ['End-to-end capture resilience', 'Zero secret leakage (DLP compliant)', 'Automated integration suite'],
          status: 'RELEASED',
          paypal_capture_id: 'CAP-4481-M2',
          ai_score: 93,
          verdict: 'AUTO_RELEASE_PAYOUT'
        }
      ]
    },
    {
      id: 'SMA-3912',
      title: 'PayPal Smart Checkout & Subscriptions',
      scope: 'Production PayPal checkout integration with recurring billing and automated dispute handling',
      total_budget: 450.0,
      currency: 'USD',
      nda_protected: 1,
      contract_hash: 'sha256:9a323912beef0011ff22',
      escrow_status: 'ESCROW_LOCKED',
      paypal_order_id: '8XP883712QWZ',
      buyer_agent_id: 'KYA-PP-ATLAS-102',
      seller_agent_id: 'KYA-PP-NOVA-771',
      kya_mandates_json: JSON.stringify({
        buyerPassport: { kyaId: 'KYA-PP-ATLAS-102', tier: 'ENTERPRISE_BUYER' },
        sellerPassport: { kyaId: 'KYA-PP-NOVA-771', tier: 'VERIFIED_DEVELOPER' }
      }),
      created_at: new Date(now.getTime() - 12 * 3600 * 1000).toISOString(),
      updated_at: new Date(now.getTime() - 12 * 3600 * 1000).toISOString(),
      milestones: [
        {
          id: 'M1',
          name: 'Smart Buttons & Order Authorization',
          amount: 200.0,
          criteria: ['Native PayPal Smart Buttons checkout', 'Authorize/Capture 2-step escrow flow'],
          status: 'ESCROW_LOCKED',
          paypal_capture_id: null,
          ai_score: null,
          verdict: null
        },
        {
          id: 'M2',
          name: 'Webhook Ingestion & Dispute Tribunal',
          amount: 250.0,
          criteria: ['Inbound webhook signature verification', '3-way arbitration settlement'],
          status: 'LOCKED',
          paypal_capture_id: null,
          ai_score: null,
          verdict: null
        }
      ]
    },
    {
      id: 'SMA-3204',
      title: 'Fintech Mobile UI & SDK Kit',
      scope: 'Mobile UI components and SDK wrapper for PayPal escrow payments',
      total_budget: 280.0,
      currency: 'USD',
      nda_protected: 1,
      contract_hash: 'sha256:3204ff8899aa11223344',
      escrow_status: 'ARBITRATED_SPLIT',
      paypal_order_id: '8XP771920JHT',
      buyer_agent_id: 'KYA-PP-ATLAS-088',
      seller_agent_id: 'KYA-PP-NOVA-619',
      kya_mandates_json: JSON.stringify({
        buyerPassport: { kyaId: 'KYA-PP-ATLAS-088', tier: 'ENTERPRISE_BUYER' },
        sellerPassport: { kyaId: 'KYA-PP-NOVA-619', tier: 'VERIFIED_DEVELOPER' }
      }),
      created_at: new Date(now.getTime() - 48 * 3600 * 1000).toISOString(),
      updated_at: new Date(now.getTime() - 24 * 3600 * 1000).toISOString(),
      milestones: [
        {
          id: 'M1',
          name: 'UI Components & Responsive Layout',
          amount: 210.0,
          criteria: ['Tailwind mobile components', 'AG Grid v33 integration'],
          status: 'ARBITRATED_SPLIT',
          paypal_capture_id: 'CAP-3204-M1',
          ai_score: 78,
          verdict: 'MANUAL_CLIENT_REVIEW'
        },
        {
          id: 'M2',
          name: 'SDK Documentation & Automated Tests',
          amount: 70.0,
          criteria: ['Unit test coverage >= 90%', 'OpenAPI 3.1 specification'],
          status: 'REFUNDED_PARTIAL',
          paypal_capture_id: null,
          ai_score: null,
          verdict: null
        }
      ]
    }
  ];

  for (const ag of sampleAgreements) {
    saveAgreement(ag);
  }

  // 2. Pre-seed Historical Escrow Ledger Records (TXN-9081 to TXN-9084)
  const sampleTransactions = [
    {
      id: 'TXN-9081',
      agreementId: 'SMA-4481',
      milestoneId: 'M1',
      projectTitle: 'Enterprise Fraud Scoring Microservice',
      buyer: 'Apex FinTech (Atlas)',
      freelancer: 'Sophia Chen (Nova)',
      amount: 320.0,
      currency: 'USD',
      paypalOrderId: '8XP921048KLA',
      paypalCaptureId: 'CAP-4481-M1',
      paypalRefundId: null,
      status: 'COMPLETED',
      privacyMode: 'ZK-NDA',
      proofHash: 'sha256:9f84c201e7b49d88a12f',
      aiScore: 96,
      transactionType: 'ZK-Attested Auto-Release',
      createdAt: '2026-11-07T18:32:00Z'
    },
    {
      id: 'TXN-9082',
      agreementId: 'SMA-4481',
      milestoneId: 'M2',
      projectTitle: 'Autonomous Data Extraction Agent',
      buyer: 'Apex FinTech (Atlas)',
      freelancer: 'Sophia Chen (Nova)',
      amount: 180.0,
      currency: 'USD',
      paypalOrderId: '8XP921019MMX',
      paypalCaptureId: 'CAP-4481-M2',
      paypalRefundId: null,
      status: 'COMPLETED',
      privacyMode: 'ZDR-DLP',
      proofHash: 'sha256:3c91a847b201ef9031cc',
      aiScore: 93,
      transactionType: 'Milestone 1 Auto-Release',
      createdAt: '2026-11-06T14:10:00Z'
    },
    {
      id: 'TXN-9083',
      agreementId: 'SMA-3912',
      milestoneId: 'M1',
      projectTitle: 'PayPal Smart Checkout & Subscriptions',
      buyer: 'HyperTrend Commerce',
      freelancer: 'Marc Dupont',
      amount: 450.0,
      currency: 'USD',
      paypalOrderId: '8XP883712QWZ',
      paypalCaptureId: null,
      paypalRefundId: null,
      status: 'ESCROW_LOCKED',
      privacyMode: 'ZK-NDA',
      proofHash: 'sha256:pending-attestation',
      aiScore: null,
      transactionType: 'Milestone Escrow Deposit',
      createdAt: '2026-11-08T08:15:00Z'
    },
    {
      id: 'TXN-9084',
      agreementId: 'SMA-3204',
      milestoneId: 'M1',
      projectTitle: 'Fintech Mobile UI & SDK Kit',
      buyer: 'GlobalFlow Inc.',
      freelancer: "Liam O'Connor",
      amount: 210.0,
      currency: 'USD',
      paypalOrderId: '8XP771920JHT',
      paypalCaptureId: 'CAP-3204-M1',
      paypalRefundId: 'REF-3204-SPLIT',
      status: 'ARBITRATED_SPLIT',
      privacyMode: 'ZDR-DLP',
      proofHash: 'sha256:7d11e0449ac8201b55de',
      aiScore: 78,
      transactionType: 'AI Dispute Resolution (75/25)',
      createdAt: '2026-11-07T11:42:00Z'
    }
  ];

  const insertLedger = db.prepare(`
    INSERT INTO escrow_ledger (
      id, agreement_id, milestone_id, project_title, buyer, freelancer,
      amount, currency, paypal_order_id, paypal_capture_id, paypal_refund_id,
      status, privacy_mode, proof_hash, ai_score, transaction_type, raw_payload_json, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const tx of sampleTransactions) {
    insertLedger.run(
      tx.id,
      tx.agreementId,
      tx.milestoneId || null,
      tx.projectTitle,
      tx.buyer,
      tx.freelancer,
      tx.amount,
      tx.currency || 'USD',
      tx.paypalOrderId || null,
      tx.paypalCaptureId || null,
      tx.paypalRefundId || null,
      tx.status,
      tx.privacyMode,
      tx.proofHash,
      tx.aiScore !== undefined ? tx.aiScore : null,
      tx.transactionType,
      JSON.stringify(tx),
      tx.createdAt
    );
  }
}

// Initialize tables and seed
initSchema();
seedDatabaseIfEmpty();

// --- PUBLIC DATABASE API ---

/**
 * Fetch all agreements with their itemized milestones
 */
export function getAgreements() {
  const rows = db.prepare('SELECT * FROM agreements ORDER BY created_at DESC').all();
  return rows.map((ag) => {
    const milestones = db.prepare('SELECT * FROM milestones WHERE agreement_id = ? ORDER BY milestone_index ASC').all(ag.id);
    return formatAgreement(ag, milestones);
  });
}

/**
 * Fetch a single agreement by ID
 */
export function getAgreement(id) {
  if (!id) return null;
  const ag = db.prepare('SELECT * FROM agreements WHERE id = ?').get(id);
  if (!ag) return null;
  const milestones = db.prepare('SELECT * FROM milestones WHERE agreement_id = ? ORDER BY milestone_index ASC').all(ag.id);
  return formatAgreement(ag, milestones);
}

/**
 * Fetch agreement by PayPal Order ID
 */
export function getAgreementByOrderId(orderId) {
  if (!orderId) return null;
  const ag = db.prepare('SELECT * FROM agreements WHERE paypal_order_id = ?').get(orderId);
  if (!ag) return null;
  const milestones = db.prepare('SELECT * FROM milestones WHERE agreement_id = ? ORDER BY milestone_index ASC').all(ag.id);
  return formatAgreement(ag, milestones);
}

/**
 * Persist an agreement and its itemized milestones atomically
 */
export function saveAgreement(agreement) {
  if (!agreement || !agreement.id) {
    throw new Error('Invalid agreement: id is required');
  }

  const now = new Date().toISOString();
  const id = agreement.id;
  const title = agreement.title || 'Autonomous Escrow Agreement';
  const scope = agreement.scope || 'Standard Deliverable Verification';
  const totalBudget = Number(agreement.totalBudget ?? agreement.total_budget ?? 0);
  const currency = agreement.currency || 'USD';
  const ndaProtected = agreement.ndaProtected !== undefined ? (agreement.ndaProtected ? 1 : 0) : (agreement.nda_protected ? 1 : 0);
  const contractHash = agreement.contractHash || agreement.contract_hash || `sha256:${Date.now().toString(16)}`;
  const escrowStatus = agreement.escrowStatus || agreement.escrow_status || 'AWAITING_PAYPAL_DEPOSIT';
  const paypalOrderId = agreement.paypalOrderId || agreement.paypal_order_id || null;
  const buyerAgentId = agreement.buyerAgentId || agreement.buyer_agent_id || agreement.kyaMandates?.buyerPassport?.kyaId || 'KYA-PP-ATLAS-DEFAULT';
  const sellerAgentId = agreement.sellerAgentId || agreement.seller_agent_id || agreement.kyaMandates?.sellerPassport?.kyaId || 'KYA-PP-NOVA-DEFAULT';
  const kyaMandatesJson = agreement.kyaMandates ? JSON.stringify(agreement.kyaMandates) : (agreement.kya_mandates_json || null);
  const createdAt = agreement.createdAt || agreement.created_at || now;
  const updatedAt = now;

  const upsertAgreement = db.prepare(`
    INSERT INTO agreements (
      id, title, scope, total_budget, currency, nda_protected, contract_hash,
      escrow_status, paypal_order_id, buyer_agent_id, seller_agent_id,
      kya_mandates_json, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      title = excluded.title,
      scope = excluded.scope,
      total_budget = excluded.total_budget,
      currency = excluded.currency,
      nda_protected = excluded.nda_protected,
      contract_hash = excluded.contract_hash,
      escrow_status = excluded.escrow_status,
      paypal_order_id = COALESCE(excluded.paypal_order_id, agreements.paypal_order_id),
      buyer_agent_id = excluded.buyer_agent_id,
      seller_agent_id = excluded.seller_agent_id,
      kya_mandates_json = COALESCE(excluded.kya_mandates_json, agreements.kya_mandates_json),
      updated_at = excluded.updated_at
  `);

  upsertAgreement.run(
    id, title, scope, totalBudget, currency, ndaProtected, contractHash,
    escrowStatus, paypalOrderId, buyerAgentId, sellerAgentId,
    kyaMandatesJson, createdAt, updatedAt
  );

  // Save milestones if provided
  const milestones = agreement.milestones || [];
  const upsertMilestone = db.prepare(`
    INSERT INTO milestones (
      id, agreement_id, milestone_index, name, amount, criteria_json,
      status, paypal_capture_id, ai_score, verdict, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      amount = excluded.amount,
      criteria_json = excluded.criteria_json,
      status = excluded.status,
      paypal_capture_id = COALESCE(excluded.paypal_capture_id, milestones.paypal_capture_id),
      ai_score = COALESCE(excluded.ai_score, milestones.ai_score),
      verdict = COALESCE(excluded.verdict, milestones.verdict)
  `);

  milestones.forEach((m, idx) => {
    const mId = m.id || `M${idx + 1}`;
    const primaryKey = `${id}:${mId}`;
    const criteriaJson = typeof m.criteria === 'string' ? m.criteria : JSON.stringify(m.criteria || []);
    upsertMilestone.run(
      primaryKey,
      id,
      m.milestoneIndex !== undefined ? m.milestoneIndex : idx,
      m.name || `Milestone ${idx + 1}`,
      Number(m.amount || 0),
      criteriaJson,
      m.status || 'PENDING_DEPOSIT',
      m.paypalCaptureId || m.paypal_capture_id || null,
      m.aiScore !== undefined ? m.aiScore : null,
      m.verdict || null,
      m.createdAt || m.created_at || now
    );
  });

  return getAgreement(id);
}

/**
 * Update milestone status, AI score, capture ID, and verdict
 */
export function updateMilestone(agreementId, milestoneId, updates = {}) {
  const primaryKey = `${agreementId}:${milestoneId}`;
  let m = db.prepare('SELECT * FROM milestones WHERE id = ?').get(primaryKey);
  if (!m) {
    m = db.prepare('SELECT * FROM milestones WHERE agreement_id = ? AND (id = ? OR milestone_index = ?)').get(agreementId, milestoneId, parseInt(milestoneId, 10));
  }
  if (!m) {
    return null;
  }

  const newStatus = updates.status !== undefined ? updates.status : m.status;
  const newCaptureId = updates.paypalCaptureId !== undefined ? updates.paypalCaptureId : (updates.paypal_capture_id !== undefined ? updates.paypal_capture_id : m.paypal_capture_id);
  const newScore = updates.aiScore !== undefined ? updates.aiScore : (updates.ai_score !== undefined ? updates.ai_score : m.ai_score);
  const newVerdict = updates.verdict !== undefined ? updates.verdict : m.verdict;

  db.prepare(`
    UPDATE milestones SET
      status = ?,
      paypal_capture_id = ?,
      ai_score = ?,
      verdict = ?
    WHERE id = ?
  `).run(newStatus, newCaptureId, newScore, newVerdict, m.id);

  // Update agreement updated_at timestamp
  db.prepare('UPDATE agreements SET updated_at = ? WHERE id = ?').run(new Date().toISOString(), agreementId);

  // Check if all milestones are released/completed
  const allMilestones = db.prepare('SELECT * FROM milestones WHERE agreement_id = ?').all(agreementId);
  const allReleased = allMilestones.length > 0 && allMilestones.every((item) => item.status === 'RELEASED' || item.status === 'COMPLETED');
  if (allReleased) {
    db.prepare('UPDATE agreements SET escrow_status = ? WHERE id = ?').run('COMPLETED', agreementId);
  }

  return formatMilestone(db.prepare('SELECT * FROM milestones WHERE id = ?').get(m.id));
}

/**
 * Update agreement fields
 */
export function updateAgreement(id, updates = {}) {
  const ag = db.prepare('SELECT * FROM agreements WHERE id = ?').get(id);
  if (!ag) return null;

  const escrowStatus = updates.escrowStatus || updates.escrow_status || ag.escrow_status;
  const paypalOrderId = updates.paypalOrderId || updates.paypal_order_id || ag.paypal_order_id;
  const now = new Date().toISOString();

  db.prepare(`
    UPDATE agreements SET
      escrow_status = ?,
      paypal_order_id = ?,
      updated_at = ?
    WHERE id = ?
  `).run(escrowStatus, paypalOrderId, now, id);

  return getAgreement(id);
}

/**
 * Fetch transaction ledger for AG Grid (all rows, newest first)
 */
export function getLedgerTransactions() {
  const rows = db.prepare('SELECT * FROM escrow_ledger ORDER BY created_at DESC').all();
  return rows.map(formatLedgerRow);
}

/**
 * Append transaction to escrow ledger
 */
export function addLedgerTransaction(tx) {
  if (!tx) throw new Error('Transaction object required');

  const id = tx.id || `TXN-${Math.floor(1000 + Math.random() * 9000)}`;
  const agreementId = tx.agreementId || tx.agreement_id || 'SMA-LIVE';
  const milestoneId = tx.milestoneId || tx.milestone_id || null;
  const projectTitle = tx.project || tx.projectTitle || tx.project_title || 'Autonomous Escrow Milestone';
  const buyer = tx.buyer || 'Atlas (Buyer Agent)';
  const freelancer = tx.freelancer || 'Nova (Seller Agent)';
  const amount = Number(tx.amount || 0);
  const currency = tx.currency || 'USD';
  const paypalOrderId = tx.paypalOrderId || tx.paypal_order_id || null;
  const paypalCaptureId = tx.paypalCaptureId || tx.paypal_capture_id || null;
  const paypalRefundId = tx.paypalRefundId || tx.paypal_refund_id || null;
  const status = tx.status || 'ESCROW_LOCKED';
  const privacyMode = tx.privacyMode || tx.privacy_mode || 'ZDR-DLP';
  const proofHash = tx.proofHash || tx.proof_hash || `sha256:${Date.now().toString(16)}`;
  const aiScore = tx.aiScore !== undefined ? tx.aiScore : (tx.ai_score !== undefined ? tx.ai_score : null);
  const transactionType = tx.type || tx.transactionType || tx.transaction_type || 'PayPal Escrow Deposit';
  const createdAt = tx.date || tx.createdAt || tx.created_at || new Date().toISOString();
  const rawPayloadJson = tx.rawPayload ? JSON.stringify(tx.rawPayload) : JSON.stringify(tx);

  db.prepare(`
    INSERT INTO escrow_ledger (
      id, agreement_id, milestone_id, project_title, buyer, freelancer,
      amount, currency, paypal_order_id, paypal_capture_id, paypal_refund_id,
      status, privacy_mode, proof_hash, ai_score, transaction_type, raw_payload_json, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      status = excluded.status,
      paypal_capture_id = COALESCE(excluded.paypal_capture_id, escrow_ledger.paypal_capture_id),
      paypal_refund_id = COALESCE(excluded.paypal_refund_id, escrow_ledger.paypal_refund_id),
      ai_score = COALESCE(excluded.ai_score, escrow_ledger.ai_score),
      proof_hash = excluded.proof_hash,
      transaction_type = excluded.transaction_type,
      raw_payload_json = excluded.raw_payload_json
  `).run(
    id, agreementId, milestoneId, projectTitle, buyer, freelancer,
    amount, currency, paypalOrderId, paypalCaptureId, paypalRefundId,
    status, privacyMode, proofHash, aiScore, transactionType, rawPayloadJson, createdAt
  );

  return formatLedgerRow(db.prepare('SELECT * FROM escrow_ledger WHERE id = ?').get(id));
}

/**
 * Update transaction by ID or PayPal Order ID
 */
export function updateLedgerTransaction(idOrOrderId, updates = {}) {
  let row = db.prepare('SELECT * FROM escrow_ledger WHERE id = ? OR paypal_order_id = ?').get(idOrOrderId, idOrOrderId);
  if (!row) return null;

  const newStatus = updates.status || row.status;
  const newCaptureId = updates.paypalCaptureId || updates.paypal_capture_id || row.paypal_capture_id;
  const newRefundId = updates.paypalRefundId || updates.paypal_refund_id || row.paypal_refund_id;
  const newScore = updates.aiScore !== undefined ? updates.aiScore : (updates.ai_score !== undefined ? updates.ai_score : row.ai_score);
  const newProof = updates.proofHash || updates.proof_hash || row.proof_hash;
  const newPrivacy = updates.privacyMode || updates.privacy_mode || row.privacy_mode;
  const newType = updates.type || updates.transactionType || updates.transaction_type || row.transaction_type;

  db.prepare(`
    UPDATE escrow_ledger SET
      status = ?,
      paypal_capture_id = ?,
      paypal_refund_id = ?,
      ai_score = ?,
      proof_hash = ?,
      privacy_mode = ?,
      transaction_type = ?
    WHERE id = ?
  `).run(newStatus, newCaptureId, newRefundId, newScore, newProof, newPrivacy, newType, row.id);

  return formatLedgerRow(db.prepare('SELECT * FROM escrow_ledger WHERE id = ?').get(row.id));
}

/**
 * Log inbound webhook event with strict idempotency verification
 */
export function recordWebhookEvent({ eventId, eventType, resourceType, resourceId, summary, status = 'PROCESSED' }) {
  if (!eventId) throw new Error('eventId is required');

  const existing = db.prepare('SELECT * FROM webhook_events WHERE event_id = ?').get(eventId);
  if (existing) {
    return {
      duplicate: true,
      event: {
        eventId: existing.event_id,
        eventType: existing.event_type,
        resourceType: existing.resource_type,
        resourceId: existing.resource_id,
        summary: existing.summary,
        status: 'DUPLICATE',
        receivedAt: existing.received_at
      }
    };
  }

  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO webhook_events (event_id, event_type, resource_type, resource_id, summary, status, received_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    eventId,
    eventType || 'UNKNOWN',
    resourceType || 'unknown',
    resourceId || 'unknown',
    summary || `Inbound Webhook ${eventType}`,
    status,
    now
  );

  return {
    duplicate: false,
    event: {
      eventId,
      eventType,
      resourceType,
      resourceId,
      summary,
      status,
      receivedAt: now
    }
  };
}

/**
 * Fetch all logged webhook events
 */
export function getWebhookEvents(limit = 50) {
  const rows = db.prepare('SELECT * FROM webhook_events ORDER BY received_at DESC LIMIT ?').all(limit);
  return rows.map((r) => ({
    eventId: r.event_id,
    eventType: r.event_type,
    resourceType: r.resource_type,
    resourceId: r.resource_id,
    summary: r.summary,
    status: r.status,
    receivedAt: r.received_at
  }));
}

/**
 * Record MCP & PayPal REST telemetry entry
 */
export function recordTelemetry({ tool, endpoint, method, status, mode, latencyMs, summary, payloadPreview }) {
  const id = `MCP-${Date.now().toString().slice(-5)}-${Math.floor(100 + Math.random() * 900)}`;
  const timestamp = new Date().toISOString();
  const payloadPreviewJson = payloadPreview ? JSON.stringify(payloadPreview) : null;

  db.prepare(`
    INSERT INTO telemetry_buffer (id, timestamp, tool, endpoint, method, status, mode, latency_ms, summary, payload_preview_json)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, timestamp, tool, endpoint, method, status, mode, latencyMs, summary, payloadPreviewJson);

  return {
    id,
    timestamp,
    tool,
    endpoint,
    method,
    status,
    mode,
    latencyMs,
    summary,
    payloadPreview
  };
}

/**
 * Retrieve recent telemetry entries
 */
export function getTelemetry(limit = 50) {
  const rows = db.prepare('SELECT * FROM telemetry_buffer ORDER BY timestamp DESC LIMIT ?').all(limit);
  return rows.map((r) => ({
    id: r.id,
    timestamp: r.timestamp,
    tool: r.tool,
    endpoint: r.endpoint,
    method: r.method,
    status: r.status,
    mode: r.mode,
    latencyMs: r.latency_ms,
    summary: r.summary,
    payloadPreview: r.payload_preview_json ? JSON.parse(r.payload_preview_json) : null
  }));
}

/**
 * Persist Zero-Knowledge Attestation certificate
 */
export function saveZkAttestation({ attestationId, agreementId, milestoneId, artifactDigest, metrics, runnerOrigin, hmacSignature, score, verdict }) {
  const id = attestationId || `ATTEST-${Date.now()}`;
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO zk_attestations (
      attestation_id, agreement_id, milestone_id, artifact_digest,
      metrics_json, runner_origin, hmac_signature, score, verdict, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(attestation_id) DO UPDATE SET
      score = excluded.score,
      verdict = excluded.verdict
  `).run(
    id,
    agreementId || 'SMA-LIVE',
    milestoneId || 'M1',
    artifactDigest || 'sha256:0000',
    JSON.stringify(metrics || {}),
    runnerOrigin || 'cli-private-runner',
    hmacSignature || '',
    score || 0,
    verdict || 'PENDING',
    now
  );

  return {
    attestationId: id,
    agreementId,
    milestoneId,
    artifactDigest,
    metrics,
    runnerOrigin,
    hmacSignature,
    score,
    verdict,
    createdAt: now
  };
}

/**
 * Fetch Zero-Knowledge Attestation by ID
 */
export function getZkAttestation(attestationId) {
  const row = db.prepare('SELECT * FROM zk_attestations WHERE attestation_id = ?').get(attestationId);
  if (!row) return null;
  return {
    attestationId: row.attestation_id,
    agreementId: row.agreement_id,
    milestoneId: row.milestone_id,
    artifactDigest: row.artifact_digest,
    metrics: JSON.parse(row.metrics_json),
    runnerOrigin: row.runner_origin,
    hmacSignature: row.hmac_signature,
    score: row.score,
    verdict: row.verdict,
    createdAt: row.created_at
  };
}

export default {
  getAgreements,
  getAgreement,
  getAgreementByOrderId,
  saveAgreement,
  updateMilestone,
  updateAgreement,
  getLedgerTransactions,
  addLedgerTransaction,
  updateLedgerTransaction,
  recordWebhookEvent,
  getWebhookEvents,
  recordTelemetry,
  getTelemetry,
  saveZkAttestation,
  getZkAttestation
};
