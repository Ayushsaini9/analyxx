import { Metadata } from "next";
import PyqLandingPage from "../components/PyqLandingPage";

export const metadata: Metadata = {
  title: "CBSE PYQ — CBSE 10th 12th Previous Year Papers Free Download 2026",
  description: "Download CBSE PYQs for Class 10 & 12 board exams. Free CBSE previous year question papers 2015-2026 with AI analysis. All subjects — Maths, Science, English, Social Science.",
  alternates: { canonical: "/cbse-pyq" },
  openGraph: { title: "CBSE PYQ — Free CBSE Board Previous Year Papers | ANALYXX AI", description: "Access CBSE 10th & 12th previous year papers with AI analysis.", url: "https://analyxx.com/cbse-pyq" },
  keywords: ["CBSE PYQ", "CBSE pyqs", "CBSE previous year papers", "CBSE 10th PYQ", "CBSE 12th PYQ", "CBSE board papers", "CBSE question papers download", "CBSE papers PDF", "CBSE PYQ 2024", "CBSE PYQ 2025", "CBSE Maths PYQ", "CBSE Science PYQ", "CBSE English PYQ", "CBSE old papers", "CBSE sample papers", "CBSE board exam papers"],
};

const config = {
  slug: "cbse", examName: "CBSE", examFullName: "Central Board of Secondary Education (CBSE Class 10 & 12)",
  heroSubtitle: "CBSE PYQ Library · Class 10 & 12",
  heroParagraph: "Download free CBSE Class 10 & 12 board exam PYQs from 2015 to 2026. All subjects covered — Maths, Science, English, Social Science, Physics, Chemistry, Biology, Accountancy & more.",
  stats: [{ label: "CBSE Papers", value: "2,000+" }, { label: "Subjects", value: "20+" }, { label: "Students", value: "1,500+" }, { label: "Years Covered", value: "2015–2026" }],
  aboutTitle: "What is CBSE Board Exam?",
  aboutParagraphs: [
    "The Central Board of Secondary Education (CBSE) conducts board examinations for Class 10 and Class 12 students across India. Over 35 lakh students appear for CBSE boards annually.",
    "CBSE board results are crucial for college admissions, competitive exam eligibility, and scholarship opportunities. The board follows NCERT syllabus, making PYQ + NCERT the most effective preparation approach."
  ],
  whyTitle: "Why CBSE PYQs Are Essential for Board Exam Success",
  whyIntro: "CBSE board papers follow extremely predictable patterns. 40-50% of questions come from previously tested concept areas, and NCERT alignment is 95%+.",
  whyPoints: [
    { title: "95%+ NCERT alignment", desc: "CBSE papers are almost entirely NCERT-based. PYQs reveal exactly which NCERT exercises, examples, and paragraphs are tested most." },
    { title: "Predictable marking schemes", desc: "CBSE follows consistent marking patterns — 1, 2, 3, and 5-mark questions with specific format expectations revealed through PYQ analysis." },
    { title: "Competency-based question trends", desc: "Since 2021, CBSE has shifted toward competency-based questions. PYQs from recent years are essential to understand this new pattern." },
    { title: "Term-wise paper analysis", desc: "ANALYXX AI tracks CBSE's term structure, internal choice patterns, and section-wise weightage to optimize exam strategy." },
  ],
  sections: [
    { name: "Class 10 Maths", detail: "Algebra, Geometry, Trigonometry, Statistics, Probability", papers: "200+ papers" },
    { name: "Class 10 Science", detail: "Physics, Chemistry, Biology — all chapters", papers: "200+ papers" },
    { name: "Class 12 Maths", detail: "Calculus, Algebra, Vectors, 3D Geometry, Probability", papers: "200+ papers" },
    { name: "Class 12 Physics", detail: "Electrostatics, Optics, Modern Physics, Magnetism", papers: "200+ papers" },
    { name: "Class 12 Chemistry", detail: "Organic, Inorganic, Physical Chemistry, Solutions", papers: "200+ papers" },
    { name: "Class 12 Biology", detail: "Genetics, Ecology, Reproduction, Biotechnology", papers: "200+ papers" },
  ],
  faqs: [
    { q: "Where can I download CBSE PYQs for free?", a: "ANALYXX AI provides free CBSE Class 10 & 12 board papers from 2015 to 2026 for all subjects. Download papers with AI-powered analysis." },
    { q: "Are CBSE board exam questions repeated?", a: "CBSE follows predictable concept patterns with 40-50% overlap. While exact questions rarely repeat, the NCERT topics and question types are highly consistent." },
    { q: "How many CBSE PYQs should I solve?", a: "Solve at least 5-7 years of CBSE papers for each subject. This covers all important question types and NCERT chapters most frequently tested." },
    { q: "Does CBSE follow NCERT syllabus only?", a: "Yes, 95%+ of CBSE questions are directly from NCERT. PYQ analysis reveals exactly which NCERT sections are tested most." },
    { q: "Can ANALYXX AI help with CBSE preparation?", a: "Yes! Upload CBSE papers and get AI-powered topic analysis, chapter-wise frequency, and predictions for upcoming board exams." },
  ],
  keywords: [], otherExams: [],
};

export default function CbsePyqPage() { return <PyqLandingPage config={config} />; }
