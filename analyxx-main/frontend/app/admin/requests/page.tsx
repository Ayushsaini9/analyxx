"use client";
import { useState, useEffect } from "react";
import { API_BASE } from "../../lib/config";
import { supabase } from "../../lib/supabase";

interface PaperRequest {
  id: string;
  user_email: string | null;
  exam: string;
  year: number;
  subject: string | null;
  status: string;
  created_at: string;
}

export default function AdminRequestsPage() {
  const [requests, setRequests] = useState<PaperRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) {
      setLoading(false);
      return;
    }
    fetch(`${API_BASE}/auth/paper-requests`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Unauthorized");
        return res.json();
      })
      .then((data) => {
        setRequests(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to fetch requests", err);
        setLoading(false);
      });
  })();
  }, []);

  return (
    <main style={{ background: "var(--bg)", color: "var(--text)", fontFamily: "'Inter', sans-serif", minHeight: "100vh", padding: "40px" }}>
      <header style={{ marginBottom: "40px", borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: "20px" }}>
        <h1 style={{ fontSize: "32px", fontWeight: 600 }}>Admin: Paper Requests</h1>
        <p style={{ color: "rgba(235,235,235,0.6)", marginTop: "8px" }}>View all paper requests submitted by users.</p>
      </header>

      {loading ? (
        <div>Loading requests...</div>
      ) : requests.length === 0 ? (
        <div style={{ color: "rgba(235,235,235,0.5)" }}>No requests found.</div>
      ) : (
        <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "16px", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "rgba(255,255,255,0.05)", textAlign: "left" }}>
                <th style={{ padding: "16px 24px", fontWeight: 500, color: "rgba(235,235,235,0.6)", fontSize: "14px", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>Date</th>
                <th style={{ padding: "16px 24px", fontWeight: 500, color: "rgba(235,235,235,0.6)", fontSize: "14px", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>User Email</th>
                <th style={{ padding: "16px 24px", fontWeight: 500, color: "rgba(235,235,235,0.6)", fontSize: "14px", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>Exam</th>
                <th style={{ padding: "16px 24px", fontWeight: 500, color: "rgba(235,235,235,0.6)", fontSize: "14px", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>Subject</th>
                <th style={{ padding: "16px 24px", fontWeight: 500, color: "rgba(235,235,235,0.6)", fontSize: "14px", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>Year</th>
                <th style={{ padding: "16px 24px", fontWeight: 500, color: "rgba(235,235,235,0.6)", fontSize: "14px", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((req) => (
                <tr key={req.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                  <td style={{ padding: "16px 24px", fontSize: "14px" }}>
                    {new Date(req.created_at).toLocaleDateString()}
                  </td>
                  <td style={{ padding: "16px 24px", fontSize: "14px", color: "rgba(235,235,235,0.7)" }}>
                    {req.user_email || "Anonymous"}
                  </td>
                  <td style={{ padding: "16px 24px", fontSize: "14px", fontWeight: 500 }}>
                    {req.exam}
                  </td>
                  <td style={{ padding: "16px 24px", fontSize: "14px" }}>
                    {req.subject || "N/A"}
                  </td>
                  <td style={{ padding: "16px 24px", fontSize: "14px" }}>
                    {req.year}
                  </td>
                  <td style={{ padding: "16px 24px", fontSize: "14px" }}>
                    <span style={{
                      padding: "4px 10px", borderRadius: "99px", fontSize: "12px", fontWeight: 500,
                      background: req.status === "pending" ? "rgba(245,158,11,0.1)" : "rgba(16,185,129,0.1)",
                      color: req.status === "pending" ? "#f59e0b" : "#10b981"
                    }}>
                      {req.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
