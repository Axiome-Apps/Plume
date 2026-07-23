#!/usr/bin/env node
// Updates the Homebrew cask (version + per-architecture SHA256) from a release's artifacts.
// Called by the `homebrew` job in release.yml. Each SHA is rewritten INSIDE its own block
// (`on_arm` / `on_intel`), so the two architectures can never be crossed.
//
//   node scripts/update-cask.mjs <path/plume.rb> <version> <armSha256> <intelSha256>

import { readFileSync, writeFileSync } from "node:fs";

function fail(message) {
  console.error(`✗ ${message}`);
  process.exit(1);
}

const [caskPath, version, armSha, intelSha] = process.argv.slice(2);
if (!caskPath || !version || !armSha || !intelSha) {
  fail("Usage: node scripts/update-cask.mjs <path/plume.rb> <version> <armSha256> <intelSha256>");
}

let content = readFileSync(caskPath, "utf8");

const replaceOnce = (pattern, replacement, what) => {
  const updated = content.replace(pattern, replacement);
  if (updated === content) fail(`Pattern not found in the cask: ${what}`);
  content = updated;
};

replaceOnce(/(\n\s*version ")[^"]+(")/, `$1${version}$2`, "version");
// sha256 inside the on_arm { … } block (arm comes first in the cask).
replaceOnce(/(on_arm do[\s\S]*?sha256 ")[0-9a-f]+(")/, `$1${armSha}$2`, "sha256 on_arm");
replaceOnce(/(on_intel do[\s\S]*?sha256 ")[0-9a-f]+(")/, `$1${intelSha}$2`, "sha256 on_intel");

writeFileSync(caskPath, content);
console.log(`✓ Cask updated: plume ${version}`);
