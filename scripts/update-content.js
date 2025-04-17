import fetch from "node-fetch";
import fs from "fs/promises";
import path from "path";

const README_PATH = path.resolve("README.md");
const HTML_PATH = path.resolve("docs/index.html");
const WEB_URL = "https://project42da.github.io/awesome-create-starters/";
const NPM_API = "https://registry.npmjs.org/-/v1/search?text=create-&size=250&ranking=popularity";

// Helper: filter only real create-* CLI starters
function isRealCreateStarter(pkg) {
  const nameOk = /^(@[\w-]+\/)?create-[\w-]+$/.test(pkg.name);
  if (!nameOk) return false;
  const desc = (pkg.description || "").toLowerCase();
  const keywords = ["scaffold", "starter", "app", "project", "template", "bootstrap", "initialize", "init"];
  if (keywords.some((k) => desc.includes(k))) return true;
  return desc.length < 10;
}

async function fetchAllCreateStarters() {
  let all = [];
  for (let page = 0; page < 4; page++) {
    const res = await fetch(NPM_API + `&from=${page * 250}`);
    const data = await res.json();
    all = all.concat(
      data.objects.map(({ package: p }) => ({
        name: p.name,
        description: p.description,
        npm: p.links.npm,
        homepage: p.links.homepage || "",
      }))
    );
  }
  return all;
}

async function main() {
  // 1. Fetch up to 1000 create-* packages from npm registry
  let packages = await fetchAllCreateStarters();
  // 2. Filter only real create starters
  packages = packages.filter(isRealCreateStarter);

  // Top 40 for featured
  const featured = packages.slice(0, 40);

  // 3. Update README.md
  const featuredTable = [
    "| Package | Description |",
    "| ------- | ----------- |",
    ...featured.map((pkg) => `| [${pkg.name}](${pkg.npm}) | ${pkg.description || "-"} |`),
  ].join("\n");

  let readme = await fs.readFile(README_PATH, "utf8");
  readme = readme.replace(/(## 📦 Featured Starters\n)([\s\S]*?)(\n## 📚 Full List)/, `$1\n${featuredTable}\n$3`);
  readme = readme.replace(
    /(## 📚 Full List\n)([\s\S]*?)(\n---)/,
    `$1\n- [View all create-* packages on npm (popularity)](https://www.npmjs.com/search?q=create-&ranking=popularity)\n- [Browse full list on the website](${WEB_URL})\n$3`
  );
  await fs.writeFile(README_PATH, readme);

  // 4. Render docs/index.html (English)
  await fs.mkdir(path.dirname(HTML_PATH), { recursive: true });
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Awesome Create Starters</title>
  <style>
    body { font-family: system-ui, sans-serif; margin: 2rem; background: #f9f9fb; }
    h1 { color: #2c3e50; }
    table { border-collapse: collapse; width: 100%; background: #fff; }
    th, td { border: 1px solid #e1e4e8; padding: 8px; text-align: left; }
    th { background: #f3f6fa; }
    tr:nth-child(even) { background: #f6f8fa; }
    a { color: #1976d2; text-decoration: none; }
    a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <h1>🌱 Awesome Create Starters</h1>
  <p>A curated list of <code>create-*</code> npm packages to quickly scaffold new projects.<br>Updated daily via GitHub Actions.</p>
  <table>
    <thead>
      <tr><th>Package</th><th>Description</th></tr>
    </thead>
    <tbody>
      ${packages
        .map(
          (pkg) => `
        <tr>
          <td><a href="${pkg.npm}" target="_blank">${pkg.name}</a></td>
          <td>${pkg.description || "-"}</td>
        </tr>
      `
        )
        .join("")}
    </tbody>
  </table>
  <footer style="margin-top:2rem;color:#888;font-size:0.9em;">
    Auto-updated from <a href="https://www.npmjs.com/search?q=create-&ranking=popularity" target="_blank">npm registry</a>.
    <br>Source: <a href="https://github.com/project42da/awesome-create-starters" target="_blank">GitHub</a>
  </footer>
</body>
</html>`;
  await fs.writeFile(HTML_PATH, html);

  console.log("💁️ README.md and docs/index.html updated with create-* starters from npm registry.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
