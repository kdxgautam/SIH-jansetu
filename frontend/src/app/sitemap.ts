import type { MetadataRoute } from "next";
import { publicApi, SITE_URL } from "@/lib/server";
import type { Challenge } from "@/lib/types";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pages = ["", "/challenges", "/join", "/login", "/register"].map(path => ({
    url: `${SITE_URL}${path}`,
    changeFrequency: (path === "/challenges" ? "daily" : "weekly") as "daily" | "weekly",
    priority: path === "" ? 1 : 0.7,
  }));
  const challenges = (await publicApi<Challenge[]>("/public/challenges?limit=100", 3600)) || [];
  return [
    ...pages,
    ...challenges.map(challenge => ({
      url: `${SITE_URL}/challenges/${challenge.id}`,
      lastModified: challenge.created_at,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
  ];
}
