// Smoke test against a running backend. Defaults to localhost:8080.
// Usage:
//   node smoke-test.js                                    # local
//   BASE=https://wf-fraud-agent-backend.onrender.com npm run test:smoke

const BASE = process.env.BASE || "http://localhost:8080";

async function call(method, path, body, headers = {}) {
  const opts = { method, headers: { "content-type": "application/json", ...headers } };
  if (body) opts.body = JSON.stringify(body);
  const r = await fetch(BASE + path, opts);
  const j = await r.json().catch(() => ({}));
  return { status: r.status, body: j };
}

function show(label, result) {
  const status = result.status === 200 ? "✓" : "✗";
  console.log(`${status} ${label} → ${result.status}`);
  console.log("  " + JSON.stringify(result.body, null, 2).split("\n").join("\n  "));
  console.log();
}

(async () => {
  console.log(`Smoke-testing ${BASE}\n`);

  show("health", await call("GET", "/health"));

  // 1) High-risk scenario — Eleanor Martinez
  console.log("─── HIGH-RISK SCENARIO: +15558675309 ─────────────────");
  const init = await call("POST", "/workflow/session-init", {
    callId: "call_demo_1", phoneNumber: "+15558675309",
  });
  show("session-init", init);
  const customerId = init.body.customerId;

  show("pindrop/caller-risk", await call("POST", "/pindrop/caller-risk", {
    callId: "call_demo_1", phoneNumber: "+15558675309",
  }));

  show("featurespace/baseline", await call("POST", "/featurespace/baseline", {
    customerId,
    proposedAction: { type: "wire", amountUsd: 48500, payee: "Investment Recovery LLC", firstTimePayee: true },
  }));

  show("nice/voice-analytics", await call("POST", "/nice/voice-analytics", {
    callId: "call_demo_1", phoneNumber: "+15558675309",
  }));

  const evidence = await call("POST", "/nice/package-evidence", {
    callId: "call_demo_1",
    signalLog: [
      { signal: "coached_speech", verbatimTrigger: "Federal Reserve safe account", confidence: 0.92, frameworkRule: "rule_3_signal_threshold" },
      { signal: "urgency_secrecy", verbatimTrigger: "don't tell anyone", confidence: 0.88, frameworkRule: "rule_3_signal_threshold" },
      { signal: "scam_keyword", verbatimTrigger: "Federal Reserve", confidence: 0.97, frameworkRule: "rule_3_signal_threshold" },
    ],
  });
  show("nice/package-evidence", evidence);

  show("workflow/warm-transfer", await call("POST", "/workflow/warm-transfer", {
    callId: "call_demo_1",
    riskScore: "HIGH",
    signalSummary: "3 active signals — coached speech, urgency, scam keyword",
    evidencePackageId: evidence.body.evidencePackageId,
  }));

  show("session-close (warm-transferred)", await call("POST", "/workflow/session-close", {
    callId: "call_demo_1",
    sessionId: init.body.sessionId,
    riskScoreFinal: "HIGH",
    signalLog: [],
    outcome: "warm_transferred",
  }));

  // 2) Clean scenario — James Chen, full MFA flow
  console.log("─── CLEAN SCENARIO + MFA: +14155551234 ───────────────");
  const init2 = await call("POST", "/workflow/session-init", {
    callId: "call_demo_2", phoneNumber: "+14155551234",
  });
  show("session-init", init2);
  const cid2 = init2.body.customerId;

  show("MFA factor 1 (voice_print)", await call("POST", "/workflow/mfa", {
    customerId: cid2, factor: "voice_print", value: "DEMO_PASS",
  }));
  show("MFA factor 2 (otp_sms)", await call("POST", "/workflow/mfa", {
    customerId: cid2, factor: "otp_sms", value: "DEMO_PASS",
  }));
  const mfaFinal = await call("POST", "/workflow/mfa", {
    customerId: cid2, factor: "kba", value: "DEMO_PASS",
  });
  show("MFA factor 3 (kba) → full_mfa", mfaFinal);

  show("account-summary (full_mfa)", await call(
    "GET", `/workflow/account-summary?customerId=${cid2}`, null,
    { "x-auth-state": mfaFinal.body.authenticationState },
  ));

  show("intent-router (bill_pay)", await call("POST", "/workflow/intent-router", {
    callId: "call_demo_2", intent: "bill_pay",
  }));

  console.log("Smoke test complete.");
})();
