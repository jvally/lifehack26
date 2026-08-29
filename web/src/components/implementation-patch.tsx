"use client";

import { useState } from "react";

export function ImplementationPatch({ productId, offlineDemo }: { productId: string; offlineDemo: boolean }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const download = async () => {
    setBusy(true); setMessage(null);
    try {
      const response = await fetch(`/api/products/${productId}/changes`);
      if (!response.ok) throw new Error("Save seller improvements before exporting an implementation patch.");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a"); link.href = url; link.download = `${productId}-implementation-patch.json`; link.click(); URL.revokeObjectURL(url);
      setMessage("Implementation patch downloaded. Import the approved fields into your PIM or commerce system.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not create the implementation patch."); }
    finally { setBusy(false); }
  };
  if (offlineDemo) return null;
  return <section className="surface-card p-5" aria-labelledby="implementation-heading"><p className="text-xs font-bold uppercase tracking-widest text-blue-700">Make it executable</p><h2 id="implementation-heading" className="mt-1 text-xl font-semibold">Implementation patch</h2><p className="mt-2 text-sm text-slate-600">Download the approved before-and-after fields as a machine-readable change set for your product database.</p><button type="button" onClick={() => void download()} disabled={busy} className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{busy ? "Preparing patch…" : "Download implementation patch"}</button>{message && <p className="mt-3 text-xs text-slate-600" role="status">{message}</p>}</section>;
}
