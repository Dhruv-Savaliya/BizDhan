/**
 * Cross-platform cleanup: removes node_modules and package-lock.json.
 * Uses fs.rmSync (Node 14.14+) — reliable on Windows vs shell rm -rf.
 */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const targets = ["node_modules", "package-lock.json"];

for (const name of targets) {
  const targetPath = path.join(root, name);
  if (!fs.existsSync(targetPath)) {
    console.log(`[clean] skip (not found): ${name}`);
    continue;
  }
  fs.rmSync(targetPath, { recursive: true, force: true });
  console.log(`[clean] removed: ${name}`);
}
