import type { Metadata } from "next";
import { PublicDetail } from "@/components/public-pages";
import { publicApi, SITE_URL } from "@/lib/server";
import type { Challenge } from "@/lib/types";

async function challenge(params: Promise<{ id: string }>) {
  const { id } = await params;
  return { id, data: await publicApi<Challenge>(`/public/challenges/${id}`) };
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id, data } = await challenge(params);
  if (!data) return { title: "Challenge not found", robots: { index: false, follow: true } };
  const title = data.public_title_en || "Community challenge";
  const description = (data.summary_en || "A community challenge reviewed and published on JanSetu.").slice(0, 200);
  return {
    title,
    description,
    alternates: { canonical: `/challenges/${id}` },
    openGraph: { type: "article", url: `/challenges/${id}`, title, description, locale: "en_IN", alternateLocale: "hi_IN" },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id, data } = await challenge(params);
  // Described for search engines here, because the page itself renders in whichever
  // language the reader chose and a crawler never makes that choice.
  const described = data && {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    name: data.public_title_en,
    abstract: data.summary_en,
    inLanguage: ["en", "hi"],
    dateCreated: data.created_at,
    url: `${SITE_URL}/challenges/${id}`,
    about: data.domain,
    contentLocation: { "@type": "Place", address: { "@type": "PostalAddress", addressLocality: data.district, addressRegion: "Jharkhand", addressCountry: "IN" } },
    isPartOf: { "@type": "WebSite", name: "JanSetu", url: SITE_URL },
  };
  return <>
    {described && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(described) }} />}
    <PublicDetail id={id} />
  </>;
}
