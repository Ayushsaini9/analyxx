import { Metadata } from "next";
import Link from "next/link";
import BreadcrumbSchema from "../components/BreadcrumbSchema";

export const metadata: Metadata = {
  title: "Important Questions for All Exams — AI-Identified High-Probability Topics",
  description:
    "Find the most important questions for JEE, NEET, UPSC, GATE, CAT & SSC exams. AI analysis of 50,000+ papers reveals high-frequency topics and predicted questions for 2026.",
  alternates: { canonical: "/important-questions" },
  openGraph: {
    title: "Important Questions for Exams | ANALYXX AI",
    description: "AI-identified most important questions and topics for competitive exams. Based on analysis of 50,000+ papers.",
    url: "https://analyxx.com/important-questions",
  },
  keywords: ["important questions", "most asked questions", "important topics for exam", "high frequency questions", "most repeated questions", "exam important questions 2026"],
};

export default function ImportantQuestions() {
  return (
    <main style={{ background: "var(--bg)", color: "var(--text)", fontFamily: "'Inter', sans-serif", minHeight: "100vh" }}>
      <BreadcrumbSchema items={[{ name: "Home", href: "/" }, { name: "Important Questions", href: "/important-questions" }]} />

      <section style={{ padding: "140px clamp(20px, 4vw, 40px) 80px", maxWidth: "900px", margin: "0 auto", textAlign: "center" }}>
        <p style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.25em", color: "var(--primary)", marginBottom: "16px", fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600 }}>
          AI-Identified
        </p>
        <h1 style={{ fontSize: "clamp(36px, 5vw, 64px)", fontWeight: 300, lineHeight: 1.05, letterSpacing: "-0.03em", marginBottom: "24px", fontFamily: "'Newsreader', serif" }}>
          Most Important <em style={{ color: "var(--primary)" }}>Questions</em> for Your Exam
        </h1>
        <p style={{ fontSize: "17px", color: "rgba(var(--text-rgb),0.5)", lineHeight: 1.75, maxWidth: "580px", margin: "0 auto 40px", fontWeight: 300 }}>
          Not all topics are equally important. AI analysis of 50,000+ papers reveals which questions and concepts appear most frequently — so you study what actually matters.
        </p>
        <Link href="/upload" style={{ display: "inline-flex", alignItems: "center", gap: "6px", whiteSpace: "nowrap", background: "linear-gradient(135deg, var(--primary), rgba(var(--primary-rgb),0.7))", color: "white", padding: "14px 36px", borderRadius: "9999px", textDecoration: "none", fontSize: "15px", fontWeight: 600, boxShadow: "0 4px 20px rgba(var(--primary-rgb),0.3)" }}>
          Find Important Questions →
        </Link>
      </section>

      <section style={{ maxWidth: "800px", margin: "0 auto", padding: "0 clamp(20px, 4vw, 40px) 80px" }}>
        <h2 style={{ fontSize: "28px", fontWeight: 300, letterSpacing: "-0.02em", marginBottom: "16px", fontFamily: "'Newsreader', serif" }}>
          How We Identify <em style={{ color: "var(--primary)" }}>Important</em> Questions
        </h2>
        <p style={{ fontSize: "15px", lineHeight: 1.85, color: "rgba(var(--text-rgb),0.5)", fontWeight: 300, marginBottom: "16px" }}>
          Every competitive examination has a hidden structure. While the syllabus defines what <em>can</em> be asked, previous year papers reveal what <em>actually</em> gets asked. Certain topics appear in nearly every paper, while others surface only once in a decade. Understanding this distinction is the difference between studying everything and studying <em>strategically</em>.
        </p>
        <p style={{ fontSize: "15px", lineHeight: 1.85, color: "rgba(var(--text-rgb),0.5)", fontWeight: 300, marginBottom: "48px" }}>
          ANALYXX AI uses frequency analysis, pattern recognition, and trend detection to classify every topic in an exam&apos;s syllabus into importance tiers. <strong style={{ color: "var(--primary)" }}>Tier 1 topics</strong> appear in 80%+ of past papers and are virtually guaranteed to show up. <strong style={{ color: "var(--primary)" }}>Tier 2 topics</strong> appear in 40-80% of papers and are highly probable. <strong style={{ color: "var(--primary)" }}>Tier 3 topics</strong> appear sporadically and should be studied last. This tiered approach lets students maximize their score per hour of study.
        </p>

        <h2 style={{ fontSize: "28px", fontWeight: 300, letterSpacing: "-0.02em", marginBottom: "24px", fontFamily: "'Newsreader', serif" }}>
          Importance by <em style={{ color: "var(--primary)" }}>Exam</em>
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "48px" }}>
          {[
            { exam: "JEE", slug: "jee", topics: "Mechanics, Organic Chemistry, Calculus — these 3 areas alone account for ~40% of the JEE paper every year" },
            { exam: "NEET", slug: "neet", topics: "Human Physiology, Genetics, and Ecology are the most repeated Biology chapters. NCERT-based questions dominate" },
            { exam: "UPSC", slug: "upsc", topics: "Indian Polity, Environment & Ecology, and Modern History consistently form the backbone of Prelims papers" },
            { exam: "GATE", slug: "gate", topics: "Engineering Mathematics + Aptitude guarantee 25-28 marks. Core subjects follow predictable frequency patterns" },
            { exam: "CAT", slug: "cat", topics: "Arithmetic, RC passages, and Arrangements — mastering these 3 areas covers 50%+ of the CAT paper" },
            { exam: "SSC", slug: "ssc", topics: "SSC has the highest repetition rate. Trigonometry, Idioms, and Static GK questions directly repeat from past papers" },
          ].map((item) => (
            <Link key={item.slug} href={`/exams/${item.slug}`} style={{ textDecoration: "none", color: "inherit", display: "flex", gap: "16px", padding: "20px 24px", background: "rgba(255,255,255,0.02)", borderRadius: "14px", border: "1px solid rgba(255,255,255,0.05)" }}>
              <div style={{ width: "56px", height: "56px", borderRadius: "14px", background: "rgba(var(--primary-rgb),0.08)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <span style={{ fontSize: "14px", fontWeight: 700, color: "var(--primary)", fontFamily: "'Space Grotesk', sans-serif" }}>{item.exam}</span>
              </div>
              <div>
                <div style={{ fontSize: "15px", fontWeight: 500, color: "rgba(var(--text-rgb),0.8)", marginBottom: "6px" }}>Important Topics for {item.exam}</div>
                <div style={{ fontSize: "13px", lineHeight: 1.7, color: "rgba(var(--text-rgb),0.4)", fontWeight: 300 }}>{item.topics}</div>
              </div>
            </Link>
          ))}
        </div>

        <h2 style={{ fontSize: "28px", fontWeight: 300, letterSpacing: "-0.02em", marginBottom: "16px", fontFamily: "'Newsreader', serif" }}>
          The Science of <em style={{ color: "var(--primary)" }}>Question Repetition</em>
        </h2>
        <p style={{ fontSize: "15px", lineHeight: 1.85, color: "rgba(var(--text-rgb),0.5)", fontWeight: 300, marginBottom: "16px" }}>
          Exam boards operate under constraints that make repetition inevitable. They must cover a fixed syllabus, maintain a consistent difficulty level, and test core competencies every year. This means certain foundational concepts — Newton&apos;s Laws in JEE, Mendelian Genetics in NEET, Fundamental Rights in UPSC — appear repeatedly because they are central to the subject.
        </p>
        <p style={{ fontSize: "15px", lineHeight: 1.85, color: "rgba(var(--text-rgb),0.5)", fontWeight: 300, marginBottom: "48px" }}>
          ANALYXX AI quantifies this repetition with precision. Our analysis of 50,000+ papers shows that across all major Indian competitive exams, <strong style={{ color: "var(--primary)" }}>the top 30% of topics account for 65-70% of all questions</strong>. Students who identify and master these high-frequency topics first consistently score in the top percentiles. Our AI does this identification automatically, saving hundreds of hours of manual analysis.
        </p>

        <div style={{ textAlign: "center", padding: "48px 0", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
          <h2 style={{ fontSize: "32px", fontWeight: 300, letterSpacing: "-0.03em", marginBottom: "16px", fontFamily: "'Newsreader', serif" }}>
            Find <em style={{ color: "var(--primary)" }}>your</em> important questions
          </h2>
          <p style={{ fontSize: "15px", color: "rgba(var(--text-rgb),0.4)", marginBottom: "28px", fontWeight: 300 }}>Upload any exam paper and instantly see which topics matter most</p>
          <Link href="/register" style={{ display: "inline-flex", alignItems: "center", gap: "6px", whiteSpace: "nowrap", background: "linear-gradient(135deg, var(--primary), rgba(var(--primary-rgb),0.7))", color: "white", padding: "16px 44px", borderRadius: "9999px", textDecoration: "none", fontSize: "16px", fontWeight: 600, boxShadow: "0 4px 20px rgba(var(--primary-rgb),0.3)" }}>
            Analyze Papers Free →
          </Link>
        </div>
      </section>
    </main>
  );
}
