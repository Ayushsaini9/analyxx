"use client";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { supabase } from "../lib/supabase";
import { API_BASE } from "../lib/config";
import ThemeCustomizer from "../components/ThemeCustomizer";
import AskClaritySidebar from "../components/AskClaritySidebar";
import { ROADMAP_CATEGORIES, type RoadmapCategory, type Roadmap, type RoadmapTopic } from "./roadmapData";

const API = API_BASE;

// ─── Progress helpers ───────────────────────────────────────────────────────
type ProgressData = Record<string, Record<number, number>>;
const STORAGE_KEY = "analyxx-roadmap-progress";

function loadProgress(): ProgressData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveProgress(data: ProgressData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function getTopicProgress(roadmapId: string, topicIdx: number): number {
  const data = loadProgress();
  return data[roadmapId]?.[topicIdx] ?? 0;
}

function setTopicProgress(roadmapId: string, topicIdx: number, value: number): void {
  const data = loadProgress();
  if (!data[roadmapId]) data[roadmapId] = {};
  data[roadmapId][topicIdx] = value;
  saveProgress(data);
}

// ─── Component ──────────────────────────────────────────────────────────────
export default function RoadmapPage() {
  const [activeCategory, setActiveCategory] = useState(0);
  const [selectedRoadmap, setSelectedRoadmap] = useState<Roadmap | null>(null);
  const [progress, setProgress] = useState<ProgressData>({});
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [profilePicture, setProfilePicture] = useState("");
  const [isPro, setIsPro] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [claritySidebarOpen, setClaritySidebarOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileSidebar, setMobileSidebar] = useState(false);
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const categoryScrollRef = useRef<HTMLDivElement>(null);

  // ─── Auth check ─────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setIsLoggedIn(true);
        const meta = session.user.user_metadata;
        const name = meta?.full_name || meta?.name || session.user.email?.split("@")[0] || "User";
        setUserName(name);
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
    })();
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

  // ─── Load progress & responsive ────────────────────────────────────────
  useEffect(() => {
    setProgress(loadProgress());
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // ─── Progress helpers (component-level) ────────────────────────────────
  const getRoadmapProgress = useCallback(
    (roadmap: Roadmap) => {
      const total = roadmap.topics.reduce((s, t) => s + t.total, 0);
      const done = roadmap.topics.reduce(
        (s, t, i) => s + Math.min(progress[roadmap.id]?.[i] ?? 0, t.total),
        0
      );
      return { total, done, pct: total > 0 ? Math.round((done / total) * 100) : 0 };
    },
    [progress]
  );

  const handleIncrement = (roadmapId: string, topicIdx: number, topicTotal: number) => {
    const current = progress[roadmapId]?.[topicIdx] ?? 0;
    if (current >= topicTotal) return;
    setTopicProgress(roadmapId, topicIdx, current + 1);
    setProgress(loadProgress());
  };

  const handleDecrement = (roadmapId: string, topicIdx: number) => {
    const current = progress[roadmapId]?.[topicIdx] ?? 0;
    if (current <= 0) return;
    setTopicProgress(roadmapId, topicIdx, current - 1);
    setProgress(loadProgress());
  };

  const currentCategory: RoadmapCategory = ROADMAP_CATEGORIES[activeCategory];

  // ─── All roadmaps flat lookup ──────────────────────────────────────────
  const allRoadmaps = useMemo(
    () => ROADMAP_CATEGORIES.flatMap((c) => c.roadmaps),
    []
  );

  const TRENDING_IDS = ['dsa', 'machine-learning', 'frontend', 'system-design', 'generative-ai', 'python', 'devops', 'data-science'];
  const FEATURED_IDS = ['deep-learning', 'docker-k8s', 'react-nextjs', 'ethical-hacking', 'data-analytics', 'gate-cse', 'flutter', 'aws'];

  const trendingRoadmaps = useMemo(
    () => TRENDING_IDS.map((id) => allRoadmaps.find((r) => r.id === id)).filter(Boolean) as Roadmap[],
    [allRoadmaps]
  );
  const featuredRoadmaps = useMemo(
    () => FEATURED_IDS.map((id) => allRoadmaps.find((r) => r.id === id)).filter(Boolean) as Roadmap[],
    [allRoadmaps]
  );

  return (
    <>
      <style>{`
        /* ─── CSS Variables ─────────────────────────────────────────── */
        :root {
          --bg: #050505;
          --bg-rgb: 5,5,5;
          --primary: #10b981;
          --primary-rgb: 16,185,129;
          --surface: #0B0F0F;
          --surface-rgb: 11,15,15;
          --text: #EBEBEB;
          --text-rgb: 235,235,235;
        }

        /* ─── Base Reset ────────────────────────────────────────────── */
        .rm-page {
          min-height: 100vh;
          background: var(--bg);
          color: var(--text);
          font-family: 'Inter', sans-serif;
          display: flex;
          overflow: hidden;
        }

        /* ─── Left Panel ────────────────────────────────────────────── */
        .rm-left {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow-y: auto;
          overflow-x: hidden;
          height: 100vh;
        }
        .rm-left::-webkit-scrollbar { width: 6px; }
        .rm-left::-webkit-scrollbar-track { background: transparent; }
        .rm-left::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 3px; }
        .rm-left::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.15); }

        /* ─── Fixed Navbar (Homepage style) ─────────────────────────── */
        .rm-navbar {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 50;
          padding: 16px 28px;
          background: rgba(var(--bg-rgb), 0.85);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border-bottom: none;
          display: flex;
          align-items: center;
          justify-content: space-between;
          transition: all 400ms cubic-bezier(0.16,1,0.3,1);
        }
        .rm-navbar .nav-link {
          font-size: 14px;
          font-weight: 500;
          color: rgba(var(--text-rgb), 0.6);
          text-decoration: none;
          position: relative;
          padding-bottom: 2px;
          transition: color 300ms;
          background: none;
          border: none;
          cursor: pointer;
          font-family: 'Inter', sans-serif;
        }
        .rm-navbar .nav-link::after {
          content: '';
          position: absolute;
          bottom: 0;
          left: 0;
          height: 1px;
          width: 0;
          background: var(--primary);
          transition: width 300ms cubic-bezier(0.16,1,0.3,1);
        }
        .rm-navbar .nav-link:hover { color: #EBEBEB; }
        .rm-navbar .nav-link:hover::after { width: 100%; }

        @keyframes dropdownSlide {
          from { opacity: 0; transform: translateY(-8px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        .rm-navbar .dropdown-item:hover {
          background: rgba(255,255,255,0.06) !important;
          color: #EBEBEB !important;
        }

        .rm-left {
          padding-top: 64px;
        }

        /* ─── Category Tabs ─────────────────────────────────────────── */
        .rm-cats-wrap {
          padding: 16px 28px 0;
        }
        .rm-cats {
          display: flex;
          gap: 8px;
          overflow-x: auto;
          padding-bottom: 12px;
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .rm-cats::-webkit-scrollbar { display: none; }
        .rm-cat-pill {
          flex-shrink: 0;
          padding: 8px 16px;
          border-radius: 20px;
          font-size: 13px;
          font-weight: 500;
          border: 1px solid rgba(255,255,255,0.06);
          background: rgba(255,255,255,0.05);
          color: rgba(var(--text-rgb), 0.65);
          cursor: pointer;
          transition: all 0.25s cubic-bezier(0.16,1,0.3,1);
          white-space: nowrap;
          user-select: none;
        }
        .rm-cat-pill:hover {
          background: rgba(255,255,255,0.08);
          color: var(--text);
          border-color: rgba(255,255,255,0.1);
        }
        .rm-cat-pill.active {
          background: rgba(var(--primary-rgb), 0.15);
          color: var(--primary);
          border-color: rgba(var(--primary-rgb), 0.3);
        }

        /* ─── Grid ──────────────────────────────────────────────────── */
        .rm-content { padding: 20px 28px 40px; }
        .rm-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 16px;
        }

        /* ─── Card ──────────────────────────────────────────────────── */
        .rm-card {
          background: var(--surface);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 16px;
          padding: 24px;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.16,1,0.3,1);
          display: flex;
          flex-direction: column;
          gap: 12px;
          position: relative;
          overflow: hidden;
        }
        .rm-card::before {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: 16px;
          opacity: 0;
          background: radial-gradient(400px circle at var(--mouse-x, 50%) var(--mouse-y, 50%),
                      rgba(var(--primary-rgb), 0.06), transparent 60%);
          transition: opacity 0.3s;
          pointer-events: none;
        }
        .rm-card:hover {
          border-color: rgba(var(--primary-rgb), 0.2);
          transform: translateY(-3px);
          box-shadow: 0 8px 30px rgba(0,0,0,0.3), 0 0 20px rgba(var(--primary-rgb), 0.05);
        }
        .rm-card:hover::before { opacity: 1; }
        .rm-card-icon {
          font-size: 18px;
          font-weight: 700;
          line-height: 1;
          width: 44px;
          height: 44px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          letter-spacing: -0.5px;
          flex-shrink: 0;
        }
        .rm-card-name {
          font-size: 16px;
          font-weight: 600;
          color: var(--text);
          letter-spacing: -0.2px;
        }
        .rm-card-desc {
          font-size: 12.5px;
          color: rgba(var(--text-rgb), 0.45);
          line-height: 1.5;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .rm-card-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-top: auto;
        }
        .rm-card-topics {
          font-size: 11px;
          color: rgba(var(--text-rgb), 0.4);
        }
        .rm-card-pct {
          font-size: 12px;
          font-weight: 600;
          color: var(--primary);
        }

        /* ─── Progress bar ──────────────────────────────────────────── */
        .rm-pbar {
          width: 100%;
          height: 4px;
          background: rgba(255,255,255,0.06);
          border-radius: 2px;
          overflow: hidden;
        }
        .rm-pbar-fill {
          height: 100%;
          background: var(--primary);
          border-radius: 2px;
          transition: width 0.4s cubic-bezier(0.16,1,0.3,1);
        }

        /* ─── Detail View ───────────────────────────────────────────── */
        .rm-detail-header {
          display: flex;
          align-items: center;
          gap: 14px;
          margin-bottom: 20px;
        }
        .rm-detail-back {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.08);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: rgba(var(--text-rgb), 0.6);
          font-size: 16px;
          transition: all 0.2s;
          flex-shrink: 0;
        }
        .rm-detail-back:hover {
          background: rgba(255,255,255,0.1);
          color: var(--text);
        }
        .rm-detail-icon { font-size: 28px; }
        .rm-detail-title {
          font-size: 22px;
          font-weight: 700;
          letter-spacing: -0.3px;
        }
        .rm-detail-stats {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 24px;
          padding: 16px;
          background: rgba(255,255,255,0.03);
          border-radius: 12px;
          border: 1px solid rgba(255,255,255,0.05);
        }
        .rm-detail-stats .rm-pbar { flex: 1; height: 6px; }
        .rm-detail-stats-text {
          font-size: 13px;
          font-weight: 500;
          color: rgba(var(--text-rgb), 0.65);
          white-space: nowrap;
        }
        .rm-detail-stats-pct {
          font-size: 20px;
          font-weight: 700;
          color: var(--primary);
          min-width: 50px;
          text-align: right;
        }

        /* ─── Topic Rows ────────────────────────────────────────────── */
        .rm-topics { display: flex; flex-direction: column; gap: 2px; }
        .rm-topic-row {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px 16px;
          background: rgba(var(--surface-rgb), 0.6);
          border: 1px solid rgba(255,255,255,0.04);
          border-radius: 10px;
          transition: background 0.15s;
        }
        .rm-topic-row:nth-child(even) { background: rgba(var(--surface-rgb), 0.9); }
        .rm-topic-row:hover { background: rgba(255,255,255,0.04); }
        .rm-topic-name {
          flex: 1;
          font-size: 14px;
          font-weight: 500;
          color: var(--text);
        }
        .rm-topic-progress {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-shrink: 0;
        }
        .rm-topic-pbar {
          width: 100px;
          height: 4px;
          background: rgba(255,255,255,0.06);
          border-radius: 2px;
          overflow: hidden;
        }
        .rm-topic-pbar-fill {
          height: 100%;
          background: var(--primary);
          border-radius: 2px;
          transition: width 0.3s cubic-bezier(0.16,1,0.3,1);
        }
        .rm-topic-count {
          font-size: 12px;
          color: rgba(var(--text-rgb), 0.45);
          min-width: 55px;
          text-align: center;
          font-variant-numeric: tabular-nums;
        }
        .rm-topic-btn {
          width: 28px;
          height: 28px;
          border-radius: 8px;
          border: 1px solid rgba(255,255,255,0.08);
          background: rgba(255,255,255,0.04);
          color: rgba(var(--text-rgb), 0.6);
          font-size: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.15s;
          flex-shrink: 0;
          line-height: 1;
          user-select: none;
        }
        .rm-topic-btn:hover {
          background: rgba(var(--primary-rgb), 0.15);
          border-color: rgba(var(--primary-rgb), 0.3);
          color: var(--primary);
        }
        .rm-topic-btn:active { transform: scale(0.9); }
        .rm-topic-btn.disabled {
          opacity: 0.3;
          pointer-events: none;
        }

        /* ─── Right Panel ───────────────────────────────────────────── */
        .rm-right {
          width: 380px;
          flex-shrink: 0;
          border-left: 1px solid rgba(255,255,255,0.1);
          display: flex;
          flex-direction: column;
          height: 100vh;
          background: var(--bg);
          transition: width 0.3s cubic-bezier(0.16,1,0.3,1);
        }
        .rm-right.hidden { width: 0; border: none; overflow: hidden; }
        .rm-sidebar-head {
          padding: 14px 16px;
          display: flex;
          align-items: center;
          gap: 10px;
          border-bottom: 1px solid rgba(255,255,255,0.06);
          flex-shrink: 0;
        }
        .rm-sidebar-title {
          font-size: 14px;
          font-weight: 600;
          flex: 1;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .rm-sidebar-title .dot {
          width: 8px; height: 8px; border-radius: 50%;
          background: var(--primary);
          animation: rm-pulse 2s ease-in-out infinite;
        }
        @keyframes rm-pulse {
          0%, 100% { opacity: 1; box-shadow: 0 0 0 0 rgba(var(--primary-rgb), 0.4); }
          50% { opacity: 0.7; box-shadow: 0 0 0 6px rgba(var(--primary-rgb), 0); }
        }
        .rm-sidebar-btn {
          width: 30px; height: 30px; border-radius: 8px;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.08);
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; color: rgba(var(--text-rgb), 0.5);
          font-size: 14px; text-decoration: none;
          transition: all 0.15s;
        }
        .rm-sidebar-btn:hover { background: rgba(255,255,255,0.1); color: var(--text); }
        .rm-iframe-wrap {
          flex: 1; position: relative; overflow: hidden;
        }
        .rm-iframe-wrap iframe {
          width: 100%; height: 100%; border: none;
        }
        .rm-iframe-spinner {
          position: absolute; inset: 0;
          display: flex; align-items: center; justify-content: center;
          background: var(--bg);
        }
        .rm-spinner {
          width: 32px; height: 32px; border: 3px solid rgba(255,255,255,0.08);
          border-top-color: var(--primary); border-radius: 50%;
          animation: rm-spin 0.8s linear infinite;
        }
        @keyframes rm-spin { to { transform: rotate(360deg); } }

        /* ─── Mobile FAB ────────────────────────────────────────────── */
        .rm-fab {
          display: none;
          position: fixed;
          bottom: 24px;
          right: 24px;
          width: 52px;
          height: 52px;
          border-radius: 16px;
          background: var(--primary);
          color: #fff;
          font-size: 22px;
          border: none;
          cursor: pointer;
          z-index: 100;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 20px rgba(var(--primary-rgb), 0.35);
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .rm-fab:hover { transform: scale(1.05); box-shadow: 0 6px 28px rgba(var(--primary-rgb), 0.5); }
        .rm-fab:active { transform: scale(0.95); }

        /* ─── Mobile Overlay ────────────────────────────────────────── */
        .rm-mobile-overlay {
          display: none;
          position: fixed; inset: 0; z-index: 200;
          background: rgba(0,0,0,0.6);
          backdrop-filter: blur(4px);
        }
        .rm-mobile-sidebar {
          position: absolute;
          bottom: 0; left: 0; right: 0;
          height: 85vh;
          background: var(--bg);
          border-top-left-radius: 20px;
          border-top-right-radius: 20px;
          display: flex; flex-direction: column;
          transform: translateY(100%);
          transition: transform 0.35s cubic-bezier(0.16,1,0.3,1);
          overflow: hidden;
        }
        .rm-mobile-overlay.open { display: flex; }
        .rm-mobile-overlay.open .rm-mobile-sidebar { transform: translateY(0); }
        .rm-mobile-handle {
          width: 40px; height: 4px; background: rgba(255,255,255,0.2);
          border-radius: 2px; margin: 10px auto;
          flex-shrink: 0;
        }

        /* ─── Horizontal Scroll Sections ──────────────────────────── */
        .rm-section { margin-bottom: 32px; }
        .rm-section-header {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 16px;
        }
        .rm-section-title {
          font-size: 16px;
          font-weight: 600;
          color: var(--text);
          letter-spacing: -0.3px;
        }
        .rm-section-badge {
          font-size: 10px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          padding: 3px 8px;
          border-radius: 6px;
        }
        .rm-hscroll {
          display: flex;
          gap: 14px;
          overflow-x: auto;
          padding-bottom: 8px;
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .rm-hscroll::-webkit-scrollbar { display: none; }
        .rm-hcard {
          flex-shrink: 0;
          width: 220px;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 14px;
          padding: 18px 16px;
          cursor: pointer;
          transition: all 0.25s cubic-bezier(0.16,1,0.3,1);
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .rm-hcard:hover {
          background: rgba(255,255,255,0.06);
          border-color: rgba(255,255,255,0.12);
          transform: translateY(-3px);
          box-shadow: 0 8px 24px rgba(0,0,0,0.3);
        }
        .rm-hcard-icon {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 15px;
          font-weight: 700;
          flex-shrink: 0;
        }
        .rm-hcard-name {
          font-size: 14px;
          font-weight: 600;
          color: var(--text);
          line-height: 1.3;
        }
        .rm-hcard-meta {
          font-size: 11px;
          color: rgba(var(--text-rgb), 0.4);
        }
        .rm-divider {
          height: 1px;
          background: rgba(255,255,255,0.05);
          margin: 8px 0 28px;
        }
        .rm-browse-label {
          font-size: 16px;
          font-weight: 600;
          color: var(--text);
          letter-spacing: -0.3px;
          margin-bottom: 4px;
        }

        /* ─── Responsive ────────────────────────────────────────────── */
        @media (max-width: 767px) {
          .rm-right { display: none !important; }
          .rm-fab { display: flex; }
          .rm-navbar { padding: 10px 16px; }
          .rm-navbar .desktop-nav-links { display: none !important; }
          .rm-navbar .mobile-menu-btn { display: flex !important; }
          .rm-navbar .nav-auth-buttons { display: none !important; }
          .rm-navbar .nav-theme-customizer { display: none !important; }
          .rm-navbar .nav-user-dropdown { display: none !important; }
          .rm-cats-wrap { padding: 12px 16px 0; }
          .rm-content { padding: 12px 16px 100px; }
          .rm-grid { grid-template-columns: 1fr; }
          .rm-hcard { width: 180px; }
          .rm-topic-pbar { width: 60px; }
          .rm-detail-title { font-size: 18px; }
        }
        @media (min-width: 768px) and (max-width: 1024px) {
          .rm-grid { grid-template-columns: repeat(2, 1fr); }
          .rm-navbar .desktop-nav-links { display: none !important; }
          .rm-navbar .mobile-menu-btn { display: flex !important; }
          .rm-navbar .nav-auth-buttons { display: none !important; }
          .rm-navbar .nav-theme-customizer { display: none !important; }
          .rm-navbar .nav-user-dropdown { display: none !important; }
        }
      `}</style>

      {/* ── Mobile Nav Overlay ── */}
      <div className={`mobile-nav-overlay${mobileMenuOpen ? " open" : ""}`}>
        <button className="mobile-nav-close" onClick={() => setMobileMenuOpen(false)}>✕</button>
        {[{label: "Library", href: "/library"}, {label: "Pricing", href: "/#pricing"}, {label: "About", href: "/about"}].map((l) => (
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
      <header className="rm-navbar" style={{ right: (!isMobile && sidebarOpen) ? "380px" : "0" }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <a href="/">
            <img src="/logo.png" alt="ANALYXX" className="logo-icon theme-logo" style={{
              width: "40px", height: "40px", borderRadius: "10px",
              cursor: "pointer", objectFit: "cover",
            }} />
          </a>
          <a href="/" style={{ textDecoration: "none" }}>
            <span className="font-serif" style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "20px", fontWeight: 400, letterSpacing: "-0.02em", color: "var(--text)" }}>
              <span>ANALYXX <em style={{ color: "var(--primary)" }}>AI</em></span>
              {isPro && (
                <span className="analyxx-pro-badge">
                  <span>Pro</span>
                </span>
              )}
            </span>
          </a>
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
          {[{label: "Library", href: "/library"}, {label: "Pricing", href: "/#pricing"}, {label: "About", href: "/about"}].map((l) => (
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
                textDecoration: "none",
                transition: "all 300ms",
              }}>Get Started →</a>
            </div>
          )}
        </div>
      </header>

      {/* Clarity AI Sidebar */}
      <AskClaritySidebar isOpen={claritySidebarOpen} onClose={() => setClaritySidebarOpen(false)} />

      <div className="rm-page">
        {/* ─── LEFT PANEL ──────────────────────────────────────────── */}
        <div className="rm-left">

          {/* Content */}
          <div className="rm-content">
            {selectedRoadmap ? (
              /* ─── DETAIL VIEW ───────────────────────────────────── */
              <DetailView
                roadmap={selectedRoadmap}
                progress={progress}
                getRoadmapProgress={getRoadmapProgress}
                onBack={() => setSelectedRoadmap(null)}
                onIncrement={handleIncrement}
                onDecrement={handleDecrement}
              />
            ) : (
              <>
                {/* ─── TRENDING ──────────────────────────────────── */}
                <div className="rm-section">
                  <div className="rm-section-header">
                    <span className="rm-section-title">Trending Courses</span>
                    <span className="rm-section-badge" style={{ background: 'rgba(239,68,68,0.12)', color: '#ef4444' }}>Hot</span>
                  </div>
                  <div className="rm-hscroll">
                    {trendingRoadmaps.map((rm) => {
                      const { total, pct } = getRoadmapProgress(rm);
                      return (
                        <div key={rm.id} className="rm-hcard" onClick={() => setSelectedRoadmap(rm)}>
                          <div className="rm-hcard-icon" style={{ background: `${rm.color}18`, color: rm.color }}>{rm.name.charAt(0)}</div>
                          <div className="rm-hcard-name">{rm.name}</div>
                          <div className="rm-pbar"><div className="rm-pbar-fill" style={{ width: `${pct}%` }} /></div>
                          <div className="rm-hcard-meta">{rm.topics.length} topics · {total} problems</div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* ─── FEATURED ──────────────────────────────────── */}
                <div className="rm-section">
                  <div className="rm-section-header">
                    <span className="rm-section-title">Featured Courses</span>
                    <span className="rm-section-badge" style={{ background: 'rgba(var(--primary-rgb),0.12)', color: 'var(--primary)' }}>Curated</span>
                  </div>
                  <div className="rm-hscroll">
                    {featuredRoadmaps.map((rm) => {
                      const { total, pct } = getRoadmapProgress(rm);
                      return (
                        <div key={rm.id} className="rm-hcard" onClick={() => setSelectedRoadmap(rm)}>
                          <div className="rm-hcard-icon" style={{ background: `${rm.color}18`, color: rm.color }}>{rm.name.charAt(0)}</div>
                          <div className="rm-hcard-name">{rm.name}</div>
                          <div className="rm-pbar"><div className="rm-pbar-fill" style={{ width: `${pct}%` }} /></div>
                          <div className="rm-hcard-meta">{rm.topics.length} topics · {total} problems</div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* ─── DIVIDER + ALL COURSES ──────────────────────── */}
                <div className="rm-divider" />
                <div className="rm-browse-label">All Courses</div>

                {/* Category Tabs (moved here) */}
                <div style={{ marginBottom: 16 }}>
                  <div className="rm-cats" ref={categoryScrollRef}>
                    {ROADMAP_CATEGORIES.map((cat, i) => (
                      <button
                        key={cat.name}
                        className={`rm-cat-pill${activeCategory === i ? " active" : ""}`}
                        onClick={() => {
                          setActiveCategory(i);
                        }}
                      >
                        {cat.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="rm-grid">
                  {currentCategory.roadmaps.map((rm) => {
                    const { total, done, pct } = getRoadmapProgress(rm);
                    return (
                      <div
                        key={rm.id}
                        className="rm-card"
                        onClick={() => setSelectedRoadmap(rm)}
                        onMouseMove={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          e.currentTarget.style.setProperty(
                            "--mouse-x",
                            `${e.clientX - rect.left}px`
                          );
                          e.currentTarget.style.setProperty(
                            "--mouse-y",
                            `${e.clientY - rect.top}px`
                          );
                        }}
                      >
                        <div className="rm-card-icon" style={{ background: `${rm.color}18`, color: rm.color }}>{rm.name.charAt(0)}</div>
                        <div className="rm-card-name">{rm.name}</div>
                        <div className="rm-card-desc">{rm.description}</div>
                        <div className="rm-pbar">
                          <div
                            className="rm-pbar-fill"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <div className="rm-card-footer">
                          <span className="rm-card-topics">
                            {rm.topics.length} topics · {total} problems
                          </span>
                          <span className="rm-card-pct">{pct}%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>

        {/* ─── RIGHT PANEL (Desktop) ───────────────────────────────── */}
        {!isMobile && (
          <div className={`rm-right${sidebarOpen ? "" : " hidden"}`}>
            <div className="rm-sidebar-head">
              <div className="rm-sidebar-title">
                <span className="dot" />
                Clarity AI
              </div>
              <a
                href="/upload"
                className="rm-sidebar-btn"
                title="Open full Clarity AI"
              >
                ↗
              </a>
              <button
                className="rm-sidebar-btn"
                onClick={() => setSidebarOpen(false)}
                title="Close sidebar"
              >
                ✕
              </button>
            </div>
            <div className="rm-iframe-wrap">
              {!iframeLoaded && (
                <div className="rm-iframe-spinner">
                  <div className="rm-spinner" />
                </div>
              )}
              <iframe
                src="/upload?sidebar=true"
                onLoad={() => setIframeLoaded(true)}
              />
            </div>
          </div>
        )}

        {/* Reopen sidebar button (desktop, when closed) */}
        {!isMobile && !sidebarOpen && (
          <button
            style={{
              position: "fixed",
              right: 16,
              top: "50%",
              transform: "translateY(-50%)",
              width: 36,
              height: 36,
              borderRadius: 10,
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.1)",
              color: "rgba(235,235,235,0.6)",
              cursor: "pointer",
              fontSize: 16,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 30,
              transition: "all 0.2s",
            }}
            onClick={() => setSidebarOpen(true)}
            title="Open Clarity AI"
          >
            💬
          </button>
        )}

        {/* ─── MOBILE FAB + Overlay ────────────────────────────────── */}
        {isMobile && (
          <>
            <button className="rm-fab" onClick={() => setMobileSidebar(true)}>
              💬
            </button>
            <div
              className={`rm-mobile-overlay${mobileSidebar ? " open" : ""}`}
              onClick={(e) => {
                if (e.target === e.currentTarget) setMobileSidebar(false);
              }}
            >
              <div className="rm-mobile-sidebar">
                <div className="rm-mobile-handle" />
                <div className="rm-sidebar-head">
                  <div className="rm-sidebar-title">
                    <span className="dot" />
                    Clarity AI
                  </div>
                  <a href="/upload" className="rm-sidebar-btn" title="Open full">↗</a>
                  <button
                    className="rm-sidebar-btn"
                    onClick={() => setMobileSidebar(false)}
                  >
                    ✕
                  </button>
                </div>
                <div className="rm-iframe-wrap">
                  <iframe src="/upload?sidebar=true" style={{ width: "100%", height: "100%", border: "none" }} />
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}

// ─── Detail Sub-Component ─────────────────────────────────────────────────
function DetailView({
  roadmap,
  progress,
  getRoadmapProgress,
  onBack,
  onIncrement,
  onDecrement,
}: {
  roadmap: Roadmap;
  progress: ProgressData;
  getRoadmapProgress: (rm: Roadmap) => { total: number; done: number; pct: number };
  onBack: () => void;
  onIncrement: (roadmapId: string, topicIdx: number, topicTotal: number) => void;
  onDecrement: (roadmapId: string, topicIdx: number) => void;
}) {
  const { total, done, pct } = getRoadmapProgress(roadmap);

  return (
    <>
      <div className="rm-detail-header">
        <button className="rm-detail-back" onClick={onBack}>←</button>
        <span className="rm-detail-icon" style={{ background: `${roadmap.color}18`, color: roadmap.color, width: 36, height: 36, borderRadius: 10, display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 16 }}>{roadmap.name.charAt(0)}</span>
        <span className="rm-detail-title">{roadmap.name}</span>
      </div>

      <div className="rm-detail-stats">
        <div className="rm-detail-stats-text">
          {done} / {total} completed
        </div>
        <div className="rm-pbar" style={{ height: 6 }}>
          <div className="rm-pbar-fill" style={{ width: `${pct}%` }} />
        </div>
        <div className="rm-detail-stats-pct">{pct}%</div>
      </div>

      <div className="rm-topics">
        {roadmap.topics.map((topic, i) => {
          const completed = Math.min(progress[roadmap.id]?.[i] ?? 0, topic.total);
          const topicPct = topic.total > 0 ? Math.round((completed / topic.total) * 100) : 0;
          return (
            <div key={i} className="rm-topic-row">
              <span
                style={{
                  fontSize: 11,
                  color:
                    completed === topic.total && topic.total > 0
                      ? "var(--primary)"
                      : "rgba(var(--text-rgb), 0.3)",
                  transition: "color 0.2s",
                  flexShrink: 0,
                  width: 16,
                  textAlign: "center",
                }}
              >
                {completed === topic.total && topic.total > 0 ? "✓" : "▸"}
              </span>
              <span className="rm-topic-name">{topic.name}</span>
              <div className="rm-topic-progress">
                <div className="rm-topic-pbar">
                  <div
                    className="rm-topic-pbar-fill"
                    style={{ width: `${topicPct}%` }}
                  />
                </div>
                <span className="rm-topic-count">
                  {completed} / {topic.total}
                </span>
                <button
                  className={`rm-topic-btn${completed <= 0 ? " disabled" : ""}`}
                  onClick={() => onDecrement(roadmap.id, i)}
                  title="Decrement"
                >
                  −
                </button>
                <button
                  className={`rm-topic-btn${completed >= topic.total ? " disabled" : ""}`}
                  onClick={() => onIncrement(roadmap.id, i, topic.total)}
                  title="Increment"
                >
                  +
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
