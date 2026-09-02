import { Metadata } from "next";
import PyqLandingPage from "../components/PyqLandingPage";

export const metadata: Metadata = {
  title: "CAT PYQ — CAT Previous Year Question Papers Free Download 2026",
  description: "Download CAT PYQs (Previous Year Question Papers) for CAT MBA entrance. Free CAT papers 2015-2026 with AI analysis for VARC, DILR & QA sections.",
  alternates: { canonical: "/cat-pyq" },
  openGraph: { title: "CAT PYQ — Free CAT Previous Year Papers | ANALYXX AI", description: "Access 1,500+ CAT previous year papers with AI analysis.", url: "https://analyxx.com/cat-pyq" },
  keywords: ["CAT PYQ", "CAT pyqs", "CAT previous year papers", "CAT previous year question papers", "CAT question papers download", "CAT papers PDF", "CAT PYQ 2024", "CAT PYQ 2025", "CAT VARC PYQ", "CAT DILR PYQ", "CAT QA PYQ", "IIM CAT papers", "CAT old papers", "CAT solved papers", "MBA entrance papers"],
};

const config = {
  slug: "cat", examName: "CAT", examFullName: "Common Admission Test (CAT)",
  heroSubtitle: "CAT PYQ Library · 1,500+ Papers",
  heroParagraph: "Download free CAT PYQs from 2015 to 2026. Access previous year papers for VARC, DILR, and Quantitative Ability with AI-powered section-wise analysis and question-type predictions.",
  stats: [{ label: "CAT Papers", value: "1,500+" }, { label: "Topic Accuracy", value: "94%" }, { label: "Students", value: "800+" }, { label: "Years Covered", value: "2015–2026" }],
  aboutTitle: "What is CAT?",
  aboutParagraphs: [
    "The Common Admission Test (CAT) is India's premier MBA entrance examination, administered by the Indian Institutes of Management (IIMs). CAT scores are accepted by all 21 IIMs and 1,200+ B-schools.",
    "The exam evaluates VARC (Verbal Ability & Reading Comprehension), DILR (Data Interpretation & Logical Reasoning), and QA (Quantitative Ability). Over 2.5 lakh aspirants compete for ~5,000 IIM seats."
  ],
  whyTitle: "Why CAT PYQs Are Essential for 99th Percentile",
  whyIntro: "CAT's question style follows recognizable patterns. Most 99th percentile scorers solve 5-10 years of PYQs — it builds the pattern recognition that separates toppers from the rest.",
  whyPoints: [
    { title: "Consistent concept areas", desc: "VARC passages test inference and tone. QA always covers Number Systems, Algebra, and Geometry. DILR follows predictable set structures." },
    { title: "Build test-taking speed", desc: "CAT's time pressure is extreme. Only real PYQ practice builds the pace needed to attempt 66 questions in 120 minutes." },
    { title: "Section-wise strategy", desc: "PYQs reveal that VARC is the highest-scoring section for most toppers. Understanding section patterns helps optimize attempt strategy." },
    { title: "TITA question analysis", desc: "ANALYXX AI tracks TITA (Type In The Answer) vs MCQ ratios, helping you prepare for the exact question format distribution." },
  ],
  sections: [
    { name: "VARC", detail: "Reading Comprehension, Para Jumbles, Summary, Odd One Out", papers: "500+ papers" },
    { name: "DILR", detail: "Logical Puzzles, Arrangements, Data Tables, Charts, Caselets", papers: "500+ papers" },
    { name: "Quantitative Ability", detail: "Arithmetic, Algebra, Number Systems, Geometry, Modern Math", papers: "500+ papers" },
  ],
  faqs: [
    { q: "Where can I download CAT PYQs for free?", a: "ANALYXX AI provides free CAT previous year papers from 2015 to 2026 with section-wise AI analysis for VARC, DILR, and QA." },
    { q: "Are CAT questions repeated?", a: "Exact questions are never repeated, but concept types and question patterns are highly consistent. PYQ analysis reveals these patterns." },
    { q: "How important is PYQ practice for CAT?", a: "Essential. Most 99th percentile scorers solve 5-10 years of PYQs. It's the best way to understand CAT's unique difficulty level." },
    { q: "Which CAT section should I focus on first?", a: "Start with QA for foundational concepts, then VARC for reading speed. DILR requires the most practice due to unpredictable set structures." },
    { q: "Can ANALYXX AI analyze CAT mocks?", a: "Yes! Upload any CAT paper or mock test PDF and get AI-powered classification, topic analysis, and section-wise predictions." },
  ],
  keywords: [], otherExams: [],
};

export default function CatPyqPage() { return <PyqLandingPage config={config} />; }
