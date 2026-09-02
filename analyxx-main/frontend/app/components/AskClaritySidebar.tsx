"use client";
import { useState, useEffect, useCallback } from "react";

const SIDEBAR_WIDTH = 420;
const SIDEBAR_WIDTH_CSS = `min(${SIDEBAR_WIDTH}px, 90vw)`;

interface AskClaritySidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AskClaritySidebar({ isOpen, onClose }: AskClaritySidebarProps) {
  const [loaded, setLoaded] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);

  const toggleRecentChats = () => {
    const iframeEl = document.querySelector('.clarity-sidebar-panel iframe') as HTMLIFrameElement;
    if (iframeEl && iframeEl.contentWindow) {
      iframeEl.contentWindow.postMessage({ type: 'TOGGLE_RECENTS' }, '*');
    }
  };

  // Close on Escape key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) onClose();
    };
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [isOpen, onClose]);

  // Listen for login requests from the sidebar iframe
  // Google OAuth can't run inside an iframe, so we navigate the parent window
  useEffect(() => {
    const handleIframeMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'SIDEBAR_LOGIN') {
        onClose();
        // Build redirect URL: current page + openSidebar flag so sidebar reopens after login
        const currentPath = window.location.pathname + window.location.search;
        const separator = currentPath.includes('?') ? '&' : '?';
        const redirectUrl = `${currentPath}${separator}openSidebar=true`;
        setTimeout(() => {
          window.location.href = `/login?redirect=${encodeURIComponent(redirectUrl)}`;
        }, 100);
      }
    };
    window.addEventListener('message', handleIframeMessage);
    return () => window.removeEventListener('message', handleIframeMessage);
  }, [onClose]);

  // Push page content aside when sidebar opens (no overlay, no scroll lock)
  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      document.body.classList.add("clarity-sidebar-open");
    } else {
      document.body.classList.remove("clarity-sidebar-open");
      // Wait for slide-out animation before unmounting
      const timer = setTimeout(() => {
        setShouldRender(false);
        setLoaded(false);
      }, 350);
      return () => clearTimeout(timer);
    }
    return () => {
      document.body.classList.remove("clarity-sidebar-open");
    };
  }, [isOpen]);

  if (!shouldRender) return null;

  return (
    <>
      {/* Sidebar panel — fixed on right, page content pushed via body margin */}
      <div
        className="clarity-sidebar-panel"
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          width: SIDEBAR_WIDTH_CSS,
          zIndex: 9999,
          display: "flex",
          flexDirection: "column",
          background: "var(--bg, #0a0a0a)",
          borderLeft: "1px solid rgba(255,255,255,0.1)",
          boxShadow: "-4px 0 24px rgba(0,0,0,0.3)",
          transform: isOpen ? "translateX(0)" : "translateX(100%)",
          transition: "transform 0.35s cubic-bezier(0.16,1,0.3,1)",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "14px 16px",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
            background: "rgba(var(--bg-rgb),0.8)",
            backdropFilter: "blur(20px)",
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            {/* Hamburger button */}
            <button
              onClick={toggleRecentChats}
              title="Toggle Recents"
              style={{
                width: "28px",
                height: "28px",
                borderRadius: "8px",
                background: "transparent",
                border: "1px solid rgba(255,255,255,0.08)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                transition: "all 200ms",
              }}
              className="clarity-header-btn"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(var(--text-rgb),0.7)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            {/* Open in full page */}
            <a
              href="/upload"
              title="Open full page"
              style={{
                width: "30px",
                height: "30px",
                borderRadius: "8px",
                border: "1px solid rgba(255,255,255,0.06)",
                background: "transparent",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                textDecoration: "none",
                transition: "all 200ms",
              }}
              className="clarity-header-btn"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(var(--text-rgb),0.5)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 3 21 3 21 9" />
                <polyline points="9 21 3 21 3 15" />
                <line x1="21" y1="3" x2="14" y2="10" />
                <line x1="3" y1="21" x2="10" y2="14" />
              </svg>
            </a>
            {/* Close button */}
            <button
              onClick={onClose}
              title="Close sidebar"
              style={{
                width: "30px",
                height: "30px",
                borderRadius: "8px",
                border: "1px solid rgba(255,255,255,0.06)",
                background: "transparent",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                transition: "all 200ms",
              }}
              className="clarity-header-btn"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(var(--text-rgb),0.5)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        {/* Loading indicator */}
        {!loaded && (
          <div style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "12px",
            zIndex: 1,
          }}>
            <div style={{
              width: "28px",
              height: "28px",
              border: "2.5px solid rgba(var(--primary-rgb),0.15)",
              borderTopColor: "var(--primary)",
              borderRadius: "50%",
              animation: "spin 0.8s linear infinite",
            }} />
            <span style={{
              fontSize: "12px",
              color: "rgba(var(--text-rgb),0.3)",
              fontFamily: "'Inter', sans-serif",
            }}>
              Loading Ask Clarity...
            </span>
          </div>
        )}

        {/* Iframe */}
        <iframe
          src="/upload?sidebar=true"
          style={{
            flex: 1,
            width: "100%",
            border: "none",
            opacity: loaded ? 1 : 0,
            transition: "opacity 0.3s ease",
            background: "var(--bg)",
          }}
          onLoad={() => setLoaded(true)}
          title="Ask Clarity - Study Assistant"
        />
      </div>

      <style>{`
        /* Push all page content left when sidebar is open */
        body.clarity-sidebar-open {
          margin-right: ${SIDEBAR_WIDTH_CSS} !important;
          transition: margin-right 0.35s cubic-bezier(0.16, 1, 0.3, 1);
        }
        /* Smooth return when sidebar closes */
        body:not(.clarity-sidebar-open) {
          transition: margin-right 0.35s cubic-bezier(0.16, 1, 0.3, 1);
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .clarity-header-btn:hover {
          background: rgba(255,255,255,0.06) !important;
          border-color: rgba(255,255,255,0.12) !important;
        }
        .clarity-header-btn:hover svg {
          stroke: rgba(var(--text-rgb),0.8) !important;
        }
      `}</style>
    </>
  );
}
