const express = require("express");
const { lookupByCustomerId } = require("../data/personas");

const router = express.Router();

router.post("/baseline", (req, res) => {
  const { customerId, proposedAction } = req.body || {};
  if (!customerId) {
    return res.status(400).json({ error: "customerId required" });
  }
  const p = lookupByCustomerId(customerId);

  // Slightly modulate the canned baseline by what the agent says it's
  // about to do, so the demo feels live — first-time payees nudge delta up.
  const baseline = { ...p.baseline };
  if (proposedAction && proposedAction.firstTimePayee) {
    baseline.proposedDelta = +(baseline.proposedDelta + 0.4).toFixed(2);
    baseline.anomalyFlags = Array.from(
      new Set([...(baseline.anomalyFlags || []), "first_time_payee"])
    );
  }
  baseline.signal =
    baseline.proposedDelta >= baseline.threshold
      ? "featurespace_baseline_deviation"
      : "none";

  return res.json(baseline);
});

module.exports = router;
