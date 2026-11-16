"use client";

import { useRef, useState } from "react";
import { useStore } from "@/lib/store";
import { validateImport } from "@/lib/import-export";
import type { AppState } from "@/lib/types";
import { Button, Card, Input } from "@/components/ui";

export default function BackupPage() {
  const { state, loaded, setAll, setLastExportAt } = useStore();
  const [preview, setPreview] = useState<AppState | null>(null);
  const [importErr, setImportErr] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  if (!loaded) return <p className="text-muted-foreground">Loading.</p>;

  const exportJson = () => {
    const iso = new Date().toISOString();
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pot-backup-${iso.slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setLastExportAt(iso);
  };

  const onFile = async (f: File | undefined) => {
    setImportErr("");
    setPreview(null);
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) {
      setImportErr("File is too large. Maximum 5 MB.");
      return;
    }
    try {
      const text = await f.text();
      const data = JSON.parse(text);
      const r = validateImport(data);
      if (!r.ok) {
        setImportErr(r.error);
        return;
      }
      setPreview(r.state);
    } catch {
      setImportErr("File is not valid JSON.");
    }
  };

  const settled = preview?.campaigns.filter((c) => c.status === "settled").length ?? 0;
  const active = preview?.campaigns.filter((c) => c.status === "active").length ?? 0;

  return (
    <div>
      <h1 className="text-3xl font-semibold">Backup</h1>
      <p className="mt-3 text-muted-foreground">
        Your data lives in Supabase when configured, and in this browser otherwise. Clearing site data erases the local copy. Export a backup now and then.
      </p>

      <Card className="mt-4">
        <p className="font-semibold">Export</p>
        <p className="mt-1 text-muted-foreground">Last backup: {state.meta.lastExportAt ?? "never"}</p>
        <Button className="mt-3" onClick={exportJson}>
          Export backup
        </Button>
      </Card>

      <Card className="mt-4">
        <p className="font-semibold">Import</p>
        <Input
          ref={fileRef}
          type="file"
          accept=".json,application/json"
          className="mt-3"
          onChange={(e) => onFile(e.target.files?.[0])}
        />
        {importErr && <p className="mt-2 border-l-2 border-primary pl-2.5 text-sm">{importErr}</p>}
        {preview && (
          <div className="mt-3">
            <p>
              {preview.campaigns.length} campaigns ({settled} settled, {active} active).
            </p>
            <p className="mt-1 text-muted-foreground">This replaces everything currently stored.</p>
            <Button
              className="mt-3"
              onClick={() => {
                setAll(preview);
                setPreview(null);
                if (fileRef.current) fileRef.current.value = "";
              }}
            >
              Replace everything
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
