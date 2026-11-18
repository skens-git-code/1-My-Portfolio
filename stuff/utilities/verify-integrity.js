#!/usr/bin/env node

/**
 * Project Integrity Verification Suite
 * Validates file structure, syntax, asset references, and configurations.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT_DIR = path.resolve(__dirname, '../..');
const STUFF_DIR = path.resolve(ROOT_DIR, 'stuff');

let totalChecks = 0;
let passedChecks = 0;
let errors = [];

function check(label, fn) {
  totalChecks++;
  try {
    const result = fn();
    if (result !== false) {
      passedChecks++;
      console.log(`  \x1b[32m✔\x1b[0m ${label}`);
      return true;
    } else {
      errors.push(label);
      console.log(`  \x1b[31m✖\x1b[0m ${label}`);
      return false;
    }
  } catch (err) {
    errors.push(`${label} (${err.message})`);
    console.log(`  \x1b[31m✖\x1b[0m ${label}: ${err.message}`);
    return false;
  }
}

console.log('\n\x1b[1m\x1b[36m===================================================\x1b[0m');
console.log('\x1b[1m\x1b[36m   PROJECT STRUCTURE & INTEGRITY VERIFICATION       \x1b[0m');
console.log('\x1b[1m\x1b[36m===================================================\x1b[0m\n');

// 1. Root Directory Isolation Checks
console.log('\x1b[1m[1] Root Directory Structure Integrity\x1b[0m');
check('Root contains only index.html, style.css, script.js, package.json, and stuff folder', () => {
  const rootEntries = fs.readdirSync(ROOT_DIR).filter(f => !f.startsWith('.'));
  const allowed = ['index.html', 'style.css', 'script.js', 'package.json', 'stuff'];
  const unexpected = rootEntries.filter(f => !allowed.includes(f));
  if (unexpected.length > 0) {
    throw new Error(`Unexpected entries found in root: ${unexpected.join(', ')}`);
  }
  return true;
});

check('Root index.html exists and is accessible', () => {
  return fs.existsSync(path.join(ROOT_DIR, 'index.html'));
});

check('Root style.css exists and is accessible', () => {
  return fs.existsSync(path.join(ROOT_DIR, 'style.css'));
});

check('Root script.js exists and is accessible', () => {
  return fs.existsSync(path.join(ROOT_DIR, 'script.js'));
});

check('Root package.json exists and defines start and backend scripts', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'package.json'), 'utf8'));
  return Boolean(pkg.scripts && pkg.scripts.start && pkg.scripts.backend);
});

check('stuff/start.sh exists and is accessible', () => {
  return fs.existsSync(path.join(STUFF_DIR, 'start.sh'));
});

// 2. JavaScript Syntax Validation
console.log('\n\x1b[1m[2] Codebase Syntax Integrity\x1b[0m');
check('script.js passes Node.js syntax compilation (node -c)', () => {
  execSync(`node -c "${path.join(ROOT_DIR, 'script.js')}"`, { stdio: 'pipe' });
  return true;
});

// 3. HTML Asset Link Verification
console.log('\n\x1b[1m[3] HTML Asset Reference Integrity\x1b[0m');
const indexHtml = fs.readFileSync(path.join(ROOT_DIR, 'index.html'), 'utf8');

check('index.html links to root style.css directly', () => {
  return /<link[^>]+href=["']style\.css["']/.test(indexHtml);
});

check('index.html links to root script.js directly', () => {
  return /<script[^>]+src=["']script\.js["']/.test(indexHtml);
});

check('All local image and icon paths in index.html resolve on disk', () => {
  const assetRegex = /(?:href|src)=["'](stuff\/[^"'\?#]+)(?:[?#][^"']*)?["']/g;
  let match;
  const missingFiles = [];
  while ((match = assetRegex.exec(indexHtml)) !== null) {
    const relPath = match[1];
    const fullPath = path.join(ROOT_DIR, relPath);
    if (!fs.existsSync(fullPath)) {
      missingFiles.push(relPath);
    }
  }
  if (missingFiles.length > 0) {
    throw new Error(`Missing files referenced in index.html: ${missingFiles.join(', ')}`);
  }
  return true;
});

// 4. Dedicated "stuff" Organization Integrity
console.log('\n\x1b[1m[4] Stuff Organization Structure\x1b[0m');
const requiredSubdirs = ['assets', 'backend', 'components', 'config', 'docs', 'seo', 'utilities'];
requiredSubdirs.forEach(subdir => {
  check(`stuff/${subdir} exists and is organized`, () => {
    return fs.existsSync(path.join(STUFF_DIR, subdir));
  });
});

check('Sanity backend studio configuration exists', () => {
  return fs.existsSync(path.join(STUFF_DIR, 'backend/sanity.config.ts')) &&
         fs.existsSync(path.join(STUFF_DIR, 'backend/package.json'));
});

check('SEO resources (robots.txt & sitemap.xml) exist in stuff/seo', () => {
  return fs.existsSync(path.join(STUFF_DIR, 'seo/robots.txt')) &&
         fs.existsSync(path.join(STUFF_DIR, 'seo/sitemap.xml'));
});

check('Project configuration exists in stuff/config', () => {
  return fs.existsSync(path.join(STUFF_DIR, 'config/package.json'));
});

// Final Report
console.log('\n\x1b[1m\x1b[36m===================================================\x1b[0m');
if (errors.length === 0) {
  console.log(`\x1b[32m✔ ALL ${totalChecks} INTEGRITY CHECKS PASSED SUCCESSFULLY!\x1b[0m`);
  console.log('\x1b[32mProject structure is clean, verified, and production-ready.\x1b[0m');
} else {
  console.log(`\x1b[31m✖ ${errors.length} of ${totalChecks} CHECKS FAILED:\x1b[0m`);
  errors.forEach(err => console.log(`   - ${err}`));
  process.exit(1);
}
console.log('\x1b[1m\x1b[36m===================================================\x1b[0m\n');
