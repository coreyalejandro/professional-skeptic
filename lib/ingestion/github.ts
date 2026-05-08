// lib/ingestion/github.ts
// Ingest public GitHub repository metadata via GitHub REST API.
// TRUTH LABEL: coverage is "partial" — metadata only (repo info + README + topics).
// Full file tree is NOT fetched unless explicitly implemented.
// Per INVARIANT_NO_FAKE_INGESTION_001: never claim full repo analysis.

import type { IngestionStatus } from "@/types";

export interface GitHubRepoMeta {
  name: string;
  full_name: string;
  description: string | null;
  language: string | null;
  topics: string[];
  default_branch: string;
  readme_content: string | null;
  has_issues: boolean;
  has_wiki: boolean;
  open_issues_count: number;
  stargazers_count: number;
  forks_count: number;
  license: string | null;
  created_at: string;
  updated_at: string;
  pushed_at: string;
  size: number;
}

export interface GitHubIngestionResult {
  meta: GitHubRepoMeta | null;
  status: IngestionStatus;
  raw_url: string;
  error?: string;
}

function parseGitHubUrl(url: string): { owner: string; repo: string } | null {
  try {
    const u = new URL(url);
    if (u.hostname !== "github.com") return null;
    const parts = u.pathname.replace(/^\//, "").split("/");
    if (parts.length < 2) return null;
    return { owner: parts[0], repo: parts[1].replace(/\.git$/, "") };
  } catch {
    return null;
  }
}

export async function ingestGitHubRepo(
  url: string
): Promise<GitHubIngestionResult> {
  const parsed = parseGitHubUrl(url);
  if (!parsed) {
    return {
      meta: null,
      raw_url: url,
      error: "Invalid GitHub URL",
      status: {
        input_type: "github_url",
        coverage: "failed",
        files_fetched: [],
        known_unknowns: ["Could not parse owner/repo from URL"],
        notes: "URL parse failure — no API call made",
      },
    };
  }

  const { owner, repo } = parsed;
  const apiBase = `https://api.github.com/repos/${owner}/${repo}`;
  const headers: HeadersInit = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  if (process.env.GITHUB_TOKEN) {
    (headers as Record<string, string>)["Authorization"] =
      `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  try {
    const [repoRes, readmeRes] = await Promise.all([
      fetch(apiBase, { headers }),
      fetch(`${apiBase}/readme`, { headers }),
    ]);

    if (!repoRes.ok) {
      const msg =
        repoRes.status === 404
          ? "Repository not found or private"
          : `GitHub API error: ${repoRes.status}`;
      return {
        meta: null,
        raw_url: url,
        error: msg,
        status: {
          input_type: "github_url",
          coverage: "failed",
          files_fetched: [],
          known_unknowns: ["Repo metadata unavailable"],
          notes: msg,
        },
      };
    }

    const repoData = await repoRes.json();
    let readme_content: string | null = null;
    if (readmeRes.ok) {
      const readmeData = await readmeRes.json();
      if (readmeData.content) {
        readme_content = Buffer.from(readmeData.content, "base64").toString(
          "utf-8"
        );
      }
    }

    const meta: GitHubRepoMeta = {
      name: repoData.name,
      full_name: repoData.full_name,
      description: repoData.description,
      language: repoData.language,
      topics: repoData.topics ?? [],
      default_branch: repoData.default_branch,
      readme_content,
      has_issues: repoData.has_issues,
      has_wiki: repoData.has_wiki,
      open_issues_count: repoData.open_issues_count,
      stargazers_count: repoData.stargazers_count,
      forks_count: repoData.forks_count,
      license: repoData.license?.spdx_id ?? null,
      created_at: repoData.created_at,
      updated_at: repoData.updated_at,
      pushed_at: repoData.pushed_at,
      size: repoData.size,
    };

    const fetched = ["repo_metadata"];
    if (readme_content) fetched.push("README");

    return {
      meta,
      raw_url: url,
      status: {
        input_type: "github_url",
        coverage: "partial",
        files_fetched: fetched,
        known_unknowns: [
          "Source files not fetched",
          "Test suite not inspected",
          "CI configuration not fetched",
          "Dependency lock files not fetched",
          "Commit history not analyzed",
        ],
        notes:
          "Coverage is PARTIAL: only repository metadata and README were retrieved via GitHub REST API. Full file tree was NOT fetched. No source code was analyzed.",
      },
    };
  } catch (err) {
    return {
      meta: null,
      raw_url: url,
      error: String(err),
      status: {
        input_type: "github_url",
        coverage: "failed",
        files_fetched: [],
        known_unknowns: ["All repository content unavailable"],
        notes: `Network error: ${String(err)}`,
      },
    };
  }
}
