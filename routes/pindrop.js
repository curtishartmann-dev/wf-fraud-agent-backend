const express = require("express");
const { lookup } = require("../data/personas");

const router = express.Router();

router.post("/caller-risk", (req, res) => {
  const { phoneNumber, callId } = req.body || {};
  if (!phoneNumber || !callId) {
    return res.status(400).json({ error: "phoneNumber and callId required" });
  }
  const p = lookup(phoneNumber);
  return res.json({ callId, ...p.pindrop });
});

module.exports = router;
