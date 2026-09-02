"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { API_BASE } from "../lib/config";
import { supabase } from "../lib/supabase";

const API = API_BASE;

const EXAM_OPTIONS = ["JEE", "NEET", "UPSC", "CAT", "GATE", "10th CBSE Board", "12th CBSE Board", "Other"];
const GENDER_OPTIONS = ["Male", "Female", "Other", "Prefer not to say"];

export default function ProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  // Profile state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [gender, setGender] = useState("");
  const [dob, setDob] = useState("");
  const [examTarget, setExamTarget] = useState("");
  const [institution, setInstitution] = useState("");
  const [schoolName, setSchoolName] = useState("");
  const [profileCompleted, setProfileCompleted] = useState(false);
  const [createdAt, setCreatedAt] = useState("");
  const [profilePicture, setProfilePicture] = useState("");
  const [uploadingPic, setUploadingPic] = useState(false);

  // Delete account state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  const fetchProfile = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.push("/login");
      return;
    }
    try {
      const res = await fetch(`${API}/auth/profile`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) throw new Error("Failed to load profile");
      const data = await res.json();
      setName(data.name || "");
      setEmail(data.email || "");
      setGender(data.gender || "");
      setDob(data.date_of_birth || "");
      setExamTarget(data.exam_target || "");
      setInstitution(data.institution || "");
      setSchoolName(data.school_name || "");
      setProfileCompleted(data.profile_completed || false);
      setCreatedAt(data.created_at || "");
      setProfilePicture(data.profile_picture || "");
    } catch {
      setToast({ msg: "Could not load profile. Please login again.", type: "error" });
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(t);
    }
  }, [toast]);

  async function handleSave() {
    setSaving(true);
    const { data: { session } } = await supabase.auth.getSession();
    try {
      const res = await fetch(`${API}/auth/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          name,
          gender: gender || "",
          date_of_birth: dob || "",
          exam_target: examTarget || "",
          institution: institution || "",
          school_name: schoolName || "",
          college_email: null,
          profile_picture: profilePicture || "",
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Failed to save");
      }
      const data = await res.json();
      setProfileCompleted(data.profile_completed);
      setToast({ msg: "Profile saved successfully!", type: "success" });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Something went wrong";
      setToast({ msg: message, type: "error" });
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteAccount() {
    if (deleteConfirmText !== "DELETE") return;
    setDeleting(true);
    const { data: { session } } = await supabase.auth.getSession();
    try {
      const res = await fetch(`${API}/auth/account`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Failed to delete account");
      }
      // Sign out from Supabase
      await supabase.auth.signOut();
      // Redirect to home
      router.push("/");
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Something went wrong";
      setToast({ msg: message, type: "error" });
      setDeleting(false);
    }
  }

  async function handlePictureUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!file.type.startsWith("image/")) {
      setToast({ msg: "Please select an image file", type: "error" });
      return;
    }
    
    if (file.size > 5 * 1024 * 1024) {
      setToast({ msg: "Image must be less than 5MB", type: "error" });
      return;
    }

    setUploadingPic(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result as string;
        setProfilePicture(base64);
        setUploadingPic(false);
        setToast({ msg: "Profile picture updated! Click Save to apply.", type: "success" });
      };
      reader.onerror = () => {
        setUploadingPic(false);
        setToast({ msg: "Failed to read image", type: "error" });
      };
      reader.readAsDataURL(file);
    } catch {
      setUploadingPic(false);
      setToast({ msg: "Failed to upload image", type: "error" });
    }
  }

  const initials = name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "?";

  if (loading) {
    return (
      <main style={styles.page}>
        <style>{globalCSS}</style>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
          <div style={{ width: 32, height: 32, border: "3px solid rgba(var(--primary-rgb),0.3)", borderTopColor: "var(--primary)", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        </div>
      </main>
    );
  }

  return (
    <main style={styles.page}>
      <style>{globalCSS}</style>

      {/* Toast */}
      {toast && (
        <div className="profile-toast" style={{
          position: "fixed", top: 24, right: 24, left: "auto", zIndex: 200,
          padding: "14px 24px", borderRadius: "14px",
          background: toast.type === "success" ? "rgba(var(--primary-rgb),0.15)" : "rgba(239,68,68,0.15)",
          border: `1px solid ${toast.type === "success" ? "rgba(var(--primary-rgb),0.3)" : "rgba(239,68,68,0.3)"}`,
          backdropFilter: "blur(16px)",
          color: toast.type === "success" ? "var(--primary)" : "#ef4444",
          fontSize: 14, fontWeight: 500,
          animation: "fadeUp 0.4s cubic-bezier(0.16,1,0.3,1)",
          fontFamily: "'Inter', sans-serif",
        }}>{toast.msg}</div>
      )}

      {/* Delete Account Confirmation Modal */}
      {showDeleteModal && (
        <div className="delete-modal-backdrop" style={{
          position: "fixed", inset: 0, zIndex: 300,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)",
          animation: "fadeIn 0.2s ease",
        }}
          onClick={() => { if (!deleting) { setShowDeleteModal(false); setDeleteConfirmText(""); } }}
        >
          <div
            className="delete-modal-content"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-modal-title"
            aria-describedby="delete-modal-desc"
            style={{
              background: "#111111",
              border: "1px solid rgba(239,68,68,0.2)",
              borderRadius: 20, padding: 32,
              maxWidth: 440, width: "90%",
              animation: "modalSlideUp 0.3s cubic-bezier(0.16,1,0.3,1)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Warning Icon */}
            <div style={{
              width: 48, height: 48, borderRadius: "50%",
              background: "rgba(239,68,68,0.1)",
              border: "1px solid rgba(239,68,68,0.2)",
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 20px",
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>

            <h3 id="delete-modal-title" style={{
              fontSize: 20, fontWeight: 600, textAlign: "center",
              fontFamily: "'Inter', sans-serif", color: "#fff",
              marginBottom: 8,
            }}>Delete Your Account</h3>

            <p id="delete-modal-desc" style={{
              fontSize: 13, color: "rgba(255,255,255,0.5)",
              textAlign: "center", lineHeight: 1.6,
              fontFamily: "'Inter', sans-serif", marginBottom: 24,
            }}>
              This action is <strong style={{ color: "#ef4444" }}>permanent and irreversible</strong>. All your data,
              including your profile, analysis history, and preferences will be permanently erased.
            </p>

            <label style={{
              display: "block", fontSize: 12, fontWeight: 500,
              color: "rgba(255,255,255,0.4)", marginBottom: 8,
              fontFamily: "'Inter', sans-serif",
            }}>
              Type <strong style={{ color: "#ef4444" }}>DELETE</strong> to confirm
            </label>
            <input
              type="text"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="Type DELETE here"
              disabled={deleting}
              style={{
                width: "100%", padding: "12px 16px",
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(239,68,68,0.2)",
                borderRadius: 10, color: "#fff", fontSize: 14,
                fontFamily: "'Inter', sans-serif", outline: "none",
                transition: "border-color 200ms",
                marginBottom: 20,
              }}
            />

            <div style={{ display: "flex", gap: 12 }}>
              <button
                onClick={() => { setShowDeleteModal(false); setDeleteConfirmText(""); }}
                disabled={deleting}
                style={{
                  flex: 1, padding: "12px",
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 10, color: "rgba(255,255,255,0.6)",
                  fontSize: 13, fontWeight: 500, cursor: "pointer",
                  fontFamily: "'Inter', sans-serif",
                  transition: "all 200ms",
                }}
              >Cancel</button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleteConfirmText !== "DELETE" || deleting}
                style={{
                  flex: 1, padding: "12px",
                  background: deleteConfirmText === "DELETE"
                    ? "linear-gradient(135deg, #dc2626, #b91c1c)"
                    : "rgba(239,68,68,0.1)",
                  border: "1px solid rgba(239,68,68,0.3)",
                  borderRadius: 10,
                  color: deleteConfirmText === "DELETE" ? "#fff" : "rgba(239,68,68,0.4)",
                  fontSize: 13, fontWeight: 600, cursor: deleteConfirmText === "DELETE" ? "pointer" : "not-allowed",
                  fontFamily: "'Inter', sans-serif",
                  transition: "all 200ms",
                  opacity: deleting ? 0.6 : 1,
                }}
              >{deleting ? "Deleting…" : "Delete Forever"}</button>
            </div>
          </div>
        </div>
      )}

      <div className="page-content" style={{ maxWidth: 720, margin: "0 auto", padding: "100px 24px 60px" }}>

        {/* Back link */}
        <a href="/" style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          color: "rgba(var(--text-rgb),0.4)", textDecoration: "none",
          fontSize: 13, fontWeight: 500, marginBottom: 40,
          transition: "color 300ms",
          fontFamily: "'Inter', sans-serif",
        }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          Back to Home
        </a>

        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", gap: 24, marginBottom: 40,
          animation: "fadeUp 0.6s cubic-bezier(0.16,1,0.3,1)",
        }}>
          <div style={{ position: "relative" }}>
            {profilePicture ? (
              <img 
                src={profilePicture} 
                alt="Profile" 
                onError={() => setProfilePicture("")}
                style={{
                  width: 72, height: 72, borderRadius: "50%",
                  objectFit: "cover",
                  boxShadow: "0 0 40px rgba(var(--primary-rgb),0.2)",
                }}
              />
            ) : (
              <div style={{
                width: 72, height: 72, borderRadius: "50%",
                background: "linear-gradient(135deg, var(--primary), var(--primary))",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 26, fontWeight: 700, color: "white",
                fontFamily: "'Inter', sans-serif",
                boxShadow: "0 0 40px rgba(var(--primary-rgb),0.2)",
              }}>{initials}</div>
            )}
            <label style={{
              position: "absolute", bottom: 0, right: 0,
              width: 28, height: 28, borderRadius: "50%",
              background: "linear-gradient(135deg, var(--primary), var(--primary))",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", border: "2px solid #050505",
              transition: "transform 200ms",
            }}>
              <input 
                type="file" 
                accept="image/*" 
                onChange={handlePictureUpload}
                disabled={uploadingPic}
                style={{ display: "none" }}
              />
              {uploadingPic ? (
                <div style={{ width: 12, height: 12, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "white", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              )}
            </label>
          </div>
          <div>
            <h1 style={{
              fontSize: 28, fontWeight: 300, letterSpacing: "-0.02em",
              fontFamily: "'Newsreader', serif", margin: 0,
              color: "var(--text)",
            }}>
              {name || "Your Profile"}
            </h1>
            <p style={{ fontSize: 13, color: "rgba(var(--text-rgb),0.35)", marginTop: 4, fontFamily: "'Inter', sans-serif" }}>
              {email}
              {createdAt && <span> · Joined {new Date(createdAt).toLocaleDateString("en-US", { month: "short", year: "numeric" })}</span>}
            </p>
            {profileCompleted && (
              <span style={{
                display: "inline-block", marginTop: 8,
                fontSize: 10, fontWeight: 700, textTransform: "uppercase",
                letterSpacing: "0.15em", padding: "3px 12px",
                borderRadius: 9999, background: "rgba(var(--primary-rgb),0.15)",
                color: "var(--primary)", border: "1px solid rgba(var(--primary-rgb),0.25)",
              }}>Profile Complete</span>
            )}
          </div>
        </div>

        {/* Profile Fields Card */}
        <div className="profile-card" style={{
          ...styles.card,
          animation: "fadeUp 0.7s cubic-bezier(0.16,1,0.3,1) 0.1s both",
        }}>
          <h2 style={styles.cardTitle}>Personal Information</h2>

          <div className="profile-field-grid" style={styles.fieldGrid}>
            {/* Name */}
            <div style={styles.fieldGroup}>
              <label style={styles.label}>Full Name</label>
              <input
                type="text" value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your full name"
                style={styles.input}
              />
            </div>

            {/* Gender */}
            <div style={styles.fieldGroup}>
              <label style={styles.label}>Gender</label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                style={styles.input}
              >
                <option value="">Select gender</option>
                {GENDER_OPTIONS.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>

            {/* DOB */}
            <div style={styles.fieldGroup}>
              <label style={styles.label}>Date of Birth</label>
              <input
                type="date" value={dob}
                onChange={(e) => setDob(e.target.value)}
                style={styles.input}
              />
            </div>

            {/* Exam Target */}
            <div style={styles.fieldGroup}>
              <label style={styles.label}>Exam Target</label>
              <select
                value={examTarget}
                onChange={(e) => setExamTarget(e.target.value)}
                style={styles.input}
              >
                <option value="">Select exam</option>
                {EXAM_OPTIONS.map((ex) => (
                  <option key={ex} value={ex}>{ex}</option>
                ))}
              </select>
            </div>

            {/* School Name */}
            <div style={{ ...styles.fieldGroup, gridColumn: "1 / -1" }}>
              <label style={styles.label}>School Name</label>
              <input
                type="text" value={schoolName}
                onChange={(e) => setSchoolName(e.target.value)}
                placeholder="e.g. Delhi Public School"
                style={styles.input}
              />
            </div>

            {/* Institution / College Name */}
            <div style={{ ...styles.fieldGroup, gridColumn: "1 / -1" }}>
              <label style={styles.label}>Institution / College Name</label>
              <input
                type="text" value={institution}
                onChange={(e) => setInstitution(e.target.value)}
                placeholder="e.g. IIT Delhi"
                style={styles.input}
              />
            </div>
          </div>

          {/* Save */}
          <button onClick={handleSave} disabled={saving} style={{
            width: "100%", padding: "14px",
            borderRadius: 12, border: "none", cursor: "pointer",
            background: saving ? "rgba(var(--primary-rgb),0.3)" : "linear-gradient(135deg, var(--primary), var(--primary))",
            color: "white", fontSize: 14, fontWeight: 600,
            fontFamily: "'Inter', sans-serif",
            transition: "all 300ms cubic-bezier(0.16,1,0.3,1)",
            marginTop: 8,
          }}>
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>

        {/* Danger Zone — Delete Account */}
        <div className="danger-zone" style={{
          marginTop: 32,
          background: "rgba(239,68,68,0.03)",
          border: "1px solid rgba(239,68,68,0.12)",
          borderRadius: 20, padding: 28,
          animation: "fadeUp 0.8s cubic-bezier(0.16,1,0.3,1) 0.2s both",
        }}>
          <div className="danger-zone-inner" style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 20, flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <h3 style={{
                fontSize: 15, fontWeight: 600, color: "#ef4444",
                fontFamily: "'Inter', sans-serif", marginBottom: 6,
                display: "flex", alignItems: "center", gap: 8,
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  <line x1="10" y1="11" x2="10" y2="17" />
                  <line x1="14" y1="11" x2="14" y2="17" />
                </svg>
                Delete Your Account
              </h3>
              <p style={{
                fontSize: 12, color: "rgba(255,255,255,0.35)", lineHeight: 1.6,
                fontFamily: "'Inter', sans-serif",
              }}>
                Permanently remove your account and all associated data. This action cannot be undone.
              </p>
            </div>
            <button
              id="delete-account-button"
              onClick={() => setShowDeleteModal(true)}
              style={{
                padding: "10px 24px",
                background: "transparent",
                border: "1px solid rgba(239,68,68,0.4)",
                borderRadius: 10,
                color: "#ef4444",
                fontSize: 13, fontWeight: 600,
                fontFamily: "'Inter', sans-serif",
                cursor: "pointer",
                transition: "all 200ms ease",
                whiteSpace: "nowrap",
                alignSelf: "center",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(239,68,68,0.1)";
                e.currentTarget.style.borderColor = "rgba(239,68,68,0.6)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.borderColor = "rgba(239,68,68,0.4)";
              }}
            >
              Delete Account
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}

/* ─── Styles ─── */
const styles: Record<string, React.CSSProperties> = {
  page: {
    background: "var(--bg)",
    color: "var(--text)",
    fontFamily: "'Inter', sans-serif",
    minHeight: "100vh",
  },
  card: {
    background: "rgba(255,255,255,0.02)",
    backdropFilter: "blur(12px)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 24,
    padding: 36,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 400,
    letterSpacing: "-0.01em",
    fontFamily: "'Newsreader', serif",
    color: "var(--text)",
    marginBottom: 24,
  },
  fieldGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 20,
    marginBottom: 24,
  },
  fieldGroup: {
    display: "flex",
    flexDirection: "column" as const,
    gap: 8,
  },
  label: {
    fontSize: 10,
    fontWeight: 600,
    textTransform: "uppercase" as const,
    letterSpacing: "0.15em",
    color: "rgba(var(--text-rgb),0.35)",
    fontFamily: "'Space Grotesk', sans-serif",
  },
  input: {
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 12,
    padding: "12px 16px",
    color: "var(--text)",
    fontSize: 14,
    fontFamily: "'Inter', sans-serif",
    outline: "none",
    transition: "border-color 300ms, background 300ms",
    width: "100%",
  },
};

const globalCSS = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(24px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes fadeIn {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  @keyframes modalSlideUp {
    from { opacity: 0; transform: translateY(40px) scale(0.95); }
    to   { opacity: 1; transform: translateY(0) scale(1); }
  }
  @keyframes modalSlideUpMobile {
    from { opacity: 0; transform: translateY(100%); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes spin { to { transform: rotate(360deg); } }
  input:focus, select:focus {
    border-color: rgba(var(--primary-rgb),0.4) !important;
    background: rgba(255,255,255,0.06) !important;
  }
  select {
    appearance: none;
    background-image: url("data:image/svg+xml,%3Csvg width='12' height='12' viewBox='0 0 12 12' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M3 4.5L6 7.5L9 4.5' stroke='%23666' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 14px center;
    padding-right: 36px !important;
  }
  select option { background: #1a1a1a; color: #EBEBEB; }
  input[type="date"]::-webkit-calendar-picker-indicator { filter: invert(0.6); cursor: pointer; }

  /* ─── Mobile Responsive ─── */
  @media (max-width: 640px) {
    .page-content {
      padding: 80px 16px 40px !important;
    }
    .profile-field-grid {
      grid-template-columns: 1fr !important;
      gap: 16px !important;
    }
    .profile-card {
      padding: 20px !important;
      border-radius: 18px !important;
    }
    .profile-toast {
      left: 16px !important;
      right: 16px !important;
      top: 16px !important;
      text-align: center;
      font-size: 13px !important;
      padding: 12px 16px !important;
    }
    .delete-modal-backdrop {
      align-items: flex-end !important;
    }
    .delete-modal-content {
      width: 100% !important;
      max-width: 100% !important;
      border-radius: 20px 20px 0 0 !important;
      padding: 24px 20px !important;
      padding-bottom: calc(24px + env(safe-area-inset-bottom)) !important;
      animation: modalSlideUpMobile 0.3s cubic-bezier(0.16,1,0.3,1) !important;
    }
    .danger-zone {
      padding: 20px !important;
      border-radius: 16px !important;
      margin-top: 24px !important;
    }
    .danger-zone-inner {
      flex-direction: column !important;
      align-items: stretch !important;
      gap: 16px !important;
    }
    .danger-zone-inner button {
      width: 100% !important;
      padding: 12px 24px !important;
    }
  }
`;
