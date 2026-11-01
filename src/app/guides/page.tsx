import type { Metadata } from "next";
import { GuidesIndex } from "@/components/GuidePages";

export const metadata: Metadata = {
  title: "Dutch tax guides for expats – BelastingBuddy",
  description: "Plain-English guides to the 30% ruling, the M form and box 3 savings tax in the Netherlands.",
  alternates: { canonical: "/guides/" },
};

export default function Page() {
  return <GuidesIndex />;
}
