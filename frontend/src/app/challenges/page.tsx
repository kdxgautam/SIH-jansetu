import type { Metadata } from "next";
import { ExplorePage } from "@/components/public-pages";

export const metadata: Metadata = {
  title: "Explore challenges",
  description: "Browse reviewed community challenges from across Jharkhand, with their district, domain and delivery progress.",
  alternates: { canonical: "/challenges" },
};
export default function Page() { return <ExplorePage />; }
