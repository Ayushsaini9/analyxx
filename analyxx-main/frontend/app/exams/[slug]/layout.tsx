import { Metadata } from "next";
import { getExamBySlug, getAllSlugs } from "../examData";
import BreadcrumbSchema from "../../components/BreadcrumbSchema";

export async function generateStaticParams() {
  return getAllSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const exam = getExamBySlug(slug);
  if (!exam)
    return { title: "Exam Not Found", robots: { index: false, follow: false } };

  return {
    title: exam.metaTitle,
    description: exam.metaDescription,
    alternates: { canonical: `/exams/${exam.slug}` },
    openGraph: {
      title: exam.metaTitle,
      description: exam.metaDescription,
      url: `https://analyxx.com/exams/${exam.slug}`,
    },
    keywords: [
      `${exam.name} previous year papers`,
      `${exam.name} predicted questions`,
      `${exam.name} important topics`,
      `${exam.name} PYQ`,
      `${exam.name} exam preparation`,
      `${exam.name} question paper analysis`,
      `AI ${exam.name} predictions`,
    ],
  };
}

export default async function ExamLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const exam = getExamBySlug(slug);
  if (!exam) return <>{children}</>;

  return (
    <>
      <BreadcrumbSchema
        items={[
          { name: "Home", href: "/" },
          { name: "Exams", href: "/exams" },
          { name: `${exam.name} Papers`, href: `/exams/${exam.slug}` },
        ]}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Course",
            name: `${exam.name} Exam Preparation with AI`,
            description: exam.metaDescription,
            provider: {
              "@type": "Organization",
              name: "ANALYXX AI",
              url: "https://analyxx.com",
            },
            url: `https://analyxx.com/exams/${exam.slug}`,
            hasCourseInstance: {
              "@type": "CourseInstance",
              courseMode: "Online",
              courseWorkload: "Self-paced",
            },
          }),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: exam.faqs.map((faq) => ({
              "@type": "Question",
              name: faq.q,
              acceptedAnswer: { "@type": "Answer", text: faq.a },
            })),
          }),
        }}
      />
      {children}
    </>
  );
}
