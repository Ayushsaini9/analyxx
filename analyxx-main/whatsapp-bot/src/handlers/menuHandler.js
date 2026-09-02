/**
 * ANALYXX WhatsApp Bot — Menu Handler
 *
 * Sends interactive menus for exam selection, subject selection, year selection,
 * and the full RTU navigation flow (branch → year → subject → calendar year).
 */

const { createClient } = require("@supabase/supabase-js");
const axios = require("axios");
const fs = require("fs");
const path = require("path");
const config = require("../config");
const wa = require("../whatsapp");
const logger = require("../logger");
const { EXAMS, RTU_BRANCHES, RTU_YEARS, RTU_CALENDAR_YEARS, getRtuSubjects } = require("../examData");

const supabase = createClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_KEY);

/**
 * Send the main exam selection menu.
 * Includes all regular exams + RTU as a university entry.
 */
async function sendExamMenu(to) {
  const rows = [
    // RTU at the top
    {
      id: "exam_rtu",
      title: "RTU",
      description: "Rajasthan Technical University PYQs",
    },
    // Regular exams
    ...EXAMS.map((exam) => {
      const skipSubject = ["jee-mains", "jee-advanced", "neet"].includes(exam.id);
      return {
        id: `exam_${exam.id}`,
        title: exam.name,
        description: skipSubject ? "Select year to get paper" : `${exam.subjects.length} subjects available`,
      };
    }),
  ];

  await wa.sendList(
    to,
    "Welcome to *ANALYXX AI*\n\nSelect an exam to browse PYQ papers, get AI predictions, and topic analysis.",
    "Choose Exam",
    [{ title: "Available Exams", rows }],
    "ANALYXX PYQ Library",
    "Powered by ANALYXX AI"
  );
}

/**
 * Send RTU branch selection menu.
 */
async function sendRtuBranchMenu(to) {
  const rows = RTU_BRANCHES.map((branch) => ({
    id: `rtu_branch_${branch.id}`,
    title: branch.shortName,
    description: branch.name,
  }));

  await wa.sendList(
    to,
    "*RTU — Rajasthan Technical University*\n\nSelect your branch:",
    "Choose Branch",
    [{ title: "Engineering Branches", rows }],
    "RTU PYQ Library",
    "Type 'menu' to go back"
  );
}

/**
 * Send RTU year selection menu (1st/2nd/3rd/4th year).
 */
async function sendRtuYearMenu(to, branchName) {
  const rows = RTU_YEARS.map((year) => ({
    id: `rtu_year_${year.id}`,
    title: year.name,
    description: `${branchName} — Year ${year.label}`,
  }));

  await wa.sendList(
    to,
    `*RTU — ${branchName}*\n\nSelect your year:`,
    "Choose Year",
    [{ title: "Academic Years", rows }],
    null,
    "Type 'menu' to go back"
  );
}

/**
 * Send RTU subject selection menu for a given branch + year.
 * Subjects are grouped by semester.
 */
async function sendRtuSubjectMenu(to, branchId, branchYearId, branchName) {
  const subjectGroups = getRtuSubjects(branchId, branchYearId);

  if (!subjectGroups || subjectGroups.length === 0) {
    await wa.sendText(to, `No subjects available yet for *${branchName}* — *${branchYearId.replace("-", " ")}*.\n\nType *menu* to browse other options.`);
    return;
  }

  const filledGroups = subjectGroups.filter((g) => g.subjects.length > 0);
  if (filledGroups.length === 0) {
    await wa.sendText(to, `No subjects available yet for *${branchName}* — *${branchYearId.replace("-", " ")}*.\n\nType *menu* to browse other options.`);
    return;
  }

  const yearLabel = RTU_YEARS.find((y) => y.id === branchYearId)?.name || branchYearId;
  const totalSubjects = filledGroups.reduce((sum, g) => sum + g.subjects.length, 0);

  // WhatsApp list has a hard limit of 10 total rows across all sections.
  // If total subjects fit in 10, send a single list. Otherwise, send one list per semester.
  if (totalSubjects <= 10) {
    const sections = filledGroups.map((group) => ({
      title: group.semester,
      rows: group.subjects.map((subj) => ({
        id: `rtu_subj_${subj.id}`,
        title: subj.name.length > 24 ? subj.name.substring(0, 22) + ".." : subj.name,
        description: group.semester,
      })),
    }));

    await wa.sendList(
      to,
      `*RTU — ${branchName} — ${yearLabel}*\n\nSelect a subject to view papers:`,
      "Choose Subject",
      sections,
      null,
      "Type 'menu' to go back"
    );
  } else {
    // Send one list per semester to stay within the 10-row limit
    for (const group of filledGroups) {
      // If a single semester has >10 subjects, split into chunks of 10
      const chunks = [];
      for (let i = 0; i < group.subjects.length; i += 10) {
        chunks.push(group.subjects.slice(i, i + 10));
      }

      for (let ci = 0; ci < chunks.length; ci++) {
        const chunk = chunks[ci];
        const chunkLabel = chunks.length > 1 ? ` (${ci + 1}/${chunks.length})` : "";
        const rows = chunk.map((subj) => ({
          id: `rtu_subj_${subj.id}`,
          title: subj.name.length > 24 ? subj.name.substring(0, 22) + ".." : subj.name,
          description: group.semester,
        }));

        await wa.sendList(
          to,
          `*RTU — ${branchName} — ${yearLabel}*\n*${group.semester}${chunkLabel}*\n\nSelect a subject:`,
          "Choose Subject",
          [{ title: group.semester, rows }],
          null,
          "Type 'menu' to go back"
        );
      }
    }
  }
}

/**
 * Send RTU calendar year selection — only years available in the database.
 * Accepts optional branchId and semester to narrow the lookup.
 */
async function sendRtuCalendarYearMenu(to, subjectName, branchId, semester) {
  try {
    // Query the database for distinct years that have papers for this subject
    let query = supabase
      .from("library_papers")
      .select("year")
      .ilike("exam", "rtu%")
      .ilike("subject", subjectName);

    if (branchId) {
      query = query.ilike("branch", branchId);
    }
    // 1st-year papers are stored with semester=NULL in the DB,
    // so skip the semester filter for 1st-year to avoid zero results.
    if (semester && branchId !== "1st-year") {
      query = query.eq("semester", semester);
    }

    const { data: papers, error } = await query;

    if (error) {
      logger.error("Failed to fetch RTU years from DB", { error });
      // Fall back to hardcoded years
      const fallbackYears = RTU_CALENDAR_YEARS.slice(0, 10);
      const rows = fallbackYears.map((year) => ({
        id: `rtu_calyear_${year}`,
        title: `${year}`,
        description: `${subjectName} — ${year}`,
      }));
      await wa.sendList(
        to,
        `*${subjectName}*\n\nSelect a year to get the paper:`,
        "Choose Year",
        [{ title: "Available Years", rows }],
        null,
        "Type 'menu' to go back"
      );
      return;
    }

    // Extract unique years and sort descending
    const availableYears = [...new Set(papers.map((p) => p.year))]
      .sort((a, b) => b - a)
      .slice(0, 10); // WhatsApp list max 10 rows

    if (availableYears.length === 0) {
      // DB has no results — fall back to listing files directly from Cloudflare R2
      const BRANCH_TO_FOLDER = {
        cs: "rtu-csit",
        it: "rtu-csit",
        mechanical: "rtu-me",
        civil: "rtu-ce",
        electrical: "rtu-eeec",
        electronics: "rtu-eeec",
        ece: "rtu-eeec",
        "1st-year": "rtu-1styear",
      };

      const folderPrefix = BRANCH_TO_FOLDER[branchId?.toLowerCase()] || `rtu-${branchId}`;
      const foldersToScan = [];
      if (semester) {
        foldersToScan.push(`${folderPrefix}/Sem ${semester}`);
      } else {
        const maxSem = branchId === "1st-year" ? 2 : 8;
        for (let s = 1; s <= maxSem; s++) {
          foldersToScan.push(`${folderPrefix}/Sem ${s}`);
        }
      }

      let storageYears = [];
      for (const folder of foldersToScan) {
        try {
          const response = await axios.get(`${config.BACKEND_URL}/api/v1/library/list-papers`, {
            params: { folder }
          });
          const files = response.data;

          if (files && files.length > 0) {
            const normalizedSubject = subjectName.toLowerCase().replace(/[-_&]/g, " ").replace(/\s+/g, " ").trim();
            for (const file of files) {
              const nameWithoutExt = file.name.replace(/\.pdf$/i, "");
              const yearMatch = nameWithoutExt.match(/(\d{4})$/);
              if (!yearMatch) continue;
              const year = parseInt(yearMatch[1], 10);

              const nameClean = nameWithoutExt.replace(/\s+\d{4}$/, "").toLowerCase().replace(/[-_&]/g, " ").replace(/\s+/g, " ").trim();

              if (nameClean.includes(normalizedSubject) || normalizedSubject.includes(nameClean)) {
                storageYears.push(year);
              }
            }
          }
        } catch (storageErr) {
          logger.debug("Storage listing fallback failed, trying local manifest", { folder, error: storageErr.message });
          try {
            const manifestPath = path.join(__dirname, "../r2_paper_manifest.json");
            if (fs.existsSync(manifestPath)) {
              const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
              const fileList = manifest[folder] || [];
              const files = fileList.map((name) => ({ name }));

              if (files && files.length > 0) {
                const normalizedSubject = subjectName.toLowerCase().replace(/[-_&]/g, " ").replace(/\s+/g, " ").trim();
                for (const file of files) {
                  const nameWithoutExt = file.name.replace(/\.pdf$/i, "");
                  const yearMatch = nameWithoutExt.match(/(\d{4})$/);
                  if (!yearMatch) continue;
                  const year = parseInt(yearMatch[1], 10);

                  const nameClean = nameWithoutExt.replace(/\s+\d{4}$/, "").toLowerCase().replace(/[-_&]/g, " ").replace(/\s+/g, " ").trim();

                  if (nameClean.includes(normalizedSubject) || normalizedSubject.includes(nameClean)) {
                    storageYears.push(year);
                  }
                }
              }
            }
          } catch (manifestErr) {
            logger.debug("Local manifest fallback failed", { error: manifestErr.message });
          }
        }
      }

      storageYears = [...new Set(storageYears)].sort((a, b) => b - a).slice(0, 10);

      if (storageYears.length > 0) {
        logger.info(`Found ${storageYears.length} years from storage for RTU ${subjectName}`);
        const rows = storageYears.map((year) => ({
          id: `rtu_calyear_${year}`,
          title: `${year}`,
          description: `${subjectName} — ${year}`,
        }));
        await wa.sendList(
          to,
          `*${subjectName}*\n\nSelect a year to get the paper:`,
          "Choose Year",
          [{ title: "Available Years", rows }],
          null,
          "Type 'menu' to go back"
        );
        return;
      }

      await wa.sendText(
        to,
        `No papers available yet for *${subjectName}* in our library.\n\nType *menu* to browse other options.`
      );
      return;
    }

    const rows = availableYears.map((year) => ({
      id: `rtu_calyear_${year}`,
      title: `${year}`,
      description: `${subjectName} — ${year}`,
    }));

    await wa.sendList(
      to,
      `*${subjectName}*\n\nSelect a year to get the paper:`,
      "Choose Year",
      [{ title: "Available Years", rows }],
      null,
      "Type 'menu' to go back"
    );
  } catch (err) {
    logger.error("sendRtuCalendarYearMenu error", { error: err.message });
    await wa.sendText(to, "Something went wrong. Please try again or type *menu*.");
  }
}

// ── Regular (non-RTU) menus ──

/**
 * Send subject selection menu for a given exam.
 */
async function sendSubjectMenu(to, examId) {
  const exam = EXAMS.find((e) => e.id === examId);
  if (!exam) {
    await wa.sendText(to, "Sorry, I couldn't find that exam. Type *menu* to see available exams.");
    return;
  }

  const allRows = exam.subjects.map((subj) => ({
    id: `subj_${examId}_${subj.replace(/\s+/g, "_")}`,
    title: subj.length > 24 ? subj.substring(0, 22) + ".." : subj,
  }));

  // WhatsApp hard limit: 10 total rows across all sections in a single list message.
  // If subjects fit in 10, send one list. Otherwise, send multiple lists.
  if (allRows.length <= 10) {
    await wa.sendList(
      to,
      `*${exam.name}*\n\nSelect a subject to view available papers:`,
      "Choose Subject",
      [{ title: `${exam.name} Subjects`, rows: allRows }],
      null,
      "Type 'menu' to go back"
    );
  } else {
    const chunks = [];
    for (let i = 0; i < allRows.length; i += 10) {
      chunks.push(allRows.slice(i, i + 10));
    }
    for (let ci = 0; ci < chunks.length; ci++) {
      const label = chunks.length > 1 ? ` (${ci + 1}/${chunks.length})` : "";
      await wa.sendList(
        to,
        `*${exam.name}*${label}\n\nSelect a subject to view available papers:`,
        "Choose Subject",
        [{ title: `${exam.name} Subjects`, rows: chunks[ci] }],
        null,
        "Type 'menu' to go back"
      );
    }
  }
}

/**
 * Send year selection menu for a given exam + subject.
 * Queries the database to show only years with papers available.
 */
async function sendYearMenu(to, examId, subject) {
  const exam = EXAMS.find((e) => e.id === examId);
  if (!exam) {
    await wa.sendText(to, "Exam not found. Type *menu* to start over.");
    return;
  }

  const headerText = subject ? `*${exam.name} — ${subject}*` : `*${exam.name}*`;

  try {
    // Query the database for distinct years that have papers for this exam + subject
    let query = supabase
      .from("library_papers")
      .select("year")
      .ilike("exam", examId);

    if (subject) {
      query = query.ilike("subject", subject);
    }

    const { data: papers, error } = await query;

    let yearsToShow;

    if (error || !papers || papers.length === 0) {
      if (error) {
        logger.error("Failed to fetch years from DB", { error, examId, subject });
      }

      // DB has no results — try listing files directly from Supabase Storage
      // For exams like JEE Mains/Advanced with descriptive filenames (e.g. 2024_jan_27jan_shift1.pdf)
      const storageFolder = `${examId}/${subject || "Paper"}`;
      try {
        const response = await axios.get(`${config.BACKEND_URL}/api/v1/library/list-papers`, {
          params: { folder: storageFolder }
        });
        const files = response.data;

        if (files && files.length > 0) {
          // Extract years from filenames (e.g. "2024_jan_27jan_shift1.pdf" → 2024)
          const yearSet = new Set();
          for (const file of files) {
            const yearMatch = file.name.match(/^(\d{4})/);
            if (yearMatch) yearSet.add(parseInt(yearMatch[1], 10));
          }
          if (yearSet.size > 0) {
            yearsToShow = [...yearSet].sort((a, b) => b - a);
            logger.info(`Found ${yearsToShow.length} years from storage listing for ${examId}`);
          }
        }
      } catch (storageErr) {
        logger.debug("Storage listing fallback failed", { error: storageErr.message });
      }

      // If still no results, show "no papers" or fall back to hardcoded years
      if (!yearsToShow || yearsToShow.length === 0) {
        if (!error) {
          const label = subject ? `${exam.name} — ${subject}` : exam.name;
          await wa.sendText(
            to,
            `No papers available yet for *${label}* in our library.\n\nType *menu* to browse other options.`
          );
          return;
        }
        // DB error — fall back to hardcoded years
        yearsToShow = exam.years.sort((a, b) => b - a);
      }
    } else {
      // Extract unique years and sort descending
      yearsToShow = [...new Set(papers.map((p) => p.year))].sort((a, b) => b - a);
    }

    // WhatsApp list max 10 rows
    yearsToShow = yearsToShow.slice(0, 10);

    const rows = yearsToShow.map((year) => ({
      id: `year_${examId}_${(subject || "paper").replace(/\s+/g, "_")}_${year}`,
      title: `${year}`,
      description: subject ? `${exam.name} ${subject} ${year}` : `${exam.name} ${year}`,
    }));

    await wa.sendList(
      to,
      `${headerText}\n\nSelect a year to get the paper:`,
      "Choose Year",
      [{ title: "Available Years", rows }],
      null,
      "Type 'menu' to go back"
    );
  } catch (err) {
    logger.error("sendYearMenu error", { error: err.message, examId, subject });
    await wa.sendText(to, "Something went wrong. Please try again or type *menu*.");
  }
}

/**
 * Send action buttons after a paper is found (or for analysis options).
 */
async function sendPaperActions(to, examName, subject, year) {
  await wa.sendButtons(
    to,
    `What would you like for *${examName} ${subject} ${year}*?`,
    [
      { id: `action_pyq_${year}`, title: "Get Paper PDF" },
      { id: `action_analyze_${year}`, title: "AI Analysis" },
      { id: `action_topics_${year}`, title: "Key Topics" },
    ],
    null,
    "ANALYXX AI"
  );
}

module.exports = {
  sendExamMenu,
  sendRtuBranchMenu,
  sendRtuYearMenu,
  sendRtuSubjectMenu,
  sendRtuCalendarYearMenu,
  sendSubjectMenu,
  sendYearMenu,
  sendPaperActions,
};
