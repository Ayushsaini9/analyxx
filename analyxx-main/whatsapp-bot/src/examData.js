/**
 * ANALYXX WhatsApp Bot — Exam & Subject Data
 *
 * Mirrors the EXAMS / RTU data from frontend/app/library/page.tsx.
 * Storage path patterns:
 *   Regular exams:  library-papers/{examId}/{Subject}/{year}.pdf
 *   RTU 1st year:   library-papers/rtu-1st-year/{Subject}/{year}.pdf
 *   RTU 2–4th year: library-papers/rtu/{branch}/sem-{n}/{Subject}/{year}.pdf
 */

// ── Regular (non-university) exams ──
const EXAMS = [
  {
    id: "jee-mains",
    name: "JEE Mains",
    aliases: ["jee mains", "jee main", "jee-mains"],
    subjects: ["Mathematics", "Physics", "Chemistry"],
    years: [2020, 2021, 2022, 2023, 2024, 2025, 2026],
  },
  {
    id: "jee-advanced",
    name: "JEE Advanced",
    aliases: ["jee advanced", "jee adv", "jee-advanced", "jee"],
    subjects: ["Mathematics", "Physics", "Chemistry"],
    years: [2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026],
  },
  {
    id: "upsc-cse",
    name: "UPSC CSE",
    aliases: ["upsc", "upsc cse", "ias", "civil services"],
    subjects: ["General Studies", "Indian Polity", "Indian Economy", "Indian History", "Geography", "Science & Technology", "Environment"],
    years: [2020, 2021, 2022, 2023, 2024, 2025, 2026],
  },
  {
    id: "neet",
    name: "NEET",
    aliases: ["neet", "neet ug"],
    subjects: ["Physics", "Chemistry", "Biology"],
    years: [2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026],
  },
  {
    id: "cat",
    name: "CAT",
    aliases: ["cat", "iim cat"],
    subjects: ["Quantitative Aptitude", "Data Interpretation", "Verbal Ability", "Logical Reasoning"],
    years: [2020, 2021, 2022, 2023, 2024, 2025, 2026],
  },
  {
    id: "gate",
    name: "GATE",
    aliases: ["gate"],
    subjects: ["Computer Science", "Electronics", "Mechanical", "Electrical", "Civil"],
    years: [2020, 2021, 2022, 2023, 2024, 2025, 2026],
  },
  {
    id: "cbse-10",
    name: "10th CBSE Board",
    aliases: ["10th", "class 10", "cbse 10", "10th cbse", "10th board", "class10", "cbse-10"],
    subjects: [
      "English", "Mathematics Basic", "Mathematics Standard", "Science",
      "Social Studies", "Hindi", "Computer Application", "French",
      "Japanese", "Design Thinking", "Data Science", "Information Technology", "Sanskrit",
    ],
    years: [2020, 2021, 2022, 2023, 2024, 2025, 2026],
  },
  {
    id: "cbse-12",
    name: "12th CBSE Board",
    aliases: ["12th", "class 12", "cbse 12", "12th cbse", "12th board", "class12", "cbse-12"],
    subjects: [
      "Physics", "Chemistry", "Biology", "Mathematics", "Accountancy",
      "Entrepreneurship", "Business Studies", "Economics", "English",
      "Physical Education", "Psychology", "Data Science", "French",
      "Design Thinking", "Political Science", "Web Application",
    ],
    years: [2020, 2021, 2022, 2023, 2024, 2025, 2026],
  },
];

// ── RTU Data ──

const RTU_BRANCHES = [
  { id: "civil", name: "Civil Engineering", shortName: "Civil", aliases: ["civil", "civil engineering", "ce"] },
  { id: "mechanical", name: "Mechanical Engineering", shortName: "Mechanical", aliases: ["mechanical", "mech", "mechanical engineering", "me"] },
  { id: "it", name: "Information Technology", shortName: "IT", aliases: ["it", "information technology"] },
  { id: "cs", name: "Computer Science", shortName: "CS", aliases: ["cs", "cse", "computer science", "computer"] },
  { id: "electrical", name: "Electrical Engineering", shortName: "Electrical", aliases: ["electrical", "electrical engineering", "ee"] },
  { id: "electronics", name: "Electronics Engineering", shortName: "Electronics", aliases: ["electronics", "electronics engineering", "ece", "ec"] },
];

const RTU_YEARS = [
  { id: "1st-year", name: "1st Year", label: "I" },
  { id: "2nd-year", name: "2nd Year", label: "II" },
  { id: "3rd-year", name: "3rd Year", label: "III" },
  { id: "4th-year", name: "4th Year", label: "IV" },
];

const RTU_FIRST_YEAR_SUBJECTS = [
  {
    semester: "Semester 1",
    subjects: [
      { id: "em1", name: "Engineering Mathematics-I" },
      { id: "ep1", name: "Engineering Physics" },
      { id: "ec1", name: "Engineering Chemistry" },
      { id: "cs1", name: "Communication Skills" },
      { id: "hv1", name: "Human Values" },
      { id: "pps1", name: "Programming for Problem Solving" },
      { id: "bme1", name: "Basic Mechanical Engineering" },
      { id: "bee1", name: "Basic Electrical Engineering" },
      { id: "bce1", name: "Basic Civil Engineering" },
    ],
  },
  {
    semester: "Semester 2",
    subjects: [
      { id: "em2", name: "Engineering Mathematics-II" },
      { id: "ep2", name: "Engineering Physics" },
      { id: "ec2", name: "Engineering Chemistry" },
      { id: "cs2", name: "Communication Skills" },
      { id: "hv2", name: "Human Values" },
      { id: "pps2", name: "Programming for Problem Solving" },
      { id: "bme2", name: "Basic Mechanical Engineering" },
      { id: "bee2", name: "Basic Electrical Engineering" },
      { id: "bce2", name: "Basic Civil Engineering" },
    ],
  },
];

const RTU_IT_SECOND_YEAR_SUBJECTS = [
  {
    semester: "Semester 3",
    subjects: [
      { id: "aem3", name: "Advanced Engineering Mathematics-I" },
      { id: "tc3", name: "Technical Communication" },
      { id: "mefa3", name: "Managerial Economics & Financial Accounting" },
      { id: "de3", name: "Digital Electronics" },
      { id: "dsa3", name: "Data Structures and Algorithms" },
      { id: "oops3", name: "Object Oriented Programming" },
      { id: "se3", name: "Software Engineering" },
      { id: "dms3", name: "Discrete Mathematical Structures" },
      { id: "mmc3", name: "Microprocessor and Microcontroller" },
      { id: "gs3", name: "General Studies" },
    ],
  },
  {
    semester: "Semester 4",
    subjects: [
      { id: "dms4", name: "Discrete Mathematical Structures" },
      { id: "tc4", name: "Technical Communication" },
      { id: "mefa4", name: "Managerial Economics & Financial Accounting" },
      { id: "poc4", name: "Principles of Communication" },
      { id: "dbms4", name: "Database Management System" },
      { id: "toc4", name: "Theory of Computation" },
      { id: "dccn4", name: "Data Communication and Computer Networks" },
      { id: "mpi4", name: "Microprocessor and Interfaces" },
      { id: "dm4", name: "Disaster Management" },
      { id: "java4", name: "Introduction to Java Programming" },
      { id: "python4", name: "Introduction to Python Programming" },
      { id: "st4", name: "Software Testing" },
    ],
  },
];

const RTU_IT_THIRD_YEAR_SUBJECTS = [
  {
    semester: "Semester 5",
    subjects: [
      { id: "aoa5", name: "Analysis of Algorithms" },
      { id: "cd5", name: "Compiler Design" },
      { id: "os5", name: "Operating System" },
      { id: "cgm5", name: "Computer Graphics and Multimedia" },
      { id: "dmct5", name: "Data Mining Concepts and Techniques" },
      { id: "dfir5", name: "Digital Forensics and Incident Response" },
      { id: "fbc5", name: "Fundamentals of Blockchain" },
      { id: "itc5", name: "Information Theory and Coding" },
    ],
  },
  {
    semester: "Semester 6",
    subjects: [
      { id: "dip6", name: "Digital Image Processing" },
      { id: "ml6", name: "Machine Learning" },
      { id: "iss6", name: "Information Security Systems" },
      { id: "cao6", name: "Computer Architecture and Organization" },
      { id: "ai6", name: "Artificial Intelligence" },
      { id: "ds6", name: "Distributed System" },
      { id: "cc6", name: "Cloud Computing" },
      { id: "ece6", name: "E-Commerce and ERP" },
      { id: "aids6", name: "Artificial Intelligence and Data Science" },
      { id: "bcs6", name: "Blockchain and Cyber Security" },
      { id: "cf6", name: "Cyber Forensics" },
      { id: "nlp6", name: "Natural Language Processing" },
    ],
  },
];

const RTU_IT_FOURTH_YEAR_SUBJECTS = [
  {
    semester: "Semester 7",
    subjects: [
      { id: "bda7", name: "Big Data Analytics" },
      { id: "iot7", name: "Internet of Things" },
      { id: "qm7", name: "Quality Management" },
    ],
  },
  {
    semester: "Semester 8",
    subjects: [
      { id: "bda8", name: "Big Data Analytics" },
      { id: "iot8", name: "Internet of Things" },
      { id: "dm8", name: "Disaster Management" },
    ],
  },
];

const RTU_CE_2ND_YEAR_SUBJECTS = [
  {
    semester: "Semester 3",
    subjects: [
      { id: "ce_aem3", name: "Advanced Engineering Mathematics-I" },
      { id: "ce_tc3", name: "Technical Communication" },
      { id: "ce_mefa3", name: "Managerial Economics & Financial Accounting" },
      { id: "ce_bmc3", name: "Building Materials and Construction" },
      { id: "ce_em3", name: "Engineering Mechanics" },
      { id: "ce_fm3", name: "Fluid Mechanics" },
      { id: "ce_sur3", name: "Surveying" },
      { id: "ce_eg3", name: "Engineering Geology" },
      { id: "ce_adbc3", name: "Architecture Drawing and Building Construction" },
    ],
  },
  {
    semester: "Semester 4",
    subjects: [
      { id: "ce_aem4", name: "Advanced Engineering Mathematics-II" },
      { id: "ce_tc4", name: "Technical Communication" },
      { id: "ce_mefa4", name: "Managerial Economics & Financial Accounting" },
      { id: "ce_he4", name: "Hydraulics Engineering" },
      { id: "ce_som4", name: "Strength of Materials" },
      { id: "ce_be4", name: "Basic Electronics for Civil Engineering Applications" },
      { id: "ce_ge4", name: "Geotechnical Engineering-I" },
      { id: "ce_dm4", name: "Disaster Management" },
    ],
  },
];

const RTU_CE_3RD_YEAR_SUBJECTS = [
  {
    semester: "Semester 5",
    subjects: [
      { id: "ce_ic5", name: "Indian Constitution" },
      { id: "ce_anpc5", name: "Air and Noise Pollution and Control" },
      { id: "ce_cte5", name: "Construction Technology and Equipments" },
      { id: "ce_dcs5", name: "Design of Concrete Structures" },
      { id: "ce_ge5", name: "Geotechnical Engineering" },
      { id: "ce_sa5", name: "Structural Analysis-I" },
      { id: "ce_wre5", name: "Water Resource Engineering" },
    ],
  },
  {
    semester: "Semester 6",
    subjects: [
      { id: "ce_dss6", name: "Design of Steel Structures" },
      { id: "ce_ee6", name: "Environmental Engineering" },
      { id: "ce_ec6", name: "Estimating and Costing" },
      { id: "ce_gis6", name: "Geographic Information System and Remote Sensing" },
      { id: "ce_shwm6", name: "Solid and Hazardous Waste Management" },
      { id: "ce_dhs6", name: "Design of Hydraulic Structures" },
      { id: "ce_sa6", name: "Structural Analysis-II" },
      { id: "ce_wsa6", name: "Wind and Seismic Analysis" },
    ],
  },
];

const RTU_CE_4TH_YEAR_SUBJECTS = [
  {
    semester: "Semester 7",
    subjects: [
      { id: "ce_te7", name: "Transportation Engineering" },
    ],
  },
  {
    semester: "Semester 8",
    subjects: [
      { id: "ce_dm8", name: "Disaster Management" },
    ],
  },
];

const RTU_ME_2ND_YEAR_SUBJECTS = [
  {
    semester: "Semester 3",
    subjects: [
      { id: "me_aem3", name: "Advanced Engineering Mathematics-I" },
      { id: "me_tc3", name: "Technical Communication" },
      { id: "me_mefa3", name: "Managerial Economics & Financial Accounting" },
      { id: "me_em3", name: "Engineering Mechanics" },
      { id: "me_mp3", name: "Manufacturing Processes" },
      { id: "me_aet3", name: "Aero Engineering Thermodynamics" },
      { id: "me_eoa3", name: "Elements of Aeronautics" },
      { id: "me_fmtm3", name: "Fluid Mechanics and Turbo Machines" },
    ],
  },
  {
    semester: "Semester 4",
    subjects: [
      { id: "me_tc4", name: "Technical Communication" },
      { id: "me_mefa4", name: "Managerial Economics & Financial Accounting" },
      { id: "me_dm4", name: "Disaster Management" },
      { id: "me_de4", name: "Digital Electronics" },
      { id: "me_fmfm4", name: "Fluid Mechanics and Fluid Machines" },
      { id: "me_am4", name: "Aerospace Materials" },
      { id: "me_da4", name: "Data Analytics" },
    ],
  },
];

const RTU_ME_3RD_YEAR_SUBJECTS = [
  {
    semester: "Semester 5",
    subjects: [
      { id: "me_ic5", name: "Indian Constitution" },
      { id: "me_ms5", name: "Mechatronic Systems" },
    ],
  },
  {
    semester: "Semester 6",
    subjects: [
      { id: "me_cims6", name: "Computer Integrated Manufacturing Systems" },
      { id: "me_dme6", name: "Design of Machine Elements-II" },
      { id: "me_mv6", name: "Mechanical Vibrations" },
      { id: "me_qm6", name: "Quality Management" },
      { id: "me_rac6", name: "Refrigeration and Air Conditioning" },
      { id: "me_mm6", name: "Measurement and Metrology" },
    ],
  },
];

const RTU_ME_4TH_YEAR_SUBJECTS = [
  {
    semester: "Semester 7",
    subjects: [],
  },
  {
    semester: "Semester 8",
    subjects: [
      { id: "me_dm8", name: "Disaster Management" },
      { id: "me_som8", name: "Supply and Operations Management" },
    ],
  },
];

const RTU_EE_EC_2ND_YEAR_SUBJECTS = [
  {
    semester: "Semester 3",
    subjects: [
      { id: "ee_aem3", name: "Advanced Engineering Mathematics-I" },
      { id: "ee_tc3", name: "Technical Communication" },
      { id: "ee_mefa3", name: "Managerial Economics & Financial Accounting" },
      { id: "ee_ae3", name: "Analog Electronics" },
      { id: "ee_dsd3", name: "Digital System Design" },
      { id: "ee_eca3", name: "Electrical Circuit Analysis" },
      { id: "ee_em3", name: "Electrical Machines-I" },
      { id: "ee_emf3", name: "Electromagnetic Fields" },
      { id: "ee_ed3", name: "Electronic Devices" },
      { id: "ee_nt3", name: "Network Theory" },
    ],
  },
  {
    semester: "Semester 4",
    subjects: [
      { id: "ee_aem4", name: "Advanced Engineering Mathematics-II" },
      { id: "ee_mefa4", name: "Managerial Economics & Financial Accounting" },
      { id: "ee_ac4", name: "Analog Circuits" },
      { id: "ee_de4", name: "Digital Electronics" },
      { id: "ee_em4", name: "Electrical Machines-II" },
      { id: "ee_emi4", name: "Electronic Measurement and Instrumentation" },
      { id: "ee_pe4", name: "Power Electronics" },
      { id: "ee_ss4", name: "Signal and Systems" },
      { id: "ee_adc4", name: "Analog and Digital Communication" },
      { id: "ee_mc4", name: "Microcontroller" },
    ],
  },
];

const RTU_EE_EC_3RD_YEAR_SUBJECTS = [
  {
    semester: "Semester 5",
    subjects: [
      { id: "ee_emd5", name: "Electrical Machine Design" },
      { id: "ee_pgs5", name: "Power Generation Sources" },
      { id: "ee_ps5", name: "Power System-I" },
      { id: "ee_ca5", name: "Computer Architecture" },
      { id: "ee_cs5", name: "Control System" },
      { id: "ee_dsp5", name: "Digital Signal Processing" },
      { id: "ee_emat5", name: "Electrical Materials" },
      { id: "ee_ewaves5", name: "Electromagnetic Waves" },
      { id: "ee_mp5", name: "Microprocessor" },
      { id: "ee_mwt5", name: "Microwave Theory and Techniques" },
    ],
  },
  {
    semester: "Semester 6",
    subjects: [
      { id: "ee_ed6", name: "Electric Drives" },
      { id: "ee_eeca6", name: "Electrical Energy Conversion and Auditing" },
      { id: "ee_ca6", name: "Computer Architecture" },
      { id: "ee_ps6", name: "Power System-II" },
      { id: "ee_psp6", name: "Power System Protection" },
    ],
  },
];

const RTU_EE_EC_4TH_YEAR_SUBJECTS = [
  {
    semester: "Semester 7",
    subjects: [
      { id: "ee_cmos7", name: "CMOS Design" },
      { id: "ee_pec7", name: "Principles of Electronic Communication" },
      { id: "ee_wse7", name: "Wind and Solar Energy Systems" },
    ],
  },
  {
    semester: "Semester 8",
    subjects: [
      { id: "ee_aed8", name: "Advanced Electric Drives" },
      { id: "ee_soc8", name: "Soft Computing" },
    ],
  },
];

// Calendar years available for RTU papers
const RTU_CALENDAR_YEARS = [];
for (let y = 2026; y >= 2006; y--) RTU_CALENDAR_YEARS.push(y);

/**
 * Get subject list for a given branch + branchYear combination.
 * Returns an array of { semester, subjects: [{ id, name }] }
 */
function getRtuSubjects(branchId, branchYearId) {
  if (branchYearId === "1st-year") return RTU_FIRST_YEAR_SUBJECTS;

  if (branchId === "cs" || branchId === "it") {
    if (branchYearId === "2nd-year") return RTU_IT_SECOND_YEAR_SUBJECTS;
    if (branchYearId === "3rd-year") return RTU_IT_THIRD_YEAR_SUBJECTS;
    if (branchYearId === "4th-year") return RTU_IT_FOURTH_YEAR_SUBJECTS;
  }
  if (branchId === "civil") {
    if (branchYearId === "2nd-year") return RTU_CE_2ND_YEAR_SUBJECTS;
    if (branchYearId === "3rd-year") return RTU_CE_3RD_YEAR_SUBJECTS;
    if (branchYearId === "4th-year") return RTU_CE_4TH_YEAR_SUBJECTS;
  }
  if (branchId === "mechanical") {
    if (branchYearId === "2nd-year") return RTU_ME_2ND_YEAR_SUBJECTS;
    if (branchYearId === "3rd-year") return RTU_ME_3RD_YEAR_SUBJECTS;
    if (branchYearId === "4th-year") return RTU_ME_4TH_YEAR_SUBJECTS;
  }
  if (branchId === "electrical" || branchId === "electronics") {
    if (branchYearId === "2nd-year") return RTU_EE_EC_2ND_YEAR_SUBJECTS;
    if (branchYearId === "3rd-year") return RTU_EE_EC_3RD_YEAR_SUBJECTS;
    if (branchYearId === "4th-year") return RTU_EE_EC_4TH_YEAR_SUBJECTS;
  }
  return [];
}

/**
 * Find the best matching exam from user text.
 * Returns { exam, subject, year } or null.
 */
function extractEntities(text) {
  const lower = text.toLowerCase().trim();

  // ── Check for RTU mention ──
  if (/\brtu\b/i.test(lower)) {
    // Try to match a branch
    let matchedBranch = null;
    for (const branch of RTU_BRANCHES) {
      for (const alias of branch.aliases) {
        if (lower.includes(alias)) {
          matchedBranch = branch;
          break;
        }
      }
      if (matchedBranch) break;
    }

    // Try to match year
    let matchedYear = null;
    const yearMatch = lower.match(/\b(20[0-2]\d)\b/);
    if (yearMatch) matchedYear = parseInt(yearMatch[1], 10);

    return {
      exam: { id: "rtu", name: "RTU", isUniversity: true },
      branch: matchedBranch,
      subject: null,
      year: matchedYear,
    };
  }

  // ── Match regular exam ──
  let matchedExam = null;
  let bestAliasLen = 0;

  for (const exam of EXAMS) {
    for (const alias of exam.aliases) {
      if (lower.includes(alias) && alias.length > bestAliasLen) {
        matchedExam = exam;
        bestAliasLen = alias.length;
      }
    }
  }

  // ── Match subject ──
  let matchedSubject = null;
  if (matchedExam) {
    for (const subj of matchedExam.subjects) {
      if (lower.includes(subj.toLowerCase())) {
        matchedSubject = subj;
        break;
      }
    }
    // Try partial matches
    if (!matchedSubject) {
      const SUBJECT_ALIASES = {
        polity: "Indian Polity",
        economy: "Indian Economy",
        history: "Indian History",
        geo: "Geography",
        quant: "Quantitative Aptitude",
        di: "Data Interpretation",
        verbal: "Verbal Ability",
        lr: "Logical Reasoning",
        maths: "Mathematics",
        math: "Mathematics",
        bio: "Biology",
        phy: "Physics",
        chem: "Chemistry",
        cs: "Computer Science",
        cse: "Computer Science",
        "social science": "Social Science",
        "social studies": "Social Studies",
        "comp app": "Computer Application",
        it: "Information Technology",
        "math basic": "Mathematics Basic",
        "math standard": "Mathematics Standard",
        accountancy: "Accountancy",
        "business studies": "Business Studies",
        "political science": "Political Science",
        "physical education": "Physical Education",
        "web application": "Web Application",
        entrepreneurship: "Entrepreneurship",
      };
      for (const [alias, full] of Object.entries(SUBJECT_ALIASES)) {
        if (lower.includes(alias) && matchedExam.subjects.includes(full)) {
          matchedSubject = full;
          break;
        }
      }
    }
  }

  // ── Match year ──
  let matchedYear = null;
  const yearMatch = lower.match(/\b(20[0-2]\d)\b/);
  if (yearMatch) {
    matchedYear = parseInt(yearMatch[1], 10);
  }

  if (!matchedExam) return null;

  return {
    exam: matchedExam,
    subject: matchedSubject,
    year: matchedYear,
  };
}

module.exports = {
  EXAMS,
  RTU_BRANCHES,
  RTU_YEARS,
  RTU_CALENDAR_YEARS,
  getRtuSubjects,
  extractEntities,
};
