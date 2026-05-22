#!/usr/bin/env node
/**
 * Rewrites absolute asset paths in built output files for subpath deployment.
 *
 * Usage:  BASE_PATH=/ZombsBuildingSandbox/ node scripts/rewrite-asset-paths.js release
 *
 * Handles both:
 *   - Plain paths:         /asset/image/foo.svg
 *   - JSON-escaped paths:  \/asset\/image\/foo.svg
 */

const fs = require("fs");
const path = require("path");

const base = process.env.BASE_PATH;
if (!base) {
  console.error("ERROR: BASE_PATH environment variable is required");
  process.exit(1);
}

const dir = process.argv[2] || "release";
// Escaped version: /ZombsBuildingSandbox/ → \/ZombsBuildingSandbox\/
const escapedBase = base.replace(/\//g, "\\/");

let fileCount = 0;
let replaceCount = 0;

function walk(dirPath) {
  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    const full = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      walk(full);
      continue;
    }
    if (!/\.(html|css|js)$/.test(entry.name)) continue;

    let content = fs.readFileSync(full, "utf8");
    const original = content;

    // Replace escaped form FIRST to avoid double-replacing
    content = content.replaceAll("\\/asset\\/", escapedBase + "asset\\/");
    // Then replace plain form
    content = content.replaceAll("/asset/", base + "asset/");

    if (content !== original) {
      fs.writeFileSync(full, content);
      fileCount++;
    }
  }
}

walk(dir);
console.log(`Rewrote asset paths in ${fileCount} files (base: ${base})`);
