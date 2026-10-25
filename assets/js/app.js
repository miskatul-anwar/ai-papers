/**
 * AI Paper Library — Archival Client
 * Clean, zero-bloat, keyboard-friendly bibliography engine.
 */

(function () {
  'use strict';

  // State
  let papers = [];
  const state = {
    query: '',
    area: 'all',
    decade: 'all',
    lpOnly: false,
    sort: 'year-desc',
    view: localStorage.getItem('ai_papers_view') || 'list'
  };

  const BASE_URL = (window.SITE_CONFIG && window.SITE_CONFIG.baseUrl) || '';

  // Elements
  const searchInput = document.getElementById('searchInput');
  const searchClearBtn = document.getElementById('searchClearBtn');
  const areaTags = document.querySelectorAll('.area-tag-btn');
  const decadeSelect = document.getElementById('decadeSelect');
  const sortSelect = document.getElementById('sortSelect');
  const lpOnlyCb = document.getElementById('lpOnlyCb');
  const catalogList = document.getElementById('catalogList');
  const tableWrapper = document.getElementById('tableWrapper');
  const tableBody = document.getElementById('tableBody');
  const matchCount = document.getElementById('matchCount');
  const viewListBtn = document.getElementById('viewListBtn');
  const viewTableBtn = document.getElementById('viewTableBtn');

  // Reader Drawer
  const pdfDrawer = document.getElementById('pdfDrawer');
  const drawerIframe = document.getElementById('drawerIframe');
  const drawerTitle = document.getElementById('drawerTitle');
  const drawerYearTag = document.getElementById('drawerYearTag');
  const drawerAreaTag = document.getElementById('drawerAreaTag');
  const drawerDirectTab = document.getElementById('drawerDirectTab');
  const drawerDownloadBtn = document.getElementById('drawerDownloadBtn');
  const closeDrawerBtn = document.getElementById('closeDrawerBtn');

  const siteToast = document.getElementById('siteToast');
  const themeToggle = document.getElementById('themeToggle');

  /* ==========================================================================
     Theme & Keyboard Shortcuts
     ========================================================================== */

  function toggleTheme() {
    const isDark = document.documentElement.classList.toggle('dark');
    localStorage.setItem('ai_papers_theme', isDark ? 'dark' : 'light');
  }

  if (themeToggle) {
    themeToggle.addEventListener('click', toggleTheme);
  }

  window.addEventListener('keydown', (e) => {
    // Focus search on '/'
    if (e.key === '/' && document.activeElement !== searchInput) {
      if (searchInput) {
        e.preventDefault();
        searchInput.focus();
        searchInput.select();
      }
    }
    // Toggle theme on 't' or 'T' if not in input
    if ((e.key === 't' || e.key === 'T') && !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
      toggleTheme();
    }
    // Close drawer / escape
    if (e.key === 'Escape') {
      closeDrawer();
      if (searchInput) searchInput.blur();
    }
  });

  function showToast(msg, ms = 2000) {
    if (!siteToast) return;
    siteToast.textContent = msg;
    siteToast.classList.add('show');
    setTimeout(() => siteToast.classList.remove('show'), ms);
  }

  /* ==========================================================================
     Reader Drawer
     ========================================================================== */

  function openDrawer(paper) {
    if (!pdfDrawer || !drawerIframe) return;
    const url = `${BASE_URL}/${paper.local_path}`;
    drawerIframe.src = url;
    drawerTitle.textContent = paper.title;
    drawerYearTag.textContent = paper.year;
    drawerAreaTag.textContent = paper.area_name;
    drawerDirectTab.href = url;
    drawerDownloadBtn.href = url;
    drawerDownloadBtn.setAttribute('download', `${paper.year}_${paper.id}.pdf`);
    pdfDrawer.classList.add('open');
  }

  function closeDrawer() {
    if (!pdfDrawer || !drawerIframe) return;
    pdfDrawer.classList.remove('open');
    drawerIframe.src = '';
  }

  if (closeDrawerBtn) closeDrawerBtn.addEventListener('click', closeDrawer);

  /* ==========================================================================
     Filtering & Sorting
     ========================================================================== */

  function getFiltered() {
    return papers.filter(p => {
      if (state.query) {
        const q = state.query.toLowerCase();
        const m = p.title.toLowerCase().includes(q) ||
                  p.authors.toLowerCase().includes(q) ||
                  p.year.toString().includes(q) ||
                  p.id.toLowerCase().includes(q) ||
                  p.area_name.toLowerCase().includes(q);
        if (!m) return false;
      }
      if (state.area !== 'all' && p.area !== state.area) return false;
      if (state.lpOnly && !p.learning_path) return false;

      if (state.decade !== 'all') {
        const y = p.year;
        if (state.decade === 'pre-1950' && y >= 1950) return false;
        if (state.decade === '1950s' && (y < 1950 || y > 1959)) return false;
        if (state.decade === '1960s' && (y < 1960 || y > 1969)) return false;
        if (state.decade === '1970s' && (y < 1970 || y > 1979)) return false;
        if (state.decade === '1980s' && (y < 1980 || y > 1989)) return false;
        if (state.decade === '1990s' && (y < 1990 || y > 1999)) return false;
        if (state.decade === '2000s' && (y < 2000 || y > 2009)) return false;
        if (state.decade === '2010s' && (y < 2010 || y > 2019)) return false;
        if (state.decade === '2020s' && y < 2020) return false;
      }
      return true;
    }).sort((a, b) => {
      if (state.sort === 'year-desc') return b.year - a.year || a.title.localeCompare(b.title);
      if (state.sort === 'year-asc') return a.year - b.year || a.title.localeCompare(b.title);
      if (state.sort === 'title-asc') return a.title.localeCompare(b.title);
      if (state.sort === 'size-desc') return (b.bytes || 0) - (a.bytes || 0);
      return 0;
    });
  }

  function render() {
    if (!catalogList || !tableBody) return;
    const items = getFiltered();

    if (matchCount) {
      matchCount.textContent = `${items.length} of ${papers.length} papers listed`;
    }

    // Dense List View
    catalogList.innerHTML = items.map(p => {
      const pdfUrl = `${BASE_URL}/${p.local_path}`;
      return `
        <article class="paper-entry" data-id="${p.id}">
          <div class="entry-topline">
            <div class="entry-left-meta">
              <span class="entry-year">${p.year}</span>
              <span class="entry-area-code">${escapeHtml(p.area_name)}</span>
              ${p.learning_path ? '<span class="entry-lp-badge">· Guided Path (121)</span>' : ''}
            </div>
            <span class="entry-size">${p.size_human}</span>
          </div>

          <h3 class="entry-title">
            <a href="${pdfUrl}" target="_blank" rel="noopener noreferrer" class="paper-link" data-id="${p.id}">
              ${escapeHtml(p.title)}
            </a>
          </h3>

          <p class="entry-authors">${escapeHtml(p.authors)}</p>

          <div class="entry-actions">
            <a href="${pdfUrl}" target="_blank" rel="noopener noreferrer" class="action-link">Open PDF ↗</a>
            <a href="${pdfUrl}" download="${p.year}_${p.id}.pdf" class="action-link action-dim">Download</a>
            <a href="${p.source_url}" target="_blank" rel="noopener noreferrer" class="action-link action-dim">Source / DOI ↗</a>
            <button class="action-link action-dim toggle-bibtex-btn" data-id="${p.id}">BibTeX</button>
            <button class="action-link action-dim toggle-hash-btn" data-id="${p.id}">SHA-256</button>
            <button class="action-link action-dim drawer-open-btn" data-id="${p.id}">Reader Drawer</button>
          </div>

          <div class="entry-expandable-box" id="box_${p.id}"></div>
        </article>
      `;
    }).join('');

    // Table View
    tableBody.innerHTML = items.map(p => {
      const pdfUrl = `${BASE_URL}/${p.local_path}`;
      return `
        <tr data-id="${p.id}">
          <td style="font-family: var(--font-mono); font-weight: 600;">${p.year}</td>
          <td>
            <div class="table-paper-title">
              <a href="${pdfUrl}" target="_blank" rel="noopener noreferrer">${escapeHtml(p.title)}</a>
              ${p.learning_path ? '<span style="font-size: 0.75rem; color: var(--accent-ink); margin-left: 6px;">[Path]</span>' : ''}
            </div>
            <div class="table-paper-authors">${escapeHtml(p.authors)}</div>
          </td>
          <td style="font-family: var(--font-mono); font-size: 0.8rem; color: var(--text-muted);">${escapeHtml(p.area_name)}</td>
          <td>
            <div style="display: flex; gap: 10px; font-family: var(--font-mono); font-size: 0.78rem;">
              <a href="${pdfUrl}" target="_blank" rel="noopener" style="color: var(--link-color);">PDF ↗</a>
              <a href="${pdfUrl}" download="${p.year}_${p.id}.pdf" style="color: var(--text-muted);">Download</a>
              <button class="action-link toggle-bibtex-btn" data-id="${p.id}" style="color: var(--text-muted);">Cite</button>
            </div>
          </td>
          <td style="font-family: var(--font-mono); font-size: 0.78rem; color: var(--text-muted);">${p.size_human}</td>
        </tr>
      `;
    }).join('');

    bindActions();
  }

  function bindActions() {
    // Drawer Reader buttons
    document.querySelectorAll('.drawer-open-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const p = papers.find(item => item.id === btn.dataset.id);
        if (p) openDrawer(p);
      });
    });

    // BibTeX toggles
    document.querySelectorAll('.toggle-bibtex-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const id = btn.dataset.id;
        const box = document.getElementById(`box_${id}`);
        if (!box) return;
        const p = papers.find(item => item.id === id);
        if (!p) return;

        if (box.classList.contains('open') && box.dataset.type === 'bibtex') {
          box.classList.remove('open');
          return;
        }

        box.dataset.type = 'bibtex';
        box.innerHTML = `
          <button class="box-copy-btn" data-text="${encodeURIComponent(p.bibtex)}">Copy</button>
          <pre><code>${escapeHtml(p.bibtex)}</code></pre>
        `;
        box.classList.add('open');

        box.querySelector('.box-copy-btn').addEventListener('click', function () {
          navigator.clipboard.writeText(decodeURIComponent(this.dataset.text)).then(() => {
            this.textContent = 'Copied!';
            showToast('BibTeX copied to clipboard');
            setTimeout(() => { this.textContent = 'Copy'; }, 1800);
          });
        });
      });
    });

    // SHA-256 Checksum toggles
    document.querySelectorAll('.toggle-hash-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const id = btn.dataset.id;
        const box = document.getElementById(`box_${id}`);
        if (!box) return;
        const p = papers.find(item => item.id === id);
        if (!p) return;

        if (box.classList.contains('open') && box.dataset.type === 'hash') {
          box.classList.remove('open');
          return;
        }

        box.dataset.type = 'hash';
        box.innerHTML = `
          <div style="display: flex; flex-direction: column; gap: 4px;">
            <div><strong>File:</strong> ${escapeHtml(p.local_path)} (${(p.bytes || 0).toLocaleString()} bytes)</div>
            <div><strong>SHA-256:</strong> <span style="color: var(--link-color);">${escapeHtml(p.sha256 || 'Verified')}</span></div>
            <div><strong>Original PDF URL:</strong> <a href="${p.pdf_url}" target="_blank" rel="noopener" style="color: var(--link-color);">${escapeHtml(p.pdf_url)}</a></div>
          </div>
        `;
        box.classList.add('open');
      });
    });
  }

  function setView(view) {
    state.view = view;
    localStorage.setItem('ai_papers_view', view);
    if (view === 'list') {
      if (catalogList) catalogList.style.display = 'flex';
      if (tableWrapper) tableWrapper.style.display = 'none';
      if (viewListBtn) viewListBtn.classList.add('active');
      if (viewTableBtn) viewTableBtn.classList.remove('active');
    } else {
      if (catalogList) catalogList.style.display = 'none';
      if (tableWrapper) tableWrapper.style.display = 'block';
      if (viewListBtn) viewListBtn.classList.remove('active');
      if (viewTableBtn) viewTableBtn.classList.add('active');
    }
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /* ==========================================================================
     Learning Path Checklist
     ========================================================================== */

  function initLearningPath() {
    const checkboxes = document.querySelectorAll('.phase-cb');
    if (!checkboxes.length) return;

    let readSet = new Set(JSON.parse(localStorage.getItem('ai_papers_read') || '[]'));

    function update() {
      const total = checkboxes.length;
      let count = 0;
      checkboxes.forEach(cb => {
        if (readSet.has(cb.dataset.id)) {
          cb.checked = true;
          cb.closest('.phase-item').classList.add('done');
          count++;
        } else {
          cb.checked = false;
          cb.closest('.phase-item').classList.remove('done');
        }
      });
      const pct = total > 0 ? Math.round((count / total) * 100) : 0;
      const bar = document.getElementById('syllabusProgressBar');
      const text = document.getElementById('syllabusProgressText');
      if (bar) bar.style.width = `${pct}%`;
      if (text) text.textContent = `${count} / ${total} papers completed (${pct}%)`;
    }

    checkboxes.forEach(cb => {
      cb.addEventListener('change', () => {
        const id = cb.dataset.id;
        if (cb.checked) {
          readSet.add(id);
          showToast('Marked as read');
        } else {
          readSet.delete(id);
        }
        localStorage.setItem('ai_papers_read', JSON.stringify(Array.from(readSet)));
        update();
      });
    });

    const resetBtn = document.getElementById('syllabusResetBtn');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        if (confirm('Reset your reading checklist progress?')) {
          readSet.clear();
          localStorage.removeItem('ai_papers_read');
          update();
          showToast('Progress reset');
        }
      });
    }

    update();
  }

  /* ==========================================================================
     Catalog Initialization
     ========================================================================== */

  async function initCatalog() {
    if (!catalogList) return;

    try {
      const res = await fetch(`${BASE_URL}/assets/data/papers.json`);
      if (!res.ok) throw new Error('Data fetch failed');
      papers = await res.json();

      // Read URL Params
      const params = new URLSearchParams(window.location.search);
      if (params.has('q')) {
        state.query = params.get('q');
        if (searchInput) searchInput.value = state.query;
      }
      if (params.has('area')) {
        state.area = params.get('area');
        areaTags.forEach(t => t.classList.toggle('active', t.dataset.area === state.area));
      }
      if (params.has('lp')) {
        state.lpOnly = params.get('lp') === 'true';
        if (lpOnlyCb) lpOnlyCb.checked = state.lpOnly;
      }

      // Handlers
      if (searchInput) {
        searchInput.addEventListener('input', (e) => {
          state.query = e.target.value.trim();
          if (searchClearBtn) searchClearBtn.style.display = state.query ? 'block' : 'none';
          render();
        });
      }

      if (searchClearBtn) {
        searchClearBtn.addEventListener('click', () => {
          if (searchInput) searchInput.value = '';
          state.query = '';
          searchClearBtn.style.display = 'none';
          render();
        });
      }

      if (decadeSelect) {
        decadeSelect.addEventListener('change', (e) => {
          state.decade = e.target.value;
          render();
        });
      }

      if (sortSelect) {
        sortSelect.addEventListener('change', (e) => {
          state.sort = e.target.value;
          render();
        });
      }

      if (lpOnlyCb) {
        lpOnlyCb.addEventListener('change', (e) => {
          state.lpOnly = e.target.checked;
          render();
        });
      }

      areaTags.forEach(tag => {
        tag.addEventListener('click', () => {
          areaTags.forEach(t => t.classList.remove('active'));
          tag.classList.add('active');
          state.area = tag.dataset.area;
          render();
        });
      });

      if (viewListBtn) viewListBtn.addEventListener('click', () => setView('list'));
      if (viewTableBtn) viewTableBtn.addEventListener('click', () => setView('table'));

      setView(state.view);
      render();

    } catch (e) {
      console.error('Catalog initialization error:', e);
      if (matchCount) matchCount.textContent = 'Failed to load paper index.';
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    initCatalog();
    initLearningPath();
  });

})();
