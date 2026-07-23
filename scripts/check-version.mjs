#!/usr/bin/env node
// Consistency guard: the 4 version files must agree and — during a release — match the pushed
// tag. A lightweight mirror of echoppe's drift guard: catches a divergent hand edit in CI,
// before a mis-versioned binary ever ships.
//
//   node scripts/check-version.mjs                 # are the 4 files aligned?
//   node scripts/check-version.mjs --expect v0.7.0 # …and do they match the tag?

import { TARGETS, isValidVersion, readVersion } from "./versions.mjs";

function fail(message) {
  console.error(`✗ ${message}`);
  process.exit(1);
}

const expectFlag = process.argv.indexOf("--expect");
// Accepts the tagged form `vX.Y.Z` as well as the bare `X.Y.Z`.
const expected =
  expectFlag !== -1 ? (process.argv[expectFlag + 1] ?? "").replace(/^v/, "") : undefined;

const found = TARGETS.map((target) => ({ label: target.label, version: readVersion(target) }));

const distinct = [...new Set(found.map((f) => f.version))];
if (distinct.length > 1) {
  const detail = found.map((f) => `  ${f.label} → ${f.version}`).join("\n");
  fail(`Versions diverge between files:\n${detail}\n→ run 'pnpm bump' instead of editing by hand.`);
}

const [version] = distinct;
if (!isValidVersion(version)) fail(`Invalid version: "${version}" (expected major.minor.patch).`);

if (expected !== undefined && version !== expected) {
  fail(`The tag (v${expected}) does not match the files (v${version}).`);
}

console.log(
  `✓ Version consistent across the 4 files: v${version}${expected !== undefined ? " (== tag)" : ""}`
);
