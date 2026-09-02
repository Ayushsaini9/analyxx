/**
 * Breadcrumb Schema Component — Generates JSON-LD structured data for breadcrumb navigation.
 * Helps Google display breadcrumb trails in search results for better navigation UX.
 */

interface BreadcrumbItem {
  name: string;
  href: string;
}

export default function BreadcrumbSchema({
  items,
}: {
  items: BreadcrumbItem[];
}) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: `https://analyxx.com${item.href}`,
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
