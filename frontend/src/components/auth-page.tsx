"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowUpRight, Leaf, ShieldCheck } from "@phosphor-icons/react";
import { send } from "@/lib/api";
import type { User } from "@/lib/types";
import { usePortal } from "./providers";
import { Field, MutationForm, formObject } from "./ui";

export function AuthPage({ register = false }: { register?: boolean }) {
  const { t, setUser } = usePortal(); const router = useRouter(); const [email, setEmail] = useState(""); const [password, setPassword] = useState("");
  return <main id="main" className="container auth-page"><section className="auth-story"><Leaf size={44} weight="duotone" /><h1>{t(register ? "register_title" : "hero_title_1")}<span>{t(register ? "hero_title_2" : "hero_title_2")}</span></h1><p>{t("ecosystem_copy")}</p><div className="auth-assurance"><ShieldCheck size={22} /><span>{t("privacy_note")}</span></div></section><section className="auth-form-panel"><h2>{t(register ? "register" : "welcome_back")}</h2><p className="muted">{t(register ? "register_copy" : "login_copy")}</p><MutationForm submit={register ? "register" : "sign_in"} onSubmit={async data => {
    const user = await send<User>(register ? "/auth/register" : "/auth/login", formObject(data)); setUser(user);
    const next = new URLSearchParams(window.location.search).get("next"); router.push(next?.startsWith("/workspace") ? next : "/workspace");
  }}>{register && <Field label="name" name="name" autoComplete="name" required minLength={2} maxLength={120} />}<Field label="email" name="email" type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} maxLength={254} /><Field label="password" name="password" type="password" autoComplete={register ? "new-password" : "current-password"} required minLength={register ? 10 : 1} maxLength={128} hint={register ? "password_hint" : undefined} value={password} onChange={e => setPassword(e.target.value)} /></MutationForm><p className="auth-switch">{t(register ? "have_account" : "no_account")} <Link className="text-link" href={register ? "/login" : "/register"}>{t(register ? "sign_in" : "register")}<ArrowUpRight size={15} /></Link></p>{!register && <div className="demo-accounts"><h3>{t("demo_accounts")}</h3><div className="demo-role-grid">{["citizen", "government", "university", "industry"].map(role => <button type="button" key={role} onClick={() => { setEmail(`${role}@demo.local`); setPassword("DemoPass123!"); }}>{t(role)}</button>)}</div><p>{t("demo_password")}: <code>DemoPass123!</code></p></div>}</section></main>;
}
