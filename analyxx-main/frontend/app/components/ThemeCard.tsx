"use client";
import type { ThemePreset } from "./ThemeProvider";

interface ThemeCardProps {
  preset: ThemePreset;
  selected: boolean;
  onClick: () => void;
}

export default function ThemeCard({ preset, selected, onClick }: ThemeCardProps) {
  return (
    <button
      id={`theme-card-${preset.id}`}
      onClick={onClick}
      style={{
        position: "relative",
        width: "100%",
        background: selected ? `${preset.primary}12` : "rgba(255,255,255,0.03)",
        border: `1.5px solid ${selected ? preset.primary + "60" : "rgba(255,255,255,0.08)"}`,
        borderRadius: "18px",
        padding: "0",
        cursor: "pointer",
        transition: "all 300ms cubic-bezier(0.16,1,0.3,1)",
        outline: "none",
        overflow: "hidden",
        fontFamily: "'Inter', sans-serif",
        display: "flex",
        flexDirection: "column" as const,
        alignItems: "stretch",
        boxShadow: selected
          ? `0 0 20px ${preset.primary}20, inset 0 1px 0 ${preset.primary}15`
          : "none",
      }}
      onMouseEnter={(e) => {
        if (!selected) {
          e.currentTarget.style.transform = "translateY(-4px)";
          e.currentTarget.style.borderColor = `${preset.primary}35`;
          e.currentTarget.style.boxShadow = `0 8px 24px rgba(0,0,0,0.3)`;
        }
      }}
      onMouseLeave={(e) => {
        if (!selected) {
          e.currentTarget.style.transform = "translateY(0)";
          e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
          e.currentTarget.style.boxShadow = "none";
        }
      }}
    >
      {/* ── Mini UI Preview ── */}
      <div style={{
        position: "relative",
        height: "80px",
        borderRadius: "16px 16px 0 0",
        overflow: "hidden",
        display: "flex",
        background: preset.previewContent,
      }}>
        {/* Sidebar */}
        <div style={{
          width: "28%",
          background: preset.previewSidebar,
          borderRight: `1px solid rgba(255,255,255,0.06)`,
          padding: "10px 8px",
          display: "flex",
          flexDirection: "column" as const,
          gap: "5px",
        }}>
          {/* Sidebar icon */}
          <div style={{
            width: "16px",
            height: "16px",
            borderRadius: "4px",
            background: preset.previewAccent,
            marginBottom: "4px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "8px",
            fontWeight: 800,
            color: preset.previewSidebar,
          }}>
            Aa
          </div>
          {/* Sidebar lines */}
          {[0.7, 0.5, 0.6].map((w, i) => (
            <div key={i} style={{
              height: "3px",
              width: `${w * 100}%`,
              borderRadius: "2px",
              background: preset.previewAccent,
              opacity: 0.3 + i * 0.1,
            }} />
          ))}
        </div>

        {/* Content area */}
        <div style={{
          flex: 1,
          padding: "10px 10px",
          display: "flex",
          flexDirection: "column" as const,
          justifyContent: "space-between",
        }}>
          {/* Content lines */}
          <div style={{ display: "flex", flexDirection: "column" as const, gap: "4px" }}>
            {[0.8, 0.6, 0.45].map((w, i) => (
              <div key={i} style={{
                height: "3px",
                width: `${w * 100}%`,
                borderRadius: "2px",
                background: `rgba(255,255,255,${0.15 + i * 0.05})`,
              }} />
            ))}
          </div>
          {/* Button */}
          <div style={{
            alignSelf: "flex-end",
            height: "12px",
            width: "40%",
            borderRadius: "6px",
            background: preset.previewAccent,
            opacity: 0.85,
          }} />
        </div>

        {/* Selected check badge */}
        {selected && (
          <div style={{
            position: "absolute",
            top: "6px",
            right: "6px",
            width: "20px",
            height: "20px",
            borderRadius: "50%",
            background: preset.primary,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: `0 2px 8px ${preset.primary}40`,
          }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
        )}
      </div>

      {/* ── Name ── */}
      <div style={{
        padding: "10px 12px",
        fontSize: "12px",
        fontWeight: 500,
        color: selected ? "#F4F4F2" : "rgba(244,244,242,0.6)",
        textAlign: "left",
        letterSpacing: "-0.01em",
      }}>
        {preset.name}
      </div>
    </button>
  );
}
