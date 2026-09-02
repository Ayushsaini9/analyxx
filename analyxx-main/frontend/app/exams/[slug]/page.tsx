import { getExamBySlug, getAllSlugs } from "../examData";
import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import BreadcrumbSchema from "../../components/BreadcrumbSchema";

export function generateStaticParams() {
  return getAllSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const exam = getExamBySlug(slug);
  if (!exam) return {};

  return {
    title: exam.metaTitle,
    description: exam.metaDescription,
    alternates: { canonical: `/exams/${exam.slug}` },
    openGraph: {
      title: `${exam.name} Previous Year Papers & AI Predictions | ANALYXX AI`,
      description: exam.metaDescription,
      url: `https://analyxx.com/exams/${exam.slug}`,
    },
    twitter: {
      card: "summary_large_image",
      title: `${exam.name} Previous Year Papers & AI Predictions | ANALYXX AI`,
      description: exam.metaDescription,
    },
    keywords: [
      `${exam.name} previous year papers`,
      `${exam.name} PYQ`,
      `${exam.name} question papers`,
      `${exam.name} exam preparation`,
      `${exam.name} predicted questions`,
      `${exam.name} important topics`,
      `${exam.name} AI predictions`,
      `${exam.name} paper analysis`,
    ],
  };
}

export default async function ExamPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const exam = getExamBySlug(slug);
  if (!exam) notFound();

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: exam.faqs.map((faq) => ({
      "@type": "Question",
      name: faq.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.a,
      },
    })),
  };

  return (
    <main
      style={{
        background: "var(--bg)",
        color: "var(--text)",
        fontFamily: "'Inter', sans-serif",
        minHeight: "100vh",
      }}
    >
      <BreadcrumbSchema items={[{ name: "Home", href: "/" }, { name: "Exams", href: "/exams" }, { name: `${exam.name} Exam`, href: `/exams/${exam.slug}` }]} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      {/* ── Hero ── */}
      <section
        style={{
          padding: "140px 40px 80px",
          maxWidth: "900px",
          margin: "0 auto",
          textAlign: "center",
        }}
      >
        <p
          style={{
            fontSize: "10px",
            textTransform: "uppercase",
            letterSpacing: "0.25em",
            color: "var(--primary)",
            marginBottom: "16px",
            fontFamily: "'Space Grotesk', sans-serif",
            fontWeight: 600,
          }}
        >
          {exam.name} Exam Preparation
        </p>
        <h1
          style={{
            fontSize: "clamp(32px, 5vw, 56px)",
            fontWeight: 300,
            lineHeight: 1.1,
            letterSpacing: "-0.03em",
            marginBottom: "24px",
            fontFamily: "'Newsreader', serif",
          }}
        >
          {exam.name} Previous Year Papers &{" "}
          <em style={{ color: "var(--primary)" }}>AI-Predicted</em> Questions
        </h1>
        <p
          style={{
            fontSize: "17px",
            color: "rgba(var(--text-rgb),0.5)",
            lineHeight: 1.75,
            maxWidth: "600px",
            margin: "0 auto 40px",
            fontWeight: 300,
          }}
        >
          {exam.description} Upload your {exam.name} papers and get instant AI
          predictions, topic frequency analysis, and smart study plans.
        </p>
        <div
          style={{
            display: "flex",
            gap: "14px",
            justifyContent: "center",
            flexWrap: "wrap",
          }}
        >
          <Link
            href="/upload"
            style={{
              background:
                "linear-gradient(135deg, var(--primary), rgba(var(--primary-rgb),0.7))",
              color: "white",
              padding: "14px 36px",
              borderRadius: "9999px",
              textDecoration: "none",
              fontSize: "15px",
              fontWeight: 600,
              boxShadow: "0 4px 20px rgba(var(--primary-rgb),0.3)",
            }}
          >
            Analyze {exam.name} Papers →
          </Link>
          <Link
            href="/library"
            style={{
              background: "rgba(var(--text-rgb),0.04)",
              color: "rgba(var(--text-rgb),0.7)",
              padding: "14px 36px",
              borderRadius: "9999px",
              textDecoration: "none",
              fontSize: "15px",
              fontWeight: 500,
              border: "1px solid rgba(var(--text-rgb),0.08)",
            }}
          >
            Browse {exam.name} Library
          </Link>
        </div>

        {/* Stats row */}
        <div
          style={{
            display: "flex",
            gap: "32px",
            justifyContent: "center",
            marginTop: "56px",
            flexWrap: "wrap",
          }}
        >
          {exam.stats.map((stat) => (
            <div key={stat.label} style={{ textAlign: "center" }}>
              <div
                style={{
                  fontSize: "28px",
                  fontWeight: 300,
                  color: "var(--primary)",
                  fontFamily: "'Space Grotesk', sans-serif",
                }}
              >
                {stat.value}
              </div>
              <div
                style={{
                  fontSize: "11px",
                  textTransform: "uppercase",
                  letterSpacing: "0.15em",
                  color: "rgba(var(--text-rgb),0.3)",
                  marginTop: "4px",
                  fontFamily: "'Space Grotesk', sans-serif",
                }}
              >
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      <div style={{ maxWidth: "800px", margin: "0 auto", padding: "0 40px" }}>
        {/* ── Overview ── */}
        <section style={{ marginBottom: "64px" }}>
          <p
            style={{
              fontSize: "10px",
              textTransform: "uppercase",
              letterSpacing: "0.25em",
              color: "var(--primary)",
              marginBottom: "12px",
              fontFamily: "'Space Grotesk', sans-serif",
              fontWeight: 600,
            }}
          >
            Overview
          </p>
          <h2
            style={{
              fontSize: "clamp(28px, 4vw, 40px)",
              fontWeight: 300,
              letterSpacing: "-0.02em",
              marginBottom: "20px",
              fontFamily: "'Newsreader', serif",
            }}
          >
            What is the{" "}
            <em style={{ color: "var(--primary)" }}>{exam.fullName}</em>?
          </h2>
          <p
            style={{
              fontSize: "15px",
              lineHeight: 1.85,
              color: "rgba(var(--text-rgb),0.55)",
              fontWeight: 300,
            }}
          >
            {exam.overview}
          </p>
        </section>

        {/* ── Why PYQs ── */}
        <section style={{ marginBottom: "64px" }}>
          <p
            style={{
              fontSize: "10px",
              textTransform: "uppercase",
              letterSpacing: "0.25em",
              color: "var(--primary)",
              marginBottom: "12px",
              fontFamily: "'Space Grotesk', sans-serif",
              fontWeight: 600,
            }}
          >
            Strategy
          </p>
          <h2
            style={{
              fontSize: "clamp(28px, 4vw, 40px)",
              fontWeight: 300,
              letterSpacing: "-0.02em",
              marginBottom: "20px",
              fontFamily: "'Newsreader', serif",
            }}
          >
            Why Previous Year Papers{" "}
            <em style={{ color: "var(--primary)" }}>Matter</em> for {exam.name}
          </h2>
          <p
            style={{
              fontSize: "15px",
              lineHeight: 1.85,
              color: "rgba(var(--text-rgb),0.55)",
              fontWeight: 300,
            }}
          >
            {exam.whyPYQ}
          </p>
        </section>

        {/* ── AI Methodology ── */}
        <section style={{ marginBottom: "64px" }}>
          <p
            style={{
              fontSize: "10px",
              textTransform: "uppercase",
              letterSpacing: "0.25em",
              color: "var(--primary)",
              marginBottom: "12px",
              fontFamily: "'Space Grotesk', sans-serif",
              fontWeight: 600,
            }}
          >
            Technology
          </p>
          <h2
            style={{
              fontSize: "clamp(28px, 4vw, 40px)",
              fontWeight: 300,
              letterSpacing: "-0.02em",
              marginBottom: "20px",
              fontFamily: "'Newsreader', serif",
            }}
          >
            How ANALYXX AI <em style={{ color: "var(--primary)" }}>Predicts</em>{" "}
            {exam.name} Questions
          </h2>
          <p
            style={{
              fontSize: "15px",
              lineHeight: 1.85,
              color: "rgba(var(--text-rgb),0.55)",
              fontWeight: 300,
            }}
          >
            {exam.howAI}
          </p>
        </section>

        {/* ── Topics Table ── */}
        <section style={{ marginBottom: "64px" }}>
          <p
            style={{
              fontSize: "10px",
              textTransform: "uppercase",
              letterSpacing: "0.25em",
              color: "var(--primary)",
              marginBottom: "12px",
              fontFamily: "'Space Grotesk', sans-serif",
              fontWeight: 600,
            }}
          >
            Data
          </p>
          <h2
            style={{
              fontSize: "clamp(28px, 4vw, 40px)",
              fontWeight: 300,
              letterSpacing: "-0.02em",
              marginBottom: "24px",
              fontFamily: "'Newsreader', serif",
            }}
          >
            Most Important <em style={{ color: "var(--primary)" }}>Topics</em>{" "}
            for {exam.name}
          </h2>
          <div
            style={{
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "16px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "3fr 1fr",
                padding: "12px 24px",
                borderBottom: "1px solid rgba(255,255,255,0.06)",
                fontSize: "10px",
                textTransform: "uppercase",
                letterSpacing: "0.2em",
                color: "rgba(var(--text-rgb),0.3)",
                fontFamily: "'Space Grotesk', sans-serif",
              }}
            >
              <span>Topic</span>
              <span style={{ textAlign: "right" }}>Weightage</span>
            </div>
            {exam.topics.map((topic, i) => (
              <div
                key={i}
                style={{
                  display: "grid",
                  gridTemplateColumns: "3fr 1fr",
                  padding: "16px 24px",
                  borderBottom:
                    i < exam.topics.length - 1
                      ? "1px solid rgba(255,255,255,0.04)"
                      : "none",
                }}
              >
                <span
                  style={{
                    fontSize: "14px",
                    color: "rgba(var(--text-rgb),0.7)",
                  }}
                >
                  {topic.name}
                </span>
                <span
                  style={{
                    fontSize: "14px",
                    color: "var(--primary)",
                    textAlign: "right",
                    fontFamily: "'Space Grotesk', sans-serif",
                    fontWeight: 600,
                  }}
                >
                  {topic.weight}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* ── Tips ── */}
        <section style={{ marginBottom: "64px" }}>
          <p
            style={{
              fontSize: "10px",
              textTransform: "uppercase",
              letterSpacing: "0.25em",
              color: "var(--primary)",
              marginBottom: "12px",
              fontFamily: "'Space Grotesk', sans-serif",
              fontWeight: 600,
            }}
          >
            Preparation
          </p>
          <h2
            style={{
              fontSize: "clamp(28px, 4vw, 40px)",
              fontWeight: 300,
              letterSpacing: "-0.02em",
              marginBottom: "24px",
              fontFamily: "'Newsreader', serif",
            }}
          >
            {exam.name} Preparation{" "}
            <em style={{ color: "var(--primary)" }}>Tips</em>
          </h2>
          <div
            style={{ display: "flex", flexDirection: "column", gap: "12px" }}
          >
            {exam.tips.map((tip, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  gap: "16px",
                  padding: "16px 20px",
                  background: "rgba(255,255,255,0.02)",
                  borderRadius: "12px",
                  border: "1px solid rgba(255,255,255,0.05)",
                }}
              >
                <span
                  style={{
                    color: "var(--primary)",
                    fontWeight: 600,
                    fontFamily: "'Space Grotesk', sans-serif",
                    fontSize: "14px",
                    flexShrink: 0,
                  }}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span
                  style={{
                    fontSize: "14px",
                    lineHeight: 1.7,
                    color: "rgba(var(--text-rgb),0.6)",
                    fontWeight: 300,
                  }}
                >
                  {tip}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* ── FAQ ── */}
        <section style={{ marginBottom: "64px" }}>
          <p
            style={{
              fontSize: "10px",
              textTransform: "uppercase",
              letterSpacing: "0.25em",
              color: "var(--primary)",
              marginBottom: "12px",
              fontFamily: "'Space Grotesk', sans-serif",
              fontWeight: 600,
            }}
          >
            FAQ
          </p>
          <h2
            style={{
              fontSize: "clamp(28px, 4vw, 40px)",
              fontWeight: 300,
              letterSpacing: "-0.02em",
              marginBottom: "24px",
              fontFamily: "'Newsreader', serif",
            }}
          >
            Frequently Asked{" "}
            <em style={{ color: "var(--primary)" }}>Questions</em>
          </h2>
          <div
            style={{ display: "flex", flexDirection: "column", gap: "1px" }}
          >
            {exam.faqs.map((faq, i) => (
              <details
                key={i}
                style={{
                  background: "rgba(255,255,255,0.02)",
                  borderRadius:
                    i === 0
                      ? "12px 12px 0 0"
                      : i === exam.faqs.length - 1
                        ? "0 0 12px 12px"
                        : "0",
                }}
              >
                <summary
                  style={{
                    padding: "18px 24px",
                    fontSize: "15px",
                    fontWeight: 500,
                    color: "rgba(var(--text-rgb),0.8)",
                    cursor: "pointer",
                    listStyle: "none",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  {faq.q}
                  <span
                    style={{
                      color: "var(--primary)",
                      fontSize: "16px",
                      flexShrink: 0,
                      marginLeft: "12px",
                    }}
                  >
                    +
                  </span>
                </summary>
                <div
                  style={{
                    padding: "0 24px 18px",
                    fontSize: "14px",
                    lineHeight: 1.8,
                    color: "rgba(var(--text-rgb),0.45)",
                    fontWeight: 300,
                  }}
                >
                  {faq.a}
                </div>
              </details>
            ))}
          </div>
        </section>

        {/* ── CTA ── */}
        <section
          style={{
            textAlign: "center",
            padding: "64px 0 80px",
            borderTop: "1px solid rgba(255,255,255,0.05)",
          }}
        >
          <h2
            style={{
              fontSize: "clamp(32px, 5vw, 48px)",
              fontWeight: 300,
              letterSpacing: "-0.03em",
              marginBottom: "20px",
              fontFamily: "'Newsreader', serif",
            }}
          >
            Start analyzing {exam.name} papers{" "}
            <em style={{ color: "var(--primary)" }}>today</em>
          </h2>
          <p
            style={{
              fontSize: "16px",
              color: "rgba(var(--text-rgb),0.4)",
              marginBottom: "36px",
              fontWeight: 300,
            }}
          >
            Join thousands of students who already know what&apos;s coming in
            their next {exam.name} exam
          </p>
          <Link
            href="/register"
            style={{
              background:
                "linear-gradient(135deg, var(--primary), rgba(var(--primary-rgb),0.7))",
              color: "white",
              padding: "16px 44px",
              borderRadius: "9999px",
              textDecoration: "none",
              fontSize: "16px",
              fontWeight: 600,
              boxShadow: "0 4px 20px rgba(var(--primary-rgb),0.3)",
            }}
          >
            Analyze Your First Paper Free →
          </Link>

          {/* Cross-links to other exams */}
          <div
            style={{
              marginTop: "56px",
              borderTop: "1px solid rgba(255,255,255,0.05)",
              paddingTop: "32px",
            }}
          >
            <p
              style={{
                fontSize: "10px",
                textTransform: "uppercase",
                letterSpacing: "0.25em",
                color: "rgba(var(--text-rgb),0.3)",
                marginBottom: "16px",
                fontFamily: "'Space Grotesk', sans-serif",
              }}
            >
              Also available for
            </p>
            <div
              style={{
                display: "flex",
                gap: "10px",
                justifyContent: "center",
                flexWrap: "wrap",
              }}
            >
              {["jee", "neet", "upsc", "gate", "cat", "ssc", "rtu", "cbse"]
                .filter((s) => s !== exam.slug)
                .map((s) => (
                  <Link
                    key={s}
                    href={`/exams/${s}`}
                    style={{
                      padding: "8px 20px",
                      borderRadius: "9999px",
                      border: "1px solid rgba(255,255,255,0.08)",
                      textDecoration: "none",
                      fontSize: "13px",
                      color: "rgba(var(--text-rgb),0.5)",
                      fontWeight: 500,
                    }}
                  >
                    {s.toUpperCase()}
                  </Link>
                ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
