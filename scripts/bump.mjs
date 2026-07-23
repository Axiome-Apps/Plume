#!/usr/bin/env node
// One-move release: bumps the version, propagates it to the 4 files + README links, commits,
// tags and pushes. The `vX.Y.Z` tag — and only it — triggers the release CI (advanced gate,
// then 4-platform builds). No binary is ever built outside this path.
//
//   pnpm bump patch                 # 0.6.0 → 0.6.1
//   pnpm bump minor                 # 0.6.0 → 0.7.0
//   pnpm bump major                 # 0.6.0 → 1.0.0
//   pnpm bump 0.7.0-beta.1          # explicit version
//   pnpm bump minor --dry           # preview, without committing or pushing
//
// While on 0.x, a breaking change is a `minor` — `major` is reserved for reaching 1.0.

import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { README, TARGETS, isValidVersion, readCanonicalVersion, writeVersion } from "./versions.mjs";

const LEVELS = ["patch", "minor", "major"];

function fail(message) {
  console.error(`✗ ${message}`);
  process.exit(1);
}

function git(...args) {
  return execFileSync("git", args, { encoding: "utf8" }).trim();
}

function nextVersion(current, arg) {
  if (isValidVersion(arg)) return arg;
  if (!LEVELS.includes(arg)) {
    fail(`Invalid argument: "${arg}" (expected ${LEVELS.join(" | ")} or an X.Y.Z version).`);
  }
  const [major, minor, patch] = current.split("-")[0].split(".").map(Number);
  if (arg === "major") return `${major + 1}.0.0`;
  if (arg === "minor") return `${major}.${minor + 1}.0`;
  return `${major}.${minor}.${patch + 1}`;
}

const dry = process.argv.includes("--dry");
const [levelArg] = process.argv.slice(2).filter((a) => a !== "--dry");
if (!levelArg) fail(`Usage: pnpm bump <${LEVELS.join("|")}|X.Y.Z> [--dry]`);

// Guardrails: release from main, clean working tree (the bump must be the only change carried
// along — everything else is already committed).
const branch = git("rev-parse", "--abbrev-ref", "HEAD");
if (branch !== "main") fail(`Refusing to release from "${branch}" — switch to main.`);

const dirty = git("status", "--porcelain");
if (dirty && !dry) fail(`Working tree is not clean — commit or stash before bumping:\n${dirty}`);

const current = readCanonicalVersion();
const next = nextVersion(current, levelArg);
if (next === current) fail(`Version is already ${next}.`);

const tag = `v${next}`;
if (git("tag", "--list", tag)) fail(`Tag ${tag} already exists.`);

for (const target of TARGETS) console.log(`  ${target.label}: ${current} → ${next}`);
console.log(`  README.md: download links → ${next}`);
console.log(`\n✓ Version ${current} → ${next}`);

if (dry) {
  console.log("(--dry) no file modified. Drop --dry to run the release.");
  process.exit(0);
}

// Propagate to the 4 version files + README links (…/vX.Y.Z/Plume_X.Y.Z_… URLs carry the version
// both tagged and bare).
for (const target of TARGETS) writeVersion(target, next);
const readme = readFileSync(README, "utf8");
writeFileSync(README, readme.split(current).join(next));

const files = [...TARGETS.map((t) => t.file), README];
git("add", ...files);
git("commit", "-m", `chore: release ${tag}`);
git("tag", tag);
git("push", "origin", "main");
git("push", "origin", tag);

console.log(`✓ ${tag} pushed — the release CI starts (advanced gate → 4-platform builds).`);
