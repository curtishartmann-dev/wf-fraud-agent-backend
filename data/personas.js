// Demo personas keyed by phone number.
// These power deterministic responses across every endpoint so a demo flow
// can be scripted: call from one of these numbers and the full system tells
// a coherent story.

const PERSONAS = {
  // Active scam in progress: 78-year-old being coached by a "Federal Reserve
  // investigator" to wire her savings to a "safe account." HIGH everything.
  "+15558675309": {
    customerId: "WF-1001",
    name: "Eleanor Martinez",
    age: 78,
    riskTier: "high",
    pindrop: {
      score: 87,
      level: "high",
      reasonCodes: ["spoofed_ani", "voip_anonymizer", "device_anomaly", "carrier_mismatch"],
      deviceFingerprintMatch: false,
      aniValidation: "spoofed",
      voipAnonymizer: true,
      firstSeen: "2026-05-27T08:14:00Z",
    },
    baseline: {
      baselineScore: 92,         // very predictable customer
      proposedDelta: 8.2,        // 8 sigma above baseline
      threshold: 2.0,
      anomalyFlags: [
        "amount_8x_typical",
        "first_time_payee",
        "out_of_state_wire",
        "outside_typical_hours",
      ],
      signal: "featurespace_baseline_deviation",
    },
    voiceAnalytics: {
      coachedSpeech: true,
      multiVoiceDetected: true,
      stressScore: 0.81,
      sentiment: "distressed",
      keywordsDetected: ["Federal Reserve", "safe account", "investigator", "don't tell anyone"],
      signals: [
        "coached_speech",
        "urgency_secrecy",
        "scam_keyword",
        "process_before_verify",
      ],
    },
    recentFlags: [
      "elder_customer_flag",
      "actimize_velocity_alert_24h",
      "no_prior_wires_2yr",
    ],
    proposedAction: {
      type: "wire",
      amountUsd: 48500,
      payee: "Investment Recovery LLC",
      destinationState: "NV",
      firstTimePayee: true,
    },
    accounts: [
      { accountNumberMasked: "****4521", type: "Way2Save", balanceUsd: 62418.22, lastActivity: "2026-05-26T11:02:00Z" },
      { accountNumberMasked: "****7702", type: "Everyday Checking", balanceUsd: 3140.18, lastActivity: "2026-05-27T07:55:00Z" },
    ],
  },

  // New-payee Zelle, mild caller-risk elevation — agent should reach MEDIUM
  // and ask a single clarifying question.
  "+12125555550": {
    customerId: "WF-3003",
    name: "Robert Johnson",
    age: 55,
    riskTier: "medium",
    pindrop: {
      score: 42,
      level: "medium",
      reasonCodes: ["new_device", "weekend_call"],
      deviceFingerprintMatch: false,
      aniValidation: "valid",
      voipAnonymizer: false,
      firstSeen: "2026-05-27T12:30:00Z",
    },
    baseline: {
      baselineScore: 78,
      proposedDelta: 2.1,
      threshold: 2.0,
      anomalyFlags: ["first_time_payee"],
      signal: "featurespace_baseline_deviation",
    },
    voiceAnalytics: {
      coachedSpeech: false,
      multiVoiceDetected: false,
      stressScore: 0.35,
      sentiment: "neutral",
      keywordsDetected: ["contractor", "deposit"],
      signals: [],
    },
    recentFlags: ["new_device_30d"],
    proposedAction: {
      type: "zelle",
      amountUsd: 1200,
      payee: "Mike T.",
      firstTimePayee: true,
    },
    accounts: [
      { accountNumberMasked: "****1188", type: "Premier Checking", balanceUsd: 8450.61, lastActivity: "2026-05-27T09:11:00Z" },
    ],
  },

  // Clean: routine PG&E bill pay, low everywhere.
  "+14155551234": {
    customerId: "WF-2002",
    name: "James Chen",
    age: 42,
    riskTier: "low",
    pindrop: {
      score: 8,
      level: "low",
      reasonCodes: [],
      deviceFingerprintMatch: true,
      aniValidation: "valid",
      voipAnonymizer: false,
      firstSeen: "2024-01-12T16:00:00Z",
    },
    baseline: {
      baselineScore: 88,
      proposedDelta: 0.3,
      threshold: 2.0,
      anomalyFlags: [],
      signal: "none",
    },
    voiceAnalytics: {
      coachedSpeech: false,
      multiVoiceDetected: false,
      stressScore: 0.12,
      sentiment: "calm",
      keywordsDetected: [],
      signals: [],
    },
    recentFlags: [],
    proposedAction: {
      type: "bill_pay",
      amountUsd: 180.5,
      payee: "PG&E",
      firstTimePayee: false,
    },
    accounts: [
      { accountNumberMasked: "****9003", type: "Everyday Checking", balanceUsd: 14820.07, lastActivity: "2026-05-27T08:30:00Z" },
      { accountNumberMasked: "****5511", type: "Way2Save", balanceUsd: 38415.99, lastActivity: "2026-05-26T22:00:00Z" },
    ],
  },

  // Clean: routine Zelle to family.
  "+13105557777": {
    customerId: "WF-4004",
    name: "Maria Garcia",
    age: 36,
    riskTier: "low",
    pindrop: {
      score: 12,
      level: "low",
      reasonCodes: [],
      deviceFingerprintMatch: true,
      aniValidation: "valid",
      voipAnonymizer: false,
      firstSeen: "2023-08-04T13:00:00Z",
    },
    baseline: {
      baselineScore: 81,
      proposedDelta: 0.1,
      threshold: 2.0,
      anomalyFlags: [],
      signal: "none",
    },
    voiceAnalytics: {
      coachedSpeech: false,
      multiVoiceDetected: false,
      stressScore: 0.18,
      sentiment: "calm",
      keywordsDetected: [],
      signals: [],
    },
    recentFlags: [],
    proposedAction: {
      type: "zelle",
      amountUsd: 200,
      payee: "Sarah Garcia (sister)",
      firstTimePayee: false,
    },
    accounts: [
      { accountNumberMasked: "****2244", type: "Everyday Checking", balanceUsd: 5621.34, lastActivity: "2026-05-27T10:00:00Z" },
    ],
  },
};

// Fallback for unknown phone numbers — looks vaguely suspicious so demos
// without a scripted number still produce interesting output.
const DEFAULT_PERSONA = {
  customerId: "WF-UNKNOWN",
  name: "Unknown Caller",
  age: null,
  riskTier: "medium",
  pindrop: {
    score: 55,
    level: "medium",
    reasonCodes: ["unknown_number", "no_prior_history"],
    deviceFingerprintMatch: false,
    aniValidation: "unknown",
    voipAnonymizer: false,
    firstSeen: new Date().toISOString(),
  },
  baseline: {
    baselineScore: 0,
    proposedDelta: 0,
    threshold: 2.0,
    anomalyFlags: ["no_baseline_history"],
    signal: "none",
  },
  voiceAnalytics: {
    coachedSpeech: false,
    multiVoiceDetected: false,
    stressScore: 0.3,
    sentiment: "neutral",
    keywordsDetected: [],
    signals: [],
  },
  recentFlags: ["no_account_match"],
  proposedAction: null,
  accounts: [],
};

function lookup(phoneNumber) {
  if (!phoneNumber) return DEFAULT_PERSONA;
  return PERSONAS[phoneNumber] || DEFAULT_PERSONA;
}

function lookupByCustomerId(customerId) {
  if (!customerId) return DEFAULT_PERSONA;
  for (const p of Object.values(PERSONAS)) {
    if (p.customerId === customerId) return p;
  }
  return DEFAULT_PERSONA;
}

module.exports = { PERSONAS, DEFAULT_PERSONA, lookup, lookupByCustomerId };
