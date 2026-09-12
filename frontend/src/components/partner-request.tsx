"use client";
import Link from "next/link";
import { useState } from "react";
import { ArrowUpRight, Buildings, CheckCircle, GraduationCap } from "@phosphor-icons/react";
import { send, useResource } from "@/lib/api";
import type { PartnerRequest } from "@/lib/types";
import { usePortal } from "./providers";
import { Badge, DateText, ErrorBox, Field, Loading, MutationForm, Panel, Select, Textarea, formObject } from "./ui";

/** Public form: an institution asks government to add it. Nothing here grants access. */
export function JoinProgramPage() {
  const { t } = usePortal();
  const metadata = useResource<{ districts: string[]; domains: string[] }>("/metadata");
  const [kind, setKind] = useState("university");
  const [sent, setSent] = useState(false);
  if (metadata.loading) return <Loading />;
  if (metadata.error) return <ErrorBox code={metadata.error} retry={metadata.refresh} />;
  return <main id="main" className="container narrow-page join-page">
    <div className="workspace-heading"><div><p className="eyebrow"><span className="eyebrow-line" />{t("join_eyebrow")}</p><h1>{t("join_title")}</h1><p>{t("join_copy")}</p></div></div>
    {sent ? <Panel title="join_done_title"><div className="join-done"><CheckCircle size={30} weight="duotone" aria-hidden="true" /><p>{t("join_done_copy")}</p></div><Link className="text-link" href="/challenges">{t("explore")}<ArrowUpRight size={15} /></Link></Panel>
      : <Panel title="join_form_title" hint="join_note">
        <MutationForm submit="join_submit" onSubmit={async data => { await send("/partner-requests", { ...formObject(data), domains: data.getAll("domains").map(String) }, "POST"); setSent(true); }}>
          <Select label="join_kind" name="kind" value={kind} onChange={e => setKind(e.target.value)}><option value="university">{t("university")}</option><option value="industry">{t("industry")}</option></Select>
          <div className="form-row"><Field label="organization_name" name="organization_name" required minLength={3} maxLength={160} /><Field label="contact_name" name="contact_name" required minLength={2} maxLength={120} /></div>
          <div className="form-row"><Field label="email" name="email" type="email" required maxLength={254} /><Field label="phone" name="phone" type="tel" maxLength={20} /></div>
          <Select label="district" name="district" required defaultValue=""><option value="">{t("district")}</option>{metadata.data?.districts.map(d => <option key={d} value={d}>{t(d)}</option>)}</Select>
          <div className="field"><span className="field-label">{t("choose_domains")}</span><div className="checkbox-grid">{metadata.data?.domains.map(domain => <label key={domain}><input name="domains" type="checkbox" value={domain} />{t(domain)}</label>)}</div></div>
          <Textarea label="capabilities" hint="capabilities_hint" name="capabilities" required minLength={30} maxLength={4000} rows={5} />
        </MutationForm>
      </Panel>}
  </main>;
}

/** Government queue: every request is decided by a person. */
export function PartnerRequestsQueue() {
  const { t, user } = usePortal();
  const [status, setStatus] = useState("pending");
  const list = useResource<PartnerRequest[]>(`/partner-requests?status=${status}`);
  if (!user || user.role !== "government") return <ErrorBox code="forbidden" />;
  const rows = list.data || [];
  return <div className="stack">
    <div className="workspace-heading"><div><h1>{t("partner_requests")}</h1><p>{t("partner_requests_copy")}</p></div><Select label="status" name="partner-status" value={status} onChange={e => setStatus(e.target.value)}>{["pending", "approved", "declined"].map(value => <option key={value} value={value}>{t(value)}</option>)}</Select></div>
    {list.error ? <ErrorBox code={list.error} retry={list.refresh} /> : list.loading ? <Loading /> : rows.length ? rows.map(row => <Panel key={row.id} title="partner_request" id={`request-${row.id}`}>
      <div className="row-between"><h3>{row.kind === "university" ? <GraduationCap size={20} weight="duotone" aria-hidden="true" /> : <Buildings size={20} weight="duotone" aria-hidden="true" />} {row.organization_name}</h3><Badge value={row.status} /></div>
      <div className="inline-meta"><span>{t(row.kind)}</span><span>{t(row.district)}</span><span><DateText value={row.created_at} /></span></div>
      <p className="prose">{row.capabilities}</p>
      {row.domains.length > 0 && <p className="muted small">{row.domains.map(domain => t(domain)).join(" · ")}</p>}
      <p className="muted small">{row.contact_name} · {row.email}{row.phone ? ` · ${row.phone}` : ""}</p>
      {row.review_note && <p className="notice">{row.review_note}</p>}
      {row.status === "pending" && <MutationForm submit="save_decision" onDone={list.refresh} onSubmit={data => send(`/partner-requests/${row.id}/review`, formObject(data))}>
        <Select label="decision" name="decision"><option value="approve">{t("approve")}</option><option value="decline">{t("decline")}</option></Select>
        <Textarea label="note" name="note" required minLength={3} maxLength={2000} rows={2} />
      </MutationForm>}
    </Panel>) : <p className="muted">{t("no_partner_requests")}</p>}
  </div>;
}
