"use client";
import { ErrorBox } from "@/components/ui";
export default function ErrorPage({ reset }: { reset: () => void }) { return <main id="main" className="container page-space"><ErrorBox code="network_error" retry={reset} /></main>; }
