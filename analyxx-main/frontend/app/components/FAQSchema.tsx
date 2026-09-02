/**
 * FAQ Schema Component — Generates JSON-LD structured data for FAQ rich snippets.
 * Used on the homepage to improve search visibility with expandable Q&A in Google results.
 */

const faqData = [
  {
    question: "What exams does ANALYXX AI support?",
    answer:
      "ANALYXX AI supports analysis for JEE Main, JEE Advanced, NEET, UPSC CSE, GATE, CAT, CBSE Class 10 & 12 board exams, and RTU university exams. We're continuously adding support for more competitive and board exams across India.",
  },
  {
    question: "How accurate are ANALYXX AI's exam predictions?",
    answer:
      "Our AI achieves 94% prediction accuracy by analyzing patterns across 50,000+ previous year papers. The system uses NLP, trend detection, and cross-year pattern analysis to identify high-probability topics for upcoming exams.",
  },
  {
    question: "Is ANALYXX AI free to use?",
    answer:
      "Yes! ANALYXX AI offers a free tier that allows you to analyze papers daily. For unlimited access to all AI models, advanced analytics, and priority processing, we offer affordable Pro plans starting at just ₹18/day.",
  },
  {
    question: "How does the AI predict exam questions?",
    answer:
      "ANALYXX AI uses advanced Natural Language Processing (NLP) to extract every question from uploaded papers, classify them into 200+ topic categories, and detect frequency patterns, repetition cycles, and topic trends across multiple years. This data is then used to predict which topics are most likely to appear in future exams.",
  },
  {
    question: "What are previous year question papers (PYQ)?",
    answer:
      "Previous Year Question Papers (PYQs) are actual exam papers from past years. They are the most effective study resource as they reveal exam patterns, frequently asked topics, and question formats. ANALYXX AI's PYQ Library provides free access to thousands of past papers for JEE, NEET, UPSC, GATE, and other major exams.",
  },
  {
    question: "How long does it take to analyze a paper?",
    answer:
      "ANALYXX AI processes a full 60-page exam paper in under 2 minutes. You'll receive a comprehensive analysis including topic frequency, AI predictions, year-wise heatmaps, and extracted questions — all delivered instantly to your dashboard.",
  },
  {
    question: "Can I access ANALYXX AI on WhatsApp?",
    answer:
      "Yes! ANALYXX AI offers a WhatsApp bot that lets you send exam papers directly via WhatsApp and receive AI-powered analysis and predictions right in your chat. Simply send a message to our WhatsApp number to get started.",
  },
];

export default function FAQSchema() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqData.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

export { faqData };
