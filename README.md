# WF Front-Line Fraud-Aware Virtual Agent — Tool Backend

Simulated Node.js backend implementing the integration endpoints (Pindrop, Featurespace ARIC, NICE Nexidia) and Wells Fargo internal workflow endpoints called by the RingCentral AIR Pro / Nova agent.

Returns **deterministic, scripted responses keyed by phone number** so demo flows produce consistent, coherent output across all endpoints.

## Demo personas

| Phone | Persona | Risk Tier | Demo story |
|---|---|---|---|
| `+15558675309` | Eleanor Martinez (78) | **HIGH** | Active scam in progress — coached, multi-voice, spoofed ANI, 8σ deviation, wire to "Investment Recovery LLC" |
| `+12125555550` | Robert Johnson (55) | **MEDIUM** | New-payee Zelle from a new device — clarifying question territory |
| `+14155551234` | James Chen (42) | LOW | Routine PG&E bill pay |
| `+13105557777` | Maria Garcia (36) | LOW | Routine Zelle to family |

Any other phone number returns a `WF-UNKNOWN` fallback persona at MEDIUM tier.

MFA correct value for any factor in demos: `DEMO_PASS`. Other values count as failures.

## Endpoints

| Tool | Endpoint | Purpose |
|---|---|---|
| Pindrop | `POST /pindrop/caller-risk` | Caller risk + device intelligence |
| Featurespace | `POST /featurespace/baseline` | ARIC behavioral baseline + delta |
| NICE Nexidia | `POST /nice/voice-analytics` | Coached speech, multi-voice, stress, sentiment |
| NICE Nexidia | `POST /nice/package-evidence` | Bundle voice + signal log into evidence package |
| Workflow | `POST /workflow/session-init` | Initialize call session, prefetch context |
| Workflow | `POST /workflow/session-close` | Persist signal log + create case record |
| Workflow | `POST /workflow/warm-transfer` | Warm-transfer to a fraud banker |
| Workflow | `POST /workflow/safe-handoff` | Fallback to a generic human banker |
| Workflow | `POST /workflow/mfa` | Progressive MFA: voice_print → otp_sms → kba |
| Workflow | `GET  /workflow/account-summary` | Read-only summary (gated on `x-auth-state: full_mfa`) |
| Workflow | `POST /workflow/intent-router` | Route authenticated, low-risk callers |
| — | `GET /docs` | Swagger UI |
| — | `GET /openapi.yaml` | Raw OpenAPI 3.0 spec |
| — | `GET /health` | Liveness probe |

## Run locally

```bash
npm install
npm start
# → http://localhost:8080/docs
```

Try the high-risk persona:

```bash
curl -s -X POST http://localhost:8080/workflow/session-init \
  -H 'content-type: application/json' \
  -d '{"callId":"call_demo_1","phoneNumber":"+15558675309"}' | jq
```

## Deploy to Render.com

**Option A — Blueprint (recommended).** Push this directory to a GitHub repo. In Render: New + → Blueprint → connect the repo. Render picks up `render.yaml` and provisions the service.

**Option B — Manual web service.** New + → Web Service → connect the GitHub repo. Settings:

- Runtime: **Node**
- Build command: `npm install`
- Start command: `npm start`
- Health check path: `/health`
- Environment variable (optional): `SIMULATED_LATENCY_MS=120`

Once deployed, your service URL replaces `https://wf-fraud-agent-backend.onrender.com` in the OpenAPI `servers` block.

## Wiring back into the AIR Pro / Nova agent

In the agent JSON (`wf-fraud-agent.payload.json`), each Integration tool references a `connectionId` (UUID) and `serviceName`. Configure each `connectionId` in your AIR Pro tenant to point at the corresponding base URL on this deployed service:

| `serviceName` | base URL |
|---|---|
| `pindrop` | `https://<your-render-host>/pindrop` |
| `featurespace` | `https://<your-render-host>/featurespace` |
| `niceNexidia` | `https://<your-render-host>/nice` |

Workflow IDs (`<workflow_warm_transfer>` etc.) map onto `/workflow/*` endpoints in your platform's workflow configuration.

## Files

```
.
├── server.js              # Express server + Swagger UI
├── openapi.yaml           # OpenAPI 3.0 spec for all endpoints
├── package.json
├── render.yaml            # Render blueprint
├── routes/
│   ├── pindrop.js
│   ├── featurespace.js
│   ├── nice.js
│   └── workflows.js
└── data/
    └── personas.js        # Scripted demo data keyed by phone number
```
