/**
 * Upload all scraped RTU papers to Cloudflare R2 from the manifest.
 * Uses Node.js AWS SDK v3 with proper TLS support.
 *
 * Usage:
 *   node upload_all_to_r2.js                    # Upload all from manifest
 *   node upload_all_to_r2.js --dry-run          # Preview only
 *   node upload_all_to_r2.js --manifest <path>  # Custom manifest path
 */

const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const { NodeHttpHandler } = require("@smithy/node-http-handler");
const https = require("https");
const fs = require("fs");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "backend", ".env") });

const DEFAULT_MANIFEST = path.join(
  __dirname,
  "papers_to_upload",
  "RTU_ALL_YEARS",
  "upload_manifest.json"
);

const DRY_RUN = process.argv.includes("--dry-run");
const manifestIdx = process.argv.indexOf("--manifest");
const MANIFEST_PATH = manifestIdx >= 0 ? process.argv[manifestIdx + 1] : DEFAULT_MANIFEST;

// Create HTTPS agent with explicit TLS settings
const agent = new https.Agent({
  minVersion: "TLSv1.2",
  maxVersion: "TLSv1.3",
  rejectUnauthorized: true,
});

const client = new S3Client({
  endpoint: process.env.R2_ENDPOINT_URL,
  region: "auto",
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
  requestHandler: new NodeHttpHandler({
    httpsAgent: agent,
    connectionTimeout: 15000,
    socketTimeout: 60000,
  }),
  forcePathStyle: true,
});

const BUCKET = process.env.R2_BUCKET_NAME || "analyxx-papers";

async function uploadFile(localPath, storagePath) {
  const r2Key = `library-papers/${storagePath}`;
  const fileContent = fs.readFileSync(localPath);

  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: r2Key,
    Body: fileContent,
    ContentType: "application/pdf",
  });

  await client.send(command);
  return r2Key;
}

async function main() {
  if (!fs.existsSync(MANIFEST_PATH)) {
    console.error(`❌ Manifest not found: ${MANIFEST_PATH}`);
    console.error(`   Run: python scrape_rtu_all_years.py --scrape`);
    process.exit(1);
  }

  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf-8"));
  const papers = manifest.papers;

  console.log(`\n${"=".repeat(70)}`);
  console.log(`📦 RTU Papers → Cloudflare R2 Upload`);
  console.log(`   Manifest: ${MANIFEST_PATH}`);
  console.log(`   Generated: ${manifest.timestamp}`);
  console.log(`   Total papers: ${papers.length}`);
  console.log(`   Bucket: ${BUCKET}`);
  console.log(`   Mode: ${DRY_RUN ? "DRY RUN" : "UPLOAD"}`);
  console.log(`${"=".repeat(70)}\n`);

  if (DRY_RUN) {
    papers.forEach((p, i) =>
      console.log(`  [${i + 1}/${papers.length}] → library-papers/${p.storage_path}`)
    );
    console.log(`\n✅ Dry run complete. ${papers.length} papers would be uploaded.`);
    return;
  }

  let uploaded = 0;
  let failed = 0;
  let skipped = 0;
  const failedPapers = [];

  for (let i = 0; i < papers.length; i++) {
    const { local_path, storage_path } = papers[i];

    if (!fs.existsSync(local_path)) {
      console.log(`  [${i + 1}/${papers.length}] ❌ File not found: ${local_path}`);
      failed++;
      failedPapers.push(papers[i]);
      continue;
    }

    process.stdout.write(`  [${i + 1}/${papers.length}] 📤 ${storage_path}... `);

    try {
      await uploadFile(local_path, storage_path);
      console.log("✅");
      uploaded++;
    } catch (err) {
      const msg = err.message || String(err);
      console.log(`❌ ${msg.substring(0, 80)}`);
      failed++;
      failedPapers.push(papers[i]);
    }

    // Small delay to avoid rate limiting
    if (i % 10 === 9) {
      await new Promise((r) => setTimeout(r, 300));
    }
  }

  console.log(`\n${"=".repeat(70)}`);
  console.log(`🎉 Upload Complete!`);
  console.log(`   ✅ Uploaded: ${uploaded}`);
  console.log(`   ❌ Failed:   ${failed}`);
  console.log(`   ⏭️  Skipped:  ${skipped}`);
  console.log(`${"=".repeat(70)}`);

  // Save failed manifest for retry
  if (failedPapers.length > 0) {
    const failedManifest = {
      timestamp: new Date().toISOString(),
      total_scraped: failedPapers.length,
      total_downloaded: failedPapers.length,
      total_uploaded: 0,
      failed_uploads: failedPapers.length,
      papers: failedPapers,
    };
    const failedPath = MANIFEST_PATH.replace(".json", "_failed.json");
    fs.writeFileSync(failedPath, JSON.stringify(failedManifest, null, 2));
    console.log(`\n   📋 Failed papers manifest: ${failedPath}`);
    console.log(`   Retry: node upload_all_to_r2.js --manifest ${failedPath}`);
  }

  // Update original manifest with results
  manifest.total_uploaded = uploaded;
  manifest.failed_uploads = failed;
  manifest.upload_timestamp = new Date().toISOString();
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
}

main().catch(console.error);
