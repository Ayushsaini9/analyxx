import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Use",
  description:
    "Terms of Use for ANALYXX AI Exam Intelligence Platform. Understand the rules and conditions governing your use of our services.",
  alternates: { canonical: "/terms" },
  openGraph: {
    title: "Terms of Use | ANALYXX AI",
    description: "Read the terms and conditions for using the ANALYXX AI platform.",
    url: "https://analyxx.com/terms",
  },
};

export default function TermsOfUse() {
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
          Terms of Use
        </h1>
        <p style={{ color: "#888", marginBottom: 40 }}>
          Last updated: May 8, 2026
        </p>

        <section style={{ marginBottom: 32 }}>
          <h2 style={sectionTitle}>1. Acceptance of Terms</h2>
          <p style={paragraph}>
            By accessing or using the ANALYXX AI platform (&quot;Platform&quot;),
            including our website, mobile interfaces, WhatsApp bot, and any
            associated services, you agree to be bound by these Terms of Use
            (&quot;Terms&quot;). If you do not agree, please do not use the Platform.
          </p>
        </section>

        <section style={{ marginBottom: 32 }}>
          <h2 style={sectionTitle}>2. Eligibility</h2>
          <p style={paragraph}>
            You must be at least 13 years of age to use the Platform. If you are
            under 18, you represent that you have obtained consent from a parent
            or legal guardian. By using the Platform, you represent and warrant
            that you meet these eligibility requirements.
          </p>
        </section>

        <section style={{ marginBottom: 32 }}>
          <h2 style={sectionTitle}>3. Account Registration</h2>
          <p style={paragraph}>
            To access certain features, you must create an account. You agree to
            provide accurate and complete information, keep your credentials
            confidential, and notify us immediately of any unauthorized access.
            You are solely responsible for all activity under your account.
          </p>
        </section>

        <section style={{ marginBottom: 32 }}>
          <h2 style={sectionTitle}>4. Acceptable Use</h2>
          <p style={paragraph}>You agree not to:</p>
          <ul style={list}>
            <li>Use the Platform for any unlawful or fraudulent purpose</li>
            <li>
              Upload, distribute, or share content that infringes intellectual
              property rights of any third party
            </li>
            <li>
              Attempt to reverse-engineer, decompile, or extract source code from
              our AI models or algorithms
            </li>
            <li>
              Use automated scripts, bots, or scraping tools to access the
              Platform without our express written consent
            </li>
            <li>
              Interfere with or disrupt the integrity or performance of the
              Platform
            </li>
            <li>
              Redistribute, resell, or commercially exploit AI-generated analysis
              without authorization
            </li>
          </ul>
        </section>

        <section style={{ marginBottom: 32 }}>
          <h2 style={sectionTitle}>5. User Content</h2>
          <p style={paragraph}>
            You retain ownership of the documents, question papers, and other
            materials (&quot;User Content&quot;) you upload to the Platform. By
            uploading User Content, you grant ANALYXX AI a non-exclusive,
            worldwide, royalty-free license to process, analyze, and store it
            solely for the purpose of providing and improving our services.
          </p>
        </section>

        <section style={{ marginBottom: 32 }}>
          <h2 style={sectionTitle}>6. Intellectual Property</h2>
          <p style={paragraph}>
            All content, features, and functionality of the Platform — including
            text, graphics, logos, AI models, algorithms, and software — are the
            exclusive property of ANALYXX AI and are protected by Indian and
            international copyright, trademark, and intellectual property laws.
          </p>
        </section>

        <section style={{ marginBottom: 32 }}>
          <h2 style={sectionTitle}>7. AI-Generated Content Disclaimer</h2>
          <p style={paragraph}>
            Our AI-powered analysis, predictions, and study recommendations are
            generated algorithmically and provided for informational purposes
            only. While we strive for high accuracy, ANALYXX AI does not
            guarantee the correctness, completeness, or reliability of any
            AI-generated output. You should not rely solely on our predictions
            for exam preparation decisions.
          </p>
        </section>

        <section style={{ marginBottom: 32 }}>
          <h2 style={sectionTitle}>8. Payments &amp; Subscriptions</h2>
          <p style={paragraph}>
            Certain features require a paid subscription. By subscribing, you
            agree to pay the applicable fees. All payments are processed securely
            through Razorpay. Subscriptions renew automatically unless cancelled
            before the renewal date. Refunds, if applicable, are governed by our
            refund policy and processed at our discretion.
          </p>
        </section>

        <section style={{ marginBottom: 32 }}>
          <h2 style={sectionTitle}>9. Termination</h2>
          <p style={paragraph}>
            We reserve the right to suspend or terminate your account at any time
            if you violate these Terms or engage in activity that is harmful to
            the Platform or other users. You may delete your account at any time
            from your profile settings. Upon termination, your right to use the
            Platform ceases immediately, and we may delete your data in
            accordance with our Privacy Policy.
          </p>
        </section>

        <section style={{ marginBottom: 32 }}>
          <h2 style={sectionTitle}>10. Limitation of Liability</h2>
          <p style={paragraph}>
            To the maximum extent permitted by applicable law, ANALYXX AI and its
            founders, employees, and affiliates shall not be liable for any
            indirect, incidental, special, consequential, or punitive damages
            arising out of or related to your use of the Platform — including but
            not limited to loss of data, profits, or academic outcomes.
          </p>
        </section>

        <section style={{ marginBottom: 32 }}>
          <h2 style={sectionTitle}>11. Governing Law</h2>
          <p style={paragraph}>
            These Terms shall be governed by and construed in accordance with the
            laws of India. Any disputes arising under these Terms shall be
            subject to the exclusive jurisdiction of the courts in Jaipur,
            Rajasthan, India.
          </p>
        </section>

        <section style={{ marginBottom: 32 }}>
          <h2 style={sectionTitle}>12. Changes to These Terms</h2>
          <p style={paragraph}>
            We may revise these Terms at any time by posting an updated version
            on this page. Continued use of the Platform after changes constitutes
            acceptance of the revised Terms. We encourage you to review this page
            periodically.
          </p>
        </section>

        <section style={{ marginBottom: 32 }}>
          <h2 style={sectionTitle}>13. Contact Us</h2>
          <p style={paragraph}>
            If you have any questions about these Terms of Use, please contact us
            at:
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
