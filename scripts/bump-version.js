/**
 * Maynd Stomir — Automated Service Worker Version Bumper
 * Bumps CACHE_NAME in service-worker.js before commits to ensure clients bust stale caches.
 */
const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const swPath = path.join(ROOT_DIR, 'service-worker.js');
const pkgPath = path.join(ROOT_DIR, 'package.json');

if (!fs.existsSync(swPath)) {
    console.error('❌ service-worker.js not found at:', swPath);
    process.exit(1);
}

let swContent = fs.readFileSync(swPath, 'utf8');

// Match version formats like "maynd-stomir-v1.0.2" or "maynd-stomir-1.0.2"
const cacheRegex = /const CACHE_NAME\s*=\s*["']maynd-stomir-(?:v)?(\d+)\.(\d+)\.(\d+)(?:-[\w.]+)?["'];/;
const match = swContent.match(cacheRegex);

let newVersionStr;
let semver;

if (match) {
    const major = parseInt(match[1], 10);
    const minor = parseInt(match[2], 10);
    const patch = parseInt(match[3], 10) + 1;
    semver = `${major}.${minor}.${patch}`;
    newVersionStr = `maynd-stomir-v${semver}`;
    swContent = swContent.replace(cacheRegex, `const CACHE_NAME = "${newVersionStr}";`);
} else {
    // If not matching semver, bump to timestamp version
    const ts = Date.now();
    semver = `1.0.${ts}`;
    newVersionStr = `maynd-stomir-v${semver}`;
    swContent = swContent.replace(/const CACHE_NAME\s*=\s*["'][^"']+["'];/, `const CACHE_NAME = "${newVersionStr}";`);
}

fs.writeFileSync(swPath, swContent, 'utf8');
console.log(`⚡ [Cache-Buster] service-worker.js updated -> ${newVersionStr}`);

// Sync package.json version if present
if (fs.existsSync(pkgPath) && semver) {
    try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
        pkg.version = semver;
        fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
        console.log(`📦 [Version Sync] package.json updated -> ${semver}`);
    } catch (err) {
        console.warn('⚠️ Could not sync package.json:', err.message);
    }
}
