let opportunities = [];
const embeddedDataEl = document.querySelector('#opportunities-data');
if (embeddedDataEl && embeddedDataEl.textContent.trim()) {
  try {
    opportunities = JSON.parse(embeddedDataEl.textContent.trim());
  } catch (e) {
    console.error('Failed to parse embedded opportunities data:', e);
  }
}

const grid = document.querySelector('#opportunity-grid');
const visibleCount = document.querySelector('#visible-count');
const totalCount = document.querySelector('#total-count');
const csvStatus = document.querySelector('#csv-status');
const submissionForm = document.querySelector('#submission-form');
const submissionStatus = document.querySelector('#submission-status');

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

  return rows.map((values) => Object.fromEntries([...requiredColumns, ...optionalColumns].map((column) => [column, values[headers.indexOf(column)] || '']))).filter((item) => item.title);
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[character]));
}

function getDeadlineValue(item) {
  return item.deadline && !Number.isNaN(Date.parse(item.deadline)) ? Date.parse(item.deadline) : Number.POSITIVE_INFINITY;
}

function renderCards() {
  const activeFilters = Object.fromEntries([...new Set([...document.querySelectorAll('.filter-button')].map((button) => button.dataset.filterGroup))].map((group) => [group, document.querySelector(`.filter-button.is-active[data-filter-group="${group}"]`)?.dataset.filter || 'all']));
  const query = document.querySelector('#opportunity-search').value.trim().toLowerCase();
  const sortOrder = document.querySelector('#deadline-sort').value;
  const filtered = opportunities.filter((item) => {
    const audience = item.audience.toLowerCase();
    const region = item.region.toLowerCase();
    const matchesSubject = activeFilters.subject === 'all' || item.type === activeFilters.subject;
    const matchesAudience = activeFilters.audience === 'all' || (activeFilters.audience === 'selective' && audience === 'selective') || (activeFilters.audience === 'open' && audience === 'open to all high-schoolers');
    const matchesRegion = activeFilters.region === 'all' || (activeFilters.region === 'us' && region === 'us-only') || (activeFilters.region === 'uk' && region === 'uk-only') || (activeFilters.region === 'global' && region === 'global');
    const searchableText = [item.title, item.org, item.type, item.tag, item.description, item.audience, item.region].join(' ').toLowerCase();
    return matchesSubject && matchesAudience && matchesRegion && searchableText.includes(query);
  }).sort((first, second) => {
    const firstDeadline = getDeadlineValue(first);
    const secondDeadline = getDeadlineValue(second);
    if (firstDeadline === secondDeadline) return 0;
    if (firstDeadline === Number.POSITIVE_INFINITY) return 1;
    if (secondDeadline === Number.POSITIVE_INFINITY) return -1;
    return sortOrder === 'latest' ? secondDeadline - firstDeadline : firstDeadline - secondDeadline;
  });
  grid.innerHTML = filtered.map((item, index) => `
    <article class="opportunity-card" style="animation-delay: ${index * 60}ms">
      <div class="card-top"><span class="card-tag">${escapeHtml(item.tag)}</span><span>${String(index + 1).padStart(2, '0')} / ${opportunities.length}</span></div>
      <div><h3>${escapeHtml(item.title)}</h3><p class="card-description">${escapeHtml(item.description || 'A chance to learn, make, and meet people who are figuring things out too.')}</p><div class="card-bottom"><span>${escapeHtml(item.org)}</span><a class="card-arrow" href="${escapeHtml(item.url || '#')}" target="_blank" rel="noopener noreferrer" aria-label="Visit ${escapeHtml(item.title)}">↗</a></div></div>
      <div class="card-tags"><span>${escapeHtml(item.audience || 'Open to all high-schoolers')}</span><span>${escapeHtml(item.region || 'Global')}</span></div>
      <div class="card-bottom"><span>${escapeHtml(item.time)}</span><span>${item.deadline ? `Deadline: ${escapeHtml(item.deadline)}` : 'No deadline'}</span></div>
    </article>`).join('');
  visibleCount.textContent = String(filtered.length).padStart(2, '0');
  if (totalCount) totalCount.textContent = String(opportunities.length).padStart(2, '0');
}

document.querySelectorAll('.filter-button').forEach((button) => {
  button.addEventListener('click', () => {
    document.querySelectorAll(`.filter-button.is-active[data-filter-group="${button.dataset.filterGroup}"]`).forEach((activeButton) => activeButton.classList.remove('is-active'));
    button.classList.add('is-active');
    renderCards();
  });
});

document.querySelector('#opportunity-search').addEventListener('input', renderCards);
document.querySelector('#deadline-sort').addEventListener('change', renderCards);

const endpoint = 'https://opportunity-worker.graphicvoxel.workers.dev/';

submissionForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  const submitButton = submissionForm.querySelector('button[type="submit"]');

  submitButton.disabled = true;
  submissionStatus.textContent = 'Sending your signal...';

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: submissionForm.elements.name.value.trim(),
        description: submissionForm.elements.description.value.trim()
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Submission request failed');
    }

    submissionForm.reset();

    submissionStatus.textContent =
      'Thanks. We’ll review your signal soon.';

    console.log('Submission saved:', data);

  } catch (error) {
    console.error('Submission error:', error);

    submissionStatus.textContent =
      'That signal did not send. Please try again in a moment.';

  } finally {
    submitButton.disabled = false;
  }
});
async function loadOpportunities() {
  const url = window.SPREADSHEET_URL || 'opportunities.csv';
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error('Spreadsheet request failed');
    opportunities = parseCsv(await response.text());
    renderCards();
    const sourceLabel = window.SPREADSHEET_URL ? 'live Google Sheet' : 'opportunities.csv';
    if (csvStatus) {
      csvStatus.textContent = `${opportunities.length} signals generated from ${sourceLabel}`;
      csvStatus.classList.add('is-success');
    }
  } catch (error) {
    if (opportunities.length > 0) {
      if (csvStatus) {
        csvStatus.textContent = `${opportunities.length} signals generated from pre-rendered build`;
        csvStatus.classList.add('is-success');
      }
    } else if (csvStatus) {
      csvStatus.textContent = 'Using the built-in preview data. Serve this folder to load opportunities.csv.';
    }
  }
}

if (opportunities.length > 0) {
  renderCards();
  if (csvStatus) {
    csvStatus.textContent = `${opportunities.length} signals generated from pre-rendered build`;
    csvStatus.classList.add('is-success');
  }
}

loadOpportunities();