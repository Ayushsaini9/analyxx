import Link from "next/link";
import BreadcrumbSchema from "./BreadcrumbSchema";

export interface PyqPageConfig {
  slug: string;
  examName: string;
  examFullName: string;
  heroSubtitle: string;
  heroParagraph: string;
  stats: { label: string; value: string }[];
  aboutTitle: string;
  aboutParagraphs: string[];
  whyTitle: string;
  whyIntro: string;
  whyPoints: { title: string; desc: string }[];
  sections?: { name: string; detail: string; papers: string }[];
  faqs: { q: string; a: string }[];
  keywords: string[];
  otherExams: { slug: string; label: string }[];
}

export default function PyqLandingPage({ config }: { config: PyqPageConfig }) {
  const c = config;
  const allExams = ["jee", "neet", "upsc", "gate", "cat", "ssc", "cbse", "rtu"];

  return (
    <main style={{ background: "var(--bg)", color: "var(--text)", fontFamily: "'Inter', sans-serif", minHeight: "100vh" }}>
      <BreadcrumbSchema items={[{ name: "Home", href: "/" }, { name: `${c.examName} PYQ`, href: `/${c.slug}-pyq` }]} />

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        "@context": "https://schema.org", "@type": "FAQPage",
        mainEntity: c.faqs.map(f => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
      }) }} />

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        "@context": "https://schema.org", "@type": "CollectionPage",
        name: `${c.examName} Previous Year Question Papers (PYQs)`,
        description: c.heroParagraph,
        url: `https://analyxx.com/${c.slug}-pyq`,
      }) }} />

      {/* Hero */}
      <section style={{ padding: "140px clamp(20px,4vw,40px) 80px", maxWidth: "900px", margin: "0 auto", textAlign: "center" }}>
        <p style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.25em", color: "var(--primary)", marginBottom: "16px", fontFamily: "'Space Grotesk',sans-serif", fontWeight: 600 }}>{c.heroSubtitle}</p>
        <h1 style={{ fontSize: "clamp(36px,5vw,64px)", fontWeight: 300, lineHeight: 1.05, letterSpacing: "-0.03em", marginBottom: "24px", fontFamily: "'Newsreader',serif" }}>
          {c.examName} Previous Year <em style={{ color: "var(--primary)" }}>Question Papers</em>
        </h1>
        <p style={{ fontSize: "17px", color: "rgba(var(--text-rgb),0.5)", lineHeight: 1.75, maxWidth: "620px", margin: "0 auto 40px", fontWeight: 300 }}>{c.heroParagraph}</p>
        <div style={{ display: "flex", gap: "14px", justifyContent: "center", flexWrap: "wrap" }}>
          <Link href="/library" style={{ background: "linear-gradient(135deg,var(--primary),rgba(var(--primary-rgb),0.7))", color: "white", padding: "14px 36px", borderRadius: "9999px", textDecoration: "none", fontSize: "15px", fontWeight: 600, boxShadow: "0 4px 20px rgba(var(--primary-rgb),0.3)" }}>Browse {c.examName} Papers →</Link>
          <Link href={`/exams/${c.slug}`} style={{ background: "rgba(var(--text-rgb),0.04)", color: "rgba(var(--text-rgb),0.7)", padding: "14px 36px", borderRadius: "9999px", textDecoration: "none", fontSize: "15px", fontWeight: 500, border: "1px solid rgba(var(--text-rgb),0.08)" }}>{c.examName} AI Predictions</Link>
        </div>
        <div style={{ display: "flex", gap: "32px", justifyContent: "center", marginTop: "56px", flexWrap: "wrap" }}>
          {c.stats.map(s => (
            <div key={s.label} style={{ textAlign: "center" }}>
              <div style={{ fontSize: "28px", fontWeight: 300, color: "var(--primary)", fontFamily: "'Space Grotesk',sans-serif" }}>{s.value}</div>
              <div style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.15em", color: "rgba(var(--text-rgb),0.3)", marginTop: "4px", fontFamily: "'Space Grotesk',sans-serif" }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      <div style={{ maxWidth: "800px", margin: "0 auto", padding: "0 clamp(20px,4vw,40px)" }}>
        {/* About */}
        <section style={{ marginBottom: "64px" }}>
          <h2 style={{ fontSize: "28px", fontWeight: 300, letterSpacing: "-0.02em", marginBottom: "20px", fontFamily: "'Newsreader',serif" }}>{c.aboutTitle}</h2>
          {c.aboutParagraphs.map((p, i) => <p key={i} style={{ fontSize: "15px", lineHeight: 1.85, color: "rgba(var(--text-rgb),0.55)", fontWeight: 300, marginBottom: "16px" }}>{p}</p>)}
        </section>

        {/* Why PYQs */}
        <section style={{ marginBottom: "64px" }}>
          <h2 style={{ fontSize: "28px", fontWeight: 300, letterSpacing: "-0.02em", marginBottom: "20px", fontFamily: "'Newsreader',serif" }}>{c.whyTitle}</h2>
          <p style={{ fontSize: "15px", lineHeight: 1.85, color: "rgba(var(--text-rgb),0.55)", fontWeight: 300, marginBottom: "16px" }}>{c.whyIntro}</p>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {c.whyPoints.map((item, i) => (
              <div key={i} style={{ display: "flex", gap: "16px", padding: "16px 20px", background: "rgba(255,255,255,0.02)", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.05)" }}>
                <span style={{ color: "var(--primary)", fontWeight: 600, fontFamily: "'Space Grotesk',sans-serif", fontSize: "14px", flexShrink: 0 }}>{String(i + 1).padStart(2, "0")}</span>
                <div>
                  <div style={{ fontSize: "15px", fontWeight: 500, color: "rgba(var(--text-rgb),0.8)", marginBottom: "4px" }}>{item.title}</div>
                  <div style={{ fontSize: "13px", lineHeight: 1.7, color: "rgba(var(--text-rgb),0.4)", fontWeight: 300 }}>{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Sections grid */}
        {c.sections && c.sections.length > 0 && (
          <section style={{ marginBottom: "64px" }}>
            <h2 style={{ fontSize: "28px", fontWeight: 300, letterSpacing: "-0.02em", marginBottom: "20px", fontFamily: "'Newsreader',serif" }}>{c.examName} PYQs by <em style={{ color: "var(--primary)" }}>Subject</em></h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: "12px" }}>
              {c.sections.map(s => (
                <Link key={s.name} href="/library" style={{ textDecoration: "none", color: "inherit", padding: "20px", background: "rgba(255,255,255,0.02)", borderRadius: "14px", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <div style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.2em", color: "var(--primary)", fontFamily: "'Space Grotesk',sans-serif", marginBottom: "8px", fontWeight: 600 }}>{s.name}</div>
                  <div style={{ fontSize: "13px", color: "rgba(var(--text-rgb),0.4)", lineHeight: 1.6, fontWeight: 300, marginBottom: "8px" }}>{s.detail}</div>
                  <div style={{ fontSize: "12px", color: "var(--primary)", fontFamily: "'Space Grotesk',sans-serif" }}>{s.papers}</div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* FAQ */}
        <section style={{ marginBottom: "64px" }}>
          <h2 style={{ fontSize: "28px", fontWeight: 300, letterSpacing: "-0.02em", marginBottom: "24px", fontFamily: "'Newsreader',serif" }}>{c.examName} PYQ — Frequently Asked <em style={{ color: "var(--primary)" }}>Questions</em></h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "1px" }}>
            {c.faqs.map((faq, i) => (
              <details key={i} style={{ background: "rgba(255,255,255,0.02)", borderRadius: i === 0 ? "12px 12px 0 0" : i === c.faqs.length - 1 ? "0 0 12px 12px" : "0" }}>
                <summary style={{ padding: "18px 24px", fontSize: "15px", fontWeight: 500, color: "rgba(var(--text-rgb),0.8)", cursor: "pointer", listStyle: "none", display: "flex", justifyContent: "space-between", alignItems: "center" }}>{faq.q}<span style={{ color: "var(--primary)", fontSize: "16px", flexShrink: 0, marginLeft: "12px" }}>+</span></summary>
                <div style={{ padding: "0 24px 18px", fontSize: "14px", lineHeight: 1.8, color: "rgba(var(--text-rgb),0.45)", fontWeight: 300 }}>{faq.a}</div>
              </details>
            ))}
          </div>
        </section>

        {/* CTA + Cross-links */}
        <section style={{ textAlign: "center", padding: "64px 0 80px", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
          <h2 style={{ fontSize: "32px", fontWeight: 300, letterSpacing: "-0.03em", marginBottom: "16px", fontFamily: "'Newsreader',serif" }}>Download {c.examName} PYQs <em style={{ color: "var(--primary)" }}>for free</em></h2>
          <p style={{ fontSize: "15px", color: "rgba(var(--text-rgb),0.4)", marginBottom: "28px", fontWeight: 300 }}>AI-powered analysis of previous year question papers</p>
          <Link href="/library" style={{ background: "linear-gradient(135deg,var(--primary),rgba(var(--primary-rgb),0.7))", color: "white", padding: "16px 44px", borderRadius: "9999px", textDecoration: "none", fontSize: "16px", fontWeight: 600, boxShadow: "0 4px 20px rgba(var(--primary-rgb),0.3)" }}>Browse {c.examName} PYQ Library →</Link>
          <div style={{ marginTop: "56px", borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: "32px" }}>
            <p style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.25em", color: "rgba(var(--text-rgb),0.3)", marginBottom: "16px", fontFamily: "'Space Grotesk',sans-serif" }}>Also available for</p>
            <div style={{ display: "flex", gap: "10px", justifyContent: "center", flexWrap: "wrap" }}>
              {allExams.filter(s => s !== c.slug).map(s => (
                <Link key={s} href={`/${s}-pyq`} style={{ padding: "8px 20px", borderRadius: "9999px", border: "1px solid rgba(255,255,255,0.08)", textDecoration: "none", fontSize: "13px", color: "rgba(var(--text-rgb),0.5)", fontWeight: 500 }}>{s.toUpperCase()} PYQ</Link>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
