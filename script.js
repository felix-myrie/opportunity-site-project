let opportunities = [
  { title: 'Build a tiny app', org: 'CodeDay Labs', type: 'tech', tag: 'Make', time: '1 weekend', mode: 'Online' },
  { title: 'The climate zine', org: 'Good Energy Project', type: 'creative', tag: 'Publish', time: '2 weeks', mode: 'Anywhere' },
  { title: 'Youth policy lab', org: 'Civic Futures', type: 'community', tag: 'Shape', time: '6 weeks', mode: 'Online' },
  { title: 'Ask a scientist', org: 'Field Notes', type: 'science', tag: 'Discover', time: '1 afternoon', mode: 'Online' },
  { title: 'Start a micro-fund', org: 'Common Cents', type: 'business', tag: 'Launch', time: '1 month', mode: 'Local' },
  { title: 'Open source summer', org: 'GitHub Education', type: 'tech', tag: 'Contribute', time: 'All summer', mode: 'Online' },
  { title: 'Street studio', org: 'Public Works', type: 'creative', tag: 'Observe', time: '1 weekend', mode: 'Local' },
  { title: 'Neighbourhood atlas', org: 'Map the Change', type: 'community', tag: 'Connect', time: '3 weeks', mode: 'Local' },
];

const grid = document.querySelector('#opportunity-grid');
const visibleCount = document.querySelector('#visible-count');
const resultCount = document.querySelector('#result-count');
const caption = document.querySelector('#output-caption');
const csvStatus = document.querySelector('#csv-status');

const requiredColumns = ['title', 'org', 'type', 'tag', 'time', 'mode'];

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

  return rows.map((values) => Object.fromEntries(requiredColumns.map((column) => [column, values[headers.indexOf(column)] || '']))).filter((item) => item.title);
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[character]));
}

function renderCards(filter = 'all') {
  const filtered = filter === 'all' ? opportunities : opportunities.filter((item) => item.type === filter);
  grid.innerHTML = filtered.map((item, index) => `
    <article class="opportunity-card" style="animation-delay: ${index * 60}ms">
      <div class="card-top"><span class="card-tag">${escapeHtml(item.tag)}</span><span>${String(index + 1).padStart(2, '0')} / ${opportunities.length}</span></div>
      <div><h3>${escapeHtml(item.title)}</h3><div class="card-bottom"><span>${escapeHtml(item.org)}</span><span class="card-arrow">↗</span></div></div>
      <div class="card-bottom"><span>${escapeHtml(item.time)}</span><span>${escapeHtml(item.mode)}</span></div>
    </article>`).join('');
  visibleCount.textContent = String(filtered.length).padStart(2, '0');
}

document.querySelectorAll('.filter-button').forEach((button) => {
  button.addEventListener('click', () => {
    document.querySelector('.filter-button.is-active').classList.remove('is-active');
    button.classList.add('is-active');
    renderCards(button.dataset.filter);
  });
});

document.querySelector('#generator-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const interest = document.querySelector('#interest').value;
  const time = document.querySelector('#time').value;
  const mode = document.querySelector('#mode').value;
  const matches = opportunities.filter((item) => (interest === 'all' || item.type === interest) && (mode === 'any' || item.mode.toLowerCase() === mode));
  const number = Math.max(3, Math.min(8, matches.length || 3));
  resultCount.textContent = `${String(number).padStart(2, '0')} / ${opportunities.length}`;
  const timeLabel = time === 'any' ? 'your pace' : time === 'weekend' ? 'a weekend' : time === 'month' ? 'the next month' : 'your summer';
  caption.textContent = `${number} signals for ${timeLabel}. Pick the one that makes you a little nervous.`;
  document.querySelector('#generator-output').animate([{ transform: 'scale(.98)', opacity: .6 }, { transform: 'scale(1)', opacity: 1 }], { duration: 450, easing: 'cubic-bezier(.2,.8,.2,1)' });
  document.querySelector('#signals').scrollIntoView({ behavior: 'smooth' });
});

async function loadOpportunities() {
  try {
    const response = await fetch('opportunities.csv');
    if (!response.ok) throw new Error('CSV request failed');
    opportunities = parseCsv(await response.text());
    renderCards();
    resultCount.textContent = `06 / ${opportunities.length}`;
    csvStatus.textContent = `${opportunities.length} signals generated from opportunities.csv`;
    csvStatus.classList.add('is-success');
  } catch (error) {
    csvStatus.textContent = 'Using the built-in preview data. Serve this folder to load opportunities.csv.';
  }
}

renderCards();
loadOpportunities();