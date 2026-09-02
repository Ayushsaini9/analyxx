/**
 * ANALYXX WhatsApp Bot — Analysis Handler
 *
 * Redirects users to the ANALYXX website's analysis page
 * instead of generating analysis in-chat, providing a
 * richer, more detailed experience on the website.
 */

const config = require("../config");
const wa = require("../whatsapp");
const logger = require("../logger");

/**
 * Build the analysis page URL with query parameters.
 */
function buildAnalysisUrl(examName, subject, year) {
  const params = new URLSearchParams();
  if (examName) params.set("exam", examName);
  if (subject) params.set("subject", subject);
  if (year) params.set("year", String(year));
  return `${config.FRONTEND_URL}/analysis?${params.toString()}`;
}

/**
 * Send the user a link to the website's AI analysis page.
 */
async function handleAnalysis(to, examName, subject, year, analysisType = "general") {
  const url = buildAnalysisUrl(examName, subject, year);
  const paperLabel = `${examName}${subject ? ` ${subject}` : ""}${year ? ` ${year}` : ""}`;

  logger.info(`Redirecting ${to} to analysis page: ${url}`);

  await wa.sendText(
    to,
    `Here's your *AI Analysis* for *${paperLabel}*:\n\n` +
    `${url}\n\n` +
    `Open the link above to view detailed analysis including:\n` +
    `- Topic predictions & weightage\n` +
    `- Difficulty trends\n` +
    `- Recommended study strategy\n` +
    `- High-yield vs low-yield topics\n\n` +
    `_Powered by ANALYXX AI_`
  );

  // Follow-up options
  await wa.sendButtons(
    to,
    "What would you like to do next?",
    [
      { id: "action_menu", title: "Browse Papers" },
      { id: `action_repeat_${examName.replace(/\s+/g, "_")}`, title: "Repeated Topics" },
      { id: `action_chapters_${examName.replace(/\s+/g, "_")}`, title: "Key Chapters" },
    ]
  );
}

module.exports = { handleAnalysis };
