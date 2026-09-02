import { Metadata } from "next";
import Link from "next/link";
import BreadcrumbSchema from "../components/BreadcrumbSchema";

export const metadata: Metadata = {
  title: "Previous Year Question Papers (PYQs) for All Exams — Free Download",
  description:
    "Access free previous year question papers for JEE, NEET, UPSC, GATE, CAT, SSC, CBSE, and RTU exams. Download PYQs, analyze with AI, and get topic predictions for smarter exam preparation.",
  alternates: { canonical: "/previous-year-papers" },
  openGraph: {
    title: "Previous Year Papers — Free PYQ Download | ANALYXX AI",
    description: "Download previous year question papers for all major Indian exams. AI-powered analysis included.",
    url: "https://analyxx.com/previous-year-papers",
  },
  keywords: ["previous year papers", "PYQ download", "previous year question papers", "exam papers PDF", "JEE papers download", "NEET papers download", "UPSC papers download"],
};

const examsList = [
  { name: "JEE Main & Advanced", slug: "jee", papers: "5,000+", desc: "Engineering entrance — Physics, Chemistry, Mathematics" },
  { name: "NEET-UG", slug: "neet", papers: "3,000+", desc: "Medical entrance — Physics, Chemistry, Biology" },
  { name: "UPSC CSE", slug: "upsc", papers: "2,000+", desc: "Civil services — General Studies, Optional subjects" },
  { name: "GATE", slug: "gate", papers: "4,000+", desc: "M.Tech entrance — CSE, ECE, ME, EE, CE & more" },
  { name: "CAT", slug: "cat", papers: "1,500+", desc: "MBA entrance — VARC, DILR, Quantitative Ability" },
  { name: "SSC CGL/CHSL/MTS", slug: "ssc", papers: "8,000+", desc: "Government jobs — Reasoning, Math, English, GK" },
  { name: "RTU (Kota)", slug: "rtu", papers: "2,000+", desc: "B.Tech semester exams — CS, IT, ME, CE, EE, EC" },
  { name: "CBSE Class 10 & 12", slug: "cbse", papers: "2,000+", desc: "Board exams — Maths, Science, English, Social Science" },
];

export default function PreviousYearPapers() {
  return (
    <main style={{ background: "var(--bg)", color: "var(--text)", fontFamily: "'Inter', sans-serif", minHeight: "100vh" }}>
      <BreadcrumbSchema items={[{ name: "Home", href: "/" }, { name: "Previous Year Papers", href: "/previous-year-papers" }]} />

      <section style={{ padding: "140px clamp(20px, 4vw, 40px) 80px", maxWidth: "900px", margin: "0 auto", textAlign: "center" }}>
        <p style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.25em", color: "var(--primary)", marginBottom: "16px", fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600 }}>
          PYQ Library
        </p>
        <h1 style={{ fontSize: "clamp(36px, 5vw, 64px)", fontWeight: 300, lineHeight: 1.05, letterSpacing: "-0.03em", marginBottom: "24px", fontFamily: "'Newsreader', serif" }}>
          Previous Year <em style={{ color: "var(--primary)" }}>Question Papers</em>
        </h1>
        <p style={{ fontSize: "17px", color: "rgba(var(--text-rgb),0.5)", lineHeight: 1.75, maxWidth: "580px", margin: "0 auto 40px", fontWeight: 300 }}>
          Access previous year question papers for all major Indian competitive exams. Download PDFs, analyze with AI, and discover high-probability topics for your upcoming exam.
        </p>
        <Link href="/library" style={{ display: "inline-flex", alignItems: "center", gap: "6px", whiteSpace: "nowrap", background: "linear-gradient(135deg, var(--primary), rgba(var(--primary-rgb),0.7))", color: "white", padding: "14px 36px", borderRadius: "9999px", textDecoration: "none", fontSize: "15px", fontWeight: 600, boxShadow: "0 4px 20px rgba(var(--primary-rgb),0.3)" }}>
          Browse Paper Library →
        </Link>
      </section>

      <section style={{ maxWidth: "800px", margin: "0 auto", padding: "0 clamp(20px, 4vw, 40px) 80px" }}>
        <h2 style={{ fontSize: "28px", fontWeight: 300, letterSpacing: "-0.02em", marginBottom: "16px", fontFamily: "'Newsreader', serif" }}>
          What Are Previous Year <em style={{ color: "var(--primary)" }}>Question Papers</em>?
        </h2>
        <p style={{ fontSize: "15px", lineHeight: 1.85, color: "rgba(var(--text-rgb),0.5)", fontWeight: 300, marginBottom: "16px" }}>
          Previous Year Question Papers (PYQs) are the actual question papers from past years of competitive examinations. They are widely considered the single most important resource for exam preparation in India. Whether you&apos;re preparing for engineering entrances like JEE, medical exams like NEET, civil services like UPSC, or government recruitment exams like SSC, solving PYQs gives you direct insight into the exam&apos;s pattern, difficulty level, and most frequently tested topics.
        </p>
        <p style={{ fontSize: "15px", lineHeight: 1.85, color: "rgba(var(--text-rgb),0.5)", fontWeight: 300, marginBottom: "16px" }}>
          Research and analysis of Indian competitive exams reveals that <strong style={{ color: "var(--primary)" }}>40-60% of questions</strong> in any given year are based on concepts that have appeared in previous papers. This makes PYQ practice not just helpful but essential for scoring well. However, manually tracking which topics repeat, which are declining, and which are emerging across years of papers is practically impossible — which is exactly where ANALYXX AI comes in.
        </p>

        <h2 style={{ fontSize: "28px", fontWeight: 300, letterSpacing: "-0.02em", margin: "48px 0 16px", fontFamily: "'Newsreader', serif" }}>
          Why PYQs Are <em style={{ color: "var(--primary)" }}>Essential</em> for Exam Success
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "48px" }}>
          {[
            { title: "Understand the real exam pattern", desc: "Textbooks teach concepts, but only PYQs show how those concepts are actually tested. Question formats, difficulty distribution, and time pressure can only be understood through past papers." },
            { title: "Identify high-frequency topics", desc: "Certain topics appear in 80% of papers while others appear in only 10%. PYQ analysis reveals where to focus your preparation for maximum marks per hour of study." },
            { title: "Build exam-specific speed", desc: "Reading speed, calculation shortcuts, and elimination techniques are best developed through practice with real exam questions — not generic practice sets." },
            { title: "Predict upcoming questions", desc: "ANALYXX AI takes this further by using machine learning to identify cyclical patterns, emerging trends, and high-probability topics for your specific upcoming exam." },
          ].map((item, i) => (
            <div key={i} style={{ display: "flex", gap: "16px", padding: "16px 20px", background: "rgba(255,255,255,0.02)", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.05)" }}>
              <span style={{ color: "var(--primary)", fontWeight: 600, fontFamily: "'Space Grotesk', sans-serif", fontSize: "14px", flexShrink: 0 }}>{String(i + 1).padStart(2, "0")}</span>
              <div>
                <div style={{ fontSize: "15px", fontWeight: 500, color: "rgba(var(--text-rgb),0.8)", marginBottom: "4px" }}>{item.title}</div>
                <div style={{ fontSize: "13px", lineHeight: 1.7, color: "rgba(var(--text-rgb),0.4)", fontWeight: 300 }}>{item.desc}</div>
              </div>
            </div>
          ))}
        </div>

        <h2 style={{ fontSize: "28px", fontWeight: 300, letterSpacing: "-0.02em", marginBottom: "20px", fontFamily: "'Newsreader', serif" }}>
          Exams <em style={{ color: "var(--primary)" }}>Covered</em>
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "12px", marginBottom: "48px" }}>
          {examsList.map((exam) => (
            <Link key={exam.slug} href={`/${exam.slug}-pyq`} style={{ textDecoration: "none", color: "inherit", padding: "20px", background: "rgba(255,255,255,0.02)", borderRadius: "14px", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.2em", color: "var(--primary)", fontFamily: "'Space Grotesk', sans-serif", marginBottom: "8px", fontWeight: 600 }}>{exam.name}</div>
              <div style={{ fontSize: "13px", color: "rgba(var(--text-rgb),0.4)", lineHeight: 1.6, fontWeight: 300, marginBottom: "8px" }}>{exam.desc}</div>
              <div style={{ fontSize: "12px", color: "var(--primary)", fontFamily: "'Space Grotesk', sans-serif" }}>{exam.papers} papers</div>
            </Link>
          ))}
        </div>

        <div style={{ textAlign: "center", padding: "48px 0", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
          <h2 style={{ fontSize: "32px", fontWeight: 300, letterSpacing: "-0.03em", marginBottom: "16px", fontFamily: "'Newsreader', serif" }}>
            Start analyzing papers <em style={{ color: "var(--primary)" }}>for free</em>
          </h2>
          <p style={{ fontSize: "15px", color: "rgba(var(--text-rgb),0.4)", marginBottom: "28px", fontWeight: 300 }}>Upload any previous year paper and get instant AI-powered analysis</p>
          <Link href="/register" style={{ display: "inline-flex", alignItems: "center", gap: "6px", whiteSpace: "nowrap", background: "linear-gradient(135deg, var(--primary), rgba(var(--primary-rgb),0.7))", color: "white", padding: "16px 44px", borderRadius: "9999px", textDecoration: "none", fontSize: "16px", fontWeight: 600, boxShadow: "0 4px 20px rgba(var(--primary-rgb),0.3)" }}>
            Get Started Free →
          </Link>
        </div>
      </section>
    </main>
  );
}
