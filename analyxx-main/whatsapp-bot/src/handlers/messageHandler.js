/**
 * ANALYXX WhatsApp Bot — Main Message Handler
 *
 * Central router that:
 *   1. Verifies the user is a registered ANALYXX user
 *   2. Handles interactive button/list replies (session-based flows)
 *   3. Classifies free-text messages by intent
 *   4. Routes to the appropriate handler
 *
 * Supports both regular exam flows and the RTU multi-step flow:
 *   RTU → Branch → Year → Subject → Calendar Year → Paper
 */

const { classifyIntent } = require("../intentClassifier");
const { EXAMS, RTU_BRANCHES, RTU_YEARS, getRtuSubjects, extractEntities } = require("../examData");
const { isVerifiedUser, linkByEmail, looksLikeEmail } = require("../userVerifier");
const sessionStore = require("../sessionStore");
const wa = require("../whatsapp");
const logger = require("../logger");

const {
  sendExamMenu,
  sendRtuBranchMenu,
  sendRtuYearMenu,
  sendRtuSubjectMenu,
  sendRtuCalendarYearMenu,
  sendSubjectMenu,
  sendYearMenu,
} = require("./menuHandler");
const { handlePyqRequest, handleRtuPyqRequest } = require("./pyqHandler");
const { handleAnalysis } = require("./analysisHandler");
const {
  parseStudyCommand,
  looksLikeStudyQuestion,
  handleStudyChat,
  sendStudyHelp,
} = require("./studyChatHandler");

/**
 * Process an incoming WhatsApp message.
 * @param {string} from — sender phone number (e.g. "919876543210")
 * @param {object} message — the message object from webhook payload
 */
async function handleMessage(from, message) {
  try {
    // ── 1. Extract message content ──
    let text = "";
    let interactiveId = null;
    let interactiveTitle = null;

    if (message.type === "text") {
      text = message.text.body.trim();
    } else if (message.type === "interactive") {
      if (message.interactive.type === "button_reply") {
        interactiveId = message.interactive.button_reply.id;
        interactiveTitle = message.interactive.button_reply.title;
      } else if (message.interactive.type === "list_reply") {
        interactiveId = message.interactive.list_reply.id;
        interactiveTitle = message.interactive.list_reply.title;
      }
    } else {
      // Unsupported message type (images, voice, etc.)
      await wa.sendText(from, "I can only process text messages right now. Try sending a text like:\n\n*\"NEET Biology PYQs\"*\n*\"RTU IT papers\"*\n*\"Important chapters for JEE Physics\"*");
      return;
    }

    logger.info(`Message from ${from}: ${text || interactiveId}`);

    // ── 2. User verification gate ──
    const user = await isVerifiedUser(from);

    if (!user) {
      // User not linked — check if they're sending their email to link
      if (text && looksLikeEmail(text)) {
        const linked = await linkByEmail(from, text);
        if (linked) {
          await wa.sendText(
            from,
            `Welcome to *ANALYXX AI*, ${linked.name}!\n\nYour WhatsApp is now linked to your ANALYXX account (${linked.email}).\n\nYou can now access PYQ papers and AI analysis right here.`
          );
          await sendExamMenu(from);
          return;
        } else {
          await wa.sendText(
            from,
            `No ANALYXX account found for *${text}*.\n\nPlease register at analyxx.com first, then send your registered email here to link your WhatsApp.`
          );
          return;
        }
      }

      // Not verified — prompt them to link
      await wa.sendText(
        from,
        `Welcome to *ANALYXX AI* on WhatsApp!\n\nTo get started, please send your *registered ANALYXX email address* to link your account.\n\nDon't have an account? Register at analyxx.com first.`
      );
      return;
    }

    // ── 3. Handle interactive replies (button/list selections) ──
    if (interactiveId) {
      await handleInteractiveReply(from, interactiveId, interactiveTitle, user);
      return;
    }

    // ── 4. Check for study commands (/doubt, /explain, /solve, etc.) ──
    const studyCmd = parseStudyCommand(text);
    if (studyCmd) {
      if (!studyCmd.query) {
        // Command without a question — show help
        await sendStudyHelp(from);
        return;
      }
      // Detect exam context from session if available
      const session = sessionStore.get(from);
      const examContext = session?.examName || null;
      await handleStudyChat(from, studyCmd.query, studyCmd.mode, examContext);
      return;
    }

    // ── 5. Classify text message intent ──
    const { intent, entities } = await classifyIntent(text);
    logger.debug(`Intent: ${intent}`, { entities });

    switch (intent) {
      case "greeting":
        await wa.sendText(from, `Hey ${user.name}! Welcome back to *ANALYXX AI*.\n\nWhat would you like to explore today?`);
        await sendExamMenu(from);
        break;

      case "menu":
        await sendExamMenu(from);
        break;

      case "study_doubt": {
        const session = sessionStore.get(from);
        const examContext = session?.examName || null;
        await handleStudyChat(from, text, "general", examContext);
        break;
      }

      case "fetch_pyq":
      case "year_specific":
        if (entities?.exam) {
          // RTU request via text
          if (entities.exam.id === "rtu" || entities.exam.isUniversity) {
            if (entities.branch) {
              // Have branch — go to year selection
              sessionStore.set(from, {
                step: "rtu_awaiting_year",
                branchId: entities.branch.id,
                branchName: entities.branch.name,
              });
              await sendRtuYearMenu(from, entities.branch.name);
            } else {
              // No branch — show branch menu
              sessionStore.set(from, { step: "rtu_awaiting_branch" });
              await sendRtuBranchMenu(from);
            }
          } else if (entities.subject && entities.year) {
            // Full request — fetch paper directly
            await handlePyqRequest(from, entities.exam.id, entities.exam.name, entities.subject, entities.year);
          } else if (["jee-mains", "jee-advanced", "neet"].includes(entities.exam.id)) {
            // JEE/NEET — skip subject, go directly to year
            sessionStore.set(from, {
              step: "awaiting_year",
              examId: entities.exam.id,
              examName: entities.exam.name,
              subject: null,
            });
            await sendYearMenu(from, entities.exam.id, null);
          } else if (entities.subject) {
            // Have exam + subject, need year
            sessionStore.set(from, {
              step: "awaiting_year",
              examId: entities.exam.id,
              examName: entities.exam.name,
              subject: entities.subject,
            });
            await sendYearMenu(from, entities.exam.id, entities.subject);
          } else {
            // Have exam, need subject
            sessionStore.set(from, {
              step: "awaiting_subject",
              examId: entities.exam.id,
              examName: entities.exam.name,
            });
            await sendSubjectMenu(from, entities.exam.id);
          }
        } else {
          await wa.sendText(from, "Which exam are you looking for? Let me show you the options:");
          await sendExamMenu(from);
        }
        break;

      case "fetch_analysis":
        if (entities?.exam && entities.exam.id !== "rtu") {
          await handleAnalysis(from, entities.exam.name, entities.subject, entities.year, "general");
        } else {
          await wa.sendText(from, "Which exam would you like me to analyze? Example:\n\n*\"Analyze NEET Biology\"*\n*\"CAT Quant analysis\"*");
        }
        break;

      case "repeated_topics":
        if (entities?.exam && entities.exam.id !== "rtu") {
          await handleAnalysis(from, entities.exam.name, entities.subject, entities.year, "repeated_topics");
        } else {
          await wa.sendText(from, "Which exam's repeated topics? Example:\n\n*\"UPSC Polity repeated topics\"*\n*\"JEE Physics most asked topics\"*");
        }
        break;

      case "important_chapters":
        if (entities?.exam && entities.exam.id !== "rtu") {
          await handleAnalysis(from, entities.exam.name, entities.subject, entities.year, "important_chapters");
        } else {
          await wa.sendText(from, "Which exam's important chapters? Example:\n\n*\"Important chapters for NEET Biology\"*\n*\"JEE Maths key topics\"*");
        }
        break;

      case "general_help":
      default:
        // Check if this looks like a study question
        if (looksLikeStudyQuestion(text)) {
          const session = sessionStore.get(from);
          const examContext = session?.examName || null;
          await handleStudyChat(from, text, "general", examContext);
        } else {
          await wa.sendText(
            from,
            `I'm *ANALYXX AI*, your study partner.\n\nHere's what I can do:\n\n` +
              `🧠 *Study AI* — Just type your question!\n` +
              `💡 */explain* — Explain a concept\n` +
              `✏️ */solve* — Solve a problem step-by-step\n` +
              `🎯 */quiz* — Generate practice quiz\n` +
              `📝 */summarize* — Quick revision notes\n\n` +
              `📄 *Get Papers* — "NEET Biology 2024 paper"\n` +
              `📊 *AI Analysis* — "Analyze JEE Physics"\n` +
              `📚 *Browse Library* — Type "menu"\n\n` +
              `Try sending one of these!`
          );
        }
        break;
    }
  } catch (err) {
    logger.error("Message handler error", { from, error: err.message, stack: err.stack });
    try {
      await wa.sendText(from, "Something went wrong on our end. Please try again in a moment.");
    } catch (_) {
      // Ignore send failure on error recovery
    }
  }
}

/**
 * Handle interactive button/list reply selections.
 */
async function handleInteractiveReply(from, id, title, user) {
  logger.debug(`Interactive reply from ${from}: ${id} (${title})`);

  // ══════════════════════════════════════════════
  //   RTU Flow: Branch → Year → Subject → CalYear
  // ══════════════════════════════════════════════

  // ── RTU exam selected from main menu ──
  if (id === "exam_rtu") {
    sessionStore.set(from, { step: "rtu_awaiting_branch" });
    await sendRtuBranchMenu(from);
    return;
  }

  // ── RTU branch selected: rtu_branch_{branchId} ──
  if (id.startsWith("rtu_branch_")) {
    const branchId = id.replace("rtu_branch_", "");
    const branch = RTU_BRANCHES.find((b) => b.id === branchId);
    if (!branch) {
      await wa.sendText(from, "Branch not found. Type *menu* to start over.");
      return;
    }
    sessionStore.set(from, {
      step: "rtu_awaiting_year",
      branchId: branch.id,
      branchName: branch.name,
    });
    await sendRtuYearMenu(from, branch.name);
    return;
  }

  // ── RTU year selected: rtu_year_{yearId} ──
  if (id.startsWith("rtu_year_")) {
    const yearId = id.replace("rtu_year_", "");
    const session = sessionStore.get(from);
    if (!session?.branchId) {
      await wa.sendText(from, "I lost track of the branch. Let's start over:");
      await sendRtuBranchMenu(from);
      return;
    }
    sessionStore.update(from, {
      step: "rtu_awaiting_subject",
      branchYearId: yearId,
    });
    await sendRtuSubjectMenu(from, session.branchId, yearId, session.branchName);
    return;
  }

  // ── RTU subject selected: rtu_subj_{subjectId} ──
  if (id.startsWith("rtu_subj_")) {
    const subjectId = id.replace("rtu_subj_", "");
    const session = sessionStore.get(from);
    if (!session?.branchId || !session?.branchYearId) {
      await wa.sendText(from, "I lost track of our conversation. Let's start over:");
      await sendRtuBranchMenu(from);
      return;
    }
    // Find the full subject name from the data
    const subjectGroups = getRtuSubjects(session.branchId, session.branchYearId);
    const allSubjects = subjectGroups.flatMap((g) => g.subjects);
    const subject = allSubjects.find((s) => s.id === subjectId);
    if (!subject) {
      await wa.sendText(from, "Subject not found. Type *menu* to start over.");
      return;
    }
    // Determine semester number for this subject so we can filter DB query
    const semGroup = subjectGroups.find((g) => g.subjects.some((s) => s.id === subjectId));
    const semNum = semGroup ? parseInt(semGroup.semester.replace("Semester ", "")) : null;
    sessionStore.update(from, {
      step: "rtu_awaiting_calyear",
      subjectId: subject.id,
      subjectName: subject.name,
      semester: semNum,
    });
    // For 1st-year, DB stores branch as "1st-year" not the specific branch
    const dbBranchId = session.branchYearId === "1st-year" ? "1st-year" : session.branchId;
    await sendRtuCalendarYearMenu(from, subject.name, dbBranchId, semNum);
    return;
  }

  // ── RTU calendar year selected: rtu_calyear_{year} ──
  if (id.startsWith("rtu_calyear_")) {
    const calYear = parseInt(id.replace("rtu_calyear_", ""), 10);
    const session = sessionStore.get(from);
    if (!session?.branchId || !session?.branchYearId || !session?.subjectId || !session?.subjectName) {
      await wa.sendText(from, "I lost track of our conversation. Let's start over:");
      await sendRtuBranchMenu(from);
      return;
    }
    await handleRtuPyqRequest(
      from,
      session.branchId,
      session.branchYearId,
      session.subjectId,
      session.subjectName,
      calYear
    );
    return;
  }

  // ── RTU back navigation buttons ──
  if (id === "rtu_back_subjects") {
    const session = sessionStore.get(from);
    if (session?.branchId && session?.branchYearId) {
      sessionStore.update(from, { step: "rtu_awaiting_subject" });
      await sendRtuSubjectMenu(from, session.branchId, session.branchYearId, session.branchName);
    } else {
      await sendRtuBranchMenu(from);
    }
    return;
  }

  if (id === "rtu_back_years") {
    const session = sessionStore.get(from);
    if (session?.subjectName) {
      sessionStore.update(from, { step: "rtu_awaiting_calyear" });
      const dbBranch = session.branchYearId === "1st-year" ? "1st-year" : session.branchId;
      await sendRtuCalendarYearMenu(from, session.subjectName, dbBranch, session.semester);
    } else {
      await sendExamMenu(from);
    }
    return;
  }

  // ══════════════════════════════════════════════
  //   Regular Exam Flow
  // ══════════════════════════════════════════════

  // ── Exam selection: exam_{examId} ──
  if (id.startsWith("exam_")) {
    const examId = id.replace("exam_", "");
    // JEE Mains, JEE Advanced, NEET — skip subject, go directly to year
    if (["jee-mains", "jee-advanced", "neet"].includes(examId)) {
      sessionStore.set(from, { step: "awaiting_year", examId, examName: title, subject: null });
      await sendYearMenu(from, examId, null);
      return;
    }
    sessionStore.set(from, { step: "awaiting_subject", examId, examName: title });
    await sendSubjectMenu(from, examId);
    return;
  }

  // ── Subject selection: subj_{examId}_{subject} ──
  if (id.startsWith("subj_")) {
    const parts = id.replace("subj_", "").split("_");
    const examId = parts[0] + (parts[1] && isNaN(parts[1]) ? `-${parts[1]}` : "");
    // Re-extract from session if available
    const session = sessionStore.get(from);
    const resolvedExamId = session?.examId || examId;
    const subject = title; // Use the display title which is the clean subject name

    sessionStore.update(from, { step: "awaiting_year", subject });
    await sendYearMenu(from, resolvedExamId, subject);
    return;
  }

  // ── Year selection: year_{examId}_{subject}_{year} ──
  if (id.startsWith("year_")) {
    const session = sessionStore.get(from);
    const year = parseInt(title, 10);

    if (session?.examId && year) {
      const exam = EXAMS.find((e) => e.id === session.examId);
      await handlePyqRequest(from, session.examId, exam?.name || session.examName, session.subject || null, year);
      sessionStore.clear(from);
    } else {
      await wa.sendText(from, "I lost track of our conversation. Let's start over:");
      await sendExamMenu(from);
    }
    return;
  }

  // ── Action buttons ──
  if (id === "action_menu") {
    sessionStore.clear(from);
    await sendExamMenu(from);
    return;
  }

  if (id.startsWith("action_analyze_")) {
    const session = sessionStore.get(from);
    if (session?.examId && session.examId !== "rtu") {
      const exam = EXAMS.find((e) => e.id === session.examId);
      await handleAnalysis(from, exam?.name || "Exam", session.subject, session.year, "general");
    } else {
      await wa.sendText(from, "Which exam would you like me to analyze? Type something like:\n\n*\"Analyze NEET Biology\"*");
    }
    return;
  }

  if (id.startsWith("action_topics_") || id.startsWith("action_chapters_")) {
    const session = sessionStore.get(from);
    if (session?.examId && session.examId !== "rtu") {
      const exam = EXAMS.find((e) => e.id === session.examId);
      await handleAnalysis(from, exam?.name || "Exam", session.subject, null, "important_chapters");
    } else {
      await wa.sendText(from, "Type something like: *\"Important chapters for JEE Physics\"*");
    }
    return;
  }

  if (id.startsWith("action_repeat_")) {
    const session = sessionStore.get(from);
    if (session?.examId && session.examId !== "rtu") {
      const exam = EXAMS.find((e) => e.id === session.examId);
      await handleAnalysis(from, exam?.name || "Exam", session.subject, null, "repeated_topics");
    } else {
      await wa.sendText(from, "Type something like: *\"NEET Biology repeated topics\"*");
    }
    return;
  }

  // ── Study chat "Ask Another Doubt" button ──
  if (id === "study_more") {
    await wa.sendText(from, "Go ahead! Type your question or use a command like:\n\n💡 */explain* electromagnetic induction\n✏️ */solve* find the derivative of x³+2x");
    return;
  }

  // Fallback
  await wa.sendText(from, "I didn't understand that selection. Type *menu* to see options.");
}

module.exports = { handleMessage };
