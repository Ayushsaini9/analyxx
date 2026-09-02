"use client";
import { useState, useEffect, useRef } from "react";
import ThemeCustomizer from "../components/ThemeCustomizer";
import AskClaritySidebar from "../components/AskClaritySidebar";
import { API_BASE } from "../lib/config";

/** R2 CDN base URL for direct PDF loading (no backend proxy needed) */
const R2_CDN_URL = "https://pub-5d418c0acdfa4e9ba673215eb5998a3b.r2.dev/library-papers";
import { supabase } from "../lib/supabase";


const RTU_BRANCHES = [
  { id: "civil", name: "Civil Engineering", shortName: "Civil", icon: "CE" },
  { id: "mechanical", name: "Mechanical Engineering", shortName: "Mechanical", icon: "ME" },
  { id: "it", name: "Information Technology", shortName: "IT", icon: "IT" },
  { id: "cs", name: "Computer Science", shortName: "CS", icon: "CS" },
  { id: "electrical", name: "Electrical Engineering", shortName: "Electrical", icon: "EE" },
  { id: "electronics", name: "Electronics Engineering", shortName: "Electronics", icon: "EC" },
];

const RTU_YEARS = [
  { id: "1st-year", name: "1st Year", label: "I" },
  { id: "2nd-year", name: "2nd Year", label: "II" },
  { id: "3rd-year", name: "3rd Year", label: "III" },
  { id: "4th-year", name: "4th Year", label: "IV" },
];

const RTU_FIRST_YEAR_SUBJECTS: { semester: string; subjects: { id: string; name: string; icon: string }[] }[] = [
  {
    semester: "Semester 1",
    subjects: [
      { id: "em1", name: "Engineering Mathematics-I", icon: "" },
      { id: "ep1", name: "Engineering Physics", icon: "" },
      { id: "ec1", name: "Engineering Chemistry", icon: "" },
      { id: "cs1", name: "Communication Skills", icon: "" },
      { id: "hv1", name: "Human Values", icon: "" },
      { id: "pps1", name: "Programming for Problem Solving", icon: "" },
      { id: "bme1", name: "Basic Mechanical Engineering", icon: "" },
      { id: "bee1", name: "Basic Electrical Engineering", icon: "" },
      { id: "bce1", name: "Basic Civil Engineering", icon: "" },
    ],
  },
  {
    semester: "Semester 2",
    subjects: [
      { id: "em2", name: "Engineering Mathematics-II", icon: "" },
      { id: "ep2", name: "Engineering Physics", icon: "" },
      { id: "ec2", name: "Engineering Chemistry", icon: "" },
      { id: "cs2", name: "Communication Skills", icon: "" },
      { id: "hv2", name: "Human Values", icon: "" },
      { id: "pps2", name: "Programming for Problem Solving", icon: "" },
      { id: "bme2", name: "Basic Mechanical Engineering", icon: "" },
      { id: "bee2", name: "Basic Electrical Engineering", icon: "" },
      { id: "bce2", name: "Basic Civil Engineering", icon: "" },
    ],
  },
];

const RTU_IT_SECOND_YEAR_SUBJECTS: { semester: string; subjects: { id: string; name: string; icon: string }[] }[] = [
  {
    semester: "Semester 3",
    subjects: [
      { id: "aem3", name: "Advanced Engineering Mathematics-I", icon: "" },
      { id: "tc3", name: "Technical Communication", icon: "" },
      { id: "mefa3", name: "Managerial Economics & Financial Accounting", icon: "" },
      { id: "de3", name: "Digital Electronics", icon: "" },
      { id: "dsa3", name: "Data Structures and Algorithms", icon: "" },
      { id: "oops3", name: "Object Oriented Programming", icon: "" },
      { id: "se3", name: "Software Engineering", icon: "" },
      { id: "dms3", name: "Discrete Mathematical Structures", icon: "" },
      { id: "mmc3", name: "Microprocessor and Microcontroller", icon: "" },
      { id: "gs3", name: "General Studies", icon: "" },
    ],
  },
  {
    semester: "Semester 4",
    subjects: [
      { id: "dms4", name: "Discrete Mathematical Structures", icon: "" },
      { id: "tc4", name: "Technical Communication", icon: "" },
      { id: "mefa4", name: "Managerial Economics & Financial Accounting", icon: "" },
      { id: "poc4", name: "Principles of Communication", icon: "" },
      { id: "dbms4", name: "Database Management System", icon: "" },
      { id: "toc4", name: "Theory of Computation", icon: "" },
      { id: "dccn4", name: "Data Communication and Computer Networks", icon: "" },
      { id: "mpi4", name: "Microprocessor and Interfaces", icon: "" },
      { id: "dm4", name: "Disaster Management", icon: "" },
      { id: "java4", name: "Introduction to Java Programming", icon: "" },
      { id: "python4", name: "Introduction to Python Programming", icon: "" },
      { id: "st4", name: "Software Testing", icon: "" },
    ],
  },
];

const RTU_IT_THIRD_YEAR_SUBJECTS: { semester: string; subjects: { id: string; name: string; icon: string }[] }[] = [
  {
    semester: "Semester 5",
    subjects: [
      { id: "aoa5", name: "Analysis of Algorithms", icon: "" },
      { id: "cd5", name: "Compiler Design", icon: "" },
      { id: "os5", name: "Operating System", icon: "" },
      { id: "cgm5", name: "Computer Graphics and Multimedia", icon: "" },
      { id: "dmct5", name: "Data Mining Concepts and Techniques", icon: "" },
      { id: "dfir5", name: "Digital Forensics and Incident Response", icon: "" },
      { id: "fbc5", name: "Fundamentals of Blockchain", icon: "" },
      { id: "itc5", name: "Information Theory and Coding", icon: "" },
    ],
  },
  {
    semester: "Semester 6",
    subjects: [
      { id: "dip6", name: "Digital Image Processing", icon: "" },
      { id: "ml6", name: "Machine Learning", icon: "" },
      { id: "iss6", name: "Information Security Systems", icon: "" },
      { id: "cao6", name: "Computer Architecture and Organization", icon: "" },
      { id: "ai6", name: "Artificial Intelligence", icon: "" },
      { id: "ds6", name: "Distributed System", icon: "" },
      { id: "cc6", name: "Cloud Computing", icon: "" },
      { id: "ece6", name: "E-Commerce and ERP", icon: "" },
      { id: "aids6", name: "Artificial Intelligence and Data Science", icon: "" },
      { id: "bcs6", name: "Blockchain and Cyber Security", icon: "" },
      { id: "cf6", name: "Cyber Forensics", icon: "" },
      { id: "nlp6", name: "Natural Language Processing", icon: "" },
    ],
  },
];

const RTU_IT_FOURTH_YEAR_SUBJECTS: { semester: string; subjects: { id: string; name: string; icon: string }[] }[] = [
  {
    semester: "Semester 7",
    subjects: [
      { id: "bda7", name: "Big Data Analytics", icon: "" },
      { id: "iot7", name: "Internet of Things", icon: "" },
      { id: "qm7", name: "Quality Management", icon: "" },
    ],
  },
  {
    semester: "Semester 8",
    subjects: [
      { id: "bda8", name: "Big Data Analytics", icon: "" },
      { id: "iot8", name: "Internet of Things", icon: "" },
      { id: "dm8", name: "Disaster Management", icon: "" },
    ],
  },
];

// ── Civil Engineering subjects ──
const RTU_CE_2ND_YEAR_SUBJECTS: { semester: string; subjects: { id: string; name: string; icon: string }[] }[] = [
  {
    semester: "Semester 3",
    subjects: [
      { id: "ce_aem3", name: "Advanced Engineering Mathematics-I", icon: "" },
      { id: "ce_tc3", name: "Technical Communication", icon: "" },
      { id: "ce_mefa3", name: "Managerial Economics & Financial Accounting", icon: "" },
      { id: "ce_bmc3", name: "Building Materials and Construction", icon: "" },
      { id: "ce_em3", name: "Engineering Mechanics", icon: "" },
      { id: "ce_fm3", name: "Fluid Mechanics", icon: "" },
      { id: "ce_sur3", name: "Surveying", icon: "" },
      { id: "ce_eg3", name: "Engineering Geology", icon: "" },
      { id: "ce_adbc3", name: "Architecture Drawing and Building Construction", icon: "" },
    ],
  },
  {
    semester: "Semester 4",
    subjects: [
      { id: "ce_aem4", name: "Advanced Engineering Mathematics-II", icon: "" },
      { id: "ce_tc4", name: "Technical Communication", icon: "" },
      { id: "ce_mefa4", name: "Managerial Economics & Financial Accounting", icon: "" },
      { id: "ce_he4", name: "Hydraulics Engineering", icon: "" },
      { id: "ce_som4", name: "Strength of Materials", icon: "" },
      { id: "ce_be4", name: "Basic Electronics for Civil Engineering Applications", icon: "" },
      { id: "ce_ge4", name: "Geotechnical Engineering-I", icon: "" },
      { id: "ce_dm4", name: "Disaster Management", icon: "" },
    ],
  },
];

const RTU_CE_3RD_YEAR_SUBJECTS: { semester: string; subjects: { id: string; name: string; icon: string }[] }[] = [
  {
    semester: "Semester 5",
    subjects: [
      { id: "ce_ic5", name: "Indian Constitution", icon: "" },
      { id: "ce_anpc5", name: "Air and Noise Pollution and Control", icon: "" },
      { id: "ce_cte5", name: "Construction Technology and Equipments", icon: "" },
      { id: "ce_dcs5", name: "Design of Concrete Structures", icon: "" },
      { id: "ce_ge5", name: "Geotechnical Engineering", icon: "" },
      { id: "ce_sa5", name: "Structural Analysis-I", icon: "" },
      { id: "ce_wre5", name: "Water Resource Engineering", icon: "" },
    ],
  },
  {
    semester: "Semester 6",
    subjects: [
      { id: "ce_dss6", name: "Design of Steel Structures", icon: "" },
      { id: "ce_ee6", name: "Environmental Engineering", icon: "" },
      { id: "ce_ec6", name: "Estimating and Costing", icon: "" },
      { id: "ce_gis6", name: "Geographic Information System and Remote Sensing", icon: "" },
      { id: "ce_shwm6", name: "Solid and Hazardous Waste Management", icon: "" },
      { id: "ce_dhs6", name: "Design of Hydraulic Structures", icon: "" },
      { id: "ce_sa6", name: "Structural Analysis-II", icon: "" },
      { id: "ce_wsa6", name: "Wind and Seismic Analysis", icon: "" },
    ],
  },
];

const RTU_CE_4TH_YEAR_SUBJECTS: { semester: string; subjects: { id: string; name: string; icon: string }[] }[] = [
  {
    semester: "Semester 7",
    subjects: [
      { id: "ce_te7", name: "Transportation Engineering", icon: "" },
    ],
  },
  {
    semester: "Semester 8",
    subjects: [
      { id: "ce_dm8", name: "Disaster Management", icon: "" },
    ],
  },
];

// ── Mechanical Engineering subjects ──
const RTU_ME_2ND_YEAR_SUBJECTS: { semester: string; subjects: { id: string; name: string; icon: string }[] }[] = [
  {
    semester: "Semester 3",
    subjects: [
      { id: "me_aem3", name: "Advanced Engineering Mathematics-I", icon: "" },
      { id: "me_tc3", name: "Technical Communication", icon: "" },
      { id: "me_mefa3", name: "Managerial Economics & Financial Accounting", icon: "" },
      { id: "me_em3", name: "Engineering Mechanics", icon: "" },
      { id: "me_mp3", name: "Manufacturing Processes", icon: "" },
      { id: "me_aet3", name: "Aero Engineering Thermodynamics", icon: "" },
      { id: "me_eoa3", name: "Elements of Aeronautics", icon: "" },
      { id: "me_fmtm3", name: "Fluid Mechanics and Turbo Machines", icon: "" },
    ],
  },
  {
    semester: "Semester 4",
    subjects: [
      { id: "me_tc4", name: "Technical Communication", icon: "" },
      { id: "me_mefa4", name: "Managerial Economics & Financial Accounting", icon: "" },
      { id: "me_dm4", name: "Disaster Management", icon: "" },
      { id: "me_de4", name: "Digital Electronics", icon: "" },
      { id: "me_fmfm4", name: "Fluid Mechanics and Fluid Machines", icon: "" },
      { id: "me_am4", name: "Aerospace Materials", icon: "" },
      { id: "me_da4", name: "Data Analytics", icon: "" },
    ],
  },
];

const RTU_ME_3RD_YEAR_SUBJECTS: { semester: string; subjects: { id: string; name: string; icon: string }[] }[] = [
  {
    semester: "Semester 5",
    subjects: [
      { id: "me_ic5", name: "Indian Constitution", icon: "" },
      { id: "me_ms5", name: "Mechatronic Systems", icon: "" },
    ],
  },
  {
    semester: "Semester 6",
    subjects: [
      { id: "me_cims6", name: "Computer Integrated Manufacturing Systems", icon: "" },
      { id: "me_dme6", name: "Design of Machine Elements-II", icon: "" },
      { id: "me_mv6", name: "Mechanical Vibrations", icon: "" },
      { id: "me_qm6", name: "Quality Management", icon: "" },
      { id: "me_rac6", name: "Refrigeration and Air Conditioning", icon: "" },
      { id: "me_mm6", name: "Measurement and Metrology", icon: "" },
    ],
  },
];

const RTU_ME_4TH_YEAR_SUBJECTS: { semester: string; subjects: { id: string; name: string; icon: string }[] }[] = [
  {
    semester: "Semester 7",
    subjects: [],
  },
  {
    semester: "Semester 8",
    subjects: [
      { id: "me_dm8", name: "Disaster Management", icon: "" },
      { id: "me_som8", name: "Supply and Operations Management", icon: "" },
    ],
  },
];

// ── Electrical & Electronics Engineering subjects ──
const RTU_EE_EC_2ND_YEAR_SUBJECTS: { semester: string; subjects: { id: string; name: string; icon: string }[] }[] = [
  {
    semester: "Semester 3",
    subjects: [
      { id: "ee_aem3", name: "Advanced Engineering Mathematics-I", icon: "" },
      { id: "ee_tc3", name: "Technical Communication", icon: "" },
      { id: "ee_mefa3", name: "Managerial Economics & Financial Accounting", icon: "" },
      { id: "ee_ae3", name: "Analog Electronics", icon: "" },
      { id: "ee_dsd3", name: "Digital System Design", icon: "" },
      { id: "ee_eca3", name: "Electrical Circuit Analysis", icon: "" },
      { id: "ee_em3", name: "Electrical Machines-I", icon: "" },
      { id: "ee_emf3", name: "Electromagnetic Fields", icon: "" },
      { id: "ee_ed3", name: "Electronic Devices", icon: "" },
      { id: "ee_nt3", name: "Network Theory", icon: "" },
      { id: "ee_pgp3", name: "Power Generation Process", icon: "" },
      { id: "ee_ss3", name: "Signal and Systems", icon: "" },
      { id: "ee_gs3", name: "General Studies", icon: "" },
      { id: "ee_eme3", name: "Electrical Measurement", icon: "" },
      { id: "ee_psi3", name: "Power System Instrumentation", icon: "" },
    ],
  },
  {
    semester: "Semester 4",
    subjects: [
      { id: "ee_aem4", name: "Advanced Engineering Mathematics-II", icon: "" },
      { id: "ee_mefa4", name: "Managerial Economics & Financial Accounting", icon: "" },
      { id: "ee_ac4", name: "Analog Circuits", icon: "" },
      { id: "ee_de4", name: "Digital Electronics", icon: "" },
      { id: "ee_em4", name: "Electrical Machines-II", icon: "" },
      { id: "ee_emi4", name: "Electronic Measurement and Instrumentation", icon: "" },
      { id: "ee_pe4", name: "Power Electronics", icon: "" },
      { id: "ee_ss4", name: "Signal and Systems", icon: "" },
      { id: "ee_adc4", name: "Analog and Digital Communication", icon: "" },
      { id: "ee_mc4", name: "Microcontroller", icon: "" },
      { id: "ee_bio4", name: "Biology", icon: "" },
      { id: "ee_inst4", name: "Instrumentation", icon: "" },
    ],
  },
];

const RTU_EE_EC_3RD_YEAR_SUBJECTS: { semester: string; subjects: { id: string; name: string; icon: string }[] }[] = [
  {
    semester: "Semester 5",
    subjects: [
      { id: "ee_emd5", name: "Electrical Machine Design", icon: "" },
      { id: "ee_pgs5", name: "Power Generation Sources", icon: "" },
      { id: "ee_ps5", name: "Power System-I", icon: "" },
      { id: "ee_ca5", name: "Computer Architecture", icon: "" },
      { id: "ee_cs5", name: "Control System", icon: "" },
      { id: "ee_dsp5", name: "Digital Signal Processing", icon: "" },
      { id: "ee_emat5", name: "Electrical Materials", icon: "" },
      { id: "ee_ewaves5", name: "Electromagnetic Waves", icon: "" },
      { id: "ee_mp5", name: "Microprocessor", icon: "" },
      { id: "ee_mwt5", name: "Microwave Theory and Techniques", icon: "" },
      { id: "ee_rps5", name: "Restructured Power System", icon: "" },
      { id: "ee_sc5", name: "Satellite Communication", icon: "" },
    ],
  },
  {
    semester: "Semester 6",
    subjects: [
      { id: "ee_ed6", name: "Electric Drives", icon: "" },
      { id: "ee_eeca6", name: "Electrical Energy Conversion and Auditing", icon: "" },
      { id: "ee_ca6", name: "Computer Architecture", icon: "" },
      { id: "ee_ps6", name: "Power System-II", icon: "" },
      { id: "ee_psp6", name: "Power System Protection", icon: "" },
    ],
  },
];

const RTU_EE_EC_4TH_YEAR_SUBJECTS: { semester: string; subjects: { id: string; name: string; icon: string }[] }[] = [
  {
    semester: "Semester 7",
    subjects: [
      { id: "ee_cmos7", name: "CMOS Design", icon: "" },
      { id: "ee_pec7", name: "Principles of Electronic Communication", icon: "" },
      { id: "ee_wse7", name: "Wind and Solar Energy Systems", icon: "" },
    ],
  },
  {
    semester: "Semester 8",
    subjects: [
      { id: "ee_aed8", name: "Advanced Electric Drives", icon: "" },
      { id: "ee_soc8", name: "Soft Computing", icon: "" },
    ],
  },
];

const EXAMS = [
  {
    id: "rtu",
    name: "RTU",
    icon: "RT",
    color: "#e11d48",
    desc: "Rajasthan Technical University previous year papers for all branches and years.",
    papers: 772,
    subjects: RTU_BRANCHES.map((b) => b.shortName),
    isUniversity: true,
  },
  {
    id: "jee-mains",
    name: "JEE Mains",
    icon: "JM",
    color: "var(--primary)",
    desc: "National level entrance exam for NITs, IIITs & other engineering colleges.",
    papers: 134,
    subjects: ["Physics", "Chemistry", "Mathematics"],
    storageExamId: "jee-mains",
    storageSubject: "Paper",
    isMultiPaper: true,
  },
  {
    id: "jee-advanced",
    name: "JEE Advanced",
    icon: "JA",
    color: "var(--primary)",
    desc: "India's premier engineering entrance exam for IITs.",
    papers: 40,
    subjects: ["Physics", "Chemistry", "Mathematics"],
    storageExamId: "jee-advanced",
    storageSubject: "Paper",
    isMultiPaper: true,
  },
  {
    id: "upsc-cse",
    name: "UPSC CSE",
    icon: "UP",
    color: "#3b82f6",
    desc: "Civil Services Examination for India's top administrative positions.",
    papers: 30,
    subjects: ["Prelims GS", "Prelims CSAT", "Mains"],
    storageSubject: "Prelims GS",
  },
  {
    id: "neet",
    name: "NEET",
    icon: "NT",
    color: "#f59e0b",
    desc: "National eligibility entrance test for medical admissions.",
    papers: 13,
    subjects: ["Physics", "Chemistry", "Biology"],
    storageSubject: "Paper",
  },
  {
    id: "cat",
    name: "CAT",
    icon: "CT",
    color: "#8b5cf6",
    desc: "Common admission test for India's top management schools.",
    papers: 42,
    subjects: ["VARC", "DILR", "Quant"],
    storageSubject: "Paper",
    isMultiPaper: true,
  },
  {
    id: "gate",
    name: "GATE",
    icon: "GT",
    color: "#ef4444",
    desc: "Graduate aptitude test for engineering postgraduate admissions.",
    papers: 29,
    subjects: ["CS", "ECE", "Mechanical", "Civil"],
    storageSubject: "Paper",
    isMultiPaper: true,
  },
  {
    id: "cbse-10",
    name: "10th CBSE Board",
    icon: "10",
    color: "#06b6d4",
    desc: "CBSE Class 10 board examination previous year papers.",
    papers: 52,
    subjects: ["English", "Mathematics Basic", "Mathematics Standard", "Science", "Social Studies", "Hindi", "Computer Application", "French", "Japanese", "Design Thinking", "Data Science", "Information Technology", "Sanskrit"],
  },
  {
    id: "cbse-12",
    name: "12th CBSE Board",
    icon: "12",
    color: "#d946ef",
    desc: "CBSE Class 12 board examination previous year papers.",
    papers: 60,
    subjects: ["Physics", "Chemistry", "Biology", "Mathematics", "Accountancy", "Entrepreneurship", "Business Studies", "Economics", "English", "Physical Education", "Psychology", "Data Science", "French", "Design Thinking", "Political Science", "Web Application"],
  },
];

const FREE_YEARS = 3; // Free users get last 3 years
const CURRENT_YEAR = 2026;

function generateYears() {
  const years = [];
  for (let y = CURRENT_YEAR; y > CURRENT_YEAR - 20; y--) {
    years.push(y);
  }
  return years;
}

export default function LibraryPage() {
  const [scrolled, setScrolled] = useState(false);
  const [navVisible, setNavVisible] = useState(true);
  const lastScrollY = useRef(0);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userName, setUserName] = useState("");
  const [profilePicture, setProfilePicture] = useState("");
  const [isPro, setIsPro] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [claritySidebarOpen, setClaritySidebarOpen] = useState(false);

  // Auto-open sidebar when returning from login (via ?openSidebar=true)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("openSidebar") === "true") {
        setClaritySidebarOpen(true);
        const url = new URL(window.location.href);
        url.searchParams.delete("openSidebar");
        window.history.replaceState({}, "", url.pathname + url.search + url.hash);
      }
    }
  }, []);

  // Lock body scroll when mobile nav is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.classList.add('mobile-nav-locked');
    } else {
      document.body.classList.remove('mobile-nav-locked');
    }
    return () => document.body.classList.remove('mobile-nav-locked');
  }, [mobileMenuOpen]);
  const [selectedExam, setSelectedExam] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<string | null>(null);
  const [selectedBranchYear, setSelectedBranchYear] = useState<string | null>(null);
  const [selectedRtuSubject, setSelectedRtuSubject] = useState<string | null>(null);
  const [selectedRtuCalendarYear, setSelectedRtuCalendarYear] = useState<number | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [rawPdfUrl, setRawPdfUrl] = useState<string | null>(null);
  const [pdfError, setPdfError] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [requestSent, setRequestSent] = useState(false);
  const [requestLoading, setRequestLoading] = useState(false);
  // Dynamic RTU paper listing from Supabase storage
  const [rtuDynamicPapers, setRtuDynamicPapers] = useState<{subject: string; year: number; fileName: string; semester: number}[]>([]);
  const [rtuDynamicLoading, setRtuDynamicLoading] = useState(false);
  const [rtuAvailableSemesters, setRtuAvailableSemesters] = useState<number[]>([]);
  const [selectedRtuSemester, setSelectedRtuSemester] = useState<number | null>(null);
  // Dynamic JEE Mains paper listing (Year → Paper)
  const [jeeMainsPapers, setJeeMainsPapers] = useState<{year: number; session: string; date: string; shift: string; fileName: string; label: string}[]>([]);
  const [jeeMainsLoading, setJeeMainsLoading] = useState(false);
  const [selectedJeeYear, setSelectedJeeYear] = useState<number | null>(null);
  const [selectedJeePaper, setSelectedJeePaper] = useState<string | null>(null);
  const jeeYearSectionRef = useRef<HTMLDivElement>(null);
  const jeePaperSectionRef = useRef<HTMLDivElement>(null);
  const subjectSectionRef = useRef<HTMLDivElement>(null);
  const branchSectionRef = useRef<HTMLDivElement>(null);
  const branchYearSectionRef = useRef<HTMLDivElement>(null);
  const rtuSubjectSectionRef = useRef<HTMLDivElement>(null);
  const rtuCalendarYearSectionRef = useRef<HTMLDivElement>(null);
  const paperViewerRef = useRef<HTMLDivElement>(null);

  const years = generateYears();
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      const currentY = window.scrollY;
      setScrolled(currentY > 40);
      if (currentY <= 40) {
        setNavVisible(true);
      } else if (currentY < lastScrollY.current) {
        setNavVisible(true);
      } else if (currentY > lastScrollY.current + 10) {
        setNavVisible(false);
      }
      lastScrollY.current = currentY;
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    (async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    const name = session?.user?.user_metadata?.full_name || session?.user?.user_metadata?.name || session?.user?.email?.split("@")[0] || "";
    if (session) {
      setIsLoggedIn(true);
      setUserName(name || "User");
      fetch(`${API_BASE}/auth/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.profile_picture) setProfilePicture(data.profile_picture);
        })
        .catch(() => { });

      // Fetch subscription status
      fetch(`${API_BASE}/payments/subscription`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.plan?.startsWith("pro_") && data.status === "active") {
            setIsPro(true);
          }
        })
        .catch(() => {});
    } else {
      // Not logged in — allow browsing (redirect disabled for testing)
      // window.location.href = "/login?redirect=/library";
    }
    })();
  }, []);

  const exam = EXAMS.find((e) => e.id === selectedExam);
  const isCbseExam = exam?.id === "cbse-10" || exam?.id === "cbse-12";
  const isUniversityExam = !!(exam as any)?.isUniversity;
  const isMultiPaperExam = !!(exam as any)?.isMultiPaper;
  const activeBranch = RTU_BRANCHES.find((b) => b.id === selectedBranch);
  const activeBranchYear = RTU_YEARS.find((y) => y.id === selectedBranchYear);
  const hasSubjectSelection = selectedBranchYear !== null;
  const rtuSubjectSource = selectedBranchYear === "1st-year"
    ? RTU_FIRST_YEAR_SUBJECTS
    : (selectedBranch === "cs" || selectedBranch === "it")
      ? (selectedBranchYear === "2nd-year" ? RTU_IT_SECOND_YEAR_SUBJECTS
         : selectedBranchYear === "3rd-year" ? RTU_IT_THIRD_YEAR_SUBJECTS
         : selectedBranchYear === "4th-year" ? RTU_IT_FOURTH_YEAR_SUBJECTS : [])
      : selectedBranch === "civil"
        ? (selectedBranchYear === "2nd-year" ? RTU_CE_2ND_YEAR_SUBJECTS
           : selectedBranchYear === "3rd-year" ? RTU_CE_3RD_YEAR_SUBJECTS
           : selectedBranchYear === "4th-year" ? RTU_CE_4TH_YEAR_SUBJECTS : [])
        : selectedBranch === "mechanical"
          ? (selectedBranchYear === "2nd-year" ? RTU_ME_2ND_YEAR_SUBJECTS
             : selectedBranchYear === "3rd-year" ? RTU_ME_3RD_YEAR_SUBJECTS
             : selectedBranchYear === "4th-year" ? RTU_ME_4TH_YEAR_SUBJECTS : [])
          : (selectedBranch === "electrical" || selectedBranch === "electronics")
            ? (selectedBranchYear === "2nd-year" ? RTU_EE_EC_2ND_YEAR_SUBJECTS
               : selectedBranchYear === "3rd-year" ? RTU_EE_EC_3RD_YEAR_SUBJECTS
               : selectedBranchYear === "4th-year" ? RTU_EE_EC_4TH_YEAR_SUBJECTS : [])
            : [];
  const activeRtuSubject = rtuSubjectSource.flatMap((s) => s.subjects).find((s) => s.id === selectedRtuSubject);

  // RTU calendar years: 2025 down to 2006
  const rtuCalendarYears: number[] = [];
  for (let y = 2026; y >= 2006; y--) rtuCalendarYears.push(y);
  const rtuCalendarYearFree = (yr: number) => yr > CURRENT_YEAR - FREE_YEARS;

  const isYearFree = (year: number) => year > CURRENT_YEAR - FREE_YEARS;
  const canAccess = (year: number) => isPro || isYearFree(year);

  const handleYearClick = (year: number) => {
    if (!canAccess(year)) {
      if (!isLoggedIn) {
        window.location.href = "/login";
      } else {
        setShowUpgradeModal(true);
      }
      return;
    }
    setSelectedYear(year);
    setTimeout(() => paperViewerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 150);
  };


  // Build PDF URL when year is selected — direct R2 CDN
  useEffect(() => {
    if (!selectedYear || !exam) { setPdfUrl(null); setRawPdfUrl(null); setPdfError(false); setRequestSent(false); return; }
    const subject = isCbseExam ? selectedSubject : (exam as any).storageSubject || exam.subjects[0];
    if (!subject) { setPdfUrl(null); setRawPdfUrl(null); return; }
    const examStorageId = (exam as any).storageExamId || exam.id;
    const storagePath = `${examStorageId}/${subject}/${selectedYear}.pdf`;
    const directUrl = `${R2_CDN_URL}/${storagePath.split('/').map(s => encodeURIComponent(s)).join('/')}`;
    const checkUrl = `${API_BASE}/library/clean-pdf?path=${encodeURIComponent(storagePath)}`;
    setPdfUrl(null);
    setRawPdfUrl(null);
    setPdfError(false);

    // Check if file exists via backend proxy to prevent browser CORS block
    fetch(checkUrl, { method: "HEAD" })
      .then((res) => {
        if (res.ok) {
          setPdfUrl(directUrl); // Iframe loads direct from CDN (no CORS on direct iframe doc load)
          setRawPdfUrl(checkUrl); // Analysis uses backend proxy URL (prevents CORS on JS fetch)
        } else {
          setPdfError(true);
        }
      })
      .catch(() => setPdfError(true));
  }, [selectedYear, exam, selectedSubject, isCbseExam]);

  // ── RTU Storage mapping ──
  const RTU_BRANCH_STORAGE_MAP: Record<string, string> = {
    civil: "rtu-ce",
    mechanical: "rtu-me",
    cs: "rtu-csit",
    it: "rtu-csit",
    electrical: "rtu-eeec",
    electronics: "rtu-eeec",
  };

  // ── Dynamic listing: fetch available RTU papers from Supabase storage ──
  useEffect(() => {
    if (selectedExam !== "rtu" || !selectedBranch || !selectedBranchYear) {
      setRtuDynamicPapers([]);
      setRtuAvailableSemesters([]);
      setSelectedRtuSemester(null);
      return;
    }
    setRtuDynamicLoading(true);
    setRtuDynamicPapers([]);
    setSelectedRtuSemester(null);
    setSelectedRtuSubject(null);
    setSelectedRtuCalendarYear(null);

    const storageFolder = selectedBranchYear === "1st-year"
      ? "rtu-1styear"
      : RTU_BRANCH_STORAGE_MAP[selectedBranch] || `rtu-${selectedBranch}`;

    // Determine which semesters to scan based on year selection
    let semRange: number[] = [];
    if (selectedBranchYear === "1st-year") semRange = [1, 2];
    else if (selectedBranchYear === "2nd-year") semRange = [3, 4];
    else if (selectedBranchYear === "3rd-year") semRange = [5, 6];
    else if (selectedBranchYear === "4th-year") semRange = [7, 8];

    // Fetch papers from each semester folder via Next.js API route (works on Vercel)
    const fetchAll = semRange.map(sem =>
      fetch(`/api/library/list-papers?folder=${encodeURIComponent(`${storageFolder}/Sem ${sem}`)}`)
        .then(r => r.ok ? r.json() : [])
        .then((files: any[]) =>
          files
            .filter((f: any) => f.name?.endsWith('.pdf'))
            .map((f: any) => {
              const name = f.name.replace('.pdf', '');
              // Parse "Subject Name 2024" → subject + year
              const yearMatch = name.match(/(\d{4})$/);
              const year = yearMatch ? parseInt(yearMatch[1]) : 0;
              const subject = yearMatch ? name.slice(0, -yearMatch[0].length).trim() : name;
              return { subject, year, fileName: f.name, semester: sem };
            })
            .filter(p => p.year >= 2006 && p.year <= 2030)
        )
        .catch(() => [] as {subject: string; year: number; fileName: string; semester: number}[])
    );

    Promise.all(fetchAll).then(results => {
      const allPapers = results.flat();
      setRtuDynamicPapers(allPapers);
      const sems = [...new Set(allPapers.map(p => p.semester))].sort();
      setRtuAvailableSemesters(sems);
      setRtuDynamicLoading(false);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedExam, selectedBranch, selectedBranchYear]);

  // Derived: subjects and years from dynamic listing
  const rtuDynSubjects = selectedRtuSemester
    ? [...new Set(rtuDynamicPapers.filter(p => p.semester === selectedRtuSemester).map(p => p.subject))].sort()
    : [];
  const rtuDynYears = selectedRtuSubject
    ? [...new Set(rtuDynamicPapers.filter(p => p.semester === selectedRtuSemester && p.subject === selectedRtuSubject).map(p => p.year))].sort((a, b) => b - a)
    : [];

  // Build PDF URL for RTU papers — direct R2 CDN
  useEffect(() => {
    if (selectedExam !== "rtu" || !selectedRtuCalendarYear || !selectedRtuSubject || !selectedRtuSemester) return;
    setPdfUrl(null);
    setRawPdfUrl(null);
    setPdfError(false);
    setRequestSent(false);

    const paper = rtuDynamicPapers.find(
      p => p.semester === selectedRtuSemester && p.subject === selectedRtuSubject && p.year === selectedRtuCalendarYear
    );
    if (!paper) { setPdfError(true); return; }

    const storageFolder = selectedBranchYear === "1st-year"
      ? "rtu-1styear"
      : RTU_BRANCH_STORAGE_MAP[selectedBranch!] || `rtu-${selectedBranch}`;
    const storagePath = `${storageFolder}/Sem ${paper.semester}/${paper.fileName}`;
    const proxyUrl = `${API_BASE}/library/clean-pdf?path=${encodeURIComponent(storagePath)}`;

    // Check if file exists via backend proxy to prevent browser CORS block
    fetch(proxyUrl, { method: "HEAD" })
      .then(res => {
        if (res.ok) {
          setPdfUrl(proxyUrl); // RTU papers are viewed via proxy to strip watermark
          setRawPdfUrl(proxyUrl); // Analysis uses proxy URL to prevent CORS block
        } else setPdfError(true);
      })
      .catch(() => setPdfError(true));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedExam, selectedRtuCalendarYear, selectedRtuSubject, selectedRtuSemester]);

  // ── Dynamic listing: fetch JEE Mains papers from storage ──
  useEffect(() => {
    if (!selectedExam || !isMultiPaperExam) {
      setJeeMainsPapers([]);
      setSelectedJeeYear(null);
      setSelectedJeePaper(null);
      return;
    }
    setJeeMainsLoading(true);
    setJeeMainsPapers([]);
    setSelectedJeeYear(null);
    setSelectedJeePaper(null);

    const storageFolder = `${exam?.storageExamId || selectedExam}/${exam?.storageSubject || 'Paper'}`;

    fetch(`/api/library/list-papers?folder=${encodeURIComponent(storageFolder)}`)
      .then(r => r.ok ? r.json() : [])
      .then((files: any[]) => {
        const papers = files
          .filter((f: any) => f.name?.endsWith('.pdf'))
          .map((f: any) => {
            const name = f.name.replace('.pdf', '');
            // Actual format: 2019_apr_08apr_shift1 or 2024_jan_27jan_shift2
            const match = name.match(/^(\d{4})_([a-z]+)_(\d{1,2})([a-z]+)_shift(\d+)$/i);
            if (match) {
              const year = parseInt(match[1]);
              const session = match[2].charAt(0).toUpperCase() + match[2].slice(1); // apr → Apr
              const day = match[3].padStart(2, '0');
              const monthName = match[4].charAt(0).toUpperCase() + match[4].slice(1);
              const shift = `Shift ${match[5]}`;
              return {
                year,
                session,
                date: `${day} ${monthName}`,
                shift,
                fileName: f.name,
                label: `${day} ${monthName} ${year} · ${shift}`,
              };
            }
            // Fallback: JEE Advanced naming — e.g. 2024_paper1.pdf, 2024_paper2.pdf
            const advMatch = name.match(/^(\d{4})_paper(\d+)$/i);
            if (advMatch) {
              const year = parseInt(advMatch[1]);
              const paperNum = advMatch[2];
              return {
                year,
                session: `Paper ${paperNum}`,
                date: '',
                shift: `Paper ${paperNum}`,
                fileName: f.name,
                label: `Paper ${paperNum}`,
              };
            }
            // Fallback for other naming conventions
            const yearMatch = name.match(/(\d{4})/);
            return {
              year: yearMatch ? parseInt(yearMatch[1]) : 0,
              session: '',
              date: '',
              shift: '',
              fileName: f.name,
              label: name.replace(/_/g, ' '),
            };
          })
          .filter(p => p.year >= 2006 && p.year <= 2030)
          .sort((a, b) => {
            if (a.year !== b.year) return b.year - a.year;
            if (a.session !== b.session) return a.session.localeCompare(b.session);
            return a.date.localeCompare(b.date) || a.shift.localeCompare(b.shift);
          });
        setJeeMainsPapers(papers);
        setJeeMainsLoading(false);
      })
      .catch(() => {
        setJeeMainsPapers([]);
        setJeeMainsLoading(false);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedExam, isMultiPaperExam]);

  // Derived: JEE Mains years
  const jeeMainsYears = [...new Set(jeeMainsPapers.map(p => p.year))].sort((a, b) => b - a);
  const jeeMainsForYear = selectedJeeYear
    ? jeeMainsPapers.filter(p => p.year === selectedJeeYear)
    : [];

  // Build PDF URL for JEE Mains — direct R2 CDN
  useEffect(() => {
    if (!selectedExam || !isMultiPaperExam || !selectedJeePaper) return;
    setPdfUrl(null);
    setRawPdfUrl(null);
    setPdfError(false);
    setRequestSent(false);

    const storageFolder = `${exam?.storageExamId || selectedExam}/${exam?.storageSubject || 'Paper'}`;
    const storagePath = `${storageFolder}/${selectedJeePaper}`;
    const directUrl = `${R2_CDN_URL}/${storagePath.split('/').map(s => encodeURIComponent(s)).join('/')}`;
    const checkUrl = `${API_BASE}/library/clean-pdf?path=${encodeURIComponent(storagePath)}`;

    // Check if file exists via backend proxy to prevent browser CORS block
    fetch(checkUrl, { method: "HEAD" })
      .then(res => {
        if (res.ok) {
          setPdfUrl(directUrl); // Iframe loads direct from CDN (no CORS on direct iframe doc load)
          setRawPdfUrl(checkUrl); // Analysis uses backend proxy URL (prevents CORS on JS fetch)
        } else setPdfError(true);
      })
      .catch(() => setPdfError(true));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedExam, isMultiPaperExam, selectedJeePaper]);

  return (
    <main style={{ background: "var(--bg)", color: "var(--text)", fontFamily: "'Inter', sans-serif", overflowX: "hidden", minHeight: "100vh" }}>
      <style>{`
        .font-serif  { font-family: 'Newsreader', serif; }
        .font-grotesk { font-family: 'Space Grotesk', sans-serif; }

        * { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(32px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes morph {
          0%,100% { border-radius: 40% 60% 60% 40% / 70% 30% 70% 30%; }
          50%      { border-radius: 60% 40% 40% 60% / 30% 70% 30% 70%; }
        }
        @keyframes ping {
          0%,100% { transform: scale(1); opacity: 1; }
          50%      { transform: scale(1.8); opacity: 0.2; }
        }
        @keyframes pulse-glow {
          0%,100% { box-shadow: 0 0 0 0 rgba(var(--primary-rgb),0.4); }
          50%      { box-shadow: 0 0 0 12px rgba(var(--primary-rgb),0); }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes shimmer {
          0%   { background-position: 200% center; }
          100% { background-position: -200% center; }
        }
        @keyframes dropdownSlide {
          from { opacity: 0; transform: translateY(-8px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes modalIn {
          from { opacity: 0; transform: scale(0.92) translateY(20px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes shimmerAnalyze {
          0%   { background-position: 0% 50%; }
          50%  { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes pulseAnalyze {
          0%,100% { box-shadow: 0 0 8px 0 rgba(245,158,11,0.4), 0 0 0 0 rgba(239,68,68,0.3); transform: scale(1); }
          50%     { box-shadow: 0 0 16px 4px rgba(245,158,11,0.6), 0 0 24px 8px rgba(239,68,68,0.2); transform: scale(1.03); }
        }

        .fade-up-1 { animation: fadeUp 0.8s cubic-bezier(0.16,1,0.3,1) 0.1s both; }
        .fade-up-2 { animation: fadeUp 0.8s cubic-bezier(0.16,1,0.3,1) 0.25s both; }
        .fade-up-3 { animation: fadeUp 0.8s cubic-bezier(0.16,1,0.3,1) 0.4s both; }

        .nav-link {
          font-size: 14px; font-weight: 500;
          color: rgba(var(--text-rgb),0.6);
          text-decoration: none;
          position: relative; padding-bottom: 2px;
          transition: color 300ms;
        }
        .nav-link::after {
          content: '';
          position: absolute; bottom: 0; left: 0;
          height: 1px; width: 0;
          background: var(--primary);
          transition: width 300ms cubic-bezier(0.16,1,0.3,1);
        }
        .nav-link:hover { color: #EBEBEB; }
        .nav-link:hover::after { width: 100%; }

        .logo-icon:hover { animation: spin 600ms cubic-bezier(0.16,1,0.3,1) forwards; }

        .exam-card {
          position: relative;
          background: rgba(255,255,255,0.02);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 20px;
          padding: 32px;
          cursor: pointer;
          transition: all 300ms cubic-bezier(0.16,1,0.3,1);
          overflow: hidden;
        }
        .exam-card::before {
          content: '';
          position: absolute; inset: 0; border-radius: 20px;
          background: radial-gradient(300px circle at 50% 40%, var(--card-glow, rgba(var(--primary-rgb),0.08)), transparent 60%);
          opacity: 0;
          transition: opacity 300ms;
          pointer-events: none;
        }
        .exam-card:hover::before { opacity: 1; }
        .exam-card:hover {
          border-color: var(--card-border, rgba(var(--primary-rgb),0.25));
          transform: translateY(-4px);
        }
        .exam-card.selected {
          border-color: var(--card-border, rgba(var(--primary-rgb),0.4));
          background: rgba(var(--primary-rgb),0.04);
        }
        .exam-card.selected::before { opacity: 1; }

        .year-tile {
          position: relative;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 16px;
          padding: 24px 20px;
          text-align: center;
          cursor: pointer;
          transition: all 300ms cubic-bezier(0.16,1,0.3,1);
          overflow: hidden;
        }
        .year-tile:hover {
          border-color: rgba(var(--primary-rgb),0.25);
          transform: translateY(-3px);
          background: rgba(var(--primary-rgb),0.04);
        }
        .year-tile.locked {
          opacity: 0.5;
          cursor: pointer;
        }
        .year-tile.locked:hover {
          border-color: rgba(255,255,255,0.15);
          background: rgba(255,255,255,0.03);
          opacity: 0.7;
        }

        .dropdown-item:hover {
          background: rgba(255,255,255,0.06) !important;
          color: #EBEBEB !important;
        }
      `}</style>

      {/* ── Background ── */}
      <div style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none", overflow: "hidden" }}>
        <div style={{
          position: "absolute", top: "-100px", left: "-100px",
          width: "500px", height: "500px",
          background: "rgba(var(--primary-rgb),0.07)",
          filter: "blur(100px)",
          animation: "morph 10s ease-in-out infinite",
        }} />
        <div style={{
          position: "absolute", bottom: "100px", right: "-100px",
          width: "400px", height: "400px",
          background: "rgba(var(--primary-rgb),0.05)",
          filter: "blur(100px)",
          animation: "morph 14s ease-in-out infinite reverse",
        }} />
        <div style={{
          position: "absolute", inset: 0,
          backgroundImage: "linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }} />
      </div>

      {/* ── Mobile Nav Overlay ── */}
      <div className={`mobile-nav-overlay${mobileMenuOpen ? " open" : ""}`}>
        <button className="mobile-nav-close" onClick={() => setMobileMenuOpen(false)}>✕</button>
        {[{label: "Library", href: "/library"}, {label: "Pricing", href: "/#pricing"}, {label: "About", href: "/about"}].map((l) => (
          <a key={l.label} href={l.href} onClick={() => setMobileMenuOpen(false)}>{l.label}</a>
        ))}
        <button
          onClick={() => { setMobileMenuOpen(false); setClaritySidebarOpen(true); }}
          style={{
            background: "none", border: "none", cursor: "pointer",
            fontSize: "20px", fontWeight: 500,
            color: "var(--primary)",
            fontFamily: "'Inter', sans-serif",
            padding: "10px 0",
            display: "flex", alignItems: "center", gap: "8px",
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
           <sup style={{ fontStyle: "italic", fontSize: "0.75em", fontFamily: "var(--font-newsreader, 'Newsreader'), Georgia, serif", marginRight: "2px" }}>ask</sup>Clarity
        </button>
        {isLoggedIn ? (
          <>
            <a href="/upload" onClick={() => setMobileMenuOpen(false)}>My Analyses</a>
            <a href="/profile" onClick={() => setMobileMenuOpen(false)}>Profile</a>
            <a href="/billing" onClick={() => setMobileMenuOpen(false)}>Billing</a>
          </>
        ) : (
          <>
            <a href="/login" onClick={() => setMobileMenuOpen(false)}>Log In</a>
            <a href="/register" style={{ background: "var(--primary)", color: "white", borderRadius: "9999px", padding: "12px 28px", fontWeight: 600 }} onClick={() => setMobileMenuOpen(false)}>Get Started →</a>
          </>
        )}
      </div>

      {/* ── Navbar ── */}
      <header className="nav-header" style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 50,
        padding: "20px 40px",
        background: scrolled ? "rgba(var(--bg-rgb),0.75)" : "transparent",
        backdropFilter: scrolled ? "blur(20px) saturate(180%)" : "none",
        borderBottom: scrolled ? "1px solid rgba(255,255,255,0.06)" : "none",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        transform: (navVisible || mobileMenuOpen) ? "translateY(0)" : "translateY(-100%)",
        transition: "all 400ms cubic-bezier(0.16,1,0.3,1)",
      }}>
        <a href="/" style={{ display: "flex", alignItems: "center", gap: "10px", textDecoration: "none", color: "inherit" }}>
          <img src="/logo.png" alt="ANALYXX" className="logo-icon theme-logo nav-logo-icon" style={{
            width: "40px", height: "40px", borderRadius: "10px",
            cursor: "pointer", objectFit: "cover",
          }} />
          <span className="font-serif nav-logo-text" style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "20px", fontWeight: 400, letterSpacing: "-0.02em" }}>
            <span>ANALYXX <em style={{ color: "var(--primary)" }}>AI</em></span>
            {isPro && (
              <span className="analyxx-pro-badge">
                <span>Pro</span>
              </span>
            )}
          </span>
        </a>

        <div className="desktop-nav-links" style={{ display: "flex", gap: "36px", alignItems: "center" }}>
          <button
            className="nav-link ask-clarity-nav-btn"
            onClick={() => setClaritySidebarOpen(true)}
            title="Ask Clarity — AI Study Assistant"
          >
            <sup>ask</sup>Clarity
          </button>
          {[{ label: "Library", href: "/library" }, { label: "Pricing", href: "/#pricing" }].map((l) => (
            <a key={l.label} href={l.href} className="nav-link" style={l.href === "/library" ? { color: "var(--primary)" } : {}}>{l.label}</a>
          ))}
        </div>

        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <button className="mobile-menu-btn" onClick={() => setMobileMenuOpen(true)} aria-label="Open menu">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
          </button>
          <span className="nav-theme-customizer"><ThemeCustomizer /></span>
          {isLoggedIn ? (
            <div
              className="nav-user-dropdown"
              style={{ position: "relative" }}
              onMouseEnter={() => setDropdownOpen(true)}
              onMouseLeave={() => setDropdownOpen(false)}
            >
              <div style={{
                display: "flex", alignItems: "center", gap: "10px", cursor: "pointer",
                padding: "6px 14px 6px 6px", borderRadius: "9999px",
                background: dropdownOpen ? "rgba(255,255,255,0.06)" : "transparent",
                border: "1px solid",
                borderColor: dropdownOpen ? "rgba(var(--primary-rgb),0.25)" : "rgba(255,255,255,0.08)",
                transition: "all 300ms cubic-bezier(0.16,1,0.3,1)",
              }}>
                <div style={{
                  width: "32px", height: "32px", borderRadius: "50%",
                  background: profilePicture ? "transparent" : "linear-gradient(135deg, var(--primary), var(--primary))",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "14px", fontWeight: 700, color: "white",
                  overflow: "hidden",
                }}>
                  {profilePicture ? (
                    <img src={profilePicture} alt="Profile" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    userName.charAt(0).toUpperCase()
                  )}
                </div>
                <span style={{ fontSize: "14px", fontWeight: 500, color: "rgba(var(--text-rgb),0.8)" }}>
                  {userName}
                </span>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{
                  transform: dropdownOpen ? "rotate(180deg)" : "rotate(0deg)",
                  transition: "transform 300ms cubic-bezier(0.16,1,0.3,1)",
                }}>
                  <path d="M3 4.5L6 7.5L9 4.5" stroke="rgba(var(--text-rgb),0.4)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>

              {dropdownOpen && (
                <div style={{ position: "absolute", top: "100%", right: 0, paddingTop: "8px", zIndex: 100 }}>
                  <div style={{
                    minWidth: "240px",
                    background: "rgba(var(--bg-rgb),0.88)",
                    backdropFilter: "blur(24px) saturate(180%)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: "16px", padding: "8px",
                    boxShadow: "0 20px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(var(--primary-rgb),0.05)",
                    animation: "dropdownSlide 0.25s cubic-bezier(0.16,1,0.3,1)",
                  }}>
                    <div style={{
                      padding: "12px 14px", marginBottom: "4px",
                      borderBottom: "1px solid rgba(255,255,255,0.06)",
                    }}>
                      <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text)" }}>{userName}</div>
                      <div style={{ fontSize: "11px", color: "rgba(var(--text-rgb),0.35)", marginTop: "2px" }}>
                        {"" /* email from session */}
                      </div>
                    </div>
                    {[
                      { icon: "D", label: "Dashboard", href: "/dashboard" },
                      { icon: "L", label: "PYQ Library", href: "/library" },
                      { icon: "P", label: "My Profile", href: "/profile" },
                    ].map((item) => (
                      <a key={item.label} href={item.href} className="dropdown-item" style={{
                        display: "flex", alignItems: "center", gap: "12px",
                        padding: "10px 14px", borderRadius: "10px",
                        fontSize: "13px", fontWeight: 500,
                        color: "rgba(var(--text-rgb),0.7)",
                        textDecoration: "none",
                        transition: "all 200ms",
                      }}>
                        <span style={{ fontSize: "11px", fontWeight: 600, width: "20px", textAlign: "center", color: "rgba(var(--text-rgb),0.4)", fontFamily: "'Space Grotesk', sans-serif" }}>{item.icon}</span>
                        {item.label}
                      </a>
                    ))}
                    <div style={{ height: "1px", background: "rgba(255,255,255,0.06)", margin: "4px 10px" }} />
                    <button
                      onClick={async () => {
                        await supabase.auth.signOut();
                        setIsLoggedIn(false);
                        setUserName("");
                        setDropdownOpen(false);
                        window.location.href = "/";
                      }}
                      className="dropdown-item"
                      style={{
                        display: "flex", alignItems: "center", gap: "12px",
                        padding: "10px 14px", borderRadius: "10px",
                        fontSize: "13px", fontWeight: 500,
                        color: "rgba(239,68,68,0.8)",
                        background: "transparent", border: "none",
                        cursor: "pointer", width: "100%", textAlign: "left",
                        transition: "all 200ms",
                        fontFamily: "'Inter', sans-serif",
                      }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: "20px", flexShrink: 0 }}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
                      Logout
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="nav-auth-buttons" style={{ display: "contents" }}>
              <a href="/login" className="nav-link">Log In</a>
              <a href="/register" style={{
                background: "var(--primary)", color: "white",
                borderRadius: "9999px", padding: "10px 24px",
                fontSize: "14px", fontWeight: 600,
                textDecoration: "none", animation: "pulse-glow 2.5s infinite",
                transition: "all 300ms",
              }}>Get Started →</a>
            </div>
          )}
        </div>
      </header>

      <div style={{ position: "relative", zIndex: 1 }}>

        {/* ── Hero ── */}
        <section className="lib-hero" style={{ padding: "160px 40px 80px", maxWidth: "1280px", margin: "0 auto", textAlign: "center" }}>
          <p className="fade-up-1 font-grotesk" style={{
            fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.25em",
            color: "var(--primary)", marginBottom: "20px",
          }}>
            PYQ Library
          </p>
          <h1 className="fade-up-2 font-serif" style={{
            fontSize: "clamp(40px, 5vw, 72px)",
            fontWeight: 300, lineHeight: 1.05,
            letterSpacing: "-0.03em",
            marginBottom: "20px",
          }}>
            20 Years of <em style={{ color: "var(--primary)" }}>Past Papers.</em>
          </h1>
          <p className="fade-up-3" style={{
            fontSize: "17px", fontWeight: 300,
            color: "rgba(var(--text-rgb),0.4)",
            lineHeight: 1.75, maxWidth: "560px",
            margin: "0 auto",
          }}>
            Access previous year question papers for JEE Advanced, UPSC CSE, NEET, CAT, and GATE — all in one place.
          </p>
        </section>

        {/* ── Exam Selection ── */}
        <section className="lib-section" style={{ padding: "0 40px 60px", maxWidth: "1280px", margin: "0 auto" }}>
          <div className="lib-exam-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px" }}>
            {EXAMS.map((ex) => (
              <div
                key={ex.id}
                className={`exam-card ${selectedExam === ex.id ? "selected" : ""}`}
                style={{
                  "--card-glow": `${ex.color}15`,
                  "--card-border": `${ex.color}40`,
                  display: "flex",
                  flexDirection: "column",
                  height: "100%",
                } as React.CSSProperties}
                onClick={() => {
                  setSelectedExam(ex.id); setSelectedYear(null); setSelectedSubject(null); setSelectedBranch(null); setSelectedBranchYear(null); setSelectedRtuSubject(null); setSelectedRtuCalendarYear(null); setSelectedJeeYear(null); setSelectedJeePaper(null);
                  const isUni = !!(ex as any).isUniversity;
                  const isMulti = !!(ex as any).isMultiPaper;
                  setTimeout(() => {
                    if (isUni) branchSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                    else if (isMulti) jeeYearSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                    else subjectSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }, 100);
                }}
              >

                <h3 className="font-serif" style={{ fontSize: "20px", fontWeight: 400, marginBottom: "6px" }}>
                  {ex.name}
                </h3>
                <p style={{ fontSize: "12px", color: "rgba(var(--text-rgb),0.35)", lineHeight: 1.6, fontWeight: 300, marginBottom: "14px" }}>
                  {ex.desc}
                </p>
                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "auto" }}>
                  {ex.subjects.slice(0, 3).map((s) => (
                    <span key={s} className="font-grotesk" style={{
                      fontSize: "9px", textTransform: "uppercase", letterSpacing: "0.1em",
                      padding: "4px 10px", borderRadius: "9999px",
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.06)",
                      color: "rgba(var(--text-rgb),0.4)",
                    }}>{s}</span>
                  ))}
                  {ex.subjects.length > 3 && (
                    <span className="font-grotesk" style={{
                      fontSize: "9px", textTransform: "uppercase", letterSpacing: "0.1em",
                      padding: "4px 10px", borderRadius: "9999px",
                      background: `${ex.color}12`,
                      border: `1px solid ${ex.color}25`,
                      color: ex.color,
                    }}>+{ex.subjects.length - 3} more</span>
                  )}
                </div>
                <div className="font-grotesk" style={{
                  fontSize: "9px", textTransform: "uppercase", letterSpacing: "0.15em",
                  color: ex.color, marginTop: "16px",
                  display: "flex", alignItems: "center", gap: "6px",
                }}>
                  <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: ex.color, display: "inline-block" }} />
                  {ex.papers} Papers Available
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Branch Selection (RTU / University) ── */}
        {selectedExam && exam && isUniversityExam && !selectedBranch && (
          <section ref={branchSectionRef} className="lib-section" style={{ padding: "0 40px 60px", maxWidth: "1280px", margin: "0 auto", scrollMarginTop: "100px" }}>
            <div className="lib-section-header" style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              marginBottom: "32px",
              paddingBottom: "20px",
              borderBottom: "1px solid rgba(255,255,255,0.06)",
            }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
                  <span style={{ fontSize: "20px", fontWeight: 700, color: exam.color, fontFamily: "'Space Grotesk', sans-serif" }}>{exam.icon}</span>
                  <h2 className="font-serif" style={{ fontSize: "32px", fontWeight: 300, letterSpacing: "-0.02em" }}>
                    {exam.name} — <span style={{ color: exam.color }}>Choose Branch</span>
                  </h2>
                </div>
                <p style={{ fontSize: "14px", color: "rgba(var(--text-rgb),0.35)", fontWeight: 300 }}>
                  Select your engineering branch to browse papers.
                </p>
              </div>
              <button
                onClick={() => { setSelectedExam(null); setSelectedBranch(null); setSelectedBranchYear(null); setSelectedRtuSubject(null); setSelectedRtuCalendarYear(null); }}
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "12px", padding: "10px 20px",
                  color: "rgba(var(--text-rgb),0.6)", fontSize: "13px",
                  fontWeight: 500, cursor: "pointer",
                  transition: "all 200ms",
                  fontFamily: "'Inter', sans-serif",
                }}
              >
                ← All Exams
              </button>
            </div>

            <div className="lib-branch-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px" }}>
              {RTU_BRANCHES.map((branch) => (
                <div
                  key={branch.id}
                  onClick={() => {
                    setSelectedBranch(branch.id);
                    setTimeout(() => branchYearSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
                  }}
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: "20px",
                    padding: "32px 24px",
                    cursor: "pointer",
                    transition: "all 300ms cubic-bezier(0.16,1,0.3,1)",
                    textAlign: "center",
                    position: "relative",
                    overflow: "hidden",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor = `${exam.color}50`;
                    (e.currentTarget as HTMLElement).style.background = `${exam.color}08`;
                    (e.currentTarget as HTMLElement).style.transform = "translateY(-4px)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.08)";
                    (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.03)";
                    (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
                  }}
                >
                  <div style={{ fontSize: "32px", marginBottom: "12px" }}>{branch.icon}</div>
                  <h3 className="font-serif" style={{ fontSize: "20px", fontWeight: 400, marginBottom: "6px" }}>
                    {branch.name}
                  </h3>
                  <p style={{ fontSize: "12px", color: "rgba(var(--text-rgb),0.35)", lineHeight: 1.6, fontWeight: 300, marginBottom: "12px" }}>
                    Browse PYQs for {branch.name}
                  </p>
                  <div className="font-grotesk" style={{
                    fontSize: "9px", textTransform: "uppercase", letterSpacing: "0.15em",
                    color: exam.color, marginTop: "8px",
                  }}>
                    View Papers →
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Year Selection (RTU / University: 1st–4th Year) ── */}
        {selectedExam && exam && isUniversityExam && selectedBranch && !selectedBranchYear && (
          <section ref={branchYearSectionRef} className="lib-section" style={{ padding: "0 40px 60px", maxWidth: "1280px", margin: "0 auto", scrollMarginTop: "100px" }}>
            <div className="lib-section-header" style={{
              marginBottom: "32px",
              paddingBottom: "20px",
              borderBottom: "1px solid rgba(255,255,255,0.06)",
            }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
                  <span style={{ fontSize: "20px", fontWeight: 700, color: exam.color, fontFamily: "'Space Grotesk', sans-serif" }}>{exam.icon}</span>
                  <h2 className="font-serif" style={{ fontSize: "32px", fontWeight: 300, letterSpacing: "-0.02em" }}>
                    {exam.name} — {activeBranch?.name} — <span style={{ color: exam.color }}>Choose Year</span>
                  </h2>
                </div>
                <p style={{ fontSize: "14px", color: "rgba(var(--text-rgb),0.35)", fontWeight: 300 }}>
                  Select the academic year to view papers.
                </p>
              </div>
              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  onClick={() => { setSelectedBranch(null); setSelectedBranchYear(null); setSelectedRtuSubject(null); setSelectedRtuCalendarYear(null); }}
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "12px", padding: "10px 20px",
                    color: "rgba(var(--text-rgb),0.6)", fontSize: "13px",
                    fontWeight: 500, cursor: "pointer",
                    transition: "all 200ms",
                    fontFamily: "'Inter', sans-serif",
                  }}
                >
                  ← Branches
                </button>
                <button
                  onClick={() => { setSelectedExam(null); setSelectedBranch(null); setSelectedBranchYear(null); setSelectedRtuSubject(null); setSelectedRtuCalendarYear(null); }}
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "12px", padding: "10px 20px",
                    color: "rgba(var(--text-rgb),0.6)", fontSize: "13px",
                    fontWeight: 500, cursor: "pointer",
                    transition: "all 200ms",
                    fontFamily: "'Inter', sans-serif",
                  }}
                >
                  ← All Exams
                </button>
              </div>
            </div>

            <div className="lib-year-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px" }}>
              {RTU_YEARS.map((yr) => (
                <div
                  key={yr.id}
                  onClick={() => {
                    setSelectedBranchYear(yr.id);
                    setSelectedRtuSubject(null);
                    setSelectedRtuCalendarYear(null);
                    // All years now have subject selection
                    setTimeout(() => rtuSubjectSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 150);
                  }}
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: "20px",
                    padding: "40px 24px",
                    cursor: "pointer",
                    transition: "all 300ms cubic-bezier(0.16,1,0.3,1)",
                    textAlign: "center",
                    position: "relative",
                    overflow: "hidden",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor = `${exam.color}50`;
                    (e.currentTarget as HTMLElement).style.background = `${exam.color}08`;
                    (e.currentTarget as HTMLElement).style.transform = "translateY(-4px)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.08)";
                    (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.03)";
                    (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
                  }}
                >
                  <div style={{
                    width: "56px", height: "56px", borderRadius: "16px",
                    background: `${exam.color}15`,
                    border: `1px solid ${exam.color}30`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    margin: "0 auto 16px",
                    fontSize: "22px", fontWeight: 700, color: exam.color,
                    fontFamily: "'Space Grotesk', sans-serif",
                  }}>
                    {yr.label}
                  </div>
                  <h3 className="font-serif" style={{ fontSize: "22px", fontWeight: 400, marginBottom: "6px" }}>
                    {yr.name}
                  </h3>
                  <div className="font-grotesk" style={{
                    fontSize: "9px", textTransform: "uppercase", letterSpacing: "0.15em",
                    color: exam.color, marginTop: "8px",
                  }}>
                    View Papers →
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── RTU Dynamic Subject Selection (from Supabase storage listing) ── */}
        {selectedExam && exam && isUniversityExam && selectedBranch && hasSubjectSelection && !selectedRtuSubject && (
          <section ref={rtuSubjectSectionRef} className="lib-section" style={{ padding: "0 40px 60px", maxWidth: "1280px", margin: "0 auto", scrollMarginTop: "100px" }}>
            <div className="lib-section-header" style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              marginBottom: "32px",
              paddingBottom: "20px",
              borderBottom: "1px solid rgba(255,255,255,0.06)",
            }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
                  <span style={{ fontSize: "20px", fontWeight: 700, color: exam.color, fontFamily: "'Space Grotesk', sans-serif" }}>{exam.icon}</span>
                  <h2 className="font-serif" style={{ fontSize: "32px", fontWeight: 300, letterSpacing: "-0.02em" }}>
                    {exam.name} — {activeBranch?.name} — {activeBranchYear?.name} — <span style={{ color: exam.color }}>{selectedRtuSemester ? "Choose Subject" : "Choose Semester"}</span>
                  </h2>
                </div>
                <p style={{ fontSize: "14px", color: "rgba(var(--text-rgb),0.35)", fontWeight: 300 }}>
                  {rtuDynamicLoading ? "Loading available papers... Sometimes it takes more time than usual, please wait." : `${rtuDynamicPapers.length} papers available. ${selectedRtuSemester ? "Select a subject to view papers." : "Select a semester."}`}
                </p>
              </div>
              <div style={{ display: "flex", gap: "10px" }}>
                {selectedRtuSemester && (
                  <button
                    onClick={() => { setSelectedRtuSemester(null); setSelectedRtuSubject(null); setSelectedRtuCalendarYear(null); }}
                    style={{
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: "12px", padding: "10px 20px",
                      color: "rgba(var(--text-rgb),0.6)", fontSize: "13px",
                      fontWeight: 500, cursor: "pointer",
                      transition: "all 200ms",
                      fontFamily: "'Inter', sans-serif",
                    }}
                  >
                    ← Semesters
                  </button>
                )}
                <button
                  onClick={() => { setSelectedBranchYear(null); setSelectedRtuSubject(null); setSelectedRtuCalendarYear(null); setSelectedRtuSemester(null); }}
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "12px", padding: "10px 20px",
                    color: "rgba(var(--text-rgb),0.6)", fontSize: "13px",
                    fontWeight: 500, cursor: "pointer",
                    transition: "all 200ms",
                    fontFamily: "'Inter', sans-serif",
                  }}
                >
                  ← Years
                </button>
                <button
                  onClick={() => { setSelectedExam(null); setSelectedBranch(null); setSelectedBranchYear(null); setSelectedRtuSubject(null); setSelectedRtuCalendarYear(null); setSelectedRtuSemester(null); }}
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "12px", padding: "10px 20px",
                    color: "rgba(var(--text-rgb),0.6)", fontSize: "13px",
                    fontWeight: 500, cursor: "pointer",
                    transition: "all 200ms",
                    fontFamily: "'Inter', sans-serif",
                  }}
                >
                  ← All Exams
                </button>
              </div>
            </div>

            {rtuDynamicLoading ? (
              <div style={{ padding: "60px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "12px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <div style={{ width: "24px", height: "24px", border: `2px solid ${exam.color}50`, borderTop: `2px solid ${exam.color}`, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                  <span style={{ fontSize: "14px", color: "rgba(var(--text-rgb),0.4)" }}>Loading papers from library...</span>
                </div>
                <span style={{ fontSize: "12px", color: "rgba(var(--text-rgb),0.25)", fontStyle: "italic" }}>Sometimes it takes more time than usual, please wait</span>
              </div>
            ) : !selectedRtuSemester ? (
              /* Semester selection */
              <div className="lib-subject-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px" }}>
                {rtuAvailableSemesters.map((sem) => {
                  const paperCount = rtuDynamicPapers.filter(p => p.semester === sem).length;
                  return (
                    <div
                      key={sem}
                      onClick={() => {
                        setSelectedRtuSemester(sem);
                        setSelectedRtuSubject(null);
                        setSelectedRtuCalendarYear(null);
                      }}
                      style={{
                        background: "rgba(255,255,255,0.03)",
                        border: "1px solid rgba(255,255,255,0.08)",
                        borderRadius: "20px",
                        padding: "40px 24px",
                        cursor: "pointer",
                        transition: "all 300ms cubic-bezier(0.16,1,0.3,1)",
                        textAlign: "center",
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLElement).style.borderColor = `${exam.color}50`;
                        (e.currentTarget as HTMLElement).style.background = `${exam.color}08`;
                        (e.currentTarget as HTMLElement).style.transform = "translateY(-4px)";
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.08)";
                        (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.03)";
                        (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
                      }}
                    >
                      <div style={{
                        width: "56px", height: "56px", borderRadius: "16px",
                        background: `${exam.color}15`,
                        border: `1px solid ${exam.color}30`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        margin: "0 auto 16px",
                        fontSize: "22px", fontWeight: 700, color: exam.color,
                        fontFamily: "'Space Grotesk', sans-serif",
                      }}>
                        {sem}
                      </div>
                      <h3 className="font-serif" style={{ fontSize: "22px", fontWeight: 400, marginBottom: "6px" }}>
                        Semester {sem}
                      </h3>
                      <div className="font-grotesk" style={{
                        fontSize: "9px", textTransform: "uppercase", letterSpacing: "0.15em",
                        color: exam.color, marginTop: "8px",
                      }}>
                        {paperCount} Papers →
                      </div>
                    </div>
                  );
                })}
                {rtuAvailableSemesters.length === 0 && (
                  <div style={{ gridColumn: "1 / -1", padding: "60px 20px", textAlign: "center" }}>
                    <p style={{ fontSize: "15px", color: "rgba(var(--text-rgb),0.35)" }}>No papers uploaded yet for this branch and year.</p>
                  </div>
                )}
              </div>
            ) : (
              /* Subject selection from dynamic listing */
              <div>
                <div style={{
                  display: "flex", alignItems: "center", gap: "10px",
                  marginBottom: "20px",
                }}>
                  <div style={{
                    padding: "6px 16px", borderRadius: "9999px",
                    background: `${exam.color}15`,
                    border: `1px solid ${exam.color}30`,
                    fontSize: "12px", fontWeight: 600,
                    color: exam.color,
                    fontFamily: "'Space Grotesk', sans-serif",
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                  }}>
                    Semester {selectedRtuSemester}
                  </div>
                  <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.06)" }} />
                  <div className="font-grotesk" style={{ fontSize: "10px", color: "rgba(var(--text-rgb),0.3)", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                    {rtuDynSubjects.length} Subjects
                  </div>
                </div>

                <div className="lib-subject-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "14px" }}>
                  {rtuDynSubjects.map((subj) => {
                    const yearsForSubj = rtuDynamicPapers.filter(p => p.semester === selectedRtuSemester && p.subject === subj).map(p => p.year).sort((a, b) => b - a);
                    return (
                      <div
                        key={subj}
                        onClick={() => {
                          setSelectedRtuSubject(subj);
                          setSelectedRtuCalendarYear(null);
                          setRequestSent(false);
                          setTimeout(() => rtuCalendarYearSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 150);
                        }}
                        style={{
                          background: "rgba(255,255,255,0.03)",
                          border: "1px solid rgba(255,255,255,0.08)",
                          borderRadius: "16px",
                          padding: "24px 20px",
                          cursor: "pointer",
                          transition: "all 300ms cubic-bezier(0.16,1,0.3,1)",
                          display: "flex",
                          alignItems: "center",
                          gap: "14px",
                        }}
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLElement).style.borderColor = `${exam.color}50`;
                          (e.currentTarget as HTMLElement).style.background = `${exam.color}08`;
                          (e.currentTarget as HTMLElement).style.transform = "translateY(-3px)";
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.08)";
                          (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.03)";
                          (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
                        }}
                      >
                        <div style={{
                          width: "44px", height: "44px", borderRadius: "12px",
                          background: `${exam.color}12`,
                          border: `1px solid ${exam.color}25`,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: "18px", flexShrink: 0,
                          fontFamily: "'Space Grotesk', sans-serif",
                          fontWeight: 700, color: exam.color,
                        }}>
                                                  </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <h4 style={{ fontSize: "14px", fontWeight: 500, color: "var(--text)", marginBottom: "4px" }}>
                            {subj}
                          </h4>
                          <div className="font-grotesk" style={{
                            fontSize: "9px", textTransform: "uppercase", letterSpacing: "0.12em",
                            color: exam.color,
                          }}>
                            {yearsForSubj.length} year{yearsForSubj.length !== 1 ? 's' : ''} available · {yearsForSubj.slice(0, 3).join(', ')}{yearsForSubj.length > 3 ? '...' : ''}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </section>
        )}

        {/* ── RTU Calendar Year Grid (dynamic from available papers) ── */}
        {selectedExam && exam && isUniversityExam && selectedBranch && selectedBranchYear && selectedRtuSemester && selectedRtuSubject && !selectedRtuCalendarYear && (
          <section ref={rtuCalendarYearSectionRef} className="lib-section" style={{ padding: `0 ${isMobile ? '16px' : '40px'} 80px`, maxWidth: "1280px", margin: "0 auto", scrollMarginTop: "100px" }}>
            {/* Section header */}
            <div className="lib-section-header" style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              marginBottom: "32px",
              paddingBottom: "20px",
              borderBottom: "1px solid rgba(255,255,255,0.06)",
            }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
                  <span style={{ fontSize: "20px", fontWeight: 700, color: exam.color, fontFamily: "'Space Grotesk', sans-serif" }}>{exam.icon}</span>
                  <h2 className="font-serif" style={{ fontSize: isMobile ? "20px" : "32px", fontWeight: 300, letterSpacing: "-0.02em", lineHeight: 1.2 }}>
                    {exam.name} — Sem {selectedRtuSemester}<br />
                    <span style={{ color: "rgba(var(--text-rgb),0.7)" }}>{selectedRtuSubject}</span>{" "}
                    <span style={{ color: "rgba(var(--text-rgb),0.3)" }}>Papers</span>
                  </h2>
                </div>
                <p style={{ fontSize: "14px", color: "rgba(var(--text-rgb),0.35)", fontWeight: 300 }}>
                  {rtuDynYears.length} year{rtuDynYears.length !== 1 ? 's' : ''} available. Select a year to view the question paper.
                </p>
              </div>
              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                <button
                  onClick={() => { setSelectedRtuSubject(null); setSelectedRtuCalendarYear(null); }}
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "12px", padding: "10px 20px",
                    color: "rgba(var(--text-rgb),0.6)", fontSize: "13px",
                    fontWeight: 500, cursor: "pointer",
                    transition: "all 200ms",
                    fontFamily: "'Inter', sans-serif",
                  }}
                >
                  ← Subjects
                </button>
                <button
                  onClick={() => { setSelectedRtuSemester(null); setSelectedRtuSubject(null); setSelectedRtuCalendarYear(null); }}
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "12px", padding: "10px 20px",
                    color: "rgba(var(--text-rgb),0.6)", fontSize: "13px",
                    fontWeight: 500, cursor: "pointer",
                    transition: "all 200ms",
                    fontFamily: "'Inter', sans-serif",
                  }}
                >
                  ← Semesters
                </button>
                <button
                  onClick={() => { setSelectedExam(null); setSelectedBranch(null); setSelectedBranchYear(null); setSelectedRtuSubject(null); setSelectedRtuCalendarYear(null); setSelectedRtuSemester(null); }}
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "12px", padding: "10px 20px",
                    color: "rgba(var(--text-rgb),0.6)", fontSize: "13px",
                    fontWeight: 500, cursor: "pointer",
                    transition: "all 200ms",
                    fontFamily: "'Inter', sans-serif",
                  }}
                >
                  ← All Exams
                </button>
              </div>
            </div>

            {/* Year tiles — only showing years where papers actually exist */}
            <div className="lib-calendar-grid" style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(3, 1fr)" : "repeat(5, 1fr)", gap: "14px" }}>
              {rtuDynYears.map((year) => {
                const free = rtuCalendarYearFree(year);
                const accessible = isPro || free;
                return (
                  <div
                    key={year}
                    className={`year-tile ${!accessible ? "locked" : ""}`}
                    onClick={() => {
                      if (!accessible) {
                        if (!isLoggedIn) { window.location.href = "/login"; }
                        else { setShowUpgradeModal(true); }
                        return;
                      }
                      setSelectedRtuCalendarYear(year);
                      setRequestSent(false);
                      setTimeout(() => paperViewerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 150);
                    }}
                  >
                    {!accessible && (
                      <div style={{ position: "absolute", top: "10px", right: "10px", fontSize: "12px", opacity: 0.6 }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                      </div>
                    )}
                    {free && !isPro && (
                      <div className="font-grotesk" style={{
                        position: "absolute", top: "8px", right: "8px",
                        fontSize: "8px", textTransform: "uppercase", letterSpacing: "0.1em",
                        padding: "2px 8px", borderRadius: "9999px",
                        background: `${exam.color}20`, color: exam.color,
                      }}>Free</div>
                    )}
                    <div className="font-serif" style={{
                      fontSize: "28px", fontWeight: 300, marginBottom: "8px",
                      color: accessible ? "#EBEBEB" : "rgba(var(--text-rgb),0.3)",
                    }}>{year}</div>
                    <div className="font-grotesk" style={{
                      fontSize: "9px", textTransform: "uppercase", letterSpacing: "0.15em",
                      color: accessible ? exam.color : "rgba(var(--text-rgb),0.2)",
                    }}>
                      {exam.name} · Sem {selectedRtuSemester}
                    </div>
                    {!accessible && (
                      <div style={{ fontSize: "10px", color: "rgba(var(--text-rgb),0.25)", marginTop: "8px", fontWeight: 300 }}>Pro Only</div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ── RTU Paper Viewer (dynamic) ── */}
        {selectedExam && exam && isUniversityExam && selectedBranch && selectedBranchYear && selectedRtuSemester && selectedRtuSubject && selectedRtuCalendarYear && (
          <section ref={paperViewerRef} className="lib-section" style={{ padding: isMobile ? "0 12px 60px" : "0 40px 100px", maxWidth: "1280px", margin: "0 auto", scrollMarginTop: "80px" }}>
            <div style={{
              background: "rgba(255,255,255,0.02)",
              backdropFilter: "blur(12px)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "24px",
              overflow: "hidden",
            }}>
              {/* Viewer header */}
              <div style={{
                display: "flex", alignItems: isMobile ? "flex-start" : "center", justifyContent: "space-between",
                flexDirection: isMobile ? "column" : "row",
                padding: isMobile ? "16px 16px" : "20px 32px",
                borderBottom: "1px solid rgba(255,255,255,0.06)",
                background: "rgba(255,255,255,0.02)",
                gap: isMobile ? "12px" : "0",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                  <span style={{ fontSize: "16px", fontWeight: 700, color: exam.color, fontFamily: "'Space Grotesk', sans-serif" }}>{exam.icon}</span>
                  <div>
                    <div style={{ fontSize: isMobile ? "13px" : "15px", fontWeight: 500, color: "var(--text)", ...(isMobile ? { whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "calc(100vw - 80px)" } : {}) }}>
                      {exam.name} — Sem {selectedRtuSemester} — {selectedRtuSubject} — {selectedRtuCalendarYear}
                    </div>
                    <div className="font-grotesk" style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.15em", color: "rgba(var(--text-rgb),0.3)", marginTop: "2px" }}>
                      Question Papers
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", width: isMobile ? "100%" : "auto" }}>
                  {pdfUrl && (
                    <button
                      onClick={() => setClaritySidebarOpen(true)}
                      style={{
                        background: "linear-gradient(135deg, #f59e0b, #ef4444, #f59e0b)",
                        backgroundSize: "200% 200%",
                        animation: "shimmerAnalyze 2s ease infinite",
                        border: "none",
                        borderRadius: "10px", padding: "8px 18px",
                        color: "white", fontSize: "12px",
                        fontWeight: 700, cursor: "pointer",
                        fontFamily: "'Inter', sans-serif",
                        display: "flex", alignItems: "center", gap: "6px",
                        flex: isMobile ? "1" : "none",
                        justifyContent: "center",
                      }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" /></svg>
                      Ask Clarity
                    </button>
                  )}
                  {pdfUrl && (
                    <button
                      onClick={() => setIsFullscreen(true)}
                      aria-label="View fullscreen"
                      style={{
                        background: "rgba(255,255,255,0.06)",
                        border: "1px solid rgba(255,255,255,0.1)",
                        borderRadius: "10px", padding: "8px 16px",
                        color: "rgba(var(--text-rgb),0.7)", fontSize: "12px",
                        fontWeight: 500, cursor: "pointer",
                        fontFamily: "'Inter', sans-serif",
                        display: "flex", alignItems: "center", gap: "6px",
                      }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="15 3 21 3 21 9" />
                        <polyline points="9 21 3 21 3 15" />
                        <line x1="21" y1="3" x2="14" y2="10" />
                        <line x1="3" y1="21" x2="10" y2="14" />
                      </svg>
                      {isMobile ? "Expand" : "Fullscreen"}
                    </button>
                  )}
                  {/* Navigation buttons — desktop only */}
                  {!isMobile && (
                    <>
                      <button
                        onClick={() => { setSelectedRtuCalendarYear(null); setRequestSent(false); }}
                        style={{
                          background: "rgba(255,255,255,0.06)",
                          border: "1px solid rgba(255,255,255,0.1)",
                          borderRadius: "10px", padding: "8px 16px",
                          color: "rgba(var(--text-rgb),0.6)", fontSize: "12px",
                          fontWeight: 500, cursor: "pointer",
                          fontFamily: "'Inter', sans-serif",
                        }}
                      >
                        ← Years
                      </button>
                      <button
                        onClick={() => { setSelectedRtuSubject(null); setSelectedRtuCalendarYear(null); setRequestSent(false); }}
                        style={{
                          background: "rgba(255,255,255,0.06)",
                          border: "1px solid rgba(255,255,255,0.1)",
                          borderRadius: "10px", padding: "8px 16px",
                          color: "rgba(var(--text-rgb),0.6)", fontSize: "12px",
                          fontWeight: 500, cursor: "pointer",
                          fontFamily: "'Inter', sans-serif",
                        }}
                      >
                        ← Subjects
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => { setSelectedExam(null); setSelectedBranch(null); setSelectedBranchYear(null); setSelectedRtuSubject(null); setSelectedRtuCalendarYear(null); setSelectedRtuSemester(null); }}
                    aria-label="Close viewer"
                    style={{
                      background: "rgba(255,255,255,0.06)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: "10px", padding: "8px 16px",
                      color: "rgba(var(--text-rgb),0.6)", fontSize: "12px",
                      fontWeight: 500, cursor: "pointer",
                      fontFamily: "'Inter', sans-serif",
                      display: "flex", alignItems: "center", gap: "4px",
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                    Close
                  </button>
                </div>
              </div>

              {/* Viewer body */}
              {pdfUrl ? (
                isMobile ? (
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <div style={{ padding: "16px", background: "rgba(var(--primary-rgb),0.04)", borderBottom: "1px solid rgba(255,255,255,0.06)", textAlign: "center" }}>
                      <a
                        href={rawPdfUrl || pdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: "inline-flex", alignItems: "center", gap: "8px",
                          padding: "12px 28px", borderRadius: "14px",
                          background: "rgba(var(--primary-rgb),0.12)",
                          border: "1px solid rgba(var(--primary-rgb),0.3)",
                          color: "var(--primary)", fontSize: "14px", fontWeight: 600,
                          textDecoration: "none", fontFamily: "'Inter', sans-serif",
                        }}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>
                        Open PDF in Browser
                      </a>
                      <p style={{ fontSize: "11px", color: "rgba(var(--text-rgb),0.3)", marginTop: "8px", fontWeight: 300 }}>Tap above if the viewer below doesn’t load</p>
                    </div>
                    <iframe
                      src={`https://mozilla.github.io/pdf.js/web/viewer.html?file=${encodeURIComponent(rawPdfUrl || pdfUrl)}`}
                      style={{
                        width: "100%",
                        height: "70vh",
                        border: "none",
                        background: "#1a1a1a",
                      }}
                      title={`${exam.name} Sem ${selectedRtuSemester}${selectedRtuSubject ? ` — ${selectedRtuSubject}` : ""} ${selectedRtuCalendarYear} Paper`}
                    />
                  </div>
                ) : (
                <iframe
                  src={pdfUrl}
                  style={{
                    width: "100%",
                    height: "85vh",
                    border: "none",
                    background: "#1a1a1a",
                  }}
                  title={`${exam.name} Sem ${selectedRtuSemester}${selectedRtuSubject ? ` — ${selectedRtuSubject}` : ""} ${selectedRtuCalendarYear} Paper`}
                />
                )
              ) : pdfError ? (
              <div style={{
                padding: "120px 40px",
                display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center",
                textAlign: "center",
              }}>
                <div style={{
                  width: "80px", height: "80px", borderRadius: "24px",
                  background: `${exam.color}12`,
                  border: `1px solid ${exam.color}30`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "36px", marginBottom: "28px",
                }}><svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke={exam.color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg></div>

                <h3 className="font-serif" style={{ fontSize: "28px", fontWeight: 300, marginBottom: "12px" }}>
                  Papers <em style={{ color: exam.color }}>Coming Soon</em>
                </h3>
                <p style={{
                  fontSize: "15px", color: "rgba(var(--text-rgb),0.35)",
                  lineHeight: 1.7, maxWidth: "420px", fontWeight: 300,
                  marginBottom: "32px",
                }}>
                  {exam.name} Sem {selectedRtuSemester} {selectedRtuSubject ? `— ${selectedRtuSubject}` : ""} {selectedRtuCalendarYear} papers haven&apos;t been uploaded yet. Send a request and we&apos;ll prioritize adding them.
                </p>

                {requestSent ? (
                  <div style={{
                    display: "flex", flexDirection: "column", alignItems: "center", gap: "12px",
                  }}>
                    <div style={{
                      width: "48px", height: "48px", borderRadius: "50%",
                      background: "rgba(var(--primary-rgb),0.15)",
                      border: "1px solid rgba(var(--primary-rgb),0.3)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: "24px",
                    }}><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg></div>
                    <div style={{
                      fontSize: "15px", fontWeight: 500, color: "var(--primary)",
                    }}>Request Sent Successfully!</div>
                    <p style={{
                      fontSize: "13px", color: "rgba(var(--text-rgb),0.35)", fontWeight: 300,
                    }}>We&apos;ll notify you when these papers are available.</p>
                  </div>
                ) : (
                  <button
                    disabled={requestLoading}
                    onClick={async () => {
                      setRequestLoading(true);
                      try {
                        const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
                        await fetch(`${API_BASE}/auth/paper-request`, {
                          method: "POST",
                          headers: {
                            "Content-Type": "application/json",
                            ...(token ? { Authorization: `Bearer ${token}` } : {}),
                          },
                          body: JSON.stringify({
                            exam: `${exam.name} - Sem ${selectedRtuSemester} - ${selectedRtuSubject || 'Unknown'} - ${selectedRtuCalendarYear}`,
                            examId: exam.id,
                            year: selectedRtuCalendarYear,
                            subject: selectedRtuSubject || `Sem ${selectedRtuSemester}`,
                          }),
                        });
                      } catch {
                        // Still show success even if backend endpoint doesn't exist yet
                      }
                      setRequestLoading(false);
                      setRequestSent(true);
                    }}
                    style={{
                      background: `linear-gradient(135deg, ${exam.color}, ${exam.color}cc)`,
                      border: "none",
                      borderRadius: "14px",
                      padding: "14px 32px",
                      color: "white",
                      fontSize: "14px",
                      fontWeight: 600,
                      cursor: requestLoading ? "wait" : "pointer",
                      fontFamily: "'Inter', sans-serif",
                      display: "flex", alignItems: "center", gap: "10px",
                      transition: "all 300ms cubic-bezier(0.16,1,0.3,1)",
                      boxShadow: `0 4px 20px ${exam.color}50`,
                      opacity: requestLoading ? 0.7 : 1,
                    }}
                    onMouseEnter={(e) => {
                      if (!requestLoading) {
                        (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)";
                        (e.currentTarget as HTMLElement).style.boxShadow = `0 6px 28px ${exam.color}60`;
                      }
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
                      (e.currentTarget as HTMLElement).style.boxShadow = `0 4px 20px ${exam.color}50`;
                    }}
                  >
                    {requestLoading ? (
                      <>
                        <div style={{
                          width: "16px", height: "16px",
                          border: "2px solid rgba(255,255,255,0.3)",
                          borderTop: "2px solid white",
                          borderRadius: "50%",
                          animation: "spin 0.8s linear infinite",
                        }} />
                        Sending...
                      </>
                    ) : (
                      <>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="22" y1="2" x2="11" y2="13" />
                          <polygon points="22 2 15 22 11 13 2 9 22 2" />
                        </svg>
                        Request These Papers
                      </>
                    )}
                  </button>
                )}
              </div>
              ) : (
                <div style={{
                  padding: "80px 40px",
                  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "12px",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div style={{
                      width: "24px", height: "24px",
                      border: `2px solid ${exam.color}50`,
                      borderTop: `2px solid ${exam.color}`,
                      borderRadius: "50%",
                      animation: "spin 0.8s linear infinite",
                    }} />
                    <span style={{ fontSize: "14px", color: "rgba(var(--text-rgb),0.4)", fontWeight: 400 }}>
                      Loading paper...
                    </span>
                  </div>
                  <span style={{ fontSize: "12px", color: "rgba(var(--text-rgb),0.25)", fontStyle: "italic" }}>Sometimes it takes more time than usual, please wait</span>
                </div>
              )}
            </div>
          </section>
        )}
        {/* ── JEE Mains: Year Selection (multi-paper dynamic) ── */}
        {selectedExam && exam && isMultiPaperExam && !selectedJeeYear && (
          <section ref={jeeYearSectionRef} className="lib-section" style={{ padding: "0 40px 60px", maxWidth: "1280px", margin: "0 auto", scrollMarginTop: "100px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "32px", paddingBottom: "20px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
                  <span style={{ fontSize: "20px", fontWeight: 700, color: exam.color, fontFamily: "'Space Grotesk', sans-serif" }}>{exam.icon}</span>
                  <h2 className="font-serif" style={{ fontSize: "32px", fontWeight: 300, letterSpacing: "-0.02em" }}>
                    {exam.name} — <span style={{ color: exam.color }}>Choose Year</span>
                  </h2>
                </div>
                <p style={{ fontSize: "14px", color: "rgba(var(--text-rgb),0.35)", fontWeight: 300 }}>
                  {jeeMainsLoading ? "Loading papers from library... Sometimes it takes more time than usual, please wait." : `${jeeMainsPapers.length} papers across ${jeeMainsYears.length} years. Select a year to browse sessions.`}
                </p>
              </div>
              <button onClick={() => { setSelectedExam(null); setSelectedJeeYear(null); setSelectedJeePaper(null); }} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", padding: "10px 20px", color: "rgba(var(--text-rgb),0.6)", fontSize: "13px", fontWeight: 500, cursor: "pointer", transition: "all 200ms", fontFamily: "'Inter', sans-serif" }}>
                ← All Exams
              </button>
            </div>

            {jeeMainsLoading ? (
              <div style={{ padding: "60px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "12px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <div style={{ width: "24px", height: "24px", border: `2px solid ${exam.color}50`, borderTop: `2px solid ${exam.color}`, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                  <span style={{ fontSize: "14px", color: "rgba(var(--text-rgb),0.4)" }}>Loading papers from library...</span>
                </div>
                <span style={{ fontSize: "12px", color: "rgba(var(--text-rgb),0.25)", fontStyle: "italic" }}>Sometimes it takes more time than usual, please wait</span>
              </div>
            ) : (
              <div className="lib-calendar-grid" style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "14px" }}>
                {jeeMainsYears.map((year) => {
                  const count = jeeMainsPapers.filter(p => p.year === year).length;
                  const free = jeeMainsYears.indexOf(year) < FREE_YEARS;
                  const accessible = isPro || free;
                  return (
                    <div key={year} className={`year-tile ${!accessible ? "locked" : ""}`} onClick={() => {
                      if (!accessible) { if (!isLoggedIn) window.location.href = "/login"; else setShowUpgradeModal(true); return; }
                      setSelectedJeeYear(year); setSelectedJeePaper(null); setRequestSent(false);
                      setTimeout(() => jeePaperSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 150);
                    }}>
                      {!accessible && (<div style={{ position: "absolute", top: "10px", right: "10px", fontSize: "12px", opacity: 0.6 }}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg></div>)}
                      {free && !isPro && (<div className="font-grotesk" style={{ position: "absolute", top: "8px", right: "8px", fontSize: "8px", textTransform: "uppercase", letterSpacing: "0.1em", padding: "2px 8px", borderRadius: "9999px", background: `${exam.color}20`, color: exam.color }}>Free</div>)}
                      <div className="font-serif" style={{ fontSize: "28px", fontWeight: 300, marginBottom: "8px", color: accessible ? "#EBEBEB" : "rgba(var(--text-rgb),0.3)" }}>{year}</div>
                      <div className="font-grotesk" style={{ fontSize: "9px", textTransform: "uppercase", letterSpacing: "0.15em", color: accessible ? exam.color : "rgba(var(--text-rgb),0.2)" }}>
                        {count} Paper{count !== 1 ? "s" : ""}
                      </div>
                      {!accessible && (<div style={{ fontSize: "10px", color: "rgba(var(--text-rgb),0.25)", marginTop: "8px", fontWeight: 300 }}>Pro Only</div>)}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* ── JEE Mains: Paper List for selected year ── */}
        {selectedExam && exam && isMultiPaperExam && selectedJeeYear && !selectedJeePaper && (
          <section ref={jeePaperSectionRef} className="lib-section" style={{ padding: "0 40px 60px", maxWidth: "1280px", margin: "0 auto", scrollMarginTop: "100px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "32px", paddingBottom: "20px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
                  <span style={{ fontSize: "20px", fontWeight: 700, color: exam.color, fontFamily: "'Space Grotesk', sans-serif" }}>{exam.icon}</span>
                  <h2 className="font-serif" style={{ fontSize: "32px", fontWeight: 300, letterSpacing: "-0.02em" }}>
                    {exam.name} — {selectedJeeYear} <span style={{ color: "rgba(var(--text-rgb),0.3)" }}>{selectedExam === 'jee-advanced' ? 'Papers' : 'Sessions'}</span>
                  </h2>
                </div>
                <p style={{ fontSize: "14px", color: "rgba(var(--text-rgb),0.35)", fontWeight: 300 }}>
                  {jeeMainsForYear.length} paper{jeeMainsForYear.length !== 1 ? "s" : ""} available. {selectedExam === 'jee-advanced' ? 'Select a paper to view.' : 'Select a session to view.'}
                </p>
              </div>
              <div style={{ display: "flex", gap: "10px" }}>
                <button onClick={() => { setSelectedJeeYear(null); setSelectedJeePaper(null); }} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", padding: "10px 20px", color: "rgba(var(--text-rgb),0.6)", fontSize: "13px", fontWeight: 500, cursor: "pointer", transition: "all 200ms", fontFamily: "'Inter', sans-serif" }}>
                  ← Years
                </button>
                <button onClick={() => { setSelectedExam(null); setSelectedJeeYear(null); setSelectedJeePaper(null); }} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", padding: "10px 20px", color: "rgba(var(--text-rgb),0.6)", fontSize: "13px", fontWeight: 500, cursor: "pointer", transition: "all 200ms", fontFamily: "'Inter', sans-serif" }}>
                  ← All Exams
                </button>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "14px" }}>
              {jeeMainsForYear.map((paper) => (
                <div key={paper.fileName} onClick={() => {
                  setSelectedJeePaper(paper.fileName); setRequestSent(false);
                  setTimeout(() => paperViewerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 150);
                }} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "16px", padding: "24px 20px", cursor: "pointer", transition: "all 300ms cubic-bezier(0.16,1,0.3,1)", display: "flex", alignItems: "center", gap: "14px" }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = `${exam.color}50`; (e.currentTarget as HTMLElement).style.background = `${exam.color}08`; (e.currentTarget as HTMLElement).style.transform = "translateY(-3px)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.08)"; (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.03)"; (e.currentTarget as HTMLElement).style.transform = "translateY(0)"; }}
                >
                  <div style={{ width: "44px", height: "44px", borderRadius: "12px", background: `${exam.color}12`, border: `1px solid ${exam.color}25`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px", flexShrink: 0, fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, color: exam.color }}>
                    📄
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h4 style={{ fontSize: "14px", fontWeight: 500, color: "var(--text)", marginBottom: "4px" }}>
                      {paper.date ? `${paper.session} Session · ${paper.shift}` : paper.label}
                    </h4>
                    <div className="font-grotesk" style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.12em", color: exam.color }}>
                      {paper.date ? `${paper.date} ${paper.year}` : `${paper.year}`}
                    </div>
                  </div>
                  <div className="font-grotesk" style={{ fontSize: "9px", textTransform: "uppercase", letterSpacing: "0.15em", color: exam.color, flexShrink: 0 }}>
                    View →
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── JEE Mains: Paper Viewer ── */}
        {selectedExam && exam && isMultiPaperExam && selectedJeePaper && (
          <section ref={paperViewerRef} className="lib-section" style={{ padding: isMobile ? "0 12px 60px" : "0 40px 100px", maxWidth: "1280px", margin: "0 auto", scrollMarginTop: "80px" }}>
            <div style={{ background: "rgba(255,255,255,0.02)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "24px", overflow: "hidden" }}>
              <div style={{ display: "flex", alignItems: isMobile ? "flex-start" : "center", justifyContent: "space-between", flexDirection: isMobile ? "column" : "row", padding: isMobile ? "16px 16px" : "20px 32px", borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)", gap: isMobile ? "12px" : "0" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                  <span style={{ fontSize: "16px", fontWeight: 700, color: exam.color, fontFamily: "'Space Grotesk', sans-serif" }}>{exam.icon}</span>
                  <div>
                    <div style={{ fontSize: isMobile ? "13px" : "15px", fontWeight: 500, color: "var(--text)" }}>
                      {exam.name} — {jeeMainsPapers.find(p => p.fileName === selectedJeePaper)?.label || selectedJeePaper}
                    </div>
                    <div className="font-grotesk" style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.15em", color: "rgba(var(--text-rgb),0.3)", marginTop: "2px" }}>Question Paper</div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", width: isMobile ? "100%" : "auto" }}>
                  {pdfUrl && (
                    <button onClick={() => setClaritySidebarOpen(true)} style={{ background: "linear-gradient(135deg, #f59e0b, #ef4444, #f59e0b)", backgroundSize: "200% 200%", animation: "shimmerAnalyze 2s ease infinite", border: "none", borderRadius: "10px", padding: "8px 18px", color: "white", fontSize: "12px", fontWeight: 700, cursor: "pointer", fontFamily: "'Inter', sans-serif", display: "flex", alignItems: "center", gap: "6px", flex: isMobile ? "1" : "none", justifyContent: "center" }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" /></svg>
                      Ask Clarity
                    </button>
                  )}
                  {pdfUrl && (
                    <button onClick={() => setIsFullscreen(true)} style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "10px", padding: "8px 16px", color: "rgba(var(--text-rgb),0.7)", fontSize: "12px", fontWeight: 500, cursor: "pointer", fontFamily: "'Inter', sans-serif", display: "flex", alignItems: "center", gap: "6px" }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 3 21 3 21 9" /><polyline points="9 21 3 21 3 15" /><line x1="21" y1="3" x2="14" y2="10" /><line x1="3" y1="21" x2="10" y2="14" /></svg>
                      {isMobile ? "Expand" : "Fullscreen"}
                    </button>
                  )}
                  {!isMobile && (
                    <button onClick={() => { setSelectedJeePaper(null); setRequestSent(false); }} style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "10px", padding: "8px 16px", color: "rgba(var(--text-rgb),0.6)", fontSize: "12px", fontWeight: 500, cursor: "pointer", fontFamily: "'Inter', sans-serif" }}>← Papers</button>
                  )}
                  <button onClick={() => { setSelectedExam(null); setSelectedJeeYear(null); setSelectedJeePaper(null); }} aria-label="Close viewer" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "10px", padding: "8px 16px", color: "rgba(var(--text-rgb),0.6)", fontSize: "12px", fontWeight: 500, cursor: "pointer", fontFamily: "'Inter', sans-serif", display: "flex", alignItems: "center", gap: "4px" }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                    Close
                  </button>
                </div>
              </div>

              {pdfUrl ? (
                isMobile ? (
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <div style={{ padding: "16px", background: "rgba(var(--primary-rgb),0.04)", borderBottom: "1px solid rgba(255,255,255,0.06)", textAlign: "center" }}>
                      <a href={rawPdfUrl || pdfUrl} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "12px 28px", borderRadius: "14px", background: "rgba(var(--primary-rgb),0.12)", border: "1px solid rgba(var(--primary-rgb),0.3)", color: "var(--primary)", fontSize: "14px", fontWeight: 600, textDecoration: "none", fontFamily: "'Inter', sans-serif" }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>
                        Open PDF in Browser
                      </a>
                    </div>
                    <iframe src={`https://mozilla.github.io/pdf.js/web/viewer.html?file=${encodeURIComponent(rawPdfUrl || pdfUrl)}`} style={{ width: "100%", height: "70vh", border: "none", background: "#1a1a1a" }} title={`${exam.name} ${selectedJeeYear} Paper`} />
                  </div>
                ) : (
                  <iframe src={pdfUrl} style={{ width: "100%", height: "85vh", border: "none", background: "#1a1a1a" }} title={`${exam.name} ${selectedJeeYear} Paper`} />
                )
              ) : pdfError ? (
                <div style={{ padding: "120px 40px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
                  <div style={{ width: "80px", height: "80px", borderRadius: "24px", background: `${exam.color}12`, border: `1px solid ${exam.color}30`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "36px", marginBottom: "28px" }}><svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke={exam.color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg></div>
                  <h3 className="font-serif" style={{ fontSize: "28px", fontWeight: 300, marginBottom: "12px" }}>Paper <em style={{ color: exam.color }}>Not Available</em></h3>
                  <p style={{ fontSize: "15px", color: "rgba(var(--text-rgb),0.35)", lineHeight: 1.7, maxWidth: "420px", fontWeight: 300 }}>This paper couldn&apos;t be loaded. Please try another session.</p>
                </div>
              ) : (
                <div style={{ padding: "80px 40px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "12px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div style={{ width: "24px", height: "24px", border: `2px solid ${exam.color}50`, borderTop: `2px solid ${exam.color}`, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                    <span style={{ fontSize: "14px", color: "rgba(var(--text-rgb),0.4)", fontWeight: 400 }}>Loading paper...</span>
                  </div>
                  <span style={{ fontSize: "12px", color: "rgba(var(--text-rgb),0.25)", fontStyle: "italic" }}>Sometimes it takes more time than usual, please wait</span>
                </div>
              )}
            </div>
          </section>
        )}

        {/* ── Subject Selection (CBSE only) ── */}
        {selectedExam && exam && isCbseExam && !selectedSubject && !isUniversityExam && (
          <section ref={subjectSectionRef} className="lib-section" style={{ padding: "0 40px 60px", maxWidth: "1280px", margin: "0 auto", scrollMarginTop: "100px" }}>
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              marginBottom: "32px",
              paddingBottom: "20px",
              borderBottom: "1px solid rgba(255,255,255,0.06)",
            }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
                  <span style={{ fontSize: "20px", fontWeight: 700, color: exam.color, fontFamily: "'Space Grotesk', sans-serif" }}>{exam.icon}</span>
                  <h2 className="font-serif" style={{ fontSize: "32px", fontWeight: 300, letterSpacing: "-0.02em" }}>
                    {exam.name} — <span style={{ color: "var(--primary)" }}>Choose Subject</span>
                  </h2>
                </div>
                <p style={{ fontSize: "14px", color: "rgba(var(--text-rgb),0.35)", fontWeight: 300 }}>
                  Select a subject to view previous year papers.
                </p>
              </div>
              <button
                onClick={() => { setSelectedExam(null); setSelectedYear(null); setSelectedSubject(null); }}
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "12px", padding: "10px 20px",
                  color: "rgba(var(--text-rgb),0.6)", fontSize: "13px",
                  fontWeight: 500, cursor: "pointer",
                  transition: "all 200ms",
                  fontFamily: "'Inter', sans-serif",
                }}
              >
                ← All Exams
              </button>
            </div>

            <div className="lib-subject-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "16px" }}>
              {exam.subjects.map((subject) => (
                <div
                  key={subject}
                  onClick={() => setSelectedSubject(subject)}
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: "20px",
                    padding: "28px 24px",
                    cursor: "pointer",
                    transition: "all 300ms cubic-bezier(0.16,1,0.3,1)",
                    textAlign: "center",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor = `${exam.color}50`;
                    (e.currentTarget as HTMLElement).style.background = `${exam.color}08`;
                    (e.currentTarget as HTMLElement).style.transform = "translateY(-4px)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.08)";
                    (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.03)";
                    (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
                  }}
                >

                  <h3 className="font-serif" style={{ fontSize: "20px", fontWeight: 400, marginBottom: "6px" }}>
                    {subject}
                  </h3>
                  <div className="font-grotesk" style={{
                    fontSize: "9px", textTransform: "uppercase", letterSpacing: "0.15em",
                    color: exam.color, marginTop: "8px",
                  }}>
                    View Papers →
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Year Grid ── */}
        {selectedExam && exam && !isUniversityExam && !isMultiPaperExam && (!isCbseExam || selectedSubject) && (
          <section ref={!isCbseExam ? subjectSectionRef : undefined} className="lib-section" style={{ padding: "0 40px 80px", maxWidth: "1280px", margin: "0 auto", scrollMarginTop: "100px" }}>
            {/* Section header */}
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              marginBottom: "32px",
              paddingBottom: "20px",
              borderBottom: "1px solid rgba(255,255,255,0.06)",
            }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
                  <span style={{ fontSize: "20px", fontWeight: 700, color: exam.color, fontFamily: "'Space Grotesk', sans-serif" }}>{exam.icon}</span>
                  <h2 className="font-serif" style={{ fontSize: "32px", fontWeight: 300, letterSpacing: "-0.02em" }}>
                    {exam.name}{selectedSubject ? ` — ${selectedSubject}` : ""} <span style={{ color: "rgba(var(--text-rgb),0.3)" }}>Papers</span>
                  </h2>
                </div>
                <p style={{ fontSize: "14px", color: "rgba(var(--text-rgb),0.35)", fontWeight: 300 }}>
                  Select a year to view the question paper.{" "}
                  {!isPro && (
                    <span style={{ color: "var(--primary)" }}>
                      Free plan: {FREE_YEARS} most recent years · <a href="/#pricing" style={{ color: "var(--primary)", textDecoration: "underline" }}>Upgrade for all 20</a>
                    </span>
                  )}
                </p>
              </div>
              <div style={{ display: "flex", gap: "10px" }}>
                {isCbseExam && (
                  <button
                    onClick={() => { setSelectedSubject(null); setSelectedYear(null); }}
                    style={{
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: "12px", padding: "10px 20px",
                      color: "rgba(var(--text-rgb),0.6)", fontSize: "13px",
                      fontWeight: 500, cursor: "pointer",
                      transition: "all 200ms",
                      fontFamily: "'Inter', sans-serif",
                    }}
                  >
                    ← Subjects
                  </button>
                )}
                <button
                  onClick={() => { setSelectedExam(null); setSelectedYear(null); setSelectedSubject(null); }}
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "12px", padding: "10px 20px",
                    color: "rgba(var(--text-rgb),0.6)", fontSize: "13px",
                    fontWeight: 500, cursor: "pointer",
                    transition: "all 200ms",
                    fontFamily: "'Inter', sans-serif",
                  }}
                >
                  ← All Exams
                </button>
              </div>
            </div>

            {/* Year tiles */}
            <div className="lib-calendar-grid" style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "14px" }}>
              {years.map((year) => {
                const free = isYearFree(year);
                const accessible = canAccess(year);
                return (
                  <div
                    key={year}
                    className={`year-tile ${!accessible ? "locked" : ""}`}
                    onClick={() => handleYearClick(year)}
                    style={{
                      borderColor: selectedYear === year ? `${exam.color}50` : undefined,
                      background: selectedYear === year ? `${exam.color}08` : undefined,
                    }}
                  >
                    {/* Lock icon for pro-only */}
                    {!accessible && (
                      <div style={{
                        position: "absolute", top: "10px", right: "10px",
                        fontSize: "12px", opacity: 0.6,
                      }}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg></div>
                    )}
                    {/* Free badge */}
                    {free && !isPro && (
                      <div className="font-grotesk" style={{
                        position: "absolute", top: "8px", right: "8px",
                        fontSize: "8px", textTransform: "uppercase", letterSpacing: "0.1em",
                        padding: "2px 8px", borderRadius: "9999px",
                        background: "rgba(var(--primary-rgb),0.15)",
                        color: "var(--primary)",
                      }}>Free</div>
                    )}

                    <div className="font-serif" style={{
                      fontSize: "28px", fontWeight: 300, marginBottom: "8px",
                      color: accessible ? "#EBEBEB" : "rgba(var(--text-rgb),0.3)",
                    }}>{year}</div>

                    <div className="font-grotesk" style={{
                      fontSize: "9px", textTransform: "uppercase", letterSpacing: "0.15em",
                      color: accessible ? exam.color : "rgba(var(--text-rgb),0.2)",
                    }}>
                      {exam.name}{selectedSubject ? ` · ${selectedSubject}` : ""}
                    </div>

                    {!accessible && (
                      <div style={{
                        fontSize: "10px", color: "rgba(var(--text-rgb),0.25)",
                        marginTop: "8px", fontWeight: 300,
                      }}>Pro Only</div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ── Paper Viewer ── */}
        {selectedYear && exam && (
          <section ref={paperViewerRef} className="lib-section" style={{ padding: "0 40px 100px", maxWidth: "1280px", margin: "0 auto", scrollMarginTop: "80px" }}>
            <div style={{
              background: "rgba(255,255,255,0.02)",
              backdropFilter: "blur(12px)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "24px",
              overflow: "hidden",
            }}>
              {/* Viewer header */}
              <div style={{
                display: "flex", alignItems: isMobile ? "flex-start" : "center", justifyContent: "space-between",
                flexDirection: isMobile ? "column" : "row",
                padding: isMobile ? "16px 16px" : "20px 32px",
                borderBottom: "1px solid rgba(255,255,255,0.06)",
                background: "rgba(255,255,255,0.02)",
                gap: isMobile ? "12px" : "0",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                  <span style={{ fontSize: "16px", fontWeight: 700, color: exam.color, fontFamily: "'Space Grotesk', sans-serif" }}>{exam.icon}</span>
                  <div>
                    <div style={{ fontSize: isMobile ? "13px" : "15px", fontWeight: 500, color: "var(--text)" }}>
                      {exam.name} — {selectedYear}{selectedSubject ? ` · ${selectedSubject}` : ""}
                    </div>
                    <div className="font-grotesk" style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.15em", color: "rgba(var(--text-rgb),0.3)", marginTop: "2px" }}>
                      Question Paper
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: "8px", width: isMobile ? "100%" : "auto" }}>
                  {pdfUrl && (
                    <button
                      onClick={() => setClaritySidebarOpen(true)}
                      style={{
                        background: "linear-gradient(135deg, #f59e0b, #ef4444, #f59e0b)",
                        backgroundSize: "200% 200%",
                        animation: "shimmerAnalyze 2s ease infinite",
                        border: "none",
                        borderRadius: "10px", padding: "8px 18px",
                        color: "white", fontSize: "12px",
                        fontWeight: 700, cursor: "pointer",
                        fontFamily: "'Inter', sans-serif",
                        display: "flex", alignItems: "center", gap: "6px",
                        flex: isMobile ? "1" : "none",
                        justifyContent: "center",
                      }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" /></svg>
                      Ask Clarity
                    </button>
                  )}
                  {pdfUrl && (
                    <button
                      onClick={() => setIsFullscreen(true)}
                      style={{
                        background: "rgba(255,255,255,0.06)",
                        border: "1px solid rgba(255,255,255,0.1)",
                        borderRadius: "10px", padding: "8px 16px",
                        color: "rgba(var(--text-rgb),0.7)", fontSize: "12px",
                        fontWeight: 500, cursor: "pointer",
                        fontFamily: "'Inter', sans-serif",
                        display: "flex", alignItems: "center", gap: "6px",
                      }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="15 3 21 3 21 9" />
                        <polyline points="9 21 3 21 3 15" />
                        <line x1="21" y1="3" x2="14" y2="10" />
                        <line x1="3" y1="21" x2="10" y2="14" />
                      </svg>
                      {!isMobile && "Fullscreen"}
                    </button>
                  )}
                  <button
                    onClick={() => { setSelectedYear(null); setPdfUrl(null); setPdfError(false); }}
                    style={{
                      background: "rgba(255,255,255,0.06)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: "10px", padding: "8px 16px",
                      color: "rgba(var(--text-rgb),0.6)", fontSize: "12px",
                      fontWeight: 500, cursor: "pointer",
                      fontFamily: "'Inter', sans-serif",
                      display: "flex", alignItems: "center", gap: "4px",
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                    {!isMobile && "Close"}
                  </button>
                </div>
              </div>

              {/* Viewer body */}
              {pdfUrl ? (
                isMobile ? (
                  <iframe
                    src={`https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(rawPdfUrl || pdfUrl)}`}
                    style={{
                      width: "100%",
                      height: "80vh",
                      border: "none",
                      background: "#1a1a1a",
                    }}
                    title={`${exam.name} ${selectedYear} Paper`}
                  />
                ) : (
                <iframe
                  src={pdfUrl}
                  style={{
                    width: "100%",
                    height: "85vh",
                    border: "none",
                    background: "#1a1a1a",
                  }}
                  title={`${exam.name} ${selectedYear} Paper`}
                />
                )
              ) : pdfError ? (
                <div style={{
                  padding: "120px 40px",
                  display: "flex", flexDirection: "column",
                  alignItems: "center", justifyContent: "center",
                  textAlign: "center",
                }}>
                  <div style={{
                    width: "80px", height: "80px", borderRadius: "24px",
                    background: "rgba(var(--primary-rgb),0.08)",
                    border: "1px solid rgba(var(--primary-rgb),0.2)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "36px", marginBottom: "28px",
                  }}><svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg></div>

                  <h3 className="font-serif" style={{ fontSize: "28px", fontWeight: 300, marginBottom: "12px" }}>
                    Paper <em style={{ color: "var(--primary)" }}>Not Available Yet</em>
                  </h3>
                  <p style={{
                    fontSize: "15px", color: "rgba(var(--text-rgb),0.35)",
                    lineHeight: 1.7, maxWidth: "420px", fontWeight: 300,
                    marginBottom: "32px",
                  }}>
                    {exam.name} {selectedYear}{selectedSubject ? ` ${selectedSubject}` : ""} paper hasn&apos;t been uploaded yet. Send a request and we&apos;ll prioritize adding it.
                  </p>

                  {requestSent ? (
                    <div style={{
                      display: "flex", flexDirection: "column", alignItems: "center", gap: "12px",
                    }}>
                      <div style={{
                        width: "48px", height: "48px", borderRadius: "50%",
                        background: "rgba(var(--primary-rgb),0.15)",
                        border: "1px solid rgba(var(--primary-rgb),0.3)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: "24px",
                      }}><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg></div>
                      <div style={{
                        fontSize: "15px", fontWeight: 500, color: "var(--primary)",
                      }}>Request Sent Successfully!</div>
                      <p style={{
                        fontSize: "13px", color: "rgba(var(--text-rgb),0.35)", fontWeight: 300,
                      }}>We&apos;ll notify you when this paper is available.</p>
                    </div>
                  ) : (
                    <button
                      disabled={requestLoading}
                      onClick={async () => {
                        setRequestLoading(true);
                        try {
                          const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
                          await fetch(`${API_BASE}/auth/paper-request`, {
                            method: "POST",
                            headers: {
                              "Content-Type": "application/json",
                              ...(token ? { Authorization: `Bearer ${token}` } : {}),
                            },
                            body: JSON.stringify({
                              exam: exam.name,
                              examId: exam.id,
                              year: selectedYear,
                              subject: selectedSubject || null,
                            }),
                          });
                        } catch {
                          // Still show success even if backend endpoint doesn't exist yet
                        }
                        setRequestLoading(false);
                        setRequestSent(true);
                      }}
                      style={{
                        background: "linear-gradient(135deg, var(--primary), var(--primary))",
                        border: "none",
                        borderRadius: "14px",
                        padding: "14px 32px",
                        color: "white",
                        fontSize: "14px",
                        fontWeight: 600,
                        cursor: requestLoading ? "wait" : "pointer",
                        fontFamily: "'Inter', sans-serif",
                        display: "flex", alignItems: "center", gap: "10px",
                        transition: "all 300ms cubic-bezier(0.16,1,0.3,1)",
                        boxShadow: "0 4px 20px rgba(var(--primary-rgb),0.3)",
                        opacity: requestLoading ? 0.7 : 1,
                      }}
                      onMouseEnter={(e) => {
                        if (!requestLoading) {
                          (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)";
                          (e.currentTarget as HTMLElement).style.boxShadow = "0 6px 28px rgba(var(--primary-rgb),0.4)";
                        }
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
                        (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 20px rgba(var(--primary-rgb),0.3)";
                      }}
                    >
                      {requestLoading ? (
                        <>
                          <div style={{
                            width: "16px", height: "16px",
                            border: "2px solid rgba(255,255,255,0.3)",
                            borderTop: "2px solid white",
                            borderRadius: "50%",
                            animation: "spin 0.8s linear infinite",
                          }} />
                          Sending...
                        </>
                      ) : (
                        <>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="22" y1="2" x2="11" y2="13" />
                            <polygon points="22 2 15 22 11 13 2 9 22 2" />
                          </svg>
                          Request This Paper
                        </>
                      )}
                    </button>
                  )}
                </div>
              ) : (
                <div style={{
                  padding: "80px 40px",
                  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "12px",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div style={{
                      width: "24px", height: "24px",
                      border: "2px solid rgba(var(--primary-rgb),0.3)",
                      borderTop: "2px solid var(--primary)",
                      borderRadius: "50%",
                      animation: "spin 0.8s linear infinite",
                    }} />
                    <span style={{ fontSize: "14px", color: "rgba(var(--text-rgb),0.4)", fontWeight: 400 }}>
                      Loading paper...
                    </span>
                  </div>
                  <span style={{ fontSize: "12px", color: "rgba(var(--text-rgb),0.25)", fontStyle: "italic" }}>Sometimes it takes more time than usual, please wait</span>
                </div>
              )}
            </div>
          </section>
        )}


        {/* ── Upgrade Modal ── */}
        {showUpgradeModal && (
          <div
            style={{
              position: "fixed", inset: 0, zIndex: 200,
              background: "rgba(0,0,0,0.7)",
              backdropFilter: "blur(8px)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
            onClick={() => setShowUpgradeModal(false)}
          >
            <div
              style={{
                background: "rgba(var(--bg-rgb),0.88)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "24px", padding: "48px",
                maxWidth: "440px", width: "90%",
                textAlign: "center",
                animation: "modalIn 0.3s cubic-bezier(0.16,1,0.3,1)",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{
                width: "64px", height: "64px", borderRadius: "20px",
                background: "rgba(var(--primary-rgb),0.1)",
                border: "1px solid rgba(var(--primary-rgb),0.25)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "28px", margin: "0 auto 24px",
              }}><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l3 7h7l-5.5 4 2 7L12 16l-6.5 4 2-7L2 9h7z" /></svg></div>

              <h3 className="font-serif" style={{ fontSize: "26px", fontWeight: 300, marginBottom: "12px" }}>
                Unlock <em style={{ color: "var(--primary)" }}>All Papers</em>
              </h3>
              <p style={{
                fontSize: "14px", color: "rgba(var(--text-rgb),0.4)",
                lineHeight: 1.75, fontWeight: 300,
                marginBottom: "32px",
              }}>
                Upgrade to Pro to access all 20 years of past papers for every exam, plus unlimited AI analysis and full predictions.
              </p>

              <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
                <a href="/#pricing" style={{
                  background: "var(--primary)", color: "white",
                  borderRadius: "9999px", padding: "13px 32px",
                  fontSize: "14px", fontWeight: 600,
                  textDecoration: "none",
                  transition: "all 300ms",
                }}>
                  Upgrade to Pro — ₹499/mo
                </a>
                <button
                  onClick={() => setShowUpgradeModal(false)}
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "9999px", padding: "13px 24px",
                    color: "rgba(var(--text-rgb),0.6)", fontSize: "14px",
                    fontWeight: 500, cursor: "pointer",
                    fontFamily: "'Inter', sans-serif",
                  }}
                >
                  Maybe Later
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Footer ── */}
        <footer className="footer-wrap" style={{ background: "var(--bg)", borderTop: "1px solid rgba(255,255,255,0.05)", padding: "64px 40px 32px" }}>
          <div style={{ maxWidth: "1280px", margin: "0 auto" }}>
            <div className="footer-grid" style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: "48px", marginBottom: "60px" }}>
              <div className="footer-brand-col">
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
                  <img src="/logo.png" alt="ANALYXX" className="theme-logo" style={{ width: "36px", height: "36px", borderRadius: "9px", objectFit: "cover" }} />
                  <span className="font-serif" style={{ fontSize: "20px", fontWeight: 300 }}>ANALYXX <em style={{ color: "var(--primary)" }}>AI</em></span>
                </div>
                <p style={{ fontSize: "14px", color: "rgba(var(--text-rgb),0.3)", lineHeight: 1.75, maxWidth: "260px", fontWeight: 300 }}>
                  AI-powered exam preparation for the next generation of students.
                </p>
              </div>
              {[
                { title: "Product", links: [{ label: "Features", href: "/#features" }, { label: "Pricing", href: "/#pricing" }, { label: "Library", href: "/library" }, { label: "Changelog", href: "#" }] },
                { title: "Exams", links: [{ label: "JEE Advanced", href: "#" }, { label: "UPSC CSE", href: "#" }, { label: "NEET", href: "#" }, { label: "CAT", href: "#" }, { label: "GATE", href: "#" }] },
                { title: "Company", links: [{ label: "About", href: "/about" }, { label: "Careers", href: "#" }, { label: "Contact", href: "#" }] },
              ].map((col) => (
                <div key={col.title}>
                  <p className="font-grotesk" style={{ fontSize: "10px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.25em", color: "var(--primary)", marginBottom: "20px" }}>{col.title}</p>
                  {col.links.map((link) => (
                    <a key={link.label} href={link.href} className="nav-link" style={{ display: "block", marginBottom: "12px", fontSize: "14px", fontWeight: 300 }}>{link.label}</a>
                  ))}
                </div>
              ))}
            </div>

            <div className="footer-bottom" style={{ borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: "24px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
              <span className="font-grotesk" style={{ fontSize: "10px", color: "rgba(var(--text-rgb),0.2)", textTransform: "uppercase", letterSpacing: "0.2em" }}>
                © 2025 ANALYXX AI · All Rights Reserved
              </span>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--primary)", animation: "ping 2s infinite", display: "inline-block" }} />
                <span className="font-grotesk" style={{ fontSize: "10px", color: "var(--primary)", textTransform: "uppercase", letterSpacing: "0.2em" }}>All Systems Operational</span>
              </div>
            </div>
          </div>
        </footer>
      </div>

      {/* ── Fullscreen Overlay (outside stacking context) ── */}
      {isFullscreen && pdfUrl && exam && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 9999,
          background: "var(--bg)",
          display: "flex", flexDirection: "column",
        }}>
          {/* Fullscreen toolbar */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "12px 24px",
            background: "rgba(var(--bg-rgb),0.88)",
            borderBottom: "1px solid rgba(255,255,255,0.1)",
            flexShrink: 0,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <span style={{ fontSize: "14px", fontWeight: 700, color: exam.color, fontFamily: "'Space Grotesk', sans-serif" }}>{exam.icon}</span>
              <div>
                <div style={{ fontSize: "14px", fontWeight: 500, color: "var(--text)" }}>
                  {selectedRtuCalendarYear
                    ? `${exam.name} — Sem ${selectedRtuSemester}${selectedRtuSubject ? ` · ${selectedRtuSubject}` : ""} — ${selectedRtuCalendarYear}`
                    : `${exam.name} — ${selectedYear}${selectedSubject ? ` · ${selectedSubject}` : ""}`
                  }
                </div>
                <div className="font-grotesk" style={{ fontSize: "9px", textTransform: "uppercase", letterSpacing: "0.15em", color: "rgba(var(--text-rgb),0.3)", marginTop: "2px" }}>
                  Fullscreen Viewer
                </div>
              </div>
            </div>
            <div style={{ display: "flex", gap: "10px" }}>

              <button
                onClick={() => setClaritySidebarOpen(true)}
                style={{
                  background: "linear-gradient(135deg, #f59e0b, #ef4444, #f59e0b)",
                  backgroundSize: "200% 200%",
                  animation: "shimmerAnalyze 2s ease infinite, pulseAnalyze 2s ease-in-out infinite",
                  border: "none",
                  borderRadius: "10px", padding: "8px 22px",
                  color: "white", fontSize: "13px",
                  fontWeight: 700, cursor: "pointer",
                  fontFamily: "'Inter', sans-serif",
                  display: "flex", alignItems: "center", gap: "7px",
                  letterSpacing: "0.02em",
                  textShadow: "0 1px 2px rgba(0,0,0,0.3)",
                }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" /></svg>
                Ask Clarity
              </button>
              <button
                onClick={() => setIsFullscreen(false)}
                style={{
                  background: "rgba(255,255,255,0.1)",
                  border: "1px solid rgba(255,255,255,0.15)",
                  borderRadius: "10px", padding: "8px 20px",
                  color: "var(--text)", fontSize: "12px",
                  fontWeight: 600, cursor: "pointer",
                  fontFamily: "'Inter', sans-serif",
                  display: "flex", alignItems: "center", gap: "6px",
                  transition: "all 200ms",
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="4 14 10 14 10 20" />
                  <polyline points="20 10 14 10 14 4" />
                  <line x1="14" y1="10" x2="21" y2="3" />
                  <line x1="3" y1="21" x2="10" y2="14" />
                </svg>
                Exit Fullscreen
              </button>
            </div>
          </div>
          {/* Fullscreen PDF */}
          <iframe
            src={pdfUrl}
            style={{ flex: 1, width: "100%", border: "none", background: "#1a1a1a" }}
            title={`${exam.name} ${selectedYear} Paper - Fullscreen`}
          />
        </div>
      )}
      {/* Ask Clarity Sidebar */}
      <AskClaritySidebar
        isOpen={claritySidebarOpen}
        onClose={() => setClaritySidebarOpen(false)}
      />
    </main>
  );
}
