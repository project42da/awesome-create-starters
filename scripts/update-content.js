import fetch from "node-fetch";
import fs from "fs/promises";
import path from "path";

const README_PATH = path.resolve("README.md");
const HTML_PATH = path.resolve("docs/index.html");
const WEB_URL = "https://minwoo.github.io/awesome-create-starters/"; // Replace with actual repo URL if needed
const NPM_API =
  "https://registry.npmjs.org/-/v1/search?text=create-&size=200&ranking=popularity&sortBy=downloads_weekly";

// Helper: filter only real create-* CLI starters
function isRealCreateStarter(pkg) {
  // Heuristics: must start with create- or @scope/create-,
  // and description includes keywords like "scaffold", "starter", "app", "project", "template", "bootstrap"
  // and not obviously a library or helper
  const nameOk = /^(@[\w-]+\/)?create-[\w-]+$/.test(pkg.name);
  if (!nameOk) return false;
  const desc = (pkg.description || "").toLowerCase();
  const keywords = ["scaffold", "starter", "app", "project", "template", "bootstrap", "initialize", "init"];
  if (keywords.some((k) => desc.includes(k))) return true;
  // fallback: if description is missing but name is create-xxx, allow
  return desc.length < 10;
}

async function main() {
  // 1. Fetch latest create-* packages from npm registry
  const res = await fetch(NPM_API);
  const data = await res.json();
  let packages = data.objects.map(({ package: p }) => ({
    name: p.name,
    description: p.description,
    npm: p.links.npm,
    homepage: p.links.homepage || "",
  }));

  // 2. Filter only real create starters
  packages = packages.filter(isRealCreateStarter);

  // Top 20 for featured
  const featured = packages.slice(0, 20);

  // 3. Update README.md
  const featuredTable = [
    "| Package | Description |",
    "| ------- | ----------- |",
    ...featured.map((pkg) => `| [${pkg.name}](${pkg.npm}) | ${pkg.description || "-"} |`),
  ].join("\n");

  let readme = await fs.readFile(README_PATH, "utf8");
  readme = readme.replace(
    /(## \ud83d\udc81 Featured Starters\n)([\s\S]*?)(\n## \ud83d\udc9a Full List)/,
    `$1\n${featuredTable}\n$3`
  );
  readme = readme.replace(
    /(## \ud83d\udc9a Full List\n)([\s\S]*?)(\n---)/,
    `$1\n- [View all create-* packages on npm (downloads weekly)](https://www.npmjs.com/search?q=create-&sortBy=downloads_weekly)\n- [Browse full list on the website](${WEB_URL})\n$3`
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
  <h1>\ud83c\udfe1 Awesome Create Starters</h1>
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
    Auto-updated from <a href="https://www.npmjs.com/search?q=create-&sortBy=downloads_weekly" target="_blank">npm registry</a>.
    <br>Source: <a href="https://github.com/minwoo/awesome-create-starters" target="_blank">GitHub</a>
  </footer>
</body>
</html>`;
  await fs.writeFile(HTML_PATH, html);

  console.log("\ud83d\udc81\ufe0f README.md and docs/index.html updated with create-* starters from npm registry.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
