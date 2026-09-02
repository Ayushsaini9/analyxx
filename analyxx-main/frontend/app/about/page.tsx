"use client";
import { useState, useEffect, useRef } from "react";
import ThemeCustomizer from "../components/ThemeCustomizer";
import { API_BASE } from "../lib/config";
import { supabase } from "../lib/supabase";

export default function AboutPage() {
  const [scrolled, setScrolled] = useState(false);
  const [navVisible, setNavVisible] = useState(true);
  const lastScrollY = useRef(0);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userName, setUserName] = useState("");
  const [profilePicture, setProfilePicture] = useState("");
  const [isPro, setIsPro] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Lock body scroll when mobile nav is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.classList.add('mobile-nav-locked');
    } else {
      document.body.classList.remove('mobile-nav-locked');
    }
    return () => document.body.classList.remove('mobile-nav-locked');
  }, [mobileMenuOpen]);

  useEffect(() => {
    const handleScroll = () => {
      const currentY = window.scrollY;
      setScrolled(currentY > 40);
      if (currentY <= 40) {
        setNavVisible(true);
      } else if (currentY < lastScrollY.current) {
        setNavVisible(true);
      } else if (currentY > lastScrollY.current + 10) {
        setNavVisible(false);
      }
      lastScrollY.current = currentY;
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    (async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    const name = session?.user?.user_metadata?.full_name || session?.user?.user_metadata?.name || session?.user?.email?.split("@")[0] || "";
    if (session) {
      setIsLoggedIn(true);
      setUserName(name || "User");
      fetch(`${API_BASE}/auth/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.profile_picture) setProfilePicture(data.profile_picture);
        })
        .catch(() => {});

      // Fetch subscription status
      fetch(`${API_BASE}/payments/subscription`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.plan?.startsWith("pro_") && data.status === "active") {
            setIsPro(true);
          }
        })
        .catch(() => {});
    }
    })();
  }, []);

  const teamMembers = [
    { name: "AI Engine", role: "Core Technology", emoji: "AI", desc: "NLP-powered analysis processing 50,000+ papers." },
    { name: "Community", role: "10,000+ Students", emoji: "C", desc: "The driving force behind every feature we ship." },
  ];

  const milestones = [
    { year: "2024", event: "ANALYXX AI founded with a mission to democratize exam prep." },
    { year: "2024", event: "Launched AI-powered analysis for JEE Advanced papers." },
    { year: "2025", event: "Expanded to UPSC, NEET, CAT, and GATE exams." },
    { year: "2025", event: "Crossed 10,000+ active students on the platform." },
    { year: "2025", event: "2M+ questions extracted and classified with 94% accuracy." },
  ];

  const values = [
    { title: "Accuracy First", desc: "Every prediction is backed by data. We don't guess — we analyze patterns across thousands of papers." },
    { title: "Speed Matters", desc: "Full paper analysis in under 2 minutes. Because your time is better spent studying, not waiting." },
    { title: "Access for All", desc: "Quality exam intelligence shouldn't be a luxury. Our free tier ensures every student can benefit." },
    { title: "Always Improving", desc: "Our models get smarter with every paper uploaded. Continuous learning means better predictions for you." },
  ];

  return (
    <main style={{ background: "var(--bg)", color: "var(--text)", fontFamily: "'Inter', sans-serif", overflowX: "hidden", minHeight: "100vh" }}>
      <style>{`

        .font-serif  { font-family: 'Newsreader', serif; }
        .font-grotesk { font-family: 'Space Grotesk', sans-serif; }

        * { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(32px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes morph {
          0%,100% { border-radius: 40% 60% 60% 40% / 70% 30% 70% 30%; }
          50%      { border-radius: 60% 40% 40% 60% / 30% 70% 30% 70%; }
        }
        @keyframes ping {
          0%,100% { transform: scale(1); opacity: 1; }
          50%      { transform: scale(1.8); opacity: 0.2; }
        }
        @keyframes gradient-shift {
          0%,100% { background-position: 0% 50%; }
          50%      { background-position: 100% 50%; }
        }
        @keyframes pulse-glow {
          0%,100% { box-shadow: 0 0 0 0 rgba(var(--primary-rgb),0.4); }
          50%      { box-shadow: 0 0 0 12px rgba(var(--primary-rgb),0); }
        }
        @keyframes shimmer {
          0%   { background-position: 200% center; }
          100% { background-position: -200% center; }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes dropdownSlide {
          from { opacity: 0; transform: translateY(-8px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }

        .fade-up-1 { animation: fadeUp 0.8s cubic-bezier(0.16,1,0.3,1) 0.1s both; }
        .fade-up-2 { animation: fadeUp 0.8s cubic-bezier(0.16,1,0.3,1) 0.25s both; }
        .fade-up-3 { animation: fadeUp 0.8s cubic-bezier(0.16,1,0.3,1) 0.4s both; }
        .fade-up-4 { animation: fadeUp 0.8s cubic-bezier(0.16,1,0.3,1) 0.55s both; }

        .nav-link {
          font-size: 14px; font-weight: 500;
          color: rgba(var(--text-rgb),0.6);
          text-decoration: none;
          position: relative; padding-bottom: 2px;
          transition: color 300ms;
        }
        .nav-link::after {
          content: '';
          position: absolute; bottom: 0; left: 0;
          height: 1px; width: 0;
          background: var(--primary);
          transition: width 300ms cubic-bezier(0.16,1,0.3,1);
        }
        .nav-link:hover { color: #EBEBEB; }
        .nav-link:hover::after { width: 100%; }

        .logo-icon:hover { animation: spin 600ms cubic-bezier(0.16,1,0.3,1) forwards; }

        .gradient-headline {
          background: linear-gradient(90deg, #ffffff 0%, var(--primary) 50%, #ffffff 100%);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: gradient-shift 4s ease infinite;
        }

        .about-card {
          position: relative;
          background: rgba(255,255,255,0.02);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 24px;
          padding: 40px;
          transition: all 300ms cubic-bezier(0.16,1,0.3,1);
        }
        .about-card:hover {
          border-color: rgba(var(--primary-rgb),0.2);
          transform: translateY(-4px);
          box-shadow: 0 20px 60px rgba(var(--primary-rgb),0.06);
        }

        .timeline-dot {
          width: 12px; height: 12px;
          border-radius: 50%;
          background: var(--primary);
          border: 3px solid #050505;
          box-shadow: 0 0 0 2px rgba(var(--primary-rgb),0.3);
          flex-shrink: 0;
        }

        .team-card {
          position: relative;
          background: rgba(255,255,255,0.02);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 24px;
          padding: 40px;
          text-align: center;
          transition: all 300ms cubic-bezier(0.16,1,0.3,1);
          overflow: hidden;
        }
        .team-card::before {
          content: '';
          position: absolute; inset: 0; border-radius: 24px;
          background: radial-gradient(300px circle at 50% 30%, rgba(var(--primary-rgb),0.08), transparent 60%);
          opacity: 0;
          transition: opacity 300ms;
          pointer-events: none;
        }
        .team-card:hover::before { opacity: 1; }
        .team-card:hover {
          border-color: rgba(var(--primary-rgb),0.2);
          transform: translateY(-6px);
        }

        .dropdown-item:hover {
          background: rgba(255,255,255,0.06) !important;
          color: #EBEBEB !important;
        }
      `}</style>

      {/* ── Morphing Background ── */}
      <div style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none", overflow: "hidden" }}>
        <div style={{
          position: "absolute", top: "-100px", left: "-100px",
          width: "500px", height: "500px",
          background: "rgba(var(--primary-rgb),0.07)",
          filter: "blur(100px)",
          animation: "morph 10s ease-in-out infinite",
        }} />
        <div style={{
          position: "absolute", bottom: "100px", right: "-100px",
          width: "400px", height: "400px",
          background: "rgba(var(--primary-rgb),0.05)",
          filter: "blur(100px)",
          animation: "morph 14s ease-in-out infinite reverse",
        }} />
        <div style={{
          position: "absolute", inset: 0,
          backgroundImage: "linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }} />
      </div>

      {/* ── Mobile Nav Overlay ── */}
      <div className={`mobile-nav-overlay${mobileMenuOpen ? " open" : ""}`}>
        <button className="mobile-nav-close" onClick={() => setMobileMenuOpen(false)}>✕</button>

        {!isLoggedIn && (
          <>
            <a href="/login" onClick={() => setMobileMenuOpen(false)}>Log In</a>
            <a href="/register" style={{ background: "var(--primary)", color: "white", borderRadius: "9999px", padding: "12px 28px", fontWeight: 600 }} onClick={() => setMobileMenuOpen(false)}>Get Started →</a>
          </>
        )}
      </div>

      {/* ── Navbar ── */}
      <header className="nav-header" style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 50,
        padding: "20px 40px",
        background: scrolled ? "rgba(var(--bg-rgb),0.85)" : "transparent",
        backdropFilter: scrolled ? "blur(16px)" : "none",
        borderBottom: scrolled ? "1px solid rgba(255,255,255,0.06)" : "none",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        transform: (navVisible || mobileMenuOpen) ? "translateY(0)" : "translateY(-100%)",
        transition: "all 400ms cubic-bezier(0.16,1,0.3,1)",
      }}>
        <a href="/" style={{ display: "flex", alignItems: "center", gap: "10px", textDecoration: "none", color: "inherit" }}>
          <img src="/logo.png" alt="ANALYXX" className="logo-icon theme-logo nav-logo-icon" style={{
            width: "40px", height: "40px", borderRadius: "10px",
            cursor: "pointer", objectFit: "cover",
          }} />
          <span className="font-serif nav-logo-text" style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "20px", fontWeight: 400, letterSpacing: "-0.02em" }}>
            <span>ANALYXX <em style={{ color: "var(--primary)" }}>AI</em></span>
            {isPro && (
              <span className="analyxx-pro-badge">
                <span>Pro</span>
              </span>
            )}
          </span>
        </a>



        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <button className="mobile-menu-btn" onClick={() => setMobileMenuOpen(true)} aria-label="Open menu">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
          </button>
          <span className="nav-theme-customizer"><ThemeCustomizer /></span>
          {isLoggedIn ? (
            <div
              className="nav-user-dropdown"
              style={{ position: "relative" }}
              onMouseEnter={() => setDropdownOpen(true)}
              onMouseLeave={() => setDropdownOpen(false)}
            >
              <div style={{
                display: "flex", alignItems: "center", gap: "10px", cursor: "pointer",
                padding: "6px 14px 6px 6px", borderRadius: "9999px",
                background: dropdownOpen ? "rgba(255,255,255,0.06)" : "transparent",
                border: "1px solid",
                borderColor: dropdownOpen ? "rgba(var(--primary-rgb),0.25)" : "rgba(255,255,255,0.08)",
                transition: "all 300ms cubic-bezier(0.16,1,0.3,1)",
              }}>
                <div style={{
                  width: "32px", height: "32px", borderRadius: "50%",
                  background: profilePicture ? "transparent" : "linear-gradient(135deg, var(--primary), var(--primary))",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "14px", fontWeight: 700, color: "white",
                  overflow: "hidden",
                }}>
                  {profilePicture ? (
                    <img src={profilePicture} alt="Profile" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    userName.charAt(0).toUpperCase()
                  )}
                </div>
                <span style={{ fontSize: "14px", fontWeight: 500, color: "rgba(var(--text-rgb),0.8)" }}>
                  {userName}
                </span>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{
                  transform: dropdownOpen ? "rotate(180deg)" : "rotate(0deg)",
                  transition: "transform 300ms cubic-bezier(0.16,1,0.3,1)",
                }}>
                  <path d="M3 4.5L6 7.5L9 4.5" stroke="rgba(var(--text-rgb),0.4)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>

              {dropdownOpen && (
                <div style={{ position: "absolute", top: "100%", right: 0, paddingTop: "8px", zIndex: 100 }}>
                <div style={{
                  minWidth: "240px",
                  background: "rgba(var(--bg-rgb),0.88)",
                  backdropFilter: "blur(24px) saturate(180%)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: "16px", padding: "8px",
                  boxShadow: "0 20px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(var(--primary-rgb),0.05)",
                  animation: "dropdownSlide 0.25s cubic-bezier(0.16,1,0.3,1)",
                }}>
                  <div style={{
                    padding: "12px 14px", marginBottom: "4px",
                    borderBottom: "1px solid rgba(255,255,255,0.06)",
                  }}>
                    <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text)" }}>{userName}</div>
                    <div style={{ fontSize: "11px", color: "rgba(var(--text-rgb),0.35)", marginTop: "2px" }}>
                      {"" /* email from session */}
                    </div>
                  </div>
                  {[
                    { icon: "D", label: "Dashboard", href: "/dashboard" },
                    { icon: "L", label: "PYQ Library", href: "/upload" },
                    { icon: "P", label: "My Profile", href: "/profile" },
                  ].map((item) => (
                    <a key={item.label} href={item.href} className="dropdown-item" style={{
                      display: "flex", alignItems: "center", gap: "12px",
                      padding: "10px 14px", borderRadius: "10px",
                      fontSize: "13px", fontWeight: 500,
                      color: "rgba(var(--text-rgb),0.7)",
                      textDecoration: "none",
                      transition: "all 200ms",
                    }}>
                      <span style={{ fontSize: "11px", fontWeight: 600, width: "20px", textAlign: "center", color: "rgba(var(--text-rgb),0.4)", fontFamily: "'Space Grotesk', sans-serif" }}>{item.icon}</span>
                      {item.label}
                    </a>
                  ))}
                  <div style={{ height: "1px", background: "rgba(255,255,255,0.06)", margin: "4px 10px" }} />
                  <button
                    onClick={async () => {
                      await supabase.auth.signOut();
                      setIsLoggedIn(false);
                      setUserName("");
                      setDropdownOpen(false);
                      window.location.href = "/";
                    }}
                    className="dropdown-item"
                    style={{
                      display: "flex", alignItems: "center", gap: "12px",
                      padding: "10px 14px", borderRadius: "10px",
                      fontSize: "13px", fontWeight: 500,
                      color: "rgba(239,68,68,0.8)",
                      background: "transparent", border: "none",
                      cursor: "pointer", width: "100%", textAlign: "left",
                      transition: "all 200ms",
                      fontFamily: "'Inter', sans-serif",
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: "20px", flexShrink: 0 }}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
                    Logout
                  </button>
                </div>
                </div>
              )}
            </div>
          ) : (
            <div className="nav-auth-buttons" style={{ display: "contents" }}>
              <a href="/login" className="nav-link">Log In</a>
              <a href="/register" style={{
                background: "var(--primary)", color: "white",
                borderRadius: "9999px", padding: "10px 24px",
                fontSize: "14px", fontWeight: 600,
                textDecoration: "none", animation: "pulse-glow 2.5s infinite",
                transition: "all 300ms",
              }}>Get Started →</a>
            </div>
          )}
        </div>
      </header>

      <div style={{ position: "relative", zIndex: 1 }}>

        {/* ── Hero Section ── */}
        <section className="about-hero" style={{
          padding: "180px 40px 100px",
          maxWidth: "1280px", margin: "0 auto",
          textAlign: "center",
        }}>
          <p className="fade-up-1 font-grotesk" style={{
            fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.25em",
            color: "var(--primary)", marginBottom: "24px",
          }}>
            About ANALYXX AI
          </p>
          <h1 className="fade-up-2 font-serif gradient-headline" style={{
            fontSize: "clamp(48px, 6vw, 86px)",
            fontWeight: 200, lineHeight: 0.95,
            letterSpacing: "-0.03em",
            marginBottom: "32px",
          }}>
            We're building the<br />future of exam prep.
          </h1>
          <p className="fade-up-3" style={{
            fontSize: "19px", fontWeight: 300,
            color: "rgba(var(--text-rgb),0.45)",
            lineHeight: 1.8, maxWidth: "640px",
            margin: "0 auto 48px",
          }}>
            ANALYXX AI uses advanced natural language processing to analyze thousands of previous year papers, identify patterns, and predict what's most likely to appear in your next exam.
          </p>

          {/* Stats row */}
          <div className="fade-up-4 stats-row" style={{
            display: "flex", justifyContent: "center", gap: "60px", flexWrap: "wrap",
          }}>
            {[
              { value: "50,000+", label: "Papers Analyzed" },
              { value: "94%", label: "Prediction Accuracy" },
              { value: "10,000+", label: "Active Students" },
              { value: "2M+", label: "Questions Extracted" },
            ].map((stat, i) => (
              <div key={i} style={{ textAlign: "center" }}>
                <div className="font-serif" style={{ fontSize: "36px", fontWeight: 300, color: "var(--primary)", lineHeight: 1.2 }}>{stat.value}</div>
                <div className="font-grotesk" style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.2em", color: "rgba(var(--text-rgb),0.3)", marginTop: "6px" }}>{stat.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Mission Section ── */}
        <section className="about-section-padded" style={{ padding: "80px 40px 120px", maxWidth: "1280px", margin: "0 auto" }}>
          <div className="about-mission-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "80px", alignItems: "center" }}>
            <div>
              <p className="font-grotesk" style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.25em", color: "var(--primary)", marginBottom: "16px" }}>
                Our Mission
              </p>
              <h2 className="font-serif" style={{
                fontSize: "clamp(36px, 4vw, 52px)", fontWeight: 300,
                letterSpacing: "-0.03em", lineHeight: 1.1,
                marginBottom: "24px",
              }}>
                Democratize exam<br /><em style={{ color: "var(--primary)" }}>intelligence.</em>
              </h2>
              <p style={{ fontSize: "16px", color: "rgba(var(--text-rgb),0.4)", lineHeight: 1.8, fontWeight: 300, marginBottom: "20px" }}>
                Every student deserves access to smart, data-driven exam preparation — not just those who can afford expensive coaching. We built ANALYXX AI to level the playing field.
              </p>
              <p style={{ fontSize: "16px", color: "rgba(var(--text-rgb),0.4)", lineHeight: 1.8, fontWeight: 300 }}>
                Our AI analyzes decades of exam patterns across JEE, UPSC, NEET, CAT, and GATE — extracting insights that would take humans thousands of hours to compile. We make this intelligence available to everyone.
              </p>
            </div>

            {/* Visual element */}
            <div style={{
              background: "rgba(255,255,255,0.02)",
              backdropFilter: "blur(12px)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "24px", padding: "48px",
              position: "relative",
            }}>
              <div className="font-grotesk" style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.2em", color: "rgba(var(--text-rgb),0.3)", marginBottom: "32px" }}>
                How It Works
              </div>
              {[
                { step: "01", title: "Upload Papers", desc: "Drop your previous year papers — PDF, images, or scanned docs." },
                { step: "02", title: "AI Analysis", desc: "Our NLP engine extracts questions, classifies topics, and maps patterns." },
                { step: "03", title: "Get Predictions", desc: "Receive ranked predictions of high-probability topics for your exam." },
              ].map((item, i) => (
                <div key={i} style={{
                  display: "flex", gap: "20px", marginBottom: i < 2 ? "28px" : "0",
                  paddingBottom: i < 2 ? "28px" : "0",
                  borderBottom: i < 2 ? "1px solid rgba(255,255,255,0.05)" : "none",
                }}>
                  <div className="font-grotesk" style={{
                    fontSize: "11px", fontWeight: 600, color: "var(--primary)",
                    width: "28px", flexShrink: 0, paddingTop: "3px",
                  }}>{item.step}</div>
                  <div>
                    <div className="font-serif" style={{ fontSize: "18px", fontWeight: 400, marginBottom: "6px" }}>{item.title}</div>
                    <div style={{ fontSize: "14px", color: "rgba(var(--text-rgb),0.35)", lineHeight: 1.7, fontWeight: 300 }}>{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Our Values ── */}
        <section className="about-section" style={{ padding: "0 40px 120px", maxWidth: "1280px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "64px" }}>
            <p className="font-grotesk" style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.25em", color: "var(--primary)", marginBottom: "16px" }}>
              Our Values
            </p>
            <h2 className="font-serif" style={{
              fontSize: "clamp(36px, 4vw, 52px)", fontWeight: 300,
              letterSpacing: "-0.03em",
            }}>
              What <em style={{ color: "var(--primary)" }}>drives</em> us.
            </h2>
          </div>

          <div className="about-values-grid" style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "20px" }}>
            {values.map((value, i) => (
              <div key={i} className="about-card">
                <h3 className="font-serif" style={{ fontSize: "24px", fontWeight: 400, letterSpacing: "-0.02em", marginBottom: "12px" }}>
                  {value.title}
                </h3>
                <p style={{ fontSize: "15px", color: "rgba(var(--text-rgb),0.4)", lineHeight: 1.75, fontWeight: 300 }}>
                  {value.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Team Section ── */}
        <section className="about-section" style={{ padding: "0 40px 120px", maxWidth: "1280px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "64px" }}>
            <p className="font-grotesk" style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.25em", color: "var(--primary)", marginBottom: "16px" }}>
              The Team
            </p>
            <h2 className="font-serif" style={{
              fontSize: "clamp(36px, 4vw, 52px)", fontWeight: 300,
              letterSpacing: "-0.03em",
            }}>
              powered by <em style={{ color: "var(--primary)" }}>Passion.</em>
            </h2>
          </div>

          <div className="about-team-grid" style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "24px", maxWidth: "800px", margin: "0 auto" }}>
            {teamMembers.map((member, i) => (
              <div key={i} className="team-card">
                <h3 className="font-serif" style={{ fontSize: "22px", fontWeight: 400, marginBottom: "4px" }}>
                  {member.name}
                </h3>
                <p className="font-grotesk" style={{
                  fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.2em",
                  color: "var(--primary)", marginBottom: "16px",
                }}>{member.role}</p>
                <p style={{ fontSize: "14px", color: "rgba(var(--text-rgb),0.4)", lineHeight: 1.7, fontWeight: 300 }}>
                  {member.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Timeline Section ── */}
        <section className="about-section" style={{ padding: "0 40px 120px", maxWidth: "800px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "64px" }}>
            <p className="font-grotesk" style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.25em", color: "var(--primary)", marginBottom: "16px" }}>
              Our Journey
            </p>
            <h2 className="font-serif" style={{
              fontSize: "clamp(36px, 4vw, 52px)", fontWeight: 300,
              letterSpacing: "-0.03em",
            }}>
              From idea to <em style={{ color: "var(--primary)" }}>impact.</em>
            </h2>
          </div>

          <div style={{ position: "relative" }}>
            {/* Vertical line */}
            <div style={{
              position: "absolute", left: "5px", top: "6px", bottom: "6px",
              width: "2px", background: "rgba(var(--primary-rgb),0.15)",
            }} />

            {milestones.map((m, i) => (
              <div key={i} style={{
                display: "flex", gap: "28px", marginBottom: i < milestones.length - 1 ? "36px" : "0",
                alignItems: "flex-start",
              }}>
                <div className="timeline-dot" style={{ marginTop: "6px" }} />
                <div>
                  <span className="font-grotesk" style={{
                    fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.2em",
                    color: "var(--primary)", display: "block", marginBottom: "8px",
                  }}>{m.year}</span>
                  <p style={{ fontSize: "15px", color: "rgba(var(--text-rgb),0.6)", lineHeight: 1.7, fontWeight: 300 }}>
                    {m.event}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── CTA Section ── */}
        <section className="about-cta-section" style={{ padding: "0 40px 120px", textAlign: "center", maxWidth: "900px", margin: "0 auto" }}>
          <h2 className="font-serif gradient-headline" style={{
            fontSize: "clamp(48px, 6vw, 86px)",
            fontWeight: 200, lineHeight: 0.95,
            letterSpacing: "-0.04em", marginBottom: "32px",
          }}>
            Ready to start<br />predicting?
          </h2>
          <p style={{ fontSize: "18px", color: "rgba(var(--text-rgb),0.4)", fontWeight: 300, marginBottom: "48px", maxWidth: "480px", margin: "0 auto 48px" }}>
            Join thousands of students already studying smarter with AI-powered analysis.
          </p>
          <a href="/register" style={{
            background: "white", color: "var(--bg)",
            borderRadius: "9999px", padding: "18px 52px",
            fontWeight: 600, fontSize: "16px",
            textDecoration: "none", display: "inline-block",
            border: "none", cursor: "pointer",
            transition: "all 300ms cubic-bezier(0.16,1,0.3,1)",
            animation: "pulse-glow 2.5s infinite",
          }}>
            Start Analyzing Free →
          </a>
        </section>

        {/* ── Footer ── */}
        <footer className="footer-wrap" style={{ background: "var(--bg)", borderTop: "1px solid rgba(255,255,255,0.05)", padding: "64px 40px 32px" }}>
          <div style={{ maxWidth: "1280px", margin: "0 auto" }}>
            <div className="footer-grid" style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: "48px", marginBottom: "60px" }}>
              <div className="footer-brand-col">
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
                  <img src="/logo.png" alt="ANALYXX" className="theme-logo" style={{ width: "36px", height: "36px", borderRadius: "9px", objectFit: "cover" }} />
                  <span className="font-serif" style={{ fontSize: "20px", fontWeight: 300 }}>ANALYXX <em style={{ color: "var(--primary)" }}>AI</em></span>
                </div>
                <p style={{ fontSize: "14px", color: "rgba(var(--text-rgb),0.3)", lineHeight: 1.75, maxWidth: "260px", fontWeight: 300 }}>
                  AI-powered exam preparation for the next generation of students.
                </p>
              </div>
              {[
                { title: "Product", links: [{label: "Features", href: "/#features"}, {label: "Pricing", href: "/#pricing"}, {label: "API", href: "#"}, {label: "Changelog", href: "#"}] },
                { title: "Exams", links: [{label: "JEE Advanced", href: "#"}, {label: "UPSC CSE", href: "#"}, {label: "NEET", href: "#"}, {label: "CAT", href: "#"}, {label: "GATE", href: "#"}] },
                { title: "Company", links: [{label: "About", href: "/about"}, {label: "Careers", href: "#"}, {label: "Contact", href: "#"}] },
              ].map((col) => (
                <div key={col.title}>
                  <p className="font-grotesk" style={{ fontSize: "10px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.25em", color: "var(--primary)", marginBottom: "20px" }}>{col.title}</p>
                  {col.links.map((link) => (
                    <a key={link.label} href={link.href} className="nav-link" style={{ display: "block", marginBottom: "12px", fontSize: "14px", fontWeight: 300 }}>{link.label}</a>
                  ))}
                </div>
              ))}
            </div>

            <div className="footer-bottom" style={{ borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: "24px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
              <span className="font-grotesk" style={{ fontSize: "10px", color: "rgba(var(--text-rgb),0.2)", textTransform: "uppercase", letterSpacing: "0.2em" }}>
                © 2026 ANALYXX AI · All Rights Reserved
              </span>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--primary)", animation: "ping 2s infinite", display: "inline-block" }} />
                <span className="font-grotesk" style={{ fontSize: "10px", color: "var(--primary)", textTransform: "uppercase", letterSpacing: "0.2em" }}>All Systems Operational</span>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </main>
  );
}
