"use client";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { API_BASE, STORAGE_URL } from "../../lib/config";
import AskClaritySidebar from "../../components/AskClaritySidebar";

/**
 * Fullscreen Paper Viewer — /library/view
 *
 * Opens a PYQ paper in a fullscreen embedded viewer.
 * Used by the WhatsApp bot to share direct links instead of PDF files.
 *
 * Query params:
 *   Regular exams: ?exam=jee-mains&subject=Physics&year=2024
 *   RTU 1st year:  ?exam=rtu&branch=it&branchYear=1st-year&subject=Engineering+Mathematics-I&year=2024
 *   RTU 2-4 year:  ?exam=rtu&branch=it&branchYear=2nd-year&subject=Data+Structures+and+Algorithms&year=2024&sem=3
 */

const EXAM_NAMES: Record<string, string> = {
  "jee-mains": "JEE Mains",
  "jee-advanced": "JEE Advanced",
  "upsc-cse": "UPSC CSE",
  neet: "NEET",
  cat: "CAT",
  gate: "GATE",
  "cbse-10": "10th CBSE Board",
  "cbse-12": "12th CBSE Board",
  rtu: "RTU",
};

function formatPaperLabel(fileName: string): string {
  const name = fileName.replace(/\.pdf$/i, "");
  const matchShift = name.match(/^(\d{4})_([a-z]+)_(\d{1,2})([a-z]+)_shift(\d+)$/i);
  if (matchShift) {
    const day = matchShift[3].padStart(2, '0');
    const month = matchShift[4].charAt(0).toUpperCase() + matchShift[4].slice(1);
    const shift = matchShift[5];
    return `${day} ${month} · Shift ${shift}`;
  }
  const matchAdv = name.match(/^(\d{4})_paper(\d+)$/i);
  if (matchAdv) {
    return `Paper ${matchAdv[2]}`;
  }
  const matchSlot = name.match(/^(\d{4})_slot(\d+)$/i);
  if (matchSlot) {
    return `Slot ${matchSlot[2]}`;
  }
  const matchSet = name.match(/^(\d{4})_set(\d+)$/i);
  if (matchSet) {
    return `Set ${matchSet[2]}`;
  }
  return name.replace(/_/g, " ");
}

function ViewerContent() {
  const searchParams = useSearchParams();
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [claritySidebarOpen, setClaritySidebarOpen] = useState(false);

  const [availableFiles, setAvailableFiles] = useState<{ fileName: string; label: string }[]>([]);
  const [selectedFileName, setSelectedFileName] = useState<string>("");

  // Auto-open sidebar when returning from login (via ?openSidebar=true)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("openSidebar") === "true") {
        setClaritySidebarOpen(true);
        const url = new URL(window.location.href);
        url.searchParams.delete("openSidebar");
        window.history.replaceState({}, "", url.pathname + url.search + url.hash);
      }
    }
  }, []);

  const examId = searchParams.get("exam") || "";
  const subject = searchParams.get("subject") || "";
  const year = searchParams.get("year") || "";
  const branch = searchParams.get("branch") || "";
  const branchYear = searchParams.get("branchYear") || "";
  const sem = searchParams.get("sem") || "";
  const fileParam = searchParams.get("file") || "";

  const examName = EXAM_NAMES[examId] || examId.toUpperCase();
  const isRtu = examId === "rtu";

  // Build a display title
  const title = isRtu
    ? `RTU${branch ? ` ${branch.toUpperCase()}` : ""}${branchYear ? ` — ${branchYear.replace("-", " ")}` : ""} · ${subject} (${year})`
    : `${examName} — ${subject || "Paper"} (${year})`;

  const R2_CDN_URL = "https://pub-5d418c0acdfa4e9ba673215eb5998a3b.r2.dev/library-papers";

  const loadPaperFile = (folder: string, fileName: string) => {
    setLoading(true);
    setError(false);
    const storagePath = `${folder}/${fileName}`;

    if (isRtu) {
      const proxyUrl = `${API_BASE}/library/clean-pdf?path=${encodeURIComponent(storagePath)}`;
      fetch(proxyUrl, { method: "HEAD" })
        .then((res) => {
          if (res.ok) {
            setPdfUrl(proxyUrl);
          } else {
            setError(true);
          }
        })
        .catch(() => setError(true))
        .finally(() => setLoading(false));
    } else {
      const directUrl = `${R2_CDN_URL}/${storagePath.split('/').map(s => encodeURIComponent(s)).join('/')}`;
      const checkUrl = `${API_BASE}/library/clean-pdf?path=${encodeURIComponent(storagePath)}`;

      fetch(checkUrl, { method: "HEAD" })
        .then((res) => {
          if (res.ok) {
            setPdfUrl(directUrl);
          } else {
            setError(true);
          }
        })
        .catch(() => setError(true))
        .finally(() => setLoading(false));
    }
  };

  const getFolder = () => {
    if (isRtu) {
      if (branchYear === "1st-year") {
        return `rtu-1styear/Sem ${sem || "1"}`;
      } else if (branch && sem) {
        return `rtu-${branch}/Sem ${sem}`;
      }
      return "";
    }
    return `${examId}/${subject || "Paper"}`;
  };

  useEffect(() => {
    if (!examId || !year) {
      setError(true);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(false);
    setAvailableFiles([]);
    setSelectedFileName("");

    const folder = getFolder();
    if (!folder) {
      setError(true);
      setLoading(false);
      return;
    }

    let isMounted = true;

    async function discoverAndLoad() {
      try {
        const res = await fetch(`/api/library/list-papers?folder=${encodeURIComponent(folder)}`);
        let files: { name: string }[] = [];
        if (res.ok) {
          files = await res.json();
        }

        const pdfFiles = (files || []).filter((f) => f.name && f.name.endsWith(".pdf"));

        // Match files for the specified year
        let yearFiles = pdfFiles.filter((f) => {
          if (isRtu) {
            return f.name.includes(year);
          }
          return f.name.startsWith(year) || f.name.includes(`_${year}`) || f.name.includes(`${year}_`);
        });

        if (yearFiles.length === 0) {
          yearFiles = pdfFiles.filter((f) => f.name.includes(year));
        }

        const paperList = yearFiles.map((f) => ({
          fileName: f.name,
          label: formatPaperLabel(f.name),
        }));

        if (isMounted) {
          setAvailableFiles(paperList);
        }

        let targetFileName = fileParam;

        if (targetFileName && pdfFiles.some((f) => f.name === targetFileName)) {
          // Use explicitly requested file
        } else if (paperList.length > 0) {
          targetFileName = paperList[0].fileName;
        } else {
          targetFileName = isRtu ? `${subject} ${year}.pdf` : fileParam || `${year}.pdf`;
        }

        if (isMounted) {
          setSelectedFileName(targetFileName);
          loadPaperFile(folder, targetFileName);
        }
      } catch (err) {
        if (isMounted) {
          setError(true);
          setLoading(false);
        }
      }
    }

    discoverAndLoad();

    return () => {
      isMounted = false;
    };
  }, [examId, subject, year, branch, branchYear, sem, isRtu, fileParam]);

  const handlePaperChange = (newFileName: string) => {
    setSelectedFileName(newFileName);
    const folder = getFolder();
    if (folder) {
      loadPaperFile(folder, newFileName);
    }
  };

  return (
    <main
      style={{
        background: "var(--bg, #0a0a0a)",
        color: "var(--text, #EBEBEB)",
        fontFamily: "'Inter', sans-serif",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { overflow-x: hidden; max-width: 100vw; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      {/* Toolbar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px clamp(12px, 3vw, 24px)",
          background: "rgba(var(--bg-rgb, 10,10,10), 0.92)",
          backdropFilter: "blur(20px)",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          flexShrink: 0,
          gap: "12px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <a
            href="/"
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "9px",
              background: "white",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              textDecoration: "none",
              flexShrink: 0,
            }}
          >
            <span
              style={{
                fontSize: "20px",
                fontWeight: 700,
                color: "#2d3b2d",
                lineHeight: 1,
                fontFamily: "'Newsreader', serif",
              }}
            >
              A
            </span>
          </a>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
              <div style={{ fontSize: "14px", fontWeight: 500, color: "var(--text, #EBEBEB)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "calc(100vw - 320px)" }}>
                {title}
              </div>
              {availableFiles.length > 1 && (
                <select
                  value={selectedFileName}
                  onChange={(e) => handlePaperChange(e.target.value)}
                  style={{
                    background: "rgba(255, 255, 255, 0.08)",
                    border: "1px solid rgba(255, 255, 255, 0.15)",
                    borderRadius: "8px",
                    color: "var(--text, #EBEBEB)",
                    padding: "4px 10px",
                    fontSize: "12px",
                    fontWeight: 600,
                    cursor: "pointer",
                    outline: "none",
                    fontFamily: "'Inter', sans-serif",
                  }}
                >
                  {availableFiles.map((f) => (
                    <option key={f.fileName} value={f.fileName} style={{ background: "#1a1a1a", color: "#ebebeb" }}>
                      {f.label}
                    </option>
                  ))}
                </select>
              )}
            </div>
            <div
              style={{
                fontSize: "9px",
                textTransform: "uppercase",
                letterSpacing: "0.15em",
                color: "rgba(var(--text-rgb, 235,235,235), 0.3)",
                marginTop: "2px",
                fontFamily: "'Space Grotesk', sans-serif",
              }}
            >
              ANALYXX PYQ Library — Fullscreen Viewer
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: "10px", flexShrink: 0 }}>
          {pdfUrl && (
            <button
              onClick={() => setClaritySidebarOpen(true)}
              style={{
                background: "linear-gradient(135deg, #f59e0b, #ef4444)",
                border: "none",
                borderRadius: "10px",
                padding: "8px 20px",
                color: "white",
                fontSize: "13px",
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: "'Inter', sans-serif",
                display: "flex",
                alignItems: "center",
                gap: "7px",
              }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
              </svg>
              Ask Clarity
            </button>
          )}
          <a
            href="/library"
            style={{
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: "10px",
              padding: "8px 20px",
              color: "var(--text, #EBEBEB)",
              fontSize: "12px",
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "'Inter', sans-serif",
              textDecoration: "none",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              transition: "all 200ms",
            }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
            Browse Library
          </a>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                width: "24px",
                height: "24px",
                border: "2px solid rgba(var(--primary-rgb, 120,200,120), 0.3)",
                borderTop: "2px solid var(--primary, #78c878)",
                borderRadius: "50%",
                animation: "spin 0.8s linear infinite",
              }}
            />
            <span
              style={{
                fontSize: "14px",
                color: "rgba(var(--text-rgb, 235,235,235), 0.4)",
                fontWeight: 400,
              }}
            >
              Loading paper...
            </span>
          </div>
        </div>
      ) : error ? (
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            padding: "40px",
          }}
        >
          <div
            style={{
              width: "80px",
              height: "80px",
              borderRadius: "24px",
              background: "rgba(var(--primary-rgb, 120,200,120), 0.08)",
              border: "1px solid rgba(var(--primary-rgb, 120,200,120), 0.2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: "28px",
            }}
          >
            <svg
              width="36"
              height="36"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--primary, #78c878)"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
          </div>
          <h3
            style={{
              fontSize: "28px",
              fontWeight: 300,
              marginBottom: "12px",
              fontFamily: "'Newsreader', serif",
            }}
          >
            Paper{" "}
            <em style={{ color: "var(--primary, #78c878)" }}>Not Available</em>
          </h3>
          <p
            style={{
              fontSize: "15px",
              color: "rgba(var(--text-rgb, 235,235,235), 0.35)",
              lineHeight: 1.7,
              maxWidth: "420px",
              fontWeight: 300,
              marginBottom: "32px",
            }}
          >
            {examId && subject && year
              ? `${examName} — ${subject} (${year}) paper is not available in our library yet.`
              : "Invalid link. Please check the URL or browse the library."}
          </p>
          <a
            href="/library"
            style={{
              background: "var(--primary, #78c878)",
              color: "white",
              borderRadius: "14px",
              padding: "14px 32px",
              fontSize: "14px",
              fontWeight: 600,
              textDecoration: "none",
              fontFamily: "'Inter', sans-serif",
              transition: "all 300ms",
            }}
          >
            Browse Library
          </a>
        </div>
      ) : pdfUrl ? (
        <iframe
          src={pdfUrl}
          style={{
            flex: 1,
            width: "100%",
            border: "none",
            background: "#1a1a1a",
          }}
          title={title}
        />
      ) : null}

      {/* Ask Clarity Sidebar */}
      <AskClaritySidebar
        isOpen={claritySidebarOpen}
        onClose={() => setClaritySidebarOpen(false)}
      />
    </main>
  );
}

export default function LibraryViewPage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#0a0a0a",
            color: "#EBEBEB",
            fontFamily: "'Inter', sans-serif",
          }}
        >
          Loading...
        </div>
      }
    >
      <ViewerContent />
    </Suspense>
  );
}
