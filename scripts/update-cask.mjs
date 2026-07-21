#!/usr/bin/env node
// Met à jour le cask Homebrew (version + SHA256 par architecture) depuis les artefacts d'une
// release. Appelé par le job `homebrew` de release.yml. Chaque SHA est réécrit DANS son bloc
// (`on_arm` / `on_intel`) pour ne jamais croiser les deux architectures.
//
//   node scripts/update-cask.mjs <path/plume.rb> <version> <armSha256> <intelSha256>

import { readFileSync, writeFileSync } from "node:fs";

function fail(message) {
  console.error(`✗ ${message}`);
  process.exit(1);
}

const [caskPath, version, armSha, intelSha] = process.argv.slice(2);
if (!caskPath || !version || !armSha || !intelSha) {
  fail("Usage : node scripts/update-cask.mjs <path/plume.rb> <version> <armSha256> <intelSha256>");
}

let content = readFileSync(caskPath, "utf8");

const replaceOnce = (pattern, replacement, what) => {
  const updated = content.replace(pattern, replacement);
  if (updated === content) fail(`Motif introuvable dans le cask : ${what}`);
  content = updated;
};

replaceOnce(/(\n\s*version ")[^"]+(")/, `$1${version}$2`, "version");
// sha256 à l'intérieur du bloc on_arm { … } (arm en premier dans le cask).
replaceOnce(/(on_arm do[\s\S]*?sha256 ")[0-9a-f]+(")/, `$1${armSha}$2`, "sha256 on_arm");
replaceOnce(/(on_intel do[\s\S]*?sha256 ")[0-9a-f]+(")/, `$1${intelSha}$2`, "sha256 on_intel");

writeFileSync(caskPath, content);
console.log(`✓ Cask mis à jour : plume ${version}`);
