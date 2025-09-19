// scripts/publish-with-changelog.js
const fs = require("fs");
const path = require("path");
const pkg = require("../package.json");

const version = pkg.version;
const changelogPath = path.join(__dirname, "..", "CHANGELOG.md");

// Read CHANGELOG.md
const changelog = fs.readFileSync(changelogPath, "utf8");

// Regex: extract section for current version
const regex = new RegExp(`##\\s*\\[?${version}\\]?([\\s\\S]*?)(?=\\n##|$)`, "m");
const match = changelog.match(regex);

let releaseNotes;
if (match) {
    releaseNotes = match[0].trim();
    console.log(`✅ Found release notes for version ${version}:`);
    console.log(releaseNotes);
} else {
    releaseNotes = `Release ${version}`;
    console.warn(`⚠️ No matching release notes found for version ${version} in CHANGELOG.md.`);
}

// Save to a temp file so the npm script can read it
const outPath = path.join(__dirname, "release-notes.txt");
fs.writeFileSync(outPath, releaseNotes);
console.log(`📄 Saved release notes for v${version} to ${outPath}`);
