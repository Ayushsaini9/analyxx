/**
 * ANALYXX WhatsApp Bot — Express Server
 *
 * Production-ready entry point with:
 *   - Sentry error tracking
 *   - Helmet security headers
 *   - Rate limiting
 *   - JSON body parsing
 *   - Health check endpoint
 *   - Webhook routes
 */

// ── Sentry must be initialized FIRST before any other imports ────────────────
const Sentry = require("@sentry/node");
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || "production",
    tracesSampleRate: 0.1, // 10% of transactions (free tier friendly)
    integrations: [Sentry.httpIntegration()],
  });
}

const express = require("express");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const config = require("./config");
const logger = require("./logger");
const webhookRouter = require("./webhook");

const app = express();

// ── Trust proxy (behind Railway / Render / ngrok) ────────────────────────────
app.set("trust proxy", 1);

// ── Security ──────────────────────────────────────────────────────────────────
app.use(helmet());

// ── Rate limiting: 100 requests per minute per IP ────────────────────────────
app.use(
  rateLimit({
    windowMs: 60 * 1000,
    max: 100,
    message: { error: "Too many requests, please try again later." },
    standardHeaders: true,
    legacyHeaders: false,
  })
);

// ── Body parsing ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: "5mb" }));

// ── Request logging ───────────────────────────────────────────────────────────
app.use((req, res, next) => {
  if (req.path !== "/health") {
    logger.debug(`${req.method} ${req.path}`, {
      ip: req.ip,
      userAgent: req.get("user-agent"),
    });
  }
  next();
});

// ── Routes ────────────────────────────────────────────────────────────────────
app.use("/webhook", webhookRouter);

app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    service: "ANALYXX WhatsApp Bot",
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
  });
});

app.get("/privacy", (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Privacy Policy — ANALYXX AI</title>
<style>body{font-family:'Inter',sans-serif;background:#0a0a0a;color:#ccc;max-width:800px;margin:0 auto;padding:40px 20px;line-height:1.7}
h1{color:#fff;font-size:2rem}h2{color:#fff;font-size:1.2rem;margin-top:28px}ul{padding-left:20px}a{color:#34d399}</style></head>
<body>
<h1>Privacy Policy</h1><p style="color:#888">Last updated: April 7, 2026</p>
<h2>1. Introduction</h2><p>ANALYXX AI ("we", "our", or "us") operates the ANALYXX AI platform, including our website and WhatsApp bot service. This Privacy Policy explains how we collect, use, disclose, and safeguard your information.</p>
<h2>2. Information We Collect</h2><ul><li><strong>Account Information:</strong> Name, email, and password at registration.</li><li><strong>WhatsApp Data:</strong> Phone number and messages when you use our WhatsApp bot.</li><li><strong>Uploaded Content:</strong> Exam papers uploaded for AI analysis.</li><li><strong>Usage Data:</strong> Pages visited and features used.</li></ul>
<h2>3. How We Use Your Information</h2><ul><li>Provide exam analysis and AI study insights</li><li>Operate the WhatsApp bot</li><li>Verify identity and link accounts</li><li>Improve and personalize your experience</li></ul>
<h2>4. Data Storage & Security</h2><p>Data is stored securely using Supabase with Row Level Security. All transmission is encrypted via HTTPS/TLS.</p>
<h2>5. Third-Party Services</h2><ul><li><strong>Meta WhatsApp Business API</strong> — bot service</li><li><strong>Supabase</strong> — data storage</li><li><strong>Groq AI</strong> — analysis (data processed, not stored)</li></ul>
<h2>6. Data Retention</h2><p>We retain data only as long as necessary. Request deletion anytime by contacting us.</p>
<h2>7. Your Rights</h2><ul><li>Access, correct, or delete your data</li><li>Opt out of WhatsApp communications</li><li>Withdraw consent</li></ul>
<h2>8. Contact Us</h2><p>Email: <a href="mailto:analyxai@gmail.com">analyxai@gmail.com</a></p>
<hr style="border-color:#222;margin-top:40px"><p style="text-align:center;color:#666;font-size:0.85rem">© 2026 ANALYXX AI. All rights reserved.</p>
</body></html>`);
});

// ── 404 handler ───────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: "Not found" });
});

// ── Sentry error handler (must be BEFORE custom error handler) ────────────────
if (process.env.SENTRY_DSN) {
  Sentry.setupExpressErrorHandler(app);
}

// ── Custom error handler ──────────────────────────────────────────────────────
app.use((err, req, res, _next) => {
  logger.error("Unhandled error", { error: err.message, stack: err.stack });
  res.status(500).json({ error: "Internal server error" });
});

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(config.PORT, () => {
  logger.info(`ANALYXX WhatsApp Bot running on port ${config.PORT}`);
  logger.info(`Webhook URL: http://localhost:${config.PORT}/webhook`);
  logger.info(`Environment: ${config.NODE_ENV}`);
});

