// Source unique de vérité des emplacements de version + helpers de lecture/écriture.
// La version « canonique » vit dans package.json ; les trois autres fichiers en sont
// des miroirs propagés par bump.mjs et vérifiés par check-version.mjs. Éditer un seul
// endroit à la main est LA classe de bug que ce module supprime.

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

const SEMVER = /^(\d+)\.(\d+)\.(\d+)(?:-[0-9A-Za-z.-]+)?$/;

// Chaque cible sait extraire et réécrire SA version dans SON format, sans toucher au reste
// du fichier (les dépendances portent aussi des `version = "…"` qu'on ne doit jamais heurter).
export const TARGETS = [
  {
    label: "package.json",
    file: join(ROOT, "package.json"),
    // Première clé "version" de niveau racine (les deps sont en "^x.y.z", jamais nues ici).
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
    // Version du paquet, scoping sur le bloc [package] pour ignorer les deps.
    pattern: /(\[package\][\s\S]*?\nversion = ")([^"]+)(")/,
  },
  {
    label: "src-tauri/Cargo.lock",
    file: join(ROOT, "src-tauri", "Cargo.lock"),
    // L'entrée du crate `plume` lui-même (unique dans le lockfile).
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
  if (!match) throw new Error(`Version introuvable dans ${target.label}`);
  return match[2];
}

// Version canonique = celle de package.json (premier TARGET).
export function readCanonicalVersion() {
  return readVersion(TARGETS[0]);
}

export function writeVersion(target, next) {
  const content = readFileSync(target.file, "utf8");
  const updated = content.replace(target.pattern, `$1${next}$3`);
  if (updated === content) throw new Error(`Aucun remplacement effectué dans ${target.label}`);
  writeFileSync(target.file, updated);
}
