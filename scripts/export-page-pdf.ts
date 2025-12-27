#!/usr/bin/env ts-node
/**
 * Export Test Page as PDF
 *
 * Converts a markdown test page to a sleek, branded PDF for review.
 *
 * Usage:
 *   npx ts-node scripts/export-page-pdf.ts <filename>
 *   npx ts-node scripts/export-page-pdf.ts --all
 *
 * Examples:
 *   npx ts-node scripts/export-page-pdf.ts es-1-abogado-de-dui-bethesda-md.md
 *   npx ts-node scripts/export-page-pdf.ts --all
 */

import * as path from "path";
import * as fs from "fs";
import puppeteer from "puppeteer";

const TEST_PAGES_DIR = path.join(__dirname, "../test-pages");
const PDF_OUTPUT_DIR = path.join(__dirname, "../test-pages/pdf");

interface PageMetadata {
  keyword: string;
  city: string;
  state: string;
  language: string;
  url_path: string;
  word_count: number;
  generation_time_ms: number;
  model: string;
}

function parseMarkdownFile(filepath: string): { metadata: PageMetadata; content: string } {
  const raw = fs.readFileSync(filepath, "utf-8");

  // Parse YAML frontmatter
  const frontmatterMatch = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!frontmatterMatch) {
    throw new Error("Invalid markdown file format - missing frontmatter");
  }

  const frontmatter = frontmatterMatch[1];
  const content = frontmatterMatch[2].trim();

  // Parse YAML manually (simple key: value format)
  const metadata: Record<string, string | number> = {};
  for (const line of frontmatter.split("\n")) {
    const match = line.match(/^(\w+):\s*(.+)$/);
    if (match) {
      const key = match[1];
      let value: string | number = match[2];
      // Convert numbers
      if (/^\d+$/.test(value)) {
        value = parseInt(value, 10);
      }
      metadata[key] = value;
    }
  }

  return { metadata: metadata as unknown as PageMetadata, content };
}

function markdownToHtml(markdown: string): string {
  // Simple markdown to HTML conversion
  let html = markdown
    // Headers
    .replace(/^### \*\*(.+?)\*\*$/gm, "<h3>$1</h3>")
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^## \*\*(.+?)\*\*$/gm, "<h2>$1</h2>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^\*\*(.+?)\*\*$/gm, "<h3>$1</h3>")
    // Bold
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    // Italic
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    // Bullet lists
    .replace(/^[-*]\s+(.+)$/gm, "<li>$1</li>")
    // Horizontal rules / section dividers
    .replace(/^---+$/gm, "<hr>")
    // Clean up META sections for display
    .replace(/---META---/g, "")
    .replace(/---CONTENT---/g, "")
    // Line breaks
    .replace(/\n\n/g, "</p><p>")
    .replace(/\n/g, "<br>");

  // Wrap list items
  html = html.replace(/(<li>.*?<\/li>(\s*<br>)?)+/g, (match) => {
    const cleaned = match.replace(/<br>/g, "");
    return `<ul>${cleaned}</ul>`;
  });

  // Wrap in paragraphs
  html = `<p>${html}</p>`;

  // Clean up empty paragraphs
  html = html.replace(/<p>\s*<\/p>/g, "");
  html = html.replace(/<p>\s*<hr>\s*<\/p>/g, "<hr>");
  html = html.replace(/<p>\s*(<h[23]>)/g, "$1");
  html = html.replace(/(<\/h[23]>)\s*<\/p>/g, "$1");

  return html;
}

function generateHtmlTemplate(metadata: PageMetadata, content: string): string {
  const languageLabel = metadata.language === "es" ? "Español" : "English";
  const generatedDate = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const contentHtml = markdownToHtml(content);

  // MarketBrewer official branding with Metro colors
  return `<!DOCTYPE html>
<html lang="${metadata.language}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${metadata.keyword} - ${metadata.city}, ${metadata.state}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

    * { margin: 0; padding: 0; box-sizing: border-box; }

    /* MarketBrewer Design System - DC Metro Colors */
    :root {
      --metro-red: #BF0D3E;
      --metro-orange: #ED8B00;
      --metro-yellow: #FFD100;
      --metro-green: #00B140;
      --metro-blue: #009CDE;
      --metro-silver: #919D9D;
      --dark-900: #0f172a;
      --dark-800: #1e293b;
      --dark-700: #334155;
      --dark-600: #475569;
      --dark-500: #64748b;
      --dark-400: #94a3b8;
      --dark-300: #cbd5e1;
      --dark-200: #e2e8f0;
      --dark-100: #f1f5f9;
      --dark-50: #f8fafc;
    }

    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 11pt;
      line-height: 1.6;
      color: var(--dark-900);
      background: #fff;
      -webkit-font-smoothing: antialiased;
    }

    .page {
      max-width: 100%;
      margin: 0 auto;
      padding: 40px 50px;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }

    /* Metro stripe decoration */
    .metro-stripe {
      height: 4px;
      background: linear-gradient(90deg,
        var(--metro-red) 0%, var(--metro-red) 16.67%,
        var(--metro-orange) 16.67%, var(--metro-orange) 33.33%,
        var(--metro-yellow) 33.33%, var(--metro-yellow) 50%,
        var(--metro-green) 50%, var(--metro-green) 66.67%,
        var(--metro-blue) 66.67%, var(--metro-blue) 83.33%,
        var(--metro-silver) 83.33%, var(--metro-silver) 100%
      );
      margin-bottom: 24px;
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding-bottom: 20px;
      margin-bottom: 24px;
    }

    .logo {
      font-size: 22pt;
      font-weight: 700;
      color: var(--dark-900);
      letter-spacing: -0.5px;
    }
    .logo span { color: var(--metro-orange); }

    .meta-badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: var(--dark-900);
      color: var(--dark-50);
      padding: 8px 16px;
      border-radius: 20px;
      font-size: 9pt;
      font-weight: 500;
    }

    .page-info {
      background: var(--dark-50);
      border: 1px solid var(--dark-200);
      border-left: 4px solid var(--metro-orange);
      border-radius: 8px;
      padding: 24px;
      margin-bottom: 30px;
    }

    .page-title {
      font-size: 18pt;
      font-weight: 700;
      color: var(--dark-900);
      margin-bottom: 8px;
      text-transform: capitalize;
    }

    .page-location {
      font-size: 12pt;
      color: var(--metro-blue);
      font-weight: 500;
      margin-bottom: 16px;
    }

    .page-stats {
      display: flex;
      gap: 32px;
      flex-wrap: wrap;
    }

    .stat { display: flex; flex-direction: column; }
    .stat-label {
      font-size: 8pt;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--dark-500);
      margin-bottom: 2px;
    }
    .stat-value {
      font-size: 11pt;
      font-weight: 600;
      color: var(--dark-900);
    }

    .content { flex: 1; padding: 0; }

    .content h2 {
      font-size: 14pt;
      font-weight: 700;
      color: var(--dark-900);
      margin: 24px 0 12px 0;
      padding-bottom: 8px;
      border-bottom: 2px solid var(--metro-orange);
    }

    .content h3 {
      font-size: 12pt;
      font-weight: 600;
      color: var(--dark-700);
      margin: 20px 0 10px 0;
    }

    .content p { margin-bottom: 12px; text-align: justify; }
    .content ul { margin: 12px 0; padding-left: 24px; }
    .content li { margin-bottom: 6px; }
    .content hr { border: none; border-top: 1px solid var(--dark-200); margin: 20px 0; }
    .content strong { color: var(--dark-900); }

    .footer {
      margin-top: auto;
      padding-top: 24px;
      border-top: 1px solid var(--dark-200);
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 9pt;
      color: var(--dark-500);
    }

    .footer-brand {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .footer-brand a {
      color: var(--metro-orange);
      text-decoration: none;
      font-weight: 600;
    }

    .footer-note {
      font-style: italic;
    }

    /* Print styles */
    @media print {
      body {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }

      .page {
        padding: 30px 40px;
      }
    }
  </style>
</head>
<body>
  <div class="page">
    <div class="metro-stripe"></div>
    <header class="header">
      <div class="logo">Market<span>Brewer</span></div>
      <div class="meta-badge">
        <span>${languageLabel}</span>
        <span>•</span>
        <span>SEO Content Preview</span>
      </div>
    </header>

    <div class="page-info">
      <h1 class="page-title">${metadata.keyword}</h1>
      <div class="page-location">${metadata.city}, ${metadata.state}</div>
      <div class="page-stats">
        <div class="stat">
          <span class="stat-label">Word Count</span>
          <span class="stat-value">${metadata.word_count.toLocaleString()}</span>
        </div>
        <div class="stat">
          <span class="stat-label">URL Path</span>
          <span class="stat-value">${metadata.url_path}</span>
        </div>
        <div class="stat">
          <span class="stat-label">Model</span>
          <span class="stat-value">${metadata.model}</span>
        </div>
        <div class="stat">
          <span class="stat-label">Generation Time</span>
          <span class="stat-value">${(metadata.generation_time_ms / 1000).toFixed(1)}s</span>
        </div>
      </div>
    </div>

    <div class="content">
      ${contentHtml}
    </div>

    <footer class="footer">
      <div class="footer-brand">
        Powered by <a href="https://marketbrewer.com">marketbrewer.com</a>
      </div>
      <div class="footer-note">Generated ${generatedDate} • For review purposes only</div>
    </footer>
  </div>
</body>
</html>`;
}

async function exportToPdf(filename: string): Promise<string> {
  const inputPath = path.join(TEST_PAGES_DIR, filename);
  const outputFilename = filename.replace(/\.md$/, ".pdf");
  const outputPath = path.join(PDF_OUTPUT_DIR, outputFilename);

  if (!fs.existsSync(inputPath)) {
    throw new Error(`File not found: ${filename}`);
  }

  // Parse the markdown file
  const { metadata, content } = parseMarkdownFile(inputPath);

  // Generate HTML
  const html = generateHtmlTemplate(metadata, content);

  // Ensure output directory exists
  if (!fs.existsSync(PDF_OUTPUT_DIR)) {
    fs.mkdirSync(PDF_OUTPUT_DIR, { recursive: true });
  }

  // Launch browser and generate PDF
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  await page.setContent(html, { waitUntil: "networkidle0" });

  await page.pdf({
    path: outputPath,
    format: "Letter",
    printBackground: true,
    margin: {
      top: "0",
      bottom: "0",
      left: "0",
      right: "0",
    },
  });

  await browser.close();

  return outputFilename;
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log("Usage:");
    console.log("  npx ts-node scripts/export-page-pdf.ts <filename>");
    console.log("  npx ts-node scripts/export-page-pdf.ts --all");
    console.log("\nExamples:");
    console.log("  npx ts-node scripts/export-page-pdf.ts es-1-abogado-de-dui-bethesda-md.md");
    console.log("  npx ts-node scripts/export-page-pdf.ts --all");
    console.log("\nAvailable files:");

    const files = fs.readdirSync(TEST_PAGES_DIR).filter((f) => f.endsWith(".md"));
    files.forEach((f) => console.log(`  - ${f}`));
    return;
  }

  console.log("\n=== MarketBrewer PDF Export ===\n");

  let filesToExport: string[] = [];

  if (args[0] === "--all") {
    filesToExport = fs.readdirSync(TEST_PAGES_DIR).filter((f) => f.endsWith(".md"));
    console.log(`Exporting ${filesToExport.length} files...\n`);
  } else {
    filesToExport = [args[0]];
  }

  const results: { file: string; success: boolean; output?: string; error?: string }[] = [];

  for (const file of filesToExport) {
    console.log(`Exporting: ${file}...`);
    try {
      const outputFile = await exportToPdf(file);
      console.log(`  ✓ Created: ${outputFile}\n`);
      results.push({ file, success: true, output: outputFile });
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error(`  ✗ Failed: ${msg}\n`);
      results.push({ file, success: false, error: msg });
    }
  }

  // Summary
  const successful = results.filter((r) => r.success);
  const failed = results.filter((r) => !r.success);

  console.log("=== Summary ===");
  console.log(`Output directory: ${PDF_OUTPUT_DIR}`);
  console.log(`\nSuccessful: ${successful.length}`);

  if (failed.length > 0) {
    console.log(`Failed: ${failed.length}`);
    failed.forEach((f) => console.log(`  - ${f.file}: ${f.error}`));
  }

  console.log("\nPDF files ready for review!");
}

main().catch((error) => {
  console.error("Export failed:", error);
  process.exit(1);
});
