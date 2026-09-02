/**
 * ANALYXX WhatsApp Bot — WhatsApp Cloud API Client
 *
 * Handles all outgoing message types:
 *   - Plain text
 *   - Button messages (up to 3 buttons)
 *   - List messages (interactive menus)
 *   - Document links (PDF sharing)
 */

const axios = require("axios");
const config = require("./config");
const logger = require("./logger");

const api = axios.create({
  baseURL: config.WA_API_BASE,
  headers: {
    Authorization: `Bearer ${config.WA_TOKEN}`,
    "Content-Type": "application/json",
  },
  timeout: 15000,
});

/**
 * Send a plain text message.
 */
async function sendText(to, body) {
  // WhatsApp has a 4096 char limit per message
  const chunks = splitMessage(body, 4000);
  for (const chunk of chunks) {
    await _send(to, {
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body: chunk },
    });
  }
}

/**
 * Send a message with up to 3 reply buttons.
 * buttons: [{ id: string, title: string }]  (title max 20 chars)
 */
async function sendButtons(to, bodyText, buttons, headerText = null, footerText = null) {
  const payload = {
    messaging_product: "whatsapp",
    to,
    type: "interactive",
    interactive: {
      type: "button",
      body: { text: bodyText },
      action: {
        buttons: buttons.slice(0, 3).map((b) => ({
          type: "reply",
          reply: { id: b.id, title: b.title.substring(0, 20) },
        })),
      },
    },
  };
  if (headerText) payload.interactive.header = { type: "text", text: headerText };
  if (footerText) payload.interactive.footer = { text: footerText };
  await _send(to, payload);
}

/**
 * Send an interactive list message (up to 10 rows per section).
 * sections: [{ title: string, rows: [{ id, title, description? }] }]
 */
async function sendList(to, bodyText, buttonLabel, sections, headerText = null, footerText = null) {
  const payload = {
    messaging_product: "whatsapp",
    to,
    type: "interactive",
    interactive: {
      type: "list",
      body: { text: bodyText },
      action: {
        button: buttonLabel.substring(0, 20),
        sections: sections.map((s) => ({
          title: s.title.substring(0, 24),
          rows: s.rows.slice(0, 10).map((r) => ({
            id: r.id,
            title: r.title.substring(0, 24),
            description: r.description ? r.description.substring(0, 72) : undefined,
          })),
        })),
      },
    },
  };
  if (headerText) payload.interactive.header = { type: "text", text: headerText };
  if (footerText) payload.interactive.footer = { text: footerText };
  await _send(to, payload);
}

/**
 * Send a document message (e.g. PDF link).
 */
async function sendDocument(to, documentUrl, filename, caption = "") {
  await _send(to, {
    messaging_product: "whatsapp",
    to,
    type: "document",
    document: {
      link: documentUrl,
      filename: filename || "paper.pdf",
      caption: caption.substring(0, 1024),
    },
  });
}

// ── Internal ──

async function _send(to, payload) {
  try {
    const res = await api.post("/messages", payload);
    logger.debug(`Message sent to ${to}`, { messageId: res.data?.messages?.[0]?.id });
    return res.data;
  } catch (err) {
    const errData = err.response?.data?.error || err.message;
    logger.error(`Failed to send message to ${to}`, { error: errData });
    throw new Error(`WhatsApp API error: ${JSON.stringify(errData)}`);
  }
}

function splitMessage(text, maxLen) {
  if (text.length <= maxLen) return [text];
  const chunks = [];
  let remaining = text;
  while (remaining.length > 0) {
    if (remaining.length <= maxLen) {
      chunks.push(remaining);
      break;
    }
    // Try to split at the last newline within maxLen
    let splitAt = remaining.lastIndexOf("\n", maxLen);
    if (splitAt < maxLen * 0.5) splitAt = maxLen;
    chunks.push(remaining.substring(0, splitAt));
    remaining = remaining.substring(splitAt).trimStart();
  }
  return chunks;
}

module.exports = { sendText, sendButtons, sendList, sendDocument };
