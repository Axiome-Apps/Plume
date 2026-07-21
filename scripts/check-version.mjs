#!/usr/bin/env node
// Garde de cohérence : les 4 fichiers de version doivent s'accorder, et — en release —
// coïncider avec le tag poussé. Miroir léger du drift-guard d'echoppe : attrape une
// édition manuelle divergente dès la CI, avant qu'un binaire mal versionné ne parte.
//
//   node scripts/check-version.mjs                 # les 4 fichiers sont-ils alignés ?
//   node scripts/check-version.mjs --expect v0.7.0 # …et valent-ils la version du tag ?

import { TARGETS, isValidVersion, readVersion } from "./versions.mjs";

function fail(message) {
  console.error(`✗ ${message}`);
  process.exit(1);
}

const expectFlag = process.argv.indexOf("--expect");
// Tolère la forme taggée `vX.Y.Z` comme la forme nue `X.Y.Z`.
const expected =
  expectFlag !== -1 ? (process.argv[expectFlag + 1] ?? "").replace(/^v/, "") : undefined;

const found = TARGETS.map((target) => ({ label: target.label, version: readVersion(target) }));

const distinct = [...new Set(found.map((f) => f.version))];
if (distinct.length > 1) {
  const detail = found.map((f) => `  ${f.label} → ${f.version}`).join("\n");
  fail(`Versions divergentes entre les fichiers :\n${detail}\n→ lancer 'pnpm bump' plutôt qu'éditer à la main.`);
}

const [version] = distinct;
if (!isValidVersion(version)) fail(`Version invalide : « ${version} » (attendu major.minor.patch).`);

if (expected !== undefined && version !== expected) {
  fail(`Le tag (v${expected}) ne correspond pas aux fichiers (v${version}).`);
}

console.log(`✓ Version cohérente sur les 4 fichiers : v${version}${expected !== undefined ? " (== tag)" : ""}`);
