"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function DashboardRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/roadmap");
  }, [router]);

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "var(--bg)",
      color: "var(--text)",
      fontFamily: "'Inter', sans-serif",
    }}>
      <div style={{ textAlign: "center" }}>
        <div
          aria-hidden="true"
          style={{
            width: "24px", height: "24px",
            border: "2px solid rgba(var(--primary-rgb),0.3)",
            borderTopColor: "var(--primary)",
            borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
            margin: "0 auto 16px",
          }}
        />
        <p role="status" aria-live="polite" style={{ fontSize: "14px", color: "rgba(var(--text-rgb),0.4)" }}>Redirecting to Upload...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );
}
