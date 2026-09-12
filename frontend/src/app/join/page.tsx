import type { Metadata } from "next";
import { JoinProgramPage } from "@/components/partner-request";

export const metadata: Metadata = {
  title: "Join the programme",
  description: "Universities and industry partners can ask the Government of Jharkhand to add them to the JanSetu programme.",
  alternates: { canonical: "/join" },
};
export default function Page() { return <JoinProgramPage />; }
