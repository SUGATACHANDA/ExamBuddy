// scripts/publish-with-changelog.js
const fs = require("fs");
const path = require("path");
const pkg = require("../package.json");
const pkgPath = path.join(__dirname, "..", "package.json");

const version = pkg.version;
const changelogPath = path.join(__dirname, "..", "CHANGELOG.md");

// Read CHANGELOG.md
const changelog = fs.readFileSync(changelogPath, "utf8");

// Regex: match "## [version] - date" then capture everything until next "\n---"
const regex = new RegExp(
    `##\\s*\\[${version}\\][^\\n]*\\n([\\s\\S]*?)(?=\\n---)`,
    "m"
);

const match = changelog.match(regex);

let releaseNotes;
if (match && match[1]) {
    releaseNotes = match[1].trim();
    console.log(`✅ Found release notes for version ${version}:`);
    console.log(releaseNotes);
} else {
    releaseNotes = `Release ${version}`;
    console.warn(`⚠️ No matching release notes found for version ${version} in CHANGELOG.md.`);
}

// Save to a temp file so the npm script can read it
pkg.build = pkg.build || {};
pkg.build.releaseInfo = pkg.build.releaseInfo || {};
pkg.build.releaseInfo.releaseNotes = releaseNotes;

// Save back package.json
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
console.log(`📦 Injected release notes for ${version} into package.json`);

// Also save to a file (optional, debugging)
const outPath = path.join(__dirname, "release-notes.txt");
fs.writeFileSync(outPath, releaseNotes);
console.log(`📄 Saved release notes for v${version} to ${outPath}`);

console.log("✅ Release notes extraction complete.");
process.exit(0);