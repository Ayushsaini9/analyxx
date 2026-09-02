/**
 * ANALYXX WhatsApp Bot — Intent Classifier
 *
 * Classifies user messages into intents using regex patterns.
 * Falls back to Groq LLM for ambiguous messages.
 *
 * Intents:
 *   greeting          — hi, hello, hey
 *   menu              — menu, help, start, options
 *   fetch_pyq         — "CAT Quant PYQs", "12th CBSE Physics 2024 paper"
 *   fetch_analysis    — "Analyze CAT 2023 Quant paper"
 *   repeated_topics   — "UPSC Polity repeated topics"
 *   important_chapters— "Most important chapters for NEET Biology"
 *   year_specific     — "12th CBSE Physics 2024 paper" (has year)
 *   general_help      — anything else
 */

const Groq = require("groq-sdk");
const config = require("./config");
const { extractEntities } = require("./examData");
const logger = require("./logger");

const groq = new Groq({ apiKey: config.GROQ_API_KEY });

// ── Regex-based classification ──

const INTENT_PATTERNS = [
  {
    intent: "greeting",
    patterns: [/^(hi|hello|hey|namaste|hola|sup|yo|good\s*(morning|evening|afternoon))\b/i],
  },
  {
    intent: "menu",
    patterns: [/^(menu|help|start|options|commands|what can you do)/i],
  },
  {
    intent: "repeated_topics",
    patterns: [
      /repeat(ed|ing)?\s*(topic|question|chapter)/i,
      /most\s*(asked|repeated|common|frequent)\s*(topic|question|chapter)/i,
      /frequently?\s*(asked|repeated)\s*(topic|question)/i,
    ],
  },
  {
    intent: "important_chapters",
    patterns: [
      /important\s*(chapter|topic|subject|section)/i,
      /most\s*important/i,
      /key\s*(chapter|topic)/i,
      /what\s*(to|should)\s*(study|focus|prepare)/i,
      /high\s*weightage/i,
    ],
  },
  {
    intent: "fetch_analysis",
    patterns: [
      /analy[sz]e/i,
      /analysis\b/i,
      /topic.*(weightage|weight|distribution)/i,
      /difficulty\s*(trend|level|pattern)/i,
      /expected\s*(question|topic|pattern)/i,
      /predict(ion)?s?\b/i,
    ],
  },
  {
    intent: "fetch_pyq",
    patterns: [
      /\bpyq\b/i,
      /\bpaper\b/i,
      /\bquestion\s*paper/i,
      /\bprevious\s*year/i,
      /\bdownload\b/i,
      /\bpdf\b/i,
      /\bget\s*(me\s*)?the?\s*paper/i,
      /\brtu\b/i,
    ],
  },
  {
    intent: "study_doubt",
    patterns: [
      /^\/?(explain|solve|quiz|doubt|summarize|predict)\b/i,
      /^(what|why|how|when|where|who)\s+(is|are|was|were|do|does|did|can|could|would|should|will)\b/i,
      /\b(explain|derive|prove|calculate|find the|solve)\b.*\b(formula|equation|theorem|law|value|area|volume)\b/i,
    ],
  },
];

/**
 * Classify message intent.
 * Returns { intent: string, entities: object|null }
 */
async function classifyIntent(text) {
  const trimmed = text.trim();

  // 1. Try regex patterns first (fast)
  for (const { intent, patterns } of INTENT_PATTERNS) {
    for (const pattern of patterns) {
      if (pattern.test(trimmed)) {
        const entities = extractEntities(trimmed);
        logger.debug(`Regex classified: "${trimmed}" → ${intent}`, { entities });
        return { intent, entities };
      }
    }
  }

  // 2. If we detect exam entities but no clear intent, default to fetch_pyq
  const entities = extractEntities(trimmed);
  if (entities) {
    // If year is included, it's likely a year-specific PYQ request
    const intent = entities.year ? "year_specific" : "fetch_pyq";
    logger.debug(`Entity-based classified: "${trimmed}" → ${intent}`, { entities });
    return { intent, entities };
  }

  // 3. Fallback: use Groq LLM for ambiguous messages
  try {
    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: `You are an intent classifier for an exam preparation chatbot called ANALYXX. 
Classify the user message into exactly ONE of these intents:
- greeting: casual greetings
- menu: asking for help or menu
- fetch_pyq: requesting question papers
- fetch_analysis: requesting analysis of papers
- repeated_topics: asking about frequently repeated topics
- important_chapters: asking about important chapters to study
- general_help: anything else

Also extract: exam (e.g. JEE, NEET, UPSC, CAT, GATE, RTU, 10th CBSE, 12th CBSE), subject, year if mentioned.

Respond as JSON ONLY: {"intent":"...","exam":"...","subject":"...","year":null}`,
        },
        { role: "user", content: trimmed },
      ],
      max_tokens: 100,
      temperature: 0,
    });

    const raw = response.choices[0].message.content.trim();
    // Extract JSON from response
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      logger.debug(`LLM classified: "${trimmed}" → ${parsed.intent}`, parsed);
      return {
        intent: parsed.intent || "general_help",
        entities: parsed.exam ? { exam: null, subject: parsed.subject, year: parsed.year, llmExam: parsed.exam } : null,
      };
    }
  } catch (err) {
    logger.error("LLM classification failed", { error: err.message });
  }

  return { intent: "general_help", entities: null };
}

module.exports = { classifyIntent };
