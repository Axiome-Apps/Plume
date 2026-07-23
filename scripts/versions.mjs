// Single source of truth for where versions live, plus read/write helpers.
// The canonical version lives in package.json; the three other files are mirrors, propagated
// by bump.mjs and verified by check-version.mjs. Editing one of them by hand is exactly the
// class of bug this module removes.

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

const SEMVER = /^(\d+)\.(\d+)\.(\d+)(?:-[0-9A-Za-z.-]+)?$/;

// Each target knows how to extract and rewrite ITS version in ITS format, without touching the
// rest of the file (dependencies also carry `version = "…"` lines that must never be hit).
export const TARGETS = [
  {
    label: "package.json",
    file: join(ROOT, "package.json"),
    // First root-level "version" key (deps are written "^x.y.z", never bare here).
    pattern: /(\n {2}"version":\s*")([^"]+)(")/,
  },
  {
    label: "src-tauri/tauri.conf.json",
    file: join(ROOT, "src-tauri", "tauri.conf.json"),
    pattern: /(\n {2}"version":\s*")([^"]+)(")/,
  },
  {
    label: "src-tauri/Cargo.toml",
    file: join(ROOT, "src-tauri", "Cargo.toml"),
    // The package version, scoped to the [package] block so dependencies are ignored.
    pattern: /(\[package\][\s\S]*?\nversion = ")([^"]+)(")/,
  },
  {
    label: "src-tauri/Cargo.lock",
    file: join(ROOT, "src-tauri", "Cargo.lock"),
    // The entry for the `plume` crate itself (unique in the lockfile).
    pattern: /(name = "plume"\nversion = ")([^"]+)(")/,
  },
];

export const README = join(ROOT, "README.md");

export function isValidVersion(value) {
  return SEMVER.test(value);
}

export function readVersion(target) {
  const content = readFileSync(target.file, "utf8");
  const match = content.match(target.pattern);
  if (!match) throw new Error(`No version found in ${target.label}`);
  return match[2];
}

// The canonical version is the one in package.json (the first TARGET).
export function readCanonicalVersion() {
  return readVersion(TARGETS[0]);
}

export function writeVersion(target, next) {
  const content = readFileSync(target.file, "utf8");
  const updated = content.replace(target.pattern, `$1${next}$3`);
  if (updated === content) throw new Error(`No replacement made in ${target.label}`);
  writeFileSync(target.file, updated);
}
