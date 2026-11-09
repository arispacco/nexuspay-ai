# NexusPay AI — Test Infrastructure & Testing Architecture Specification

## 1. Test Philosophy & Design Principles

NexusPay AI employs an **Opaque-Box, Requirement-Driven Testing Strategy**. The test suite treats the protocol and its services as black-box functional components with defined contract interfaces, evaluating system behavior purely through observable inputs, outputs, cryptographic artifacts, and protocol state transitions.

### Core Testing Tenets:
1. **Opaque-Box Independence**: Tests make no assumptions about private volatile memory internals or transient server state; they validate interface contracts, data integrity, and protocol guarantees.
2. **Deterministic & Zero-Flake Execution**: Using Node.js 24's native `node:test` and `node:assert/strict`, tests execute deterministically without external network flakiness. Live PayPal Sandbox endpoints and Gemini Flash APIs gracefully fall back to zero-config deterministic verification.
3. **Cryptographic Rigor**: Every Zero-Knowledge NDA attestation, HMAC-SHA256 signature, and Know-Your-Agent (KYA) mandate is cryptographically verified with constant-time equality and tamper detection.
4. **Progressive Tiering**: Verification progresses systematically from isolated unit-level feature contracts (Tier 1), through extreme boundary values (Tier 2), across pairwise multi-feature interactions (Tier 3), to end-to-end real-world judge workloads (Tier 4).

---

## 2. Testing Methodology

The NexusPay AI test framework integrates four industry-standard testing methodologies:

### A. Category-Partition Method
Input spaces are decomposed into equivalence partitions across all functional domains:
- **KYA Mandates**: Valid agent signatures, custom budget ceilings, standard vs. NDA-enforced shields.
- **PayPal Orders**: Standard USD, international currencies, 2-decimal rounding, custom tracking IDs.
- **DLP Shield**: 7 distinct secret/PII categories (API keys, PayPal tokens, Cloud/GitHub tokens, ENV assignments, Bearer JWTs, private IPv4, email PII).
- **Code Inspector**: Clean modular code, syntax-broken code, stubbed/unimplemented templates, missing commerce markers.
- **ZK Attestations**: Valid attestations, modified metric payloads, tampered HMAC signatures.
- **Dispute Resolution**: Proportional splits, full refunds, contested claims.

### B. Boundary Value Analysis (BVA)
System limits and precision tolerances are systematically tested at and across edge conditions:
- **Budget Boundaries**: $0 floor, negative values, $1,000,000 enterprise ceiling, 4 decimal places rounding.
- **Payload Boundaries**: 0-byte submissions, 10,000+ line payloads, multi-byte UTF-8 / emoji characters, deeply nested bracket structures.
- **DLP Boundaries**: Dense consecutive secret clustering, partial regex prefix matches, whitelisted `example.com` domains vs. private emails, RFC 1918 private vs. public IPs.

### C. Pairwise & Cross-Feature Interaction Testing
Interactions between independently developed subsystems are verified along their lifecycle pathways:
- **Negotiate-to-Deposit**: Buyer/Seller KYA negotiation directly seeds PayPal Escrow order parameters and itemized milestone invoices.
- **ZK-Proof-to-Capture**: Private CI test attestation feeds the Zero-Knowledge verifier, automatically triggering PayPal order capture upon achieving the >=90% score threshold.
- **Dispute-to-Refund**: Quality dispute triggers multi-agent arbitration, computing proportional percentage splits and executing PayPal refund captures.

### D. Real-World Application Workloads (Judge Scenarios)
Comprehensive end-to-end simulation of the four primary hackathon user journeys:
1. **Scenario 1**: Full-Stack Agent Escrow ($350 happy path).
2. **Scenario 2**: Enterprise NDA Repository ($600 confidential ZK proof).
3. **Scenario 3**: Broken Syntax Build ($180 rejected revision cycle).
4. **Scenario 4**: API Scope Dispute ($500 arbitration & 75/25 split refund).

---

## 3. Feature Inventory Mapping

| Feature ID | Feature Name | Primary Module | Test Suite File | Test Count |
|---|---|---|---|---|
| **FEAT-01** | MCP Telemetry & Tool Registry | `server/paypalClient.js` | `tests/e2e/tier1-features/01-mcp-telemetry.test.js` | ≥ 6 |
| **FEAT-02** | KYA Negotiation & Agent Passports | `server/aiEngine.js`, `server/privacyShield.js` | `tests/e2e/tier1-features/02-kya-negotiation.test.js` | ≥ 6 |
| **FEAT-03** | PayPal Orders v2 Escrow Lock | `server/paypalClient.js` | `tests/e2e/tier1-features/03-paypal-orders.test.js` | ≥ 6 |
| **FEAT-04** | PayPal Milestone Invoicing | `server/paypalClient.js` | `tests/e2e/tier1-features/04-milestone-invoicing.test.js` | ≥ 6 |
| **FEAT-05** | RAM-Only DLP Secret Shield | `server/privacyShield.js` | `tests/e2e/tier1-features/05-dlp-shield.test.js` | ≥ 6 |
| **FEAT-06** | Dynamic Code & Syntax Inspector | `server/aiEngine.js` | `tests/e2e/tier1-features/06-code-inspector.test.js` | ≥ 6 |
| **FEAT-07** | Zero-Knowledge NDA Attestation | `server/privacyShield.js` | `tests/e2e/tier1-features/07-zk-attestation.test.js` | ≥ 6 |
| **FEAT-08** | Autonomous PayPal Order Capture | `server/paypalClient.js` | `tests/e2e/tier1-features/08-paypal-capture.test.js` | ≥ 6 |
| **FEAT-09** | AI Dispute Arbitration & Split | `server/aiEngine.js`, `server/paypalClient.js` | `tests/e2e/tier1-features/09-dispute-arbitration.test.js` | ≥ 6 |
| **BND-01** | Budget & Currency Boundaries | `server/paypalClient.js`, `server/aiEngine.js` | `tests/e2e/tier2-boundary/01-budget-boundaries.test.js` | ≥ 6 |
| **BND-02** | Payload & Code Boundaries | `server/aiEngine.js` | `tests/e2e/tier2-boundary/02-payload-boundaries.test.js` | ≥ 6 |
| **BND-03** | DLP Redaction Edge Cases | `server/privacyShield.js` | `tests/e2e/tier2-boundary/03-dlp-boundaries.test.js` | ≥ 6 |
| **INT-01** | Negotiation to Escrow Deposit | Cross-cutting | `tests/e2e/tier3-interactions/01-negotiate-to-deposit.test.js` | ≥ 5 |
| **INT-02** | ZK Attestation to Payout Capture | Cross-cutting | `tests/e2e/tier3-interactions/02-zk-proof-to-capture.test.js` | ≥ 5 |
| **INT-03** | Dispute Arbitration to Split Refund | Cross-cutting | `tests/e2e/tier3-interactions/03-dispute-to-refund.test.js` | ≥ 5 |
| **SCN-01** | Full-Stack Agent Happy Path | Full Lifecycle | `tests/e2e/tier4-scenarios/01-scenario-fullstack.test.js` | ≥ 4 |
| **SCN-02** | Enterprise NDA Confidential ZK Repo | Full Lifecycle | `tests/e2e/tier4-scenarios/02-scenario-zk-nda.test.js` | ≥ 4 |
| **SCN-03** | Broken Syntax Build Rejection & Fix | Full Lifecycle | `tests/e2e/tier4-scenarios/03-scenario-revision.test.js` | ≥ 4 |
| **SCN-04** | Contract Scope Dispute & Mediation | Full Lifecycle | `tests/e2e/tier4-scenarios/04-scenario-dispute.test.js` | ≥ 4 |

---

## 4. Test Directory Architecture

```
tests/e2e/
├── tier1-features/
│   ├── 01-mcp-telemetry.test.js       # Official @paypal/agent-toolkit MCP tool registry & telemetry
│   ├── 02-kya-negotiation.test.js      # Know-Your-Agent negotiation, passports & budget caps
│   ├── 03-paypal-orders.test.js        # PayPal Orders v2 escrow lock & HATEOAS links
│   ├── 04-milestone-invoicing.test.js  # Smart milestone invoice items & recipient routing
│   ├── 05-dlp-shield.test.js           # 7-rule RAM-only DLP secret & PII sanitization
│   ├── 06-code-inspector.test.js       # Dynamic AST syntax balance, stubs & commerce markers
│   ├── 07-zk-attestation.test.js       # Cryptographic HMAC-SHA256 zero-knowledge attestation
│   ├── 08-paypal-capture.test.js       # Autonomous milestone escrow release & instant payout
│   └── 09-dispute-arbitration.test.js  # 3-way dispute tribunal & proportional split refund
├── tier2-boundary/
│   ├── 01-budget-boundaries.test.js    # Budget floor ($50), $1M ceiling, 4 decimals, NaN
│   ├── 02-payload-boundaries.test.js   # Empty strings, 10,000+ line payloads, UTF-8/emojis
│   └── 03-dlp-boundaries.test.js       # Secret clustering, partial matches, email/IP boundaries
├── tier3-interactions/
│   ├── 01-negotiate-to-deposit.test.js # RFP mandate -> PayPal escrow order lock
│   ├── 02-zk-proof-to-capture.test.js  # Local CI attestation -> autonomous release
│   └── 03-dispute-to-refund.test.js    # Contested deliverable -> split refund -> ledger sync
└── tier4-scenarios/
    ├── 01-scenario-fullstack.test.js   # Scenario 1: Full-Stack Agent ($350 happy path)
    ├── 02-scenario-zk-nda.test.js      # Scenario 2: Enterprise NDA Repo ($600 confidential ZK)
    ├── 03-scenario-revision.test.js    # Scenario 3: Broken Syntax Build ($180 revision cycle)
    └── 04-scenario-dispute.test.js     # Scenario 4: Scope Dispute ($500 arbitration & split)
```

---

## 5. Test Execution Commands

```bash
# Run the complete E2E test suite (Tiers 1 to 4)
node --test tests/e2e/**/*.test.js

# Or using the npm script alias
npm run test:e2e

# Run a specific tier
node --test tests/e2e/tier1-features/*.test.js
node --test tests/e2e/tier2-boundary/*.test.js
node --test tests/e2e/tier3-interactions/*.test.js
node --test tests/e2e/tier4-scenarios/*.test.js

# Run quick regression suite
npm test
```
