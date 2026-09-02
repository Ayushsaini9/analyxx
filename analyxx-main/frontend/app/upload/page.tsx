"use client";
import { useState, useRef, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { API_BASE } from "../lib/config";
import { supabase } from "../lib/supabase";

const CY_API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
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
type CYExam = { exam: string; papers: number; subjects: number };
type CYSubject = { subject: string; years: number; papers: number };

function detectPaperYear(...values: string[]) {
  for (const value of values) {
    const match = value.match(/\b(20[1-2]\d)\b/);
    if (match) return match[1];
  }
  return "Unknown";
}



interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  files?: string[];
  timestamp?: Date;
  modelsUsed?: string[];
  isSynthesized?: boolean;
}

interface RecentPaper {
  id: string;
  exam_name: string;
  status: string;
  created_at: string;
  analysis_result?: { topics_found?: number; predictions?: any[] };
}

function UploadContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [pdfs, setPdfs] = useState<File[]>([]);
  const [images, setImages] = useState<File[]>([]);
  const [examName, setExamName] = useState("");
  const [message, setMessage] = useState("");
  const [uploading, setUploading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [displayedText, setDisplayedText] = useState("");
  const [aiDone, setAiDone] = useState(true);
  const [error, setError] = useState("");
  const [autoLoading, setAutoLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [pageReady, setPageReady] = useState(false);
  const [studyMode, setStudyMode] = useState<"general" | "explain" | "solve" | "quiz" | "summarize" | "predict">("general");

  // UI state
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [attachSheetOpen, setAttachSheetOpen] = useState(false);
  const [userName, setUserName] = useState("");
  const [profilePicture, setProfilePicture] = useState("");
  const [isPro, setIsPro] = useState(false);
  const [isSidebarView, setIsSidebarView] = useState(false);

  // When inside sidebar iframe, tell parent to close sidebar and navigate
  const handleSidebarNavigate = (url: string) => (e: React.MouseEvent) => {
    if (isSidebarView) {
      e.preventDefault();
      window.parent.postMessage({ type: 'CLOSE_SIDEBAR_NAVIGATE', url }, '*');
    }
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsSidebarView(window.location.search.includes("sidebar=true") || window.self !== window.top);
    }

    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === "TOGGLE_RECENTS") {
        setSidebarOpen(prev => !prev);
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);
  
  // Recents
  const [recentPapers, setRecentPapers] = useState<RecentPaper[]>([]);
  const [recentsLoading, setRecentsLoading] = useState(true);

  // Refs
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const autoScrollRef = useRef(true);
  const [userPaused, setUserPaused] = useState(false);

  // Cross-year analysis popup state
  const [cyOpen, setCyOpen] = useState(false);
  const [cyStep, setCyStep] = useState<"exam" | "subject">("exam");
  const [cyExams, setCyExams] = useState<CYExam[]>([]);
  const [cySubjects, setCySubjects] = useState<CYSubject[]>([]);
  const [cySelectedExam, setCySelectedExam] = useState("");
  const [cySearch, setCySearch] = useState("");
  const [cyLoadingSubjects, setCyLoadingSubjects] = useState(false);
  const [cyLoadingExams, setCyLoadingExams] = useState(true);
  const [cyShowAll, setCyShowAll] = useState(false);

  const isInChat = messages.length > 0 || uploading || aiLoading;
  const hasTextMessage = message.trim().length > 0;

  // Fetch user info and recents
  useEffect(() => {
    let sessionDone = false;
    let examsDone = false;
    const checkReady = () => { if (sessionDone && examsDone) setPageReady(true); };

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { setRecentsLoading(false); sessionDone = true; checkReady(); return; }
      const meta = session.user.user_metadata;
      setUserName(meta?.full_name || meta?.name || session.user.email?.split("@")[0] || "");
      const token = session.access_token;

      // Fetch profile name
      fetch(`${API_BASE}/auth/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then(res => res.json())
        .then(data => {
          if (data.name) setUserName(data.name);
          if (data.profile_picture) setProfilePicture(data.profile_picture);
        })
        .catch(() => {});

      // Fetch subscription status
      fetch(`${API_BASE}/payments/subscription`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then(res => res.json())
        .then(data => {
          if (data.plan?.startsWith("pro_") && data.status === "active") {
            setIsPro(true);
          }
        })
        .catch(() => {});

      // Fetch recent papers
      fetch(`${API_BASE}/papers/list`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then(r => r.json())
        .then(data => {
          if (Array.isArray(data)) setRecentPapers(data);
          setRecentsLoading(false);
          sessionDone = true; checkReady();
        })
        .catch(() => { setRecentsLoading(false); sessionDone = true; checkReady(); });
    }).catch(() => { sessionDone = true; checkReady(); });

    // Fetch cross-year exams via same-origin proxy (avoids CORS on mobile)
    const fetchExams = async (retries = 2): Promise<void> => {
      try {
        const r = await fetch('/api/analysis/exams');
        const d = await r.json();
        setCyExams(Array.isArray(d) ? d : []);
        setCyLoadingExams(false);
        examsDone = true; checkReady();
      } catch {
        if (retries > 0) {
          await new Promise(res => setTimeout(res, 1000));
          return fetchExams(retries - 1);
        }
        setCyLoadingExams(false); examsDone = true; checkReady();
      }
    };
    fetchExams();

    // Safety: mark ready after 4s even if fetches hang
    const safetyTimer = setTimeout(() => setPageReady(true), 4000);
    return () => clearTimeout(safetyTimer);
  }, []);

  // Auto-load PDF from library
  useEffect(() => {
    const pdfUrlParam = searchParams.get("pdfUrl");
    const examNameParam = searchParams.get("examName");
    if (pdfUrlParam) {
      setAutoLoading(true);
      if (examNameParam) setExamName(examNameParam);
      fetch(pdfUrlParam)
        .then(res => {
          if (!res.ok) throw new Error("Failed to fetch PDF");
          return res.blob();
        })
        .then(blob => {
          const fileName = decodeURIComponent(pdfUrlParam.split("/").pop() || "paper.pdf");
          const file = new File([blob], fileName, { type: "application/pdf" });
          setPdfs([file]);
          setAutoLoading(false);
        })
        .catch(() => {
          setError("Could not load the paper automatically. Please upload it manually.");
          setAutoLoading(false);
        });
    }
  }, [searchParams]);

  // Auto-open cross-year modal when arriving from /analysis
  useEffect(() => {
    if (searchParams.get("crossYear") === "true") {
      setCyOpen(true);
      setCyStep("exam");
      setCySelectedExam("");
      setCySubjects([]);
      setCySearch("");
    }
  }, [searchParams]);



  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = useCallback(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => {
    if (autoScrollRef.current) {
      scrollToBottom();
    }
  }, [messages, displayedText, scrollToBottom]);

  // Detect user scroll up to pause auto-scroll (desktop + mobile)
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (e.deltaY < 0 && isTyping) {
        autoScrollRef.current = false;
        setUserPaused(true);
      }
    };
    let touchStartY = 0;
    const handleTouchStart = (e: TouchEvent) => {
      touchStartY = e.touches[0]?.clientY ?? 0;
    };
    const handleTouchMove = (e: TouchEvent) => {
      const touchY = e.touches[0]?.clientY ?? 0;
      // Swiping down (finger moves down = scrolling up)
      if (touchY > touchStartY + 10 && isTyping) {
        autoScrollRef.current = false;
        setUserPaused(true);
      }
    };
    window.addEventListener("wheel", handleWheel, { passive: true });
    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchmove", handleTouchMove, { passive: true });
    return () => {
      window.removeEventListener("wheel", handleWheel);
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
    };
  }, [isTyping]);

  // Compress an image to keep it under 4MB (Vercel proxy limit)
  const compressImage = (file: File, maxDim = 2000, quality = 0.8): Promise<File> => {
    return new Promise((resolve) => {
      // If already small enough, skip compression
      if (file.size < 1024 * 1024) {
        resolve(file);
        return;
      }
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          const scale = maxDim / Math.max(width, height);
          width = Math.round(width * scale);
          height = Math.round(height * scale);
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(file); // fallback to original if context unavailable
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const compressed = new File([blob], file.name, { type: "image/jpeg" });
              resolve(compressed);
            } else {
              resolve(file); // fallback to original
            }
          },
          "image/jpeg",
          quality
        );
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(file); // fallback to original
      };
      img.src = url;
    });
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files) return;
    const newPdfs: File[] = [];
    const newImages: File[] = [];
    for (const f of Array.from(files)) {
      if (f.type === "application/pdf") newPdfs.push(f);
      else if (f.type.startsWith("image/")) {
        const compressed = await compressImage(f);
        newImages.push(compressed);
      }
    }
    setPdfs(prev => [...prev, ...newPdfs].slice(0, 3));
    setImages(prev => [...prev, ...newImages].slice(0, 10));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    handleFiles(e.dataTransfer.files);
  };

  const removePdf = (i: number) => setPdfs(prev => prev.filter((_, idx) => idx !== i));
  const removeImage = (i: number) => setImages(prev => prev.filter((_, idx) => idx !== i));

  const typeText = (text: string, onComplete?: () => void) => {
    setDisplayedText("");
    setAiDone(false);
    setIsTyping(true);
    autoScrollRef.current = true;
    setUserPaused(false);
    let i = 0;
    const interval = setInterval(() => {
      if (i < text.length) {
        setDisplayedText(text.slice(0, i + 1));
        i++;
        if (autoScrollRef.current) {
          scrollToBottom();
        }
      } else {
        clearInterval(interval);
        intervalRef.current = null;
        setIsTyping(false);
        setAiDone(true);
        onComplete?.();
      }
    }, 8);
    intervalRef.current = interval;
  };

  const stopTyping = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsTyping(false);
    setAiDone(true);
    // Finalize the message with whatever was displayed
    setMessages(prev => {
      const last = prev[prev.length - 1];
      if (last && last.role === "assistant" && !last.content) {
        return [...prev.slice(0, -1), { ...last, content: displayedText }];
      }
      return prev;
    });
  }, [displayedText]);

  const handleSubmit = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      if (isSidebarView) {
        // Tell parent to handle login full-screen (Google OAuth doesn't work in iframes)
        window.parent.postMessage({ type: 'SIDEBAR_LOGIN' }, '*');
        return;
      }
      router.push("/login"); return;
    }
    const token = session.access_token;
    if (pdfs.length === 0 && images.length === 0 && !message.trim()) { setError("Please upload a file or type a message."); return; }

    // Add user message to chat
    const userMsg: ChatMessage = {
      role: "user",
      content: message || (pdfs.length > 0 ? `Analyze ${pdfs[0].name}` : `Analyze ${images[0].name}`),
      files: [...pdfs.map(f => f.name), ...images.map(f => f.name)],
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMsg]);
    const currentMessage = message;
    setMessage("");
    setError("");
    setDisplayedText("");

    // Add placeholder assistant message
    setMessages(prev => [...prev, { role: "assistant", content: "", timestamp: new Date() }]);

    try {
      if (pdfs.length > 0) {
        setUploading(true);
        const detectedYear = detectPaperYear(examName, currentMessage, pdfs[0].name, searchParams.get("pdfUrl") || "");
        const formData = new FormData();
        formData.append("file", pdfs[0]);
        formData.append("exam_name", examName || currentMessage || "General Exam");
        formData.append("years", detectedYear);
        const uploadRes = await fetch(`${API_BASE}/papers/upload`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });
        const uploadData = await uploadRes.json();
        if (!uploadRes.ok) {
          if (uploadRes.status === 403 && uploadData.detail?.code === "DAILY_LIMIT_REACHED") {
            throw new Error(`${uploadData.detail.message || "Daily free limit reached."} [Upgrade to Pro →](/#pricing)`);
          }
          throw new Error(uploadData.detail?.message || uploadData.detail || "Upload failed");
        }
        setUploading(false);

        setAiLoading(true);
        const aiRes = await fetch(`${API_BASE}/papers/${uploadData.paper_id}/ai-summary`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
        const aiData = await aiRes.json();
        if (!aiRes.ok) throw new Error(aiData.detail || "AI error");
        setAiLoading(false);

        typeText(aiData.summary, () => {
          setMessages(prev => {
            const updated = [...prev];
            updated[updated.length - 1] = { ...updated[updated.length - 1], content: aiData.summary };
            return updated;
          });
        });
      } else if (images.length > 0) {
        setUploading(true);
        const formData = new FormData();
        formData.append("file", images[0]);
        formData.append("exam_name", examName || "General Exam");
        if (currentMessage.trim()) {
          formData.append("message", currentMessage.trim());
        }
        setUploading(false);
        setAiLoading(true);
        const aiRes = await fetch("/api/papers/analyze-image", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });
        const aiData = await aiRes.json();
        if (!aiRes.ok) {
          if (aiRes.status === 403 && aiData.detail?.code === "DAILY_LIMIT_REACHED") {
            throw new Error(`${aiData.detail.message || "Daily free limit reached."} [Upgrade to Pro →](/#pricing)`);
          }
          throw new Error(aiData.detail?.message || aiData.detail || "AI error");
        }
        setAiLoading(false);

        typeText(aiData.summary, () => {
          setMessages(prev => {
            const updated = [...prev];
            updated[updated.length - 1] = { ...updated[updated.length - 1], content: aiData.summary };
            return updated;
          });
        });
      } else if (currentMessage.trim()) {
        // ── Study Chat: text-only AI conversation ──
        setAiLoading(true);
        const chatHistory = messages
          .filter(m => m.content)
          .map(m => ({ role: m.role, content: m.content }));
        const chatRes = await fetch("/api/study/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            message: currentMessage,
            mode: studyMode,
            exam: examName || null,
            subject: null,
            chat_history: chatHistory.length > 0 ? chatHistory : null,
          }),
        });
        const chatData = await chatRes.json();
        if (!chatRes.ok) {
          if (chatRes.status === 403) {
            throw new Error(`${chatData.error || "Daily limit reached."} [Upgrade to Pro →](/#pricing)`);
          }
          throw new Error(chatData.error || chatData.detail || "Study AI error");
        }
        setAiLoading(false);

        typeText(chatData.reply, () => {
          setMessages(prev => {
            const updated = [...prev];
            updated[updated.length - 1] = {
              ...updated[updated.length - 1],
              content: chatData.reply,
              modelsUsed: chatData.models_used || [],
              isSynthesized: chatData.is_synthesized || false,
            };
            return updated;
          });
        });
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "Something went wrong.";
      setError(errMsg);
      // Show the error inline in the chat as a failed assistant message
      setMessages(prev => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last && last.role === "assistant" && !last.content) {
          updated[updated.length - 1] = { ...last, content: `**Error:** ${errMsg}\n\n*Please try again.*` };
        }
        return updated;
      });
      setAiDone(true);
    } finally {
      setUploading(false);
      setAiLoading(false);
      setPdfs([]);
      setImages([]);
    }
  };

  const startNewChat = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setMessages([]);
    setPdfs([]);
    setImages([]);
    setExamName("");
    setMessage("");
    setDisplayedText("");
    setAiDone(true);
    setIsTyping(false);
    setError("");
    // Refresh recents
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return;
      fetch(`${API_BASE}/papers/list`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
        .then(r => r.json())
        .then(data => { if (Array.isArray(data)) setRecentPapers(data); })
        .catch(() => {});
    });
  };

  const loadRecentPaper = async (paper: RecentPaper) => {
    // Reset current chat
    if (intervalRef.current) clearInterval(intervalRef.current);
    setMessages([]);
    setPdfs([]);
    setImages([]);
    setDisplayedText("");
    setAiDone(true);
    setIsTyping(false);
    setError("");
    setExamName(paper.exam_name || "Analysis");
    setSidebarOpen(false);

    // Add user message
    setMessages([{
      role: "user",
      content: `Analyze ${paper.exam_name || "paper"}`,
      timestamp: new Date(paper.created_at),
    }]);

    // Fetch the AI summary
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const token = session.access_token;

    // Add placeholder assistant message
    setMessages(prev => [...prev, { role: "assistant", content: "", timestamp: new Date() }]);
    setAiLoading(true);

    try {
      const res = await fetch(`${API_BASE}/papers/${paper.id}/ai-summary`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "AI error");
      setAiLoading(false);
      typeText(data.summary, () => {
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = { ...updated[updated.length - 1], content: data.summary };
          return updated;
        });
      });
    } catch (err) {
      setAiLoading(false);
      const errMsg = err instanceof Error ? err.message : "Failed to load analysis.";
      setMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = { ...updated[updated.length - 1], content: `**Error:** ${errMsg}` };
        return updated;
      });
      setAiDone(true);
    }
  };

  const hasFiles = pdfs.length > 0 || images.length > 0;
  const canSubmit = pdfs.length > 0 || images.length > 0 || hasTextMessage;

  // ── Cross-Year Analysis popup handlers ──
  const openCrossYear = () => {
    setCyOpen(true);
    setCyStep("exam");
    setCySelectedExam("");
    setCySubjects([]);
    setCySearch("");
  };

  const cySelectExam = async (exam: string) => {
    setCySelectedExam(exam);
    setCyStep("subject");
    setCyLoadingSubjects(true);
    setCySubjects([]);
    setCySearch("");
    setCyShowAll(false);
    try {
      const r = await fetch(`/api/analysis/subjects?exam=${encodeURIComponent(exam)}`);
      const data = await r.json();
      setCySubjects(Array.isArray(data) ? data : []);
    } catch { setCySubjects([]); }
    setCyLoadingSubjects(false);
  };

  const cySelectSubject = async (subject: string) => {
    setCyOpen(false);
    setMessage(""); // Clear any stale typed text
    const meta = EXAM_META[cySelectedExam] || { icon: "", label: cySelectedExam };
    // Add user message
    const userMsg: ChatMessage = {
      role: "user",
      content: `Cross-Year Analysis: **${subject}** — ${meta.label}`,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMsg]);
    setMessages(prev => [...prev, { role: "assistant", content: "", timestamp: new Date() }]);
    setAiLoading(true);
    setError("");
    try {
      const r = await fetch('/api/analysis/run', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ exam: cySelectedExam, subject }),
      });
      if (!r.ok) { const e = await r.json(); throw new Error(e.detail || "Analysis failed"); }
      const data = await r.json();
      setAiLoading(false);
      typeText(data.analysis || "", () => {
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = { ...updated[updated.length - 1], content: data.analysis || "" };
          return updated;
        });
      });
    } catch (err: any) {
      setAiLoading(false);
      const friendlyMsg = (err.message || "").includes("fetch")
        ? "Could not reach the analysis server. Please check your internet connection and try again."
        : err.message || "Analysis failed. Please try again.";
      setMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = { ...updated[updated.length - 1], content: `**Analysis Error**\n\n${friendlyMsg}\n\n*Tip: You can try again by selecting the subject from the Cross-Year Analysis menu.*` };
        return updated;
      });
      setAiDone(true);
    }
  };

  const cyFilteredSubjects = cySubjects.filter(s =>
    !cySearch.trim() || s.subject.toLowerCase().includes(cySearch.toLowerCase())
  );

  // ── Skeleton loading screen for mobile ──
  if (!pageReady) {
    return (
      <main className="skeleton-page" style={{ height: "100vh", background: "var(--bg)", color: "var(--text)", fontFamily: "'Inter', sans-serif", display: "flex", flexDirection: "column", overflow: "hidden", position: "fixed", inset: 0 }}>
        <style>{`
          @keyframes skeletonShimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
          @keyframes skeletonPulse { 0%,100% { opacity: 0.4; } 50% { opacity: 1; } }
          @keyframes skeletonFadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
          .sk-bone {
            background: linear-gradient(90deg, rgba(255,255,255,0.03) 25%, rgba(255,255,255,0.07) 50%, rgba(255,255,255,0.03) 75%);
            background-size: 200% 100%;
            animation: skeletonShimmer 1.5s ease-in-out infinite;
            border-radius: 8px;
          }
          .sk-item { animation: skeletonFadeIn 0.4s ease both; }
          .sk-item:nth-child(1) { animation-delay: 0.05s; }
          .sk-item:nth-child(2) { animation-delay: 0.1s; }
          .sk-item:nth-child(3) { animation-delay: 0.15s; }
          .sk-item:nth-child(4) { animation-delay: 0.2s; }
          .sk-item:nth-child(5) { animation-delay: 0.25s; }
        `}</style>

        {/* Skeleton Top Bar */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="sk-bone" style={{ width: "24px", height: "24px", borderRadius: "6px" }} />
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <div className="sk-bone" style={{ width: "70px", height: "16px" }} />
            <div className="sk-bone" style={{ width: "36px", height: "14px", opacity: 0.5 }} />
          </div>
          <div className="sk-bone" style={{ width: "24px", height: "24px", borderRadius: "6px" }} />
        </div>

        {/* Skeleton Upgrade Banner */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", background: "rgba(255,255,255,0.015)", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
          <div className="sk-bone" style={{ width: "160px", height: "13px" }} />
          <div className="sk-bone" style={{ width: "55px", height: "13px" }} />
        </div>

        {/* Skeleton Hero Area */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-start", paddingTop: "15vh", padding: "15vh 24px 0" }}>
          {/* Icon placeholder */}
          <div className="sk-bone sk-item" style={{ width: "52px", height: "52px", borderRadius: "14px", marginBottom: "20px", opacity: 0.4 }} />
          {/* Title line 1 */}
          <div className="sk-bone sk-item" style={{ width: "70%", maxWidth: "260px", height: "28px", marginBottom: "10px" }} />
          {/* Title line 2 */}
          <div className="sk-bone sk-item" style={{ width: "50%", maxWidth: "180px", height: "28px", marginBottom: "16px" }} />
          {/* Subtitle */}
          <div className="sk-bone sk-item" style={{ width: "80%", maxWidth: "300px", height: "14px", opacity: 0.4 }} />
        </div>

        {/* Skeleton Suggestions */}
        <div style={{ padding: "0 20px", flexShrink: 0 }}>
          <div className="sk-bone sk-item" style={{ width: "120px", height: "14px", marginBottom: "12px", opacity: 0.4 }} />
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="sk-item" style={{ display: "flex", alignItems: "center", gap: "14px", padding: "16px 4px", borderBottom: "1px solid rgba(255,255,255,0.04)", ...(i === 1 ? { borderTop: "1px solid rgba(255,255,255,0.04)" } : {}) }}>
              <div className="sk-bone" style={{ width: "18px", height: "18px", borderRadius: "50%", flexShrink: 0, opacity: 0.4 }} />
              <div className="sk-bone" style={{ width: `${60 + i * 8}%`, height: "15px" }} />
            </div>
          ))}
        </div>

        {/* Skeleton Bottom Input */}
        <div style={{ padding: "12px 16px 20px", flexShrink: 0 }}>
          <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "24px", padding: "10px 12px", display: "flex", alignItems: "center", gap: "8px" }}>
            <div className="sk-bone" style={{ width: "34px", height: "34px", borderRadius: "50%", flexShrink: 0, opacity: 0.3 }} />
            <div className="sk-bone" style={{ flex: 1, height: "20px", opacity: 0.25 }} />
            <div className="sk-bone" style={{ width: "50px", height: "26px", borderRadius: "8px", opacity: 0.3 }} />
            <div className="sk-bone" style={{ width: "34px", height: "34px", borderRadius: "50%", flexShrink: 0, opacity: 0.4 }} />
          </div>
          <div style={{ textAlign: "center", marginTop: "8px" }}>
            <div className="sk-bone" style={{ width: "200px", height: "11px", margin: "0 auto", opacity: 0.15 }} />
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className={isSidebarView ? "sidebar-iframe-layout" : ""} style={{ height: "100vh", background: "var(--bg)", color: "var(--text)", fontFamily: "'Inter', sans-serif", display: "flex", overflow: "hidden", position: "fixed", inset: 0 }}>
      <style>{`
        /* ── Sidebar iframe layout overrides ── */
        .sidebar-iframe-layout .mobile-topbar {
          display: none !important;
        }
        .sidebar-iframe-layout .mobile-hero-area {
          padding-top: 6vh !important;
        }
        .sidebar-iframe-layout .mobile-hero-title {
          font-size: 28px !important;
          line-height: 1.25 !important;
          margin-bottom: 12px !important;
        }
        .sidebar-iframe-layout .empty-state-hero svg {
          width: 64px !important;
          height: 64px !important;
        }
        .sidebar-iframe-layout .mobile-suggestions {
          padding: 0 16px !important;
        }
        .sidebar-iframe-layout .mobile-suggestion-item {
          padding: 12px 4px !important;
          font-size: 13.5px !important;
        }
        .sidebar-iframe-layout .mobile-bottom-input,
        .sidebar-iframe-layout .mobile-chat-input {
          padding: 8px 16px 12px !important;
          border-top: 1px solid rgba(255,255,255,0.04) !important;
        }
        .sidebar-iframe-layout .mobile-input-box {
          border-radius: 16px !important;
          background: rgba(255, 255, 255, 0.04) !important;
          border: 1px solid rgba(255, 255, 255, 0.06) !important;
        }
        .sidebar-iframe-layout .textarea-input {
          font-size: 14px !important;
          padding: 6px 4px 6px 8px !important;
        }
        .sidebar-iframe-layout .chat-messages-container {
          padding: 16px 12px 16px !important;
        }
        .sidebar-iframe-layout .user-bubble {
          font-size: 13.5px !important;
          padding: 10px 14px !important;
          max-width: 90% !important;
        }
        .sidebar-iframe-layout .ai-response {
          font-size: 13.5px !important;
        }
        .sidebar-iframe-layout .assistant-msg {
          gap: 8px !important;
        }
        .sidebar-iframe-layout .assistant-msg .avatar {
          width: 28px !important;
          height: 28px !important;
          font-size: 12px !important;
        }
        .sidebar-iframe-layout .content-area.content-area-empty {
          flex: 1 1 0% !important;
          display: flex !important;
          flex-direction: column !important;
        }
        .sidebar-iframe-layout .empty-state-hero {
          justify-content: center !important;
          padding-top: 0 !important;
          flex: 1 !important;
        }

        .font-serif { font-family: 'Newsreader', serif; }
        .font-grotesk { font-family: 'Space Grotesk', sans-serif; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }

        /* ── Skeleton shimmer ── */
        @keyframes skeletonShimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .skel-bone {
          background: linear-gradient(90deg,
            rgba(255,255,255,0.03) 25%,
            rgba(255,255,255,0.07) 50%,
            rgba(255,255,255,0.03) 75%);
          background-size: 200% 100%;
          animation: skeletonShimmer 1.5s ease-in-out infinite;
          border-radius: 8px;
        }
        .skel-bone-circle {
          background: linear-gradient(90deg,
            rgba(255,255,255,0.04) 25%,
            rgba(255,255,255,0.08) 50%,
            rgba(255,255,255,0.04) 75%);
          background-size: 200% 100%;
          animation: skeletonShimmer 1.5s ease-in-out infinite;
          border-radius: 50%;
        }
        @keyframes skeletonFadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        .skeleton-page {
          animation: skeletonFadeIn 0.3s ease both;
        }
        @keyframes blink { 0%,100% { opacity:1; } 50% { opacity:0; } }
        @keyframes morph {
          0%,100% { border-radius: 40% 60% 60% 40% / 70% 30% 70% 30%; }
          50%      { border-radius: 60% 40% 40% 60% / 30% 70% 30% 70%; }
        }
        @keyframes gradientFlow {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .gradient-text {
          background: linear-gradient(90deg, var(--primary), rgba(var(--primary-rgb),0.5), var(--text), rgba(var(--primary-rgb),0.7), var(--primary));
          background-size: 300% 100%;
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: gradientFlow 4s ease infinite;
        }
        @keyframes float {
          0%,100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
        .fade-up { animation: fadeUp 0.6s cubic-bezier(0.16,1,0.3,1) both; }
        .fade-up-2 { animation: fadeUp 0.6s cubic-bezier(0.16,1,0.3,1) 0.1s both; }
        .fade-up-3 { animation: fadeUp 0.6s cubic-bezier(0.16,1,0.3,1) 0.2s both; }
        .cursor-blink { display:inline-block; width:2px; height:1em; background:var(--primary); margin-left:2px; vertical-align:text-bottom; animation:blink 0.8s infinite; }

        /* ── Sidebar ── */
        .sidebar {
          width: 280px; min-width: 280px;
          background: rgba(var(--bg-rgb),0.6);
          border-right: 1px solid rgba(255,255,255,0.06);
          display: flex; flex-direction: column;
          transition: transform 300ms cubic-bezier(0.16,1,0.3,1);
          overflow: hidden;
        }
        @media (max-width: 768px) {
          .sidebar {
            position: fixed; left: 0; top: 0; bottom: 0; z-index: 70;
            transform: translateX(-100%);
            background: var(--bg);
            height: 100vh;
          }
          .sidebar.open { transform: translateX(0); }
          .sidebar-overlay { display: block !important; }
        }
        .sidebar-header {
          padding: 16px 16px 12px;
          display: flex; align-items: center; justify-content: space-between;
          border-bottom: 1px solid rgba(255,255,255,0.06);
        }
        .new-chat-btn {
          display: flex; align-items: center; gap: 8px;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 10px; padding: 8px 14px;
          font-size: 13px; font-weight: 500;
          color: rgba(var(--text-rgb),0.7);
          cursor: pointer; transition: all 200ms;
          font-family: 'Inter', sans-serif; width: 100%;
        }
        .new-chat-btn:hover {
          background: rgba(var(--primary-rgb),0.08);
          border-color: rgba(var(--primary-rgb),0.25);
          color: var(--primary);
        }
        .recent-item {
          display: block;
          padding: 10px 16px;
          font-size: 13px;
          color: rgba(var(--text-rgb),0.55);
          text-decoration: none;
          transition: all 150ms;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          cursor: pointer;
          border: none; background: none; width: 100%;
          text-align: left;
          font-family: 'Inter', sans-serif;
        }
        .recent-item:hover {
          background: rgba(255,255,255,0.04);
          color: rgba(var(--text-rgb),0.85);
        }
        .sidebar-footer {
          margin-top: auto;
          padding: 12px 16px;
          border-top: 1px solid rgba(255,255,255,0.06);
        }
        .sidebar-profile-btn {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 10px;
          border-radius: 12px;
          text-decoration: none;
          transition: all 250ms cubic-bezier(0.16,1,0.3,1);
          cursor: pointer;
          width: 100%;
        }
        .sidebar-profile-btn:hover {
          background: rgba(255,255,255,0.05);
        }
        .sidebar-profile-avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 13px;
          font-weight: 700;
          color: white;
          font-family: 'Inter', sans-serif;
          overflow: hidden;
          background: linear-gradient(135deg, var(--primary), rgba(var(--primary-rgb),0.6));
          border: 1.5px solid rgba(var(--primary-rgb),0.3);
        }
        .sidebar-profile-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .sidebar-profile-info {
          flex: 1;
          min-width: 0;
        }
        .sidebar-profile-name {
          font-size: 13px;
          font-weight: 500;
          color: var(--text);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          line-height: 1.3;
        }
        .sidebar-profile-label {
          font-size: 10px;
          color: rgba(var(--text-rgb),0.3);
          text-transform: uppercase;
          letter-spacing: 0.08em;
          line-height: 1.3;
        }
        .sidebar-nav-link {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 9px 16px;
          margin: 2px 8px;
          border-radius: 10px;
          font-size: 13px;
          font-weight: 500;
          font-family: 'Inter', sans-serif;
          color: rgba(var(--text-rgb),0.5);
          text-decoration: none;
          transition: all 200ms;
          cursor: pointer;
        }
        .sidebar-nav-link:hover {
          background: rgba(255,255,255,0.04);
          color: rgba(var(--text-rgb),0.85);
        }

        /* ── Glass input box ── */
        .glass-box {
          background: rgba(255,255,255,0.04);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 20px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.08);
        }
        .textarea-input {
          background: transparent; border: none; outline: none;
          color: var(--text); font-size: 15px; font-family: 'Inter', sans-serif;
          resize: none; width: 100%; line-height: 1.6;
          min-height: 44px; max-height: 120px;
        }
        .textarea-input::placeholder { color: rgba(var(--text-rgb),0.2); }

        /* File chips */
        .file-chip {
          display: inline-flex; align-items: center; gap: 6px;
          background: rgba(var(--primary-rgb),0.08);
          border: 1px solid rgba(var(--primary-rgb),0.2);
          border-radius: 8px; padding: 5px 10px;
          font-size: 12px; color: var(--primary);
        }
        .remove-btn {
          background: none; border: none; color: rgba(var(--primary-rgb),0.5);
          cursor: pointer; padding: 0; font-size: 13px; line-height: 1;
          transition: color 150ms;
        }
        .remove-btn:hover { color: #fca5a5; }

        .icon-btn {
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 9px; padding: 7px 13px;
          font-size: 12px; color: rgba(var(--text-rgb),0.45);
          cursor: pointer; transition: all 200ms;
          display: flex; align-items: center; gap: 5px;
        }
        .icon-btn:hover { border-color: rgba(var(--primary-rgb),0.3); color: var(--primary); background: rgba(var(--primary-rgb),0.06); }

        /* ── Attach plus button ── */
        .attach-plus-wrap {
          position: relative;
          display: inline-flex;
        }
        .attach-plus-btn {
          width: 32px; height: 32px;
          border-radius: 50%;
          background: none;
          border: 1px solid rgba(var(--text-rgb),0.12);
          color: rgba(var(--text-rgb),0.4);
          cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: all 250ms cubic-bezier(0.16,1,0.3,1);
          flex-shrink: 0;
        }
        .attach-plus-wrap:hover .attach-plus-btn,
        .attach-plus-btn:focus {
          border-color: rgba(var(--primary-rgb),0.4);
          color: var(--primary);
          background: rgba(var(--primary-rgb),0.08);
          transform: rotate(45deg);
        }
        .attach-popover {
          position: absolute;
          bottom: calc(100% + 8px);
          left: 0;
          background: rgba(var(--bg-rgb),0.92);
          backdrop-filter: blur(24px) saturate(180%);
          -webkit-backdrop-filter: blur(24px) saturate(180%);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 14px;
          padding: 6px;
          min-width: 170px;
          box-shadow: 0 12px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(var(--primary-rgb),0.04);
          opacity: 0;
          visibility: hidden;
          transform: translateY(6px) scale(0.96);
          transition: all 200ms cubic-bezier(0.16,1,0.3,1);
          pointer-events: none;
          z-index: 50;
        }
        /* Invisible bridge to cover the gap between button and popover */
        .attach-popover::before {
          content: '';
          position: absolute;
          bottom: -12px;
          left: 0;
          width: 100%;
          height: 14px;
          background: transparent;
        }
        .attach-plus-wrap:hover .attach-popover,
        .attach-plus-wrap:focus-within .attach-popover {
          opacity: 1;
          visibility: visible;
          transform: translateY(0) scale(1);
          pointer-events: auto;
        }
        .attach-option {
          display: flex; align-items: center; gap: 10px;
          padding: 9px 12px;
          border-radius: 10px;
          background: none; border: none;
          width: 100%;
          font-family: 'Inter', sans-serif;
          font-size: 13px; font-weight: 500;
          color: rgba(var(--text-rgb),0.7);
          cursor: pointer;
          transition: all 150ms;
        }
        .attach-option:hover {
          background: rgba(var(--primary-rgb),0.08);
          color: var(--primary);
        }
        .attach-option svg { flex-shrink: 0; }

        .send-btn {
          width: 38px; height: 38px; border-radius: 10px;
          background: var(--primary); border: none; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          font-size: 17px; font-weight: 700; color: white;
          transition: all 200ms; flex-shrink: 0;
          box-shadow: 0 4px 12px rgba(var(--primary-rgb),0.3);
        }
        .send-btn:hover:not(:disabled) { filter: brightness(1.1); transform: scale(1.05); }
        .send-btn:disabled { background: rgba(var(--primary-rgb),0.25); cursor: not-allowed; box-shadow: none; }

        /* ── Chat messages ── */
        .user-bubble {
          max-width: 75%; margin-left: auto;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 20px 20px 4px 20px;
          padding: 14px 20px;
          font-size: 15px; line-height: 1.6;
          color: var(--text);
          animation: fadeUp 0.3s cubic-bezier(0.16,1,0.3,1) both;
        }
        .user-bubble .file-tags {
          display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 8px;
        }
        .user-bubble .file-tag {
          display: inline-flex; align-items: center; gap: 4px;
          background: rgba(var(--primary-rgb),0.1);
          border-radius: 6px; padding: 3px 8px;
          font-size: 11px; color: var(--primary);
        }

        .assistant-msg {
          max-width: 85%;
          animation: fadeUp 0.3s cubic-bezier(0.16,1,0.3,1) both;
        }
        .assistant-msg .avatar {
          width: 28px; height: 28px; border-radius: 8px;
          background: linear-gradient(135deg, var(--primary), var(--primary));
          display: flex; align-items: center; justify-content: center;
          font-size: 14px; color: white; font-weight: 700;
          font-family: 'Space Grotesk', sans-serif;
          flex-shrink: 0;
          box-shadow: 0 2px 8px rgba(var(--primary-rgb),0.3);
        }
        .ai-response h2 { font-family:'Newsreader',serif; font-size:20px; font-weight:400; color:var(--text); margin:24px 0 10px; letter-spacing:-0.02em; border-bottom:1px solid rgba(255,255,255,0.06); padding-bottom:8px; }
        .ai-response h3 { font-size:14px; font-weight:600; color:var(--primary); margin:14px 0 6px; }
        .ai-response p { margin:8px 0; color:rgba(var(--text-rgb),0.75); line-height:1.8; font-size:14px; }
        .ai-response ul, .ai-response ol { padding-left:18px; margin:6px 0; }
        .ai-response li { margin:5px 0; color:rgba(var(--text-rgb),0.75); line-height:1.7; font-size:14px; }
        .ai-response strong { color:var(--primary); font-weight:600; }
        .ai-response hr { border:none; border-top:1px solid rgba(255,255,255,0.07); margin:20px 0; }
        .ai-response code { background:rgba(var(--primary-rgb),0.1); color:var(--primary); padding:2px 6px; border-radius:4px; font-size:12px; }
        .ai-response blockquote { border-left:3px solid var(--primary); padding:10px 14px; margin:10px 0; color:rgba(var(--text-rgb),0.45); background:rgba(var(--primary-rgb),0.04); border-radius:0 8px 8px 0; }
        .ai-response table { width:100%; border-collapse:collapse; margin:12px 0; font-size:13px; }
        .ai-response th { background:rgba(var(--primary-rgb),0.1); color:var(--primary); padding:8px 12px; text-align:left; }
        .ai-response td { padding:8px 12px; border-bottom:1px solid rgba(255,255,255,0.05); color:rgba(var(--text-rgb),0.7); }

        /* ── Plan pill ── */
        .plan-pill {
          display: inline-flex; align-items: center; gap: 6px;
          background: rgba(255,255,255,0.06);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 9999px;
          padding: 6px 16px;
          font-size: 13px; font-weight: 400;
          color: rgba(var(--text-rgb),0.6);
          font-family: 'Inter', sans-serif;
          transition: all 250ms;
          cursor: default;
        }
        .plan-pill:hover { background: rgba(255,255,255,0.08); border-color: rgba(255,255,255,0.15); }
        .plan-pill .dot { color: rgba(var(--text-rgb),0.25); }
        .plan-pill .upgrade-link {
          color: var(--primary); text-decoration: none;
          font-weight: 500; cursor: pointer; transition: opacity 200ms;
        }
        .plan-pill .upgrade-link:hover { opacity: 0.8; text-decoration: underline; }

        /* ── Model selector ── */
        .model-selector { position: relative; display: flex; align-items: center; }
        .model-trigger {
          display: flex; align-items: center; gap: 6px;
          background: none;
          border: none;
          border-radius: 9px; padding: 7px 12px;
          font-size: 12px; color: rgba(var(--text-rgb),0.5);
          cursor: pointer; transition: all 200ms;
          font-family: 'Inter', sans-serif; white-space: nowrap;
        }
        .model-trigger:hover { color: var(--primary); background: rgba(var(--primary-rgb),0.06); }
        .model-trigger .model-name { font-weight: 500; color: rgba(var(--text-rgb),0.7); }
        .model-trigger .model-detail { color: rgba(var(--text-rgb),0.35); }
        .model-trigger .chevron { transition: transform 200ms; color: rgba(var(--text-rgb),0.3); }
        .model-trigger .chevron.open { transform: rotate(180deg); }
        @keyframes dropdownFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .model-dropdown {
          position: absolute; bottom: calc(100% + 8px); right: 0;
          min-width: 220px;
          background: rgba(30,30,30,0.95);
          backdrop-filter: blur(24px);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 14px; padding: 6px;
          box-shadow: 0 16px 48px rgba(0,0,0,0.5);
          animation: dropdownFadeIn 0.2s cubic-bezier(0.16,1,0.3,1) both;
          z-index: 100;
        }
        .model-option {
          display: flex; align-items: center; justify-content: space-between;
          padding: 10px 14px; border-radius: 10px;
          cursor: pointer; transition: all 150ms;
          border: none; background: none; width: 100%;
          font-family: 'Inter', sans-serif; text-align: left;
        }
        .model-option:hover { background: rgba(255,255,255,0.06); }
        .model-option.active { background: rgba(var(--primary-rgb),0.1); }
        .model-option.locked { opacity: 0.5; cursor: not-allowed; }
        .model-option .opt-left { display: flex; flex-direction: column; gap: 2px; }
        .model-option .opt-name { font-size: 13px; font-weight: 500; color: rgba(var(--text-rgb),0.85); }
        .model-option .opt-detail { font-size: 11px; color: rgba(var(--text-rgb),0.35); }
        .model-option .opt-badge { font-size: 10px; font-weight: 600; padding: 2px 8px; border-radius: 9999px; text-transform: uppercase; letter-spacing: 0.05em; }
        .model-option .opt-badge.free { background: rgba(var(--primary-rgb),0.12); color: var(--primary); }
        .model-option .opt-badge.pro { background: rgba(168,130,255,0.12); color: #a882ff; }
        .model-option .opt-check { color: var(--primary); font-size: 14px; }

        /* ── Quick action chips ── */
        .action-chip {
          display: inline-flex; align-items: center; gap: 8px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 9999px; padding: 9px 18px;
          font-size: 13px; font-weight: 400;
          color: rgba(var(--text-rgb),0.55);
          cursor: pointer; font-family: 'Inter', sans-serif;
          transition: all 250ms cubic-bezier(0.16,1,0.3,1);
          white-space: nowrap;
        }
        .action-chip:hover {
          background: rgba(var(--primary-rgb),0.08);
          border-color: rgba(var(--primary-rgb),0.25);
          color: var(--primary); transform: translateY(-1px);
        }
        .action-chip:active { transform: translateY(0px) scale(0.97); }
        .action-chip svg { opacity: 0.6; transition: opacity 200ms; }
        .action-chip:hover svg { opacity: 1; stroke: var(--primary); }

        /* ── PDF source popover ── */
        .pdf-source-wrapper { position: relative; }
        .pdf-source-dropdown {
          position: absolute; bottom: calc(100% + 8px); left: 0;
          min-width: 210px;
          background: rgba(30,30,30,0.95);
          backdrop-filter: blur(24px);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 14px; padding: 6px;
          box-shadow: 0 16px 48px rgba(0,0,0,0.5);
          animation: fadeUp 0.2s cubic-bezier(0.16,1,0.3,1) both;
          z-index: 100;
        }
        .pdf-source-option {
          display: flex; align-items: center; gap: 10px;
          padding: 10px 14px; border-radius: 10px;
          cursor: pointer; transition: all 150ms;
          border: none; background: none; width: 100%;
          font-family: 'Inter', sans-serif; text-align: left;
          color: rgba(var(--text-rgb),0.7);
        }
        .pdf-source-option:hover { background: rgba(255,255,255,0.06); }
        .pdf-source-option svg { flex-shrink: 0; opacity: 0.7; }
        .pdf-source-option:hover svg { opacity: 1; }
        .pdf-src-text { display: flex; flex-direction: column; gap: 1px; }
        .pdf-src-name { font-size: 13px; font-weight: 500; color: rgba(var(--text-rgb),0.85); }
        .pdf-src-desc { font-size: 11px; color: rgba(var(--text-rgb),0.35); }

        /* ── Stop / scroll bar ── */
        .bottom-bar-float {
          display: flex; align-items: center; justify-content: center; gap: 10px;
          padding: 10px 0;
        }
        .stop-btn {
          display: flex; align-items: center; gap: 8px;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 9999px; padding: 8px 20px;
          font-size: 13px; font-weight: 500; color: var(--text);
          cursor: pointer; font-family: 'Inter', sans-serif;
          transition: all 200ms;
        }
        .stop-btn:hover { background: rgba(255,255,255,0.1); }
        .stop-icon { width: 14px; height: 14px; background: var(--text); border-radius: 3px; flex-shrink: 0; }

        /* ── Cross-Year Modal ── */
        .cy-overlay { position:fixed; inset:0; z-index:200; background:rgba(0,0,0,0.6); backdrop-filter:blur(6px); display:flex; align-items:center; justify-content:center; animation:fadeUp 0.2s both; }
        .cy-modal { width:560px; max-width:92vw; max-height:80vh; background:rgba(20,20,20,0.97); backdrop-filter:blur(24px); border:1px solid rgba(255,255,255,0.08); border-radius:24px; box-shadow:0 24px 80px rgba(0,0,0,0.6); display:flex; flex-direction:column; overflow:hidden; animation:fadeUp 0.3s cubic-bezier(0.16,1,0.3,1) both; }
        .cy-header { padding:20px 24px 16px; display:flex; align-items:center; justify-content:space-between; border-bottom:1px solid rgba(255,255,255,0.06); }
        .cy-header h3 { margin:0; font-family:'Newsreader',serif; font-size:20px; font-weight:500; }
        .cy-close { background:rgba(255,255,255,0.06); border:none; border-radius:50%; width:32px; height:32px; display:grid; place-items:center; cursor:pointer; color:rgba(var(--text-rgb),0.5); font-size:16px; transition:all 200ms; }
        .cy-close:hover { background:rgba(255,255,255,0.12); color:var(--text); }
        .cy-body { padding:16px 24px 24px; overflow-y:auto; flex:1; }
        .cy-exam-grid { display:grid; grid-template-columns:repeat(2,1fr); gap:10px; }
        .cy-exam-btn { display:flex; align-items:center; gap:12px; padding:16px; border-radius:14px; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.06); cursor:pointer; text-align:left; transition:all 250ms; font-family:'Inter',sans-serif; color:var(--text); }
        .cy-exam-btn:hover { background:rgba(255,255,255,0.07); border-color:rgba(255,255,255,0.12); transform:translateY(-2px); box-shadow:0 8px 24px rgba(0,0,0,0.3); }
        .cy-exam-btn .cy-icon { font-size:28px; flex-shrink:0; }
        .cy-exam-btn .cy-label { font-size:15px; font-weight:600; color:#fff; }
        .cy-exam-btn .cy-meta { font-size:12px; color:rgba(var(--text-rgb),0.35); margin-top:2px; }
        .cy-back { background:none; border:none; color:var(--primary); cursor:pointer; font-size:13px; font-weight:600; padding:0; margin-bottom:14px; font-family:'Inter',sans-serif; }
        .cy-back:hover { opacity:0.7; }
        .cy-search { width:100%; padding:12px 16px; border-radius:12px; border:1px solid rgba(255,255,255,0.06); background:rgba(255,255,255,0.03); color:var(--text); font-size:14px; font-family:inherit; outline:none; margin-bottom:12px; box-sizing:border-box; transition:all 200ms; }
        .cy-search:focus { border-color:rgba(var(--primary-rgb),0.3); background:rgba(255,255,255,0.05); }
        .cy-search::placeholder { color:rgba(var(--text-rgb),0.2); }
        .cy-subject-grid { display:grid; grid-template-columns:repeat(2,1fr); gap:8px; }
        .cy-subject-btn { padding:14px 16px; border-radius:12px; background:rgba(255,255,255,0.025); border:1px solid rgba(255,255,255,0.05); cursor:pointer; text-align:left; transition:all 200ms; font-family:'Inter',sans-serif; color:var(--text); }
        .cy-subject-btn:hover { background:rgba(255,255,255,0.06); border-color:rgba(255,255,255,0.1); transform:translateY(-1px); }
        .cy-subject-btn .cy-s-name { font-size:14px; font-weight:600; color:#fff; display:block; }
        .cy-subject-btn .cy-s-meta { font-size:11px; color:rgba(var(--text-rgb),0.3); margin-top:3px; display:block; }
        .cy-skel { height:52px; border-radius:12px; background:linear-gradient(90deg,rgba(255,255,255,0.03) 25%,rgba(255,255,255,0.06) 50%,rgba(255,255,255,0.03) 75%); background-size:200% 100%; animation:cyShimmer 1.5s ease-in-out infinite; }
        @keyframes cyShimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
        @media(max-width:640px) {
          .cy-exam-grid,.cy-subject-grid { grid-template-columns:1fr; }
          .cy-modal { max-height:90vh; border-radius:20px; }

          /* ═══ BOTTOM TOOLBAR MOBILE FIX ═══ */
          /* Bottom row: wrap to 2 lines instead of cramming */
          .input-bottom-row {
            flex-wrap: wrap !important;
            gap: 8px !important;
          }
          .input-bottom-left {
            flex: 1 1 auto !important;
            min-width: 0 !important;
            overflow-x: auto !important;
            -webkit-overflow-scrolling: touch !important;
            scrollbar-width: none !important;
          }
          .input-bottom-left::-webkit-scrollbar { display: none; }

          /* Icon buttons: compact on mobile */
          .icon-btn {
            padding: 7px 10px !important;
            font-size: 11px !important;
            white-space: nowrap !important;
            flex-shrink: 0 !important;
          }

          /* Hide "or drag & drop" on mobile */
          .drag-drop-hint { display: none !important; }

          /* Attach popover: position from bottom on mobile too */
          .attach-popover {
            min-width: 160px;
          }

          /* Model selector: compact */
          .model-trigger {
            padding: 6px 10px !important;
          }
          .model-name { font-size: 12px !important; }
          .model-detail { display: none !important; }

          /* Send button stays same size for touch target */
          .send-btn {
            width: 36px !important; height: 36px !important;
            min-width: 36px !important;
          }
        }

        /* Loading dots */
        @keyframes dotPulse {
          0%,80%,100% { opacity: 0.3; }
          40% { opacity: 1; }
        }
        .loading-dots span {
          display: inline-block; width: 6px; height: 6px;
          background: var(--primary); border-radius: 50%;
          margin: 0 2px;
          animation: dotPulse 1.4s infinite;
        }
        .loading-dots span:nth-child(2) { animation-delay: 0.2s; }
        .loading-dots span:nth-child(3) { animation-delay: 0.4s; }

        /* Hamburger for mobile */
        .hamburger {
          display: none; background: none; border: none;
          color: rgba(var(--text-rgb),0.6); cursor: pointer;
          padding: 8px;
        }

        /* ═══════════════════════════════════════════════════════════
           CLAUDE-INSPIRED MOBILE OVERRIDES (≤768px)
           Clean, minimal, spacious — input pinned to bottom
           ═══════════════════════════════════════════════════════════ */
        @media (max-width: 768px) {
          .hamburger { display: flex; }

          /* ── Top bar: hamburger | model selector | new chat ── */
          .mobile-topbar {
            display: flex !important;
            align-items: center;
            justify-content: space-between;
            padding: 10px 16px;
            border-bottom: 1px solid rgba(255,255,255,0.06);
          }
          .mobile-topbar .mobile-model-center {
            position: absolute;
            left: 50%;
            transform: translateX(-50%);
            display: flex !important;
            align-items: center;
            gap: 6px;
          }
          .mobile-topbar .mobile-model-center .model-name-mobile {
            font-size: 15px;
            font-weight: 600;
            color: var(--text);
            font-family: 'Inter', sans-serif;
          }
          .mobile-topbar .mobile-model-center .model-detail-mobile {
            font-size: 13px;
            font-weight: 400;
            color: rgba(var(--text-rgb),0.4);
            font-family: 'Inter', sans-serif;
          }
          .mobile-topbar .mobile-model-center .chevron-mobile {
            color: rgba(var(--text-rgb),0.3);
            margin-left: 2px;
          }
          .mobile-newchat-btn {
            display: flex !important;
            background: none;
            border: none;
            cursor: pointer;
            color: rgba(var(--text-rgb),0.5);
            padding: 8px;
            transition: color 200ms;
          }
          .mobile-newchat-btn:active { color: var(--primary); }

          /* ── Upgrade banner ── */
          .mobile-upgrade-banner {
            display: flex !important;
            align-items: center;
            justify-content: space-between;
            padding: 10px 16px;
            background: rgba(255,255,255,0.03);
            border-bottom: 1px solid rgba(255,255,255,0.05);
            font-size: 13px;
            font-family: 'Inter', sans-serif;
          }
          .mobile-upgrade-banner .banner-text {
            color: rgba(var(--text-rgb),0.6);
            font-weight: 400;
          }
          .mobile-upgrade-banner .banner-link {
            color: var(--primary);
            text-decoration: none;
            font-weight: 500;
            transition: opacity 200ms;
          }
          .mobile-upgrade-banner .banner-link:active { opacity: 0.7; }

          /* ── Hide desktop elements on mobile ── */
          .desktop-topbar { display: none !important; }
          .desktop-plan-pill { display: none !important; }
          .desktop-quick-actions { display: none !important; }
          .desktop-fine-print { display: none !important; }

          /* ── Hero area: positioned above center like ChatGPT ── */
          .mobile-hero-area {
            display: flex !important;
            flex-direction: column;
            align-items: center;
            justify-content: flex-start;
            flex: 1;
            padding: 0 24px;
            padding-top: 15vh;
            text-align: center;
          }
          .mobile-hero-icon {
            display: none !important;
          }
          .mobile-hero-title {
            font-size: 26px !important;
            font-weight: 400 !important;
            line-height: 1.3 !important;
            letter-spacing: -0.02em;
            margin-bottom: 0 !important;
            color: var(--text);
          }
          .mobile-hero-subtitle {
            display: none !important;
          }

          /* ── Prompt suggestions (ChatGPT-style) ── */
          .mobile-suggestions {
            display: flex !important;
            flex-direction: column;
            padding: 0 20px;
            flex-shrink: 0;
          }
          .mobile-suggestions-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 8px;
          }
          .mobile-suggestions-header span {
            font-size: 14px;
            font-weight: 500;
            color: rgba(var(--text-rgb), 0.5);
          }
          .mobile-suggestion-item {
            display: flex;
            align-items: center;
            gap: 14px;
            padding: 16px 4px;
            border-bottom: 1px solid rgba(var(--text-rgb), 0.06);
            background: none;
            border-left: none;
            border-right: none;
            border-top: none;
            width: 100%;
            text-align: left;
            cursor: pointer;
            font-family: 'Inter', sans-serif;
            font-size: 15px;
            color: rgba(var(--text-rgb), 0.7);
            transition: color 150ms;
          }
          .mobile-suggestion-item:first-of-type {
            border-top: 1px solid rgba(var(--text-rgb), 0.06);
          }
          .mobile-suggestion-item:active {
            color: var(--text);
          }
          .mobile-suggestion-item svg {
            flex-shrink: 0;
            opacity: 0.4;
          }

          /* ── Bottom input: ChatGPT-style single-row pill ── */
          .mobile-bottom-input {
            display: flex !important;
            flex-direction: column;
            padding: 10px 16px calc(20px + env(safe-area-inset-bottom, 20px));
            background: var(--bg);
            position: relative;
            z-index: 10;
            flex-shrink: 0;
          }
          .mobile-bottom-input .mobile-input-box {
            background: rgba(var(--text-rgb), 0.06);
            border: 1px solid rgba(var(--text-rgb), 0.08);
            border-radius: 24px;
            padding: 6px;
            display: flex;
            align-items: center;
            gap: 0;
          }
          .mobile-bottom-input .textarea-input {
            font-size: 16px !important;
            min-height: 24px !important;
            max-height: 100px;
            line-height: 1.5;
            flex: 1;
            padding: 8px 4px 8px 8px !important;
            background: transparent !important;
            border: none !important;
            resize: none;
          }
          .mobile-bottom-input .mobile-toolbar {
            display: flex;
            align-items: center;
            gap: 6px;
            flex-shrink: 0;
          }
          .mobile-plus-btn {
            display: flex !important;
            align-items: center;
            justify-content: center;
            background: none;
            border: 1px solid rgba(var(--text-rgb), 0.15);
            border-radius: 50%;
            width: 34px; height: 34px;
            color: rgba(var(--text-rgb),0.5);
            cursor: pointer;
            transition: all 200ms;
            flex-shrink: 0;
          }
          .mobile-plus-btn:active {
            border-color: rgba(var(--primary-rgb),0.4);
            color: var(--primary);
          }
          .mobile-send-btn {
            width: 34px; height: 34px;
            border-radius: 50%;
            background: var(--primary);
            border: none;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 16px;
            font-weight: 700;
            transition: all 200ms;
            flex-shrink: 0;
            box-shadow: 0 2px 8px rgba(var(--primary-rgb),0.3);
          }
          .mobile-send-btn:disabled {
            background: rgba(var(--text-rgb),0.08);
            box-shadow: none;
            cursor: not-allowed;
            color: rgba(var(--text-rgb),0.2);
          }
          .mobile-send-btn:active:not(:disabled) {
            transform: scale(0.95);
          }
          .mobile-fine-print {
            display: block !important;
            text-align: center;
            font-size: 11px;
            color: rgba(var(--text-rgb), 0.2);
            padding: 8px 16px 0;
            line-height: 1.4;
          }
          .mobile-fine-print a {
            color: rgba(var(--text-rgb), 0.3);
            text-decoration: underline;
          }

          /* ── Content area: scrollable when in chat, auto when not ── */
          .content-area.content-area-chat {
            flex: 1 1 0% !important;
            min-height: 0 !important;
            overflow-y: auto !important;
            -webkit-overflow-scrolling: touch !important;
          }
          /* When NOT in chat, let the empty state hero shrink to fit */
          .content-area.content-area-empty {
            flex: 0 1 auto !important;
            overflow: visible !important;
          }
          .empty-state-hero {
            min-height: auto !important;
            padding-top: 8vh !important;
            padding-bottom: 16px !important;
            justify-content: flex-start !important;
          }

          /* ── Hide desktop input box in hero on mobile ── */
          .desktop-input-hero { display: none !important; }

          /* ── Hide desktop bottom input bar on mobile ── */
          .desktop-chat-input-bar { display: none !important; }

          /* ── Mobile chat input bar (shown during chat) ── */
          .mobile-chat-input {
            display: flex !important;
            flex-direction: column;
            padding: 10px 16px calc(20px + env(safe-area-inset-bottom, 20px));
            background: var(--bg);
            position: relative;
            z-index: 10;
            flex-shrink: 0;
            border-top: 1px solid rgba(255,255,255,0.06);
          }
          .mobile-chat-input .mobile-input-box {
            background: rgba(var(--text-rgb), 0.06);
            border: 1px solid rgba(var(--text-rgb), 0.08);
            border-radius: 24px;
            padding: 6px;
            display: flex;
            align-items: center;
            gap: 0;
          }
          .mobile-chat-input .textarea-input {
            font-size: 16px !important;
            min-height: 24px !important;
            max-height: 100px;
            line-height: 1.5;
            flex: 1;
            padding: 8px 4px 8px 14px !important;
            background: transparent !important;
            border: none !important;
            resize: none;
          }
          .mobile-chat-input .mobile-toolbar {
            display: flex;
            align-items: center;
            gap: 6px;
            flex-shrink: 0;
          }
          .mobile-chat-input .mobile-fine-print {
            display: block !important;
            text-align: center;
            font-size: 11px;
            color: rgba(var(--text-rgb), 0.2);
            padding: 6px 16px 0;
            line-height: 1.4;
          }

          /* ── ChatGPT-style AI Response formatting on mobile ── */

          /* Hide avatar on mobile — ChatGPT doesn't show one */
          .assistant-msg .avatar {
            display: none !important;
          }
          /* Remove the flex gap since avatar is hidden */
          .assistant-msg > div {
            gap: 0 !important;
          }
          /* Hide model info header on mobile */
          .assistant-msg .model-info-header {
            display: none !important;
          }

          .assistant-msg {
            max-width: 100% !important;
          }

          /* Body text — white, readable, like ChatGPT */
          .ai-response p {
            font-size: 16px !important;
            line-height: 1.7 !important;
            color: var(--text) !important;
            margin: 12px 0 !important;
          }
          /* First paragraph: no top margin */
          .ai-response p:first-child {
            margin-top: 0 !important;
          }

          /* h1/h2 — ChatGPT uses modest bold headings, NOT giant serif */
          .ai-response h1,
          .ai-response h2 {
            font-size: 20px !important;
            font-weight: 700 !important;
            font-family: 'Inter', sans-serif !important;
            color: var(--text) !important;
            margin: 24px 0 8px !important;
            letter-spacing: -0.01em !important;
            border-bottom: none !important;
            padding-bottom: 0 !important;
            line-height: 1.3 !important;
          }
          .ai-response h3 {
            font-size: 17px !important;
            font-weight: 700 !important;
            font-family: 'Inter', sans-serif !important;
            color: var(--text) !important;
            margin: 20px 0 6px !important;
            line-height: 1.3 !important;
          }

          /* Lists — clean, white, proper spacing */
          .ai-response ul, .ai-response ol {
            padding-left: 20px !important;
            margin: 8px 0 !important;
          }
          .ai-response li {
            font-size: 16px !important;
            line-height: 1.7 !important;
            color: var(--text) !important;
            margin: 4px 0 !important;
          }
          .ai-response li::marker {
            color: rgba(var(--text-rgb), 0.5);
          }

          /* Bold — white, NOT green */
          .ai-response strong {
            color: var(--text) !important;
            font-weight: 700 !important;
          }

          /* Blockquote — subtle */
          .ai-response blockquote {
            margin: 14px 0 !important;
            padding: 12px 16px !important;
            border-left: 3px solid rgba(var(--text-rgb), 0.15) !important;
            background: rgba(255,255,255, 0.02) !important;
            color: rgba(var(--text-rgb), 0.7) !important;
            border-radius: 0 8px 8px 0 !important;
          }
          .ai-response blockquote p {
            color: rgba(var(--text-rgb), 0.7) !important;
          }

          /* Code — neutral */
          .ai-response code {
            font-size: 14px !important;
            padding: 2px 6px !important;
            background: rgba(255,255,255, 0.08) !important;
            color: rgba(var(--text-rgb), 0.9) !important;
            border-radius: 4px !important;
          }

          /* Horizontal rule */
          .ai-response hr {
            margin: 24px 0 !important;
            border-top-color: rgba(255,255,255, 0.06) !important;
          }

          /* Tables */
          .ai-response table {
            font-size: 14px !important;
          }
          .ai-response th {
            font-size: 12px !important;
            text-transform: uppercase !important;
            letter-spacing: 0.05em !important;
          }
          .ai-response td {
            color: var(--text) !important;
          }

          /* User bubble: slightly wider */
          .user-bubble {
            max-width: 85% !important;
            font-size: 16px !important;
          }

          /* Chat messages container: edge-to-edge on mobile */
          .chat-messages-container {
            max-width: 100% !important;
            padding: 16px 16px 8px !important;
          }

          /* ── Background blobs: subtler on mobile ── */
          .bg-blobs > div:first-child {
            width: 300px !important; height: 300px !important;
            top: -100px !important; left: -100px !important;
            filter: blur(80px) !important;
            opacity: 0.7;
          }
          .bg-blobs > div:nth-child(2) {
            width: 250px !important; height: 250px !important;
            filter: blur(60px) !important;
            opacity: 0.5;
          }

          /* Model dropdown on mobile: centered */
          .model-dropdown {
            left: 50% !important;
            right: auto !important;
            transform: translateX(-50%) !important;
            min-width: 260px !important;
            max-width: calc(100vw - 32px) !important;
          }

          /* ── Mobile file attachment sheet ── */
          .mobile-attach-sheet {
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            background: rgba(20,20,20,0.98);
            backdrop-filter: blur(24px);
            -webkit-backdrop-filter: blur(24px);
            border-top: 1px solid rgba(255,255,255,0.1);
            border-radius: 20px 20px 0 0;
            padding: 20px 16px 32px;
            z-index: 200;
            animation: slideUp 0.3s cubic-bezier(0.16,1,0.3,1) both;
          }
          .mobile-attach-sheet .sheet-handle {
            width: 36px; height: 4px;
            background: rgba(255,255,255,0.15);
            border-radius: 2px;
            margin: 0 auto 16px;
          }
          .mobile-attach-sheet .sheet-option {
            display: flex;
            align-items: center;
            gap: 14px;
            padding: 14px 12px;
            border-radius: 12px;
            background: none;
            border: none;
            width: 100%;
            font-family: 'Inter', sans-serif;
            font-size: 15px;
            color: rgba(var(--text-rgb),0.8);
            cursor: pointer;
            transition: background 150ms;
          }
          .mobile-attach-sheet .sheet-option:active {
            background: rgba(255,255,255,0.06);
          }
          .mobile-attach-sheet .sheet-option svg {
            flex-shrink: 0;
            opacity: 0.7;
          }
          @keyframes slideUp {
            from { transform: translateY(100%); }
            to { transform: translateY(0); }
          }
          .mobile-attach-overlay {
            position: fixed;
            inset: 0;
            background: rgba(0,0,0,0.5);
            z-index: 190;
          }
        }

        /* Hide mobile-only elements on desktop */
        @media (min-width: 769px) {
          .mobile-topbar { display: none !important; }
          .mobile-upgrade-banner { display: none !important; }
          .mobile-bottom-input { display: none !important; }
          .mobile-chat-input { display: none !important; }
          .mobile-newchat-btn { display: none !important; }
          .mobile-plus-btn { display: none !important; }
          .mobile-attach-sheet { display: none !important; }
          .mobile-attach-overlay { display: none !important; }
          .mobile-suggestions { display: none !important; }
          .mobile-fine-print { display: none !important; }
        }
      `}</style>

      {/* ── Sidebar ── */}
      <aside className={`sidebar${sidebarOpen ? " open" : ""}`}>
        <div className="sidebar-header">
          <a href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: "8px" }}>
            <img src="/logo.png" alt="ANALYXX" className="theme-logo" style={{ width: "28px", height: "28px", borderRadius: "7px", objectFit: "cover" }} />
            <span className="font-serif" style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "15px", fontWeight: 300, color: "var(--text)" }}>
              <span>ANALYXX <em style={{ color: "var(--primary)" }}>AI</em></span>
              {isPro && (
                <span className="analyxx-pro-badge">
                  <span>Pro</span>
                </span>
              )}
            </span>
          </a>
          <button onClick={startNewChat} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(var(--text-rgb),0.4)", padding: "4px", transition: "color 200ms" }}
            onMouseEnter={e => e.currentTarget.style.color = "var(--primary)"}
            onMouseLeave={e => e.currentTarget.style.color = "rgba(var(--text-rgb),0.4)"}
            title="New chat"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
          </button>
        </div>

        {/* Recents list */}
        <div style={{ flex: 1, overflowY: "auto", paddingTop: "8px" }}>


          {/* PYQ Library & Billing — positioned right under Cross-Year Analysis */}
          <a href="/library" className="sidebar-nav-link" target={isSidebarView ? "_top" : undefined}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /></svg>
            PYQ Library
          </a>
          <a href="/billing" className="sidebar-nav-link" target={isSidebarView ? "_top" : undefined}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2" /><line x1="1" y1="10" x2="23" y2="10" /></svg>
            Billing
          </a>

          <div className="font-grotesk" style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.15em", color: "rgba(var(--text-rgb),0.25)", padding: "12px 16px 6px" }}>
            Recents
          </div>
          {recentsLoading ? (
            <div style={{ padding: "20px 16px", color: "rgba(var(--text-rgb),0.2)", fontSize: "13px" }}>Loading...</div>
          ) : recentPapers.length === 0 ? (
            <div style={{ padding: "20px 16px", color: "rgba(var(--text-rgb),0.2)", fontSize: "13px" }}>No analyses yet</div>
          ) : (
            recentPapers.map((paper, i) => (
              <button key={i} className="recent-item" onClick={() => loadRecentPaper(paper)}>
                {paper.exam_name || "Untitled analysis"}
              </button>
            ))
          )}
        </div>

        {/* Sidebar footer — Profile button */}
        <div className="sidebar-footer">
          <a href="/profile" className="sidebar-profile-btn" target={isSidebarView ? "_top" : undefined}>
            <div className="sidebar-profile-avatar">
              {profilePicture ? (
                <img src={profilePicture} alt="Profile" />
              ) : (
                (userName || "A").charAt(0).toUpperCase()
              )}
            </div>
            <div className="sidebar-profile-info">
              <div className="sidebar-profile-name">{userName || "Account"}</div>
              <div className="sidebar-profile-label">View profile</div>
            </div>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(var(--text-rgb),0.25)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><polyline points="9 18 15 12 9 6" /></svg>
          </a>
        </div>
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 65, display: "none" }} className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ── Main area ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, position: "relative" }}>

        {/* Background blobs */}
        <div className="bg-blobs" style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 0 }}>
          <div style={{ position: "absolute", top: "-150px", left: "-150px", width: "500px", height: "500px", background: "rgba(var(--primary-rgb),0.06)", filter: "blur(120px)", animation: "morph 12s ease-in-out infinite" }} />
          <div style={{ position: "absolute", bottom: "-150px", right: "-150px", width: "400px", height: "400px", background: "rgba(var(--primary-rgb),0.04)", filter: "blur(100px)", animation: "morph 16s ease-in-out infinite reverse" }} />
          <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(255,255,255,0.012) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.012) 1px, transparent 1px)", backgroundSize: "60px 60px" }} />
        </div>

        {/* ── MOBILE Top Bar (Claude-style: hamburger | new chat) ── */}
        <div className="mobile-topbar" style={{ position: "relative", zIndex: 10, display: "none" }}>
          <button className="hamburger" onClick={() => setSidebarOpen(!sidebarOpen)} style={{ display: "flex" }} aria-label="Open sidebar menu">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="8" x2="20" y2="8" /><line x1="4" y1="16" x2="20" y2="16" /></svg>
          </button>
          <button className="mobile-newchat-btn" onClick={startNewChat} style={{ display: "none" }} title="New chat">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
          </button>
        </div>

        {/* ── MOBILE Upgrade Banner ── */}
        {!isPro && (
          <div className="mobile-upgrade-banner" style={{ display: "none" }}>
            <span className="banner-text">Get more with Analyxx Pro</span>
            <a className="banner-link" href="/#pricing" onClick={handleSidebarNavigate('/#pricing')}>Upgrade</a>
          </div>
        )}

        {/* Top bar - DESKTOP (hidden on mobile, hidden on empty state) */}
        <div className="desktop-topbar" style={{ position: "relative", zIndex: 10, padding: "12px 20px", display: isInChat ? "flex" : "none", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <button className="hamburger" onClick={() => setSidebarOpen(!sidebarOpen)}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="18" x2="21" y2="18" /></svg>
            </button>
            {isInChat && (
              <span style={{ fontSize: "14px", fontWeight: 500, color: "rgba(var(--text-rgb),0.5)" }}>
                {examName || "New analysis"}
              </span>
            )}
          </div>
          {isInChat && (
            <button onClick={startNewChat} style={{
              background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "9px", padding: "6px 14px", fontSize: "12px",
              color: "rgba(var(--text-rgb),0.5)", cursor: "pointer", fontFamily: "'Inter', sans-serif",
              transition: "all 200ms",
            }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(var(--primary-rgb),0.3)"; e.currentTarget.style.color = "var(--primary)"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; e.currentTarget.style.color = "rgba(var(--text-rgb),0.5)"; }}
            >
              + New chat
            </button>
          )}
        </div>

        {/* ── Content area ── */}
        <div ref={chatContainerRef} className={`content-area ${isInChat ? "content-area-chat" : "content-area-empty"}`} style={{ flex: 1, overflowY: "auto", position: "relative", zIndex: 1, minHeight: 0 }}>

          {!isInChat ? (
            /* ── Empty state (centered hero) ── */
            <div className="empty-state-hero" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100%", padding: "0 20px" }}>
              <div className="fade-up" style={{ width: "100%", maxWidth: "680px" }}>

                {/* Plan pill - desktop only */}
                <div className="desktop-plan-pill" style={{ textAlign: "center", marginBottom: "24px" }}>
                  <div className="plan-pill">
                    {isPro ? (
                      <span style={{ color: "var(--primary)", fontWeight: 600 }}>Pro Plan Active</span>
                    ) : (
                      <>Free plan <span className="dot">·</span> <a className="upgrade-link" href="/#pricing" onClick={handleSidebarNavigate('/#pricing')}>Upgrade</a></>
                    )}
                  </div>
                </div>

                {/* Hero text */}
                <div style={{ textAlign: "center", marginBottom: "40px" }}>
                  {autoLoading ? (
                    <>
                      <div style={{ width: "44px", height: "44px", border: "3px solid rgba(var(--primary-rgb),0.2)", borderTopColor: "var(--primary)", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 20px" }} />
                      <h1 className="font-serif" style={{ fontSize: "clamp(28px, 3.5vw, 42px)", fontWeight: 300, letterSpacing: "-0.03em", lineHeight: 1.1, marginBottom: "12px" }}>
                        Loading paper from <em style={{ color: "var(--primary)" }}>Library...</em>
                      </h1>
                    </>
                  ) : pdfs.length > 0 && searchParams.get("pdfUrl") ? (
                    <>
                      <div style={{ fontSize: "52px", marginBottom: "16px", display: "flex", justifyContent: "center" }}><svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg></div>
                      <h1 className="font-serif" style={{ fontSize: "clamp(32px, 4vw, 52px)", fontWeight: 300, letterSpacing: "-0.03em", lineHeight: 1.1, marginBottom: "12px" }}>
                        Paper <em style={{ color: "var(--primary)" }}>ready!</em>
                      </h1>
                      <p style={{ fontSize: "15px", color: "rgba(var(--text-rgb),0.35)", fontWeight: 300 }}>
                        Hit the <strong style={{ color: "var(--primary)" }}>↑ send</strong> button below to start AI analysis
                      </p>
                    </>
                  ) : (
                    <>
                      <div style={{ fontSize: "52px", marginBottom: "16px", animation: "float 4s ease-in-out infinite", display: "flex", justifyContent: "center" }}><svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="rgba(var(--text-rgb),0.5)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg></div>
                      <h1 className="font-serif mobile-hero-title" style={{ fontSize: "clamp(32px, 4vw, 52px)", fontWeight: 300, letterSpacing: "-0.03em", lineHeight: 1.1, marginBottom: "12px" }}>
                        What do you want to<br />
                        <em className="gradient-text">study today?</em>
                      </h1>
                      <p className="mobile-hero-subtitle" style={{ fontSize: "15px", color: "rgba(var(--text-rgb),0.35)", fontWeight: 300 }}>
                        Ask doubts · Solve problems · Analyze PYQs · Get exam predictions
                      </p>
                    </>
                  )}
                </div>

                {/* Input box (centered, hero mode) — desktop only */}
                <div className="desktop-input-hero">{renderInputBox()}</div>

                {/* Quick action chips — desktop only */}
                <div className="desktop-quick-actions fade-up-3" style={{ display: "flex", justifyContent: "center", flexWrap: "wrap", gap: "10px", marginTop: "18px" }}>
                  {[
                    { label: "Explain a concept", prompt: "Explain electromagnetic induction for JEE level with formulas and examples", mode: "explain" as const },
                    { label: "Solve a problem", prompt: "Solve step by step: A projectile is fired at 60° with velocity 20 m/s. Find the maximum height and range.", mode: "solve" as const },
                    { label: "Quiz me", prompt: "Generate a practice quiz on Thermodynamics for JEE with 5 MCQs of increasing difficulty", mode: "quiz" as const },
                  ].map(chip => (
                    <button key={chip.label} className="action-chip" onClick={() => { setStudyMode(chip.mode); setMessage(chip.prompt); }}>
                      {chip.label}
                    </button>
                  ))}
                </div>

                <p className="desktop-fine-print" style={{ textAlign: "center", fontSize: "11px", color: "rgba(var(--text-rgb),0.12)", marginTop: "16px" }}>
                  Ask any study doubt · Upload PYQs for analysis · Results in ~10 seconds
                </p>
              </div>
            </div>

          ) : (
            /* ── Chat messages ── */
            <div className="chat-messages-container" style={{ maxWidth: "760px", margin: "0 auto", padding: "24px 20px 20px" }}>
              {messages.map((msg, i) => (
                <div key={i} style={{ marginBottom: "24px" }}>
                  {msg.role === "user" ? (
                    <div className="user-bubble">
                      {msg.files && msg.files.length > 0 && (
                        <div className="file-tags">
                          {msg.files.map((f, fi) => (
                            <span key={fi} className="file-tag">
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
                              {f.length > 25 ? f.slice(0, 25) + "..." : f}
                            </span>
                          ))}
                        </div>
                      )}
                      {msg.content}
                    </div>
                  ) : (
                    <div className="assistant-msg">
                      <div style={{ display: "flex", gap: "12px" }}>
                        <div className="avatar">A</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div className="model-info-header" style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px", flexWrap: "wrap" }}>
                            <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--text)" }}>ANALYXX AI</span>
                            {msg.isSynthesized && msg.modelsUsed && msg.modelsUsed.length > 1 && (
                              <span style={{ fontSize: "9px", padding: "2px 8px", borderRadius: "20px", background: "linear-gradient(135deg, rgba(168,130,255,0.15), rgba(99,102,241,0.15))", border: "1px solid rgba(168,130,255,0.2)", color: "#c4b5fd", fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                                {msg.modelsUsed.length} AI Models
                              </span>
                            )}
                          </div>
                          <div className="ai-response">
                            {/* Show typing animation for the last assistant message if still typing */}
                            {i === messages.length - 1 && !msg.content && (uploading || aiLoading) ? (
                              <div className="loading-dots" style={{ padding: "8px 0" }}>
                                <span /><span /><span />
                              </div>
                            ) : i === messages.length - 1 && !msg.content && !aiDone ? (
                              <>
                                <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{displayedText}</ReactMarkdown>
                                <span className="cursor-blink" />
                              </>
                            ) : i === messages.length - 1 && displayedText && !msg.content ? (
                              <>
                                <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{displayedText}</ReactMarkdown>
                                {!aiDone && <span className="cursor-blink" />}
                              </>
                            ) : (
                              <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{msg.content || displayedText}</ReactMarkdown>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* ── Bottom input (pinned at bottom) — DESKTOP ── */}
        {isInChat && (
          <div className="desktop-chat-input-bar" style={{
            flexShrink: 0, zIndex: 10,
            position: "relative",
            padding: "0 20px 12px",
            background: "var(--bg)",
          }}>
            {/* Fade gradient above input */}
            <div style={{ position: "absolute", top: "-48px", left: 0, right: 0, height: "48px", background: "linear-gradient(transparent, var(--bg))", pointerEvents: "none" }} />
            <div style={{ maxWidth: "760px", margin: "0 auto" }}>
              {renderInputBox()}
              <p style={{ textAlign: "center", fontSize: "11px", color: "rgba(var(--text-rgb),0.12)", marginTop: "6px" }}>
                ANALYXX AI can make mistakes. Please verify important information.
              </p>
            </div>
          </div>
        )}

        {/* ═══ MOBILE Bottom Input during Chat (ChatGPT-style) ═══ */}
        {isInChat && (
          <div className="mobile-chat-input" style={{ display: "none" }}>
            {/* File chips */}
            {hasFiles && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "8px", paddingLeft: "4px" }}>
                {pdfs.map((f, i) => (
                  <div key={i} className="file-chip" style={{ fontSize: "11px", padding: "4px 8px" }}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
                    {f.name.length > 18 ? f.name.slice(0, 18) + "..." : f.name}
                    <button className="remove-btn" onClick={() => removePdf(i)}><svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg></button>
                  </div>
                ))}
                {images.map((f, i) => (
                  <div key={i} className="file-chip" style={{ fontSize: "11px", padding: "4px 8px", background: "rgba(99,102,241,0.08)", borderColor: "rgba(99,102,241,0.2)", color: "#a5b4fc" }}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#a5b4fc" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>
                    {f.name.length > 18 ? f.name.slice(0, 18) + "..." : f.name}
                    <button className="remove-btn" onClick={() => removeImage(i)}><svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg></button>
                  </div>
                ))}
              </div>
            )}
            <div className="mobile-input-box">
              <button className="mobile-plus-btn" onClick={() => setAttachSheetOpen(true)}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
              </button>
              <textarea
                className="textarea-input"
                style={{ minHeight: "24px", maxHeight: "100px" }}
                placeholder="Reply..."
                value={message}
                onChange={e => setMessage(e.target.value)}
                onInput={e => {
                  const el = e.currentTarget;
                  el.style.height = "auto";
                  el.style.height = Math.min(el.scrollHeight, 100) + "px";
                }}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey && canSubmit && !uploading && !aiLoading) { e.preventDefault(); handleSubmit(); } }}
                rows={1}
              />
              <div className="mobile-toolbar">
                {isTyping ? (
                  <button
                    className="mobile-send-btn"
                    onClick={stopTyping}
                    style={{ background: "rgba(var(--text-rgb),0.12)" }}
                  >
                    <span style={{ width: "12px", height: "12px", background: "white", borderRadius: "2px", display: "block" }} />
                  </button>
                ) : (
                  <button
                    className="mobile-send-btn"
                    onClick={handleSubmit}
                    disabled={!canSubmit || uploading || aiLoading}
                  >
                    {uploading || aiLoading ? (
                      <div style={{ width: "14px", height: "14px", border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "white", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                    ) : "↑"}
                  </button>
                )}
              </div>
            </div>
            <div className="mobile-fine-print" style={{ display: "none" }}>
              ANALYXX AI can make mistakes. Please verify important info.
            </div>
          </div>
        )}

        {/* ═══ MOBILE Prompt Suggestions (ChatGPT-style) ═══ */}
        {!isInChat && (
          <div className="mobile-suggestions" style={{ display: "none" }}>
            <div className="mobile-suggestions-header">
              <span>Try asking</span>
            </div>

            {[
              { label: "Explain Newton's Laws for JEE", mode: "explain" as const },
              { label: "Solve: Find derivative of sin²x", mode: "solve" as const },
              { label: "Quiz me on Organic Chemistry", mode: "quiz" as const },
              { label: "Summarize Cell Biology for NEET", mode: "summarize" as const },
            ].map(s => (
              <button key={s.label} className="mobile-suggestion-item" onClick={() => { setStudyMode(s.mode); setMessage(s.label.replace(/^[^\s]+ /, "")); }}>
                {s.label}
              </button>
            ))}
          </div>
        )}

        {/* ═══ MOBILE Bottom Input (ChatGPT-style pill) ═══ */}
        {!isInChat && (
          <div className="mobile-bottom-input" style={{ display: "none" }}>
            {/* File chips on mobile */}
            {hasFiles && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "8px", paddingLeft: "4px" }}>
                {pdfs.map((f, i) => (
                  <div key={i} className="file-chip" style={{ fontSize: "11px", padding: "4px 8px" }}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
                    {f.name.length > 18 ? f.name.slice(0, 18) + "..." : f.name}
                    <button className="remove-btn" onClick={() => removePdf(i)}><svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg></button>
                  </div>
                ))}
                {images.map((f, i) => (
                  <div key={i} className="file-chip" style={{ fontSize: "11px", padding: "4px 8px", background: "rgba(99,102,241,0.08)", borderColor: "rgba(99,102,241,0.2)", color: "#a5b4fc" }}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#a5b4fc" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>
                    {f.name.length > 18 ? f.name.slice(0, 18) + "..." : f.name}
                    <button className="remove-btn" onClick={() => removeImage(i)}><svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg></button>
                  </div>
                ))}
              </div>
            )}
            <div className="mobile-input-box">
              <button className="mobile-plus-btn" onClick={() => setAttachSheetOpen(true)}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
              </button>
              <textarea
                className="textarea-input"
                style={{ minHeight: "24px", maxHeight: "100px" }}
                placeholder="Ask any study doubt..."
                value={message}
                onChange={e => setMessage(e.target.value)}
                onInput={e => {
                  const el = e.currentTarget;
                  el.style.height = "auto";
                  el.style.height = Math.min(el.scrollHeight, 100) + "px";
                }}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey && canSubmit && !uploading && !aiLoading) { e.preventDefault(); handleSubmit(); } }}
                rows={1}
              />
              <div className="mobile-toolbar">
                <button
                  className="mobile-send-btn"
                  onClick={handleSubmit}
                  disabled={!canSubmit || uploading || aiLoading}
                >
                  {uploading || aiLoading ? (
                    <div style={{ width: "14px", height: "14px", border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "white", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                  ) : "↑"}
                </button>
              </div>
            </div>
            <div className="mobile-fine-print" style={{ display: "none" }}>
              ANALYXX AI can make mistakes. Verify important info.
            </div>
          </div>
        )}

        {/* ═══ MOBILE Attachment Bottom Sheet ═══ */}
        {attachSheetOpen && (
          <>
            <div className="mobile-attach-overlay" onClick={() => setAttachSheetOpen(false)} />
            <div className="mobile-attach-sheet">
              <div className="sheet-handle" />
              <button className="sheet-option" onClick={() => { fileInputRef.current?.click(); setAttachSheetOpen(false); }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
                <div>
                  <div style={{ fontWeight: 500 }}>Upload PDF</div>
                  <div style={{ fontSize: "12px", color: "rgba(var(--text-rgb),0.4)", marginTop: "2px" }}>From your device</div>
                </div>
              </button>
              <button className="sheet-option" onClick={() => { imageInputRef.current?.click(); setAttachSheetOpen(false); }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#a5b4fc" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>
                <div>
                  <div style={{ fontWeight: 500 }}>Upload Image</div>
                  <div style={{ fontSize: "12px", color: "rgba(var(--text-rgb),0.4)", marginTop: "2px" }}>Photo of a question paper</div>
                </div>
              </button>
              <button className="sheet-option" onClick={() => { router.push("/library"); setAttachSheetOpen(false); }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /></svg>
                <div>
                  <div style={{ fontWeight: 500, color: "var(--primary)" }}>ANALYXX Library</div>
                  <div style={{ fontSize: "12px", color: "rgba(var(--text-rgb),0.4)", marginTop: "2px" }}>Browse our paper collection</div>
                </div>
              </button>
            </div>
          </>
        )}

      </div>

      {/* ── Cross-Year Analysis Modal ── */}
      {cyOpen && (
        <div className="cy-overlay" onClick={(e) => { if (e.target === e.currentTarget) setCyOpen(false); }}>
          <div className="cy-modal">
            <div className="cy-header">
              <h3>{cyStep === "exam" ? "Select Exam" : (EXAM_META[cySelectedExam]?.label || cySelectedExam)}</h3>
              <button className="cy-close" onClick={() => setCyOpen(false)}>✕</button>
            </div>
            <div className="cy-body">
              {cyStep === "exam" ? (
                cyLoadingExams ? (
                  <div className="cy-exam-grid">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="cy-skel" style={{ height: "72px" }} />
                    ))}
                  </div>
                ) : cyExams.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "32px 0", color: "rgba(var(--text-rgb),0.3)", fontSize: "14px" }}>
                    <p style={{ marginBottom: "8px" }}>No exams available right now</p>
                    <p style={{ fontSize: "12px", opacity: 0.6 }}>Please try again later</p>
                  </div>
                ) : (
                  <div className="cy-exam-grid">
                    {cyExams.map(ex => {
                      const meta = EXAM_META[ex.exam] || { icon: ex.exam.slice(0, 2).toUpperCase(), color: "#888", label: ex.exam };
                      return (
                        <button key={ex.exam} className="cy-exam-btn" onClick={() => cySelectExam(ex.exam)}>
                          <span className="cy-icon">{meta.icon}</span>
                          <div>
                            <div className="cy-label">{meta.label}</div>
                            <div className="cy-meta">{ex.papers} papers · {ex.subjects} subjects</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )
              ) : (
                <>
                  <button className="cy-back" onClick={() => setCyStep("exam")}>← Back to exams</button>
                  <input
                    className="cy-search"
                    type="text"
                    placeholder="Search subjects..."
                    value={cySearch}
                    onChange={e => setCySearch(e.target.value)}
                    autoFocus
                  />
                  {cyLoadingSubjects ? (
                    <div className="cy-subject-grid">
                      {Array.from({ length: 6 }).map((_, i) => <div key={i} className="cy-skel" />)}
                    </div>
                  ) : cyFilteredSubjects.length === 0 && cySubjects.length > 0 ? (
                    <div style={{ textAlign: "center", padding: "24px 0", color: "rgba(var(--text-rgb),0.3)", fontSize: "14px" }}>No subjects match &quot;{cySearch}&quot;</div>
                  ) : cySubjects.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "24px 0", color: "rgba(var(--text-rgb),0.3)", fontSize: "14px" }}>No analysable papers for this exam yet</div>
                  ) : (() => {
                    const INITIAL_SHOW = 30;
                    const visibleSubjects = cySearch.trim() ? cyFilteredSubjects : cyFilteredSubjects.slice(0, cyShowAll ? cyFilteredSubjects.length : INITIAL_SHOW);
                    const hasMore = !cySearch.trim() && !cyShowAll && cyFilteredSubjects.length > INITIAL_SHOW;
                    return (
                      <>
                        <div className="cy-subject-grid">
                          {visibleSubjects.map(s => (
                            <button key={s.subject} className="cy-subject-btn" onClick={() => cySelectSubject(s.subject)}>
                              <span className="cy-s-name">{s.subject}</span>
                              <span className="cy-s-meta">{s.years} years · {s.papers} papers</span>
                            </button>
                          ))}
                        </div>
                        {hasMore && (
                          <button
                            onClick={() => setCyShowAll(true)}
                            style={{
                              display: "block", margin: "12px auto 0", padding: "10px 24px",
                              background: "rgba(var(--primary-rgb),0.08)", border: "1px solid rgba(var(--primary-rgb),0.2)",
                              borderRadius: "12px", color: "var(--primary)", fontSize: "13px", fontWeight: 600,
                              cursor: "pointer", fontFamily: "'Inter', sans-serif",
                            }}
                          >
                            Show all {cyFilteredSubjects.length} subjects
                          </button>
                        )}
                      </>
                    );
                  })()}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );

  /* ── Shared input box component ── */
  function renderInputBox() {
    return (
      <div
        className={`glass-box ${!isInChat ? "fade-up-2" : ""}`}
        style={{ padding: "14px 20px" }}
        onDragOver={e => e.preventDefault()}
        onDrop={handleDrop}
      >
        {/* Error */}
        {error && (
          <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "10px", padding: "10px 14px", marginBottom: "12px", fontSize: "13px", color: "#fca5a5" }}>
            {error}
          </div>
        )}

        {/* File chips */}
        {hasFiles && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "7px", marginBottom: "12px" }}>
            {pdfs.map((f, i) => (
              <div key={i} className="file-chip">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg> {f.name.length > 22 ? f.name.slice(0, 22) + "..." : f.name}
                <button className="remove-btn" onClick={() => removePdf(i)}><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg></button>
              </div>
            ))}
            {images.map((f, i) => (
              <div key={i} className="file-chip" style={{ background: "rgba(99,102,241,0.08)", borderColor: "rgba(99,102,241,0.2)", color: "#a5b4fc" }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#a5b4fc" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg> {f.name.length > 22 ? f.name.slice(0, 22) + "..." : f.name}
                <button className="remove-btn" onClick={() => removeImage(i)}><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg></button>
              </div>
            ))}
          </div>
        )}

        {/* Textarea */}
        <div style={{ position: "relative" }} title={!isInChat && !hasFiles ? "Select your exam or upload a file first" : undefined}>
          <textarea
            ref={textareaRef}
            className="textarea-input"
            style={{ minHeight: "36px", maxHeight: "100px" }}
            placeholder={isInChat ? "Reply..." : (hasFiles ? (examName ? `Analyzing ${examName} — ask anything or just hit send ↑` : "Ask a question about your uploaded file...") : "Ask any study doubt, or upload a PDF to analyze...")}
            value={message}
            onChange={e => setMessage(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey && canSubmit && !uploading && !aiLoading) { e.preventDefault(); handleSubmit(); } }}
            rows={1}
          />
        </div>

        {/* Bottom row */}
        <div className="input-bottom-row" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "10px" }}>
          <div className="input-bottom-left" style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            {/* + Attach button with hover popover */}
            <div className="attach-plus-wrap">
              <button className="attach-plus-btn" aria-label="Attach file">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
              </button>
              <div className="attach-popover">
                <button className="attach-option" onClick={() => fileInputRef.current?.click()}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
                  PDF
                  {pdfs.length > 0 && <span style={{ marginLeft: "auto", fontSize: "11px", color: "var(--primary)", fontWeight: 600 }}>{pdfs.length}</span>}
                </button>
                <button className="attach-option" onClick={() => imageInputRef.current?.click()}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>
                  Image
                  {images.length > 0 && <span style={{ marginLeft: "auto", fontSize: "11px", color: "#a5b4fc", fontWeight: 600 }}>{images.length}</span>}
                </button>
              </div>
            </div>
            <input ref={fileInputRef} type="file" accept=".pdf" multiple style={{ display: "none" }} onChange={e => handleFiles(e.target.files)} />
            <input ref={imageInputRef} type="file" accept="image/*" multiple style={{ display: "none" }} onChange={e => handleFiles(e.target.files)} />
            {!hasFiles && !isInChat && (
              <span className="drag-drop-hint" style={{ fontSize: "11px", color: "rgba(var(--text-rgb),0.2)" }}>or drag & drop</span>
            )}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <button
              className="send-btn"
              onClick={isTyping ? stopTyping : handleSubmit}
              disabled={!isTyping && (!canSubmit || uploading || aiLoading)}
              style={isTyping ? { background: "rgba(255,255,255,0.1)", boxShadow: "none" } : {}}
            >
              {uploading || aiLoading ? (
                <div style={{ width: "16px", height: "16px", border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "white", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
              ) : isTyping ? (
                <span style={{ width: "12px", height: "12px", background: "white", borderRadius: "2px", display: "block" }} />
              ) : "↑"}
            </button>
          </div>
        </div>
      </div>
    );
  }
}

/* ── Suspense skeleton fallback (shown before JS hydrates) ── */
function UploadSkeleton() {
  return (
    <main style={{ height: "100vh", background: "var(--bg)", color: "var(--text)", fontFamily: "'Inter', sans-serif", display: "flex", flexDirection: "column", overflow: "hidden", position: "fixed", inset: 0 }}>
      <style>{`
        @keyframes _skShimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
        @keyframes _skFadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        ._skBone {
          background: linear-gradient(90deg, rgba(255,255,255,0.03) 25%, rgba(255,255,255,0.07) 50%, rgba(255,255,255,0.03) 75%);
          background-size: 200% 100%;
          animation: _skShimmer 1.5s ease-in-out infinite;
          border-radius: 8px;
        }
        ._skItem { animation: _skFadeIn 0.4s ease both; }
        ._skItem:nth-child(2) { animation-delay: 0.08s; }
        ._skItem:nth-child(3) { animation-delay: 0.16s; }
        ._skItem:nth-child(4) { animation-delay: 0.24s; }
      `}</style>
      {/* Top bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="_skBone" style={{ width: 24, height: 24, borderRadius: 6 }} />
        <div style={{ display: "flex", gap: 6 }}>
          <div className="_skBone" style={{ width: 70, height: 16 }} />
          <div className="_skBone" style={{ width: 36, height: 14, opacity: 0.5 }} />
        </div>
        <div className="_skBone" style={{ width: 24, height: 24, borderRadius: 6 }} />
      </div>
      {/* Hero */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", paddingTop: "15vh" }}>
        <div className="_skBone _skItem" style={{ width: 52, height: 52, borderRadius: 14, marginBottom: 20, opacity: 0.4 }} />
        <div className="_skBone _skItem" style={{ width: "65%", maxWidth: 260, height: 28, marginBottom: 10 }} />
        <div className="_skBone _skItem" style={{ width: "45%", maxWidth: 180, height: 28, marginBottom: 16 }} />
        <div className="_skBone _skItem" style={{ width: "75%", maxWidth: 300, height: 14, opacity: 0.4 }} />
      </div>
      {/* Suggestions */}
      <div style={{ padding: "0 20px", flexShrink: 0 }}>
        {[1, 2, 3].map(i => (
          <div key={i} className="_skItem" style={{ display: "flex", alignItems: "center", gap: 14, padding: "16px 4px", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
            <div className="_skBone" style={{ width: 18, height: 18, borderRadius: "50%", flexShrink: 0, opacity: 0.4 }} />
            <div className="_skBone" style={{ width: `${55 + i * 10}%`, height: 15 }} />
          </div>
        ))}
      </div>
      {/* Bottom input */}
      <div style={{ padding: "12px 16px 20px", flexShrink: 0 }}>
        <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 24, padding: "10px 12px", display: "flex", alignItems: "center", gap: 8 }}>
          <div className="_skBone" style={{ width: 34, height: 34, borderRadius: "50%", flexShrink: 0, opacity: 0.3 }} />
          <div className="_skBone" style={{ flex: 1, height: 20, opacity: 0.25 }} />
          <div className="_skBone" style={{ width: 34, height: 34, borderRadius: "50%", flexShrink: 0, opacity: 0.4 }} />
        </div>
      </div>
    </main>
  );
}

export default function UploadPage() {
  return (
    <Suspense fallback={<UploadSkeleton />}>
      <UploadContent />
    </Suspense>
  );
}
