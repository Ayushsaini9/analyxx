"use client";
import { useState, useEffect, useRef } from "react";
import ThemeCustomizer from "./components/ThemeCustomizer";
import AskClaritySidebar from "./components/AskClaritySidebar";
import FAQSchema, { faqData } from "./components/FAQSchema";
import { API_BASE, RAZORPAY_KEY_ID } from "./lib/config";
import { supabase } from "./lib/supabase";

const API = API_BASE;

// Razorpay checkout.js type declaration
declare global {
  interface Window {
    Razorpay: any;
  }
}

export default function Home() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [claritySidebarOpen, setClaritySidebarOpen] = useState(false);

  // Auto-open sidebar when returning from login (via ?openSidebar=true)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("openSidebar") === "true") {
        setClaritySidebarOpen(true);
        // Clean up the URL without reloading
        const url = new URL(window.location.href);
        url.searchParams.delete("openSidebar");
        window.history.replaceState({}, "", url.pathname + url.search + url.hash);
      }
    }
  }, []);

  // Listen for messages from the sidebar iframe (e.g. Upgrade click)
  useEffect(() => {
    const handleIframeMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'CLOSE_SIDEBAR_NAVIGATE') {
        setClaritySidebarOpen(false);
        const url = event.data.url as string;
        if (url) {
          // Small delay to let sidebar close animation start
          setTimeout(() => {
            window.location.href = url;
          }, 100);
        }
      }
    };
    window.addEventListener('message', handleIframeMessage);
    return () => window.removeEventListener('message', handleIframeMessage);
  }, []);

  // Lock body scroll when mobile nav is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.classList.add('mobile-nav-locked');
    } else {
      document.body.classList.remove('mobile-nav-locked');
    }
    return () => document.body.classList.remove('mobile-nav-locked');
  }, [mobileMenuOpen]);
  const [scrolled, setScrolled] = useState(false);
  const [navVisible, setNavVisible] = useState(true);
  const lastScrollY = useRef(0);
  const [counts, setCounts] = useState({ papers: 0, accuracy: 0, students: 0, questions: 0 });
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [profilePicture, setProfilePicture] = useState("");
  const [isPro, setIsPro] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [pricingPeriod, setPricingPeriod] = useState<"daily" | "monthly" | "annually">("monthly");
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutSuccess, setCheckoutSuccess] = useState("");
  const [checkoutError, setCheckoutError] = useState("");

  // --- 3-day limited-time offer for Pro daily ---
  const OFFER_DURATION_MS = 3 * 24 * 60 * 60 * 1000; // 3 days
  const [proOfferTimeLeft, setProOfferTimeLeft] = useState<number | null>(null);

  useEffect(() => {
    const STORAGE_KEY = "pro_daily_offer_start";
    let stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      stored = String(Date.now());
      localStorage.setItem(STORAGE_KEY, stored);
    }
    const offerStart = Number(stored);

    const tick = () => {
      const elapsed = Date.now() - offerStart;
      const remaining = OFFER_DURATION_MS - elapsed;
      setProOfferTimeLeft(remaining > 0 ? remaining : 0);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  const tableRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const handleScroll = () => {
      const currentY = window.scrollY;
      setScrolled(currentY > 40);
      // Always show navbar near the top, or when mobile menu is open
      if (currentY <= 40) {
        setNavVisible(true);
      } else if (currentY < lastScrollY.current) {
        // Scrolling up
        setNavVisible(true);
      } else if (currentY > lastScrollY.current + 10) {
        // Scrolling down (with 10px deadzone to avoid flicker)
        setNavVisible(false);
      }
      lastScrollY.current = currentY;
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Check auth state on mount and fetch profile
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setIsLoggedIn(true);
        const meta = session.user.user_metadata;
        setUserName(meta?.full_name || meta?.name || session.user.email?.split("@")[0] || "User");
        setUserEmail(session.user.email || "");
        const token = session.access_token;
        // Fetch profile picture
        fetch(`${API}/auth/profile`, {
          headers: { Authorization: `Bearer ${token}` },
        })
          .then((res) => res.json())
          .then((data) => {
            if (data.profile_picture) setProfilePicture(data.profile_picture);
            if (data.name) setUserName(data.name);
          })
          .catch(() => {});

        // Fetch subscription status
        fetch(`${API}/payments/subscription`, {
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
    });
  }, []);

  // Count-up on table visible
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        observer.unobserve(entry.target); // one-shot: only animate once
        const targets = { papers: 50000, accuracy: 94, students: 10000, questions: 2000000 };
        const duration = 1800;
        const steps = 60;
        let step = 0;
        const timer = setInterval(() => {
          step++;
          const progress = step / steps;
          const ease = 1 - Math.pow(1 - progress, 3);
          setCounts({
            papers: Math.floor(ease * targets.papers),
            accuracy: Math.floor(ease * targets.accuracy),
            students: Math.floor(ease * targets.students),
            questions: Math.floor(ease * targets.questions),
          });
          if (step >= steps) clearInterval(timer);
        }, duration / steps);
      }
    }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });
    if (tableRef.current) observer.observe(tableRef.current);
    return () => observer.disconnect();
  }, []);

  // Lazy-load Razorpay checkout.js only when needed (on checkout click)
  const loadRazorpay = () => {
    return new Promise<void>((resolve) => {
      if (window.Razorpay) { resolve(); return; }
      if (document.getElementById("razorpay-script")) {
        const existing = document.getElementById("razorpay-script") as HTMLScriptElement;
        existing.addEventListener("load", () => resolve());
        return;
      }
      const script = document.createElement("script");
      script.id = "razorpay-script";
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      script.onload = () => resolve();
      document.body.appendChild(script);
    });
  };

  // Spotlight cursor tracking
  const handleMouseMove = (e: React.MouseEvent, idx: number) => {
    const card = cardRefs.current[idx];
    if (!card) return;
    const rect = card.getBoundingClientRect();
    card.style.setProperty("--mouse-x", `${e.clientX - rect.left}px`);
    card.style.setProperty("--mouse-y", `${e.clientY - rect.top}px`);
  };

  // ── Razorpay checkout handler ──
  const handleCheckout = async (plan: "pro_daily" | "pro_monthly" | "pro_annual") => {
    setCheckoutError("");
    setCheckoutSuccess("");

    // 1. Check if logged in
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      window.location.href = "/login?redirect=/#pricing";
      return;
    }
    const token = session.access_token;
    const userEmail = session.user.email || "";
    const userName = session.user.user_metadata?.full_name || session.user.user_metadata?.name || userEmail.split("@")[0] || "User";

    setCheckoutLoading(true);

    try {
      // 2. Create order or subscription
      let endpoint: string;
      let body: any;

      if (plan === "pro_daily") {
        endpoint = `${API}/payments/create-order`;
        body = { plan: "pro_daily" };
      } else {
        endpoint = `${API}/payments/create-subscription`;
        body = { plan };
      }

      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to create payment.");

      // 3. Open Razorpay Checkout
      const options: any = {
        key: RAZORPAY_KEY_ID,
        amount: data.amount,
        currency: data.currency || "INR",
        name: "ANALYXX AI",
        description: plan === "pro_daily"
          ? "Pro Day Pass — 24h unlimited access"
          : plan === "pro_monthly"
            ? "Pro Monthly — Unlimited papers"
            : "Pro Annual — Unlimited papers (Save 17%)",
        image: "/logo.png",
        prefill: {
          name: userName,
          email: userEmail,
        },
        notes: {
          plan,
          user_id: session.user.id,
        },
        theme: {
          color: "#10b981",
        },
        handler: async (response: any) => {
          // 4. Verify payment on backend
          try {
            const verifyRes = await fetch(`${API}/payments/verify`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id || null,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                razorpay_subscription_id: response.razorpay_subscription_id || null,
                plan,
              }),
            });
            const verifyData = await verifyRes.json();
            if (!verifyRes.ok) throw new Error(verifyData.detail || "Verification failed.");

            setCheckoutSuccess(verifyData.message || "Payment successful! Your Pro plan is active.");
            // Redirect to upload page after 2 seconds
            setTimeout(() => {
              window.location.href = "/upload";
            }, 2000);
          } catch (err) {
            setCheckoutError(err instanceof Error ? err.message : "Payment verification failed.");
          }
        },
        modal: {
          ondismiss: () => {
            setCheckoutLoading(false);
          },
        },
      };

      // Set order_id for one-time, subscription_id for recurring
      if (data.order_id) {
        options.order_id = data.order_id;
      }
      if (data.subscription_id) {
        options.subscription_id = data.subscription_id;
      }

      await loadRazorpay();

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", (response: any) => {
        setCheckoutError(response.error?.description || "Payment failed. Please try again.");
        setCheckoutLoading(false);
      });
      rzp.open();
    } catch (err) {
      setCheckoutError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setCheckoutLoading(false);
    }
  };

  return (
    <main style={{ background: "var(--bg)", color: "var(--text)", fontFamily: "'Inter', sans-serif", overflowX: "hidden" }}>
      <style>{`
        .font-serif  { font-family: 'Newsreader', serif; }
        .font-grotesk { font-family: 'Space Grotesk', sans-serif; }

        * { box-sizing: border-box; }
        html { scroll-behavior: smooth; }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(32px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes morph {
          0%,100% { border-radius: 40% 60% 60% 40% / 70% 30% 70% 30%; }
          50%      { border-radius: 60% 40% 40% 60% / 30% 70% 30% 70%; }
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
        @keyframes ticker {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes ping {
          0%,100% { transform: scale(1); opacity: 1; }
          50%      { transform: scale(1.8); opacity: 0.2; }
        }
        @keyframes float {
          0%,100% { transform: translateY(0px); }
          50%      { transform: translateY(-12px); }
        }
        @keyframes gradient-shift {
          0%,100% { background-position: 0% 50%; }
          50%      { background-position: 100% 50%; }
        }

        .fade-up-1 { animation: fadeUp 0.8s cubic-bezier(0.16,1,0.3,1) 0.1s both; }
        .fade-up-2 { animation: fadeUp 0.8s cubic-bezier(0.16,1,0.3,1) 0.25s both; }
        .fade-up-3 { animation: fadeUp 0.8s cubic-bezier(0.16,1,0.3,1) 0.4s both; }
        .fade-up-4 { animation: fadeUp 0.8s cubic-bezier(0.16,1,0.3,1) 0.55s both; }
        .fade-up-5 { animation: fadeUp 0.8s cubic-bezier(0.16,1,0.3,1) 0.7s both; }

        .emerald-btn {
          background: white; color: #050505;
          border-radius: 9999px; padding: 14px 28px;
          font-weight: 600; font-size: 15px;
          text-decoration: none; display: inline-block;
          border: none; cursor: pointer;
          transition: all 300ms cubic-bezier(0.16,1,0.3,1);
          animation: pulse-glow 2.5s infinite;
        }
        .emerald-btn:hover { transform: scale(1.03); box-shadow: 0 0 0 4px rgba(var(--primary-rgb),0.3); }

        .ghost-btn {
          background: transparent; color: var(--text);
          border-radius: 9999px; padding: 14px 28px;
          font-weight: 500; font-size: 15px;
          text-decoration: none; display: inline-block;
          border: 1px solid rgba(255,255,255,0.15);
          transition: all 300ms cubic-bezier(0.16,1,0.3,1);
        }
        .ghost-btn:hover { background: rgba(255,255,255,0.05); border-color: rgba(255,255,255,0.3); }

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

        .spotlight-card {
          position: relative;
          background: rgba(255,255,255,0.02);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 24px; padding: 40px;
          overflow: hidden;
          transition: border-color 300ms cubic-bezier(0.16,1,0.3,1), transform 300ms cubic-bezier(0.16,1,0.3,1);
          cursor: default;
        }
        .spotlight-card::before {
          content: '';
          position: absolute; inset: 0; border-radius: 24px;
          background: radial-gradient(600px circle at var(--mouse-x, 50%) var(--mouse-y, 50%), rgba(var(--primary-rgb),0.12), transparent 40%);
          opacity: 0;
          transition: opacity 300ms;
          pointer-events: none;
        }
        .spotlight-card:hover::before { opacity: 1; }
        .spotlight-card::after {
          content: '';
          position: absolute; inset: -1px; border-radius: 24px;
          background: linear-gradient(90deg, transparent, rgba(var(--primary-rgb),0.25), transparent);
          background-size: 200% 100%;
          animation: shimmer 4s linear infinite;
          pointer-events: none; opacity: 0;
          transition: opacity 300ms;
        }
        .spotlight-card:hover::after { opacity: 1; }
        .spotlight-card:hover { border-color: rgba(var(--primary-rgb),0.2); transform: translateY(-4px); }
        .spotlight-card:hover .card-icon { transform: rotate(360deg); }

        .card-icon {
          transition: transform 600ms cubic-bezier(0.16,1,0.3,1);
          display: inline-flex; align-items: center; justify-content: center;
          width: 52px; height: 52px; border-radius: 16px;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.08);
          font-size: 16px; font-weight: 700; margin-bottom: 24px;
          font-family: 'Space Grotesk', sans-serif; color: var(--primary); letter-spacing: -0.02em;
        }

        .gradient-headline {
          background: linear-gradient(90deg, #ffffff 0%, var(--primary) 50%, #ffffff 100%);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: gradient-shift 4s ease infinite;
        }

        .ticker-track {
          display: flex; width: max-content;
          animation: ticker 40s linear infinite;
        }

        .logo-icon:hover { animation: spin 600ms cubic-bezier(0.16,1,0.3,1) forwards; }

        .table-row:hover { background: rgba(var(--primary-rgb),0.03); }

        .check-pulse {
          display: inline-flex; align-items: center; justify-content: center;
          width: 20px; height: 20px; border-radius: 50%;
          background: rgba(var(--primary-rgb),0.15);
          color: var(--primary); font-size: 11px;
        }

        @keyframes dropdownSlide {
          from { opacity: 0; transform: translateY(-8px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        .dropdown-item:hover {
          background: rgba(255,255,255,0.06) !important;
          color: #EBEBEB !important;
        }

        .social-icon {
          display: inline-flex; align-items: center; justify-content: center;
          width: 40px; height: 40px; border-radius: 12px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          color: rgba(var(--text-rgb),0.4);
          transition: all 300ms cubic-bezier(0.16,1,0.3,1);
          text-decoration: none;
        }
        .social-icon:hover {
          transform: translateY(-3px);
          border-color: rgba(var(--primary-rgb),0.3);
          background: rgba(var(--primary-rgb),0.08);
          color: var(--primary);
        }
        .social-icon svg { transition: transform 300ms cubic-bezier(0.16,1,0.3,1); }
        .social-icon:hover svg { transform: scale(1.15); }
      `}</style>

      {/* ── Morphing Background Globs ── */}
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
        {/* Grid */}
        <div style={{
          position: "absolute", inset: 0,
          backgroundImage: "linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }} />
      </div>

      {/* ── Mobile Nav Overlay ── */}
      <div className={`mobile-nav-overlay${mobileMenuOpen ? " open" : ""}`}>
        <button className="mobile-nav-close" onClick={() => setMobileMenuOpen(false)}>✕</button>
        {[{label: "Library", href: "/library"}, {label: "Pricing", href: "#pricing"}, {label: "About", href: "/about"}].map((l) => (
          <a key={l.label} href={l.href} onClick={() => setMobileMenuOpen(false)}>{l.label}</a>
        ))}
        <button
          onClick={() => { setMobileMenuOpen(false); setClaritySidebarOpen(true); }}
          style={{
            background: "none", border: "none", cursor: "pointer",
            fontSize: "20px", fontWeight: 500,
            color: "var(--primary)",
            fontFamily: "'Inter', sans-serif",
            padding: "10px 0",
            display: "flex", alignItems: "center", gap: "8px",
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
            <sup style={{ fontStyle: "italic", fontSize: "0.75em", fontFamily: "var(--font-newsreader, 'Newsreader'), Georgia, serif", marginRight: "2px" }}>ask</sup>Clarity
        </button>
        {isLoggedIn ? (
          <>
            <a href="/upload" onClick={() => setMobileMenuOpen(false)}>My Analyses</a>
            <a href="/profile" onClick={() => setMobileMenuOpen(false)}>Profile</a>
            <a href="/billing" onClick={() => setMobileMenuOpen(false)}>Billing</a>
            <button
              onClick={async () => {
                await supabase.auth.signOut();
                setIsLoggedIn(false);
                setUserName("");
                setMobileMenuOpen(false);
              }}
              style={{
                background: "none", border: "none", cursor: "pointer",
                fontSize: "20px", fontWeight: 500,
                color: "rgba(239,68,68,0.8)",
                fontFamily: "'Inter', sans-serif",
                padding: "10px 0",
              }}
            >
              Logout
            </button>
          </>
        ) : (
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
        borderBottom: "none",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        transform: (navVisible || mobileMenuOpen) ? "translateY(0)" : "translateY(-100%)",
        transition: "all 400ms cubic-bezier(0.16,1,0.3,1)",
      }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
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
        </div>

        {/* Links */}
        <div className="desktop-nav-links" style={{ display: "flex", gap: "36px", alignItems: "center" }}>
          <button
            className="nav-link ask-clarity-nav-btn"
            onClick={() => setClaritySidebarOpen(true)}
            title="Ask Clarity — AI Study Assistant"
          >
            <sup>ask</sup>Clarity
          </button>
          {[{label: "Library", href: "/library"}, {label: "Pricing", href: "#pricing"}, {label: "About", href: "/about"}].map((l) => (
            <a key={l.label} href={l.href} className="nav-link">{l.label}</a>
          ))}
        </div>

        {/* CTA */}
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
              {/* Avatar trigger */}
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
                  fontFamily: "'Inter', sans-serif",
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

              {/* Dropdown menu */}
              {dropdownOpen && (
                <div style={{ position: "absolute", top: "100%", right: 0, paddingTop: "8px", zIndex: 100 }}>
                <div className="user-dropdown" style={{
                  minWidth: "240px",
                  background: "rgba(var(--bg-rgb),0.88)",
                  backdropFilter: "blur(24px) saturate(180%)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: "16px", padding: "8px",
                  boxShadow: "0 20px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(var(--primary-rgb),0.05)",
                  animation: "dropdownSlide 0.25s cubic-bezier(0.16,1,0.3,1)",
                }}>
                  {/* User info header */}
                  <div style={{
                    padding: "12px 14px", marginBottom: "4px",
                    borderBottom: "1px solid rgba(255,255,255,0.06)",
                  }}>
                    <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text)" }}>{userName}</div>
                    <div style={{ fontSize: "11px", color: "rgba(var(--text-rgb),0.35)", marginTop: "2px" }}>
                      {userEmail}
                    </div>
                  </div>

                  {/* Menu items */}
                  {[
                    { label: "My Analyses", href: "/upload" },
                    { label: "PYQ Library", href: "/upload" },
                    { label: "Billing", href: "/billing" },
                    { label: "My Profile", href: "/profile" },
                  ].map((item) => (
                    <a key={item.label} href={item.href} className="dropdown-item" style={{
                      display: "flex", alignItems: "center",
                      padding: "10px 14px", borderRadius: "10px",
                      fontSize: "13px", fontWeight: 500,
                      color: "rgba(var(--text-rgb),0.7)",
                      textDecoration: "none",
                      transition: "all 200ms",
                    }}>
                      {item.label}
                    </a>
                  ))}

                  {/* Divider */}
                  <div style={{
                    height: "1px", background: "rgba(255,255,255,0.06)",
                    margin: "4px 10px",
                  }} />

                  {/* Logout */}
                  <button
                    onClick={async () => {
                      await supabase.auth.signOut();
                      setIsLoggedIn(false);
                      setUserName("");
                      setDropdownOpen(false);
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

        {/* ── Hero ── */}
        <section className="hero-section" style={{
          minHeight: "100vh",
          maxWidth: "1280px", margin: "0 auto",
          padding: "140px 40px 80px",
          display: "grid", gridTemplateColumns: "1.2fr 0.8fr",
          gap: "80px", alignItems: "center",
        }}>
          {/* Left */}
          <div>
            {/* Tech label */}
            <div className="fade-up-1 font-grotesk hero-badge" style={{
              display: "inline-flex", alignItems: "center", gap: "10px",
              fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.2em",
              color: "rgba(var(--text-rgb),0.4)",
              marginBottom: "28px",
            }}>
              <span style={{ position: "relative", display: "inline-flex", width: "8px", height: "8px" }}>
                <span style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "var(--primary)", animation: "ping 2s infinite" }} />
                <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "var(--primary)", display: "inline-block" }} />
              </span>
              AI Study Partner · Multi-Model AI · v3.0
            </div>

            {/* Heading */}
            <h1 className="fade-up-2 font-serif hero-headline" style={{
              fontSize: "clamp(56px, 6.5vw, 96px)",
              fontWeight: 300, lineHeight: 0.92,
              letterSpacing: "-0.03em",
              marginBottom: "28px",
            }}>
              Study smarter.<br />
              <em style={{ fontStyle: "italic", color: "var(--primary)" }}>Score higher.</em><br />
              With AI
            </h1>

            <p className="fade-up-3 hero-subtext" style={{
              fontSize: "18px", fontWeight: 300,
              color: "rgba(var(--text-rgb),0.5)",
              lineHeight: 1.75, maxWidth: "440px",
              marginBottom: "40px",
            }}>
              Ask any study doubt. Get step-by-step solutions. Analyze PYQs for JEE, NEET, UPSC, GATE, CAT & SSC — powered by 3 AI models working together for the best answers.
            </p>

            <div className="fade-up-4 hero-cta-row" style={{ display: "flex", gap: "14px", flexWrap: "wrap", marginBottom: "52px", alignItems: "center" }}>
              {isLoggedIn ? (
                <>
                  <a href="/roadmap" className="emerald-btn hero-cta">Start Studying →</a>
                  <a href="https://wa.me/918824551165?text=Hi" target="_blank" rel="noopener noreferrer" className="hero-cta whatsapp-btn" style={{
                    background: "rgba(37,211,102,0.1)",
                    color: "#25D366",
                    borderRadius: "9999px",
                    padding: "12px 20px",
                    fontWeight: 600,
                    fontSize: "14px",
                    textDecoration: "none",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                    border: "1px solid rgba(37,211,102,0.3)",
                    transition: "all 300ms cubic-bezier(0.16,1,0.3,1)",
                    cursor: "pointer",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(37,211,102,0.2)"; e.currentTarget.style.borderColor = "rgba(37,211,102,0.5)"; e.currentTarget.style.transform = "scale(1.03)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(37,211,102,0.1)"; e.currentTarget.style.borderColor = "rgba(37,211,102,0.3)"; e.currentTarget.style.transform = "scale(1)"; }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="#25D366">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                    </svg>
                    Get PYQs on WhatsApp
                  </a>

                </>
              ) : (
                <>
                  <a href="/register" className="emerald-btn">Start Analyzing Free →</a>
                  <a href="/login" className="ghost-btn">Login</a>

                </>
              )}
            </div>

            {/* Social proof */}
            <div className="fade-up-5" style={{ display: "flex", alignItems: "center", gap: "16px" }}>
              <div style={{ display: "flex" }}>
                {[0,1,2,3].map((i) => (
                  <div key={i} style={{
                    width: "34px", height: "34px", borderRadius: "50%",
                    background: `rgba(var(--primary-rgb),${0.15 + i * 0.08})`,
                    border: "2px solid #050505",
                    marginLeft: i > 0 ? "-10px" : "0",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "14px",
                  }}>  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(var(--primary-rgb),0.6)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg></div>
                ))}
              </div>
              <div>
                <div style={{ fontSize: "14px", fontWeight: 500, color: "var(--text)" }}>10,000+ students</div>
                <div style={{ fontSize: "12px", color: "rgba(var(--text-rgb),0.4)" }}>studying smarter with AI</div>
              </div>
            </div>
          </div>

          {/* Right — floating UI mockup */}
          <div className="fade-up-3 hero-mockup" style={{ position: "relative", animation: "float 6s ease-in-out infinite" }}>
            {/* Main glass card */}
            <div style={{
              background: "rgba(255,255,255,0.03)",
              backdropFilter: "blur(12px)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "24px", padding: "36px",
            }}>
              <div className="font-grotesk" style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.2em", color: "rgba(var(--text-rgb),0.3)", marginBottom: "20px" }}>
                Analysis Output · JEE Advanced 2024
              </div>
              <h3 className="font-serif" style={{ fontSize: "28px", fontWeight: 300, marginBottom: "24px" }}>
                Exam <em style={{ color: "var(--primary)" }}>predictions</em> ready
              </h3>

              {/* Bars */}
              {[
                { label: "JEE Advanced", val: 94 },
                { label: "UPSC CSE", val: 87 },
                { label: "NEET", val: 81 },
                { label: "CAT", val: 76 },
                { label: "GATE", val: 68 },
              ].map((item, i) => (
                <div key={i} style={{ marginBottom: "14px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                    <span style={{ fontSize: "13px", color: "rgba(var(--text-rgb),0.6)" }}>{item.label}</span>
                    <span style={{ fontSize: "12px", color: "var(--primary)", fontFamily: "monospace" }}>{item.val}%</span>
                  </div>
                  <div style={{ height: "4px", background: "rgba(255,255,255,0.05)", borderRadius: "9999px", overflow: "hidden" }}>
                    <div style={{
                      height: "100%", width: `${item.val}%`,
                      background: `linear-gradient(90deg, var(--primary), rgba(var(--primary-rgb),0.4))`,
                      borderRadius: "9999px",
                      transition: "width 1s cubic-bezier(0.16,1,0.3,1)",
                    }} />
                  </div>
                </div>
              ))}
            </div>

            {/* Floating badge top-right */}
            <div style={{
              position: "absolute", top: "-20px", right: "-20px",
              background: "rgba(var(--primary-rgb),0.15)",
              backdropFilter: "blur(12px)",
              border: "1px solid rgba(var(--primary-rgb),0.3)",
              borderRadius: "16px", padding: "12px 18px",
              display: "flex", alignItems: "center", gap: "8px",
            }}>
              <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "var(--primary)", animation: "ping 2s infinite", display: "inline-block" }} />
              <span className="font-grotesk" style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.15em", color: "var(--primary)" }}>Live Analysis</span>
            </div>

            {/* Floating badge bottom-left */}
            <div style={{
              position: "absolute", bottom: "-16px", left: "-16px",
              background: "rgba(var(--bg-rgb),0.75)",
              backdropFilter: "blur(12px)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "16px", padding: "12px 20px",
            }}>
              <div className="font-grotesk" style={{ fontSize: "9px", textTransform: "uppercase", letterSpacing: "0.2em", color: "rgba(var(--text-rgb),0.3)", marginBottom: "4px" }}>Accuracy</div>
              <div className="font-serif" style={{ fontSize: "28px", fontWeight: 300, color: "var(--primary)", lineHeight: 1 }}>94%</div>
            </div>
          </div>
        </section>

        {/* ── Ticker ── */}
        <div style={{
          borderTop: "1px solid rgba(255,255,255,0.05)",
          borderBottom: "1px solid rgba(255,255,255,0.05)",
          height: "48px", overflow: "hidden",
          display: "flex", alignItems: "center",
          marginTop: "8px",
        }}>
          <div className="ticker-track">
            {[...Array(2)].map((_, i) => (
              <span key={i} style={{ display: "flex", alignItems: "center" }}>
                {[
                  "50,000+ Papers Analyzed",
                  "94% Prediction Accuracy",
                  "JEE · UPSC · NEET · CAT · GATE",
                  "Under 2 Min Analysis",
                  "10,000+ Students",
                  "200+ Topics Classified",
                  "2M+ Questions Extracted",
                ].map((item, j) => (
                  <span key={j} className="font-grotesk" style={{
                    fontSize: "11px", fontWeight: 500,
                    textTransform: "uppercase", letterSpacing: "0.15em",
                    color: j % 3 === 0 ? "var(--primary)" : "rgba(var(--text-rgb),0.25)",
                    padding: "0 40px",
                    borderRight: "1px solid rgba(255,255,255,0.05)",
                    whiteSpace: "nowrap",
                  }}>◆ {item}</span>
                ))}
              </span>
            ))}
          </div>
        </div>

        {/* ── SEO Content Block ── */}
        <section style={{ padding: "80px clamp(20px, 4vw, 40px) 0", maxWidth: "900px", margin: "0 auto" }}>
          <div className="seo-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "40px" }}>
            <div>
              <h2 className="font-serif" style={{ fontSize: "24px", fontWeight: 300, letterSpacing: "-0.02em", marginBottom: "16px" }}>
                AI-Powered <em style={{ color: "var(--primary)" }}>Previous Year Paper</em> Analysis
              </h2>
              <p style={{ fontSize: "14px", lineHeight: 1.85, color: "rgba(var(--text-rgb),0.45)", fontWeight: 300 }}>
                ANALYXX AI is an exam intelligence platform that uses Natural Language Processing to analyze previous year question papers (PYQs) and predict high-probability topics for upcoming exams. Our AI has processed over 50,000 papers containing 2 million+ questions across India&#39;s top competitive examinations — from <a href="/exams/jee" style={{ color: "var(--primary)", textDecoration: "none" }}>JEE Main &amp; Advanced</a> to <a href="/exams/upsc" style={{ color: "var(--primary)", textDecoration: "none" }}>UPSC Civil Services</a>.
              </p>
            </div>
            <div>
              <h2 className="font-serif" style={{ fontSize: "24px", fontWeight: 300, letterSpacing: "-0.02em", marginBottom: "16px" }}>
                Smarter Preparation for <em style={{ color: "var(--primary)" }}>Every Exam</em>
              </h2>
              <p style={{ fontSize: "14px", lineHeight: 1.85, color: "rgba(var(--text-rgb),0.45)", fontWeight: 300 }}>
                Whether you&#39;re preparing for <a href="/exams/neet" style={{ color: "var(--primary)", textDecoration: "none" }}>NEET</a>, <a href="/exams/gate" style={{ color: "var(--primary)", textDecoration: "none" }}>GATE</a>, <a href="/exams/cat" style={{ color: "var(--primary)", textDecoration: "none" }}>CAT</a>, or <a href="/exams/ssc" style={{ color: "var(--primary)", textDecoration: "none" }}>SSC</a> — upload any question paper and get instant topic predictions, frequency heatmaps, and personalized study plans. Our 94% prediction accuracy helps students focus on <a href="/important-questions" style={{ color: "var(--primary)", textDecoration: "none" }}>important questions</a> that actually matter, saving hundreds of hours of unfocused study.
              </p>
            </div>
          </div>
        </section>

        {/* ── Feature Grid ── */}
        <section id="features" className="feature-section" style={{ padding: "120px 40px", maxWidth: "1280px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "72px" }}>
            <p className="font-grotesk" style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.25em", color: "var(--primary)", marginBottom: "16px" }}>
              Features
            </p>
            <h2 className="font-serif" style={{
              fontSize: "clamp(40px, 5vw, 64px)", fontWeight: 300,
              letterSpacing: "-0.03em", lineHeight: 1.05,
            }}>
              Everything you need to{" "}
              <em style={{ color: "var(--primary)" }}>ace</em> your exam.
            </h2>
          </div>

          <div className="feature-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "20px" }}>
            {[
              { title: "AI Study Chat", desc: "Ask any doubt — get expert explanations powered by 3 AI models (Llama, Gemini, Mistral) working together to give you the best possible answer.", delay: "fade-up-1" },
              { title: "Step-by-Step Solver", desc: "Upload a problem or type it out. ANALYXX breaks it down step-by-step with exam-specific tips, common mistakes, and alternative methods.", delay: "fade-up-2" },
              { title: "PYQ Pattern Analysis", desc: "Our NLP model scores topics using trend detection, syllabus mapping, and cross-year pattern analysis to predict what's coming next.", delay: "fade-up-3" },
              { title: "Smart Quiz Generator", desc: "Generate practice quizzes on any topic — PYQ-pattern aware, with difficulty progression from basic to exam-level. Instant AI evaluation.", delay: "fade-up-1" },
              { title: "Multi-Exam Support", desc: "JEE, NEET, UPSC, GATE, CAT, SSC, CBSE 10/12, RTU — exam-specific AI that understands each paper's unique patterns and marking schemes.", delay: "fade-up-2" },
              { title: "Instant Answers", desc: "Multi-model AI synthesizes responses in under 10 seconds. Full PYQ analysis of a 60-page paper in under 2 minutes.", delay: "fade-up-3" },
            ].map((card, i) => (
              <div
                key={i}
                className={`spotlight-card ${card.delay}`}
                ref={el => { cardRefs.current[i] = el; }}
                onMouseMove={(e) => handleMouseMove(e, i)}
              >
                <h3 className="font-serif" style={{ fontSize: "24px", fontWeight: 400, letterSpacing: "-0.02em", marginBottom: "12px" }}>
                  {card.title}
                </h3>
                <p style={{ fontSize: "15px", color: "rgba(var(--text-rgb),0.4)", lineHeight: 1.75, fontWeight: 300 }}>
                  {card.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Benchmark Table ── */}
        <section id="how-it-works" ref={tableRef} className="benchmark-section" style={{ padding: "0 40px 120px", maxWidth: "1280px", margin: "0 auto" }}>
          <div style={{ marginBottom: "48px" }}>
            <p className="font-grotesk" style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.25em", color: "var(--primary)", marginBottom: "16px" }}>
              Performance Data
            </p>
            <h2 className="font-serif" style={{ fontSize: "clamp(36px, 4vw, 52px)", fontWeight: 300, letterSpacing: "-0.03em" }}>
              The numbers speak for <em style={{ color: "var(--primary)" }}>themselves.</em>
            </h2>
          </div>

          <div style={{
            background: "rgba(255,255,255,0.02)",
            backdropFilter: "blur(12px)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "24px", overflow: "hidden",
          }}>
            {/* Header */}
            <div className="font-grotesk benchmark-header" style={{
              display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr",
              padding: "16px 32px",
              borderBottom: "1px solid rgba(255,255,255,0.06)",
              fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.2em",
              color: "rgba(var(--text-rgb),0.3)",
            }}>
              <span>Metric</span>
              <span style={{ textAlign: "center" }}>Value</span>
              <span className="benchmark-header-vs" style={{ textAlign: "center" }}>vs Manual</span>
              <span className="benchmark-header-status" style={{ textAlign: "center" }}>Status</span>
            </div>

            {[
              { metric: "Papers Analyzed", value: counts.papers.toLocaleString() + "+", vs: "∞x faster", status: "✓" },
              { metric: "Prediction Accuracy", value: counts.accuracy + "%", vs: "+47% better", status: "✓" },
              { metric: "Students Helped", value: counts.students.toLocaleString() + "+", vs: "Growing daily", status: "✓" },
              { metric: "Questions Extracted", value: (counts.questions / 1000000).toFixed(1) + "M+", vs: "Zero errors", status: "✓" },
              { metric: "Analysis Time", value: "< 2 min", vs: "3 hours → 2 min", status: "✓" },
              { metric: "Topics Classified", value: "200+", vs: "Manual: ~40", status: "✓" },
            ].map((row, i) => (
              <div key={i} className="table-row benchmark-row" style={{
                display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr",
                padding: "20px 32px",
                borderBottom: i < 5 ? "1px solid rgba(255,255,255,0.04)" : "none",
                transition: "background 300ms",
              }}>
                <span style={{ fontSize: "15px", fontWeight: 400, color: "rgba(var(--text-rgb),0.7)" }}>{row.metric}</span>
                <span style={{ textAlign: "center", fontSize: "16px", fontWeight: 600, color: "var(--primary)", fontFamily: "'Space Grotesk', sans-serif" }}>
                  {row.value}
                </span>
                <span className="benchmark-col-vs" style={{ textAlign: "center", fontSize: "13px", color: "rgba(var(--text-rgb),0.35)" }}>{row.vs}</span>
                <div className="benchmark-col-status" style={{ display: "flex", justifyContent: "center" }}>
                  <span className="check-pulse">✓</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="cta-section" style={{ padding: "120px 40px", textAlign: "center", maxWidth: "900px", margin: "0 auto" }}>
          <p className="font-grotesk" style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.25em", color: "var(--primary)", marginBottom: "24px" }}>
            Get Started Today
          </p>
          <h2 className="font-serif gradient-headline" style={{
            fontSize: "clamp(56px, 8vw, 110px)",
            fontWeight: 200, lineHeight: 0.92,
            letterSpacing: "-0.04em", marginBottom: "32px",
          }}>
            Start predicting<br />Start winning
          </h2>
          <p style={{ fontSize: "18px", color: "rgba(var(--text-rgb),0.4)", fontWeight: 300, marginBottom: "48px", maxWidth: "480px", margin: "0 auto 48px" }}>
            Join 10,000+ students who already know what's coming in their next exam
          </p>
          <a href="/register" className="emerald-btn" style={{ fontSize: "16px", padding: "18px 52px" }}>
            Analyze Your First Paper Free →
          </a>

        </section>

        {/* ── Pricing ── */}
        <section id="pricing" className="pricing-section" style={{ padding: "0 40px 120px", maxWidth: "1200px", margin: "0 auto" }}>
          <style>{`
            @keyframes priceSlideIn {
              from { opacity: 0; transform: translateY(12px); }
              to   { opacity: 1; transform: translateY(0); }
            }
            .pricing-card {
              transition: transform 400ms cubic-bezier(0.4, 0, 0.2, 1), box-shadow 400ms cubic-bezier(0.4, 0, 0.2, 1), border-color 300ms ease;
            }
            .pricing-card:hover {
              transform: translateY(-6px) !important;
              box-shadow: 0 20px 60px rgba(0,0,0,0.4), 0 0 0 1px rgba(var(--primary-rgb),0.08) !important;
            }
            .pricing-cta {
              transition: all 300ms cubic-bezier(0.4, 0, 0.2, 1) !important;
            }
            .pricing-cta:hover {
              transform: scale(1.03);
              filter: brightness(1.1);
              box-shadow: 0 4px 20px rgba(var(--primary-rgb),0.25);
            }
          `}</style>

          <div style={{ textAlign: "center", marginBottom: "72px" }}>
            <p className="font-grotesk" style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.25em", color: "var(--primary)", marginBottom: "16px" }}>Pricing</p>
            <h2 className="font-serif" style={{ fontSize: "clamp(40px, 4vw, 56px)", fontWeight: 300, letterSpacing: "-0.03em", marginBottom: "16px" }}>
              Simple, <em style={{ color: "var(--primary)" }}>transparent</em> pricing.
            </h2>
            <p style={{ fontSize: "15px", color: "rgba(var(--text-rgb),0.35)", fontWeight: 300, maxWidth: "420px", margin: "0 auto 44px" }}>
              Choose the plan that fits your scale. Upgrade or cancel anytime.
            </p>

            {/* ── Period Slider Toggle ── */}
            <div className="pricing-toggle" style={{
              display: "inline-grid", gridTemplateColumns: "1fr 1fr 1fr",
              position: "relative",
              background: "rgba(var(--text-rgb),0.05)",
              borderRadius: "14px", padding: "4px",
              gap: "0px",
            }}>
              {/* GPU-accelerated sliding pill */}
              <div style={{
                position: "absolute", top: "4px", left: "4px",
                width: "calc(33.333% - 2.666px)", height: "calc(100% - 8px)",
                background: "var(--primary)",
                borderRadius: "11px",
                transform: `translateX(${pricingPeriod === "daily" ? "0" : pricingPeriod === "monthly" ? "calc(100% + 4px)" : "calc(200% + 8px)"})`,
                transition: "transform 400ms cubic-bezier(0.4, 0, 0.2, 1)",
                willChange: "transform",
                boxShadow: "0 2px 12px rgba(var(--primary-rgb),0.4)",
              }} />
              {(["daily", "monthly", "annually"] as const).map((period) => (
                <button key={period} onClick={() => setPricingPeriod(period)}
                  className="font-grotesk"
                  style={{
                    position: "relative", zIndex: 1,
                    padding: "10px 28px", fontSize: "13px", fontWeight: 600,
                    textTransform: "capitalize", letterSpacing: "0",
                    background: "transparent", border: "none",
                    borderRadius: "11px", cursor: "pointer",
                    color: pricingPeriod === period ? "white" : "rgba(var(--text-rgb),0.4)",
                    transition: "color 250ms ease",
                    fontFamily: "'Space Grotesk', sans-serif",
                    whiteSpace: "nowrap",
                  }}
                >
                  {period === "daily" ? "Daily" : period === "monthly" ? "Monthly" : "Annually"}
                  {period === "annually" && (
                    <span style={{
                      display: "inline-block", marginLeft: "8px",
                      fontSize: "9px", fontWeight: 700,
                      background: pricingPeriod === "annually" ? "rgba(255,255,255,0.2)" : "rgba(var(--primary-rgb),0.15)",
                      color: pricingPeriod === "annually" ? "white" : "var(--primary)",
                      padding: "3px 8px", borderRadius: "9999px", letterSpacing: "0.05em",
                      transition: "all 250ms ease",
                      verticalAlign: "middle",
                    }}>SAVE 17%</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="pricing-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "20px", alignItems: "stretch" }}>
            {(() => {
              const tierLabels = ["STARTER", "ADVANCED", "ENTERPRISE"];
              const plans = {
                daily: [
                  { price: "₹0", period: "forever", features: ["3 papers / day", "Basic topic analysis", "Top 5 predictions", "Email support"], featured: false, cta: "Get Started", ctaHref: "/register", razorpayPlan: null },
                  { price: "₹18", originalPrice: "₹72", period: "per day", features: ["Unlimited papers", "Full AI analysis", "All predictions", "Priority support", "Export PDF reports"], featured: true, cta: "Go Pro →", ctaHref: "", razorpayPlan: "pro_daily" as const, isOffer: false },
                  { price: "Custom", period: "", features: ["Everything in Pro", "50+ seats", "Custom exam types", "Dedicated manager", "White-label", "SLA & onboarding"], featured: false, cta: "Contact Us", ctaHref: "https://mail.google.com/mail/?view=cm&to=contact@analyxx.com", razorpayPlan: null },
                ],
                monthly: [
                  { price: "₹0", period: "forever", features: ["3 papers / day", "Basic topic analysis", "Top 5 predictions", "Email support"], featured: false, cta: "Get Started", ctaHref: "/register", razorpayPlan: null },
                  { price: "₹449", period: "per month", features: ["Unlimited papers", "Full AI analysis", "All predictions", "Priority support", "Export PDF reports"], featured: true, cta: "Go Pro →", ctaHref: "", razorpayPlan: "pro_monthly" as const },
                  { price: "Custom", period: "", features: ["Everything in Pro", "50+ seats", "Custom exam types", "Dedicated manager", "White-label", "SLA & onboarding"], featured: false, cta: "Contact Us", ctaHref: "https://mail.google.com/mail/?view=cm&to=contact@analyxx.com", razorpayPlan: null },
                ],
                annually: [
                  { price: "₹0", period: "forever", features: ["3 papers / day", "Basic topic analysis", "Top 5 predictions", "Email support"], featured: false, cta: "Get Started", ctaHref: "/register", razorpayPlan: null },
                  { price: "₹4,449", period: "per year", features: ["Unlimited papers", "Full AI analysis", "All predictions", "Priority support", "Export PDF reports"], featured: true, cta: "Go Pro →", ctaHref: "", razorpayPlan: "pro_annual" as const },
                  { price: "Custom", period: "", features: ["Everything in Pro", "50+ seats", "Custom exam types", "Dedicated manager", "White-label", "SLA & onboarding"], featured: false, cta: "Contact Us", ctaHref: "https://mail.google.com/mail/?view=cm&to=contact@analyxx.com", razorpayPlan: null },
                ],
              };
              const names = ["Free", "Pro", "Institute"];
              return plans[pricingPeriod].map((plan, i) => (
                <div key={`${pricingPeriod}-${i}`} className="pricing-card" style={{
                  background: plan.featured ? "rgba(var(--primary-rgb),0.04)" : "rgba(var(--text-rgb),0.02)",
                  backdropFilter: "blur(24px)",
                  border: plan.featured ? "1px solid rgba(var(--primary-rgb),0.2)" : "1px solid rgba(var(--text-rgb),0.05)",
                  borderRadius: "28px", padding: plan.featured ? "48px 40px" : "40px",
                  boxShadow: plan.featured ? "0 0 60px rgba(var(--primary-rgb),0.1), 0 24px 48px rgba(0,0,0,0.3)" : "0 8px 32px rgba(0,0,0,0.15)",
                  position: "relative",
                  transform: plan.featured ? "scale(1.03)" : "none",
                  animation: `priceSlideIn 0.6s cubic-bezier(0.34,1.56,0.64,1) ${i * 0.1}s both`,
                  display: "flex", flexDirection: "column" as const,
                }}>
                  {plan.featured && (
                    <div style={{
                      position: "absolute", top: "-14px", left: "50%", transform: "translateX(-50%)",
                      background: "linear-gradient(135deg, var(--primary), rgba(var(--primary-rgb),0.7))",
                      color: "white", fontSize: "10px", fontWeight: 700,
                      textTransform: "uppercase", letterSpacing: "0.15em",
                      padding: "5px 20px", borderRadius: "9999px",
                      boxShadow: "0 4px 16px rgba(var(--primary-rgb),0.3)",
                    }}>Most Popular</div>
                  )}
                  <p className="font-grotesk" style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.25em", color: "rgba(var(--text-rgb),0.3)", marginBottom: "6px" }}>{tierLabels[i]}</p>
                  <p className="font-serif" style={{ fontSize: "22px", fontWeight: 400, letterSpacing: "-0.02em", color: "var(--text)", marginBottom: "20px" }}>{names[i]}</p>
                  {/* Limited Time Offer — minimal inline countdown */}
                  {(plan as any).isOffer && pricingPeriod === "daily" && i === 1 && (() => {
                    const t = proOfferTimeLeft ?? 0;
                    const d = Math.floor(t / 86400000);
                    const h = Math.floor((t % 86400000) / 3600000);
                    const m = Math.floor((t % 3600000) / 60000);
                    const s = Math.floor((t % 60000) / 1000);
                    const timeStr = `${String(d).padStart(2, "0")}d ${String(h).padStart(2, "0")}h ${String(m).padStart(2, "0")}m ${String(s).padStart(2, "0")}s`;
                    return (
                      <div style={{
                        display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px", flexWrap: "wrap",
                      }}>
                        <span style={{
                          fontSize: "9px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em",
                          color: "var(--primary)", background: "rgba(var(--primary-rgb),0.1)",
                          border: "1px solid rgba(var(--primary-rgb),0.15)",
                          padding: "4px 10px", borderRadius: "9999px",
                        }}>Limited Offer</span>
                        <span style={{
                          fontSize: "12px", fontWeight: 600, color: "rgba(var(--text-rgb),0.45)",
                          fontFamily: "'Space Grotesk', monospace", letterSpacing: "0.04em",
                        }}>Ends in <span style={{ color: "var(--primary)" }}>{timeStr}</span></span>
                      </div>
                    );
                  })()}
                   <div style={{ display: "flex", alignItems: "baseline", gap: "6px", marginBottom: "4px" }}>
                    <span className="font-serif" style={{ fontSize: i === 2 ? "36px" : "48px", fontWeight: 300, color: "var(--text)", letterSpacing: "-0.03em", lineHeight: 1 }}>{plan.price}</span>
                    {(plan as any).originalPrice && (
                      <span className="font-serif" style={{
                        fontSize: "22px", fontWeight: 300, color: "rgba(var(--text-rgb),0.25)",
                        textDecoration: "line-through", textDecorationColor: "rgba(var(--text-rgb),0.2)",
                        textDecorationThickness: "1.5px",
                      }}>{(plan as any).originalPrice}</span>
                    )}
                    {plan.period && <span style={{ fontSize: "13px", color: "rgba(var(--text-rgb),0.3)", fontWeight: 400 }}>/ {plan.period}</span>}
                    {(plan as any).isOffer && (
                      <span style={{
                        fontSize: "9px", fontWeight: 700, color: "var(--primary)",
                        background: "rgba(var(--primary-rgb),0.08)",
                        padding: "3px 8px", borderRadius: "9999px",
                        marginLeft: "2px", verticalAlign: "middle",
                      }}>64% OFF</span>
                    )}
                  </div>
                  {i === 2 && <p style={{ fontSize: "13px", color: "rgba(var(--text-rgb),0.3)", marginTop: "4px" }}>Tailored to your institution</p>}
                  {pricingPeriod === "annually" && i === 1 && (
                    <p style={{ fontSize: "12px", color: "var(--primary)", marginTop: "6px" }}>That&apos;s just ₹{Math.round(4449 / 365)}/day — save ~17%</p>
                  )}
                  {pricingPeriod === "monthly" && i === 1 && (
                    <p style={{ fontSize: "12px", color: "var(--primary)", marginTop: "6px" }}>That&apos;s about ₹{Math.round(449 / 30)}/day</p>
                  )}
                  <div style={{ height: "1px", background: plan.featured ? "rgba(var(--primary-rgb),0.1)" : "rgba(var(--text-rgb),0.05)", margin: "24px 0" }} />
                  <ul style={{ listStyle: "none", marginBottom: "32px", flex: 1 }}>
                    {plan.features.map((f) => (
                      <li key={f} style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "14px", fontSize: "14px", color: plan.featured ? "rgba(var(--text-rgb),0.65)" : "rgba(var(--text-rgb),0.45)", fontWeight: 400 }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}><circle cx="12" cy="12" r="12" fill="rgba(var(--primary-rgb),0.12)" /><path d="M8 12.5l2.5 2.5 5.5-5.5" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                        {f}
                      </li>
                    ))}
                  </ul>
                  {plan.razorpayPlan ? (
                    <button
                      onClick={() => handleCheckout(plan.razorpayPlan!)}
                      disabled={checkoutLoading}
                      className="pricing-cta"
                      style={{
                        display: "block", textAlign: "center", width: "100%",
                        padding: "14px", borderRadius: "9999px",
                        fontSize: "14px", fontWeight: 600, cursor: checkoutLoading ? "wait" : "pointer",
                        background: plan.featured ? "linear-gradient(135deg, var(--primary), rgba(var(--primary-rgb),0.7))" : "rgba(var(--text-rgb),0.04)",
                        color: plan.featured ? "white" : "rgba(var(--text-rgb),0.7)",
                        border: plan.featured ? "none" : "1px solid rgba(var(--text-rgb),0.08)",
                        boxShadow: plan.featured ? "0 4px 20px rgba(var(--primary-rgb),0.25)" : "none",
                        fontFamily: "'Inter', sans-serif",
                        opacity: checkoutLoading ? 0.7 : 1,
                      }}
                    >
                      {checkoutLoading ? "Processing..." : plan.cta}
                    </button>
                  ) : (
                    <a href={plan.ctaHref} {...(plan.ctaHref.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})} className="pricing-cta" style={{
                      display: "block", textAlign: "center",
                      padding: "14px", borderRadius: "9999px",
                      fontSize: "14px", fontWeight: 600, textDecoration: "none",
                      background: i === 2 ? "rgba(var(--primary-rgb),0.08)" : "rgba(var(--text-rgb),0.04)",
                      color: i === 2 ? "var(--primary)" : "rgba(var(--text-rgb),0.7)",
                      border: i === 2 ? "1px solid rgba(var(--primary-rgb),0.2)" : "1px solid rgba(var(--text-rgb),0.08)",
                    }}>{plan.cta}</a>
                  )}
                </div>
              ));
            })()}
          </div>

          {/* Checkout status messages */}
          {checkoutSuccess && (
            <div style={{
              marginTop: "24px", padding: "16px 24px",
              background: "rgba(16,185,129,0.1)",
              border: "1px solid rgba(16,185,129,0.3)",
              borderRadius: "16px", textAlign: "center",
              fontSize: "15px", color: "#10b981", fontWeight: 500,
              animation: "priceSlideIn 0.4s ease both",
            }}>
              ✓ {checkoutSuccess}
            </div>
          )}
          {checkoutError && (
            <div style={{
              marginTop: "24px", padding: "16px 24px",
              background: "rgba(239,68,68,0.1)",
              border: "1px solid rgba(239,68,68,0.3)",
              borderRadius: "16px", textAlign: "center",
              fontSize: "15px", color: "#ef4444", fontWeight: 500,
              animation: "priceSlideIn 0.4s ease both",
            }}>
              ✕ {checkoutError}
            </div>
          )}
        </section>

        {/* ── FAQ Section ── */}
        <section id="faq" style={{ padding: "0 40px 120px", maxWidth: "900px", margin: "0 auto" }}>
          <FAQSchema />
          <div style={{ textAlign: "center", marginBottom: "56px" }}>
            <p className="font-grotesk" style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.25em", color: "var(--primary)", marginBottom: "16px" }}>
              Common Questions
            </p>
            <h2 className="font-serif" style={{ fontSize: "clamp(32px, 4vw, 48px)", fontWeight: 300, letterSpacing: "-0.03em" }}>
              Frequently asked <em style={{ color: "var(--primary)" }}>questions</em>
            </h2>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "1px" }}>
            {faqData.map((item, i) => (
              <details
                key={i}
                style={{
                  background: "rgba(255,255,255,0.02)",
                  borderRadius: i === 0 ? "16px 16px 0 0" : i === faqData.length - 1 ? "0 0 16px 16px" : "0",
                  overflow: "hidden",
                }}
              >
                <summary
                  style={{
                    padding: "20px 28px",
                    fontSize: "15px",
                    fontWeight: 500,
                    color: "rgba(var(--text-rgb),0.8)",
                    cursor: "pointer",
                    listStyle: "none",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    fontFamily: "'Inter', sans-serif",
                    transition: "color 200ms",
                  }}
                >
                  {item.question}
                  <span style={{ color: "var(--primary)", fontSize: "18px", flexShrink: 0, marginLeft: "16px" }}>+</span>
                </summary>
                <div style={{
                  padding: "0 28px 20px",
                  fontSize: "14px",
                  lineHeight: 1.8,
                  color: "rgba(var(--text-rgb),0.45)",
                  fontWeight: 300,
                }}>
                  {item.answer}
                </div>
              </details>
            ))}
          </div>
        </section>

        {/* ── Footer ── */}
        <footer className="footer-wrap" style={{ background: "var(--bg)", borderTop: "1px solid rgba(255,255,255,0.05)", padding: "64px 40px 32px" }}>
          <div style={{ maxWidth: "1280px", margin: "0 auto" }}>
            <div className="footer-grid" style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr", gap: "40px", marginBottom: "60px" }}>
              <div className="footer-brand-col">
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
                  <img src="/logo.png" alt="ANALYXX" className="theme-logo" style={{ width: "36px", height: "36px", borderRadius: "9px", objectFit: "cover" }} />
                  <span className="font-serif" style={{ fontSize: "20px", fontWeight: 300 }}>ANALYXX <em style={{ color: "var(--primary)" }}>AI</em></span>
                </div>
                <p style={{ fontSize: "14px", color: "rgba(var(--text-rgb),0.3)", lineHeight: 1.75, maxWidth: "260px", fontWeight: 300 }}>
                  AI-powered exam preparation for the next generation of students
                </p>
                {/* Social icons */}
                <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
                  <a href="https://x.com/AnalyxxAi" target="_blank" rel="noopener noreferrer" className="social-icon" aria-label="X (Twitter)">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                  </a>
                  <a href="https://www.instagram.com/analyxx.ai?igsh=eGl0aGhvcnA3cGM5&utm_source=qr" target="_blank" rel="noopener noreferrer" className="social-icon" aria-label="Instagram">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
                  </a>
                  <a href="https://www.facebook.com/profile.php?id=61576117210764" target="_blank" rel="noopener noreferrer" className="social-icon" aria-label="Facebook">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                  </a>
                </div>
              </div>
              {[
                { title: "Product", links: [{label: "Features", href: "#features"}, {label: "Library", href: "/library"}, {label: "Pricing", href: "#pricing"}, {label: "API", href: "#"}] },
                { title: "Exams", links: [{label: "JEE Advanced", href: "/exams/jee"}, {label: "UPSC CSE", href: "/exams/upsc"}, {label: "NEET", href: "/exams/neet"}, {label: "CAT", href: "/exams/cat"}, {label: "GATE", href: "/exams/gate"}] },
                { title: "Company", links: [{label: "About", href: "/about"}, {label: "Terms of Use", href: "/terms"}, {label: "Privacy Policy", href: "/privacy"}, {label: "Cookie Policy", href: "/cookie-policy"}, {label: "Contact", href: "https://mail.google.com/mail/?view=cm&to=contact@analyxx.com"}] },
                { title: "Connect", links: [{label: "X (Twitter)", href: "https://x.com/AnalyxxAi"}, {label: "Instagram", href: "https://www.instagram.com/analyxx.ai?igsh=eGl0aGhvcnA3cGM5&utm_source=qr"}, {label: "Facebook", href: "https://www.facebook.com/profile.php?id=61576117210764"}] },
              ].map((col) => (
                <div key={col.title}>
                  <p className="font-grotesk" style={{ fontSize: "10px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.25em", color: "var(--primary)", marginBottom: "20px" }}>{col.title}</p>
                  {col.links.map((link) => (
                    <a key={link.label} href={link.href} className="nav-link" style={{ display: "block", marginBottom: "12px", fontSize: "14px", fontWeight: 300 }} {...(link.href.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})}>{link.label}</a>
                  ))}
                </div>
              ))}
            </div>

            <div className="footer-bottom" style={{ borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: "24px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
              <span className="font-grotesk" style={{ fontSize: "10px", color: "rgba(var(--text-rgb),0.2)", textTransform: "uppercase", letterSpacing: "0.2em" }}>
                © 2026 ANALYXX AI · All Rights Reserved
              </span>
              <div className="footer-legal-links" style={{ display: "flex", alignItems: "center", gap: "20px" }}>
                {[
                  { label: "Terms of Use", href: "/terms" },
                  { label: "Privacy Policy", href: "/privacy" },
                  { label: "Cookie Policy", href: "/cookie-policy" },
                ].map((link, i) => (
                  <a key={link.label} href={link.href} className="font-grotesk" style={{
                    fontSize: "10px", textTransform: "uppercase" as const, letterSpacing: "0.15em",
                    color: "rgba(var(--text-rgb),0.3)", textDecoration: "none",
                    transition: "color 200ms ease",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = "var(--primary)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(var(--text-rgb),0.3)"; }}
                  >{link.label}</a>
                ))}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--primary)", animation: "ping 2s infinite", display: "inline-block" }} />
                <span className="font-grotesk" style={{ fontSize: "10px", color: "var(--primary)", textTransform: "uppercase", letterSpacing: "0.2em" }}>All Systems Operational</span>
              </div>
            </div>
          </div>
        </footer>
      </div>

      {/* Ask Clarity Sidebar */}
      <AskClaritySidebar
        isOpen={claritySidebarOpen}
        onClose={() => setClaritySidebarOpen(false)}
      />
    </main>
  );
}