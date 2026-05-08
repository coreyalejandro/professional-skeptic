// lib/ingestion/github.ts
// Ingest public GitHub repository via GitHub REST API.
// TRUTH LABEL: coverage is "partial" (metadata + README + key source files).
// Full file tree is fetched for structure; source content is sampled, not exhaustive.
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

export interface FetchedFile {
  path: string;
  content: string;
  size: number;
  truncated: boolean;
}

export interface GitHubIngestionResult {
  meta: GitHubRepoMeta | null;
  file_tree: string[];          // all paths in the repo (from git tree)
  fetched_files: FetchedFile[]; // actual content of sampled files
  status: IngestionStatus;
  raw_url: string;
  error?: string;
}

// --- constants ---
const MAX_FILE_BYTES = 50_000; // truncate individual files above 50 KB
const MAX_FILES_TO_FETCH = 20; // cap on files we fetch full content for
const MAX_TREE_PATHS = 500;    // cap on tree listing we include

// Patterns for files worth fetching content for, in priority order.
// Evaluated against file path using simple prefix/suffix matching.
const PRIORITY_PATTERNS: Array<{ test: (p: string) => boolean; label: string }> = [
  { test: (p) => p === "package.json",          label: "dependencies" },
  { test: (p) => p === "tsconfig.json",         label: "typescript_config" },
  { test: (p) => p === "next.config.mjs" || p === "next.config.js" || p === "next.config.ts", label: "nextjs_config" },
  { test: (p) => p === ".env.example" || p === ".env.sample", label: "env_docs" },
  { test: (p) => p.startsWith(".github/workflows/") && p.endsWith(".yml"), label: "ci_config" },
  { test: (p) => p.startsWith(".github/workflows/") && p.endsWith(".yaml"), label: "ci_config" },
  { test: (p) => p === "Dockerfile" || p === "docker-compose.yml" || p === "docker-compose.yaml", label: "container_config" },
  { test: (p) => p.startsWith("app/") && p.endsWith(".ts"),  label: "app_source" },
  { test: (p) => p.startsWith("app/") && p.endsWith(".tsx"), label: "app_source" },
  { test: (p) => p.startsWith("lib/") && p.endsWith(".ts"),  label: "lib_source" },
  { test: (p) => p.startsWith("types/") && p.endsWith(".ts"), label: "types" },
  { test: (p) => p.startsWith("tests/") || p.startsWith("__tests__/") || p.endsWith(".test.ts") || p.endsWith(".spec.ts"), label: "test_file" },
  { test: (p) => p.startsWith("scripts/") && (p.endsWith(".sh") || p.endsWith(".ts") || p.endsWith(".js")), label: "scripts" },
];

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

function buildHeaders(): HeadersInit {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  if (process.env.GITHUB_TOKEN) {
    headers["Authorization"] = `Bearer ${process.env.GITHUB_TOKEN}`;
  }
  return headers;
}

async function fetchReadme(
  apiBase: string,
  headers: HeadersInit
): Promise<string | null> {
  try {
    const res = await fetch(`${apiBase}/readme`, { headers });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.content) return null;
    return Buffer.from(data.content, "base64").toString("utf-8");
  } catch {
    return null;
  }
}

async function fetchFileTree(
  apiBase: string,
  defaultBranch: string,
  headers: HeadersInit
): Promise<string[]> {
  try {
    // First get the branch ref to get its tree SHA
    const branchRes = await fetch(`${apiBase}/branches/${defaultBranch}`, { headers });
    if (!branchRes.ok) return [];
    const branchData = await branchRes.json();
    const treeSha: string = branchData?.commit?.commit?.tree?.sha;
    if (!treeSha) return [];

    // Fetch recursive tree (flat listing of all blob paths)
    const treeRes = await fetch(
      `${apiBase}/git/trees/${treeSha}?recursive=1`,
      { headers }
    );
    if (!treeRes.ok) return [];
    const treeData = await treeRes.json();
    if (!Array.isArray(treeData.tree)) return [];

    return (treeData.tree as Array<{ path: string; type: string }>)
      .filter((item) => item.type === "blob")
      .map((item) => item.path)
      .slice(0, MAX_TREE_PATHS);
  } catch {
    return [];
  }
}

async function fetchFileContent(
  apiBase: string,
  filePath: string,
  headers: HeadersInit
): Promise<FetchedFile | null> {
  try {
    const res = await fetch(`${apiBase}/contents/${filePath}`, { headers });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.content || data.encoding !== "base64") return null;
    const full = Buffer.from(data.content, "base64").toString("utf-8");
    const truncated = full.length > MAX_FILE_BYTES;
    return {
      path: filePath,
      content: truncated ? full.slice(0, MAX_FILE_BYTES) + "\n[TRUNCATED]" : full,
      size: data.size ?? full.length,
      truncated,
    };
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
      file_tree: [],
      fetched_files: [],
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
  const headers = buildHeaders();

  try {
    // Parallel: repo metadata + README
    const [repoRes, readme_content] = await Promise.all([
      fetch(apiBase, { headers }),
      fetchReadme(apiBase, headers),
    ]);

    if (!repoRes.ok) {
      const msg =
        repoRes.status === 404
          ? "Repository not found or private"
          : `GitHub API error: ${repoRes.status}`;
      return {
        meta: null,
        file_tree: [],
        fetched_files: [],
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

    // Fetch file tree for structural awareness
    const file_tree = await fetchFileTree(apiBase, meta.default_branch, headers);

    // Select which files to fetch content for, in priority order, up to cap
    const selectedPaths: string[] = [];
    for (const pattern of PRIORITY_PATTERNS) {
      for (const path of file_tree) {
        if (pattern.test(path) && !selectedPaths.includes(path)) {
          selectedPaths.push(path);
          if (selectedPaths.length >= MAX_FILES_TO_FETCH) break;
        }
      }
      if (selectedPaths.length >= MAX_FILES_TO_FETCH) break;
    }

    // Fetch content in parallel batches (max 5 concurrent to avoid rate limit)
    const fetched_files: FetchedFile[] = [];
    for (let i = 0; i < selectedPaths.length; i += 5) {
      const batch = selectedPaths.slice(i, i + 5);
      const results = await Promise.all(
        batch.map((p) => fetchFileContent(apiBase, p, headers))
      );
      for (const f of results) {
        if (f) fetched_files.push(f);
      }
    }

    const fetched_labels = ["repo_metadata"];
    if (readme_content) fetched_labels.push("README");
    if (file_tree.length > 0) fetched_labels.push(`file_tree(${file_tree.length}_paths)`);
    for (const f of fetched_files) fetched_labels.push(f.path);

    const known_unknowns: string[] = [];
    if (file_tree.length === 0) {
      known_unknowns.push("File tree unavailable — could not enumerate repo structure");
    }
    const unfetched = file_tree.filter((p) => !selectedPaths.includes(p));
    if (unfetched.length > 0) {
      known_unknowns.push(
        `${unfetched.length} file(s) in tree not fetched (content sampling capped at ${MAX_FILES_TO_FETCH})`
      );
    }
    if (meta.size === 0) {
      known_unknowns.push("Repository size reported as 0 KB by GitHub API (possible CDN lag for new repos)");
    }
    known_unknowns.push("Binary files, images, and large assets not analyzed");
    known_unknowns.push("Commit history not analyzed");
    known_unknowns.push("Pull request and issue history not analyzed");

    // Coverage label: partial always — we never claim exhaustive analysis
    const coverage = fetched_files.length > 5 ? "partial" : "partial";

    return {
      meta,
      file_tree,
      fetched_files,
      raw_url: url,
      status: {
        input_type: "github_url",
        coverage,
        files_fetched: fetched_labels,
        known_unknowns,
        notes: `Coverage is PARTIAL: metadata, README, ${file_tree.length}-path file tree, and ${fetched_files.length} source file(s) sampled. Not exhaustive.`,
      },
    };
  } catch (err) {
    return {
      meta: null,
      file_tree: [],
      fetched_files: [],
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
