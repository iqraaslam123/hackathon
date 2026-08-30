"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import robotSrc from "../../../robot.png";

type Msg = { from: "bot" | "user"; text: string };

const WELCOME: Msg = {
  from: "bot",
  text: "Assalam o Alaikum! 👋 Main SupportFlow assistant hoon. Pricing, refunds, warranty, tickets — kuch bhi pooch sakte hain. Mic 🎤 se bol kar bhi pooch sakte hain, aur main jawab bhi awaaz mein de dunga 🔉.",
};

type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((e: unknown) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
};

function stripEmoji(text: string): string {
  return text.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/gu, "");
}

export function ChatBot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [suggestCreate, setSuggestCreate] = useState(false);
  const [voiceOn, setVoiceOn] = useState(true);
  const [listening, setListening] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  const ttsAvailable =
    typeof window !== "undefined" && "speechSynthesis" in window;
  const sttAvailable =
    typeof window !== "undefined" &&
    (("SpeechRecognition" in window) ||
      ("webkitSpeechRecognition" in window));

  useEffect(() => {
    if (open) {
      listRef.current?.scrollTo({
        top: listRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [open, messages, typing]);

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
      if (ttsAvailable) window.speechSynthesis.cancel();
    };
  }, [ttsAvailable]);

  function speak(text: string) {
    if (!ttsAvailable || !text) return;
    try {
      const synth = window.speechSynthesis;
      synth.cancel();
      const utter = new SpeechSynthesisUtterance(stripEmoji(text));
      utter.lang = "ur-PK";
      const urduVoice = synth
        .getVoices()
        .find((v) => v.lang?.toLowerCase().startsWith("ur"));
      if (urduVoice) utter.voice = urduVoice;
      utter.rate = 0.95;
      synth.speak(utter);
    } catch {
      // speech unavailable — ignore
    }
  }

  function stopSpeaking() {
    if (ttsAvailable) window.speechSynthesis.cancel();
  }

  function startListening() {
    if (!sttAvailable) return;
    const SR =
      (window as unknown as Record<string, unknown>).SpeechRecognition ||
      (window as unknown as Record<string, unknown>).webkitSpeechRecognition;
    try {
      const rec = new SR() as SpeechRecognitionLike;
      rec.lang = "ur-PK";
      rec.interimResults = true;
      rec.continuous = false;
      rec.onresult = (e: unknown) => {
        const event = e as { results: ArrayLike<ArrayLike<{ transcript?: string }>> };
        let text = "";
        for (const result of Array.from(event.results)) {
          text += result[0]?.transcript ?? "";
        }
        setInput(text);
      };
      rec.onend = () => {
        setListening(false);
        recognitionRef.current = null;
      };
      rec.onerror = () => {
        setListening(false);
        recognitionRef.current = null;
      };
      recognitionRef.current = rec;
      setListening(true);
      rec.start();
    } catch {
      setListening(false);
    }
  }

  function stopListening() {
    recognitionRef.current?.stop();
    setListening(false);
  }

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || typing) return;

    stopSpeaking();
    setMessages((m) => [...m, { from: "user", text }]);
    setInput("");
    setTyping(true);
    setSuggestCreate(false);

    try {
      const res = await fetch("/api/chatbot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      const data = await res.json();
      const reply = data.reply || "Sorry, I couldn't understand that.";
      setMessages((m) => [...m, { from: "bot", text: reply }]);
      setSuggestCreate(Boolean(data.suggestCreate));
      if (voiceOn) speak(reply);
    } catch {
      const reply = "Something went wrong. Please try again.";
      setMessages((m) => [...m, { from: "bot", text: reply }]);
      if (voiceOn) speak(reply);
    } finally {
      setTyping(false);
    }
  }

  return (
    <div className="fixed bottom-5 right-5 z-40 flex flex-col items-end">
      {open ? (
        <div className="mb-3 flex h-[440px] w-[92vw] max-w-sm flex-col overflow-hidden rounded-3xl border border-white/15 bg-black/50 shadow-2xl backdrop-blur-xl">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <div className="flex items-center gap-2">
              <Image
                src={robotSrc}
                alt="SupportFlow robot assistant"
                width={32}
                height={32}
                className="h-8 w-8 rounded-full border border-white/20 object-cover"
              />
              <div>
                <p className="text-sm font-bold">SupportFlow Assistant</p>
                <p className="text-[11px] text-white/50">Roman Urdu + Voice</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  const next = !voiceOn;
                  setVoiceOn(next);
                  if (!next) stopSpeaking();
                }}
                aria-label={voiceOn ? "Turn voice off" : "Turn voice on"}
                title={voiceOn ? "Voice replies on" : "Voice replies off"}
                className={`rounded-lg px-2 py-1 text-xs transition-colors ${
                  voiceOn
                    ? "bg-grad-yellow/20 text-grad-yellow"
                    : "text-white/50 hover:bg-white/10"
                }`}
              >
                🔉
              </button>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close chat"
                className="rounded-lg px-2 py-1 text-xs text-white/60 transition-colors hover:bg-white/10 hover:text-white"
              >
                ✕
              </button>
            </div>
          </div>

          <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`flex items-end gap-2 ${
                  m.from === "user" ? "justify-end" : "justify-start"
                }`}
              >
                {m.from === "bot" ? (
                  <Image
                    src={robotSrc}
                    alt=""
                    width={24}
                    height={24}
                    className="h-6 w-6 shrink-0 rounded-full border border-white/15 object-cover"
                  />
                ) : null}
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${
                    m.from === "user"
                      ? "bg-gradient-to-r from-grad-orange to-grad-red text-white"
                      : "border border-white/10 bg-white/5 text-white/85"
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <span className="whitespace-pre-wrap">{m.text}</span>
                    {m.from === "bot" ? (
                      <button
                        onClick={() => speak(m.text)}
                        aria-label="Play reply"
                        title="Play reply (voice)"
                        className="shrink-0 rounded-md px-1 text-xs text-white/40 transition-colors hover:bg-white/10 hover:text-grad-yellow"
                      >
                        🔊
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
            {typing ? (
              <div className="flex items-end gap-2">
                <Image
                  src={robotSrc}
                  alt=""
                  width={24}
                  height={24}
                  className="h-6 w-6 shrink-0 rounded-full border border-white/15 object-cover"
                />
                <div className="inline-flex items-center gap-1 rounded-2xl border border-white/10 bg-white/5 px-3.5 py-2.5">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-white/60" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-white/60 [animation-delay:100ms]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-white/60 [animation-delay:200ms]" />
                </div>
              </div>
            ) : null}
          </div>

          {suggestCreate ? (
            <div className="border-t border-white/10 px-4 py-2">
              <a
                href="/dashboard/customer"
                className="btn-primary w-full! px-4! py-2! text-xs"
              >
                Open a ticket →
              </a>
            </div>
          ) : null}

          <form onSubmit={send} className="flex items-center gap-2 border-t border-white/10 p-3">
            {sttAvailable ? (
              <button
                type="button"
                onClick={listening ? stopListening : startListening}
                aria-label={listening ? "Stop listening" : "Speak your message"}
                title="Speak your message (Roman Urdu)"
                className={`shrink-0 rounded-xl border px-3 py-2 text-sm transition-colors ${
                  listening
                    ? "border-grad-red bg-grad-red/30 text-white"
                    : "border-white/15 bg-white/5 text-white/70 hover:border-grad-yellow/60"
                }`}
              >
                {listening ? "⏹" : "🎤"}
              </button>
            ) : null}
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Roman Urdu mein likhein ya mic se bolein..."
              className="input-outline flex-1! py-2! text-sm"
            />
            <button
              type="submit"
              disabled={typing || !input.trim()}
              className="btn-primary w-auto! px-4! py-2! text-sm"
              aria-label="Send message"
            >
              Send
            </button>
          </form>
        </div>
      ) : null}

      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close chat" : "Open chat"}
        className="flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-full bg-gradient-to-r from-grad-yellow via-grad-orange to-grad-red p-1.5 text-xl font-bold text-white shadow-xl ring-2 ring-white/20 transition-transform hover:scale-105"
      >
        {open ? (
          <span className="flex h-full w-full items-center justify-center rounded-full bg-gradient-to-r from-grad-yellow via-grad-orange to-grad-red text-2xl font-bold text-white">
            ✕
          </span>
        ) : (
          <Image
            src={robotSrc}
            alt="SupportFlow robot"
            width={64}
            height={64}
            className="h-full w-full rounded-full object-cover"
          />
        )}
      </button>
    </div>
  );
}