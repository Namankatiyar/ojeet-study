import fs from "node:fs/promises";
import path from "node:path";

const PROJECT_ROOT = process.cwd();
const SRC_ROOT = path.join(PROJECT_ROOT, "src");
const OUTPUT_FILE = "CONTEXT.md";
const CODE_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".css",
  ".scss",
  ".json",
]);

async function exists(target) {
  try {
    await fs.access(target);
    return true;
  } catch {
    return false;
  }
}

function toPosix(input) {
  return input.split(path.sep).join("/");
}

function getAllMatches(text, regex, pick = (m) => m[1]) {
  const matches = [];
  for (const match of text.matchAll(regex)) {
    const value = pick(match);
    if (value) matches.push(value.trim());
  }
  return matches;
}

function uniq(values) {
  return [...new Set(values)];
}

function summarizeText(text, limit = 280) {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return "";
  if (normalized.length <= limit) return normalized;
  return `${normalized.slice(0, limit - 3).trim()}...`;
}

function getTopImportRoots(imports) {
  const external = imports
    .filter((item) => !item.startsWith("."))
    .map((item) => item.split("/")[0]);
  return uniq(external).sort();
}

function fileKind(fileName) {
  if (fileName.endsWith(".tsx") || fileName.endsWith(".jsx")) return "UI component/module";
  if (fileName.endsWith(".css") || fileName.endsWith(".scss")) return "Styling";
  if (fileName.endsWith(".json")) return "Configuration/data";
  if (fileName.startsWith("use") && fileName.endsWith(".ts")) return "React hook";
  if (fileName.includes("service")) return "Service";
  if (fileName.includes("db")) return "Database";
  return "Logic module";
}

function inferPurpose(dirPath, fileSummaries) {
  const dirName = path.basename(dirPath);
  const lower = dirName.toLowerCase();

  if (lower === "pages") return "Route-level React pages that compose features into full screens.";
  if (lower === "components") return "Reusable UI building blocks shared across the app.";
  if (lower === "hooks") return "Custom React hooks for stateful behavior and side effects.";
  if (lower === "services") return "External integration and API-facing logic.";
  if (lower === "utils") return "Pure helpers and utility logic used by multiple modules.";
  if (lower === "db") return "Persistence models and client-side database access.";
  if (lower === "features") return "Feature domains that bundle related UI and logic.";

  const hasTsx = fileSummaries.some((item) => item.ext === ".tsx" || item.ext === ".jsx");
  const hasCss = fileSummaries.some((item) => item.ext === ".css" || item.ext === ".scss");
  const hasHooks = fileSummaries.some((item) => item.hooks.length > 0);

  if (hasTsx) return "React modules for presentation and interaction in this feature area.";
  if (hasHooks) return "Behavior-focused modules coordinating reusable state and effects.";
  if (hasCss) return "Styling assets for related modules in this directory.";
  return "Supporting modules for this area of the application.";
}

function parseFile(content, filePath, relativeToRoot) {
  const ext = path.extname(filePath).toLowerCase();

  const imports = uniq([
    ...getAllMatches(content, /import\s+[^'"]*?from\s+['"]([^'"]+)['"]/g),
    ...getAllMatches(content, /import\s*['"]([^'"]+)['"]/g),
  ]);

  const exportedSymbols = uniq([
    ...getAllMatches(content, /export\s+(?:const|function|class|type|interface|enum)\s+([A-Za-z0-9_]+)/g),
    ...getAllMatches(content, /export\s*{\s*([^}]+)\s*}/g, (m) => m[1].split(",")[0]?.trim()),
    ...getAllMatches(content, /export\s+default\s+function\s+([A-Za-z0-9_]+)/g),
  ]).filter(Boolean);

  const hooks = uniq(getAllMatches(content, /\b(use[A-Z][A-Za-z0-9_]*)\b/g)).sort();
  const functions = uniq([
    ...getAllMatches(content, /\bfunction\s+([A-Za-z0-9_]+)\s*\(/g),
    ...getAllMatches(content, /\bconst\s+([A-Za-z0-9_]+)\s*=\s*(?:async\s*)?\(/g),
    ...getAllMatches(content, /\bconst\s+([A-Za-z0-9_]+)\s*=\s*(?:async\s*)?[^=]*?=>/g),
  ]).filter((name) => !name.startsWith("use"));

  const comments = [
    ...getAllMatches(content, /\/\*\*([\s\S]{0,300}?)\*\//g, (m) => summarizeText(m[1], 160)),
    ...getAllMatches(content, /^\s*\/\/\s*(.+)$/gm, (m) => summarizeText(m[1], 120)),
  ].filter(Boolean);

  return {
    filePath,
    relativeToRoot: toPosix(relativeToRoot),
    fileName: path.basename(filePath),
    ext,
    imports,
    importRoots: getTopImportRoots(imports),
    exportedSymbols,
    hooks,
    functions,
    comments,
  };
}

function buildFileSummary(parsed) {
  const keySymbols = uniq([
    ...parsed.exportedSymbols,
    ...parsed.functions.filter((name) => /^[A-Z]/.test(name)),
  ]).slice(0, 5);

  const symbolLabel = keySymbols.length ? keySymbols.join(", ") : "No obvious exported symbols";
  const dependencyLabel = parsed.importRoots.length ? parsed.importRoots.join(", ") : "local modules only";
  const hookLabel = parsed.hooks.length ? `Hooks: ${parsed.hooks.join(", ")}` : "No hook usage detected";
  const noteLabel = parsed.comments.length ? `Notes: ${parsed.comments[0]}` : "";

  const lines = [
    `- **${parsed.fileName}** (${fileKind(parsed.fileName)}): ${symbolLabel}.`,
    `  - Dependencies: ${dependencyLabel}.`,
    `  - ${hookLabel}.`,
  ];

  if (noteLabel) lines.push(`  - ${noteLabel}`);
  return lines.join("\n");
}

function buildDataFlowSection(fileSummaries) {
  const internalImports = new Map();
  const externalDeps = new Set();

  for (const file of fileSummaries) {
    for (const imp of file.imports) {
      if (imp.startsWith(".")) {
        if (!internalImports.has(file.fileName)) internalImports.set(file.fileName, []);
        internalImports.get(file.fileName).push(imp);
      } else {
        externalDeps.add(imp.split("/")[0]);
      }
    }
  }

  const lines = [];
  lines.push("## Data Flow and Dependencies");

  if (externalDeps.size) {
    lines.push(`- External dependencies referenced here: ${[...externalDeps].sort().join(", ")}.`);
  } else {
    lines.push("- External dependencies referenced here: none.");
  }

  if (internalImports.size) {
    for (const [file, deps] of [...internalImports.entries()].sort(([a], [b]) => a.localeCompare(b))) {
      const joined = uniq(deps).sort().join(", ");
      lines.push(`- ${file} imports local modules: ${joined}.`);
    }
  } else {
    lines.push("- Internal module links: no local imports in this directory.");
  }

  return lines.join("\n");
}

function buildRiskSection(fileSummaries) {
  const risks = [];

  const sideEffectFiles = fileSummaries.filter((item) =>
    /\b(localStorage|sessionStorage|fetch|axios|Dexie|indexedDB|navigator\.|window\.)\b/.test(item.rawContent || "")
  );
  if (sideEffectFiles.length) {
    risks.push(
      `Files with side effects or environment coupling: ${sideEffectFiles.map((f) => f.fileName).sort().join(", ")}.`
    );
  }

  const anyFiles = fileSummaries.length > 0;
  if (anyFiles && !risks.length) {
    risks.push("No obvious high-risk patterns detected from static scan; validate with runtime tests.");
  }

  if (!anyFiles) {
    risks.push("Directory has no analyzable code files.");
  }

  return `## Risks / Follow-ups\n${risks.map((item) => `- ${item}`).join("\n")}`;
}

function buildContextContent(dirPath, fileSummaries) {
  const relativeDir = toPosix(path.relative(PROJECT_ROOT, dirPath)) || ".";
  const purpose = inferPurpose(dirPath, fileSummaries);

  const header = [
    `# Context: ${relativeDir}`,
    "",
    "## Purpose",
    `- ${purpose}`,
    `- Generated on: ${new Date().toISOString()}`,
    "",
    "## File Summaries",
  ];

  if (!fileSummaries.length) {
    header.push("- No code files found in this directory.");
  } else {
    for (const summary of fileSummaries.sort((a, b) => a.fileName.localeCompare(b.fileName))) {
      header.push(buildFileSummary(summary));
    }
  }

  const flow = buildDataFlowSection(fileSummaries);
  const risks = buildRiskSection(fileSummaries);

  return `${header.join("\n")}\n\n${flow}\n\n${risks}\n`;
}

async function listDirectories(rootDir) {
  const result = [];
  const queue = [rootDir];

  while (queue.length) {
    const current = queue.shift();
    result.push(current);
    const entries = await fs.readdir(current, { withFileTypes: true });
    for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
      if (!entry.isDirectory()) continue;
      if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
      queue.push(path.join(current, entry.name));
    }
  }

  return result;
}

async function listCodeFilesInDirectory(dirPath) {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((name) => name !== OUTPUT_FILE)
    .filter((name) => CODE_EXTENSIONS.has(path.extname(name).toLowerCase()))
    .sort((a, b) => a.localeCompare(b))
    .map((name) => path.join(dirPath, name));
}

async function buildSummariesForDirectory(dirPath) {
  const filePaths = await listCodeFilesInDirectory(dirPath);
  const summaries = [];

  for (const filePath of filePaths) {
    const content = await fs.readFile(filePath, "utf8");
    const parsed = parseFile(content, filePath, path.relative(PROJECT_ROOT, filePath));
    parsed.rawContent = content;
    summaries.push(parsed);
  }

  return summaries;
}

async function main() {
  if (!(await exists(SRC_ROOT))) {
    throw new Error(`Missing src directory at ${SRC_ROOT}`);
  }

  const directories = await listDirectories(SRC_ROOT);
  let generated = 0;

  for (const dirPath of directories) {
    const summaries = await buildSummariesForDirectory(dirPath);
    const context = buildContextContent(dirPath, summaries);
    const outputPath = path.join(dirPath, OUTPUT_FILE);
    await fs.writeFile(outputPath, context, "utf8");
    generated += 1;
  }

  // eslint-disable-next-line no-console
  console.log(`Generated ${generated} CONTEXT.md files under ${toPosix(path.relative(PROJECT_ROOT, SRC_ROOT))}.`);
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
