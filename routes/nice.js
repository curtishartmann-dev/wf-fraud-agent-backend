const express = require("express");
const crypto = require("crypto");
const { lookup } = require("../data/personas");

const router = express.Router();

router.post("/voice-analytics", (req, res) => {
  const { callId, phoneNumber } = req.body || {};
  if (!callId) {
    return res.status(400).json({ error: "callId required" });
  }
  const p = lookup(phoneNumber);
  return res.json({ callId, ...p.voiceAnalytics });
});

router.post("/package-evidence", (req, res) => {
  const { callId, signalLog } = req.body || {};
  if (!callId || !Array.isArray(signalLog)) {
    return res.status(400).json({ error: "callId and signalLog[] required" });
  }
  const evidencePackageId = "nce_" + crypto.randomBytes(8).toString("hex");
  return res.json({
    evidencePackageId,
    url: `https://evidence.nice.example.com/packages/${evidencePackageId}`,
    sizeBytes: 524288 + signalLog.length * 1024,
  });
});

module.exports = router;
