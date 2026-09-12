import type { Metadata } from "next";
import { WorkspaceShell } from "@/components/shell";

// Every workspace page is private; none of it belongs in a search result.
export const metadata: Metadata = { robots: { index: false, follow: false } };
export default function Layout({ children }: { children: React.ReactNode }) { return <WorkspaceShell>{children}</WorkspaceShell>; }
