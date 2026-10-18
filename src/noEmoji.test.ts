import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * Règle de design : aucun emoji dans l'app. Chaque symbole est une icône
 * `@expo/vector-icons` (Feather / Ionicons / MaterialCommunityIcons).
 * Même garde-fou que le pre-flight de la landing (`web-riles`, section 3.D).
 *
 * Les points de code sont exprimés en échappements pour que ce fichier de test
 * ne contienne pas lui-même les caractères qu'il interdit.
 */

const repoRoot = fileURLToPath(new URL("..", import.meta.url));
// Blocs pictographiques (emoji, dingbats, symboles) + indicateurs régionaux
// (drapeaux, U+1F1E6-U+1F1FF). Les sélecteurs de variante (U+FE0F) et le ZWJ
// (U+200D) sont volontairement hors classe : leur base est déjà couverte, et
// les garder ici déclencherait `no-misleading-character-class`.
const EMOJI = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}]/gu;

function collectFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      out.push(...collectFiles(full));
    } else if (/\.(ts|tsx|json)$/.test(entry)) {
      out.push(full);
    }
  }
  return out;
}

describe("no-emoji guard", () => {
  it("no emoji survives in app/ or src/ (use vector icons instead)", () => {
    const files = [
      ...collectFiles(resolve(repoRoot, "app")),
      ...collectFiles(resolve(repoRoot, "src")),
    ];
    expect(files.length).toBeGreaterThan(30);

    const offenders: string[] = [];
    for (const file of files) {
      readFileSync(file, "utf8")
        .split("\n")
        .forEach((line, index) => {
          const found = line.match(EMOJI);
          if (found) {
            const relative = file.slice(repoRoot.length + 1);
            offenders.push(
              `${relative}:${index + 1}: ${[...new Set(found)].join(" ")}`,
            );
          }
        });
    }

    expect(offenders).toEqual([]);
  });
});
