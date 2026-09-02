"use client";
import { useEffect, useState, useRef } from "react";
import { supabase } from "../lib/supabase";
import { API_BASE, RAZORPAY_KEY_ID } from "../lib/config";
import ThemeCustomizer from "../components/ThemeCustomizer";

declare global {
  interface Window {
    Razorpay: any;
  }
}

interface SubscriptionInfo {
  plan: string;
  status: string;
  starts_at: string | null;
  expires_at: string | null;
}

interface PaymentRecord {
  id: string;
  razorpay_order_id: string | null;
  razorpay_payment_id: string | null;
  amount: number;
  currency: string;
  plan: string;
  status: string;
  created_at: string | null;
}

const PLAN_LABELS: Record<string, string> = {
  free: "Free",
  pro_daily: "Pro Day Pass",
  pro_monthly: "Pro Monthly",
  pro_annual: "Pro Annual",
};

const STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  active: { bg: "rgba(16,185,129,0.1)", text: "#10b981", border: "rgba(16,185,129,0.3)" },
  expired: { bg: "rgba(239,68,68,0.1)", text: "#ef4444", border: "rgba(239,68,68,0.3)" },
  cancelled: { bg: "rgba(245,158,11,0.1)", text: "#f59e0b", border: "rgba(245,158,11,0.3)" },
  paid: { bg: "rgba(16,185,129,0.1)", text: "#10b981", border: "rgba(16,185,129,0.3)" },
  created: { bg: "rgba(99,102,241,0.1)", text: "#6366f1", border: "rgba(99,102,241,0.3)" },
  failed: { bg: "rgba(239,68,68,0.1)", text: "#ef4444", border: "rgba(239,68,68,0.3)" },
};

export default function BillingPage() {
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [papersToday, setPapersToday] = useState(0);
  const [dailyLimit, setDailyLimit] = useState<number | null>(3);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [toast, setToast] = useState("");
  const [navVisible, setNavVisible] = useState(true);
  const lastScrollY = useRef(0);

  // --- 3-day limited-time offer for Pro daily ---
  const OFFER_DURATION_MS = 3 * 24 * 60 * 60 * 1000;
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

  useEffect(() => {
    // Load Razorpay script
    if (!document.getElementById("razorpay-script")) {
      const script = document.createElement("script");
      script.id = "razorpay-script";
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      document.body.appendChild(script);
    }

    fetchBillingData();
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      const currentY = window.scrollY;
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

  const fetchBillingData = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      window.location.href = "/login?redirect=/billing";
      return;
    }
    const token = session.access_token;

    try {
      const [subRes, histRes] = await Promise.all([
        fetch(`${API_BASE}/payments/subscription`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE}/payments/history`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (subRes.ok) {
        const subData = await subRes.json();
        setSubscription(subData);
        // Estimate usage from subscription data
        if (subData.plan === "free" || !subData.plan?.startsWith("pro_")) {
          setDailyLimit(3);
        } else {
          setDailyLimit(null);
        }
      }

      if (histRes.ok) {
        const histData = await histRes.json();
        setPayments(histData);
      }
    } catch (err) {
      console.error("Failed to fetch billing data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async (plan: "pro_daily" | "pro_monthly" | "pro_annual") => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const token = session.access_token;
    const userEmail = session.user.email || "";
    const userName = session.user.user_metadata?.full_name || userEmail.split("@")[0];

    setCheckoutLoading(true);

    try {
      const endpoint = plan === "pro_daily"
        ? `${API_BASE}/payments/create-order`
        : `${API_BASE}/payments/create-subscription`;

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to create payment.");

      const options: any = {
        key: RAZORPAY_KEY_ID,
        amount: data.amount,
        currency: "INR",
        name: "ANALYXX AI",
        description: PLAN_LABELS[plan] || plan,
        image: "/logo.png",
        prefill: { name: userName, email: userEmail },
        theme: { color: "#10b981" },
        handler: async (response: any) => {
          try {
            const verifyRes = await fetch(`${API_BASE}/payments/verify`, {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id || null,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                razorpay_subscription_id: response.razorpay_subscription_id || null,
                plan,
              }),
            });
            const verifyData = await verifyRes.json();
            if (!verifyRes.ok) throw new Error(verifyData.detail);

            setToast("✓ " + (verifyData.message || "Plan activated!"));
            setTimeout(() => setToast(""), 4000);
            fetchBillingData();
          } catch {
            setToast("✕ Payment verification failed.");
            setTimeout(() => setToast(""), 4000);
          }
        },
        modal: { ondismiss: () => setCheckoutLoading(false) },
      };

      if (data.order_id) options.order_id = data.order_id;
      if (data.subscription_id) options.subscription_id = data.subscription_id;

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      setToast("✕ " + (err instanceof Error ? err.message : "Something went wrong."));
      setTimeout(() => setToast(""), 4000);
    } finally {
      setCheckoutLoading(false);
    }
  };

  const formatDate = (iso: string | null) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("en-IN", {
      day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
    });
  };

  const formatAmount = (paise: number) => `₹${(paise / 100).toLocaleString("en-IN")}`;

  const isPro = subscription?.plan?.startsWith("pro_") && subscription?.status === "active";

  return (
    <main style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text)", fontFamily: "'Inter', sans-serif" }}>
      <style>{`
        .font-serif { font-family: 'Newsreader', serif; }
        .font-grotesk { font-family: 'Space Grotesk', sans-serif; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes morph {
          0%,100% { border-radius: 40% 60% 60% 40% / 70% 30% 70% 30%; }
          50%      { border-radius: 60% 40% 40% 60% / 30% 70% 30% 70%; }
        }
        .fade-up { animation: fadeUp 0.6s cubic-bezier(0.16,1,0.3,1) both; }
        .fade-up-2 { animation: fadeUp 0.6s cubic-bezier(0.16,1,0.3,1) 0.1s both; }
        .fade-up-3 { animation: fadeUp 0.6s cubic-bezier(0.16,1,0.3,1) 0.2s both; }
        .fade-up-4 { animation: fadeUp 0.6s cubic-bezier(0.16,1,0.3,1) 0.3s both; }
        .glass-card {
          background: rgba(var(--primary-rgb),0.03);
          border: 1px solid rgba(var(--primary-rgb),0.12);
          border-radius: 20px; padding: 28px;
          backdrop-filter: blur(16px);
        }
        .upgrade-btn {
          background: linear-gradient(135deg, var(--primary), rgba(var(--primary-rgb),0.7));
          color: white; border: none; border-radius: 9999px;
          padding: 12px 28px; font-size: 14px; font-weight: 600;
          cursor: pointer; font-family: 'Inter', sans-serif;
          transition: all 200ms; box-shadow: 0 4px 16px rgba(var(--primary-rgb),0.3);
        }
        .upgrade-btn:hover { filter: brightness(1.1); transform: translateY(-1px); }
        .upgrade-btn:disabled { opacity: 0.6; cursor: wait; }
        .toast {
          position: fixed; top: 24px; left: 50%; transform: translateX(-50%);
          background: rgba(30,30,30,0.95); backdrop-filter: blur(16px);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 12px; padding: 14px 24px;
          font-size: 14px; font-weight: 500; color: var(--text);
          z-index: 100; animation: fadeUp 0.3s ease both;
          box-shadow: 0 8px 32px rgba(0,0,0,0.3);
        }
      `}</style>

      {/* BG blobs */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0 }}>
        <div style={{ position: "absolute", top: "-200px", left: "-100px", width: "500px", height: "500px", background: "rgba(var(--primary-rgb),0.05)", filter: "blur(120px)", animation: "morph 12s ease-in-out infinite" }} />
        <div style={{ position: "absolute", bottom: "-100px", right: "-100px", width: "400px", height: "400px", background: "rgba(var(--primary-rgb),0.03)", filter: "blur(100px)", animation: "morph 14s ease-in-out infinite reverse" }} />
      </div>

      {/* Navbar */}
      <header className="page-header-nav" style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 40,
        background: "rgba(var(--bg-rgb),0.85)", backdropFilter: "blur(16px)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        padding: "16px 40px", display: "flex", alignItems: "center", justifyContent: "space-between",
        transform: navVisible ? "translateY(0)" : "translateY(-100%)",
        transition: "all 400ms cubic-bezier(0.16,1,0.3,1)",
      }}>
        <a href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: "10px" }}>
          <img src="/logo.png" alt="ANALYXX" className="theme-logo" style={{ width: "36px", height: "36px", borderRadius: "9px", objectFit: "cover" }} />
          <span className="font-serif" style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "18px", fontWeight: 300, color: "var(--text)" }}>
            <span>ANALYXX <em style={{ color: "var(--primary)" }}>AI</em></span>
            {isPro && (
              <span className="analyxx-pro-badge">
                <span>Pro</span>
              </span>
            )}
          </span>
        </a>
        <div className="billing-nav-links" style={{ display: "flex", gap: "16px", alignItems: "center" }}>
          <ThemeCustomizer />
          <a href="/upload" style={{ fontSize: "14px", color: "rgba(var(--text-rgb),0.4)", textDecoration: "none" }}>Analyze</a>
          <a href="/library" style={{ fontSize: "14px", color: "rgba(var(--text-rgb),0.4)", textDecoration: "none" }}>Library</a>
        </div>
      </header>

      {/* Toast */}
      {toast && <div className="toast">{toast}</div>}

      <div className="page-content" style={{ position: "relative", zIndex: 1, maxWidth: "900px", margin: "0 auto", padding: "90px 40px 60px" }}>

        {/* Page Header */}
        <div className="fade-up" style={{ marginBottom: "48px" }}>
          <p className="font-grotesk" style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.25em", color: "var(--primary)", marginBottom: "12px" }}>Account</p>
          <h1 className="font-serif" style={{ fontSize: "clamp(36px, 4vw, 48px)", fontWeight: 300, letterSpacing: "-0.02em", marginBottom: "8px" }}>
            Billing & <em style={{ color: "var(--primary)" }}>Subscription</em>
          </h1>
          <p style={{ fontSize: "15px", color: "rgba(var(--text-rgb),0.4)", fontWeight: 300 }}>
            Manage your plan, view usage, and track payment history
          </p>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: "80px 0" }}>
            <div style={{ width: "40px", height: "40px", border: "3px solid rgba(var(--primary-rgb),0.2)", borderTopColor: "var(--primary)", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 16px" }} />
            <p style={{ color: "rgba(var(--text-rgb),0.4)", fontSize: "14px" }}>Loading billing info...</p>
          </div>
        ) : (
          <>
            {/* Current Plan Card */}
            <div className="glass-card fade-up-2" style={{ marginBottom: "24px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "16px" }}>
                <div>
                  <p className="font-grotesk" style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.15em", color: "rgba(var(--text-rgb),0.35)", marginBottom: "8px" }}>Current Plan</p>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <h2 style={{ fontSize: "28px", fontWeight: 600, margin: 0 }}>
                      {PLAN_LABELS[subscription?.plan || "free"] || "Free"}
                    </h2>
                    {subscription?.status && (
                      <span style={{
                        fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em",
                        padding: "4px 12px", borderRadius: "9999px",
                        background: (STATUS_COLORS[subscription.status] || STATUS_COLORS.active).bg,
                        color: (STATUS_COLORS[subscription.status] || STATUS_COLORS.active).text,
                        border: `1px solid ${(STATUS_COLORS[subscription.status] || STATUS_COLORS.active).border}`,
                      }}>
                        {subscription.status}
                      </span>
                    )}
                  </div>
                  {subscription?.expires_at && (
                    <p style={{ fontSize: "13px", color: "rgba(var(--text-rgb),0.4)", marginTop: "8px" }}>
                      {subscription.status === "active" ? "Expires" : "Expired"}: {formatDate(subscription.expires_at)}
                    </p>
                  )}
                </div>

                {!isPro && (
                  <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                    <button className="upgrade-btn" onClick={() => handleUpgrade("pro_monthly")} disabled={checkoutLoading}>
                      {checkoutLoading ? "Processing..." : "Upgrade to Pro →"}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Usage Card */}
            <div className="glass-card fade-up-3" style={{ marginBottom: "24px" }}>
              <p className="font-grotesk" style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.15em", color: "rgba(var(--text-rgb),0.35)", marginBottom: "16px" }}>Daily Usage</p>
              <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                    <span style={{ fontSize: "14px", color: "rgba(var(--text-rgb),0.6)" }}>Papers analyzed today</span>
                    <span style={{ fontSize: "14px", fontWeight: 600, color: isPro ? "var(--primary)" : "var(--text)" }}>
                      {isPro ? "Unlimited" : `${papersToday} / ${dailyLimit}`}
                    </span>
                  </div>
                  {!isPro && (
                    <div style={{ height: "6px", borderRadius: "3px", background: "rgba(var(--text-rgb),0.06)", overflow: "hidden" }}>
                      <div style={{
                        height: "100%", borderRadius: "3px",
                        width: `${Math.min((papersToday / (dailyLimit || 3)) * 100, 100)}%`,
                        background: papersToday >= (dailyLimit || 3)
                          ? "linear-gradient(90deg, #ef4444, #dc2626)"
                          : "linear-gradient(90deg, var(--primary), rgba(var(--primary-rgb),0.6))",
                        transition: "width 600ms cubic-bezier(0.16,1,0.3,1)",
                      }} />
                    </div>
                  )}
                  {isPro && (
                    <div style={{ height: "6px", borderRadius: "3px", background: "rgba(var(--primary-rgb),0.15)", overflow: "hidden" }}>
                      <div style={{
                        height: "100%", borderRadius: "3px", width: "100%",
                        background: "linear-gradient(90deg, var(--primary), rgba(var(--primary-rgb),0.6))",
                      }} />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Upgrade options (for free users) */}
            {!isPro && (
              <div className="glass-card fade-up-3" style={{ marginBottom: "24px" }}>
                <p className="font-grotesk" style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.15em", color: "rgba(var(--text-rgb),0.35)", marginBottom: "16px" }}>Upgrade Options</p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px" }}>
                  {[
                    { plan: "pro_daily" as const, price: "₹18", originalPrice: "₹72", desc: "24-hour day pass" },
                    { plan: "pro_monthly" as const, price: "₹449/mo", originalPrice: null, desc: "Unlimited monthly" },
                    { plan: "pro_annual" as const, price: "₹4,449/yr", originalPrice: null, desc: "Save 17%" },
                  ].map(opt => (
                    <button key={opt.plan} onClick={() => handleUpgrade(opt.plan)} disabled={checkoutLoading} style={{
                      background: "rgba(var(--text-rgb),0.03)", border: "1px solid rgba(var(--text-rgb),0.08)",
                      borderRadius: "14px", padding: "16px", cursor: "pointer",
                      textAlign: "left", fontFamily: "'Inter', sans-serif",
                      transition: "all 200ms",
                    }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(var(--primary-rgb),0.3)"; e.currentTarget.style.background = "rgba(var(--primary-rgb),0.04)"; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(var(--text-rgb),0.08)"; e.currentTarget.style.background = "rgba(var(--text-rgb),0.03)"; }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                        <span style={{ fontSize: "20px", fontWeight: 600, color: "var(--text)" }}>{opt.price}</span>
                        {opt.originalPrice && (
                          <span style={{ fontSize: "16px", fontWeight: 400, color: "rgba(var(--text-rgb),0.3)", textDecoration: "line-through", textDecorationColor: "rgba(239,68,68,0.6)" }}>{opt.originalPrice}</span>
                        )}
                      </div>
                      <div style={{ fontSize: "12px", color: "rgba(var(--text-rgb),0.4)" }}>{opt.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Payment History */}
            <div className="glass-card fade-up-4">
              <p className="font-grotesk" style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.15em", color: "rgba(var(--text-rgb),0.35)", marginBottom: "16px" }}>Payment History</p>

              {payments.length === 0 ? (
                <p style={{ fontSize: "14px", color: "rgba(var(--text-rgb),0.3)", textAlign: "center", padding: "32px 0" }}>
                  No payments yet. Upgrade to Pro to get started!
                </p>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                        <th style={{ padding: "10px 14px", textAlign: "left", color: "rgba(var(--text-rgb),0.35)", fontWeight: 500, fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Date</th>
                        <th style={{ padding: "10px 14px", textAlign: "left", color: "rgba(var(--text-rgb),0.35)", fontWeight: 500, fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Plan</th>
                        <th style={{ padding: "10px 14px", textAlign: "right", color: "rgba(var(--text-rgb),0.35)", fontWeight: 500, fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Amount</th>
                        <th style={{ padding: "10px 14px", textAlign: "center", color: "rgba(var(--text-rgb),0.35)", fontWeight: 500, fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payments.map(p => (
                        <tr key={p.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                          <td style={{ padding: "12px 14px", color: "rgba(var(--text-rgb),0.6)" }}>{formatDate(p.created_at)}</td>
                          <td style={{ padding: "12px 14px", color: "rgba(var(--text-rgb),0.7)", fontWeight: 500 }}>{PLAN_LABELS[p.plan] || p.plan}</td>
                          <td style={{ padding: "12px 14px", textAlign: "right", color: "var(--text)", fontWeight: 600, fontFamily: "'Space Grotesk', sans-serif" }}>{formatAmount(p.amount)}</td>
                          <td style={{ padding: "12px 14px", textAlign: "center" }}>
                            <span style={{
                              fontSize: "10px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em",
                              padding: "3px 10px", borderRadius: "9999px",
                              background: (STATUS_COLORS[p.status] || STATUS_COLORS.created).bg,
                              color: (STATUS_COLORS[p.status] || STATUS_COLORS.created).text,
                              border: `1px solid ${(STATUS_COLORS[p.status] || STATUS_COLORS.created).border}`,
                            }}>
                              {p.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Help text */}
            <p style={{ fontSize: "13px", color: "rgba(var(--text-rgb),0.25)", textAlign: "center", marginTop: "40px" }}>
              Need help with billing? Contact us at{" "}
              <a href="mailto:contact@analyxx.com" style={{ color: "var(--primary)", textDecoration: "none" }}>contact@analyxx.com</a>
              . Refunds are handled via the Razorpay dashboard.
            </p>
          </>
        )}
      </div>
    </main>
  );
}
