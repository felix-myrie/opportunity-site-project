let opportunities = [
  { title: 'Build a tiny app', org: 'CodeDay Labs', type: 'tech', tag: 'Make', time: '1 weekend', mode: 'Online', description: 'Learn by building a small app with mentors and a friendly community of student makers.', audience: 'Open to all high-schoolers', region: 'Global', deadline: '2026-10-10', url: 'https://www.codeday.org/' },
  { title: 'The climate zine', org: 'Good Energy Project', type: 'creative', tag: 'Publish', time: '2 weeks', mode: 'Anywhere', description: 'Turn your climate questions into a collaborative zine with young writers, artists, and editors.', audience: 'Open to all high-schoolers', region: 'UK-only', deadline: '2026-10-24', url: 'https://www.goodenergy.org.uk/' },
  { title: 'Youth policy lab', org: 'Civic Futures', type: 'community', tag: 'Shape', time: '6 weeks', mode: 'Online', description: 'Work with other young people to research an issue and turn your ideas into practical policy.', audience: 'Selective', region: 'US-only', deadline: '2026-11-06', url: 'https://www.civicfutures.org.uk/' },
  { title: 'Ask a scientist', org: 'Field Notes', type: 'science', tag: 'Discover', time: '1 afternoon', mode: 'Online', description: 'Bring your biggest science question to a live conversation and learn how researchers think.', audience: 'Open to all high-schoolers', region: 'Global', deadline: '', url: 'https://www.sciencebuddies.org/' },
  { title: 'Start a micro-fund', org: 'Common Cents', type: 'business', tag: 'Launch', time: '1 month', mode: 'Local', description: 'Shape a small community project, build a simple budget, and pitch for starter funding.', audience: 'Selective', region: 'US-only', deadline: '2026-12-01', url: 'https://www.commoncents.org/' },
  { title: 'Open source summer', org: 'GitHub Education', type: 'tech', tag: 'Contribute', time: 'All summer', mode: 'Online', description: 'Make your first contribution to open source and develop practical skills alongside a global community.', audience: 'Open to all high-schoolers', region: 'Global', deadline: '2027-03-15', url: 'https://education.github.com/pack' },
  { title: 'Street studio', org: 'Public Works', type: 'creative', tag: 'Observe', time: '1 weekend', mode: 'Local', description: 'Explore your neighbourhood through photography, drawing, and public storytelling.', audience: 'Open to all high-schoolers', region: 'UK-only', deadline: '', url: 'https://www.publicworks.org.uk/' },
  { title: 'Neighbourhood atlas', org: 'Map the Change', type: 'community', tag: 'Connect', time: '3 weeks', mode: 'Local', description: 'Map the people, places, and stories that make your area work, then publish an atlas together.', audience: 'Open to all high-schoolers', region: 'Global', deadline: '2026-10-31', url: 'https://mapthechange.org/' },
];

const grid = document.querySelector('#opportunity-grid');
const visibleCount = document.querySelector('#visible-count');
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

submissionForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const endpoint = submissionForm.dataset.endpoint.trim();
  if (!endpoint) {
    submissionStatus.textContent = 'Add the Worker URL to the form before accepting submissions.';
    return;
  }

  const submitButton = submissionForm.querySelector('button[type="submit"]');
  submitButton.disabled = true;
  submissionStatus.textContent = 'Sending your signal...';
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: submissionForm.elements.name.value.trim(),
        description: submissionForm.elements.description.value.trim(),
      }),
    });
    if (!response.ok) throw new Error('Submission request failed');
    submissionForm.reset();
    submissionStatus.textContent = 'Thanks. We’ll review your signal soon.';
  } catch (error) {
    submissionStatus.textContent = 'That signal did not send. Please try again in a moment.';
  } finally {
    submitButton.disabled = false;
  }
});

async function loadOpportunities() {
  try {
    const response = await fetch('opportunities.csv');
    if (!response.ok) throw new Error('CSV request failed');
    opportunities = parseCsv(await response.text());
    renderCards();
    csvStatus.textContent = `${opportunities.length} signals generated from opportunities.csv`;
    csvStatus.classList.add('is-success');
  } catch (error) {
    csvStatus.textContent = 'Using the built-in preview data. Serve this folder to load opportunities.csv.';
  }
}

renderCards();
loadOpportunities();