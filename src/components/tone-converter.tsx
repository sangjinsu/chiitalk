"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties, type FormEvent } from "react";
import { CHARACTERS, getCharacter, type CharacterId } from "@/lib/characters";
import type { ApiErrorResponse, ConvertRequest, ConvertResponse, SessionResponse } from "@/lib/contracts";

const MAX_CHARACTERS = 300;
const EXAMPLE_TEXT = "오늘 하루도 수고했어. 맛있는 거 먹고 푹 쉬자!";

function Icon({ name }: { name: "spark" | "copy" | "check" | "reset" }) {
  if (name === "spark") return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m12 3 2.6 6.4L21 12l-6.4 2.6L12 21l-2.6-6.4L3 12l6.4-2.6L12 3Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /></svg>;
  if (name === "copy") return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="8" y="8" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.7" /><path d="M15 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h3" stroke="currentColor" strokeWidth="1.7" /></svg>;
  if (name === "reset") return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 10a8 8 0 1 1 1.8 7M4 4v6h6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>;
  return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m5 12 4 4L19 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function serverMessage(value: unknown, fallback: string): string {
  if (value && typeof value === "object" && "error" in value) {
    const error = (value as ApiErrorResponse).error;
    if (error && typeof error.message === "string") return error.message;
  }
  return fallback;
}

function friendlyError(cause: unknown): string {
  if (cause instanceof TypeError || cause instanceof SyntaxError) {
    return "연결을 확인한 뒤 다시 시도해 주세요.";
  }
  return cause instanceof Error ? cause.message : "잠시 후 다시 시도해 주세요.";
}

async function loadSession(signal: AbortSignal): Promise<SessionResponse> {
  const response = await fetch("/api/session", { credentials: "same-origin", cache: "no-store", signal });
  const data: unknown = await response.json();
  if (!response.ok) throw new Error(serverMessage(data, "지금은 변환을 준비할 수 없어요. 잠시 후 다시 확인해 주세요."));
  return data as SessionResponse;
}

export function ToneConverter() {
  const [characterId, setCharacterId] = useState<CharacterId>("hachiware");
  const [text, setText] = useState("");
  const [session, setSession] = useState<SessionResponse | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [sessionError, setSessionError] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<(ConvertResponse & { characterId: CharacterId }) | null>(null);
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "failed">("idle");
  const submitting = useRef(false);
  const pending = useRef<AbortController | null>(null);
  const sessionRequest = useRef<AbortController | null>(null);
  const sessionRevision = useRef(0);
  const mounted = useRef(false);
  const textarea = useRef<HTMLTextAreaElement | null>(null);
  const character = getCharacter(characterId)!;
  const normalizedText = text.normalize("NFC");
  const length = Array.from(normalizedText).length;
  const tooLong = length > MAX_CHARACTERS;
  const quota = session?.quota;
  const exhausted = quota !== undefined && quota.remaining <= 0;
  const canSubmit = !busy && !sessionLoading && session !== null && !exhausted && !tooLong && normalizedText.trim().length > 0;
  const resetAt = quota?.resetAt;
  const resetDate = resetAt ? new Date(resetAt) : null;
  const resetLabel = resetDate && Number.isFinite(resetDate.getTime())
    ? new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", month: "long", day: "numeric", hour: "numeric", minute: "2-digit", hourCycle: "h23" }).format(resetDate)
    : "";

  const refreshSession = useCallback(async (afterConversion = false) => {
    if (!mounted.current || (submitting.current && !afterConversion)) return;
    // Coalesce focus/visibility events and manual checks into one GET.
    if (sessionRequest.current && !sessionRequest.current.signal.aborted) return;
    const controller = new AbortController();
    sessionRequest.current = controller;
    const revision = ++sessionRevision.current;
    setSessionLoading(true);
    setSessionError("");
    const timeout = window.setTimeout(() => controller.abort(), 15000);
    try {
      const nextSession = await loadSession(controller.signal);
      if (mounted.current && !controller.signal.aborted && revision === sessionRevision.current) setSession(nextSession);
    } catch (cause) {
      if (mounted.current && revision === sessionRevision.current) {
        setSession(null);
        setSessionError(controller.signal.aborted ? "연결이 오래 걸리고 있어요. 다시 확인해 주세요." : friendlyError(cause));
      }
    } finally {
      window.clearTimeout(timeout);
      if (sessionRequest.current === controller) sessionRequest.current = null;
      if (mounted.current && revision === sessionRevision.current) setSessionLoading(false);
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    // Defer setup so Strict Mode's probe does not issue an extra session request.
    const setup = window.setTimeout(() => { void refreshSession(); }, 0);
    return () => {
      mounted.current = false;
      window.clearTimeout(setup);
      sessionRequest.current?.abort();
      pending.current?.abort();
    };
  }, [refreshSession]);

  useEffect(() => {
    function checkWhenVisible() {
      if (document.visibilityState === "visible") void refreshSession();
    }
    window.addEventListener("focus", checkWhenVisible);
    document.addEventListener("visibilitychange", checkWhenVisible);
    return () => {
      window.removeEventListener("focus", checkWhenVisible);
      document.removeEventListener("visibilitychange", checkWhenVisible);
    };
  }, [refreshSession]);

  useEffect(() => {
    if (!resetAt || busy) return;
    const deadline = Date.parse(resetAt);
    if (!Number.isFinite(deadline)) return;
    let timer: number;
    let cancelled = false;
    function scheduleCheck() {
      // Monthly deadlines may exceed setTimeout's signed 32-bit limit.
      const delay = Math.max(250, Math.min(deadline - Date.now() + 250, 86400000));
      timer = window.setTimeout(() => {
        if (cancelled) return;
        if (Date.now() >= deadline) void refreshSession();
        else scheduleCheck();
      }, delay);
    }
    scheduleCheck();
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [resetAt, busy, refreshSession]);

  function chooseCharacter(next: CharacterId) {
    setCharacterId(next);
    setResult(null);
    setError("");
    setCopyStatus("idle");
  }

  async function convert(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current || !canSubmit || !session) return;
    submitting.current = true;
    // A conversion's newer quota must never be overwritten by an older GET.
    ++sessionRevision.current;
    sessionRequest.current?.abort();
    sessionRequest.current = null;
    setSessionLoading(false);
    setBusy(true);
    setError("");
    setResult(null);
    setCopyStatus("idle");
    const request: ConvertRequest = { characterId, text: normalizedText.trim() };
    const controller = new AbortController();
    pending.current = controller;
    const timeout = window.setTimeout(() => controller.abort(), 40000);
    try {
      const response = await fetch("/api/convert", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json", "Idempotency-Key": `${session.quota.period}:${crypto.randomUUID()}` },
        body: JSON.stringify(request),
        signal: controller.signal,
      });
      const data: unknown = await response.json();
      if (!mounted.current) return;
      if (!response.ok) {
        const failure = data as ApiErrorResponse;
        if (failure.quota) setSession({ mode: session.mode, quota: failure.quota });
        throw new Error(serverMessage(data, "문장을 바꾸지 못했어요. 잠시 후 다시 시도해 주세요."));
      }
      const conversion = data as ConvertResponse;
      setSession({ mode: conversion.mode, quota: conversion.quota });
      setResult({ ...conversion, characterId: request.characterId });
    } catch (cause) {
      if (!mounted.current) return;
      setError(controller.signal.aborted ? "응답이 오래 걸려 변환을 멈췄어요. 남은 횟수를 확인한 뒤 다시 시도해 주세요." : friendlyError(cause));
      // Refresh usage only; never resend a conversion automatically.
      await refreshSession(true);
    } finally {
      window.clearTimeout(timeout);
      pending.current = null;
      submitting.current = false;
      if (mounted.current) setBusy(false);
    }
  }

  async function copyResult() {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.result);
      if (mounted.current) setCopyStatus("copied");
    } catch {
      if (mounted.current) setCopyStatus("failed");
    }
  }

  function reset() {
    setText("");
    setResult(null);
    setError("");
    setCopyStatus("idle");
    textarea.current?.focus();
  }

  return (
    <form id="converter" className="converter" onSubmit={convert}>
      <fieldset className="character-fieldset" disabled={busy}>
        <legend><span className="step-number">1</span>누구의 말투로 바꿀까요?</legend>
        <p className="section-hint">각 친구의 원작 말투를 먼저 담아요.</p>
        <div className="character-grid">
          {CHARACTERS.map((friend) => (
            <label key={friend.id} className={`character-option ${characterId === friend.id ? "is-selected" : ""}`} style={{ "--character-tint": friend.tint } as CSSProperties}>
              <input type="radio" name="character" value={friend.id} checked={characterId === friend.id} onChange={() => chooseCharacter(friend.id)} />
              <span className="character-avatar" aria-hidden="true"><span>{friend.name.slice(0, 1)}</span><i /><i /></span>
              <span className="character-copy"><strong>{friend.name}</strong><span>{friend.description}</span></span>
              <span className="selection-check" aria-hidden="true"><Icon name="check" /></span>
            </label>
          ))}
        </div>
        <p className="fidelity-note"><span aria-hidden="true">✧</span>{character.fidelityNote}</p>
      </fieldset>

      <div className="workspace-grid">
        <section className="input-panel" aria-labelledby="input-title">
          <div className="panel-heading">
            <h2 id="input-title"><span className="step-number">2</span><label htmlFor="source-text">하고 싶은 말을 적어주세요</label></h2>
            <button className="example-button" type="button" disabled={busy} onClick={() => { setText(EXAMPLE_TEXT); setError(""); setCopyStatus("idle"); }}>예문 넣기</button>
          </div>
          <div className={`textarea-wrap ${tooLong ? "has-error" : ""}`}>
            <textarea ref={textarea} id="source-text" value={text} disabled={busy} aria-describedby="input-guidance input-counter input-error" aria-invalid={tooLong} placeholder={"오늘 하루도 수고했어.\n맛있는 거 먹고 푹 쉬자!"} onChange={(event) => { setText(event.target.value); setError(""); }} />
            <span id="input-counter" className={`character-counter ${tooLong ? "has-error" : ""}`}>{length}<span> / {MAX_CHARACTERS}자</span></span>
          </div>
          <div className="input-meta"><p id="input-guidance">짧은 일상 문장이 잘 어울려요.</p>{text.length > 0 && <button className="clear-button" type="button" disabled={busy} onClick={reset}>지우기</button>}</div>
          <p id="input-error" className="validation-message" aria-live="polite">{tooLong ? "300자 이하로 줄여주세요. 이모지도 한 글자로 세어요." : ""}</p>

          <button className="convert-button" type="submit" disabled={!canSubmit}>{busy ? <span className="loading-dot" aria-hidden="true" /> : <Icon name="spark" />}{busy ? "말투를 담고 있어요…" : `${character.name} 말투로 바꾸기`}</button>

          <div className="session-status" aria-live="polite">
            {sessionLoading ? <p>사용할 수 있는 횟수를 확인하고 있어요.</p> : sessionError ? <div className="session-error"><p>{sessionError}</p><button type="button" onClick={() => { void refreshSession(); }} disabled={busy}>다시 확인</button></div> : session && <p>{session.mode === "demo" && <span className="mode-label">미리보기</span>}{exhausted ? quota?.limitReason === "monthly" ? "이번 달 변환이 모두 사용되었어요. 다음 달에 다시 만나요." : "오늘 사용할 수 있는 횟수를 모두 썼어요. 내일 다시 만나요." : `오늘 ${quota?.remaining}번 더 바꿀 수 있어요.`}</p>}
            {!sessionLoading && !sessionError && session && <div className="quota-refresh">{exhausted && resetLabel && <p>{resetLabel} (한국 시간)에 다시 사용할 수 있어요.</p>}<button type="button" onClick={() => { void refreshSession(); }} disabled={busy}>횟수 다시 확인</button></div>}
          </div>
          {error && <p className="request-error" role="alert">{error}</p>}
        </section>

        <section className={`result-panel ${result ? "has-result" : ""}`} aria-labelledby="result-title" aria-busy={busy}>
          <div className="panel-heading"><h2 id="result-title"><span className="step-number">3</span>이렇게 말할 거예요</h2>{result && <span className="result-character">{getCharacter(result.characterId)?.name}</span>}</div>
          <div className="result-live" aria-live="polite" aria-atomic="true">
            {busy ? <div className="empty-result"><span className="empty-bubble is-loading" aria-hidden="true"><i /><i /><i /></span><p>{character.name}의 말투를<br />차근차근 담고 있어요.</p></div> : result ? <div className="result-content"><p className="result-text">{result.result}</p>{result.mode === "demo" && <p className="preview-note">미리보기 예시예요. 실제 변환에서는 문장에 맞춰 말투를 담아요.</p>}</div> : <div className="empty-result"><span className="empty-bubble" aria-hidden="true"><i /><i /><i /></span><p>같은 마음이<br />어떻게 들릴지 궁금하죠?</p><span>문장을 바꾸면 여기에 보여드릴게요.</span></div>}
          </div>
          {result && <div className="result-actions"><button className="copy-button" type="button" onClick={() => { void copyResult(); }}><Icon name={copyStatus === "copied" ? "check" : "copy"} />{copyStatus === "copied" ? "복사했어요" : "문장 복사"}</button><button className="reset-button" type="button" onClick={reset}><Icon name="reset" />새 문장</button></div>}
          <p className="copy-feedback" role="status">{copyStatus === "copied" ? "변환한 문장을 클립보드에 복사했어요." : copyStatus === "failed" ? "복사하지 못했어요. 위 문장을 직접 선택해 복사해 주세요." : ""}</p>
        </section>
      </div>
      <p className="privacy-note">입력한 문장과 변환 결과는 저장하지 않아요.</p>
    </form>
  );
}
