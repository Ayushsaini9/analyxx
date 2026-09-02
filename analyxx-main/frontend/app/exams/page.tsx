import { Metadata } from "next";
import Link from "next/link";
import exams from "./examData";
import BreadcrumbSchema from "../components/BreadcrumbSchema";

export const metadata: Metadata = {
  title: "AI Exam Preparation — Previous Year Papers for All Exams",
  description:
    "AI-powered exam preparation for JEE, NEET, UPSC, GATE, CAT, SSC and more. Access previous year papers, get AI predictions, and study smarter with ANALYXX AI.",
  alternates: { canonical: "/exams" },
  openGraph: {
    title: "All Exams — AI-Powered Preparation | ANALYXX AI",
    description:
      "Browse exam-specific AI preparation tools. Previous year papers and predicted questions for JEE, NEET, UPSC, GATE, CAT, and SSC.",
    url: "https://analyxx.com/exams",
  },
};

export default function ExamsIndex() {
  return (
    <main style={{ background: "var(--bg)", color: "var(--text)", fontFamily: "'Inter', sans-serif", minHeight: "100vh" }}>
      <BreadcrumbSchema items={[{ name: "Home", href: "/" }, { name: "Exams", href: "/exams" }]} />

      <section style={{ padding: "140px 40px 80px", maxWidth: "900px", margin: "0 auto", textAlign: "center" }}>
        <p style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.25em", color: "var(--primary)", marginBottom: "16px", fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600 }}>
          Exam Preparation
        </p>
        <h1 style={{ fontSize: "clamp(36px, 5vw, 64px)", fontWeight: 300, lineHeight: 1.05, letterSpacing: "-0.03em", marginBottom: "24px", fontFamily: "'Newsreader', serif" }}>
          AI-Powered Preparation for <em style={{ color: "var(--primary)" }}>Every Exam</em>
        </h1>
        <p style={{ fontSize: "17px", color: "rgba(var(--text-rgb),0.5)", lineHeight: 1.75, maxWidth: "560px", margin: "0 auto 60px", fontWeight: 300 }}>
          Upload previous year papers for any competitive exam. ANALYXX AI analyzes patterns, predicts high-probability topics, and creates personalized study plans — all in under 2 minutes.
        </p>
      </section>

      <section style={{ maxWidth: "900px", margin: "0 auto", padding: "0 40px 100px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "16px" }}>
          {exams.map((exam) => (
            <Link key={exam.slug} href={`/exams/${exam.slug}`} style={{ textDecoration: "none", color: "inherit" }}>
              <div style={{
                background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: "20px", padding: "32px 28px", transition: "all 300ms cubic-bezier(0.16,1,0.3,1)",
              }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
                  <span style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.2em", color: "var(--primary)", fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600 }}>
                    {exam.name}
                  </span>
                  <span style={{ fontSize: "12px", color: "rgba(var(--text-rgb),0.3)" }}>→</span>
                </div>
                <h2 style={{ fontSize: "20px", fontWeight: 300, letterSpacing: "-0.02em", marginBottom: "12px", fontFamily: "'Newsreader', serif", lineHeight: 1.3 }}>
                  {exam.fullName}
                </h2>
                <p style={{ fontSize: "13px", lineHeight: 1.7, color: "rgba(var(--text-rgb),0.4)", fontWeight: 300, marginBottom: "20px" }}>
                  {exam.tagline}. {exam.stats[0].value} papers analyzed.
                </p>
                <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
                  {exam.stats.slice(0, 2).map((stat) => (
                    <div key={stat.label}>
                      <div style={{ fontSize: "16px", fontWeight: 600, color: "var(--primary)", fontFamily: "'Space Grotesk', sans-serif" }}>{stat.value}</div>
                      <div style={{ fontSize: "9px", textTransform: "uppercase", letterSpacing: "0.15em", color: "rgba(var(--text-rgb),0.25)", fontFamily: "'Space Grotesk', sans-serif" }}>{stat.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* SEO content block */}
        <div style={{ marginTop: "80px", maxWidth: "700px" }}>
          <h2 style={{ fontSize: "28px", fontWeight: 300, letterSpacing: "-0.02em", marginBottom: "20px", fontFamily: "'Newsreader', serif" }}>
            Why Choose ANALYXX AI for <em style={{ color: "var(--primary)" }}>Exam Preparation</em>?
          </h2>
          <p style={{ fontSize: "15px", lineHeight: 1.85, color: "rgba(var(--text-rgb),0.5)", fontWeight: 300, marginBottom: "16px" }}>
            Previous year question papers (PYQs) are the most effective resource for competitive exam preparation. Research shows that 40-60% of questions in major Indian exams draw from recurring concepts and patterns found in past papers. However, manually analyzing years of papers to identify these patterns is time-consuming and error-prone.
          </p>
          <p style={{ fontSize: "15px", lineHeight: 1.85, color: "rgba(var(--text-rgb),0.5)", fontWeight: 300, marginBottom: "16px" }}>
            ANALYXX AI automates this process using Natural Language Processing and machine learning. Our platform has analyzed over 50,000 exam papers across JEE, NEET, UPSC, GATE, CAT, SSC, and other major examinations, extracting over 2 million questions and classifying them into 200+ topic categories. The result: AI-powered predictions with 94% topic-level accuracy that help students focus on what matters most.
          </p>
          <p style={{ fontSize: "15px", lineHeight: 1.85, color: "rgba(var(--text-rgb),0.5)", fontWeight: 300 }}>
            Whether you&apos;re preparing for engineering entrances, medical exams, civil services, or government job tests, ANALYXX AI gives you the strategic edge that manual preparation simply cannot match. Upload any previous year paper, and get instant analysis — topic predictions, frequency heatmaps, question extraction, and personalized study plans — all in under 2 minutes.
          </p>
        </div>
      </section>
    </main>
  );
}
