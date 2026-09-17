import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const requiredColumns = ['title', 'org', 'type', 'tag', 'time', 'mode'];
const optionalColumns = ['description', 'audience', 'region', 'deadline', 'url'];

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    const nextCharacter = text[index + 1];
    if (character === '"' && quoted && nextCharacter === '"') {
      cell += '"';
      index += 1;
    } else if (character === '"') {
      quoted = !quoted;
    } else if (character === ',' && !quoted) {
      row.push(cell.trim());
      cell = '';
    } else if ((character === '\n' || character === '\r') && !quoted) {
      if (character === '\r' && nextCharacter === '\n') index += 1;
      row.push(cell.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += character;
    }
  }
  row.push(cell.trim());
  if (row.some(Boolean)) rows.push(row);

  if (rows.length < 2) throw new Error('Add a header row and at least one opportunity.');
  const headers = rows.shift().map((header) => header.toLowerCase());
  const missing = requiredColumns.filter((column) => !headers.includes(column));
  if (missing.length) throw new Error(`Missing columns: ${missing.join(', ')}.`);

  return rows
    .map((values) =>
      Object.fromEntries(
        [...requiredColumns, ...optionalColumns].map((column) => [column, values[headers.indexOf(column)] || ''])
      )
    )
    .filter((item) => item.title);
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  }[character]));
}

function getDeadlineValue(item) {
  return item.deadline && !Number.isNaN(Date.parse(item.deadline)) ? Date.parse(item.deadline) : Number.POSITIVE_INFINITY;
}

function renderCardsHtml(items) {
  return items.map((item, index) => `
        <article class="opportunity-card" style="animation-delay: ${index * 60}ms">
          <div class="card-top"><span class="card-tag">${escapeHtml(item.tag)}</span><span>${String(index + 1).padStart(2, '0')} / ${items.length}</span></div>
          <div><h3>${escapeHtml(item.title)}</h3><p class="card-description">${escapeHtml(item.description || 'A chance to learn, make, and meet people who are figuring things out too.')}</p><div class="card-bottom"><span>${escapeHtml(item.org)}</span><a class="card-arrow" href="${escapeHtml(item.url || '#')}" target="_blank" rel="noopener noreferrer" aria-label="Visit ${escapeHtml(item.title)}">↗</a></div></div>
          <div class="card-tags"><span>${escapeHtml(item.audience || 'Open to all high-schoolers')}</span><span>${escapeHtml(item.region || 'Global')}</span></div>
          <div class="card-bottom"><span>${escapeHtml(item.time)}</span><span>${item.deadline ? `Deadline: ${escapeHtml(item.deadline)}` : 'No deadline'}</span></div>
        </article>`).join('');
}

async function fetchSpreadsheetData(url) {
  console.log(`Fetching spreadsheet data from: ${url}`);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch spreadsheet: ${response.status} ${response.statusText}`);
  }
  return await response.text();
}

async function main() {
  const spreadsheetUrl = process.env.SPREADSHEET_URL?.trim();
  const csvFilePath = path.join(__dirname, 'opportunities.csv');
  const indexHtmlPath = path.join(__dirname, 'index.html');

  let csvContent = '';
  let sourceLabel = '';

  if (spreadsheetUrl) {
    try {
      csvContent = await fetchSpreadsheetData(spreadsheetUrl);
      sourceLabel = 'live Google Sheet';
      console.log('Successfully fetched CSV data from remote spreadsheet.');
    } catch (err) {
      console.warn(`Warning: Could not fetch from SPREADSHEET_URL (${err.message}). Falling back to local opportunities.csv.`);
      if (fs.existsSync(csvFilePath)) {
        csvContent = fs.readFileSync(csvFilePath, 'utf8');
        sourceLabel = 'opportunities.csv (fallback)';
      } else {
        throw new Error('No local opportunities.csv found and remote fetch failed.');
      }
    }
  } else {
    if (!fs.existsSync(csvFilePath)) {
      throw new Error(`opportunities.csv not found at ${csvFilePath}`);
    }
    csvContent = fs.readFileSync(csvFilePath, 'utf8');
    sourceLabel = 'opportunities.csv';
    console.log('Using local opportunities.csv');
  }

  const opportunities = parseCsv(csvContent);
  console.log(`Parsed ${opportunities.length} opportunities from ${sourceLabel}.`);

  // Initial sort: soonest deadline (matches default UI dropdown)
  const sorted = [...opportunities].sort((first, second) => {
    const firstDeadline = getDeadlineValue(first);
    const secondDeadline = getDeadlineValue(second);
    if (firstDeadline === secondDeadline) return 0;
    if (firstDeadline === Number.POSITIVE_INFINITY) return 1;
    if (secondDeadline === Number.POSITIVE_INFINITY) return -1;
    return firstDeadline - secondDeadline;
  });

  const cardsHtml = renderCardsHtml(sorted);
  const countPadded = String(sorted.length).padStart(2, '0');

  let html = fs.readFileSync(indexHtmlPath, 'utf8');

  // Inject or replace content inside <div class="opportunity-grid" id="opportunity-grid">...</div>
  const gridRegex = /(<div class="opportunity-grid" id="opportunity-grid">)[\s\S]*?(<\/div>\s*<div class="signals-footer">)/;
  if (!gridRegex.test(html)) {
    throw new Error('Could not find #opportunity-grid container in index.html');
  }
  html = html.replace(gridRegex, `$1${cardsHtml}\n      $2`);

  // Update footer counts: "Showing <strong id="visible-count">...</strong> of <span id="total-count">...</span> signals"
  const footerCountsRegex = /(<strong id="visible-count">)[^<]*(<\/strong>\s*of\s*)(?:<span id="total-count">[^<]*<\/span>|\d+)(\s*signals)/;
  if (footerCountsRegex.test(html)) {
    html = html.replace(footerCountsRegex, `$1${countPadded}$2<span id="total-count">${countPadded}</span>$3`);
  }

  // Update status message
  const statusRegex = /(<p id="csv-status" class="csv-status">)[^<]*(<\/p>)/;
  if (statusRegex.test(html)) {
    html = html.replace(statusRegex, `$1${sorted.length} signals generated from ${sourceLabel}$2`);
  }

  // Cleanly inject or update data payload script: <script id="opportunities-data" type="application/json">...</script>
  const jsonPayload = JSON.stringify(opportunities);
  const dataScriptTag = `\n    <script id="opportunities-data" type="application/json">${jsonPayload}</script>`;

  const existingDataScript = /<script id="opportunities-data" type="application\/json">[\s\S]*?<\/script>/;
  if (existingDataScript.test(html)) {
    html = html.replace(existingDataScript, `<script id="opportunities-data" type="application/json">${jsonPayload}</script>`);
  } else {
    // Insert right before <script src="script.js">
    html = html.replace(/(\s*<script src="script\.js"><\/script>)/, `${dataScriptTag}$1`);
  }

  // If SPREADSHEET_URL is provided, inject window.SPREADSHEET_URL for optional client runtime sync
  const configScriptTag = spreadsheetUrl
    ? `\n    <script>window.SPREADSHEET_URL = ${JSON.stringify(spreadsheetUrl)};</script>`
    : '';
  const existingConfigScript = /<script>\s*window\.SPREADSHEET_URL\s*=[\s\S]*?<\/script>/;
  if (existingConfigScript.test(html)) {
    html = html.replace(existingConfigScript, configScriptTag ? configScriptTag.trim() : '');
  } else if (configScriptTag) {
    html = html.replace(/(\s*<script id="opportunities-data")/, `${configScriptTag}$1`);
  }

  fs.writeFileSync(indexHtmlPath, html, 'utf8');
  console.log(`Successfully generated index.html with ${sorted.length} pre-rendered opportunity cards!`);
}

main().catch((err) => {
  console.error('Build failed:', err);
  process.exit(1);
});

