#!/usr/bin/env node
// Release « one-move » : bumpe la version, propage aux 4 fichiers + liens README, committe,
// tague et pousse. Le tag `vX.Y.Z` — et lui seul — déclenche la CI de release (gate avancée
// puis builds 4 plateformes). Aucun binaire n'est jamais construit hors de ce chemin.
//
//   pnpm bump patch                 # 0.6.0 → 0.6.1
//   pnpm bump minor                 # 0.6.0 → 0.7.0
//   pnpm bump major                 # 0.6.0 → 1.0.0
//   pnpm bump 0.7.0-beta.1          # version explicite
//   pnpm bump minor --dry           # prévisualise sans committer/pousser
//
// En 0.x, un changement cassant = `minor` (le `major` est réservé au passage 1.0).

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
    fail(`Argument invalide : « ${arg} » (attendu : ${LEVELS.join(" | ")} ou une version X.Y.Z).`);
  }
  const [major, minor, patch] = current.split("-")[0].split(".").map(Number);
  if (arg === "major") return `${major + 1}.0.0`;
  if (arg === "minor") return `${major}.${minor + 1}.0`;
  return `${major}.${minor}.${patch + 1}`;
}

const dry = process.argv.includes("--dry");
const [levelArg] = process.argv.slice(2).filter((a) => a !== "--dry");
if (!levelArg) fail(`Usage : pnpm bump <${LEVELS.join("|")}|X.Y.Z> [--dry]`);

// Garde-fous : release depuis main, working tree propre (le bump doit être le seul changement
// embarqué — le reste du travail déjà committé).
const branch = git("rev-parse", "--abbrev-ref", "HEAD");
if (branch !== "main") fail(`Release depuis « ${branch} » refusée — bascule sur main.`);

const dirty = git("status", "--porcelain");
if (dirty && !dry) fail(`Working tree non propre — committe ou stash avant de bumper :\n${dirty}`);

const current = readCanonicalVersion();
const next = nextVersion(current, levelArg);
if (next === current) fail(`La version est déjà ${next}.`);

const tag = `v${next}`;
if (git("tag", "--list", tag)) fail(`Le tag ${tag} existe déjà.`);

for (const target of TARGETS) console.log(`  ${target.label} : ${current} → ${next}`);
console.log(`  README.md : liens de téléchargement → ${next}`);
console.log(`\n✓ Version ${current} → ${next}`);

if (dry) {
  console.log("(--dry) aucun fichier modifié. Retire --dry pour lancer la release.");
  process.exit(0);
}

// Propage aux 4 fichiers de version + liens README (URLs …/vX.Y.Z/Plume_X.Y.Z_… : version nue et taggée).
for (const target of TARGETS) writeVersion(target, next);
const readme = readFileSync(README, "utf8");
writeFileSync(README, readme.split(current).join(next));

const files = [...TARGETS.map((t) => t.file), README];
git("add", ...files);
git("commit", "-m", `chore: release ${tag}`);
git("tag", tag);
git("push", "origin", "main");
git("push", "origin", tag);

console.log(`✓ ${tag} poussé — la CI de release démarre (gate avancée → builds 4 plateformes).`);
