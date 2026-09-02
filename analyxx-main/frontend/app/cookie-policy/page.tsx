import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cookie Policy",
  description:
    "Cookie Policy for ANALYXX AI Exam Intelligence Platform. Learn about the cookies we use and how to manage your preferences.",
  alternates: { canonical: "/cookie-policy" },
  openGraph: {
    title: "Cookie Policy | ANALYXX AI",
    description:
      "Understand how ANALYXX AI uses cookies and how to control your cookie preferences.",
    url: "https://analyxx.com/cookie-policy",
  },
};

export default function CookiePolicy() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--bg)",
        color: "#e0e0e0",
        fontFamily: "'Inter', sans-serif",
        padding: "60px 20px",
      }}
    >
      <div style={{ maxWidth: 800, margin: "0 auto" }}>
        <h1
          style={{
            fontSize: "2.5rem",
            fontWeight: 700,
            color: "#ffffff",
            marginBottom: 8,
            fontFamily: "'Space Grotesk', sans-serif",
          }}
        >
          Cookie Policy
        </h1>
        <p style={{ color: "#888", marginBottom: 40 }}>
          Last updated: May 8, 2026
        </p>

        <section style={{ marginBottom: 32 }}>
          <h2 style={sectionTitle}>1. What Are Cookies</h2>
          <p style={paragraph}>
            Cookies are small text files placed on your device when you visit a
            website. They are widely used to make websites work efficiently and
            to provide information to website owners.
          </p>
        </section>

        <section style={{ marginBottom: 32 }}>
          <h2 style={sectionTitle}>2. How We Use Cookies</h2>
          <p style={paragraph}>
            ANALYXX AI uses cookies for the following purposes:
          </p>
          <ul style={list}>
            <li>
              <strong>Essential Cookies:</strong> These are necessary for the
              website to function properly. They enable core features like user
              authentication, session management, and security. These cookies
              cannot be disabled.
            </li>
            <li>
              <strong>Analytics Cookies:</strong> We use Google Analytics to
              understand how visitors interact with our website. These cookies
              help us measure and improve the performance of our site. They
              collect information such as pages visited, time spent on pages, and
              how you arrived at our site.
            </li>
            <li>
              <strong>Marketing Cookies:</strong> These cookies are used to
              personalize your experience and may be used to show you relevant
              content based on your interests and usage patterns.
            </li>
          </ul>
        </section>

        <section style={{ marginBottom: 32 }}>
          <h2 style={sectionTitle}>3. Cookies We Use</h2>
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: "0.875rem",
              }}
            >
              <thead>
                <tr>
                  <th style={th}>Cookie</th>
                  <th style={th}>Type</th>
                  <th style={th}>Purpose</th>
                  <th style={th}>Duration</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={td}>sb-*-auth-token</td>
                  <td style={td}>Essential</td>
                  <td style={td}>User authentication session</td>
                  <td style={td}>Session</td>
                </tr>
                <tr>
                  <td style={td}>analyxx-cookie-consent</td>
                  <td style={td}>Essential</td>
                  <td style={td}>Stores your cookie preferences</td>
                  <td style={td}>1 year</td>
                </tr>
                <tr>
                  <td style={td}>analyxx-theme</td>
                  <td style={td}>Essential</td>
                  <td style={td}>Stores your UI theme preference</td>
                  <td style={td}>Persistent</td>
                </tr>
                <tr>
                  <td style={td}>_ga, _ga_*</td>
                  <td style={td}>Analytics</td>
                  <td style={td}>Google Analytics tracking</td>
                  <td style={td}>2 years</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section style={{ marginBottom: 32 }}>
          <h2 style={sectionTitle}>4. Managing Your Preferences</h2>
          <p style={paragraph}>
            When you first visit ANALYXX AI, you will be presented with a cookie
            consent banner allowing you to accept all cookies, reject
            non-essential cookies, or customize your preferences. You can change
            your cookie preferences at any time by clearing your browser storage
            and revisiting the site.
          </p>
          <p style={paragraph}>
            You can also control cookies through your browser settings. Most
            browsers allow you to refuse cookies or delete existing cookies.
            Please note that disabling essential cookies may affect the
            functionality of the website.
          </p>
        </section>

        <section style={{ marginBottom: 32 }}>
          <h2 style={sectionTitle}>5. Third-Party Cookies</h2>
          <p style={paragraph}>
            When analytics cookies are enabled, Google Analytics may set cookies
            on your device. Google&apos;s use of cookies is governed by their own
            privacy policy. We do not have control over third-party cookies.
          </p>
        </section>

        <section style={{ marginBottom: 32 }}>
          <h2 style={sectionTitle}>6. Contact Us</h2>
          <p style={paragraph}>
            If you have questions about our use of cookies, please contact us at:
          </p>
          <p style={{ ...paragraph, color: "#34d399" }}>analyxai@gmail.com</p>
        </section>

        <div
          style={{
            borderTop: "1px solid #222",
            paddingTop: 24,
            marginTop: 48,
            textAlign: "center",
            color: "#666",
            fontSize: "0.875rem",
          }}
        >
          &copy; 2026 ANALYXX AI. All rights reserved.
        </div>
      </div>
    </div>
  );
}

const sectionTitle: React.CSSProperties = {
  fontSize: "1.25rem",
  fontWeight: 600,
  color: "#ffffff",
  marginBottom: 12,
  fontFamily: "'Space Grotesk', sans-serif",
};

const paragraph: React.CSSProperties = {
  lineHeight: 1.7,
  color: "#ccc",
  marginBottom: 12,
};

const list: React.CSSProperties = {
  lineHeight: 1.8,
  color: "#ccc",
  paddingLeft: 20,
  marginTop: 8,
};

const th: React.CSSProperties = {
  textAlign: "left",
  padding: "12px 16px",
  borderBottom: "1px solid #333",
  color: "#aaa",
  fontWeight: 600,
};

const td: React.CSSProperties = {
  padding: "10px 16px",
  borderBottom: "1px solid #1a1a1a",
  color: "#ccc",
};
