/**
 * Upload RTU Engineering Mathematics-I papers to Cloudflare R2.
 * Uses Node.js AWS SDK v3 — fixed TLS config for newer Node versions.
 *
 * Usage:
 *   node upload_em1_to_r2.js
 */

const { S3Client, PutObjectCommand, HeadObjectCommand } = require("@aws-sdk/client-s3");
const https = require("https");
const http = require("http");
const fs = require("fs");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "backend", ".env") });

// ── Config ──
const BUCKET = process.env.R2_BUCKET_NAME || "analyxx-papers";
const R2_CDN = "https://pub-5d418c0acdfa4e9ba673215eb5998a3b.r2.dev/library-papers";
const STORAGE_FOLDER = "rtu-1styear";
const SEMESTER = 1;
const SUBJECT = "Engineering Mathematics-I";

// Local directories to scan for EM-1 PDFs
const LOCAL_DIRS = [
  path.join(__dirname, "papers_to_upload", "Rtu  first year"),
  path.join(__dirname, "papers_to_upload", "RTU_ALL_YEARS", "rtu-1styear", "sem-1"),
  path.join(__dirname, "papers_to_upload", "RTU_EM1"),
];

// R2 client — default handler (Node v25+ compatible)
const r2 = new S3Client({
  endpoint: process.env.R2_ENDPOINT_URL,
  region: "auto",
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
  forcePathStyle: true,
});

// Year range
const MIN_YEAR = 2006;
const MAX_YEAR = 2026;

// ── Helpers ──
function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/** Check R2 via CDN HEAD request (avoids S3 API auth issues) */
async function checkR2Exists(year) {
  const urlPath = encodeURIComponent(`${STORAGE_FOLDER}/Sem ${SEMESTER}/${SUBJECT} ${year}.pdf`);
  const url = `${R2_CDN}/${urlPath}`;
  return new Promise((resolve) => {
    https
      .request(url, { method: "HEAD", timeout: 8000 }, (res) => {
        resolve(res.statusCode === 200);
      })
      .on("error", () => resolve(false))
      .on("timeout", function () {
        this.destroy();
        resolve(false);
      })
      .end();
  });
}

async function uploadToR2(localPath, year) {
  const r2Key = `library-papers/${STORAGE_FOLDER}/Sem ${SEMESTER}/${SUBJECT} ${year}.pdf`;
  const fileContent = fs.readFileSync(localPath);

  // Validate PDF
  if (fileContent.length < 5000 || fileContent.slice(0, 5).toString() !== "%PDF-") {
    throw new Error("Invalid PDF file");
  }

  await r2.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: r2Key,
      Body: fileContent,
      ContentType: "application/pdf",
    })
  );
  return r2Key;
}

function downloadFile(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith("https") ? https : http;
    client
      .get(url, { headers: { "User-Agent": "Mozilla/5.0" }, timeout: 30000 }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return downloadFile(res.headers.location).then(resolve).catch(reject);
        }
        if (res.statusCode !== 200) {
          return reject(new Error(`HTTP ${res.statusCode}`));
        }
        const chunks = [];
        res.on("data", (chunk) => chunks.push(chunk));
        res.on("end", () => resolve(Buffer.concat(chunks)));
        res.on("error", reject);
      })
      .on("error", reject)
      .on("timeout", function () {
        this.destroy();
        reject(new Error("timeout"));
      });
  });
}

// ── EM-1 filename matching ──
function isEM1File(filename) {
  const lower = filename.toLowerCase();
  // Exclude EM-2 / Mathematics-II
  if (/mathematics[_\s.-]*(2|ii)\b/i.test(lower)) return false;
  if (/\bem[_\s.-]*2/i.test(lower)) return false;

  // Match EM-1 patterns
  if (/engineering[_\s.-]*mathematics[_\s.-]*(1|i)(?:[_.\s-]|$)/i.test(lower)) return true;
  if (/\bem[_\s.-]*(1)(?:[_.\s-]|$)/i.test(lower)) return true;
  return false;
}

function extractYear(filename) {
  // Try end-of-filename pattern first
  const match = filename.match(/[-_](\d{4})(?:\(\d\))?\.pdf$/i);
  if (match) {
    const y = parseInt(match[1]);
    if (y >= MIN_YEAR && y <= MAX_YEAR) return y;
  }
  // Generic year extraction
  const match2 = filename.match(/(\d{4})/);
  if (match2) {
    const y = parseInt(match2[1]);
    if (y >= MIN_YEAR && y <= MAX_YEAR) return y;
  }
  return null;
}

// ── CDN URL patterns for missing years ──
const CDN_BASE = "https://cdn.rtuquestionpapers.com";
const CDN_PATTERNS = [
  "btech-1-sem-engineering-mathematics-1-1e3101-{YEAR}.pdf",
  "btech-1-sem-engineering-mathematics-1-11n501-{YEAR}.pdf",
  "btech-1-sem-engineering-mathematics-1-11n501-may-{YEAR}.pdf",
  "btech-1-sem-engineering-mathematics-1-1e1451-{YEAR}.pdf",
  "btech-1-sem-engineering-mathematics-1-1e1621-{YEAR}.pdf",
  "btech-1-sem-engineering-mathematics-i-{YEAR}.pdf",
  "btech-1-sem-engineering-mathematics-1-{YEAR}.pdf",
  "btech-1-sem-mathematics-1-1e1451-{YEAR}.pdf",
  "btech-1-sem-mathematics-1-1e2071-{YEAR}.pdf",
  "btech-1-sem-engineering-mathematics-1-1e3101-jan-{YEAR}.pdf",
  "btech-1-sem-engineering-mathematics-1-1e3101-jun-{YEAR}.pdf",
  "btech-1-sem-engineering-mathematics-1-1e3101-dec-{YEAR}.pdf",
  "btech-1-sem-engineering-mathematics-1-11n501-jan-{YEAR}.pdf",
  "btech-1-sem-engineering-mathematics-1-11n501-dec-{YEAR}.pdf",
  "btech-1-sem-engineering-mathematics-1-1e0101-{YEAR}.pdf",
  "btech-1-sem-mathematics-i-{YEAR}.pdf",
  "btech-1-sem-mathematics-1-{YEAR}.pdf",
  // Sep/back-paper variants
  "btech-1-sem-engineering-mathematics-1-1e3101-sep-{YEAR}.pdf",
  "btech-1-sem-engineering-mathematics-1-11n501-sep-{YEAR}.pdf",
  // Older scheme codes (pre-2013)
  "btech-1-sem-engineering-mathematics-1-1e0501-{YEAR}.pdf",
  "btech-1-sem-engineering-mathematics-i-1e0501-{YEAR}.pdf",
  "btech-1-sem-engineering-maths-1-{YEAR}.pdf",
];

async function probeCDNForYear(year) {
  for (const pattern of CDN_PATTERNS) {
    const filename = pattern.replace("{YEAR}", year);
    const url = `${CDN_BASE}/${filename}`;
    try {
      const buf = await downloadFile(url);
      if (buf.length > 5000 && buf.slice(0, 5).toString() === "%PDF-") {
        return { url, filename, buffer: buf };
      }
    } catch {
      // Next pattern
    }
  }
  return null;
}

// ── Main ──
async function main() {
  console.log(`\n${"=".repeat(70)}`);
  console.log(`🚀 RTU Engineering Mathematics-I → Cloudflare R2`);
  console.log(`   Subject:  ${SUBJECT}`);
  console.log(`   Years:    ${MIN_YEAR}–${MAX_YEAR}`);
  console.log(`   Storage:  R2 → library-papers/${STORAGE_FOLDER}/Sem ${SEMESTER}/`);
  console.log(`${"=".repeat(70)}`);

  // Step 1: Audit R2 via CDN HEAD
  console.log(`\n📊 Auditing R2 (CDN HEAD check)...\n`);
  const existingYears = new Set();
  const missingYears = new Set();

  for (let year = MIN_YEAR; year <= MAX_YEAR; year++) {
    const exists = await checkR2Exists(year);
    if (exists) {
      existingYears.add(year);
      console.log(`  ✅ ${year}`);
    } else {
      missingYears.add(year);
      console.log(`  ❌ ${year}`);
    }
  }

  console.log(`\n  Already in R2: ${existingYears.size} | Missing: ${missingYears.size}`);

  if (missingYears.size === 0) {
    console.log(`\n🎉 All years accounted for!`);
    updateManifests(existingYears);
    return;
  }

  // Step 2: Check local files
  console.log(`\n📂 Scanning local directories for EM-1 PDFs...\n`);
  const localPapers = new Map(); // year -> filepath

  for (const dir of LOCAL_DIRS) {
    if (!fs.existsSync(dir)) continue;
    for (const file of fs.readdirSync(dir)) {
      if (!file.toLowerCase().endsWith(".pdf")) continue;
      const fullPath = path.join(dir, file);
      if (isEM1File(file)) {
        const year = extractYear(file);
        if (year && missingYears.has(year) && !localPapers.has(year)) {
          const stat = fs.statSync(fullPath);
          if (stat.size > 5000) {
            localPapers.set(year, fullPath);
            console.log(`  📄 ${year} ← ${file} (${(stat.size / 1024).toFixed(0)}KB)`);
          }
        }
      }
    }
  }

  // Step 3: Probe CDN for remaining missing years
  const stillMissing = [...missingYears].filter((y) => !localPapers.has(y)).sort();
  const cdnPapers = new Map(); // year -> buffer

  if (stillMissing.length > 0) {
    console.log(`\n🔍 Probing CDN for ${stillMissing.length} missing years: ${stillMissing.join(", ")}...\n`);
    for (const year of stillMissing) {
      const result = await probeCDNForYear(year);
      if (result) {
        cdnPapers.set(year, result.buffer);
        console.log(`  🎯 ${year} — found: ${result.filename} (${(result.buffer.length / 1024).toFixed(0)}KB)`);
      } else {
        console.log(`  ⭕ ${year} — not available online`);
      }
      await sleep(300);
    }
  }

  // Step 4: Upload everything
  const toUpload = new Map();
  for (const [year, filepath] of localPapers) toUpload.set(year, { source: "local", filepath });
  for (const [year, buffer] of cdnPapers) toUpload.set(year, { source: "cdn", buffer });

  if (toUpload.size === 0) {
    console.log(`\n⚠️  No new papers found to upload.`);
    const notAvailable = [...missingYears].filter((y) => !localPapers.has(y) && !cdnPapers.has(y)).sort();
    if (notAvailable.length) console.log(`   Years not available: ${notAvailable.join(", ")}`);
    updateManifests(existingYears);
    return;
  }

  console.log(`\n☁️  Uploading ${toUpload.size} papers to R2...\n`);
  const uploadedYears = new Set();
  let i = 0;

  for (const [year, info] of [...toUpload.entries()].sort((a, b) => a[0] - b[0])) {
    i++;
    process.stdout.write(`  [${i}/${toUpload.size}] 📤 ${SUBJECT} ${year}.pdf... `);

    try {
      if (info.source === "local") {
        await uploadToR2(info.filepath, year);
      } else {
        const tmpPath = path.join(__dirname, "papers_to_upload", "RTU_EM1", `em1-${year}.pdf`);
        fs.mkdirSync(path.dirname(tmpPath), { recursive: true });
        fs.writeFileSync(tmpPath, info.buffer);
        await uploadToR2(tmpPath, year);
      }
      console.log("✅");
      uploadedYears.add(year);
    } catch (err) {
      console.log(`❌ ${(err.message || String(err)).substring(0, 80)}`);
    }
    await sleep(300);
  }

  // Step 5: Update manifests
  const allInR2 = new Set([...existingYears, ...uploadedYears]);
  updateManifests(allInR2);

  // Summary
  const notFound = [...missingYears].filter((y) => !uploadedYears.has(y)).sort();
  console.log(`\n${"=".repeat(70)}`);
  console.log(`🎉 Done!`);
  console.log(`   ✅ Total in R2:     ${allInR2.size} papers (${[...allInR2].sort().join(", ")})`);
  console.log(`   📤 Newly uploaded:  ${uploadedYears.size} (${[...uploadedYears].sort().join(", ") || "none"})`);
  if (notFound.length) console.log(`   ❓ Not available:   ${notFound.join(", ")}`);
  console.log(`${"=".repeat(70)}`);
}

function updateManifests(allYears) {
  console.log(`\n📝 Updating manifests...\n`);
  const manifestKey = `${STORAGE_FOLDER}/Sem ${SEMESTER}`;
  const newFiles = [...allYears].sort().map((y) => `${SUBJECT} ${y}.pdf`);

  for (const mPath of [
    path.join(__dirname, "backend", "app", "r2_paper_manifest.json"),
    path.join(__dirname, "whatsapp-bot", "src", "r2_paper_manifest.json"),
  ]) {
    if (!fs.existsSync(mPath)) {
      console.log(`  ⚠️  Not found: ${mPath}`);
      continue;
    }
    try {
      const manifest = JSON.parse(fs.readFileSync(mPath, "utf-8"));
      const existing = manifest[manifestKey] || [];
      const nonEM1 = existing.filter(
        (f) =>
          !f.toLowerCase().startsWith("engineering mathematics-i") &&
          !f.toLowerCase().startsWith("engineering mathematics i")
      );
      manifest[manifestKey] = [...new Set([...nonEM1, ...newFiles])].sort();
      fs.writeFileSync(mPath, JSON.stringify(manifest, null, 2));
      console.log(`  ✅ ${path.basename(mPath)} (${newFiles.length} EM-1 entries in Sem 1)`);
    } catch (e) {
      console.log(`  ❌ Error: ${e.message}`);
    }
  }
}

main().catch(console.error);
