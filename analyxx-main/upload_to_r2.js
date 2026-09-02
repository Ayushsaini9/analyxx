/**
 * Upload scraped RTU papers to Cloudflare R2 using Node.js AWS SDK v3.
 * Uses Node's TLS with explicit settings to work around LibreSSL issues.
 *
 * Usage:
 *   node upload_to_r2.js                    # Upload all from manifest
 *   node upload_to_r2.js --dry-run          # Preview only
 */

const { S3Client, PutObjectCommand, HeadObjectCommand } = require("@aws-sdk/client-s3");
const { NodeHttpHandler } = require("@smithy/node-http-handler");
const https = require("https");
const fs = require("fs");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "backend", ".env") });

const MANIFEST_PATH = path.join(
  __dirname,
  "papers_to_upload",
  "RTU_SCRAPED",
  "upload_manifest.json"
);

const DRY_RUN = process.argv.includes("--dry-run");
const SKIP_EXISTING = process.argv.includes("--skip-existing");

// Create HTTPS agent with explicit TLS settings
const agent = new https.Agent({
  secureProtocol: "TLS_method",
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
  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf-8"));
  const papers = manifest.papers;

  console.log(`\n📦 Upload Manifest: ${papers.length} papers`);
  console.log(`   Generated: ${manifest.timestamp}`);

  if (DRY_RUN) {
    console.log("\n[DRY RUN]");
    papers.forEach((p) => console.log(`  → ${p.storage_path}`));
    return;
  }

  let uploaded = 0;
  let failed = 0;
  let skipped = 0;

  for (let i = 0; i < papers.length; i++) {
    const { local_path, storage_path } = papers[i];

    if (!fs.existsSync(local_path)) {
      console.log(
        `  [${i + 1}/${papers.length}] ❌ File not found: ${local_path}`
      );
      failed++;
      continue;
    }

    process.stdout.write(
      `  [${i + 1}/${papers.length}] 📤 ${storage_path}... `
    );

    try {
      const r2Key = await uploadFile(local_path, storage_path);
      console.log("✅");
      uploaded++;
    } catch (err) {
      const msg = err.message || String(err);
      console.log(`❌ ${msg.substring(0, 80)}`);
      failed++;
    }

    // Small delay to avoid rate limiting
    if (i % 10 === 9) {
      await new Promise((r) => setTimeout(r, 500));
    }
  }

  console.log(
    `\n🎉 Done! ✅ ${uploaded} uploaded | ❌ ${failed} failed | ⏭️ ${skipped} skipped`
  );
}

main().catch(console.error);
