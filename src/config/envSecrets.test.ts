import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * Régression RILES-009 : aucune clé (ni fragment de clé) ne doit rester en dur
 * dans le dépôt. La configuration vient exclusivement de l'environnement —
 * modèle : `.env.example`, `.env` n'est pas versionné.
 *
 * Les motifs sont construits par concaténation pour que ce fichier de test ne
 * contienne lui-même aucun de ces fragments (il est scanné par le test ci-dessous).
 */

/** Fragments interdits partout dans le code et la configuration versionnée. */
const FORBIDDEN_ANYWHERE = [
  // Préfixe JWT (forme historique de la clé anon Supabase)
  ["ey", "J"].join(""),
  // Ancien fallback de clé anon en dur
  ["sample_dev", "_anon_key"].join(""),
  // Référentiel projet Supabase exposé
  ["bjktaw", "rigqjshmayutac"].join(""),
];

/** Fragments de clés supplémentaires interdits dans src/ et app/. */
const FORBIDDEN_IN_SRC = [
  ...FORBIDDEN_ANYWHERE,
  // Préfixe d'une clé PostHog
  ["ph", "c_"].join(""),
  // Préfixe d'une clé publishable Supabase
  ["sb_publish", "able_"].join(""),
];

/** Uniquement des placeholders acceptables dans .env.example. */
const PLACEHOLDER_PATTERN = /your_|localhost|eu\.i\.posthog\.com/;

function collectSourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      out.push(...collectSourceFiles(full));
    } else if (/\.(ts|tsx)$/.test(entry)) {
      out.push(full);
    }
  }
  return out;
}

describe("no secret literal remains in the source tree (RILES-009)", () => {
  const repoRoot = fileURLToPath(new URL("../..", import.meta.url));

  it("scans src/ and app/ for hardcoded key fragments", () => {
    const files = [
      ...collectSourceFiles(resolve(repoRoot, "src")),
      ...collectSourceFiles(resolve(repoRoot, "app")),
    ];

    expect(files.length).toBeGreaterThan(30);

    const offenders: string[] = [];
    for (const file of files) {
      const content = readFileSync(file, "utf8");
      for (const marker of FORBIDDEN_IN_SRC) {
        if (content.includes(marker)) {
          offenders.push(`${file} contains ${marker}`);
        }
      }
    }

    expect(offenders).toEqual([]);
  });

  it("ignores .env in git and ships a placeholder-only .env.example", () => {
    const gitignore = readFileSync(join(repoRoot, ".gitignore"), "utf8");
    expect(gitignore).toMatch(/^\.env$/m);
    expect(gitignore).toContain("!.env.example");

    const example = readFileSync(join(repoRoot, ".env.example"), "utf8");

    // Aucun identifiant réel ne figure dans le modèle versionné.
    const leaked = FORBIDDEN_ANYWHERE.filter((marker) =>
      example.includes(marker),
    );
    expect(leaked).toEqual([]);

    const values = example
      .split("\n")
      .filter((line) => line.includes("=") && !line.startsWith("#"))
      .map((line) => line.slice(line.indexOf("=") + 1).trim());

    expect(values.length).toBeGreaterThanOrEqual(5);
    expect(values.filter((value) => !PLACEHOLDER_PATTERN.test(value))).toEqual(
      [],
    );
  });
});
