"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useTheme, THEME_PRESETS, type CustomThemeSettings } from "./ThemeProvider";
import ThemeCard from "./ThemeCard";

/* ══════════════════════════════════════════════════
   ThemeCustomizer — Floating panel + navbar button
   ══════════════════════════════════════════════════ */

const FONT_OPTIONS = ["Inter", "Roboto", "Space Grotesk", "Outfit", "DM Sans", "Poppins", "Plus Jakarta Sans"];

export default function ThemeCustomizer() {
  const {
    activePresetId, customSettings, mode, isCustom,
    setPreset, setMode, updateCustom, switchToCustom,
    panelOpen, setPanelOpen,
  } = useTheme();

  const [activeTab, setActiveTab] = useState<"preset" | "custom">("preset");
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  /* ── Close on Escape ── */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && panelOpen) setPanelOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [panelOpen, setPanelOpen]);

  /* ── Close on outside click ── */
  useEffect(() => {
    if (!panelOpen) return;
    const handler = (e: MouseEvent) => {
      if (
        panelRef.current && !panelRef.current.contains(e.target as Node) &&
        buttonRef.current && !buttonRef.current.contains(e.target as Node)
      ) {
        setPanelOpen(false);
      }
    };
    // Delay to avoid closing on the same click that opens
    setTimeout(() => document.addEventListener("mousedown", handler), 0);
    return () => document.removeEventListener("mousedown", handler);
  }, [panelOpen, setPanelOpen]);

  const inspiredThemes = THEME_PRESETS.filter((t) => t.group === "inspired");
  const solidThemes = THEME_PRESETS.filter((t) => t.group === "solid");
  const brandThemes = THEME_PRESETS.filter((t) => t.group === "brand");

  return (
    <>
      <style>{`
        @keyframes tcPanelIn {
          from { opacity: 0; transform: translateY(8px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes tcPanelOut {
          from { opacity: 1; transform: translateY(0) scale(1); }
          to   { opacity: 0; transform: translateY(8px) scale(0.96); }
        }
        .tc-panel-scrollbar::-webkit-scrollbar { width: 4px; }
        .tc-panel-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .tc-panel-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.1);
          border-radius: 4px;
        }
        .tc-panel-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255,255,255,0.2);
        }
        .tc-slider {
          -webkit-appearance: none;
          appearance: none;
          height: 4px;
          border-radius: 4px;
          background: rgba(255,255,255,0.1);
          outline: none;
          cursor: pointer;
          width: 100%;
        }
        .tc-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: var(--primary, #10b981);
          cursor: pointer;
          border: 2px solid rgba(255,255,255,0.15);
          transition: transform 150ms;
        }
        .tc-slider::-webkit-slider-thumb:hover {
          transform: scale(1.2);
        }
        .tc-switch {
          position: relative;
          width: 40px;
          height: 22px;
          border-radius: 11px;
          background: rgba(255,255,255,0.1);
          border: 1px solid rgba(255,255,255,0.08);
          cursor: pointer;
          transition: all 200ms;
          flex-shrink: 0;
        }
        .tc-switch.active {
          background: var(--primary, #10b981);
          border-color: transparent;
        }
        .tc-switch::after {
          content: '';
          position: absolute;
          top: 2px;
          left: 2px;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: white;
          transition: transform 200ms cubic-bezier(0.16,1,0.3,1);
        }
        .tc-switch.active::after {
          transform: translateX(18px);
        }
        .tc-color-input {
          width: 32px;
          height: 32px;
          border-radius: 10px;
          border: 2px solid rgba(255,255,255,0.12);
          cursor: pointer;
          padding: 0;
          background: transparent;
          overflow: hidden;
        }
        .tc-color-input::-webkit-color-swatch-wrapper { padding: 0; }
        .tc-color-input::-webkit-color-swatch {
          border: none;
          border-radius: 8px;
        }
        .tc-select {
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 10px;
          padding: 8px 12px;
          color: #F4F4F2;
          font-size: 13px;
          font-family: 'Inter', sans-serif;
          cursor: pointer;
          outline: none;
          width: 100%;
          -webkit-appearance: none;
          appearance: none;
        }
        .tc-select:focus {
          border-color: var(--primary, #10b981);
        }
        .tc-nav-btn:hover {
          background: rgba(var(--text-rgb),0.1) !important;
          border-color: rgba(var(--text-rgb),0.18) !important;
        }
      `}</style>

      {/* ── Navbar Button ── */}
      <button
        ref={buttonRef}
        id="theme-customizer-trigger"
        onClick={() => setPanelOpen(!panelOpen)}
        onMouseEnter={() => setTooltipVisible(true)}
        onMouseLeave={() => setTooltipVisible(false)}
        className="tc-nav-btn"
        style={{
          position: "relative",
          width: "38px",
          height: "38px",
          borderRadius: "12px",
          background: panelOpen ? "rgba(var(--text-rgb),0.12)" : "rgba(var(--text-rgb),0.06)",
          border: `1px solid ${panelOpen ? "rgba(var(--text-rgb),0.2)" : "rgba(var(--text-rgb),0.1)"}`,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "all 300ms cubic-bezier(0.16,1,0.3,1)",
          flexShrink: 0,
          padding: 0,
        }}
      >
        {/* Palette + sparkle icon */}
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.7 }}>
          <circle cx="13.5" cy="6.5" r="0.5" fill="var(--text)" />
          <circle cx="17.5" cy="10.5" r="0.5" fill="var(--text)" />
          <circle cx="8.5" cy="7.5" r="0.5" fill="var(--text)" />
          <circle cx="6.5" cy="12.5" r="0.5" fill="var(--text)" />
          <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z" />
        </svg>

        {/* Tooltip */}
        {tooltipVisible && !panelOpen && (
          <div style={{
            position: "absolute",
            bottom: "-36px",
            left: "50%",
            transform: "translateX(-50%)",
            background: "rgba(0,0,0,0.9)",
            color: "#F4F4F2",
            fontSize: "11px",
            fontWeight: 500,
            padding: "5px 10px",
            borderRadius: "8px",
            whiteSpace: "nowrap",
            pointerEvents: "none",
            fontFamily: "'Inter', sans-serif",
            border: "1px solid rgba(255,255,255,0.1)",
            zIndex: 200,
          }}>
            Customize Style
          </div>
        )}
      </button>

      {/* ── Floating Panel ── */}
      {panelOpen && (
        <div
          ref={panelRef}
          id="theme-customizer-panel"
          className="tc-panel-scrollbar"
          style={{
            position: "fixed",
            top: "68px",
            right: "24px",
            zIndex: 9998,
            width: "480px",
            maxHeight: "calc(100vh - 90px)",
            overflowY: "auto",
            background: "#0B0F0F",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "24px",
            boxShadow: "0 24px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.03)",
            animation: "tcPanelIn 0.3s cubic-bezier(0.16,1,0.3,1) both",
            fontFamily: "'Inter', sans-serif",
          }}
        >
          {/* ── Gradient Header ── */}
          <div style={{
            margin: "12px",
            borderRadius: "20px",
            background: "linear-gradient(135deg, #4338ca 0%, #67D6D6 40%, #DDB1C0 80%, #6d28d9 100%)",
            padding: "24px 24px 20px",
            position: "relative",
            overflow: "hidden",
          }}>
            {/* Decorative shapes */}
            <div style={{
              position: "absolute", top: "-20px", right: "-20px",
              width: "100px", height: "100px", borderRadius: "50%",
              background: "rgba(255,255,255,0.08)",
            }} />
            <div style={{
              position: "absolute", bottom: "-30px", left: "30%",
              width: "80px", height: "80px", borderRadius: "50%",
              background: "rgba(255,255,255,0.05)",
            }} />

            <h2 style={{
              fontSize: "18px", fontWeight: 600,
              color: "white", marginBottom: "6px",
              position: "relative", zIndex: 1,
            }}>
              Customize visual style
            </h2>
            <p style={{
              fontSize: "13px", fontWeight: 400,
              color: "rgba(255,255,255,0.75)",
              lineHeight: 1.5,
              position: "relative", zIndex: 1,
            }}>
              Choose a preset theme or customize the interface to match your brand.
            </p>

            {/* Close button */}
            <button
              onClick={() => setPanelOpen(false)}
              style={{
                position: "absolute", top: "14px", right: "14px",
                width: "28px", height: "28px", borderRadius: "50%",
                background: "rgba(255,255,255,0.2)",
                backdropFilter: "blur(8px)",
                border: "none", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "white", zIndex: 2,
                transition: "all 200ms",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.35)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.2)"; }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {/* ── Tabs ── */}
          <div style={{ padding: "0 16px", marginBottom: "16px" }}>
            <div style={{
              display: "flex",
              background: "rgba(255,255,255,0.04)",
              borderRadius: "14px",
              padding: "3px",
              position: "relative",
              border: "1px solid rgba(255,255,255,0.06)",
            }}>
              {/* Animated sliding indicator */}
              <div style={{
                position: "absolute",
                top: "3px",
                left: activeTab === "preset" ? "3px" : "calc(50% + 0px)",
                width: "calc(50% - 3px)",
                height: "calc(100% - 6px)",
                borderRadius: "11px",
                background: "rgba(255,255,255,0.1)",
                border: "1px solid rgba(255,255,255,0.08)",
                transition: "left 300ms cubic-bezier(0.16,1,0.3,1)",
                boxShadow: "0 1px 4px rgba(0,0,0,0.2)",
              }} />
              {(["preset", "custom"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  style={{
                    flex: 1,
                    padding: "10px 0",
                    background: "transparent",
                    border: "none",
                    borderRadius: "11px",
                    fontSize: "13px",
                    fontWeight: activeTab === tab ? 600 : 500,
                    color: activeTab === tab ? "#F4F4F2" : "rgba(244,244,242,0.4)",
                    cursor: "pointer",
                    position: "relative",
                    zIndex: 1,
                    transition: "color 200ms",
                    fontFamily: "'Inter', sans-serif",
                    textTransform: "capitalize",
                  }}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {/* ── Tab Content ── */}
          <div style={{ padding: "0 16px 20px" }}>
            {activeTab === "preset" ? (
              <PresetTab />
            ) : (
              <CustomTab />
            )}
          </div>
        </div>
      )}
    </>
  );
}

/* ══════════════════════════════════════════════════
   Preset Tab
   ══════════════════════════════════════════════════ */

function PresetTab() {
  const { activePresetId, mode, isCustom, setPreset, setMode } = useTheme();

  const inspiredThemes = THEME_PRESETS.filter((t) => t.group === "inspired");
  const solidThemes = THEME_PRESETS.filter((t) => t.group === "solid");
  const brandThemes = THEME_PRESETS.filter((t) => t.group === "brand");

  return (
    <>
      {/* ── Mode Selector ── */}
      <div style={{ marginBottom: "24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
          <div>
            <div style={{ fontSize: "14px", fontWeight: 600, color: "#F4F4F2", marginBottom: "2px" }}>
              Mode
            </div>
            <div style={{ fontSize: "12px", color: "rgba(244,244,242,0.4)" }}>
              Choose light or dark mode
            </div>
          </div>

          {/* Segmented toggle */}
          <div style={{
            display: "flex",
            background: "rgba(255,255,255,0.04)",
            borderRadius: "12px",
            padding: "3px",
            border: "1px solid rgba(255,255,255,0.06)",
            position: "relative",
          }}>
            {/* Sliding indicator */}
            <div style={{
              position: "absolute",
              top: "3px",
              left: mode === "light" ? "3px" : "calc(50% + 0px)",
              width: "calc(50% - 3px)",
              height: "calc(100% - 6px)",
              borderRadius: "9px",
              background: "rgba(255,255,255,0.1)",
              border: "1px solid rgba(255,255,255,0.08)",
              transition: "left 300ms cubic-bezier(0.16,1,0.3,1)",
            }} />
            {(["light", "dark"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                style={{
                  display: "flex", alignItems: "center", gap: "5px",
                  padding: "6px 14px",
                  background: "transparent",
                  border: "none",
                  borderRadius: "9px",
                  fontSize: "12px",
                  fontWeight: mode === m ? 600 : 400,
                  color: mode === m ? "#F4F4F2" : "rgba(244,244,242,0.4)",
                  cursor: "pointer",
                  position: "relative", zIndex: 1,
                  transition: "color 200ms",
                  fontFamily: "'Inter', sans-serif",
                }}
              >
                {m === "light" ? (
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="5" />
                    <line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
                    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                    <line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
                    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                  </svg>
                ) : (
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                  </svg>
                )}
                {m.charAt(0).toUpperCase() + m.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Inspired Section ── */}
      <SectionLabel label="Inspired" />
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: "10px",
        marginBottom: "20px",
      }}>
        {inspiredThemes.map((t) => (
          <ThemeCard
            key={t.id}
            preset={t}
            selected={!isCustom && activePresetId === t.id}
            onClick={() => setPreset(t.id)}
          />
        ))}
      </div>

      {/* ── Solid Section ── */}
      <SectionLabel label="Solid" />
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: "10px",
        marginBottom: "20px",
      }}>
        {solidThemes.map((t) => (
          <ThemeCard
            key={t.id}
            preset={t}
            selected={!isCustom && activePresetId === t.id}
            onClick={() => setPreset(t.id)}
          />
        ))}
      </div>

      {/* ── Brand Section ── */}
      <SectionLabel label="Your Brand" />
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: "10px",
        marginBottom: "8px",
      }}>
        {brandThemes.map((t) => (
          <ThemeCard
            key={t.id}
            preset={t}
            selected={!isCustom && activePresetId === t.id}
            onClick={() => setPreset(t.id)}
          />
        ))}
      </div>
    </>
  );
}

function SectionLabel({ label }: { label: string }) {
  return (
    <div style={{
      fontSize: "11px",
      fontWeight: 600,
      color: "rgba(244,244,242,0.35)",
      textTransform: "uppercase",
      letterSpacing: "0.12em",
      marginBottom: "10px",
      fontFamily: "'Space Grotesk', 'Inter', sans-serif",
    }}>
      {label}
    </div>
  );
}


/* ══════════════════════════════════════════════════
   Custom Tab
   ══════════════════════════════════════════════════ */

function CustomTab() {
  const { customSettings, updateCustom, switchToCustom, isCustom, mode, setMode } = useTheme();

  const handleChange = (partial: Partial<CustomThemeSettings>) => {
    if (!isCustom) switchToCustom();
    updateCustom(partial);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>

      {/* Accent Color */}
      <ControlRow
        label="Accent Color"
        desc="Primary brand color"
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <input
            type="color"
            value={customSettings.accentColor}
            onChange={(e) => handleChange({ accentColor: e.target.value })}
            className="tc-color-input"
          />
          <span style={{ fontSize: "12px", color: "rgba(244,244,242,0.4)", fontFamily: "monospace" }}>
            {customSettings.accentColor}
          </span>
        </div>
      </ControlRow>

      {/* Secondary Color */}
      <ControlRow
        label="Secondary Color"
        desc="Complementary accent"
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <input
            type="color"
            value={customSettings.secondaryColor}
            onChange={(e) => handleChange({ secondaryColor: e.target.value })}
            className="tc-color-input"
          />
          <span style={{ fontSize: "12px", color: "rgba(244,244,242,0.4)", fontFamily: "monospace" }}>
            {customSettings.secondaryColor}
          </span>
        </div>
      </ControlRow>

      {/* Background Color */}
      <ControlRow
        label="Background Color"
        desc="Main background shade"
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <input
            type="color"
            value={customSettings.bgColor}
            onChange={(e) => handleChange({ bgColor: e.target.value })}
            className="tc-color-input"
          />
          <span style={{ fontSize: "12px", color: "rgba(244,244,242,0.4)", fontFamily: "monospace" }}>
            {customSettings.bgColor}
          </span>
        </div>
      </ControlRow>

      {/* Divider */}
      <div style={{ height: "1px", background: "rgba(255,255,255,0.06)" }} />

      {/* Card Radius */}
      <ControlRow
        label="Card Radius"
        desc={`${customSettings.cardRadius}px`}
      >
        <input
          type="range"
          min="0"
          max="40"
          value={customSettings.cardRadius}
          onChange={(e) => handleChange({ cardRadius: Number(e.target.value) })}
          className="tc-slider"
          style={{ maxWidth: "140px" }}
        />
      </ControlRow>

      {/* Font Family */}
      <ControlRow
        label="Font Family"
        desc="Typography style"
      >
        <select
          value={customSettings.fontFamily}
          onChange={(e) => handleChange({ fontFamily: e.target.value })}
          className="tc-select"
          style={{ maxWidth: "160px" }}
        >
          {FONT_OPTIONS.map((f) => (
            <option key={f} value={f} style={{ background: "#111515", color: "#F4F4F2" }}>
              {f}
            </option>
          ))}
        </select>
      </ControlRow>

      {/* Font Scale */}
      <ControlRow
        label="Font Size Scale"
        desc={`${(customSettings.fontScale * 100).toFixed(0)}%`}
      >
        <input
          type="range"
          min="80"
          max="140"
          value={customSettings.fontScale * 100}
          onChange={(e) => handleChange({ fontScale: Number(e.target.value) / 100 })}
          className="tc-slider"
          style={{ maxWidth: "140px" }}
        />
      </ControlRow>

      {/* UI Density */}
      <ControlRow
        label="UI Density"
        desc="Element spacing"
      >
        <div style={{
          display: "flex",
          background: "rgba(255,255,255,0.04)",
          borderRadius: "10px",
          padding: "2px",
          border: "1px solid rgba(255,255,255,0.06)",
        }}>
          {(["compact", "default", "relaxed"] as const).map((d) => (
            <button
              key={d}
              onClick={() => handleChange({ density: d })}
              style={{
                padding: "5px 10px",
                background: customSettings.density === d ? "rgba(255,255,255,0.1)" : "transparent",
                border: customSettings.density === d ? "1px solid rgba(255,255,255,0.08)" : "1px solid transparent",
                borderRadius: "8px",
                fontSize: "11px",
                fontWeight: customSettings.density === d ? 600 : 400,
                color: customSettings.density === d ? "#F4F4F2" : "rgba(244,244,242,0.35)",
                cursor: "pointer",
                transition: "all 200ms",
                fontFamily: "'Inter', sans-serif",
                textTransform: "capitalize",
              }}
            >
              {d}
            </button>
          ))}
        </div>
      </ControlRow>

      {/* Divider */}
      <div style={{ height: "1px", background: "rgba(255,255,255,0.06)" }} />

      {/* Light/Dark Mode */}
      <ControlRow
        label="Dark Mode"
        desc="Toggle dark/light"
      >
        <div
          className={`tc-switch ${mode === "dark" ? "active" : ""}`}
          onClick={() => {
            const newMode = mode === "dark" ? "light" : "dark";
            if (!isCustom) switchToCustom();
            setMode(newMode);
            handleChange({ mode: newMode });
          }}
        />
      </ControlRow>

      {/* Glassmorphism */}
      <ControlRow
        label="Glassmorphism"
        desc="Frosted glass effects"
      >
        <div
          className={`tc-switch ${customSettings.glassmorphism ? "active" : ""}`}
          onClick={() => handleChange({ glassmorphism: !customSettings.glassmorphism })}
        />
      </ControlRow>

      {/* Shadows */}
      <ControlRow
        label="Shadows"
        desc="Depth and elevation"
      >
        <div
          className={`tc-switch ${customSettings.shadows ? "active" : ""}`}
          onClick={() => handleChange({ shadows: !customSettings.shadows })}
        />
      </ControlRow>
    </div>
  );
}

function ControlRow({ label, desc, children }: { label: string; desc: string; children: React.ReactNode }) {
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: "16px",
    }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: "13px", fontWeight: 500, color: "#F4F4F2", marginBottom: "1px" }}>
          {label}
        </div>
        <div style={{ fontSize: "11px", color: "rgba(244,244,242,0.35)" }}>
          {desc}
        </div>
      </div>
      {children}
    </div>
  );
}
