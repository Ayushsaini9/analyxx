import { Metadata } from "next";
import PyqLandingPage from "../components/PyqLandingPage";

export const metadata: Metadata = {
  title: "SSC PYQ — SSC CGL CHSL MTS Previous Year Papers Free Download 2026",
  description: "Download SSC PYQs for CGL, CHSL, MTS. Free SSC previous year question papers 2017-2026 with AI analysis. Reasoning, Math, English, GK shift-wise papers.",
  alternates: { canonical: "/ssc-pyq" },
  openGraph: { title: "SSC PYQ — Free SSC Previous Year Papers | ANALYXX AI", description: "Access 8,000+ SSC CGL, CHSL, MTS papers with AI analysis.", url: "https://analyxx.com/ssc-pyq" },
  keywords: ["SSC PYQ", "SSC pyqs", "SSC previous year papers", "SSC CGL PYQ", "SSC CHSL PYQ", "SSC MTS PYQ", "SSC question papers download", "SSC papers PDF", "SSC PYQ 2024", "SSC PYQ 2025", "SSC GK PYQ", "SSC Math PYQ", "SSC Reasoning PYQ", "SSC English PYQ", "SSC old papers", "SSC solved papers"],
};

const config = {
  slug: "ssc", examName: "SSC", examFullName: "Staff Selection Commission (SSC CGL, CHSL, MTS)",
  heroSubtitle: "SSC PYQ Library · 8,000+ Papers",
  heroParagraph: "Download free SSC CGL, CHSL & MTS PYQs from 2017 to 2026. Access shift-wise papers with AI-powered analysis for Reasoning, Math, English, and General Knowledge.",
  stats: [{ label: "SSC Papers", value: "8,000+" }, { label: "Repetition Rate", value: "40-50%" }, { label: "Students", value: "2,000+" }, { label: "Exams Covered", value: "CGL/CHSL/MTS" }],
  aboutTitle: "What is SSC?",
  aboutParagraphs: [
    "The Staff Selection Commission (SSC) conducts recruitment exams for Group B and C government posts. SSC CGL, CHSL, and MTS collectively attract over 30 lakh applicants annually.",
    "SSC exams test General Intelligence & Reasoning, Quantitative Aptitude, English Language, and General Awareness. The massive volume of shift-wise papers makes systematic PYQ analysis critical."
  ],
  whyTitle: "Why SSC PYQs Have the Highest Repetition Rate",
  whyIntro: "SSC exams are the most PYQ-dependent exams in India. 40-50% of questions have direct parallels in past papers — solving PYQs is literally the fastest route to selection.",
  whyPoints: [
    { title: "40-50% direct question parallels", desc: "SSC reuses question frameworks with different numbers. The same Trigonometry, Mensuration, and Idiom patterns repeat across shifts and years." },
    { title: "Shift-wise paper analysis", desc: "SSC conducts exams across dozens of shifts. ANALYXX AI analyzes all shifts to identify the complete question pool and common patterns." },
    { title: "Speed over difficulty", desc: "SSC tests speed more than complexity. PYQ practice with strict time limits is the most effective speed-building strategy." },
    { title: "Static GK is fully PYQ-coverable", desc: "Most Static GK questions (Polity, History, Geography) repeat from a fixed pool. 5 years of PYQs covers virtually all tested facts." },
  ],
  sections: [
    { name: "SSC CGL", detail: "Tier I & II: Reasoning, Math, English, GK, Statistics", papers: "3,000+ papers" },
    { name: "SSC CHSL", detail: "Tier I: Reasoning, Math, English, GK", papers: "2,500+ papers" },
    { name: "SSC MTS", detail: "Paper I: Reasoning, Math, English, GK", papers: "1,500+ papers" },
    { name: "SSC CPO", detail: "Paper I: Reasoning, Math, English, GK", papers: "500+ papers" },
    { name: "SSC Stenographer", detail: "Reasoning, Math, English, GK", papers: "500+ papers" },
  ],
  faqs: [
    { q: "Where can I download SSC PYQs for free?", a: "ANALYXX AI provides free SSC CGL, CHSL, and MTS papers from 2017-2026. All shift-wise papers with AI topic analysis." },
    { q: "Does SSC repeat questions?", a: "Yes! SSC has the highest repetition rate — 40-50% of questions have direct parallels in past papers. This makes PYQ practice the most efficient strategy." },
    { q: "How many SSC papers should I solve?", a: "Solve at least 5 years of shift-wise papers for your target exam. This covers thousands of questions and virtually all frequently tested topics." },
    { q: "Which SSC exam is easiest to crack?", a: "SSC MTS has the lowest difficulty, followed by CHSL, then CGL. However, all three have high competition. PYQ-based preparation works for all." },
    { q: "Does ANALYXX AI support all SSC exams?", a: "Yes! We analyze papers for SSC CGL, CHSL, MTS, CPO, and Stenographer with exam-specific and shift-specific topic classification." },
  ],
  keywords: [], otherExams: [],
};

export default function SscPyqPage() { return <PyqLandingPage config={config} />; }
