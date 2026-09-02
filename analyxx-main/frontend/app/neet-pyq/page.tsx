import { Metadata } from "next";
import PyqLandingPage from "../components/PyqLandingPage";

export const metadata: Metadata = {
  title: "NEET PYQ — NEET Previous Year Question Papers Free Download 2026",
  description: "Download NEET PYQs (Previous Year Question Papers) for NEET-UG. Free NEET question papers 2013-2026 with AI-powered topic predictions. Physics, Chemistry, Biology papers with solutions.",
  alternates: { canonical: "/neet-pyq" },
  openGraph: { title: "NEET PYQ — Free NEET Previous Year Papers | ANALYXX AI", description: "Access 3,000+ NEET previous year question papers with AI analysis.", url: "https://analyxx.com/neet-pyq" },
  twitter: { card: "summary_large_image", title: "NEET PYQ — Free NEET Previous Year Papers | ANALYXX AI", description: "Download NEET PYQs. 3,000+ papers with AI analysis." },
  keywords: ["NEET PYQ", "NEET pyqs", "NEET previous year papers", "NEET previous year question papers", "NEET question papers download", "NEET papers PDF", "NEET PYQ 2024", "NEET PYQ 2025", "NEET Biology PYQ", "NEET Physics PYQ", "NEET Chemistry PYQ", "NEET UG papers", "NEET old papers", "NEET solved papers", "NEET NCERT questions"],
};

const config = {
  slug: "neet", examName: "NEET", examFullName: "National Eligibility cum Entrance Test (NEET-UG)",
  heroSubtitle: "NEET PYQ Library · 3,000+ Papers",
  heroParagraph: "Download free NEET-UG PYQs from 2013 to 2026. Access previous year question papers for Physics, Chemistry, and Biology with AI-powered NCERT-mapped topic predictions.",
  stats: [{ label: "NEET Papers", value: "3,000+" }, { label: "Topic Accuracy", value: "94%" }, { label: "Students", value: "4,000+" }, { label: "Years Covered", value: "2013–2026" }],
  aboutTitle: "What is NEET?",
  aboutParagraphs: [
    "The National Eligibility cum Entrance Test (NEET-UG) is India's single largest medical entrance examination, serving as the sole gateway to MBBS, BDS, AYUSH, and nursing courses across the country.",
    "With over 20 lakh students appearing annually for approximately 1 lakh seats, NEET demands thorough preparation across Physics, Chemistry, and Biology. The exam follows NCERT syllabus closely."
  ],
  whyTitle: "Why NEET PYQs Are Essential for Medical Aspirants",
  whyIntro: "Up to 30-35% of NEET questions have direct parallels in past papers. Biology alone shows 90%+ NCERT alignment, making PYQ + NCERT the winning combination.",
  whyPoints: [
    { title: "30-35% direct question parallels", desc: "NEET paper setters draw heavily from previous papers. Concepts like Human Physiology and Genetics appear every single year without exception." },
    { title: "90% NCERT alignment", desc: "NEET Biology questions come directly from NCERT paragraphs. PYQs reveal exactly which NCERT lines are tested most frequently." },
    { title: "Master the 200-in-200 format", desc: "200 questions in 200 minutes requires extreme speed. Only real PYQ practice builds the pace needed for NEET." },
    { title: "Identify chapter-wise weightage", desc: "Human Physiology carries 20-24% of Biology marks. PYQ analysis reveals these critical weightage patterns." },
  ],
  sections: [
    { name: "Biology", detail: "Human Physiology, Genetics, Ecology, Plant Morphology, Cell Biology", papers: "1,200+ papers" },
    { name: "Physics", detail: "Mechanics, Electrostatics, Optics, Modern Physics, Thermodynamics", papers: "900+ papers" },
    { name: "Chemistry", detail: "Organic Chemistry, Physical Chemistry, Inorganic Chemistry, Biomolecules", papers: "900+ papers" },
  ],
  faqs: [
    { q: "Where can I download NEET PYQs for free?", a: "ANALYXX AI provides free access to NEET previous year question papers from 2013 to 2026. Download papers and get AI-powered analysis of topic patterns and NCERT alignment." },
    { q: "Are NEET questions repeated from previous years?", a: "Concepts repeat with 30-35% consistency. Biology chapters like Human Physiology, Genetics, and Ecology appear every year. The NCERT paragraphs tested are highly predictable." },
    { q: "How many NEET PYQ papers should I solve?", a: "Solve all available NEET papers from 2013 onwards (10+ years). Do them chapter-wise alongside NCERT reading for maximum effectiveness." },
    { q: "Which NEET chapters have highest weightage?", a: "Human Physiology (20-24%), Genetics & Evolution (12-15%), Ecology (10-12%), and Plant Morphology (10-12%) are consistently the highest-weightage Biology chapters." },
    { q: "Can ANALYXX AI predict NEET questions?", a: "ANALYXX AI identifies high-probability topics and NCERT sections with 94% accuracy by analyzing historical NEET patterns across all years." },
  ],
  keywords: [], otherExams: [],
};

export default function NeetPyqPage() { return <PyqLandingPage config={config} />; }
