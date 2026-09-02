/**
 * ANALYXX WhatsApp Bot — Webhook Router
 *
 * Handles two endpoints:
 *   GET  /webhook — Meta webhook verification challenge
 *   POST /webhook — Incoming messages from WhatsApp
 *
 * Sample incoming webhook payload from Meta:
 * {
 *   "object": "whatsapp_business_account",
 *   "entry": [{
 *     "id": "BUSINESS_ACCOUNT_ID",
 *     "changes": [{
 *       "value": {
 *         "messaging_product": "whatsapp",
 *         "metadata": { "display_phone_number": "...", "phone_number_id": "..." },
 *         "contacts": [{ "profile": { "name": "User" }, "wa_id": "919876543210" }],
 *         "messages": [{
 *           "from": "919876543210",
 *           "id": "wamid.xxx",
 *           "timestamp": "1711900000",
 *           "type": "text",
 *           "text": { "body": "Hello" }
 *         }]
 *       },
 *       "field": "messages"
 *     }]
 *   }]
 * }
 *
 * Sample interactive button reply:
 * {
 *   "type": "interactive",
 *   "interactive": {
 *     "type": "button_reply",
 *     "button_reply": { "id": "exam_neet", "title": "NEET" }
 *   }
 * }
 *
 * Sample outgoing text message payload to WhatsApp:
 * POST https://graph.facebook.com/v21.0/{PHONE_NUMBER_ID}/messages
 * {
 *   "messaging_product": "whatsapp",
 *   "to": "919876543210",
 *   "type": "text",
 *   "text": { "body": "Hello from ANALYXX!" }
 * }
 *
 * Sample outgoing button message:
 * {
 *   "messaging_product": "whatsapp",
 *   "to": "919876543210",
 *   "type": "interactive",
 *   "interactive": {
 *     "type": "button",
 *     "body": { "text": "Choose an option:" },
 *     "action": {
 *       "buttons": [
 *         { "type": "reply", "reply": { "id": "btn_1", "title": "Option 1" } },
 *         { "type": "reply", "reply": { "id": "btn_2", "title": "Option 2" } }
 *       ]
 *     }
 *   }
 * }
 */

const express = require("express");
const config = require("./config");
const logger = require("./logger");
const { handleMessage } = require("./handlers/messageHandler");

const router = express.Router();

// Track processed message IDs to avoid duplicate handling
const processedMessages = new Set();

// Cleanup processed IDs every 10 minutes (keep last 10k)
setInterval(() => {
  if (processedMessages.size > 10000) {
    const arr = [...processedMessages];
    arr.splice(0, arr.length - 5000);
    processedMessages.clear();
    arr.forEach((id) => processedMessages.add(id));
  }
}, 10 * 60 * 1000);

/**
 * GET /webhook — Meta verification challenge
 *
 * When you register your webhook URL in Meta Developer Dashboard,
 * Meta sends a GET request with these query params:
 *   hub.mode=subscribe
 *   hub.verify_token=<your_verify_token>
 *   hub.challenge=<random_string>
 *
 * You must respond with the challenge string if the token matches.
 */
router.get("/", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === config.WA_VERIFY_TOKEN) {
    logger.info("Webhook verified successfully");
    return res.status(200).send(challenge);
  }

  logger.warn("Webhook verification failed", { mode, tokenMatch: token === config.WA_VERIFY_TOKEN });
  return res.status(403).send("Forbidden");
});

/**
 * POST /webhook — Incoming messages from WhatsApp
 *
 * Meta sends a POST with the message payload. We must always respond 200
 * quickly (within 5 seconds) or Meta will retry.
 */
router.post("/", async (req, res) => {
  // Always respond 200 immediately — process asynchronously
  res.status(200).send("OK");

  try {
    const body = req.body;

    if (body.object !== "whatsapp_business_account") return;

    const entries = body.entry || [];
    for (const entry of entries) {
      const changes = entry.changes || [];
      for (const change of changes) {
        if (change.field !== "messages") continue;

        const value = change.value;
        const messages = value.messages || [];

        for (const message of messages) {
          // Deduplicate
          if (processedMessages.has(message.id)) {
            logger.debug(`Skipping duplicate message ${message.id}`);
            continue;
          }
          processedMessages.add(message.id);

          const from = message.from; // phone number e.g. "919876543210"

          // Handle message asynchronously (don't block webhook response)
          handleMessage(from, message).catch((err) => {
            logger.error("Async message handler error", { from, error: err.message });
          });
        }
      }
    }
  } catch (err) {
    logger.error("Webhook processing error", { error: err.message });
  }
});

module.exports = router;
