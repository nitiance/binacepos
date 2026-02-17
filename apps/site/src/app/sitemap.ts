import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://binance-site-gules.vercel.app";
  return [
    { url: `${base}/`, lastModified: new Date() },
    { url: `${base}/pricing`, lastModified: new Date() },
    { url: `${base}/demo`, lastModified: new Date() },
    { url: `${base}/contact`, lastModified: new Date() },
    { url: `${base}/privacy`, lastModified: new Date() },
    { url: `${base}/terms`, lastModified: new Date() },
  ];
}

