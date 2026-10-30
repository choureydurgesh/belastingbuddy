import type { Metadata } from "next";
import { ReturnApp } from "@/components/ReturnApp";

export const metadata: Metadata = { title: "Your return – BelastingBuddy" };

export default function Page() {
  return <ReturnApp />;
}
