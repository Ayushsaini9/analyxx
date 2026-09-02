"use client";
import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import ThemeCustomizer from "../../components/ThemeCustomizer";
import { API_BASE } from "../../lib/config";
import { supabase } from "../../lib/supabase";

export default function ResultsPage() {
  const router = useRouter();
  const params = useParams();
  const paperId = params.id as string;
  const [paper, setPaper] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [aiSummary, setAiSummary] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiDone, setAiDone] = useState(false);
  const [displayedText, setDisplayedText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [userScrolled, setUserScrolled] = useState(false);
  const summaryRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const autoScrollRef = useRef(true);
  const [navVisible, setNavVisible] = useState(true);
  const navLastScrollY = useRef(0);

  useEffect(() => {
    (async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!session) { router.push("/login"); return; }
    fetch(`${API_BASE}/papers/${paperId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(data => { setPaper(data); setLoading(false); })
      .catch(() => { setError("Failed to load paper."); setLoading(false); });
    })();
  }, [paperId]);

  // Auto-generate AI summary once paper loads
  useEffect(() => {
    if (paper && !aiSummary && !aiLoading) {
      generateSummary();
    }
  }, [paper]);

  // Detect user scroll to pause auto-scroll + hide/show navbar
  useEffect(() => {
    let lastScrollY = window.scrollY;
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      // If user scrolls up, pause auto-scroll
      if (currentScrollY < lastScrollY - 20) {
        setUserScrolled(true);
        autoScrollRef.current = false;
      }
      // If near bottom, resume auto-scroll
      const nearBottom = (window.innerHeight + currentScrollY) >= (document.body.scrollHeight - 100);
      if (nearBottom) {
        setUserScrolled(false);
        autoScrollRef.current = true;
      }
      // Navbar hide/show
      if (currentScrollY <= 40) {
        setNavVisible(true);
      } else if (currentScrollY < navLastScrollY.current) {
        setNavVisible(true);
      } else if (currentScrollY > navLastScrollY.current + 10) {
        setNavVisible(false);
      }
      navLastScrollY.current = currentScrollY;
      lastScrollY = currentScrollY;
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (!aiSummary) return;
    setDisplayedText("");
    setIsTyping(true);
    setUserScrolled(false);
    autoScrollRef.current = true;
    let i = 0;
    const interval = setInterval(() => {
      if (i < aiSummary.length) {
        setDisplayedText(aiSummary.slice(0, i + 1));
        i++;
        if (autoScrollRef.current) {
          summaryRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
        }
      } else {
        clearInterval(interval);
        setIsTyping(false);
        setAiDone(true);
      }
    }, 8);
    intervalRef.current = interval;
    return () => { clearInterval(interval); intervalRef.current = null; };
  }, [aiSummary]);

  const stopTyping = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsTyping(false);
    setAiDone(true);
  }, []);

  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const generateSummary = async () => {
    setAiLoading(true);
    setAiSummary("");
    setAiDone(false);
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    try {
      const res = await fetch(`${API_BASE}/papers/${paperId}/ai-summary`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "AI error");
      setAiSummary(data.summary);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Couldn't generate the AI summary.";
      setAiSummary(`**Error:** ${message}`);
      setAiDone(true);
    } finally {
      setAiLoading(false);
    }
  };



  return (
    <main style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text)", fontFamily: "'Inter', sans-serif" }}>
      <style>{`
        .font-serif { font-family: 'Newsreader', serif; }
        .font-grotesk { font-family: 'Space Grotesk', sans-serif; }
        @keyframes morph {
          0%,100% { border-radius: 40% 60% 60% 40% / 70% 30% 70% 30%; }
          50%      { border-radius: 60% 40% 40% 60% / 30% 70% 30% 70%; }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes blink { 0%,100% { opacity: 1; } 50% { opacity: 0; } }
        @keyframes pulse-glow {
          0%,100% { box-shadow: 0 0 0 0 rgba(var(--primary-rgb),0.4); }
          50%      { box-shadow: 0 0 0 10px rgba(var(--primary-rgb),0); }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideDown {
          from { opacity: 1; transform: translateY(0); }
          to   { opacity: 0; transform: translateY(20px); }
        }
        .bottom-bar {
          position: fixed; bottom: 0; left: 0; right: 0; z-index: 50;
          display: flex; align-items: center; justify-content: center; gap: 12px;
          padding: 12px 24px;
          background: rgba(var(--bg-rgb),0.75);
          backdrop-filter: blur(16px);
          border-top: 1px solid rgba(255,255,255,0.08);
          animation: slideUp 0.35s cubic-bezier(0.16,1,0.3,1) both;
        }
        .stop-btn {
          display: flex; align-items: center; gap: 8px;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 9999px;
          padding: 10px 24px;
          font-size: 14px; font-weight: 500;
          color: #EBEBEB;
          cursor: pointer;
          font-family: 'Inter', sans-serif;
          transition: all 200ms cubic-bezier(0.16,1,0.3,1);
        }
        .stop-btn:hover {
          background: rgba(255,255,255,0.1);
          border-color: rgba(255,255,255,0.2);
          transform: scale(1.02);
        }
        .stop-btn:active { transform: scale(0.98); }
        .stop-icon {
          width: 16px; height: 16px;
          background: #EBEBEB;
          border-radius: 3px;
          flex-shrink: 0;
        }
        .scroll-top-btn {
          display: flex; align-items: center; justify-content: center;
          width: 40px; height: 40px;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 50%;
          color: #EBEBEB;
          cursor: pointer;
          font-size: 18px;
          transition: all 200ms cubic-bezier(0.16,1,0.3,1);
        }
        .scroll-top-btn:hover {
          background: rgba(var(--primary-rgb),0.15);
          border-color: rgba(var(--primary-rgb),0.3);
          color: var(--primary);
        }
        .fade-up-1 { animation: fadeUp 0.6s cubic-bezier(0.16,1,0.3,1) 0.1s both; }
        .fade-up-2 { animation: fadeUp 0.6s cubic-bezier(0.16,1,0.3,1) 0.2s both; }
        .fade-up-3 { animation: fadeUp 0.6s cubic-bezier(0.16,1,0.3,1) 0.3s both; }
        .fade-up-4 { animation: fadeUp 0.6s cubic-bezier(0.16,1,0.3,1) 0.4s both; }
        .topic-card {
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 16px; padding: 20px 24px;
          transition: all 300ms cubic-bezier(0.16,1,0.3,1);
        }
        .topic-card:hover { border-color: rgba(var(--primary-rgb),0.25); transform: translateX(4px); }
        .spinner {
          width: 40px; height: 40px;
          border: 3px solid rgba(var(--primary-rgb),0.2);
          border-top-color: var(--primary);
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          margin: 0 auto;
        }
        .ai-btn {
          background: var(--primary); color: white; border: none;
          border-radius: 9999px; padding: 14px 32px;
          font-size: 15px; font-weight: 600; cursor: pointer;
          font-family: 'Inter', sans-serif;
          transition: all 300ms cubic-bezier(0.16,1,0.3,1);
          animation: pulse-glow 2.5s infinite;
        }
        .ai-btn:hover:not(:disabled) { filter: brightness(1.1); transform: translateY(-2px); }
        .ai-btn:disabled { opacity: 0.5; cursor: not-allowed; animation: none; }
        .cursor { display: inline-block; width: 2px; height: 1em; background: var(--primary); margin-left: 2px; vertical-align: text-bottom; animation: blink 0.8s infinite; }
        .confidence-pill {
          display: inline-flex; align-items: center;
          border-radius: 9999px; padding: 3px 10px;
          font-size: 11px; font-weight: 500;
        }
        .ai-response h2 { font-family: 'Newsreader', serif; font-size: 22px; font-weight: 400; color: #EBEBEB; margin: 28px 0 12px; letter-spacing: -0.02em; border-bottom: 1px solid rgba(255,255,255,0.06); padding-bottom: 8px; }
        .ai-response h3 { font-size: 15px; font-weight: 600; color: var(--primary); margin: 16px 0 8px; }
        .ai-response p { margin: 10px 0; color: rgba(var(--text-rgb),0.75); line-height: 1.8; }
        .ai-response ul { padding-left: 20px; margin: 8px 0; }
        .ai-response ol { padding-left: 20px; margin: 8px 0; }
        .ai-response li { margin: 6px 0; color: rgba(var(--text-rgb),0.75); line-height: 1.7; }
        .ai-response strong { color: var(--primary); font-weight: 600; }
        .ai-response em { color: rgba(var(--text-rgb),0.5); font-style: italic; }
        .ai-response hr { border: none; border-top: 1px solid rgba(255,255,255,0.07); margin: 24px 0; }
        .ai-response code { background: rgba(var(--primary-rgb),0.1); color: var(--primary); padding: 2px 8px; border-radius: 6px; font-size: 13px; font-family: monospace; }
        .ai-response blockquote { border-left: 3px solid var(--primary); padding-left: 16px; margin: 12px 0; color: rgba(var(--text-rgb),0.45); background: rgba(var(--primary-rgb),0.04); border-radius: 0 8px 8px 0; padding: 12px 16px; }
        .ai-response table { width: 100%; border-collapse: collapse; margin: 16px 0; }
        .ai-response th { background: rgba(var(--primary-rgb),0.1); color: var(--primary); padding: 10px 14px; text-align: left; font-size: 12px; text-transform: uppercase; letter-spacing: 0.1em; }
        .ai-response td { padding: 10px 14px; border-bottom: 1px solid rgba(255,255,255,0.05); color: rgba(var(--text-rgb),0.7); font-size: 14px; }
        .ai-response tr:hover td { background: rgba(var(--primary-rgb),0.03); }
      `}</style>

      {/* BG */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0 }}>
        <div style={{ position: "absolute", top: "-200px", left: "-100px", width: "500px", height: "500px", background: "rgba(var(--primary-rgb),0.05)", filter: "blur(120px)", animation: "morph 12s ease-in-out infinite" }} />
        <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)", backgroundSize: "60px 60px" }} />
      </div>

      {/* Navbar */}
      <header style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 40,
        background: "rgba(var(--bg-rgb),0.85)", backdropFilter: "blur(16px)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        padding: "16px clamp(16px, 4vw, 40px)", display: "flex", alignItems: "center", justifyContent: "space-between",
        gap: "12px",
        transform: navVisible ? "translateY(0)" : "translateY(-100%)",
        transition: "all 400ms cubic-bezier(0.16,1,0.3,1)",
      }}>
        <a href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}>
          <img src="/logo.png" alt="ANALYXX" className="theme-logo" style={{ width: "36px", height: "36px", borderRadius: "9px", objectFit: "cover" }} />
          <span className="font-serif" style={{ fontSize: "18px", fontWeight: 300, color: "var(--text)", whiteSpace: "nowrap" }}>ANALYXX <em style={{ color: "var(--primary)" }}>AI</em></span>
        </a>
        <div style={{ display: "flex", gap: "12px", alignItems: "center", flexShrink: 0 }}>
          <span className="nav-theme-customizer"><ThemeCustomizer /></span>
          <a href="/upload" style={{ fontSize: "14px", color: "rgba(var(--text-rgb),0.4)", textDecoration: "none", transition: "color 200ms", whiteSpace: "nowrap" }}
            onMouseEnter={e => (e.currentTarget.style.color = "#EBEBEB")}
            onMouseLeave={e => (e.currentTarget.style.color = "rgba(var(--text-rgb),0.4)")}
          >← Back to Analyze</a>
        </div>
      </header>

      <div style={{ position: "relative", zIndex: 1, maxWidth: "900px", margin: "0 auto", padding: "clamp(24px, 5vw, 60px) clamp(16px, 4vw, 40px)", paddingTop: "clamp(80px, 10vw, 120px)" }}>

        {loading ? (
          <div style={{ textAlign: "center", padding: "120px 0" }}>
            <div className="spinner" style={{ marginBottom: "24px" }} />
            <p className="font-serif" style={{ fontSize: "20px", fontWeight: 300, color: "rgba(var(--text-rgb),0.4)" }}>Loading analysis...</p>
          </div>
        ) : error ? (
          <div style={{ textAlign: "center", padding: "120px 0" }}>
            <p style={{ color: "#fca5a5" }}>{error}</p>
          </div>

        ) : (
          <>
            {/* Header */}
            <div className="fade-up-1" style={{ marginBottom: "48px" }}>
              <p className="font-grotesk" style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.25em", color: "var(--primary)", marginBottom: "12px" }}>Analysis Results</p>
              <h1 className="font-serif" style={{ fontSize: "clamp(36px, 4vw, 56px)", fontWeight: 300, letterSpacing: "-0.02em", lineHeight: 1.05, marginBottom: "12px" }}>
                {paper.exam_name}<br />
                <em style={{ color: "var(--primary)" }}>— {paper.years}</em>
              </h1>

            </div>

            {/* Topics Section */}
            {paper.analysis_result?.predictions && paper.analysis_result.predictions.length > 0 && (
              <div className="fade-up-2" style={{ marginBottom: "48px" }}>
                <p className="font-grotesk" style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.25em", color: "var(--primary)", marginBottom: "16px" }}>Core Topics Detected</p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "16px" }}>
                  {paper.analysis_result.predictions.map((p: any, idx: number) => (
                    <div key={idx} className="topic-card">
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                        <h3 className="font-serif" style={{ fontSize: "18px", fontWeight: 400, color: "var(--text)", margin: 0, paddingRight: "10px" }}>{p.topic}</h3>
                        <span className="confidence-pill" style={{
                          background: p.confidence === "Very High" ? "rgba(var(--primary-rgb),0.15)" :
                                      p.confidence === "High" ? "rgba(59,130,246,0.15)" :
                                      p.confidence === "Medium" ? "rgba(245,158,11,0.15)" : "rgba(239,68,68,0.15)",
                          color: p.confidence === "Very High" ? "var(--primary)" :
                                 p.confidence === "High" ? "#3b82f6" :
                                 p.confidence === "Medium" ? "#f59e0b" : "#ef4444"
                        }}>
                          {p.confidence}
                        </span>
                      </div>
                      <div style={{ display: "flex", gap: "16px", fontSize: "12px", color: "rgba(var(--text-rgb),0.4)" }}>
                        <div><strong style={{ color: "rgba(var(--text-rgb),0.8)", fontWeight: 500 }}>{Math.round(p.score)}%</strong> Relevance</div>
                        <div><strong style={{ color: "rgba(var(--text-rgb),0.8)", fontWeight: 500 }}>{p.keyword_hits}</strong> Mentions</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* AI Summary Card */}
            <div className="fade-up-3" style={{
              background: "rgba(var(--primary-rgb),0.04)",
              border: "1px solid rgba(var(--primary-rgb),0.15)",
              borderRadius: "24px", padding: "36px",
              marginBottom: "48px",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px" }}>
                <div style={{
                  width: "40px", height: "40px", borderRadius: "12px",
                  background: "linear-gradient(135deg, var(--primary), var(--primary))",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "20px", flexShrink: 0,
                  color: "white", fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif",
                }}>A</div>
                <div>
                  <div style={{ fontSize: "15px", fontWeight: 600, color: "var(--text)" }}>ANALYXX AI Coach</div>
                  <div className="font-grotesk" style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.15em", color: "var(--primary)" }}>
                    Powered by Gemini
                  </div>
                </div>
              </div>

              {!aiSummary && !aiLoading && (
                <div style={{ textAlign: "center", padding: "20px 0 28px" }}>
                  <p style={{ fontSize: "16px", color: "rgba(var(--text-rgb),0.5)", fontWeight: 300, marginBottom: "8px", lineHeight: 1.7 }}>
                    Generating your detailed analysis...
                  </p>
                </div>
              )}

              {aiLoading && (
                <div style={{ display: "flex", alignItems: "center", gap: "16px", padding: "16px 0" }}>
                  <div style={{ width: "24px", height: "24px", border: "2px solid rgba(var(--primary-rgb),0.3)", borderTopColor: "var(--primary)", borderRadius: "50%", animation: "spin 0.8s linear infinite", flexShrink: 0 }} />
                  <div>
                    <p style={{ fontSize: "15px", color: "rgba(var(--text-rgb),0.6)", marginBottom: "4px" }}>Analyzing your paper deeply...</p>
                    <p className="font-grotesk" style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.15em", color: "rgba(var(--text-rgb),0.25)" }}>
                      Predicting questions · Building study plan · Finding patterns
                    </p>
                  </div>
                </div>
              )}

              {aiSummary && (
                <div ref={summaryRef}>
                  <div style={{
                    background: "rgba(255,255,255,0.02)",
                    border: "1px solid rgba(255,255,255,0.07)",
                    borderRadius: "16px", padding: "28px",
                    marginBottom: "20px",
                  }}>
                    <div className="ai-response">
                      <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{displayedText}</ReactMarkdown>
                      {!aiDone && <span className="cursor" />}
                    </div>
                  </div>

                  {aiDone && (
                    <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                      <button onClick={generateSummary} style={{
                        background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
                        borderRadius: "9999px", padding: "10px 20px", fontSize: "13px",
                        color: "rgba(var(--text-rgb),0.5)", cursor: "pointer", fontFamily: "'Inter', sans-serif", transition: "all 200ms",
                      }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(var(--primary-rgb),0.3)"; e.currentTarget.style.color = "var(--primary)"; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; e.currentTarget.style.color = "rgba(var(--text-rgb),0.5)"; }}
                      >↺ Regenerate</button>
                      <a href="/upload" style={{
                        background: "var(--primary)", color: "white", borderRadius: "9999px",
                        padding: "10px 20px", fontSize: "13px", fontWeight: 600, textDecoration: "none",
                      }}>Upload Another →</a>
                    </div>
                  )}
                </div>
              )}
            </div>


          </>
        )}
      </div>

      {/* ChatGPT-style Bottom Bar */}
      {isTyping && (
        <div className="bottom-bar">
          <button className="scroll-top-btn" onClick={scrollToTop} title="Scroll to top">
            ↑
          </button>
          <button className="stop-btn" onClick={stopTyping}>
            <span className="stop-icon" />
            Stop generating
          </button>
        </div>
      )}
    </main>
  );
}