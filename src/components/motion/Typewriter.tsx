"use client";

import { useEffect, useState } from "react";

export function Typewriter({
  phrases,
  typeSpeed = 65,
  deleteSpeed = 30,
  pause = 1600,
  startDelay = 400,
  loop = true,
  caretClassName = "",
}: {
  phrases: string[];
  typeSpeed?: number;
  deleteSpeed?: number;
  pause?: number;
  startDelay?: number;
  loop?: boolean;
  caretClassName?: string;
}) {
  const [text, setText] = useState("");
  const [idx, setIdx] = useState(0);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!phrases.length) return;
    const current = phrases[idx % phrases.length];
    let timeout: number;

    if (!deleting) {
      if (text === current) {
        if (!loop && idx === phrases.length - 1) return;
        timeout = window.setTimeout(() => setDeleting(true), pause);
      } else {
        const firstType = idx === 0 && text.length === 0;
        timeout = window.setTimeout(
          () => setText(current.slice(0, text.length + 1)),
          firstType ? startDelay : typeSpeed
        );
      }
    } else {
      if (text === "") {
        timeout = window.setTimeout(() => {
          setDeleting(false);
          setIdx((n) => n + 1);
        }, 150);
      } else {
        timeout = window.setTimeout(
          () => setText(current.slice(0, text.length - 1)),
          deleteSpeed
        );
      }
    }

    return () => window.clearTimeout(timeout);
  }, [text, deleting, idx, phrases, typeSpeed, deleteSpeed, pause, startDelay, loop]);

  return (
    <span>
      {text}
      <span className={`typing-caret ${caretClassName}`}>|</span>
    </span>
  );
}