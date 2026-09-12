"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { Crosshair, SpeakerHigh, Sparkle, Microphone, Stop } from "@phosphor-icons/react";
import { api, ApiError, send, useResource } from "@/lib/api";
import type { Challenge, CitizenGuidance } from "@/lib/types";
import { usePortal } from "./providers";
import { ActionButton, ErrorBox, Field, Loading, MutationForm, Select, Textarea, formObject } from "./ui";

export async function uploadFiles(id: string, files: File[], milestoneId?: string) {
  const failed: string[] = [];
  for (const file of files) {
    const data = new FormData(); data.append("file", file); if (milestoneId) data.append("milestone_id", milestoneId);
    try { await api(`/challenges/${id}/attachments`, { method: "POST", body: data }); } catch { failed.push(file.name); }
  }
  return failed;
}

type SpeechResult = { results: ArrayLike<{ 0: { transcript: string } }> };
type SpeechRecognitionInstance = { lang: string; interimResults: boolean; maxAlternatives: number; onresult: ((event: SpeechResult) => void) | null; onerror: ((event: { error?: string }) => void) | null; onend: (() => void) | null; start: () => void; stop: () => void };
type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;

function speechRecognitionConstructor() {
  if (typeof window === "undefined") return undefined;
  const browserWindow = window as Window & { SpeechRecognition?: SpeechRecognitionConstructor; webkitSpeechRecognition?: SpeechRecognitionConstructor };
  return browserWindow.SpeechRecognition || browserWindow.webkitSpeechRecognition;
}

export function ChallengeForm({ existing, onDone }: { existing?: Challenge; onDone?: () => void }) {
  const { t, user, lang } = usePortal();
  const router = useRouter();
  const metadata = useResource<{ districts: string[]; domains: string[] }>("/metadata");
  const wizard = !existing && user?.role === "citizen";
  const [step, setStep] = useState(1);
  const [title, setTitle] = useState(existing?.title || "");
  const [description, setDescription] = useState(existing?.description || "");
  const [submitterType, setSubmitterType] = useState(existing?.submitter_type || "individual");
  const [district, setDistrict] = useState(existing?.district || "");
  const [locality, setLocality] = useState(existing?.locality || "");
  const [guidance, setGuidance] = useState<CitizenGuidance>();
  const [coordinates, setCoordinates] = useState({ latitude: existing?.latitude?.toString() || "", longitude: existing?.longitude?.toString() || "" });
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [locationMessage, setLocationMessage] = useState<string>();
  const [speechMessage, setSpeechMessage] = useState<string>();
  const [locating, setLocating] = useState(false);
  const [listening, setListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [dictationSupported, setDictationSupported] = useState(false);
  const [draftReady, setDraftReady] = useState(!wizard);
  const stepRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | undefined>(undefined);
  const draftKey = wizard && user ? `jansetu-citizen-draft:${user.id}` : "";

  useEffect(() => {
    setDictationSupported(Boolean(speechRecognitionConstructor()));
    const synth = typeof window === "undefined" ? undefined : window.speechSynthesis;
    const update = () => setSpeechSupported(Boolean(synth && synth.getVoices().length));
    update();
    synth?.addEventListener("voiceschanged", update);
    return () => { synth?.removeEventListener("voiceschanged", update); synth?.cancel(); recognitionRef.current?.stop(); };
  }, []);
  useEffect(() => { if (!wizard || !draftKey) return; try { const raw = sessionStorage.getItem(draftKey); if (raw) { const draft = JSON.parse(raw) as Record<string, string>; setTitle(draft.title || ""); setDescription(draft.description || ""); setSubmitterType(draft.submitterType || "individual"); setDistrict(draft.district || ""); setLocality(draft.locality || ""); } } catch { /* Ignore unavailable storage. */ } setDraftReady(true); }, [draftKey, wizard]);
  useEffect(() => { if (!wizard || !draftKey || !draftReady) return; sessionStorage.setItem(draftKey, JSON.stringify({ title, description, submitterType, district, locality })); }, [description, district, draftKey, draftReady, locality, submitterType, title, wizard]);
  useEffect(() => { if (!wizard) return; recognitionRef.current?.stop(); stepRef.current?.focus(); }, [step, wizard]);

  if (!user || !["citizen", "government"].includes(user.role)) return <ErrorBox code="forbidden" />;
  if (metadata.loading) return <Loading />;
  if (metadata.error) return <ErrorBox code={metadata.error} retry={metadata.refresh} />;

  function speak(text: string) {
    const synth = window.speechSynthesis;
    if (!speechSupported || !synth) return;
    synth.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang === "hi" ? "hi-IN" : "en-IN";
    const voice = synth.getVoices().find(option => option.lang.toLowerCase().startsWith(lang === "hi" ? "hi" : "en"));
    if (voice) utterance.voice = voice;
    synth.speak(utterance);
  }
  function startDictation() {
    const Constructor = speechRecognitionConstructor();
    if (!Constructor) { setSpeechMessage("speech_unavailable"); return; }
    recognitionRef.current?.stop();
    const recognition = new Constructor(); recognition.lang = lang === "hi" ? "hi-IN" : "en-IN"; recognition.interimResults = false; recognition.maxAlternatives = 1;
    recognition.onresult = event => { const transcript = event.results[0]?.[0]?.transcript?.trim(); if (transcript) setDescription(current => `${current}${current.trim() ? " " : ""}${transcript}`); };
    recognition.onerror = event => {
      const code = event?.error;
      setSpeechMessage(code === "not-allowed" || code === "service-not-allowed" ? "speech_denied" : code === "no-speech" ? "speech_no_speech" : code === "network" ? "speech_network" : "speech_error");
      setListening(false);
    }; recognition.onend = () => setListening(false); recognitionRef.current = recognition; setSpeechMessage(undefined); setListening(true); recognition.start();
  }
  function stopDictation() { recognitionRef.current?.stop(); setListening(false); }
  function validStep() {
    if (step === 1 && (title.trim().length < 8 || description.trim().length < 30)) { setSpeechMessage("step_problem_error"); return false; }
    if (step === 2 && (!district || locality.trim().length < 2)) { setSpeechMessage("step_place_error"); return false; }
    setSpeechMessage(undefined); return true;
  }
  function openHelp() { document.querySelector<HTMLButtonElement>(".chat-launcher")?.click(); }

  const stepText = step === 1 ? `${t("step_problem_hint")} ${t("example_description")}` : step === 2 ? t("step_place_hint") : step === 3 ? t("step_evidence_hint") : t("step_check_hint");
  const legacyFields = <>
    <Field label="challenge_title" name="title" required minLength={8} maxLength={180} value={title} onChange={e => setTitle(e.target.value)} />
    <Textarea label="description" name="description" required minLength={30} maxLength={10000} hint="description_hint" rows={6} value={description} onChange={e => setDescription(e.target.value)} />
    {!existing && <div className="ai-suggestions"><h3><Sparkle size={18} aria-hidden="true" />{t("citizen_ai_title")}</h3><p className="muted small">{t("citizen_ai_copy")}</p><ActionButton action={async () => { if (title.length < 8 || description.length < 30 || !district) throw new ApiError("validation_error"); setGuidance(await send<CitizenGuidance>("/ai/citizen-guidance", { title, description, district, language: lang })); }}><Sparkle size={18} aria-hidden="true" />{t("get_guidance")}</ActionButton>{guidance && <div className="stack compact-stack"><button className="button secondary" type="button" onClick={() => { setTitle(guidance.suggested_title); setDescription(guidance.suggested_description); }}>{t("apply_draft")}</button>{guidance.questions.length > 0 && <div><strong>{t("questions_to_consider")}</strong><ul>{guidance.questions.map(question => <li key={question}>{question}</li>)}</ul></div>}</div>}</div>}
    <Select label="submitter_type" name="submitter_type" defaultValue={existing?.submitter_type || "individual"}>{["individual", "community", "panchayat", "urban_body", "government"].map(s => <option key={s} value={s}>{t(s)}</option>)}</Select>
    <div className="form-divider"><h3>{t("location")}</h3></div><div className="form-row"><Select label="district" name="district" value={district} onChange={e => setDistrict(e.target.value)} required><option value="">{t("district")}</option>{metadata.data?.districts.map(d => <option key={d} value={d}>{t(d)}</option>)}</Select><Field label="locality" name="locality" required minLength={2} maxLength={200} value={locality} onChange={e => setLocality(e.target.value)} /></div>
    <button type="button" className="button secondary" disabled={locating} onClick={() => { if (!navigator.geolocation) { setLocationMessage("location_failed"); return; } setLocating(true); navigator.geolocation.getCurrentPosition(position => { setCoordinates({ latitude: position.coords.latitude.toFixed(6), longitude: position.coords.longitude.toFixed(6) }); setLocationMessage("location_saved"); setLocating(false); }, () => { setLocationMessage("location_failed"); setLocating(false); }, { timeout: 10000 }); }}><Crosshair size={18} />{t(locating ? "loading" : "use_location")}</button>{locationMessage && <p className="muted" role="status">{t(locationMessage)}</p>}
    <div className="form-row"><Field label="latitude" name="latitude" type="number" min={-90} max={90} step="any" value={coordinates.latitude} onChange={e => setCoordinates({ ...coordinates, latitude: e.target.value })} /><Field label="longitude" name="longitude" type="number" min={-180} max={180} step="any" value={coordinates.longitude} onChange={e => setCoordinates({ ...coordinates, longitude: e.target.value })} /></div>
    {!existing && <div className="upload-zone"><Field label="evidence" hint="evidence_hint" name="files" type="file" accept=".jpg,.jpeg,.png,.pdf,.mp4" multiple /></div>}<p className="notice">{t("submission_note")}</p>
  </>;

  return <MutationForm submit={wizard ? (step < 4 ? "next_step" : "submit_challenge") : existing ? "resubmit" : "submit_challenge"} onDone={onDone} onSubmit={async data => {
    if (wizard && step < 4) { if (!validStep()) return false; setStep(current => current + 1); return false; }
    const files = wizard ? selectedFiles : data.getAll("files").filter((file): file is File => file instanceof File && file.size > 0); data.delete("files");
    if (files.length > 5) throw new ApiError("attachment_limit"); if (files.some(file => file.size > 20 * 1024 * 1024)) throw new ApiError("file_too_large");
    const raw = formObject(data); const body = { ...raw, latitude: raw.latitude ? Number(raw.latitude) : null, longitude: raw.longitude ? Number(raw.longitude) : null };
    const saved = await send<Challenge>(existing ? `/challenges/${existing.id}` : "/challenges", body, existing ? "PUT" : "POST"); const failed = await uploadFiles(saved.id, files); void send(`/challenges/${saved.id}/analyze`, {}).catch(() => {});
    if (draftKey) sessionStorage.removeItem(draftKey); if (!existing) router.push(`/workspace/challenges/${saved.id}${failed.length ? "?uploadFailed=1" : ""}`); else if (failed.length) throw new ApiError("saved_upload_failed");
  }}>
    {wizard ? <>
      <nav className="citizen-steps" aria-label={t("submission_steps")}><ol>{([["step_problem", "step_problem_hint"], ["step_place", "step_place_hint"], ["step_evidence", "step_evidence_hint"], ["step_check", "step_check_hint"]] as const).map(([label], index) => <li key={label}><button type="button" aria-current={step === index + 1 ? "step" : undefined} disabled={index + 1 > step} onClick={() => index + 1 <= step && setStep(index + 1)}>{t(label)}</button></li>)}</ol></nav>
      <div ref={stepRef} className="citizen-step-heading" tabIndex={-1} aria-live="polite"><div><h2>{t(`step_${["problem", "place", "evidence", "check"][step - 1]}`)}</h2><p>{stepText}</p></div>{speechSupported && <button type="button" className="icon-button" onClick={() => speak(stepText)} aria-label={t("listen")}><SpeakerHigh size={20} aria-hidden="true" /></button>}</div>
      {step === 1 && <div className="citizen-step"><Field label="challenge_title" name="title" required minLength={8} maxLength={180} value={title} onChange={e => setTitle(e.target.value)} hint="example_title" /><div className="voice-field"><Textarea label="description" name="description" required minLength={30} maxLength={10000} rows={6} value={description} onChange={e => setDescription(e.target.value)} hint="example_description" />{dictationSupported && <button type="button" className="button secondary" onClick={listening ? stopDictation : startDictation}>{listening ? <Stop size={18} /> : <Microphone size={18} />}{t(listening ? "stop_listening" : "speak")}</button>}</div><div className="ai-suggestions"><h3><Sparkle size={18} aria-hidden="true" />{t("citizen_ai_title")}</h3><p className="muted small">{t("citizen_ai_copy")}</p><ActionButton action={async () => { if (title.length < 8 || description.length < 30) throw new ApiError("validation_error"); if (!district) { setSpeechMessage("guidance_needs_place"); return; } setGuidance(await send<CitizenGuidance>("/ai/citizen-guidance", { title, description, district, language: lang })); }}><Sparkle size={18} aria-hidden="true" />{t("get_guidance")}</ActionButton>{guidance && <div className="stack compact-stack"><button className="button secondary" type="button" onClick={() => { setTitle(guidance.suggested_title); setDescription(guidance.suggested_description); }}>{t("apply_draft")}</button>{guidance.questions.length > 0 && <div><strong>{t("questions_to_consider")}</strong><ul>{guidance.questions.map(question => <li key={question}>{question}</li>)}</ul></div>}</div>}</div></div>}
      {step === 2 && <div className="citizen-step"><Select label="submitter_type" name="submitter_type" value={submitterType} onChange={e => setSubmitterType(e.target.value)}><option value="individual">{t("individual")}</option><option value="community">{t("community")}</option><option value="panchayat">{t("panchayat")}</option><option value="urban_body">{t("urban_body")}</option></Select><div className="form-row"><Select label="district" name="district" value={district} onChange={e => setDistrict(e.target.value)} required><option value="">{t("district")}</option>{metadata.data?.districts.map(value => <option key={value} value={value}>{t(value)}</option>)}</Select><Field label="locality" name="locality" required minLength={2} maxLength={200} value={locality} onChange={e => setLocality(e.target.value)} hint="example_locality" /></div><button type="button" className="button secondary" disabled={locating} onClick={() => { if (!navigator.geolocation) { setLocationMessage("location_failed"); return; } setLocating(true); navigator.geolocation.getCurrentPosition(position => { setCoordinates({ latitude: position.coords.latitude.toFixed(6), longitude: position.coords.longitude.toFixed(6) }); setLocationMessage("location_saved"); setLocating(false); }, () => { setLocationMessage("location_failed"); setLocating(false); }, { timeout: 10000 }); }}><Crosshair size={18} />{t(locating ? "loading" : "use_location")}</button>{locationMessage && <p className="muted" role="status">{t(locationMessage)}</p>}{<details className="advanced-location"><summary>{t("advanced_location")}</summary><div className="form-row"><Field label="latitude" name="latitude" type="number" min={-90} max={90} step="any" value={coordinates.latitude} onChange={e => setCoordinates({ ...coordinates, latitude: e.target.value })} /><Field label="longitude" name="longitude" type="number" min={-180} max={180} step="any" value={coordinates.longitude} onChange={e => setCoordinates({ ...coordinates, longitude: e.target.value })} /></div></details>}</div>}
      {step === 3 && <div className="citizen-step"><div className="upload-zone"><Field label="evidence" hint="evidence_hint" name="files" type="file" accept=".jpg,.jpeg,.png,.pdf,.mp4" multiple onChange={(event: ChangeEvent<HTMLInputElement>) => setSelectedFiles(Array.from(event.target.files || []))} /></div><p className="muted">{selectedFiles.length ? `${selectedFiles.length} ${t("files_selected")}` : t("no_files_selected")}</p><button type="button" className="text-link" onClick={() => setStep(4)}>{t("skip_evidence")}</button></div>}
      {step === 4 && <div className="citizen-step citizen-review"><input type="hidden" name="title" value={title} /><input type="hidden" name="description" value={description} /><input type="hidden" name="submitter_type" value={submitterType} /><input type="hidden" name="district" value={district} /><input type="hidden" name="locality" value={locality} /><input type="hidden" name="latitude" value={coordinates.latitude} /><input type="hidden" name="longitude" value={coordinates.longitude} /><dl><div><dt>{t("review_problem")}</dt><dd><strong>{title}</strong><p>{description}</p><button type="button" className="text-link" onClick={() => setStep(1)}>{t("review_change")}</button></dd></div><div><dt>{t("review_place")}</dt><dd>{t(district)} · {locality}<br /><span className="muted">{t(submitterType)}</span><br /><button type="button" className="text-link" onClick={() => setStep(2)}>{t("review_change")}</button></dd></div><div><dt>{t("review_files")}</dt><dd>{selectedFiles.length ? selectedFiles.map(file => file.name).join(", ") : t("no_files_selected")}<br /><button type="button" className="text-link" onClick={() => setStep(3)}>{t("review_change")}</button></dd></div></dl><p className="notice">{t("submission_note")}</p></div>}
      {speechMessage && <p className="notice" role="alert">{t(speechMessage)}</p>}
      <div className="citizen-wizard-actions">{step > 1 && <button type="button" className="button secondary" onClick={() => setStep(current => current - 1)}>{t("previous_step")}</button>}<button type="button" className="text-link" onClick={openHelp}>{t("citizen_help")}</button>{(title.trim() || description.trim()) && <span className="muted small">{t("draft_saved")}</span>}</div>
    </> : legacyFields}
  </MutationForm>;
}
