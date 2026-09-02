import { Metadata } from "next";
import PyqLandingPage from "../components/PyqLandingPage";

export const metadata: Metadata = {
  title: "JEE PYQ — JEE Previous Year Question Papers Free Download 2026",
  description: "Download JEE PYQs (Previous Year Question Papers) for JEE Main & Advanced. Free JEE question papers 2015-2026 with AI-powered topic predictions and analysis. Physics, Chemistry, Mathematics.",
  alternates: { canonical: "/jee-pyq" },
  openGraph: { title: "JEE PYQ — Free JEE Previous Year Papers | ANALYXX AI", description: "Access 5,000+ JEE previous year question papers with AI analysis.", url: "https://analyxx.com/jee-pyq" },
  twitter: { card: "summary_large_image", title: "JEE PYQ — Free JEE Previous Year Papers | ANALYXX AI", description: "Download JEE Main & Advanced PYQs. 5,000+ papers with AI analysis." },
  keywords: ["JEE PYQ", "JEE pyqs", "JEE previous year papers", "JEE Main previous year question papers", "JEE Advanced PYQ", "JEE question papers download", "JEE papers PDF", "JEE Main PYQ 2024", "JEE Main PYQ 2025", "JEE Advanced PYQ 2024", "IIT JEE papers", "JEE Physics PYQ", "JEE Chemistry PYQ", "JEE Maths PYQ", "JEE old papers", "JEE solved papers"],
};

const config = {
  slug: "jee", examName: "JEE", examFullName: "Joint Entrance Examination (JEE Main & Advanced)",
  heroSubtitle: "JEE PYQ Library · 5,000+ Papers",
  heroParagraph: "Download free JEE Main & Advanced PYQs from 2015 to 2026. Access previous year question papers for Physics, Chemistry, and Mathematics with AI-powered topic predictions and pattern analysis.",
  stats: [{ label: "JEE Papers", value: "5,000+" }, { label: "Topic Accuracy", value: "94%" }, { label: "Students", value: "3,000+" }, { label: "Years Covered", value: "2015–2026" }],
  aboutTitle: "What is JEE?",
  aboutParagraphs: [
    "The Joint Entrance Examination (JEE) is India's premier engineering entrance test, conducted in two stages — JEE Main and JEE Advanced. JEE Main is the gateway to NITs, IIITs, and GFTIs, while JEE Advanced opens doors to the prestigious Indian Institutes of Technology (IITs).",
    "With over 10 lakh students competing annually for roughly 50,000 seats, JEE is among the most competitive exams globally. The exam tests deep conceptual understanding across Physics, Chemistry, and Mathematics."
  ],
  whyTitle: "Why JEE PYQs Are Essential for Cracking the Exam",
  whyIntro: "Analysis of 15 years of JEE papers reveals that 60-70% of questions are based on recurring concepts. PYQ practice is the single most effective JEE preparation strategy.",
  whyPoints: [
    { title: "60-70% concept repetition rate", desc: "Mechanics and Electrodynamics alone account for 35-40% of Physics questions every year. PYQs reveal these patterns." },
    { title: "Understand NTA's question style", desc: "Single correct, multiple correct, numerical — only PYQs teach you how concepts are actually tested in JEE." },
    { title: "Chapter-wise weightage clarity", desc: "Organic Chemistry reactions, Coordinate Geometry, and Calculus are perennial high-weightage topics revealed through PYQ analysis." },
    { title: "AI-powered prediction advantage", desc: "ANALYXX AI detects multi-year cycles — if a topic was undertested recently, it flags it as high-probability for the next paper." },
  ],
  sections: [
    { name: "Physics", detail: "Mechanics, Electrodynamics, Optics, Modern Physics, Thermodynamics", papers: "1,500+ papers" },
    { name: "Chemistry", detail: "Organic Reactions, Physical Chemistry, Inorganic Chemistry, Coordination", papers: "1,500+ papers" },
    { name: "Mathematics", detail: "Calculus, Algebra, Coordinate Geometry, Trigonometry, Probability", papers: "1,500+ papers" },
  ],
  faqs: [
    { q: "Where can I download JEE PYQs for free?", a: "ANALYXX AI provides free access to JEE Main & Advanced previous year question papers from 2015 to 2026. Visit our PYQ Library and download papers instantly with AI-powered analysis." },
    { q: "How many JEE PYQ papers should I solve?", a: "Solve at least 10-15 years of JEE Main and 10 years of JEE Advanced papers. Do them chapter-wise first, then attempt full-length for time management." },
    { q: "Does JEE repeat questions?", a: "JEE doesn't repeat exact questions but concepts recur with 60-70% consistency. Certain topics like Mechanics, Organic Chemistry, and Calculus appear every single year." },
    { q: "Are JEE Main shift-wise papers available?", a: "Yes! ANALYXX AI has shift-wise JEE Main papers from all sessions — January and April sessions, all shifts and dates." },
    { q: "Can AI predict JEE questions?", a: "ANALYXX AI identifies high-probability topics with 94% accuracy by analyzing historical patterns, not exact questions. This helps focus preparation on what's most likely to appear." },
  ],
  keywords: [],
  otherExams: [],
};

export default function JeePyqPage() {
  return <PyqLandingPage config={config} />;
}
