import type { Metadata } from "next";
import { AuthPage } from "@/components/auth-page";

export const metadata: Metadata = { title: "Sign in", alternates: { canonical: "/login" } };
export default function Page() { return <AuthPage />; }
