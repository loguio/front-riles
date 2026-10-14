import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * RILES-015 / RILES-017 — gardes statiques équivalentes aux critères
 * d'acceptation des issues : le grep du modèle fabriqué et celui de
 * l'identité de repli doivent renvoyer zéro résultat sous src/, et aucun
 * service ne doit importer les fixtures de `src/mock/`.
 *
 * Les littéraux sont construits par concaténation pour que ce fichier de test
 * ne contienne lui-même pas les chaînes qu'il interdit.
 */
const FORBIDDEN_LITERALS = [["riles", "pro", "engine"].join("-")];

const repoRoot = fileURLToPath(new URL("..", import.meta.url));

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

describe("mock honesty guards", () => {
  it("no service module imports fixtures from src/mock/", () => {
    const servicesDir = resolve(repoRoot, "src/services");
    const offenders: string[] = [];

    for (const entry of readdirSync(servicesDir)) {
      // Les fichiers de test ont le droit d'importer les fixtures.
      if (!/\.tsx?$/.test(entry) || /\.test\.tsx?$/.test(entry)) continue;
      const content = readFileSync(join(servicesDir, entry), "utf8");
      if (/from\s+["'][^"']*\/mock\//.test(content)) {
        offenders.push(entry);
      }
    }

    expect(offenders).toEqual([]);
  });

  it("no fabricated model name survives anywhere under src/", () => {
    const files = collectSourceFiles(resolve(repoRoot, "src"));
    expect(files.length).toBeGreaterThan(30);

    const offenders: string[] = [];
    for (const file of files) {
      const content = readFileSync(file, "utf8");
      for (const literal of FORBIDDEN_LITERALS) {
        if (content.includes(literal)) {
          offenders.push(`${file} contains ${literal}`);
        }
      }
    }

    expect(offenders).toEqual([]);
  });
});
