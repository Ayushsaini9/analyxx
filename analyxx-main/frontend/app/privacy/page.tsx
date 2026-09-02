import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "Privacy Policy for ANALYXX AI Exam Intelligence Platform. Learn how we collect, use, and protect your data.",
  alternates: { canonical: "/privacy" },
  openGraph: {
    title: "Privacy Policy | ANALYXX AI",
    description: "Understand how ANALYXX AI handles your data and protects your privacy.",
    url: "https://analyxx.com/privacy",
  },
};

export default function PrivacyPolicy() {
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
          Privacy Policy
        </h1>
        <p style={{ color: "#888", marginBottom: 40 }}>
          Last updated: April 7, 2026
        </p>

        <section style={{ marginBottom: 32 }}>
          <h2 style={sectionTitle}>1. Introduction</h2>
          <p style={paragraph}>
            ANALYXX AI (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) operates the ANALYXX AI
            platform, including our website and WhatsApp bot service. This
            Privacy Policy explains how we collect, use, disclose, and safeguard
            your information when you use our services.
          </p>
        </section>

        <section style={{ marginBottom: 32 }}>
          <h2 style={sectionTitle}>2. Information We Collect</h2>
          <p style={paragraph}>We may collect the following types of information:</p>
          <ul style={list}>
            <li>
              <strong>Account Information:</strong> Name, email address, and
              password when you register on our platform.
            </li>
            <li>
              <strong>WhatsApp Data:</strong> Phone number and message content
              when you interact with our WhatsApp bot. We only process messages
              to provide our services.
            </li>
            <li>
              <strong>Uploaded Content:</strong> Exam papers and documents you
              upload for AI analysis.
            </li>
            <li>
              <strong>Usage Data:</strong> Information about how you interact
              with our platform, including pages visited and features used.
            </li>
          </ul>
        </section>

        <section style={{ marginBottom: 32 }}>
          <h2 style={sectionTitle}>3. How We Use Your Information</h2>
          <ul style={list}>
            <li>To provide and maintain our exam analysis services</li>
            <li>To operate our WhatsApp bot and respond to your queries</li>
            <li>To generate AI-powered study insights and topic analysis</li>
            <li>To verify your identity and link your WhatsApp account</li>
            <li>To improve and personalize your experience</li>
            <li>To communicate important service updates</li>
          </ul>
        </section>

        <section style={{ marginBottom: 32 }}>
          <h2 style={sectionTitle}>4. Data Storage & Security</h2>
          <p style={paragraph}>
            Your data is stored securely using Supabase, a trusted cloud
            database provider with enterprise-grade security. We implement
            Row Level Security (RLS) policies to ensure data isolation between
            users. All data transmission is encrypted using HTTPS/TLS.
          </p>
        </section>

        <section style={{ marginBottom: 32 }}>
          <h2 style={sectionTitle}>5. Third-Party Services</h2>
          <p style={paragraph}>We use the following third-party services:</p>
          <ul style={list}>
            <li>
              <strong>Meta WhatsApp Business API:</strong> To operate our
              WhatsApp bot service
            </li>
            <li>
              <strong>Supabase:</strong> For secure data storage and
              authentication
            </li>
            <li>
              <strong>Groq AI:</strong> For AI-powered analysis and insights
              (your data is processed but not stored by Groq)
            </li>
          </ul>
        </section>

        <section style={{ marginBottom: 32 }}>
          <h2 style={sectionTitle}>6. Data Retention</h2>
          <p style={paragraph}>
            We retain your personal data only for as long as necessary to
            provide our services. You may request deletion of your account and
            associated data at any time by contacting us.
          </p>
        </section>

        <section style={{ marginBottom: 32 }}>
          <h2 style={sectionTitle}>7. Your Rights</h2>
          <p style={paragraph}>You have the right to:</p>
          <ul style={list}>
            <li>Access the personal data we hold about you</li>
            <li>Request correction of inaccurate data</li>
            <li>Request deletion of your data</li>
            <li>Opt out of WhatsApp bot communications at any time</li>
            <li>Withdraw consent for data processing</li>
          </ul>
        </section>

        <section style={{ marginBottom: 32 }}>
          <h2 style={sectionTitle}>8. Children&apos;s Privacy</h2>
          <p style={paragraph}>
            Our services are intended for students and educators. We do not
            knowingly collect personal data from children under 13. If you
            believe we have collected data from a child under 13, please
            contact us immediately.
          </p>
        </section>

        <section style={{ marginBottom: 32 }}>
          <h2 style={sectionTitle}>9. Changes to This Policy</h2>
          <p style={paragraph}>
            We may update this Privacy Policy from time to time. We will notify
            you of any changes by posting the new policy on this page and
            updating the &quot;Last updated&quot; date.
          </p>
        </section>

        <section style={{ marginBottom: 32 }}>
          <h2 style={sectionTitle}>10. Contact Us</h2>
          <p style={paragraph}>
            If you have any questions about this Privacy Policy, please contact
            us at:
          </p>
          <p style={{ ...paragraph, color: "#34d399" }}>
            analyxai@gmail.com
          </p>
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
          © 2026 ANALYXX AI. All rights reserved.
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
