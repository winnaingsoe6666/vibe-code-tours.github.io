// Gate builder profiles at CI time. Fails the build for problems a student must
// fix themselves: unparseable YAML or placeholder identity (name / github).
// Optional fields are handled tolerantly by the content schema, not here.
import fs from "node:fs";
import path from "node:path";
import yaml from "js-yaml";

const dir = "src/content/builders";
const PLACEHOLDER =
  /^(your[ _-]?name|your[ _-]?github[ _-]?username|your[ _-]?username|name|github)$/i;

const files = fs
  .readdirSync(dir)
  .filter((f) => f.endsWith(".md") && !f.startsWith("_"));

const problems = [];
for (const f of files) {
  const src = fs.readFileSync(path.join(dir, f), "utf8");
  const m = src.match(/^---\n([\s\S]*?)\n---/);
  if (!m) {
    problems.push(`${f}: missing YAML frontmatter (--- block at top)`);
    continue;
  }
  let data;
  try {
    data = yaml.load(m[1]);
  } catch (e) {
    problems.push(
      `${f}: YAML syntax error — ${String(e.message).split("\n")[0]} ` +
        `(tip: don't use [text](link) in frontmatter; keep values plain)`,
    );
    continue;
  }
  if (!data || typeof data !== "object") {
    problems.push(`${f}: frontmatter is empty or not key: value pairs`);
    continue;
  }
  const name = typeof data.name === "string" ? data.name.trim() : "";
  const github = typeof data.github === "string" ? data.github.trim() : "";
  if (!name) problems.push(`${f}: 'name' is required`);
  else if (PLACEHOLDER.test(name))
    problems.push(
      `${f}: 'name' is still the template placeholder ("${name}") — put your real name`,
    );
  if (!github) problems.push(`${f}: 'github' is required`);
  else if (PLACEHOLDER.test(github))
    problems.push(
      `${f}: 'github' is still the template placeholder ("${github}") — put your GitHub username`,
    );
  if (data.cohort == null || Number.isNaN(Number(data.cohort)))
    problems.push(`${f}: 'cohort' must be a number (e.g. 1)`);
}

if (problems.length) {
  console.error(
    `\n✖ Builder profile validation failed (${problems.length}):\n`,
  );
  for (const p of problems) console.error("  - " + p);
  console.error(
    `\nFix the file(s) above. Optional fields you don't use: delete the line.\n`,
  );
  process.exit(1);
}
console.log(`✓ ${files.length} builder profiles valid.`);
