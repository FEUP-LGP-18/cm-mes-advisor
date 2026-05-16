"use client";

import { useState } from "react";

export default function CopyProjectLinkButton({
  projectId,
}: {
  projectId: string;
}) {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">(
    "idle",
  );

  async function handleCopy() {
    const path = `/projects/${encodeURIComponent(projectId)}`;
    const link =
      typeof window === "undefined" ? path : `${window.location.origin}${path}`;

    let wasCopied = false;
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(link);
        wasCopied = true;
      } else {
        wasCopied = copyWithFallback(link);
      }
    } catch {
      wasCopied = copyWithFallback(link);
    }

    setCopyState(wasCopied ? "copied" : "failed");
    window.setTimeout(() => setCopyState("idle"), 1600);
  }

  const label =
    copyState === "copied"
      ? "Project link copied"
      : copyState === "failed"
        ? "Copy unavailable"
        : "Copy project link";

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="focus-premium theme-shell-button-secondary rounded-xl px-3 py-2 text-xs font-semibold transition"
      aria-live="polite"
    >
      {label}
    </button>
  );
}

function copyWithFallback(value: string) {
  const textArea = document.createElement("textarea");
  textArea.value = value;
  textArea.setAttribute("readonly", "true");
  textArea.style.position = "fixed";
  textArea.style.opacity = "0";
  document.body.appendChild(textArea);
  textArea.select();

  try {
    return document.execCommand("copy");
  } finally {
    textArea.remove();
  }
}
