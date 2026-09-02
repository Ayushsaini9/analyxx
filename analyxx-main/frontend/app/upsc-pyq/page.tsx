import { Metadata } from "next";
import PyqLandingPage from "../components/PyqLandingPage";

export const metadata: Metadata = {
  title: "UPSC PYQ — UPSC Previous Year Question Papers Free Download 2026",
  description: "Download UPSC PYQs (Previous Year Question Papers) for UPSC CSE Prelims & Mains. Free UPSC IAS question papers 2011-2026 with AI-powered topic analysis and predictions.",
  alternates: { canonical: "/upsc-pyq" },
  openGraph: { title: "UPSC PYQ — Free UPSC Previous Year Papers | ANALYXX AI", description: "Access 2,000+ UPSC CSE previous year question papers.", url: "https://analyxx.com/upsc-pyq" },
  keywords: ["UPSC PYQ", "UPSC pyqs", "UPSC previous year papers", "UPSC CSE previous year question papers", "UPSC Prelims PYQ", "UPSC Mains PYQ", "IAS question papers", "UPSC papers download", "UPSC GS papers", "UPSC PYQ 2024", "UPSC PYQ 2025", "UPSC old papers", "UPSC solved papers"],
};

const config = {
  slug: "upsc", examName: "UPSC", examFullName: "Union Public Service Commission Civil Services Examination",
  heroSubtitle: "UPSC PYQ Library · 2,000+ Papers",
  heroParagraph: "Download free UPSC CSE Prelims & Mains PYQs from 2011 to 2026. AI-powered analysis reveals high-probability topics, thematic cycles, and current affairs intersections.",
  stats: [{ label: "UPSC Papers", value: "2,000+" }, { label: "Topic Accuracy", value: "94%" }, { label: "Students", value: "1,500+" }, { label: "Years Covered", value: "2011–2026" }],
  aboutTitle: "What is UPSC CSE?",
  aboutParagraphs: [
    "The UPSC Civil Services Examination is India's most prestigious competitive exam, selecting officers for IAS, IPS, IFS, and other central services. The three-stage exam — Prelims, Mains, and Interview — spans an enormous syllabus.",
    "With over 10 lakh applicants competing for roughly 1,000 positions (0.1% success rate), strategic PYQ-based preparation is non-negotiable for serious aspirants."
  ],
  whyTitle: "Why UPSC PYQs Are the Syllabus Decoder",
  whyIntro: "The UPSC syllabus is deliberately vague. PYQs reveal what the commission actually tests versus what appears in the syllabus — making them the most important resource.",
  whyPoints: [
    { title: "PYQs decode the real syllabus", desc: "UPSC's syllabus is intentionally broad. Only PYQs reveal which specific aspects of topics like 'Indian History' or 'Geography' are actually tested." },
    { title: "Clear thematic cycles", desc: "Topics like Polity, Ecology, and Modern History follow cyclical patterns. PYQ analysis reveals these 2-3 year rotation cycles." },
    { title: "Prelims → Mains correlation", desc: "Topics introduced in Prelims often appear with greater depth in Mains the following year. PYQs reveal this cross-paper intelligence." },
    { title: "Current affairs integration", desc: "ANALYXX AI tracks how static syllabus topics intersect with current affairs — the hallmark of high-scoring UPSC answers." },
  ],
  sections: [
    { name: "Prelims GS Paper I", detail: "Polity, History, Geography, Economy, Science, Environment", papers: "800+ papers" },
    { name: "Prelims GS Paper II (CSAT)", detail: "Comprehension, Reasoning, Data Interpretation, Decision Making", papers: "400+ papers" },
    { name: "Mains GS Papers I-IV", detail: "Indian Heritage, Governance, Technology, Ethics & Integrity", papers: "800+ papers" },
  ],
  faqs: [
    { q: "Where can I download UPSC PYQs for free?", a: "ANALYXX AI provides free access to UPSC CSE Prelims & Mains papers from 2011 onwards. Download papers and get AI-powered thematic analysis." },
    { q: "Does UPSC repeat questions?", a: "UPSC rarely repeats exact questions but consistently revisits themes. Understanding these patterns through PYQ analysis gives a significant strategic advantage." },
    { q: "How many UPSC PYQ papers should I solve?", a: "Solve all Prelims PYQs from 2011 onwards (15+ years). For Mains, analyze at least 7-10 years of papers to understand answer expectations." },
    { q: "Which UPSC topics have highest repetition?", a: "Indian Polity (18-22%), Environment & Ecology (12-16%), Modern History (10-14%), and Economy (12-15%) are consistently high-weightage in Prelims." },
    { q: "Can AI help with UPSC preparation?", a: "ANALYXX AI identifies thematic cycles, current affairs correlations, and high-probability GS topics with 94% accuracy across Prelims and Mains." },
  ],
  keywords: [], otherExams: [],
};

export default function UpscPyqPage() { return <PyqLandingPage config={config} />; }
