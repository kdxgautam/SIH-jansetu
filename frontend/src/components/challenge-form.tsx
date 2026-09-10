"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Crosshair, Sparkle } from "@phosphor-icons/react";
import { api, ApiError, send, useResource } from "@/lib/api";
import type { Challenge, CitizenGuidance } from "@/lib/types";
import { usePortal } from "./providers";
import { ActionButton, ErrorBox, Field, Loading, MutationForm, Select, Textarea, formObject } from "./ui";

export async function uploadFiles(id: string, files: File[]) {
  const failed: string[] = [];
  for (const file of files) {
    const data = new FormData(); data.append("file", file);
    try { await api(`/challenges/${id}/attachments`, { method: "POST", body: data }); }
    catch { failed.push(file.name); }
  }
  return failed;
}

export function ChallengeForm({ existing, onDone }: { existing?: Challenge; onDone?: () => void }) {
  const { t, user, lang } = usePortal();
  const router = useRouter();
  const metadata = useResource<{ districts: string[]; domains: string[] }>("/metadata");
  const [title, setTitle] = useState(existing?.title || "");
  const [description, setDescription] = useState(existing?.description || "");
  const [district, setDistrict] = useState(existing?.district || "");
  const [guidance, setGuidance] = useState<CitizenGuidance>();
  const [coordinates, setCoordinates] = useState({ latitude: existing?.latitude?.toString() || "", longitude: existing?.longitude?.toString() || "" });
  const [locationMessage, setLocationMessage] = useState<string>();
  const [locating, setLocating] = useState(false);

  if (!user || !["citizen", "government"].includes(user.role)) return <ErrorBox code="forbidden" />;
  if (metadata.loading) return <Loading />;
  if (metadata.error) return <ErrorBox code={metadata.error} retry={metadata.refresh} />;

  return <MutationForm submit={existing ? "resubmit" : "submit_challenge"} onDone={onDone} onSubmit={async data => {
    const files = data.getAll("files").filter((file): file is File => file instanceof File && file.size > 0); data.delete("files");
    if (files.length > 5) throw new ApiError("attachment_limit");
    if (files.some(f => f.size > 20 * 1024 * 1024)) throw new ApiError("file_too_large");
    const raw = formObject(data); const body = { ...raw, latitude: raw.latitude ? Number(raw.latitude) : null, longitude: raw.longitude ? Number(raw.longitude) : null };
    const saved = await send<Challenge>(existing ? `/challenges/${existing.id}` : "/challenges", body, existing ? "PUT" : "POST");
    const failed = await uploadFiles(saved.id, files);
    void send(`/challenges/${saved.id}/analyze`, {}).catch(() => {});
    if (!existing) router.push(`/workspace/challenges/${saved.id}${failed.length ? "?uploadFailed=1" : ""}`);
    else if (failed.length) throw new ApiError("saved_upload_failed");
  }}>
    <Field label="challenge_title" name="title" required minLength={8} maxLength={180} value={title} onChange={e => setTitle(e.target.value)} />
    <Textarea label="description" name="description" required minLength={30} maxLength={10000} hint="description_hint" rows={6} value={description} onChange={e => setDescription(e.target.value)} />
    {!existing && <div className="ai-suggestions">
      <h3><Sparkle size={18} aria-hidden="true" />{t("citizen_ai_title")}</h3>
      <p className="muted small">{t("citizen_ai_copy")}</p>
      <ActionButton action={async () => {
        if (title.length < 8 || description.length < 30 || !district) throw new ApiError("validation_error");
        setGuidance(await send<CitizenGuidance>("/ai/citizen-guidance", { title, description, district, language: lang }));
      }}><Sparkle size={18} aria-hidden="true" />{t("get_guidance")}</ActionButton>
      {guidance && <div className="stack compact-stack"><button className="button secondary" type="button" onClick={() => { setTitle(guidance.suggested_title); setDescription(guidance.suggested_description); }}>{t("apply_draft")}</button>{guidance.questions.length > 0 && <div><strong>{t("questions_to_consider")}</strong><ul>{guidance.questions.map(question => <li key={question}>{question}</li>)}</ul></div>}</div>}
    </div>}
    <Select label="submitter_type" name="submitter_type" defaultValue={existing?.submitter_type || "individual"}>{["individual", "community", "panchayat", "urban_body", "government"].map(s => <option key={s} value={s}>{t(s)}</option>)}</Select>
    <div className="form-divider"><h3>{t("location")}</h3></div>
    <div className="form-row"><Select label="district" name="district" value={district} onChange={e => setDistrict(e.target.value)} required><option value="">{t("district")}</option>{metadata.data?.districts.map(d => <option key={d} value={d}>{t(d)}</option>)}</Select><Field label="locality" name="locality" required minLength={2} maxLength={200} defaultValue={existing?.locality} /></div>
    <button type="button" className="button secondary" disabled={locating} onClick={() => {
      if (!navigator.geolocation) { setLocationMessage("location_failed"); return; }
      setLocating(true);
      navigator.geolocation.getCurrentPosition(position => { setCoordinates({ latitude: position.coords.latitude.toFixed(6), longitude: position.coords.longitude.toFixed(6) }); setLocationMessage("location_saved"); setLocating(false); }, () => { setLocationMessage("location_failed"); setLocating(false); }, { timeout: 10000 });
    }}><Crosshair size={18} />{t(locating ? "loading" : "use_location")}</button>
    {locationMessage && <p className="muted" role="status">{t(locationMessage)}</p>}
    <div className="form-row"><Field label="latitude" name="latitude" type="number" min={-90} max={90} step="any" value={coordinates.latitude} onChange={e => setCoordinates({ ...coordinates, latitude: e.target.value })} /><Field label="longitude" name="longitude" type="number" min={-180} max={180} step="any" value={coordinates.longitude} onChange={e => setCoordinates({ ...coordinates, longitude: e.target.value })} /></div>
    {!existing && <div className="upload-zone"><Field label="evidence" hint="evidence_hint" name="files" type="file" accept=".jpg,.jpeg,.png,.pdf,.mp4" multiple /></div>}
    <p className="notice">{t("submission_note")}</p>
  </MutationForm>;
}
