/**
 * html_to_pdf.js — Converts an HTML file to PDF using Puppeteer.
 * Usage: node html_to_pdf.js <input.html> <output.pdf>
 */

const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

async function convertHtmlToPdf(htmlPath, pdfPath) {
  const absoluteHtml = path.resolve(htmlPath);
  if (!fs.existsSync(absoluteHtml)) {
    console.error(`❌ HTML file not found: ${absoluteHtml}`);
    process.exit(1);
  }

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();

  // Load the HTML file
  await page.goto(`file://${absoluteHtml}`, {
    waitUntil: 'networkidle0',
    timeout: 30000,
  });

  // Wait for fonts to load
  await page.evaluateHandle('document.fonts.ready');

  // Generate PDF
  await page.pdf({
    path: path.resolve(pdfPath),
    format: 'A4',
    printBackground: true,
    margin: { top: '0mm', right: '0mm', bottom: '0mm', left: '0mm' },
    preferCSSPageSize: true,
  });

  await browser.close();
  console.log(`✅ PDF generated: ${pdfPath}`);
}

const [,, htmlPath, pdfPath] = process.argv;
if (!htmlPath || !pdfPath) {
  console.error('Usage: node html_to_pdf.js <input.html> <output.pdf>');
  process.exit(1);
}

convertHtmlToPdf(htmlPath, pdfPath).catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
