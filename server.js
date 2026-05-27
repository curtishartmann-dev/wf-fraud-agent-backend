// Wells Fargo Front-Line Fraud-Aware Virtual Agent — Tool Backend
// Express server that implements the AIR Pro / Nova integration endpoints.

const express = require("express");
const morgan = require("morgan");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const yaml = require("js-yaml");
const swaggerUi = require("swagger-ui-express");

const pindrop = require("./routes/pindrop");
const featurespace = require("./routes/featurespace");
const nice = require("./routes/nice");
const workflows = require("./routes/workflows");

const app = express();

app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(morgan("tiny"));

// Optional latency simulation — set SIMULATED_LATENCY_MS to a number to add
// a uniform delay to every request (useful for showing real-time behavior
// in a demo).
const SIM_LATENCY = parseInt(process.env.SIMULATED_LATENCY_MS || "0", 10);
if (SIM_LATENCY > 0) {
  app.use((req, res, next) => setTimeout(next, SIM_LATENCY));
}

// Health probe (Render uses this)
app.get("/health", (req, res) => res.json({ ok: true, ts: new Date().toISOString() }));

// Mount routes
app.use("/pindrop", pindrop);
app.use("/featurespace", featurespace);
app.use("/nice", nice);
app.use("/workflow", workflows);

// Serve raw OpenAPI YAML
const openapiPath = path.join(__dirname, "openapi.yaml");
app.get("/openapi.yaml", (req, res) => {
  res.type("application/yaml").send(fs.readFileSync(openapiPath, "utf8"));
});

// Mount Swagger UI at /docs
const openapiDoc = yaml.load(fs.readFileSync(openapiPath, "utf8"));
app.use("/docs", swaggerUi.serve, swaggerUi.setup(openapiDoc, {
  customSiteTitle: "WF Fraud Agent — Tool Backend",
}));

// Landing page
app.get("/", (req, res) => {
  res.type("html").send(`
    <!doctype html>
    <html><head><meta charset="utf-8"><title>WF Fraud Agent — Tool Backend</title>
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
             max-width: 720px; margin: 40px auto; padding: 0 16px; color: #222; line-height: 1.5; }
      code { background: #f4f4f4; padding: 2px 6px; border-radius: 4px; }
      .pill { display: inline-block; background: #e8f0fe; color: #1a73e8; padding: 2px 8px; border-radius: 12px; font-size: 12px; margin-right: 4px; }
    </style></head><body>
    <h1>WF Front-Line Fraud-Aware Virtual Agent — Tool Backend</h1>
    <p>Simulated backend powering the RingCentral AIR Pro / Nova agent. Returns
    deterministic responses keyed by phone number so demo flows are scripted.</p>
    <p><a href="/docs"><strong>Open API docs →</strong></a> &nbsp;
    <a href="/openapi.yaml">openapi.yaml</a></p>
    <h2>Demo personas</h2>
    <table cellpadding="6" style="border-collapse: collapse;">
      <tr><th align="left">Phone</th><th align="left">Persona</th><th align="left">Tier</th></tr>
      <tr><td><code>+15558675309</code></td><td>Eleanor Martinez (78)</td><td><span class="pill" style="background:#fde7e9;color:#c5221f">HIGH — active scam</span></td></tr>
      <tr><td><code>+12125555550</code></td><td>Robert Johnson (55)</td><td><span class="pill" style="background:#fef7e0;color:#b06000">MEDIUM — new payee</span></td></tr>
      <tr><td><code>+14155551234</code></td><td>James Chen (42)</td><td><span class="pill" style="background:#e6f4ea;color:#137333">LOW — routine bill pay</span></td></tr>
      <tr><td><code>+13105557777</code></td><td>Maria Garcia (36)</td><td><span class="pill" style="background:#e6f4ea;color:#137333">LOW — Zelle to family</span></td></tr>
    </table>
    <p>MFA correct value for any factor (demo): <code>DEMO_PASS</code></p>
    </body></html>
  `);
});

// 404
app.use((req, res) => res.status(404).json({ error: "not found", path: req.path }));

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "internal server error", message: err.message });
});

const PORT = parseInt(process.env.PORT || "8080", 10);
app.listen(PORT, () => {
  console.log(`WF fraud-agent backend listening on :${PORT}`);
  console.log(`  Docs:  http://localhost:${PORT}/docs`);
  console.log(`  Spec:  http://localhost:${PORT}/openapi.yaml`);
});
