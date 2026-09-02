"use client";
import { useState, useEffect, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import Link from "next/link";
import "./analysis.css";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const EXAM_META: Record<string, { icon: string; color: string; label: string }> = {
  "CBSE-10": { icon: "CB", color: "#3b82f6", label: "CBSE Class 10" },
  "CBSE-12": { icon: "CB", color: "#10b981", label: "CBSE Class 12" },
  RTU: { icon: "RT", color: "#f59e0b", label: "RTU" },
  JEE: { icon: "JE", color: "#ef4444", label: "JEE" },
  NEET: { icon: "NE", color: "#8b5cf6", label: "NEET" },
  UPSC: { icon: "UP", color: "#f97316", label: "UPSC" },
  GATE: { icon: "GA", color: "#06b6d4", label: "GATE" },
  CAT: { icon: "CA", color: "#ec4899", label: "CAT" },
};
const COMING_SOON = ["JEE", "NEET", "UPSC", "GATE", "CAT"];

type Step = "hero" | "exam" | "subject" | "loading" | "results";
type ExamInfo = { exam: string; papers: number; subjects: number };
type SubjectInfo = { subject: string; years: number; papers: number };

export default function AnalysisPage() {
  const [step, setStep] = useState<Step>("hero");
  const [exams, setExams] = useState<ExamInfo[]>([]);
  const [subjects, setSubjects] = useState<SubjectInfo[]>([]);
  const [selectedExam, setSelectedExam] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [search, setSearch] = useState("");
  const [analysis, setAnalysis] = useState("");
  const [analysisInfo, setAnalysisInfo] = useState<any>(null);
  const [error, setError] = useState("");
  const [loadingMsg, setLoadingMsg] = useState("");
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [loadingExams, setLoadingExams] = useState(true);

  useEffect(() => {
    fetch('/api/analysis/exams')
      .then(r => r.json())
      .then(d => { setExams(Array.isArray(d) ? d : []); setLoadingExams(false); })
      .catch(() => setLoadingExams(false));
  }, []);

  const totalPapers = exams.reduce((s, e) => s + e.papers, 0);
  const totalSubjects = exams.reduce((s, e) => s + e.subjects, 0);

  const filteredSubjects = useMemo(() => {
    if (!search.trim()) return subjects;
    const q = search.toLowerCase();
    return subjects.filter(s => s.subject.toLowerCase().includes(q));
  }, [subjects, search]);

  const selectExamFixed = async (exam: string) => {
    setSelectedExam(exam);
    setSelectedSubject("");
    setSearch("");
    setStep("subject");
    setLoadingSubjects(true);
    setSubjects([]);
    try {
      const r = await fetch(`/api/analysis/subjects?exam=${encodeURIComponent(exam)}`);
      const data = await r.json();
      setSubjects(Array.isArray(data) ? data : []);
    } catch { setSubjects([]); }
    setLoadingSubjects(false);
  };

  const runAnalysis = async () => {
    setStep("loading");
    setError("");
    const msgs = ["Fetching papers from library...", "Extracting question patterns...", "Running cross-year AI analysis...", "Building topic frequency model...", "Generating predictions..."];
    let i = 0;
    setLoadingMsg(msgs[0]);
    const iv = setInterval(() => { i++; if (i < msgs.length) setLoadingMsg(msgs[i]); }, 4000);
    try {
      const r = await fetch('/api/analysis/run', { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ exam: selectedExam, subject: selectedSubject }) });
      clearInterval(iv);
      if (!r.ok) { const e = await r.json(); throw new Error(e.detail || "Failed"); }
      const data = await r.json();
      setAnalysis(data.analysis || "");
      setAnalysisInfo(data);
      setStep("results");
    } catch (e: any) { clearInterval(iv); setError(e.message || "Analysis failed"); setStep("subject"); }
  };

  const reset = () => { setStep("hero"); setSelectedExam(""); setSelectedSubject(""); setAnalysis(""); setAnalysisInfo(null); setError(""); setSearch(""); };
  const meta = EXAM_META[selectedExam] || { icon: selectedExam.slice(0, 2).toUpperCase(), color: "#6b7280", label: selectedExam };

  return (
    <div className="an-page">


      {/* ── NAV ── */}
      <header className="an-nav">
        <Link href="/" className="an-brand">
          <span className="an-brand-badge">A</span>
          <span className="an-brand-text">ANALYXX <em>AI</em></span>
        </Link>
        <nav className="an-nav-links">
          <Link href="/upload" className="an-nav-link">Upload Paper</Link>
          <Link href="/library" className="an-nav-link">PYQ Library</Link>
          <Link href="/upload" className="an-nav-link">My Analyses</Link>
        </nav>
        <Link href="/upload" className="an-nav-mobile-back" aria-label="Back to Upload">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
        </Link>
      </header>

      {/* ── STEP 0: HERO ── */}
      {step === "hero" && (
        <section className="an-hero">
          <div className="an-hero-glow" />
          <div className="an-hero-content an-fade">
            <span className="an-pill">✦ AI-Powered Analysis</span>
            <h1 className="an-hero-title">Cross-Year<br />Pattern Analysis</h1>
            <p className="an-hero-sub">Select your exam and subject — we&apos;ll analyse all available papers and predict what&apos;s coming next.</p>
            <Link href="/upload" className="an-cta" style={{ textDecoration: "none" }}>
              Upload Your Paper <span className="an-cta-arrow">→</span>
            </Link>
            <div className="an-features">
              <span className="an-feature-pill">Pattern Detection</span>
              <span className="an-feature-pill">Prediction Engine</span>
              <span className="an-feature-pill">Topic Trends</span>
            </div>
            <p className="an-stats">{totalPapers} Papers Indexed · {totalSubjects} Subjects · {exams.length} Exams</p>
          </div>
        </section>
      )}

      {/* ── STEP 1: EXAM SELECTOR ── */}
      {step === "exam" && (
        <section className="an-section an-fade">
          <div className="an-step-bar">
            <button className="an-back" onClick={() => setStep("hero")}>← Back</button>
            <span className="an-step-label">Step 1 of 3 · Select Exam</span>
          </div>
          <h2 className="an-section-title">Choose Your Exam</h2>
          <p className="an-section-sub">Select the examination you want to analyze</p>
          <div className="an-exam-grid">
            {loadingExams ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="an-skeleton-card" style={{ height: "80px" }}>
                  <div className="an-skeleton-line an-skeleton-line--title" />
                  <div className="an-skeleton-line an-skeleton-line--meta" />
                </div>
              ))
            ) : exams.length === 0 ? (
              <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: "32px 0", color: "rgba(var(--text-rgb),0.3)", fontSize: "14px" }}>
                <p style={{ marginBottom: "8px" }}>No exams available right now</p>
                <p style={{ fontSize: "12px", opacity: 0.6 }}>Please try again later</p>
              </div>
            ) : (
              <>
                {exams.map(e => {
                  const m = EXAM_META[e.exam] || { icon: e.exam.slice(0, 2).toUpperCase(), color: "#6b7280", label: e.exam };
                  return (
                    <button key={e.exam} className="an-exam-card" onClick={() => selectExamFixed(e.exam)} style={{ "--card-accent": m.color } as any}>
                      <span className="an-exam-icon">{m.icon}</span>
                      <span className="an-exam-name">{m.label}</span>
                      <span className="an-exam-meta">{e.papers} papers · {e.subjects} subjects</span>
                    </button>
                  );
                })}
                {COMING_SOON.filter(cs => !exams.find(e => e.exam === cs)).map(cs => {
                  const m = EXAM_META[cs];
                  return (
                    <div key={cs} className="an-exam-card an-coming-soon">
                      <span className="an-exam-icon">{m.icon}</span>
                      <span className="an-exam-name">{m.label}</span>
                      <span className="an-badge-soon">Coming Soon</span>
                    </div>
                  );
                })}
              </>
            )}
          </div>
        </section>
      )}

      {/* ── STEP 2: SUBJECT SELECTOR ── */}
      {step === "subject" && (
        <section className="an-section an-fade">
          <div className="an-step-bar">
            <button className="an-back" onClick={() => setStep("exam")}>← Back to exams</button>
            <span className="an-step-label">Step 2 of 3 · Select Subject</span>
          </div>
          <div className="an-subject-header">
            <span className="an-exam-icon-lg">{meta.icon}</span>
            <div>
              <h2 className="an-section-title" style={{ marginBottom: 2 }}>{meta.label}</h2>
              <p className="an-section-sub" style={{ marginTop: 0 }}>Choose a subject to analyse</p>
            </div>
          </div>

          {error && <div className="an-error">{error}</div>}

          <div className="an-search-wrap">
            <svg className="an-search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            <input className="an-search" type="text" placeholder="Search subjects..." value={search} onChange={e => setSearch(e.target.value)} />
            {search && <button className="an-search-clear" onClick={() => setSearch("")}>✕</button>}
          </div>

          {loadingSubjects ? (
            <div className="an-subject-grid">
              {Array.from({ length: 9 }).map((_, i) => (
                <div key={i} className="an-skeleton-card">
                  <div className="an-skeleton-line an-skeleton-line--title" />
                  <div className="an-skeleton-line an-skeleton-line--meta" />
                </div>
              ))}
            </div>
          ) : filteredSubjects.length === 0 && subjects.length > 0 ? (
            <div className="an-empty">No subjects match &quot;{search}&quot;</div>
          ) : subjects.length === 0 ? (
            <div className="an-empty">
              <p style={{ fontSize: 18, marginBottom: 8 }}>No analysable papers yet</p>
              <p style={{ fontSize: 14 }}>Papers for this exam are image-scanned. OCR support coming soon.</p>
              <Link href="/upload" className="an-cta" style={{ marginTop: 20, display: "inline-flex" }}>Upload Your Own Paper →</Link>
            </div>
          ) : (
            <div className="an-subject-grid">
              {filteredSubjects.map(s => (
                <button key={s.subject} className={`an-subject-card ${selectedSubject === s.subject ? "selected" : ""}`} onClick={() => setSelectedSubject(s.subject)} style={{ "--card-accent": meta.color } as any}>
                  <span className="an-subject-name">{s.subject}</span>
                  <span className="an-subject-meta">{s.years} years · {s.papers} papers</span>
                </button>
              ))}
            </div>
          )}

          {selectedSubject && (
            <div className="an-analyze-bar">
              <button className="an-cta" onClick={runAnalysis} style={{ background: `linear-gradient(135deg, ${meta.color}, ${meta.color}cc)`, boxShadow: `0 4px 24px ${meta.color}33` }}>
                Analyse {selectedSubject} <span className="an-cta-arrow">→</span>
              </button>
              <p className="an-analyze-note">No upload needed — papers fetched automatically from library</p>
            </div>
          )}
        </section>
      )}

      {/* ── STEP 3: LOADING ── */}
      {step === "loading" && (
        <section className="an-loading an-fade">
          <div className="an-spinner" style={{ borderTopColor: meta.color }} />
          <h2 className="an-loading-title">Analysing {selectedSubject}</h2>
          <p className="an-loading-exam">{meta.label}</p>
          <p className="an-loading-msg" style={{ color: meta.color }}>{loadingMsg}</p>
        </section>
      )}

      {/* ── STEP 4: RESULTS ── */}
      {step === "results" && analysis && (
        <section className="an-section an-results an-fade">
          <div className="an-results-header">
            <div>
              <h2 className="an-results-title">{selectedSubject} Analysis</h2>
              <p className="an-results-meta">{analysisInfo?.total_papers} papers · {analysisInfo?.year_range} · {meta.label}</p>
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button className="an-btn-secondary" onClick={reset}>← New Analysis</button>
              <Link href="/upload" className="an-btn-secondary" style={{ textDecoration: "none" }}>Upload Your Paper →</Link>
            </div>
          </div>
          <div className="an-results-body">
            <div className="an-markdown"><ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{analysis}</ReactMarkdown></div>
          </div>
        </section>
      )}
    </div>
  );
}



