"use client";

import { ChatCircleDots, PaperPlaneTilt, Sparkle, Trash, X } from "@phosphor-icons/react";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { ApiError, send } from "@/lib/api";
import type { ChatReply, ChatTurn } from "@/lib/types";
import { usePortal } from "./providers";

type ChatPage = "home" | "explore" | "challenge" | "auth" | "workspace" | "new_challenge" | "offers" | "analytics" | "organization" | "notifications" | "other";

function pageCategory(pathname: string): ChatPage {
  if (pathname === "/") return "home";
  if (pathname === "/challenges") return "explore";
  if (pathname.startsWith("/challenges/") || pathname.startsWith("/workspace/challenges/")) return "challenge";
  if (pathname === "/login" || pathname === "/register") return "auth";
  if (pathname === "/workspace/new") return "new_challenge";
  if (pathname === "/workspace/offers") return "offers";
  if (pathname === "/workspace/analytics") return "analytics";
  if (pathname === "/workspace/organization") return "organization";
  if (pathname === "/workspace/notifications") return "notifications";
  if (pathname.startsWith("/workspace")) return "workspace";
  return "other";
}

function storedMessages(value: string | null): ChatTurn[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(item => item && ["user", "assistant"].includes(item.role) && typeof item.content === "string" && item.content.length <= 1500).slice(-12);
  } catch {
    return [];
  }
}

export function ChatAssistant() {
  const { t, lang, user, authLoading } = usePortal();
  const pathname = usePathname();
  const identity = user?.id || "public";
  const storageKey = `jansetu-chat:${identity}:${lang}`;
  const previousIdentity = useRef<string | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesRef = useRef<HTMLDivElement>(null);
  const [loadedKey, setLoadedKey] = useState("");
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatTurn[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const [lastQuestion, setLastQuestion] = useState("");
  const role = user?.role || "public";
  const starters = [1, 2, 3].map(number => t(`chat_${role}_${number}`));

  useEffect(() => {
    if (authLoading) return;
    if (previousIdentity.current && previousIdentity.current !== identity) {
      sessionStorage.removeItem(`jansetu-chat:${previousIdentity.current}:en`);
      sessionStorage.removeItem(`jansetu-chat:${previousIdentity.current}:hi`);
      setOpen(false);
    }
    previousIdentity.current = identity;
    setMessages(storedMessages(sessionStorage.getItem(storageKey)));
    setSuggestions([]);
    setError(undefined);
    setLoadedKey(storageKey);
  }, [authLoading, identity, storageKey]);

  useEffect(() => {
    if (loadedKey === storageKey) sessionStorage.setItem(storageKey, JSON.stringify(messages.slice(-12)));
  }, [loadedKey, messages, storageKey]);

  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => inputRef.current?.focus());
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => { cancelAnimationFrame(frame); document.removeEventListener("keydown", onKeyDown); };
  }, [open]);

  useEffect(() => {
    if (open && messagesRef.current) messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
  }, [messages, open, pending]);

  function close() {
    setOpen(false);
    requestAnimationFrame(() => triggerRef.current?.focus());
  }

  async function ask(question: string, appendUser = true) {
    const message = question.trim();
    if (pending || message.length < 2) return;
    const prior = appendUser ? messages : messages.at(-1)?.role === "user" ? messages.slice(0, -1) : messages;
    if (appendUser) setMessages(current => [...current, { role: "user" as const, content: message }].slice(-12));
    setInput(""); setPending(true); setError(undefined); setLastQuestion(message); setSuggestions([]);
    try {
      const reply = await send<ChatReply>("/ai/chat", { message, language: lang, page: pageCategory(pathname), history: prior.slice(-6).map(({ role: turnRole, content }) => ({ role: turnRole, content })) });
      setMessages(current => [...current, { role: "assistant" as const, content: reply.answer, source: reply.source }].slice(-12));
      setSuggestions(reply.suggestions);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.code : "network_error");
    } finally {
      setPending(false);
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    void ask(input);
  }

  function inputKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  }

  function clear() {
    setMessages([]); setSuggestions([]); setError(undefined); setLastQuestion("");
    sessionStorage.removeItem(storageKey);
    inputRef.current?.focus();
  }

  return <div className="chat-assistant" data-open={open}>
    <button ref={triggerRef} className="chat-launcher" type="button" aria-label={t("chat_open")} aria-expanded={open} aria-controls="jansetu-advisor" onClick={() => setOpen(true)}><ChatCircleDots size={23} weight="fill" aria-hidden="true" /><span>{t("chat_title")}</span></button>
    <div className="chat-backdrop" aria-hidden="true" onClick={close} />
    <section id="jansetu-advisor" className="chat-panel" role="dialog" aria-modal="false" aria-labelledby="chat-title" aria-hidden={!open}>
      <header className="chat-header"><span className="chat-mark"><Sparkle size={20} weight="fill" aria-hidden="true" /></span><div><h2 id="chat-title">{t("chat_title")}</h2><p>{t("chat_subtitle")}</p></div><button className="chat-header-action" type="button" onClick={clear} disabled={!messages.length} aria-label={t("chat_clear")}><Trash size={18} aria-hidden="true" /></button><button className="chat-header-action" type="button" onClick={close} aria-label={t("chat_close")}><X size={20} aria-hidden="true" /></button></header>
      <div ref={messagesRef} className="chat-messages" aria-live="polite">
        {!messages.length && <div className="chat-welcome"><Sparkle size={26} weight="duotone" aria-hidden="true" /><p>{t("chat_intro")}</p><small>{t("chat_privacy")}</small></div>}
        {messages.map((message, index) => <article key={`${index}-${message.role}`} className={`chat-message chat-message-${message.role}`}><span className="sr-only">{t(message.role === "user" ? "chat_you" : "chat_advisor")}:</span><p>{message.content}</p>{message.role === "assistant" && message.source === "curated" && user && <small>{t("chat_fallback")}</small>}</article>)}
        {pending && <div className="chat-thinking" role="status"><span className="chat-spinner" aria-hidden="true" />{t("chat_thinking")}</div>}
        {error && <div className="chat-error" role="alert"><p>{t(error)}</p><button className="text-link" type="button" onClick={() => void ask(lastQuestion, false)}>{t("retry")}</button></div>}
      </div>
      {!pending && !error && <div className="chat-suggestions">{(suggestions.length ? suggestions : messages.length ? [] : starters).map(suggestion => <button key={suggestion} type="button" onClick={() => void ask(suggestion)}>{suggestion}</button>)}</div>}
      <form className="chat-composer" onSubmit={submit}><textarea ref={inputRef} value={input} onChange={event => setInput(event.target.value)} onKeyDown={inputKeyDown} placeholder={t("chat_placeholder")} aria-label={t("chat_placeholder")} minLength={2} maxLength={500} rows={2} disabled={pending} /><button type="submit" disabled={pending || input.trim().length < 2} aria-label={t("chat_send")}><PaperPlaneTilt size={20} weight="fill" aria-hidden="true" /></button></form>
    </section>
  </div>;
}
