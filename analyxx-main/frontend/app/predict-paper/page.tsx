import { Metadata } from "next";
import Link from "next/link";
import BreadcrumbSchema from "../components/BreadcrumbSchema";

export const metadata: Metadata = {
  title: "AI Exam Predictions — Predict Your Next Exam Paper with AI",
  description:
    "Use AI to predict exam questions before your next test. ANALYXX AI analyzes previous year papers using NLP and machine learning to forecast high-probability topics for JEE, NEET, UPSC, GATE, CAT & SSC.",
  alternates: { canonical: "/predict-paper" },
  openGraph: {
    title: "Predict Exam Papers with AI | ANALYXX AI",
    description: "AI-powered exam predictions with 94% accuracy. Upload PYQs and get predicted topics for your next exam.",
    url: "https://analyxx.com/predict-paper",
  },
  keywords: ["predict exam paper", "AI exam predictions", "predicted question paper", "exam question prediction", "AI paper analysis", "topic prediction"],
};

export default function PredictPaper() {
  return (
    <main style={{ background: "var(--bg)", color: "var(--text)", fontFamily: "'Inter', sans-serif", minHeight: "100vh" }}>
      <BreadcrumbSchema items={[{ name: "Home", href: "/" }, { name: "Predict Paper", href: "/predict-paper" }]} />

      <section style={{ padding: "140px clamp(20px, 4vw, 40px) 80px", maxWidth: "900px", margin: "0 auto", textAlign: "center" }}>
        <p style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.25em", color: "var(--primary)", marginBottom: "16px", fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600 }}>
          AI Predictions
        </p>
        <h1 style={{ fontSize: "clamp(36px, 5vw, 64px)", fontWeight: 300, lineHeight: 1.05, letterSpacing: "-0.03em", marginBottom: "24px", fontFamily: "'Newsreader', serif" }}>
          Predict Your Exam Paper <em style={{ color: "var(--primary)" }}>with AI</em>
        </h1>
        <p style={{ fontSize: "17px", color: "rgba(var(--text-rgb),0.5)", lineHeight: 1.75, maxWidth: "580px", margin: "0 auto 40px", fontWeight: 300 }}>
          Stop guessing what to study. ANALYXX AI analyzes historical exam patterns and predicts high-probability topics for your next exam — with 94% accuracy.
        </p>
        <Link href="/upload" style={{ display: "inline-flex", alignItems: "center", gap: "6px", whiteSpace: "nowrap", background: "linear-gradient(135deg, var(--primary), rgba(var(--primary-rgb),0.7))", color: "white", padding: "14px 36px", borderRadius: "9999px", textDecoration: "none", fontSize: "15px", fontWeight: 600, boxShadow: "0 4px 20px rgba(var(--primary-rgb),0.3)" }}>
          Upload Paper & Predict →
        </Link>
      </section>

      <section style={{ maxWidth: "800px", margin: "0 auto", padding: "0 clamp(20px, 4vw, 40px) 80px" }}>
        <h2 style={{ fontSize: "28px", fontWeight: 300, letterSpacing: "-0.02em", marginBottom: "16px", fontFamily: "'Newsreader', serif" }}>
          How AI <em style={{ color: "var(--primary)" }}>Exam Prediction</em> Works
        </h2>
        <p style={{ fontSize: "15px", lineHeight: 1.85, color: "rgba(var(--text-rgb),0.5)", fontWeight: 300, marginBottom: "16px" }}>
          Exam prediction isn&apos;t about guessing random questions. It&apos;s about recognizing patterns that human analysis can&apos;t efficiently detect. Every competitive exam — whether JEE, NEET, UPSC, GATE, CAT, or SSC — follows predictable patterns in topic selection, difficulty progression, and concept cycling. These patterns emerge clearly when you analyze enough data over enough years.
        </p>
        <p style={{ fontSize: "15px", lineHeight: 1.85, color: "rgba(var(--text-rgb),0.5)", fontWeight: 300, marginBottom: "48px" }}>
          ANALYXX AI has processed over <strong style={{ color: "var(--primary)" }}>50,000 exam papers</strong> containing more than <strong style={{ color: "var(--primary)" }}>2 million questions</strong>. Using Natural Language Processing (NLP), each question is classified into granular topic categories. Machine learning models then analyze frequency distributions, cyclical patterns, and emerging trends across years to identify which topics have the highest probability of appearing in upcoming exams.
        </p>

        <h2 style={{ fontSize: "28px", fontWeight: 300, letterSpacing: "-0.02em", marginBottom: "24px", fontFamily: "'Newsreader', serif" }}>
          The Prediction <em style={{ color: "var(--primary)" }}>Process</em>
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "48px" }}>
          {[
            { step: "Upload", title: "Upload Previous Year Papers", desc: "Upload any exam paper as a PDF or image. Our OCR engine extracts every question with 99% accuracy, even from scanned papers." },
            { step: "Extract", title: "AI Extracts & Classifies Questions", desc: "Each question is classified into 200+ topic categories using NLP. The system identifies subject, chapter, topic, sub-topic, difficulty level, and question type." },
            { step: "Analyze", title: "Pattern Analysis Across Years", desc: "The AI compares topic distributions across all uploaded papers. It detects frequency trends, cyclical patterns, and emerging topics that indicate what's likely to appear next." },
            { step: "Predict", title: "Get High-Probability Topics", desc: "You receive a ranked list of predicted topics with confidence scores, a frequency heatmap across years, and a personalized study plan prioritizing high-yield topics." },
          ].map((item, i) => (
            <div key={i} style={{ display: "flex", gap: "20px", padding: "20px 24px", background: "rgba(255,255,255,0.02)", borderRadius: "14px", border: "1px solid rgba(255,255,255,0.05)" }}>
              <div style={{ width: "48px", height: "48px", borderRadius: "14px", background: "rgba(var(--primary-rgb),0.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <span style={{ fontSize: "16px", fontWeight: 700, color: "var(--primary)", fontFamily: "'Space Grotesk', sans-serif" }}>{String(i + 1)}</span>
              </div>
              <div>
                <div style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.2em", color: "var(--primary)", fontFamily: "'Space Grotesk', sans-serif", marginBottom: "4px", fontWeight: 600 }}>{item.step}</div>
                <div style={{ fontSize: "16px", fontWeight: 500, color: "rgba(var(--text-rgb),0.8)", marginBottom: "6px" }}>{item.title}</div>
                <div style={{ fontSize: "13px", lineHeight: 1.7, color: "rgba(var(--text-rgb),0.4)", fontWeight: 300 }}>{item.desc}</div>
              </div>
            </div>
          ))}
        </div>

        <h2 style={{ fontSize: "28px", fontWeight: 300, letterSpacing: "-0.02em", marginBottom: "16px", fontFamily: "'Newsreader', serif" }}>
          Why Our Predictions <em style={{ color: "var(--primary)" }}>Work</em>
        </h2>
        <p style={{ fontSize: "15px", lineHeight: 1.85, color: "rgba(var(--text-rgb),0.5)", fontWeight: 300, marginBottom: "16px" }}>
          ANALYXX AI achieves <strong style={{ color: "var(--primary)" }}>94% topic-level accuracy</strong> because competitive exams are inherently pattern-based. Exam boards have finite syllabi and tend to cycle through topics over 2-5 year periods. Topics that were heavily tested recently are less likely to appear again immediately, while underrepresented topics become increasingly probable. Our AI exploits these cyclical patterns alongside absolute frequency data to generate predictions that consistently outperform random topic selection by a significant margin.
        </p>
        <p style={{ fontSize: "15px", lineHeight: 1.85, color: "rgba(var(--text-rgb),0.5)", fontWeight: 300, marginBottom: "48px" }}>
          The system is continuously learning. Every new paper uploaded improves the model&apos;s understanding of exam patterns, making predictions more accurate over time. Students who use ANALYXX AI&apos;s predictions report focusing their study time 30-40% more efficiently, spending less time on low-probability topics and more time on high-yield areas.
        </p>

        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginBottom: "48px" }}>
          {["JEE", "NEET", "UPSC", "GATE", "CAT", "SSC"].map((exam) => (
            <Link key={exam} href={`/exams/${exam.toLowerCase()}`} style={{ padding: "10px 24px", borderRadius: "9999px", border: "1px solid rgba(255,255,255,0.08)", textDecoration: "none", fontSize: "14px", color: "rgba(var(--text-rgb),0.5)", fontWeight: 500 }}>
              Predict {exam} →
            </Link>
          ))}
        </div>

        <div style={{ textAlign: "center", padding: "48px 0", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
          <h2 style={{ fontSize: "32px", fontWeight: 300, letterSpacing: "-0.03em", marginBottom: "16px", fontFamily: "'Newsreader', serif" }}>
            Ready to predict your <em style={{ color: "var(--primary)" }}>next exam</em>?
          </h2>
          <p style={{ fontSize: "15px", color: "rgba(var(--text-rgb),0.4)", marginBottom: "28px", fontWeight: 300 }}>Upload a previous year paper and see AI predictions in under 2 minutes</p>
          <Link href="/register" style={{ display: "inline-flex", alignItems: "center", gap: "6px", whiteSpace: "nowrap", background: "linear-gradient(135deg, var(--primary), rgba(var(--primary-rgb),0.7))", color: "white", padding: "16px 44px", borderRadius: "9999px", textDecoration: "none", fontSize: "16px", fontWeight: 600, boxShadow: "0 4px 20px rgba(var(--primary-rgb),0.3)" }}>
            Start Predicting Free →
          </Link>
        </div>
      </section>
    </main>
  );
}
