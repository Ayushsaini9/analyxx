/**
 * ANALYXX WhatsApp Bot — Study Chat Handler
 *
 * Handles general study doubts via the multi-model consensus AI backend.
 * Supports commands: /doubt, /explain, /solve, /quiz
 */

const config = require("../config");
const wa = require("../whatsapp");
const logger = require("../logger");

const BACKEND_URL = config.BACKEND_URL;

/**
 * Map user-facing commands to study modes.
 */
const COMMAND_MODE_MAP = {
  "/doubt": "general",
  "/explain": "explain",
  "/solve": "solve",
  "/quiz": "quiz",
  "/summarize": "summarize",
  "/predict": "predict",
};

/**
 * Detect if a message is a study command.
 * Returns { mode, query } or null.
 */
function parseStudyCommand(text) {
  const trimmed = text.trim();

  // Check for slash commands: /doubt <question>, /explain <topic>, etc.
  for (const [cmd, mode] of Object.entries(COMMAND_MODE_MAP)) {
    if (trimmed.toLowerCase().startsWith(cmd)) {
      const query = trimmed.slice(cmd.length).trim();
      if (query.length > 0) {
        return { mode, query };
      }
      return { mode, query: null }; // Command without query — prompt user
    }
  }

  return null;
}

/**
 * Check if a message looks like a general study question
 * (not a PYQ request, not a menu command, not a greeting).
 */
function looksLikeStudyQuestion(text) {
  const trimmed = text.trim().toLowerCase();

  // Skip if it's very short (likely a greeting or command)
  if (trimmed.length < 15) return false;

  // Study question indicators
  const studyPatterns = [
    /^(what|why|how|explain|solve|find|calculate|derive|prove|define|describe|compare|differentiate|distinguish)/i,
    /\b(formula|equation|theorem|law|principle|concept|reaction|mechanism|process)\b/i,
    /\b(chapter|topic|class|ncert|textbook|syllabus|example|problem|question)\b/i,
    /\b(physics|chemistry|biology|maths?|math|calculus|algebra|geometry|trigonometry)\b/i,
    /\b(organic|inorganic|physical chemistry|thermodynamics|mechanics|optics|electro)\b/i,
    /\b(polity|economy|geography|history|current affairs|constitution)\b/i,
    /\?(\\s*)$/,  // Ends with question mark
  ];

  return studyPatterns.some((p) => p.test(trimmed));
}

/**
 * Send a study question to the backend study chat API.
 * @param {string} from — WhatsApp number
 * @param {string} query — the student's question
 * @param {string} mode — study mode (general, explain, solve, quiz, etc.)
 * @param {string|null} exam — exam context if known
 */
async function handleStudyChat(from, query, mode = "general", exam = null) {
  try {
    // Send "thinking" indicator
    await wa.sendText(from, "🧠 _Analyzing with multiple AI models..._");

    const response = await fetch(`${BACKEND_URL}/api/v1/study/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Use a service-level auth for WhatsApp bot requests
        "X-Bot-Key": config.GROQ_API_KEY,
      },
      body: JSON.stringify({
        message: query,
        mode: mode,
        exam: exam,
        subject: null,
        chat_history: null,
      }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      logger.error("Study chat API error", { status: response.status, detail: errData.detail });

      if (response.status === 429) {
        await wa.sendText(from, "⚠️ Too many requests. Please wait a minute and try again.");
        return;
      }

      await wa.sendText(from, "Sorry, the AI is temporarily busy. Please try again in a moment.");
      return;
    }

    const data = await response.json();

    // Format the response for WhatsApp
    let reply = data.reply || "Sorry, I couldn't generate an answer.";

    // WhatsApp has a 4096 char limit — truncate if needed
    if (reply.length > 3800) {
      reply = reply.slice(0, 3800) + "\n\n_...response truncated. Ask on analyxx.com for the full answer._";
    }

    // Clean up markdown that doesn't render well on WhatsApp
    reply = formatForWhatsApp(reply);

    // Add model info badge
    if (data.is_synthesized && data.model_count > 1) {
      reply += `\n\n_⚡ Synthesized from ${data.model_count} AI models_`;
    }

    await wa.sendText(from, reply);

    // Send follow-up actions
    await wa.sendButtons(from, "Want to explore more?", [
      { id: "action_menu", title: "📚 Browse PYQs" },
      { id: "study_more", title: "💡 Ask Another Doubt" },
    ]);

    logger.info(`Study chat answered for ${from}`, {
      mode,
      models: data.models_used,
      synthesized: data.is_synthesized,
      chars: reply.length,
    });
  } catch (err) {
    logger.error("Study chat handler error", { from, error: err.message });
    await wa.sendText(from, "Something went wrong while getting your answer. Please try again.");
  }
}

/**
 * Format markdown for WhatsApp rendering.
 * WhatsApp supports: *bold*, _italic_, ~strikethrough~, ```code```
 */
function formatForWhatsApp(text) {
  return text
    // Convert ## headers to bold
    .replace(/^#{1,6}\s+(.+)$/gm, "*$1*")
    // Convert **bold** to *bold* (WhatsApp format)
    .replace(/\*\*(.+?)\*\*/g, "*$1*")
    // Convert `inline code` to WhatsApp monospace
    .replace(/`([^`]+)`/g, "```$1```")
    // Convert bullet points
    .replace(/^[-*]\s/gm, "• ")
    // Clean up triple+ newlines
    .replace(/\n{3,}/g, "\n\n");
}

/**
 * Send the study mode help message.
 */
async function sendStudyHelp(from) {
  const helpText =
    `🧠 *ANALYXX Study AI*\n\n` +
    `Ask me any study doubt! Here's how:\n\n` +
    `💡 */explain* _[topic]_ — Concept explanation\n` +
    `  _Example: /explain electromagnetic induction_\n\n` +
    `✏️ */solve* _[problem]_ — Step-by-step solution\n` +
    `  _Example: /solve find derivative of sin²x_\n\n` +
    `🎯 */quiz* _[topic]_ — Practice quiz\n` +
    `  _Example: /quiz thermodynamics_\n\n` +
    `📝 */summarize* _[topic]_ — Quick revision\n` +
    `  _Example: /summarize organic chemistry alcohols_\n\n` +
    `🔮 */predict* _[exam]_ — Exam predictions\n` +
    `  _Example: /predict JEE Main 2027 Physics_\n\n` +
    `Or just type your question directly!\n` +
    `_"What is Newton's third law?"_`;

  await wa.sendText(from, helpText);
}

module.exports = {
  parseStudyCommand,
  looksLikeStudyQuestion,
  handleStudyChat,
  sendStudyHelp,
  COMMAND_MODE_MAP,
};
