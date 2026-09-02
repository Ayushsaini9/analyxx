"use client";
import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from "react";
import { supabase } from "../lib/supabase";

/* ══════════════════════════════════════════════════
   Theme Preset Definitions
   ══════════════════════════════════════════════════ */

export interface ThemePreset {
  id: string;
  name: string;
  group: "inspired" | "solid" | "brand";
  mode: "dark" | "light";
  primary: string;
  primaryRgb: string;
  secondary: string;
  secondaryRgb: string;
  bg: string;
  bgRgb: string;
  surface: string;
  surfaceRgb: string;
  text: string;
  textRgb: string;
  /* Mini-preview colors */
  previewSidebar: string;
  previewContent: string;
  previewAccent: string;
  /* CSS filter to tint the logo */
  logoFilter: string;
}

function hexToRgb(hex: string): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `${r}, ${g}, ${b}`;
}

export const THEME_PRESETS: ThemePreset[] = [
  /* ── Inspired ── */
  {
    id: "chatgpt", name: "ChatGPT", group: "inspired", mode: "dark",
    primary: "#10a37f", primaryRgb: hexToRgb("#10a37f"),
    secondary: "#ab68ff", secondaryRgb: hexToRgb("#ab68ff"),
    bg: "#212121", bgRgb: hexToRgb("#212121"),
    surface: "#2f2f2f", surfaceRgb: hexToRgb("#2f2f2f"),
    text: "#ececec", textRgb: hexToRgb("#ececec"),
    previewSidebar: "#171717", previewContent: "#2f2f2f", previewAccent: "#10a37f",
    logoFilter: "hue-rotate(140deg) saturate(1.4) brightness(1.1)",
  },
  {
    id: "claude", name: "Claude", group: "inspired", mode: "dark",
    primary: "#d97757", primaryRgb: hexToRgb("#d97757"),
    secondary: "#6b4fbb", secondaryRgb: hexToRgb("#6b4fbb"),
    bg: "#2b2a27", bgRgb: hexToRgb("#2b2a27"),
    surface: "#3b3a37", surfaceRgb: hexToRgb("#3b3a37"),
    text: "#e8e4de", textRgb: hexToRgb("#e8e4de"),
    previewSidebar: "#1f1e1b", previewContent: "#3b3a37", previewAccent: "#d97757",
    logoFilter: "hue-rotate(330deg) saturate(1.5) brightness(1.2)",
  },
  {
    id: "grok", name: "Grok", group: "inspired", mode: "dark",
    primary: "#f5f5f5", primaryRgb: hexToRgb("#f5f5f5"),
    secondary: "#1d9bf0", secondaryRgb: hexToRgb("#1d9bf0"),
    bg: "#000000", bgRgb: hexToRgb("#000000"),
    surface: "#16181c", surfaceRgb: hexToRgb("#16181c"),
    text: "#e7e9ea", textRgb: hexToRgb("#e7e9ea"),
    previewSidebar: "#000000", previewContent: "#16181c", previewAccent: "#f5f5f5",
    logoFilter: "grayscale(1) brightness(2) contrast(1.2)",
  },
  {
    id: "perplexity", name: "Perplexity", group: "inspired", mode: "dark",
    primary: "#20b8cd", primaryRgb: hexToRgb("#20b8cd"),
    secondary: "#5436da", secondaryRgb: hexToRgb("#5436da"),
    bg: "#191a1a", bgRgb: hexToRgb("#191a1a"),
    surface: "#242626", surfaceRgb: hexToRgb("#242626"),
    text: "#f4f4f4", textRgb: hexToRgb("#f4f4f4"),
    previewSidebar: "#111212", previewContent: "#242626", previewAccent: "#20b8cd",
    logoFilter: "hue-rotate(160deg) saturate(1.6) brightness(1.2)",
  },
  {
    id: "t3chat", name: "T3 Chat", group: "inspired", mode: "dark",
    primary: "#e879f9", primaryRgb: hexToRgb("#e879f9"),
    secondary: "#38bdf8", secondaryRgb: hexToRgb("#38bdf8"),
    bg: "#0c0a09", bgRgb: hexToRgb("#0c0a09"),
    surface: "#1c1917", surfaceRgb: hexToRgb("#1c1917"),
    text: "#fafaf9", textRgb: hexToRgb("#fafaf9"),
    previewSidebar: "#0c0a09", previewContent: "#1c1917", previewAccent: "#e879f9",
    logoFilter: "hue-rotate(270deg) saturate(2) brightness(1.3)",
  },
  {
    id: "vercel", name: "Vercel", group: "inspired", mode: "dark",
    primary: "#ffffff", primaryRgb: hexToRgb("#ffffff"),
    secondary: "#666666", secondaryRgb: hexToRgb("#666666"),
    bg: "#000000", bgRgb: hexToRgb("#000000"),
    surface: "#111111", surfaceRgb: hexToRgb("#111111"),
    text: "#ededed", textRgb: hexToRgb("#ededed"),
    previewSidebar: "#000000", previewContent: "#111111", previewAccent: "#ffffff",
    logoFilter: "grayscale(1) brightness(2.5) contrast(1.5)",
  },

  /* ── Solid ── */
  {
    id: "carbon", name: "Carbon", group: "solid", mode: "dark",
    primary: "#f4f4f4", primaryRgb: hexToRgb("#f4f4f4"),
    secondary: "#0f62fe", secondaryRgb: hexToRgb("#0f62fe"),
    bg: "#161616", bgRgb: hexToRgb("#161616"),
    surface: "#262626", surfaceRgb: hexToRgb("#262626"),
    text: "#f4f4f4", textRgb: hexToRgb("#f4f4f4"),
    previewSidebar: "#0e0e0e", previewContent: "#262626", previewAccent: "#f4f4f4",
    logoFilter: "grayscale(1) brightness(1.8) contrast(1.2)",
  },
  {
    id: "classic", name: "Classic", group: "solid", mode: "dark",
    primary: "#3b82f6", primaryRgb: hexToRgb("#3b82f6"),
    secondary: "#8b5cf6", secondaryRgb: hexToRgb("#8b5cf6"),
    bg: "#0f172a", bgRgb: hexToRgb("#0f172a"),
    surface: "#1e293b", surfaceRgb: hexToRgb("#1e293b"),
    text: "#f1f5f9", textRgb: hexToRgb("#f1f5f9"),
    previewSidebar: "#0a0f1e", previewContent: "#1e293b", previewAccent: "#3b82f6",
    logoFilter: "hue-rotate(200deg) saturate(2) brightness(1.3)",
  },

  /* ── Brand ── */
  {
    id: "aqua-minimal", name: "Aqua Minimal", group: "brand", mode: "dark",
    primary: "#67D6D6", primaryRgb: hexToRgb("#67D6D6"),
    secondary: "#DDB1C0", secondaryRgb: hexToRgb("#DDB1C0"),
    bg: "#050707", bgRgb: hexToRgb("#050707"),
    surface: "#0B0F0F", surfaceRgb: hexToRgb("#0B0F0F"),
    text: "#F4F4F2", textRgb: hexToRgb("#F4F4F2"),
    previewSidebar: "#030505", previewContent: "#0B0F0F", previewAccent: "#67D6D6",
    logoFilter: "hue-rotate(155deg) saturate(1.3) brightness(1.2)",
  },
  {
    id: "blush-dark", name: "Blush Dark", group: "brand", mode: "dark",
    primary: "#DDB1C0", primaryRgb: hexToRgb("#DDB1C0"),
    secondary: "#67D6D6", secondaryRgb: hexToRgb("#67D6D6"),
    bg: "#0a0808", bgRgb: hexToRgb("#0a0808"),
    surface: "#140f10", surfaceRgb: hexToRgb("#140f10"),
    text: "#F6F4EF", textRgb: hexToRgb("#F6F4EF"),
    previewSidebar: "#070505", previewContent: "#140f10", previewAccent: "#DDB1C0",
    logoFilter: "hue-rotate(300deg) saturate(1.2) brightness(1.4)",
  },
  {
    id: "analyxx-premium", name: "Analyxx Premium", group: "brand", mode: "dark",
    primary: "#10b981", primaryRgb: hexToRgb("#10b981"),
    secondary: "#67D6D6", secondaryRgb: hexToRgb("#67D6D6"),
    bg: "#050505", bgRgb: hexToRgb("#050505"),
    surface: "#0B0F0F", surfaceRgb: hexToRgb("#0B0F0F"),
    text: "#EBEBEB", textRgb: hexToRgb("#EBEBEB"),
    previewSidebar: "#030303", previewContent: "#0B0F0F", previewAccent: "#10b981",
    logoFilter: "none",
  },
  {
    id: "teal-rose", name: "Teal Rose", group: "brand", mode: "dark",
    primary: "#F78DA7", primaryRgb: hexToRgb("#F78DA7"),
    secondary: "#4ECDC4", secondaryRgb: hexToRgb("#4ECDC4"),
    bg: "#1a1118", bgRgb: hexToRgb("#1a1118"),
    surface: "#261a23", surfaceRgb: hexToRgb("#261a23"),
    text: "#F5F0F3", textRgb: hexToRgb("#F5F0F3"),
    previewSidebar: "#120b10", previewContent: "#261a23", previewAccent: "#4ECDC4",
    logoFilter: "hue-rotate(310deg) saturate(1.5) brightness(1.4)",
  },
  {
    id: "sunset-pop", name: "Sunset Pop", group: "brand", mode: "light",
    primary: "#E05580", primaryRgb: hexToRgb("#E05580"),
    secondary: "#F5A623", secondaryRgb: hexToRgb("#F5A623"),
    bg: "#D6EAF8", bgRgb: hexToRgb("#D6EAF8"),
    surface: "#E8F4FD", surfaceRgb: hexToRgb("#E8F4FD"),
    text: "#E05580", textRgb: hexToRgb("#E05580"),
    previewSidebar: "#B8D8F0", previewContent: "#E8F4FD", previewAccent: "#F5A623",
    logoFilter: "hue-rotate(310deg) saturate(1.8) brightness(0.9)",
  },
  {
    id: "pastel-breeze", name: "Pastel Breeze", group: "brand", mode: "light",
    primary: "#59C4C7", primaryRgb: hexToRgb("#59C4C7"),
    secondary: "#E7B7C3", secondaryRgb: hexToRgb("#E7B7C3"),
    bg: "#E7E4E5", bgRgb: hexToRgb("#E7E4E5"),
    surface: "#F4F1F2", surfaceRgb: hexToRgb("#F4F1F2"),
    text: "#505768", textRgb: hexToRgb("#505768"),
    previewSidebar: "#DCD9DA", previewContent: "#F4F1F2", previewAccent: "#59C4C7",
    logoFilter: "hue-rotate(155deg) saturate(1.4) brightness(0.85)",
  },
];

/* ══════════════════════════════════════════════════
   Custom Theme Defaults
   ══════════════════════════════════════════════════ */

export interface CustomThemeSettings {
  accentColor: string;
  secondaryColor: string;
  bgColor: string;
  cardRadius: number; // 0-40
  fontFamily: string;
  fontScale: number; // 0.8-1.4
  density: "compact" | "default" | "relaxed";
  mode: "dark" | "light";
  glassmorphism: boolean;
  shadows: boolean;
}

const DEFAULT_CUSTOM: CustomThemeSettings = {
  accentColor: "#10b981",
  secondaryColor: "#67D6D6",
  bgColor: "#050505",
  cardRadius: 20,
  fontFamily: "Inter",
  fontScale: 1,
  density: "default",
  mode: "dark",
  glassmorphism: true,
  shadows: true,
};

const DEFAULT_PRESET_ID = "analyxx-premium";

/* ══════════════════════════════════════════════════
   Context
   ══════════════════════════════════════════════════ */

interface ThemeContextType {
  activePresetId: string | null;
  customSettings: CustomThemeSettings;
  mode: "dark" | "light";
  isCustom: boolean;
  setPreset: (id: string) => void;
  setMode: (mode: "dark" | "light") => void;
  updateCustom: (partial: Partial<CustomThemeSettings>) => void;
  switchToCustom: () => void;
  panelOpen: boolean;
  setPanelOpen: (open: boolean) => void;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}

/* ══════════════════════════════════════════════════
   Helper: derive light-mode bg/surface/text from preset
   ══════════════════════════════════════════════════ */

function lightVariant(preset: ThemePreset) {
  return {
    bg: "#f8f9fa",
    bgRgb: hexToRgb("#f8f9fa"),
    surface: "#ffffff",
    surfaceRgb: hexToRgb("#ffffff"),
    text: "#1a1a1a",
    textRgb: hexToRgb("#1a1a1a"),
  };
}

/* ══════════════════════════════════════════════════
   Provider
   ══════════════════════════════════════════════════ */

const STORAGE_KEY = "analyxx-theme";

interface StoredTheme {
  presetId: string | null;
  isCustom: boolean;
  mode: "dark" | "light";
  custom: CustomThemeSettings;
}

/** Reset theme state to Analyxx Premium defaults */
function getDefaults() {
  return {
    presetId: DEFAULT_PRESET_ID as string | null,
    isCustom: false,
    mode: "dark" as const,
    custom: DEFAULT_CUSTOM,
  };
}

export default function ThemeProvider({ children }: { children: ReactNode }) {
  const [activePresetId, setActivePresetId] = useState<string | null>(DEFAULT_PRESET_ID);
  const [isCustom, setIsCustom] = useState(false);
  const [mode, setModeState] = useState<"dark" | "light">("dark");
  const [customSettings, setCustomSettings] = useState<CustomThemeSettings>(DEFAULT_CUSTOM);
  const [panelOpen, setPanelOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const isLoggedInRef = useRef(false);

  /* ── Check auth state & restore theme accordingly on mount ── */
  useEffect(() => {
    let cancelled = false;

    async function init() {
      // 1. Check if user is logged in
      const { data: { session } } = await supabase.auth.getSession();
      const loggedIn = !!session;

      if (cancelled) return;

      isLoggedInRef.current = loggedIn;
      setIsLoggedIn(loggedIn);

      // 2. Only restore saved theme if logged in
      if (loggedIn) {
        try {
          const stored = localStorage.getItem(STORAGE_KEY);
          if (stored) {
            const data: StoredTheme = JSON.parse(stored);
            setActivePresetId(data.presetId);
            setIsCustom(data.isCustom);
            setModeState(data.mode);
            if (data.custom) setCustomSettings(data.custom);
          }
        } catch { /* ignore */ }
      }
      // If not logged in, keep the defaults (analyxx-premium)

      setMounted(true);
    }

    init();

    // 3. Listen for auth state changes (login/logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const loggedIn = !!session;
      const wasLoggedIn = isLoggedInRef.current;
      isLoggedInRef.current = loggedIn;
      setIsLoggedIn(loggedIn);

      if (loggedIn && !wasLoggedIn) {
        // User just logged in — restore their saved theme
        try {
          const stored = localStorage.getItem(STORAGE_KEY);
          if (stored) {
            const data: StoredTheme = JSON.parse(stored);
            setActivePresetId(data.presetId);
            setIsCustom(data.isCustom);
            setModeState(data.mode);
            if (data.custom) setCustomSettings(data.custom);
          }
        } catch { /* ignore */ }
      } else if (!loggedIn && wasLoggedIn) {
        // User just logged out — reset to Analyxx Premium
        const defaults = getDefaults();
        setActivePresetId(defaults.presetId);
        setIsCustom(defaults.isCustom);
        setModeState(defaults.mode);
        setCustomSettings(defaults.custom);
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  /* ── Persist to localStorage ── */
  const persist = useCallback((data: StoredTheme) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch { /* ignore */ }
  }, []);

  /* ── Apply CSS variables ── */
  const applyVars = useCallback(() => {
    const root = document.documentElement;

    // trigger transition class
    root.setAttribute("data-theme-transitioning", "");
    setTimeout(() => root.removeAttribute("data-theme-transitioning"), 300);

    if (isCustom) {
      const cs = customSettings;
      root.style.setProperty("--primary", cs.accentColor);
      root.style.setProperty("--primary-rgb", hexToRgb(cs.accentColor));
      root.style.setProperty("--secondary", cs.secondaryColor);
      root.style.setProperty("--secondary-rgb", hexToRgb(cs.secondaryColor));

      if (cs.mode === "dark") {
        root.style.setProperty("--bg", cs.bgColor);
        root.style.setProperty("--bg-rgb", hexToRgb(cs.bgColor));
        const surfaceVal = lightenHex(cs.bgColor, 12);
        root.style.setProperty("--surface", surfaceVal);
        root.style.setProperty("--surface-rgb", hexToRgb(surfaceVal));
        root.style.setProperty("--text", "#EBEBEB");
        root.style.setProperty("--text-rgb", hexToRgb("#EBEBEB"));
      } else {
        root.style.setProperty("--bg", "#f8f9fa");
        root.style.setProperty("--bg-rgb", hexToRgb("#f8f9fa"));
        root.style.setProperty("--surface", "#ffffff");
        root.style.setProperty("--surface-rgb", hexToRgb("#ffffff"));
        root.style.setProperty("--text", "#1a1a1a");
        root.style.setProperty("--text-rgb", hexToRgb("#1a1a1a"));
      }

      root.style.setProperty("--radius", `${cs.cardRadius}px`);
      root.style.setProperty("--font-family", getFontFamily(cs.fontFamily));
      root.style.setProperty("--font-scale", String(cs.fontScale));
      root.style.setProperty("--density", cs.density === "compact" ? "0.85" : cs.density === "relaxed" ? "1.15" : "1");
      root.style.setProperty("--glassmorphism", cs.glassmorphism ? "1" : "0");
      root.style.setProperty("--shadows", cs.shadows ? "1" : "0");
    } else {
      const preset = THEME_PRESETS.find((p) => p.id === activePresetId);
      if (!preset) return;

      const isLight = mode === "light";
      const colors = isLight && preset.mode === "dark" ? lightVariant(preset) : preset;

      root.style.setProperty("--primary", preset.primary);
      root.style.setProperty("--primary-rgb", preset.primaryRgb);
      root.style.setProperty("--secondary", preset.secondary);
      root.style.setProperty("--secondary-rgb", preset.secondaryRgb);
      root.style.setProperty("--bg", colors.bg);
      root.style.setProperty("--bg-rgb", colors.bgRgb);
      root.style.setProperty("--surface", colors.surface);
      root.style.setProperty("--surface-rgb", colors.surfaceRgb);
      root.style.setProperty("--text", colors.text);
      root.style.setProperty("--text-rgb", colors.textRgb);
      root.style.setProperty("--radius", "20px");
      root.style.setProperty("--font-family", "'Inter', sans-serif");
      root.style.setProperty("--font-scale", "1");
      root.style.setProperty("--density", "1");
      root.style.setProperty("--glassmorphism", "1");
      root.style.setProperty("--shadows", "1");
      root.style.setProperty("--logo-filter", preset.logoFilter);
    }
  }, [activePresetId, isCustom, mode, customSettings]);

  useEffect(() => {
    if (!mounted) return;
    applyVars();
    // Only persist theme preferences when the user is logged in
    if (isLoggedInRef.current) {
      persist({ presetId: activePresetId, isCustom, mode, custom: customSettings });
    }
  }, [mounted, activePresetId, isCustom, mode, customSettings, applyVars, persist]);

  /* ── Actions ── */
  const setPreset = useCallback((id: string) => {
    setActivePresetId(id);
    setIsCustom(false);
    const preset = THEME_PRESETS.find((p) => p.id === id);
    if (preset) setModeState(preset.mode);
  }, []);

  const setMode = useCallback((m: "dark" | "light") => {
    setModeState(m);
    if (isCustom) {
      setCustomSettings((prev) => ({ ...prev, mode: m }));
    }
  }, [isCustom]);

  const updateCustom = useCallback((partial: Partial<CustomThemeSettings>) => {
    setCustomSettings((prev) => ({ ...prev, ...partial }));
  }, []);

  const switchToCustom = useCallback(() => {
    setIsCustom(true);
    setActivePresetId(null);
  }, []);

  return (
    <ThemeContext.Provider
      value={{
        activePresetId, customSettings, mode, isCustom,
        setPreset, setMode, updateCustom, switchToCustom,
        panelOpen, setPanelOpen,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

/* ── Helpers ── */

function lightenHex(hex: string, amount: number): string {
  const h = hex.replace("#", "");
  const r = Math.min(255, parseInt(h.substring(0, 2), 16) + amount);
  const g = Math.min(255, parseInt(h.substring(2, 4), 16) + amount);
  const b = Math.min(255, parseInt(h.substring(4, 6), 16) + amount);
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

function getFontFamily(name: string): string {
  const map: Record<string, string> = {
    Inter: "'Inter', sans-serif",
    Roboto: "'Roboto', sans-serif",
    "Space Grotesk": "'Space Grotesk', sans-serif",
    Outfit: "'Outfit', sans-serif",
    "DM Sans": "'DM Sans', sans-serif",
    Poppins: "'Poppins', sans-serif",
    "Plus Jakarta Sans": "'Plus Jakarta Sans', sans-serif",
  };
  return map[name] || "'Inter', sans-serif";
}
