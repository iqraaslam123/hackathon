"use client";

import { useEffect } from "react";

function playVoice(text: string) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  try {
    const synth = window.speechSynthesis;
    synth.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = "ur-PK";
    const urduVoice = synth
      .getVoices()
      .find((v) => v.lang?.toLowerCase().startsWith("ur"));
    if (urduVoice) utter.voice = urduVoice;
    utter.rate = 0.95;
    synth.speak(utter);
  } catch {
    // ignore
  }
}

export function SpeakNotice({
  open,
  variant = "thanks",
  heading,
  sub,
  speakText,
  note,
  onClose,
}: {
  open: boolean;
  variant?: "thanks" | "congrats";
  heading: string;
  sub: string;
  speakText: string;
  note?: string;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    playVoice(speakText);
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [open, speakText]);

  if (!open) return null;

  const gradient =
    variant === "congrats"
      ? "from-emerald-400 to-teal-500"
      : "from-grad-orange to-grad-red";
  const emoji = variant === "congrats" ? "🎉" : "✅";

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="card-in relative w-full max-w-md overflow-hidden rounded-3xl border border-white/15 bg-gradient-to-b from-maroon-800 to-maroon-900 p-8 text-center shadow-2xl">
        <div className="absolute -top-16 left-1/2 h-44 w-44 -translate-x-1/2 rounded-full bg-gradient-to-r from-grad-yellow/40 to-grad-orange/40 blur-3xl" />
        <div
          className={`relative mx-auto flex h-20 w-20 animate-bounce items-center justify-center rounded-full bg-gradient-to-r ${gradient} text-4xl shadow-xl`}
        >
          {emoji}
        </div>
        <h2 className="relative mt-5 text-2xl font-extrabold">{heading}</h2>
        <p className="relative mt-2 text-sm leading-relaxed text-white/75">
          {sub}
        </p>
        {note ? (
          <p className="relative mt-3 break-words font-mono text-sm text-grad-yellow">
            {note}
          </p>
        ) : null}
        <button onClick={onClose} className="btn-primary relative mt-6 w-auto! px-8!">
          Done
        </button>
      </div>
    </div>
  );
}