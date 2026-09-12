"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { ArrowRight, Bell, ChartBar, CheckSquare, Compass, House, Leaf, List, SignOut, SquaresFour, Buildings, X, Handshake } from "@phosphor-icons/react";
import { api } from "@/lib/api";
import { usePortal } from "./providers";
import { ActionButton, ErrorBox, Loading } from "./ui";

export function Header() {
  const { t, lang, setLang, user } = usePortal(); const [open, setOpen] = useState(false); const pathname = usePathname();
  useEffect(() => { setOpen(false); }, [pathname]);
  return <><a className="skip-link" href="#main" onClick={() => { const main = document.getElementById("main"); main?.setAttribute("tabindex", "-1"); main?.focus(); }}>{t("skip")}</a><header className="site-header"><div className="nav-container"><Link href="/" className="brand"><span className="brand-mark"><Leaf weight="fill" size={26} /></span><span><strong>{t("brand")}</strong><small>{t("brand_sub")}</small></span></Link><nav aria-label={t(open ? "close" : "menu")} className={`public-nav ${open ? "nav-open" : ""}`}><Link href="/challenges" className={pathname === "/challenges" ? "active" : ""}>{t("explore")}</Link><Link href="/#how-it-works">{t("how_it_works")}</Link><Link href="/#ecosystem">{t("institutions")}</Link></nav><div className="nav-actions"><button className="language-toggle" onClick={() => setLang(lang === "en" ? "hi" : "en")} aria-label={lang === "en" ? "हिंदी में बदलें / Switch to Hindi" : "Switch to English"}>{lang === "en" ? "हिंदी" : "English"}</button><Link className="button primary nav-login" href={user ? "/workspace" : "/login"}>{t(user ? "workspace" : "sign_in")}<ArrowRight size={17} aria-hidden="true" /></Link><button className="icon-button mobile-menu" aria-label={t(open ? "close" : "menu")} aria-expanded={open} onClick={() => setOpen(!open)}>{open ? <X size={22} /> : <List size={22} />}</button></div></div></header></>;
}
export function Footer() { const { t } = usePortal(); return <footer className="site-footer"><div className="container footer-main"><div><Link href="/" className="brand footer-brand"><Leaf size={24} weight="fill" /><strong>{t("brand")}</strong></Link><p>{t("footer_copy")}</p></div><div className="footer-links"><Link href="/challenges">{t("explore")}</Link><Link href="/workspace/new">{t("submit_challenge")}</Link><Link href="/login">{t("sign_in")}</Link></div></div><div className="container footer-bottom"><span>© {new Date().getFullYear()} {t("brand")}</span><span>{t("footer_note")}</span></div></footer>; }
export function WorkspaceShell({ children }: { children: ReactNode }) {
  const { t, user, setUser, authLoading, authError, reloadAuth } = usePortal(); const pathname = usePathname(); const router = useRouter();
  useEffect(() => { if (!authLoading && !authError && !user) router.replace("/login?next=" + encodeURIComponent(pathname)); }, [authLoading, authError, user, router, pathname]);
  if (authLoading) return <main id="main" className="container page-space"><Loading /></main>;
  if (authError) return <main id="main" className="container page-space"><ErrorBox code={authError} retry={reloadAuth} /></main>;
  if (!user) return <main id="main" className="container page-space"><Loading /></main>;
  const links = [
    { href: "/workspace", key: "overview", icon: SquaresFour },
    { href: "/workspace/challenges", key: user.role === "government" ? "review_queue" : user.role === "university" ? "assigned_challenges" : user.role === "industry" ? "my_projects" : "my_challenges", icon: CheckSquare },
    ...(user.role === "industry" ? [{ href: "/challenges", key: "opportunities", icon: Compass }, { href: "/workspace/offers", key: "my_offers", icon: Handshake }] : []),
    ...(user.role === "government" ? [{ href: "/workspace/analytics", key: "analytics", icon: ChartBar }, { href: "/workspace/partner-requests", key: "partner_requests", icon: Handshake }] : []),
    ...(user.organization_id ? [{ href: "/workspace/organization", key: "organization", icon: Buildings }] : []),
    { href: "/workspace/notifications", key: "notifications", icon: Bell },
  ];
  return <div className="workspace-layout"><aside className="sidebar"><div className="workspace-label">{t(user.role)}<small>{t("workspace")}</small></div><nav aria-label={t("workspace")}>{links.map(link => <Link key={link.href} href={link.href} className={(link.href === "/workspace" ? pathname === link.href : pathname.startsWith(link.href)) ? "selected" : ""}><link.icon size={20} weight="duotone" />{t(link.key)}</Link>)}</nav><div className="sidebar-bottom"><Link href="/" className="sidebar-home"><House size={18} />{t("home")}</Link><div className="profile"><span className="avatar">{user.name.slice(0, 1)}</span><div><strong>{user.name}</strong><small>{user.email}</small></div></div><ActionButton variant="quiet" action={() => api("/auth/logout", { method: "POST" })} onDone={() => { setUser(null); router.push("/"); }}><SignOut size={18} />{t("sign_out")}</ActionButton></div></aside><main id="main" className="workspace-main">{children}</main></div>;
}
