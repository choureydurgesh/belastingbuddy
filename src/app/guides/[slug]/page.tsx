import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { GuidePage } from "@/components/GuidePages";
import { GUIDES, guideBySlug } from "@/lib/guides";

// Every guide becomes its own HTML page at build time.
export function generateStaticParams() {
  return GUIDES.map((g) => ({ slug: g.slug }));
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const guide = guideBySlug((await params).slug);
  if (!guide) return {};
  return {
    title: `${guide.title} – BelastingBuddy`,
    description: guide.summary,
    alternates: { canonical: `/guides/${guide.slug}/` },
  };
}

export default async function Page({ params }: Props) {
  const guide = guideBySlug((await params).slug);
  if (!guide) notFound();
  return <GuidePage guide={guide} />;
}
