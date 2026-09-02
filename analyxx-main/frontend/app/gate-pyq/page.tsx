import { Metadata } from "next";
import PyqLandingPage from "../components/PyqLandingPage";

export const metadata: Metadata = {
  title: "GATE PYQ — GATE Previous Year Question Papers Free Download 2026",
  description: "Download GATE PYQs for CSE, ECE, ME, EE, CE & all branches. Free GATE previous year question papers 2010-2026 with AI-powered topic predictions and analysis.",
  alternates: { canonical: "/gate-pyq" },
  openGraph: { title: "GATE PYQ — Free GATE Previous Year Papers | ANALYXX AI", description: "Access 4,000+ GATE previous year question papers.", url: "https://analyxx.com/gate-pyq" },
  keywords: ["GATE PYQ", "GATE pyqs", "GATE previous year papers", "GATE previous year question papers", "GATE CSE PYQ", "GATE ECE PYQ", "GATE ME PYQ", "GATE EE PYQ", "GATE papers download", "GATE PYQ 2024", "GATE PYQ 2025", "GATE solved papers", "GATE old papers", "GATE question papers PDF"],
};

const config = {
  slug: "gate", examName: "GATE", examFullName: "Graduate Aptitude Test in Engineering",
  heroSubtitle: "GATE PYQ Library · 4,000+ Papers",
  heroParagraph: "Download free GATE PYQs for all branches — CSE, ECE, ME, EE, CE and more. Access previous year papers from 2010 to 2026 with AI-powered topic frequency analysis and predictions.",
  stats: [{ label: "GATE Papers", value: "4,000+" }, { label: "Topic Accuracy", value: "94%" }, { label: "Branches", value: "30+" }, { label: "Years Covered", value: "2010–2026" }],
  aboutTitle: "What is GATE?",
  aboutParagraphs: [
    "The Graduate Aptitude Test in Engineering (GATE) is a national exam that tests undergraduate engineering knowledge. GATE scores are used for M.Tech admissions at IITs, IISc, and NITs, and PSU recruitment (ONGC, BHEL, NTPC, ISRO).",
    "Conducted jointly by IITs and IISc, GATE covers 30+ disciplines and is taken by over 8 lakh candidates annually. The emphasis is on conceptual clarity and numerical problem-solving."
  ],
  whyTitle: "Why GATE PYQs Are the Most Reliable Preparation Resource",
  whyIntro: "GATE has one of the most predictable patterns — 50-60% of questions come from the same core topics year after year. PYQ practice is the fastest route to a high score.",
  whyPoints: [
    { title: "50-60% topic consistency", desc: "In CSE, Data Structures, Algorithms, DBMS, and CN account for over 50% of the paper every year. PYQs make this crystal clear." },
    { title: "NAT questions need practice", desc: "Numerical Answer Type questions carry no negative marking but need precise calculation skills only developed through PYQ practice." },
    { title: "Engineering Math is free marks", desc: "Common across all branches, Engineering Mathematics (13-15%) follows highly predictable patterns identifiable through PYQs." },
    { title: "Branch-specific trend detection", desc: "ANALYXX AI provides branch-specific analysis — different patterns for CSE vs ECE vs ME, tuned to your exact GATE discipline." },
  ],
  sections: [
    { name: "CSE", detail: "Data Structures, Algorithms, OS, DBMS, CN, TOC, Compiler Design", papers: "800+ papers" },
    { name: "ECE", detail: "Digital Electronics, Signals & Systems, Analog, Communications, EMT", papers: "600+ papers" },
    { name: "ME", detail: "Thermodynamics, Fluid Mechanics, SOM, Manufacturing, Heat Transfer", papers: "600+ papers" },
    { name: "EE", detail: "Electrical Machines, Power Systems, Control Systems, Signals", papers: "500+ papers" },
    { name: "CE", detail: "Structural Analysis, Geotechnical, Fluid Mechanics, Surveying", papers: "500+ papers" },
    { name: "Engineering Math", detail: "Linear Algebra, Calculus, Probability, Complex Analysis, ODE/PDE", papers: "All branches" },
  ],
  faqs: [
    { q: "Where can I download GATE PYQs for free?", a: "ANALYXX AI provides free GATE previous year papers for all branches from 2010 to 2026. Download branch-wise papers with AI-powered topic analysis." },
    { q: "How many GATE PYQ papers should I solve?", a: "Solve at least 10-15 years of papers for your branch. Do subject-wise first, then full-length mocks in the last 2 months." },
    { q: "Which GATE branch has highest PYQ repetition?", a: "CSE and ECE show the highest topic repetition rates. In CSE, Data Structures and Algorithms topics repeat with 60-70% consistency." },
    { q: "Does GATE repeat questions?", a: "GATE repeats concepts and patterns, not exact questions. 50-60% of questions test the same core topics year after year." },
    { q: "Does ANALYXX AI support all GATE branches?", a: "Yes! We analyze papers for CSE, ECE, ME, EE, CE, and other GATE disciplines with branch-specific topic classification." },
  ],
  keywords: [], otherExams: [],
};

export default function GatePyqPage() { return <PyqLandingPage config={config} />; }
