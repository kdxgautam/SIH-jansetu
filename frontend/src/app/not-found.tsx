"use client";
import Link from "next/link";
import { usePortal } from "@/components/providers";
export default function NotFound() { const { t } = usePortal(); return <main id="main" className="container page-space empty"><h1>{t("not_found_title")}</h1><Link className="button primary" href="/">{t("home")}</Link></main>; }
