/**
 * Upload JEE Advanced papers to Cloudflare R2 using Node.js AWS SDK v3.
 * Uses Node's TLS with explicit settings to work around LibreSSL issues.
 *
 * Usage:
 *   node upload_jee_advanced_to_r2.js                # Upload all
 *   node upload_jee_advanced_to_r2.js --dry-run      # Preview only
 */

const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const { NodeHttpHandler } = require("@smithy/node-http-handler");
const https = require("https");
const fs = require("fs");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "backend", ".env") });

const DRY_RUN = process.argv.includes("--dry-run");

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
const DOWNLOAD_DIR = path.join(__dirname, "papers_to_upload", "JEE Advanced");

// Build full paper list: 2007-2026, Paper 1 & Paper 2
const PAPERS = [];
for (let year = 2007; year <= 2026; year++) {
  for (const paperNum of [1, 2]) {
    PAPERS.push({
      year,
      paperNum,
      localFile: `jee_advanced_${year}_paper${paperNum}.pdf`,
      r2Key: `library-papers/jee-advanced/Paper/${year}_paper${paperNum}.pdf`,
    });
  }
}

async function uploadFile(localPath, r2Key) {
  const fileContent = fs.readFileSync(localPath);
  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: r2Key,
    Body: fileContent,
    ContentType: "application/pdf",
  });
  await client.send(command);
  return fileContent.length;
}

async function main() {
  console.log("\n🎓 JEE Advanced → Cloudflare R2 Upload");
  console.log(`   ${PAPERS.length} papers (2007–2026, Paper 1 & Paper 2)`);
  console.log(`   Source: ${DOWNLOAD_DIR}`);
  console.log(`   Bucket: ${BUCKET}\n`);

  // Filter to only papers that exist locally
  const toUpload = PAPERS.filter((p) => {
    const fp = path.join(DOWNLOAD_DIR, p.localFile);
    return fs.existsSync(fp) && fs.statSync(fp).size > 5000;
  });

  console.log(`   📦 ${toUpload.length}/${PAPERS.length} papers found locally\n`);

  if (DRY_RUN) {
    console.log("[DRY RUN] Would upload:");
    toUpload.forEach((p) => console.log(`  → ${p.r2Key}`));
    return;
  }

  let uploaded = 0;
  let failed = 0;

  for (let i = 0; i < toUpload.length; i++) {
    const p = toUpload[i];
    const localPath = path.join(DOWNLOAD_DIR, p.localFile);

    process.stdout.write(
      `  [${i + 1}/${toUpload.length}] 📤 ${p.year} Paper ${p.paperNum}... `
    );

    try {
      const size = await uploadFile(localPath, p.r2Key);
      console.log(`✅ (${(size / 1024).toFixed(0)} KB)`);
      uploaded++;
    } catch (err) {
      const msg = err.message || String(err);
      console.log(`❌ ${msg.substring(0, 80)}`);
      failed++;
    }

    // Small delay every 10 uploads to avoid rate limiting
    if (i % 10 === 9) {
      await new Promise((r) => setTimeout(r, 500));
    }
  }

  console.log(
    `\n🎉 Done! ✅ ${uploaded} uploaded | ❌ ${failed} failed`
  );

  // Update the manifest
  if (uploaded > 0) {
    const manifestPath = path.join(__dirname, "backend", "r2_paper_manifest.json");
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
    
    const paperFiles = toUpload.map((p) => `${p.year}_paper${p.paperNum}.pdf`);
    manifest["jee-advanced/Paper"] = paperFiles;
    
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
    console.log(`\n📋 Updated manifest: ${paperFiles.length} entries in jee-advanced/Paper`);
  }
}

main().catch(console.error);
