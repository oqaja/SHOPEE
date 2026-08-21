// GANTI dengan URL Web App hasil deploy Apps Script (Code.gs)
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycby92sn8u-W3P5i1nH3xR8-p6QP0uDuj7q1G27qbngIMFlAQlqhC4AbKLOcsdIrQ4v-a/exec';

const STATUS_BELUM = 'Belum Upload';
const STATUS_SUDAH = 'Sudah Upload';

const cardList = document.getElementById('card-list');
const progressFill = document.getElementById('progress-fill');
const progressLabel = document.getElementById('progress-label');
const toast = document.getElementById('toast');

const searchBtn = document.getElementById('search-btn');
const searchModal = document.getElementById('search-modal');
const searchClose = document.getElementById('search-close');
const searchInput = document.getElementById('search-input');
const searchResults = document.getElementById('search-results');

let items = [];
let searchDebounce = null;

function showToast(msg) {
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 1800);
}

function copyText(text, btn) {
  navigator.clipboard.writeText(text).then(() => {
    showToast('Disalin ke clipboard');
    if (btn) {
      btn.classList.add('copied');
      setTimeout(() => btn.classList.remove('copied'), 900);
    }
  }).catch(() => showToast('Gagal menyalin'));
}

async function loadItems() {
  cardList.innerHTML = '<div class="empty-state">Memuat konten...</div>';
  try {
    const res = await fetch(`${APPS_SCRIPT_URL}?action=list`);
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    items = data.items || [];
    renderItems();
  } catch (err) {
    cardList.innerHTML = `<div class="empty-state">Gagal memuat data.<br>${err.message}</div>`;
  }
}

function renderItems() {
  if (items.length === 0) {
    cardList.innerHTML = '<div class="empty-state">Belum ada konten di jadwal.</div>';
    updateProgress();
    return;
  }

  cardList.innerHTML = '';
  items.forEach((item) => {
    cardList.appendChild(buildCard(item));
  });
  updateProgress();
}

function updateProgress() {
  const total = items.length;
  const done = items.filter((i) => i.status === STATUS_SUDAH).length;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  progressFill.style.width = pct + '%';
  progressLabel.textContent = `${done}/${total} SUDAH DIUPLOAD`;
}

function buildCard(item) {
  const card = document.createElement('div');
  card.className = 'card';

  const isDone = item.status === STATUS_SUDAH;

  card.innerHTML = `
    <div class="card-top">
      <div>
        <div class="card-date">${escapeHtml(item.tanggal || '-')}</div>
        <div class="card-title">${escapeHtml(item.judul)}</div>
      </div>
      <button class="status-btn ${isDone ? 'done' : ''}" data-row="${item.row}">
        ${isDone ? '✓ Sudah' : 'Belum'}
      </button>
    </div>

    <div class="card-row">
      <span class="field-label">Caption</span>
      <span class="field-value ${item.caption ? '' : 'empty'}">${item.caption ? escapeHtml(item.caption.slice(0, 40)) + '…' : 'belum tersedia'}</span>
      ${item.caption ? `<button class="icon-btn copy-caption-btn" title="Copy caption">⧉</button>` : ''}
    </div>

    <div class="card-row">
      <span class="field-label">Shopee</span>
      <span class="field-value ${item.linkShopee ? '' : 'empty'}">${item.linkShopee ? escapeHtml(item.linkShopee) : 'belum ada link'}</span>
      ${item.linkShopee ? `<button class="icon-btn copy-link-btn" title="Copy link">⧉</button>` : ''}
    </div>

    ${item.video && item.video.found
      ? `<a class="download-btn" href="${item.video.downloadUrl}" target="_blank" rel="noopener">Download video</a>`
      : `<div class="download-btn unavailable">Video belum ketemu</div>`
    }
  `;

  const statusBtn = card.querySelector('.status-btn');
  statusBtn.addEventListener('click', () => toggleStatus(item, statusBtn));

  const copyCaptionBtn = card.querySelector('.copy-caption-btn');
  if (copyCaptionBtn) copyCaptionBtn.addEventListener('click', () => copyText(item.caption, copyCaptionBtn));

  const copyLinkBtn = card.querySelector('.copy-link-btn');
  if (copyLinkBtn) copyLinkBtn.addEventListener('click', () => copyText(item.linkShopee, copyLinkBtn));

  return card;
}

async function toggleStatus(item, btn) {
  const newStatus = item.status === STATUS_SUDAH ? STATUS_BELUM : STATUS_SUDAH;
  btn.disabled = true;
  try {
    const res = await fetch(`${APPS_SCRIPT_URL}?action=updateStatus&row=${item.row}&status=${encodeURIComponent(newStatus)}`);
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    item.status = newStatus;
    const isDone = newStatus === STATUS_SUDAH;
    btn.classList.toggle('done', isDone);
    btn.textContent = isDone ? '✓ Sudah' : 'Belum';
    updateProgress();
  } catch (err) {
    showToast('Gagal update status');
  } finally {
    btn.disabled = false;
  }
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str == null ? '' : String(str);
  return div.innerHTML;
}

// ---------- SEARCH MODAL ----------

searchBtn.addEventListener('click', () => {
  searchModal.classList.remove('hidden');
  searchInput.value = '';
  searchResults.innerHTML = '';
  searchInput.focus();
});

searchClose.addEventListener('click', () => searchModal.classList.add('hidden'));
searchModal.addEventListener('click', (e) => {
  if (e.target === searchModal) searchModal.classList.add('hidden');
});

searchInput.addEventListener('input', () => {
  clearTimeout(searchDebounce);
  const q = searchInput.value.trim();
  if (q.length < 2) {
    searchResults.innerHTML = '';
    return;
  }
  searchDebounce = setTimeout(() => runSearch(q), 350);
});

async function runSearch(q) {
  searchResults.innerHTML = '<div class="empty-state">Mencari...</div>';
  try {
    const res = await fetch(`${APPS_SCRIPT_URL}?action=search&q=${encodeURIComponent(q)}`);
    const data = await res.json();
    const results = data.results || [];
    if (results.length === 0) {
      searchResults.innerHTML = '<div class="empty-state">Gak ada hasil.</div>';
      return;
    }
    searchResults.innerHTML = '';
    results.forEach((r) => {
      const el = document.createElement('div');
      el.className = 'result-item';
      el.innerHTML = `
        <div class="result-info">
          <div class="result-title">${escapeHtml(r.judul)}</div>
          <div class="result-meta">${escapeHtml(r.brand)} · Rp${escapeHtml(r.harga)}</div>
        </div>
        <button class="icon-btn">⧉</button>
      `;
      el.querySelector('button').addEventListener('click', (e) => copyText(r.link, e.target));
      searchResults.appendChild(el);
    });
  } catch (err) {
    searchResults.innerHTML = '<div class="empty-state">Gagal mencari.</div>';
  }
}

// ---------- INIT ----------

loadItems();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}
