"use client";
// components/audit/AuditForm.tsx
// Input form for audit requests — GitHub URL or pasted text.

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

interface AuditFormProps {
  onSubmit: (data: { github_url?: string; pasted_text?: string }) => void;
  isLoading: boolean;
}

export function AuditForm({ onSubmit, isLoading }: AuditFormProps) {
  const [githubUrl, setGithubUrl] = useState("");
  const [pastedText, setPastedText] = useState("");
  const [activeTab, setActiveTab] = useState<"github" | "text">("github");
  const [urlError, setUrlError] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setUrlError("");
    if (activeTab === "github") {
      if (!githubUrl.trim()) {
        setUrlError("Enter a GitHub repository URL.");
        return;
      }
      try {
        const u = new URL(githubUrl.trim());
        if (u.hostname !== "github.com") {
          setUrlError("URL must be a github.com repository.");
          return;
        }
      } catch {
        setUrlError("Not a valid URL.");
        return;
      }
      onSubmit({ github_url: githubUrl.trim() });
    } else {
      if (!pastedText.trim() || pastedText.trim().length < 20) {
        setUrlError("Paste at least 20 characters to audit.");
        return;
      }
      onSubmit({ pasted_text: pastedText.trim() });
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Tabs
        value={activeTab}
        onValueChange={(v) => {
          setActiveTab(v as "github" | "text");
          setUrlError("");
        }}
      >
        <TabsList className="w-full">
          <TabsTrigger value="github" className="flex-1">
            GitHub Repository
          </TabsTrigger>
          <TabsTrigger value="text" className="flex-1">
            Paste Text
          </TabsTrigger>
        </TabsList>

        <TabsContent value="github" className="space-y-2 mt-4">
          <Label htmlFor="github-url">GitHub Repository URL</Label>
          <input
            id="github-url"
            type="url"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            placeholder="https://github.com/owner/repo"
            value={githubUrl}
            onChange={(e) => setGithubUrl(e.target.value)}
            disabled={isLoading}
          />
          <p className="text-xs text-muted-foreground">
            Public repositories only. Analysis covers repository metadata and README.
            Full source code is NOT fetched — ingestion is labeled PARTIAL.
          </p>
        </TabsContent>

        <TabsContent value="text" className="space-y-2 mt-4">
          <Label htmlFor="pasted-text">
            Paste content to audit
          </Label>
          <Textarea
            id="pasted-text"
            className="min-h-[200px] font-mono text-sm"
            placeholder="Paste a research claim, README, build plan, proposal excerpt, or any text you want audited for unsupported claims, gaps, and risks..."
            value={pastedText}
            onChange={(e) => setPastedText(e.target.value)}
            disabled={isLoading}
          />
          <p className="text-xs text-muted-foreground">
            Analysis is limited to the pasted content. External references are not fetched.
          </p>
        </TabsContent>
      </Tabs>

      {urlError && (
        <p className="text-sm text-destructive" role="alert">
          {urlError}
        </p>
      )}

      <Button type="submit" disabled={isLoading} className="w-full">
        {isLoading ? "Auditing..." : "Run Professional Skeptic Audit"}
      </Button>
    </form>
  );
}
