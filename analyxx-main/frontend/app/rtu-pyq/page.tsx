import { Metadata } from "next";
import Link from "next/link";
import BreadcrumbSchema from "../components/BreadcrumbSchema";

export const metadata: Metadata = {
  title: "RTU PYQ — RTU Previous Year Question Papers Free Download 2025",
  description:
    "Download RTU PYQs (Previous Year Question Papers) for all B.Tech branches — CS, IT, ME, CE, EE, EC. Free RTU Kota question papers for 1st to 4th year, all semesters 2015-2025. AI-powered analysis included.",
  alternates: { canonical: "/rtu-pyq" },
  openGraph: {
    title: "RTU PYQ — Free Previous Year Papers for All Branches | ANALYXX AI",
    description:
      "Access 2,000+ RTU previous year question papers. Free download for CS, IT, ME, CE, EE, EC — all semesters. AI-powered exam analysis.",
    url: "https://analyxx.com/rtu-pyq",
  },
  twitter: {
    card: "summary_large_image",
    title: "RTU PYQ — Free RTU Previous Year Papers | ANALYXX AI",
    description: "Download RTU PYQs for all B.Tech branches. 2,000+ papers with AI analysis.",
  },
  keywords: [
    "RTU PYQ",
    "RTU pyqs",
    "RTU previous year papers",
    "RTU previous year question papers",
    "RTU question papers",
    "RTU papers download",
    "RTU Kota papers",
    "RTU B.Tech papers",
    "RTU CS papers",
    "RTU IT papers",
    "RTU ME papers",
    "RTU CE papers",
    "RTU EE papers",
    "RTU EC papers",
    "RTU 1st year papers",
    "RTU 2nd year papers",
    "RTU 3rd year papers",
    "RTU 4th year papers",
    "RTU semester papers",
    "RTU exam papers PDF",
    "Rajasthan Technical University papers",
    "RTU question paper download free",
    "RTU paper 2024",
    "RTU paper 2025",
    "rtu pyq papers",
    "rtu old papers",
    "rtu model papers",
  ],
};

const branches = [
  { name: "Computer Science (CS)", subjects: "DSA, DBMS, OS, CN, AI/ML, Cloud Computing", semesters: "Sem 1–8", papers: "400+" },
  { name: "Information Technology (IT)", subjects: "DSA, DBMS, OS, CN, ML, Blockchain", semesters: "Sem 1–8", papers: "400+" },
  { name: "Mechanical Engineering (ME)", subjects: "Thermodynamics, Fluid Mechanics, SOM, Manufacturing", semesters: "Sem 1–8", papers: "300+" },
  { name: "Civil Engineering (CE)", subjects: "SOM, Fluid Mechanics, Surveying, Structural Analysis", semesters: "Sem 1–8", papers: "300+" },
  { name: "Electrical Engineering (EE)", subjects: "Electrical Machines, Power Systems, Control Systems", semesters: "Sem 1–8", papers: "300+" },
  { name: "Electronics & Communication (EC)", subjects: "Analog/Digital Electronics, Signal Processing, EMT", semesters: "Sem 1–8", papers: "300+" },
];

const semesters = [
  { year: "1st Year", sems: ["Semester 1", "Semester 2"], subjects: "Engineering Math, Physics, Chemistry, PPS, Human Values" },
  { year: "2nd Year", sems: ["Semester 3", "Semester 4"], subjects: "Branch-specific core subjects begin — DSA, DBMS, Engineering Mechanics, Analog Electronics" },
  { year: "3rd Year", sems: ["Semester 5", "Semester 6"], subjects: "Advanced subjects — OS, Compiler Design, Machine Learning, Power Systems, Structural Analysis" },
  { year: "4th Year", sems: ["Semester 7", "Semester 8"], subjects: "Electives & specializations — Big Data, IoT, Quality Management, Project" },
];

export default function RtuPyqPage() {
  return (
    <main style={{ background: "var(--bg)", color: "var(--text)", fontFamily: "'Inter', sans-serif", minHeight: "100vh" }}>
      <BreadcrumbSchema items={[{ name: "Home", href: "/" }, { name: "RTU PYQ", href: "/rtu-pyq" }]} />

      {/* FAQ Schema for RTU */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: [
              { "@type": "Question", name: "Where can I download RTU PYQs for free?", acceptedAnswer: { "@type": "Answer", text: "ANALYXX AI provides free access to RTU previous year question papers (PYQs) for all B.Tech branches — CS, IT, ME, CE, EE, EC — across all 8 semesters. Visit analyxx.com/library, select RTU, choose your branch and semester, and download papers instantly." } },
              { "@type": "Question", name: "Does RTU repeat questions from previous year papers?", acceptedAnswer: { "@type": "Answer", text: "Yes, RTU has a very high question repetition rate. Analysis shows 50-70% of RTU exam questions are directly based on or closely related to previous year questions. This makes RTU PYQ practice the most effective exam preparation strategy." } },
              { "@type": "Question", name: "How many RTU PYQ papers should I solve?", acceptedAnswer: { "@type": "Answer", text: "Solve at least 3-5 years of RTU PYQs for each subject. RTU has one of the highest question repetition rates among Indian technical universities. Solving 5 years of papers covers virtually all frequently tested topics and patterns." } },
              { "@type": "Question", name: "Are RTU PYQs available for all branches and semesters?", acceptedAnswer: { "@type": "Answer", text: "Yes, ANALYXX AI has 2,000+ RTU papers covering CS, IT, ME, CE, EE, and EC branches across all 8 semesters (1st to 4th year). Papers are available from 2015 to 2025." } },
              { "@type": "Question", name: "What is RTU Kota?", acceptedAnswer: { "@type": "Answer", text: "RTU (Rajasthan Technical University), headquartered in Kota, Rajasthan, is the largest technical university in Rajasthan. It governs B.Tech, M.Tech, MBA, and MCA programs across 200+ affiliated engineering colleges with over 2 lakh students." } },
            ],
          }),
        }}
      />

      {/* CollectionPage Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            name: "RTU Previous Year Question Papers (PYQs)",
            description: "Free download RTU PYQs for all B.Tech branches — CS, IT, ME, CE, EE, EC. 2,000+ papers from 2015-2025 with AI-powered analysis.",
            url: "https://analyxx.com/rtu-pyq",
            mainEntity: {
              "@type": "ItemList",
              itemListElement: branches.map((b, i) => ({
                "@type": "ListItem",
                position: i + 1,
                name: `RTU ${b.name} Previous Year Papers`,
                url: "https://analyxx.com/library",
              })),
            },
          }),
        }}
      />

      {/* ── Hero ── */}
      <section style={{ padding: "140px clamp(20px, 4vw, 40px) 80px", maxWidth: "900px", margin: "0 auto", textAlign: "center" }}>
        <p style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.25em", color: "var(--primary)", marginBottom: "16px", fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600 }}>
          RTU PYQ Library · 2,000+ Papers
        </p>
        <h1 style={{ fontSize: "clamp(36px, 5vw, 64px)", fontWeight: 300, lineHeight: 1.05, letterSpacing: "-0.03em", marginBottom: "24px", fontFamily: "'Newsreader', serif" }}>
          RTU Previous Year <em style={{ color: "var(--primary)" }}>Question Papers</em>
        </h1>
        <p style={{ fontSize: "17px", color: "rgba(var(--text-rgb),0.5)", lineHeight: 1.75, maxWidth: "620px", margin: "0 auto 40px", fontWeight: 300 }}>
          Download free RTU PYQs for all B.Tech branches — CS, IT, ME, CE, EE, EC. Access previous year question papers from 2015 to 2025 for all semesters. AI-powered analysis reveals high-probability topics for your upcoming RTU exam.
        </p>
        <div style={{ display: "flex", gap: "14px", justifyContent: "center", flexWrap: "wrap" }}>
          <Link href="/library" style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "linear-gradient(135deg, var(--primary), rgba(var(--primary-rgb),0.7))", color: "white", padding: "14px 36px", borderRadius: "9999px", textDecoration: "none", fontSize: "15px", fontWeight: 600, boxShadow: "0 4px 20px rgba(var(--primary-rgb),0.3)" }}>
            Browse RTU Papers →
          </Link>
          <Link href="/exams/rtu" style={{ background: "rgba(var(--text-rgb),0.04)", color: "rgba(var(--text-rgb),0.7)", padding: "14px 36px", borderRadius: "9999px", textDecoration: "none", fontSize: "15px", fontWeight: 500, border: "1px solid rgba(var(--text-rgb),0.08)" }}>
            RTU AI Predictions
          </Link>
        </div>

        {/* Stats */}
        <div style={{ display: "flex", gap: "32px", justifyContent: "center", marginTop: "56px", flexWrap: "wrap" }}>
          {[{ label: "RTU Papers", value: "2,000+" }, { label: "Branches", value: "6" }, { label: "Semesters", value: "All 8" }, { label: "Years Covered", value: "2015–2025" }].map((s) => (
            <div key={s.label} style={{ textAlign: "center" }}>
              <div style={{ fontSize: "28px", fontWeight: 300, color: "var(--primary)", fontFamily: "'Space Grotesk', sans-serif" }}>{s.value}</div>
              <div style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.15em", color: "rgba(var(--text-rgb),0.3)", marginTop: "4px", fontFamily: "'Space Grotesk', sans-serif" }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      <div style={{ maxWidth: "800px", margin: "0 auto", padding: "0 clamp(20px, 4vw, 40px)" }}>

        {/* ── What is RTU ── */}
        <section style={{ marginBottom: "64px" }}>
          <h2 style={{ fontSize: "28px", fontWeight: 300, letterSpacing: "-0.02em", marginBottom: "20px", fontFamily: "'Newsreader', serif" }}>
            What is <em style={{ color: "var(--primary)" }}>RTU Kota</em>?
          </h2>
          <p style={{ fontSize: "15px", lineHeight: 1.85, color: "rgba(var(--text-rgb),0.55)", fontWeight: 300, marginBottom: "16px" }}>
            Rajasthan Technical University (RTU), established in 2006 and headquartered in Kota, Rajasthan, is the premier technical university of the state. It affiliates over 200 engineering colleges across Rajasthan, making it one of India&apos;s largest state technical universities by student enrollment. RTU offers B.Tech programs in Computer Science, Information Technology, Mechanical Engineering, Civil Engineering, Electrical Engineering, Electronics &amp; Communication Engineering, and other specialized branches.
          </p>
          <p style={{ fontSize: "15px", lineHeight: 1.85, color: "rgba(var(--text-rgb),0.55)", fontWeight: 300 }}>
            With over 2 lakh students appearing for semester examinations each year, RTU question papers (PYQs) are among the most sought-after study resources in Rajasthan. The university follows a consistent exam pattern with internal choice, making previous year paper analysis particularly effective for exam preparation.
          </p>
        </section>

        {/* ── Why RTU PYQs ── */}
        <section style={{ marginBottom: "64px" }}>
          <h2 style={{ fontSize: "28px", fontWeight: 300, letterSpacing: "-0.02em", marginBottom: "20px", fontFamily: "'Newsreader', serif" }}>
            Why RTU PYQs Are <em style={{ color: "var(--primary)" }}>Essential</em> for Exam Success
          </h2>
          <p style={{ fontSize: "15px", lineHeight: 1.85, color: "rgba(var(--text-rgb),0.55)", fontWeight: 300, marginBottom: "16px" }}>
            RTU previous year question papers are the most reliable resource for exam preparation. Our analysis of 10+ years of RTU papers reveals that <strong style={{ color: "var(--primary)" }}>50-70% of questions</strong> in any given semester exam are directly based on or closely related to questions from previous years. For 1st year common subjects, the repetition rate is even higher at 60-75%.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {[
              { title: "50-70% question repetition rate", desc: "RTU paper setters follow predictable patterns. Certain core topics appear in every exam, making PYQ-based preparation the most efficient study strategy." },
              { title: "Understand RTU's exact exam format", desc: "RTU papers follow a specific structure — typically 5 sections with internal choice. Only PYQs reveal this format and help you practice strategic topic selection." },
              { title: "Score 15-20% higher with PYQ practice", desc: "Students who systematically solve 3-5 years of RTU PYQs consistently outperform those relying solely on textbooks and notes." },
              { title: "Branch-specific topic patterns", desc: "Each RTU branch has unique high-frequency topics. CS/IT subjects like DSA and DBMS show 60-70% repetition, while ME/CE subjects like SOM and Fluid Mechanics show 55-65%." },
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
        </section>

        {/* ── Branches ── */}
        <section style={{ marginBottom: "64px" }}>
          <h2 style={{ fontSize: "28px", fontWeight: 300, letterSpacing: "-0.02em", marginBottom: "20px", fontFamily: "'Newsreader', serif" }}>
            RTU PYQs by <em style={{ color: "var(--primary)" }}>Branch</em>
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "12px" }}>
            {branches.map((b) => (
              <Link key={b.name} href="/library" style={{ textDecoration: "none", color: "inherit", padding: "20px", background: "rgba(255,255,255,0.02)", borderRadius: "14px", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.2em", color: "var(--primary)", fontFamily: "'Space Grotesk', sans-serif", marginBottom: "8px", fontWeight: 600 }}>{b.name}</div>
                <div style={{ fontSize: "13px", color: "rgba(var(--text-rgb),0.4)", lineHeight: 1.6, fontWeight: 300, marginBottom: "8px" }}>{b.subjects}</div>
                <div style={{ fontSize: "12px", color: "var(--primary)", fontFamily: "'Space Grotesk', sans-serif" }}>{b.papers} papers · {b.semesters}</div>
              </Link>
            ))}
          </div>
        </section>

        {/* ── Semesters ── */}
        <section style={{ marginBottom: "64px" }}>
          <h2 style={{ fontSize: "28px", fontWeight: 300, letterSpacing: "-0.02em", marginBottom: "20px", fontFamily: "'Newsreader', serif" }}>
            RTU PYQs by <em style={{ color: "var(--primary)" }}>Year & Semester</em>
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {semesters.map((s) => (
              <div key={s.year} style={{ padding: "20px", background: "rgba(255,255,255,0.02)", borderRadius: "14px", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <span style={{ fontSize: "16px", fontWeight: 500, color: "rgba(var(--text-rgb),0.8)" }}>{s.year}</span>
                  <span style={{ fontSize: "12px", color: "var(--primary)", fontFamily: "'Space Grotesk', sans-serif" }}>{s.sems.join(" & ")}</span>
                </div>
                <div style={{ fontSize: "13px", color: "rgba(var(--text-rgb),0.4)", lineHeight: 1.6, fontWeight: 300 }}>{s.subjects}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── FAQ ── */}
        <section style={{ marginBottom: "64px" }}>
          <h2 style={{ fontSize: "28px", fontWeight: 300, letterSpacing: "-0.02em", marginBottom: "24px", fontFamily: "'Newsreader', serif" }}>
            RTU PYQ — Frequently Asked <em style={{ color: "var(--primary)" }}>Questions</em>
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "1px" }}>
            {[
              { q: "Where can I download RTU PYQs for free?", a: "ANALYXX AI provides free access to RTU previous year question papers for all branches — CS, IT, ME, CE, EE, EC — across all 8 semesters. Visit our PYQ Library, select RTU, choose your branch and semester, and download papers instantly. We have papers from 2015 to 2025." },
              { q: "Does RTU repeat questions from previous year papers?", a: "Yes, RTU has a very high question repetition rate. Our analysis shows that 50-70% of questions in any given RTU exam are directly based on or closely related to previous year questions. This makes PYQ practice the most effective exam preparation strategy for RTU students." },
              { q: "How many RTU PYQ papers should I solve?", a: "Solve at least 3-5 years of RTU PYQs for each subject. This covers virtually all frequently tested topics. Focus on solving papers semester-wise rather than subject-wise for better exam simulation." },
              { q: "Are RTU PYQs available for all branches and semesters?", a: "Yes! ANALYXX AI has 2,000+ RTU papers covering CS, IT, ME, CE, EE, and EC branches across all 8 semesters — 1st year to 4th year. Papers are available from 2015 to 2025." },
              { q: "What is RTU Kota?", a: "RTU (Rajasthan Technical University), headquartered in Kota, is the largest technical university in Rajasthan. It governs B.Tech, M.Tech, MBA, and MCA programs across 200+ affiliated engineering colleges with over 2 lakh students appearing for exams annually." },
            ].map((faq, i) => (
              <details key={i} style={{ background: "rgba(255,255,255,0.02)", borderRadius: i === 0 ? "12px 12px 0 0" : i === 4 ? "0 0 12px 12px" : "0" }}>
                <summary style={{ padding: "18px 24px", fontSize: "15px", fontWeight: 500, color: "rgba(var(--text-rgb),0.8)", cursor: "pointer", listStyle: "none", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  {faq.q}
                  <span style={{ color: "var(--primary)", fontSize: "16px", flexShrink: 0, marginLeft: "12px" }}>+</span>
                </summary>
                <div style={{ padding: "0 24px 18px", fontSize: "14px", lineHeight: 1.8, color: "rgba(var(--text-rgb),0.45)", fontWeight: 300 }}>{faq.a}</div>
              </details>
            ))}
          </div>
        </section>

        {/* ── CTA ── */}
        <section style={{ textAlign: "center", padding: "64px 0 80px", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
          <h2 style={{ fontSize: "32px", fontWeight: 300, letterSpacing: "-0.03em", marginBottom: "16px", fontFamily: "'Newsreader', serif" }}>
            Download RTU PYQs <em style={{ color: "var(--primary)" }}>for free</em>
          </h2>
          <p style={{ fontSize: "15px", color: "rgba(var(--text-rgb),0.4)", marginBottom: "28px", fontWeight: 300 }}>Access 2,000+ RTU previous year question papers with AI-powered analysis</p>
          <Link href="/library" style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "linear-gradient(135deg, var(--primary), rgba(var(--primary-rgb),0.7))", color: "white", padding: "16px 44px", borderRadius: "9999px", textDecoration: "none", fontSize: "16px", fontWeight: 600, boxShadow: "0 4px 20px rgba(var(--primary-rgb),0.3)" }}>
            Browse RTU PYQ Library →
          </Link>

          {/* Cross-links */}
          <div style={{ marginTop: "56px", borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: "32px" }}>
            <p style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.25em", color: "rgba(var(--text-rgb),0.3)", marginBottom: "16px", fontFamily: "'Space Grotesk', sans-serif" }}>Also available for</p>
            <div style={{ display: "flex", gap: "10px", justifyContent: "center", flexWrap: "wrap" }}>
              {["jee", "neet", "upsc", "gate", "cat", "ssc", "cbse"].map((s) => (
                <Link key={s} href={`/${s}-pyq`} style={{ padding: "8px 20px", borderRadius: "9999px", border: "1px solid rgba(255,255,255,0.08)", textDecoration: "none", fontSize: "13px", color: "rgba(var(--text-rgb),0.5)", fontWeight: 500 }}>
                  {s.toUpperCase()} PYQ
                </Link>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
