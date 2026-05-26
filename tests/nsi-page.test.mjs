import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const pagePath = join(repoRoot, "NSI", "index.html");
const homePath = join(repoRoot, "index.html");

assert.ok(existsSync(pagePath), "NSI/index.html should exist");

const page = readFileSync(pagePath, "utf8");

for (const text of [
  "Lifting Traces to Logic",
  "Neuro-Symbolic Skill Induction",
  "Jie-Jing Shao",
  "ICML 2026",
  "Jie-Jing Shao</a><sup>1,2</sup>",
  "Lan-Zhe Guo</a><sup>1</sup>",
  "James T. Kwok</a><sup>3</sup>",
  "Yu-Feng Li</a><sup>1</sup>",
  "<sup>1</sup>LAMDA Group, Nanjing University",
  "<sup>2</sup>CFAR &amp; IHPC, A*STAR, Singapore",
  "<sup>3</sup>HKUST",
  "https://arxiv.org/abs/2605.01293",
  "https://arxiv.org/pdf/2605.01293",
  "id=\"abstract\"",
  "id=\"method\"",
  "id=\"experiments\"",
  "id=\"BibTeX\"",
  "copy-bibtex-btn",
]) {
  assert.ok(page.includes(text), `NSI page should include ${text}`);
}

for (const oldAffiliation of [
  "State Key Laboratory of Novel Software Technology",
  "School of Intelligence Science and Technology",
  "Department of Computer Science and Engineering, Hong Kong University of Science and Technology",
  "School of Artificial Intelligence, Nanjing University",
  "<sup>1,3,5</sup>",
  "<sup>4</sup>HKUST",
]) {
  assert.ok(!page.includes(oldAffiliation), `NSI page should not include verbose affiliation: ${oldAffiliation}`);
}

for (const asset of [
  "static/images/overview.png",
  "static/images/main_results.png",
  "static/images/online_evolution.png",
  "static/images/logic_impact.png",
]) {
  assert.ok(page.includes(asset), `NSI page should reference ${asset}`);
  assert.ok(existsSync(join(repoRoot, "NSI", asset)), `${asset} should exist`);
}

const localRefs = [...page.matchAll(/\b(?:src|href)="\.\/([^"#?]+)(?:[?#][^"]*)?"/g)]
  .map((match) => match[1])
  .filter((ref) => !ref.startsWith("#"));

for (const ref of localRefs) {
  assert.ok(existsSync(join(repoRoot, "NSI", ref)), `local reference should exist: ${ref}`);
}

const home = readFileSync(homePath, "utf8");
assert.ok(home.includes("NSI/index.html"), "homepage publication list should link to NSI project page");

const selectedTemplate = home.match(/<template id="template-selected">([\s\S]*?)<\/template>/)?.[1] ?? "";
assert.ok(selectedTemplate, "homepage should include selected publications template");
assert.ok(!selectedTemplate.includes("pub-nsi"), "NSI should not appear under the selected publications tab");
assert.ok(!selectedTemplate.includes("NSI/index.html"), "selected publications tab should not link to NSI project page");
