"use client";

import { useState } from "react";
import { Icon } from "./ui";

export function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="btn btn-sm btn-soft"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch {
          // Clipboard blocked; the text is still visible to select by hand.
        }
      }}
    >
      <Icon name={copied ? "check" : "content_copy"} className="text-[16px]" /> {copied ? "Copied" : "Copy"}
    </button>
  );
}
