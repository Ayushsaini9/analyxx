"use client";
import { useState, useRef, useEffect } from "react";

/* ── FAQ knowledge base (keyword → answer) ── */
const FAQ: { keywords: string[]; answer: string }[] = [
  {
    keywords: ["upload", "paper", "how to", "add paper", "submit"],
    answer:
      "To upload papers, go to the **Upload** page from the navbar or dashboard. You can drag & drop PDF files or click to browse. ANALYXX AI will process them in under 2 minutes and deliver a full analysis to your dashboard.",
  },
  {
    keywords: ["price", "pricing", "cost", "plan", "subscription", "pro", "free", "pay"],
    answer:
      "We offer 3 plans:\n• **Free** — 3 papers/day, basic analysis\n• **Pro** — ₹18/day, ₹449/month, or ₹4,449/year — unlimited papers, full AI predictions, PDF exports\n• **Institute** — Custom pricing, 50+ seats, dedicated manager\n\nScroll to the Pricing section on the homepage for details!",
  },
  {
    keywords: ["account", "register", "sign up", "create account", "login", "log in"],
    answer:
      "Click **Get Started** on the homepage or go to the Register page. You can sign up with your email and password. Already have an account? Use the Login page instead.",
  },
  {
    keywords: ["prediction", "predict", "accuracy", "ai", "how accurate"],
    answer:
      "ANALYXX AI uses advanced NLP to analyze topic frequency, recency, and cross-year patterns. Our prediction accuracy is **94%** across major exams like JEE, UPSC, NEET, CAT, and GATE.",
  },
  {
    keywords: ["exam", "support", "jee", "upsc", "neet", "cat", "gate"],
    answer:
      "We currently support **JEE Advanced, UPSC CSE, NEET, CAT, and GATE** with 200+ pre-classified topics. More exams are being added regularly!",
  },
  {
    keywords: ["contact", "email", "help", "support team", "reach"],
    answer:
      "You can reach our support team at **support@analyxx.com**. For enterprise inquiries, email **enterprise@analyxx.com**. We typically respond within 24 hours.",
  },
  {
    keywords: ["dashboard", "results", "analysis", "report"],
    answer:
      "After uploading a paper, your analysis appears on the **Dashboard**. It includes topic frequency, year-wise heatmaps, AI predictions, and extracted questions — all accessible from the sidebar.",
  },
  {
    keywords: ["delete", "remove", "cancel"],
    answer:
      "You can manage your uploaded papers from the **Library** page. To cancel your subscription, go to **Profile → Billing**. If you need help, reach out to support@analyxx.com.",
  },
  {
    keywords: ["pdf", "export", "download"],
    answer:
      "PDF report exports are available on the **Pro** and **Institute** plans. Once your analysis is ready, click the **Export PDF** button on the results page.",
  },
];

function findAnswer(query: string): string {
  const q = query.toLowerCase();
  for (const faq of FAQ) {
    if (faq.keywords.some((kw) => q.includes(kw))) return faq.answer;
  }
  return "I'm not sure about that one! You can reach our support team at **support@analyxx.com** for personalized help, or try rephrasing your question.";
}

/* ── Quick replies ── */
const QUICK_REPLIES = [
  "How to upload papers?",
  "Pricing info",
  "Contact support",
  "Prediction accuracy?",
];

/* ── Types ── */
interface Message {
  id: number;
  from: "bot" | "user";
  text: string;
}

const WELCOME_MSG: Message = {
  id: 0,
  from: "bot",
  text: "Hi there! I'm the ANALYXX AI assistant. I can help with uploading papers, pricing, account questions, and more. What can I help you with?",
};

/* ── Component ── */
export default function HelpChatbox() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([WELCOME_MSG]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [idCounter, setIdCounter] = useState(1);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [isIframe, setIsIframe] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsIframe(window.self !== window.top || window.location.search.includes("sidebar=true"));
    }
  }, []);



  // Auto-scroll on new message
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, typing]);

  // Focus input when opened
  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  const sendMessage = (text: string) => {
    if (!text.trim()) return;

    const userMsg: Message = { id: idCounter, from: "user", text: text.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setIdCounter((c) => c + 2);
    setInput("");
    setTyping(true);

    // Simulate typing delay
    setTimeout(() => {
      const answer = findAnswer(text);
      const botMsg: Message = { id: idCounter + 1, from: "bot", text: answer };
      setMessages((prev) => [...prev, botMsg]);
      setTyping(false);
    }, 800 + Math.random() * 600);
  };

  const handleNewChat = () => {
    setMessages([WELCOME_MSG]);
    setIdCounter(1);
    setInput("");
    setTyping(false);
  };

  /* ── Render simple markdown bold ── */
  const renderText = (text: string) => {
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) =>
      part.startsWith("**") && part.endsWith("**") ? (
        <strong key={i} style={{ fontWeight: 600, color: "var(--text)" }}>
          {part.slice(2, -2)}
        </strong>
      ) : (
        <span key={i}>{part}</span>
      )
    );
  };

  if (isIframe) return null;

  return (
    <>
      <style>{`
        @keyframes chatSlideUp {
          from { opacity: 0; transform: translateY(20px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes chatSlideDown {
          from { opacity: 1; transform: translateY(0) scale(1); }
          to   { opacity: 0; transform: translateY(20px) scale(0.96); }
        }
        @keyframes chatMsgFade {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes dotBounce {
          0%, 80%, 100% { transform: translateY(0); }
          40% { transform: translateY(-6px); }
        }
        .help-chat-fab {
          position: fixed;
          bottom: 24px;
          right: 24px;
          z-index: 9999;
          display: flex;
          align-items: center;
          gap: 8px;
          background: var(--primary);
          color: white;
          border: none;
          border-radius: 9999px;
          height: 52px;
          padding: 0 16px 0 15px;
          font-size: 14px;
          font-weight: 600;
          font-family: var(--font-family, 'Inter', sans-serif);
          cursor: pointer;
          box-shadow: 0 4px 24px rgba(var(--primary-rgb),0.3);
          overflow: hidden;
          white-space: nowrap;
          will-change: transform;
          transition: transform 200ms ease, box-shadow 200ms ease;
        }
        .help-chat-fab:hover {
          transform: scale(1.05);
          box-shadow: 0 6px 32px rgba(var(--primary-rgb),0.45);
        }
        .help-chat-fab .help-fab-icon {
          flex-shrink: 0;
        }
        .help-chat-fab .help-fab-label {
          display: inline-block;
        }
        .help-chat-input:focus {
          outline: none;
          border-color: rgba(var(--primary-rgb),0.4) !important;
        }
        .help-chat-send:hover {
          filter: brightness(0.85);
        }
        .help-chat-quick:hover {
          background: rgba(var(--primary-rgb),0.15) !important;
          border-color: rgba(var(--primary-rgb),0.4) !important;
          color: var(--primary) !important;
        }
        .help-chat-header-btn:hover {
          background: rgba(var(--text-rgb, 255,255,255),0.1) !important;
        }
        @media (max-width: 768px) {
          .help-chat-fab { display: none !important; }
          #help-chat-panel { display: none !important; }
        }
      `}</style>

      {/* ── Floating Action Button ── */}
      {!open && (
        <button
          id="help-chat-trigger"
          className="help-chat-fab"
          onClick={() => setOpen(true)}
        >
          {/* Chat icon */}
          <svg className="help-fab-icon" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          <span className="help-fab-label">Help</span>
        </button>
      )}

      {/* ── Chat Panel ── */}
      {open && (
        <div
          id="help-chat-panel"
          style={{
            position: "fixed",
            bottom: "24px",
            right: "24px",
            zIndex: 9999,
            width: "380px",
            height: "540px",
            display: "flex",
            flexDirection: "column",
            background: "rgba(var(--bg-rgb),0.95)",
            backdropFilter: "blur(24px) saturate(180%)",
            border: "1px solid rgba(var(--text-rgb),0.08)",
            borderRadius: "20px",
            boxShadow:
              "0 24px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(var(--primary-rgb),0.06)",
            animation: "chatSlideUp 0.3s cubic-bezier(0.16,1,0.3,1) both",
            fontFamily: "var(--font-family, 'Inter', sans-serif)",
            overflow: "hidden",
          }}
        >
          {/* ── Header ── */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "16px 20px",
              borderBottom: "1px solid rgba(var(--text-rgb),0.06)",
              background: "rgba(var(--text-rgb),0.02)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "10px",
                  background: "var(--primary)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "16px",
                  fontWeight: 700,
                  color: "white",
                }}
              >
                A
              </div>
              <div>
                <div style={{ fontSize: "14px", fontWeight: 600, color: "var(--text)" }}>
                  ANALYXX AI
                </div>
                <div style={{ fontSize: "11px", color: "rgba(var(--text-rgb),0.35)" }}>
                  Support Assistant
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: "4px" }}>
              {/* New chat button */}
              <button
                className="help-chat-header-btn"
                onClick={handleNewChat}
                title="New chat"
                style={{
                  background: "transparent",
                  border: "none",
                  color: "rgba(var(--text-rgb),0.5)",
                  cursor: "pointer",
                  padding: "6px",
                  borderRadius: "8px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "all 200ms",
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                </svg>
              </button>
              {/* Minimize button */}
              <button
                className="help-chat-header-btn"
                onClick={() => setOpen(false)}
                title="Minimize"
                style={{
                  background: "transparent",
                  border: "none",
                  color: "rgba(var(--text-rgb),0.5)",
                  cursor: "pointer",
                  padding: "6px",
                  borderRadius: "8px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "all 200ms",
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>
            </div>
          </div>

          {/* ── Messages ── */}
          <div
            ref={scrollRef}
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "16px 16px 8px",
              display: "flex",
              flexDirection: "column",
              gap: "12px",
            }}
          >
            {messages.map((msg) => (
              <div
                key={msg.id}
                style={{
                  display: "flex",
                  justifyContent: msg.from === "user" ? "flex-end" : "flex-start",
                  animation: "chatMsgFade 0.3s cubic-bezier(0.16,1,0.3,1) both",
                }}
              >
                {msg.from === "bot" && (
                  <div
                    style={{
                      width: "26px",
                      height: "26px",
                      borderRadius: "8px",
                      background: "var(--primary)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "12px",
                      fontWeight: 700,
                      color: "white",
                      marginRight: "8px",
                      flexShrink: 0,
                      marginTop: "2px",
                    }}
                  >
                    A
                  </div>
                )}
                <div
                  style={{
                    maxWidth: "75%",
                    padding: "10px 14px",
                    borderRadius:
                      msg.from === "user"
                        ? "14px 14px 4px 14px"
                        : "14px 14px 14px 4px",
                    background:
                      msg.from === "user"
                        ? "var(--primary)"
                        : "rgba(var(--text-rgb),0.05)",
                    border:
                      msg.from === "user"
                        ? "none"
                        : "1px solid rgba(var(--text-rgb),0.06)",
                    color: msg.from === "user" ? "white" : "rgba(var(--text-rgb),0.7)",
                    fontSize: "13px",
                    lineHeight: 1.6,
                    fontWeight: 400,
                    whiteSpace: "pre-line" as const,
                  }}
                >
                  {renderText(msg.text)}
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {typing && (
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  animation: "chatMsgFade 0.3s cubic-bezier(0.16,1,0.3,1) both",
                }}
              >
                <div
                  style={{
                    width: "26px",
                    height: "26px",
                    borderRadius: "8px",
                    background: "var(--primary)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "12px",
                    fontWeight: 700,
                    color: "white",
                    marginRight: "8px",
                    flexShrink: 0,
                    marginTop: "2px",
                  }}
                >
                  A
                </div>
                <div
                  style={{
                    padding: "12px 18px",
                    borderRadius: "14px 14px 14px 4px",
                    background: "rgba(var(--text-rgb),0.05)",
                    border: "1px solid rgba(var(--text-rgb),0.06)",
                    display: "flex",
                    gap: "4px",
                    alignItems: "center",
                  }}
                >
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      style={{
                        width: "6px",
                        height: "6px",
                        borderRadius: "50%",
                        background: "var(--primary)",
                        display: "inline-block",
                        animation: `dotBounce 1.2s ease-in-out ${i * 0.15}s infinite`,
                      }}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Quick replies — show only after welcome */}
            {messages.length === 1 && !typing && (
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "8px",
                  marginTop: "4px",
                  animation: "chatMsgFade 0.4s cubic-bezier(0.16,1,0.3,1) 0.2s both",
                }}
              >
                {QUICK_REPLIES.map((qr) => (
                  <button
                    key={qr}
                    className="help-chat-quick"
                    onClick={() => sendMessage(qr)}
                    style={{
                      background: "rgba(var(--text-rgb),0.04)",
                      border: "1px solid rgba(var(--text-rgb),0.1)",
                      borderRadius: "9999px",
                      padding: "7px 14px",
                      fontSize: "12px",
                      fontWeight: 500,
                      color: "rgba(var(--text-rgb),0.6)",
                      cursor: "pointer",
                      fontFamily: "var(--font-family, 'Inter', sans-serif)",
                      transition: "all 200ms",
                    }}
                  >
                    {qr}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ── Feedback emoji row (shown after 3+ messages) ── */}
          {messages.length >= 3 && !typing && (
            <div
              style={{
                padding: "8px 16px",
                borderTop: "1px solid rgba(var(--text-rgb),0.04)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
              }}
            >
              <span style={{ fontSize: "11px", color: "rgba(var(--text-rgb),0.3)", marginRight: "4px" }}>
                Was this helpful?
              </span>
              {[{icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" /></svg>, key: "up"}, {icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17" /></svg>, key: "down"}].map((item) => (
                <button
                  key={item.key}
                  onClick={() => {}}
                  style={{
                    background: "rgba(var(--text-rgb),0.04)",
                    border: "1px solid rgba(var(--text-rgb),0.06)",
                    borderRadius: "8px",
                    padding: "4px 8px",
                    fontSize: "14px",
                    cursor: "pointer",
                    transition: "all 200ms",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: "rgba(var(--text-rgb),0.4)",
                  }}
                >
                  {item.icon}
                </button>
              ))}
            </div>
          )}

          {/* ── Input Bar ── */}
          <div
            style={{
              padding: "12px 16px 16px",
              borderTop: "1px solid rgba(var(--text-rgb),0.06)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                background: "rgba(var(--text-rgb),0.04)",
                border: "1px solid rgba(var(--text-rgb),0.08)",
                borderRadius: "14px",
                padding: "4px 4px 4px 14px",
              }}
            >
              <input
                ref={inputRef}
                className="help-chat-input"
                type="text"
                placeholder="Ask ANALYXX anything..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage(input);
                  }
                }}
                style={{
                  flex: 1,
                  background: "transparent",
                  border: "none",
                  color: "var(--text)",
                  fontSize: "13px",
                  fontFamily: "var(--font-family, 'Inter', sans-serif)",
                  outline: "none",
                }}
              />
              <button
                className="help-chat-send"
                onClick={() => sendMessage(input)}
                disabled={!input.trim()}
                style={{
                  width: "34px",
                  height: "34px",
                  borderRadius: "10px",
                  background: input.trim()
                    ? "var(--primary)"
                    : "rgba(var(--text-rgb),0.06)",
                  border: "none",
                  color: input.trim() ? "white" : "rgba(var(--text-rgb),0.2)",
                  cursor: input.trim() ? "pointer" : "default",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "all 200ms",
                  flexShrink: 0,
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              </button>
            </div>
            <div
              style={{
                textAlign: "center",
                fontSize: "10px",
                color: "rgba(var(--text-rgb),0.2)",
                marginTop: "8px",
              }}
            >
              ANALYXX can make mistakes. Double-check replies.
            </div>
          </div>
        </div>
      )}
    </>
  );
}
