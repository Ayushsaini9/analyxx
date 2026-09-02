import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/llms.txt", "/rtu-pyq", "/exams/", "/library", "/previous-year-papers"],
        disallow: [
          "/api/",
          "/dashboard/",
          "/admin/",
          "/billing/",
          "/profile/",
          "/results/",
        ],
      },
    ],
    sitemap: "https://analyxx.com/sitemap.xml",
  };
}
