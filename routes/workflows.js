const express = require("express");
const crypto = require("crypto");
const { lookup, lookupByCustomerId } = require("../data/personas");

const router = express.Router();

// In-memory MFA progress, keyed by customerId. Cleared on restart — fine for demo.
const mfaState = new Map();

function newId(prefix) {
  return `${prefix}_${crypto.randomBytes(6).toString("hex")}`;
}

function maskName(name) {
  if (!name) return null;
  const parts = name.split(" ");
  return parts
    .map((part, i) => (i === parts.length - 1 ? part[0] + "." : part))
    .join(" ");
}

// ─────────────────────────────────────────────────────────────────────────────
// Session lifecycle
// ─────────────────────────────────────────────────────────────────────────────

router.post("/session-init", (req, res) => {
  const { callId, phoneNumber } = req.body || {};
  if (!callId || !phoneNumber) {
    return res.status(400).json({ error: "callId and phoneNumber required" });
  }
  const p = lookup(phoneNumber);
  return res.json({
    sessionId: newId("sess"),
    customerId: p.customerId,
    customerNameMasked: maskName(p.name),
    callerRisk: { callId, ...p.pindrop },
    recentFlags: p.recentFlags,
    authenticationState: "unauth",
  });
});

router.post("/session-close", (req, res) => {
  const { callId, sessionId, riskScoreFinal, signalLog } = req.body || {};
  if (!callId || !sessionId || !riskScoreFinal) {
    return res
      .status(400)
      .json({ error: "callId, sessionId, riskScoreFinal required" });
  }
  if (!Array.isArray(signalLog)) {
    return res.status(400).json({ error: "signalLog[] required" });
  }
  return res.json({
    caseId: newId("case"),
    persistedAt: new Date().toISOString(),
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Transfer + handoff
// ─────────────────────────────────────────────────────────────────────────────

router.post("/warm-transfer", (req, res) => {
  const { callId, riskScore, signalSummary } = req.body || {};
  if (!callId || !riskScore || !signalSummary) {
    return res
      .status(400)
      .json({ error: "callId, riskScore, signalSummary required" });
  }
  return res.json({
    transferId: newId("xfer"),
    queue: riskScore === "HIGH" ? "fraud-banker-priority" : "fraud-banker-standard",
    etaSeconds: riskScore === "HIGH" ? 8 : 22,
    bankerHandle: "fraud_banker_pool_us_west",
  });
});

router.post("/safe-handoff", (req, res) => {
  const { callId, reason } = req.body || {};
  if (!callId || !reason) {
    return res.status(400).json({ error: "callId and reason required" });
  }
  return res.json({
    handoffId: newId("hand"),
    queue: "general-banker-pool",
    etaSeconds: 35,
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// MFA — progressive: voice_print → otp_sms → kba → full_mfa
// Demo behavior: all three "correct" values are "DEMO_PASS".
// Anything else counts as a failure.
// ─────────────────────────────────────────────────────────────────────────────

const FACTOR_ORDER = ["voice_print", "otp_sms", "kba"];

router.post("/mfa", (req, res) => {
  const { customerId, factor, value } = req.body || {};
  if (!customerId || !factor || value === undefined) {
    return res
      .status(400)
      .json({ error: "customerId, factor, value required" });
  }
  if (!FACTOR_ORDER.includes(factor)) {
    return res.status(400).json({ error: `factor must be one of ${FACTOR_ORDER.join(", ")}` });
  }

  const state =
    mfaState.get(customerId) || { satisfied: [], failures: 0 };

  if (value === "DEMO_PASS" && !state.satisfied.includes(factor)) {
    state.satisfied.push(factor);
  } else if (value !== "DEMO_PASS") {
    state.failures += 1;
  }
  mfaState.set(customerId, state);

  const remaining = FACTOR_ORDER.filter((f) => !state.satisfied.includes(f));
  let authState = "unauth";
  if (state.satisfied.length >= FACTOR_ORDER.length) authState = "full_mfa";
  else if (state.satisfied.length >= 1) authState = "partial_mfa";

  return res.json({
    authenticationState: authState,
    factorsSatisfied: state.satisfied,
    factorsRemaining: remaining,
    failureCount: state.failures,
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Account summary — gated on x-auth-state header == 'full_mfa'
// ─────────────────────────────────────────────────────────────────────────────

router.get("/account-summary", (req, res) => {
  const customerId = req.query.customerId;
  const authState = req.header("x-auth-state");
  if (!customerId) {
    return res.status(400).json({ error: "customerId required" });
  }
  if (authState !== "full_mfa") {
    return res.status(403).json({
      error: "authentication_state must be full_mfa",
      hint: "Complete MFA before requesting account data.",
    });
  }
  const p = lookupByCustomerId(customerId);
  return res.json({ customerId: p.customerId, accounts: p.accounts });
});

// ─────────────────────────────────────────────────────────────────────────────
// Intent router
// ─────────────────────────────────────────────────────────────────────────────

const ROUTES = {
  bill_pay: { route: "skill:bill_pay", queue: "self-service" },
  account_summary: { route: "skill:account_summary", queue: "self-service" },
  zelle: { route: "human:zelle-banker", queue: "zelle-banker-pool" },
  wire: { route: "human:wire-banker", queue: "wire-banker-pool" },
  card_lost: { route: "skill:card_replacement", queue: "self-service" },
  dispute: { route: "human:disputes-banker", queue: "disputes-pool" },
};

router.post("/intent-router", (req, res) => {
  const { callId, intent } = req.body || {};
  if (!callId || !intent) {
    return res.status(400).json({ error: "callId and intent required" });
  }
  const decision = ROUTES[intent] || {
    route: "human:general-banker",
    queue: "general-banker-pool",
  };
  return res.json({
    ...decision,
    rationale: `Intent '${intent}' routes to '${decision.route}' per WF routing matrix.`,
  });
});

module.exports = router;
