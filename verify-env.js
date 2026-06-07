/**
 * verify-env.js
 * Developer environment verification & diagnostics script for TaskQuest.
 * Run using: node verify-env.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log("==================================================");
console.log("🔍 TaskQuest Project Verification & Diagnostics");
console.log("==================================================\n");

// 1. System configuration
console.log("💻 Environment Details:");
console.log(`- Node.js Version: ${process.version}`);
console.log(`- Platform: ${process.platform}`);
console.log(`- Architecture: ${process.arch}\n`);

// 2. Critical Files Check
const CRITICAL_FILES = [
  'index.html',
  'style.css',
  'script.js',
  'storage.js',
  'toast.js',
  'badges.js',
  'analytics.js',
  'sw.js'
];

console.log("📂 File Checks:");
let missingFiles = 0;
CRITICAL_FILES.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    const stats = fs.statSync(filePath);
    console.log(`  ✅ ${file} - Found (${(stats.size / 1024).toFixed(2)} KB)`);
  } else {
    console.log(`  ❌ ${file} - Missing!`);
    missingFiles++;
  }
});
console.log("");

// 3. Syntax validation for JS files
console.log("⚙️ JavaScript Syntax Checks:");
const jsFiles = fs.readdirSync(__dirname).filter(f => f.endsWith('.js') && f !== 'verify-env.js');
let syntaxErrors = 0;

jsFiles.forEach(file => {
  try {
    execSync(`node --check "${file}"`, { stdio: 'ignore' });
    console.log(`  ✅ ${file} - Syntax OK`);
  } catch (e) {
    console.log(`  ❌ ${file} - Syntax Error detected!`);
    syntaxErrors++;
  }
});
console.log("");

// 4. Overall result
console.log("==================================================");
if (missingFiles === 0 && syntaxErrors === 0) {
  console.log("🎉 SUCCESS: Development environment is fully healthy!");
} else {
  console.log(`⚠️ WARNING: Workspace has ${missingFiles} missing files and ${syntaxErrors} syntax errors.`);
}
console.log("==================================================");
