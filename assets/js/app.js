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
    minYear: 1763,
    lpOnly: false,
    sort: 'year-desc',
    view: localStorage.getItem('ai_papers_view') || 'list'
  };

  const BASE_URL = (window.SITE_CONFIG && window.SITE_CONFIG.baseUrl) || '';

  // Elements
  const searchInput = document.getElementById('searchInput');
  const searchClearBtn = document.getElementById('searchClearBtn');
  const searchShortcut = document.querySelector('.search-shortcut');
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
  const drawerBackdrop = document.getElementById('drawerBackdrop');
  const drawerIframe = document.getElementById('drawerIframe');
  const drawerTitle = document.getElementById('drawerTitle');
  const drawerYearTag = document.getElementById('drawerYearTag');
  const drawerAreaTag = document.getElementById('drawerAreaTag');
  const drawerDirectTab = document.getElementById('drawerDirectTab');
  const drawerDownloadBtn = document.getElementById('drawerDownloadBtn');
  const closeDrawerBtn = document.getElementById('closeDrawerBtn');

  const siteToast = document.getElementById('siteToast');

  /* ==========================================================================
     Theme & Keyboard Shortcuts
     ========================================================================== */

  function toggleTheme() {
    const isDark = document.documentElement.classList.toggle('dark');
    localStorage.setItem('ai_papers_theme', isDark ? 'dark' : 'light');
  }

  document.querySelectorAll('.theme-toggle').forEach(btn => {
    btn.addEventListener('click', toggleTheme);
  });

  window.addEventListener('keydown', (e) => {
    // Focus search on '/'
    const homeInput = document.querySelector('.home-search-input');
    const targetInput = searchInput || homeInput;
    if (e.key === '/' && document.activeElement !== targetInput) {
      if (targetInput) {
        e.preventDefault();
        targetInput.focus();
        targetInput.select();
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
    pdfDrawer.setAttribute('aria-hidden', 'false');
    if (drawerBackdrop) {
      drawerBackdrop.classList.add('open');
      drawerBackdrop.setAttribute('aria-hidden', 'false');
    }
    document.body.style.overflow = 'hidden';
  }

  function closeDrawer() {
    if (!pdfDrawer || !drawerIframe) return;
    pdfDrawer.classList.remove('open');
    pdfDrawer.setAttribute('aria-hidden', 'true');
    if (drawerBackdrop) {
      drawerBackdrop.classList.remove('open');
      drawerBackdrop.setAttribute('aria-hidden', 'true');
    }
    drawerIframe.src = '';
    document.body.style.overflow = '';
  }

  if (closeDrawerBtn) closeDrawerBtn.addEventListener('click', closeDrawer);
  if (drawerBackdrop) drawerBackdrop.addEventListener('click', closeDrawer);

  /* ==========================================================================
     Search UI Helpers
     ========================================================================== */

  function updateSearchUI() {
    if (searchClearBtn) {
      searchClearBtn.style.display = state.query ? 'block' : 'none';
    }
    if (searchShortcut) {
      searchShortcut.style.display = state.query ? 'none' : 'block';
    }
  }

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
      if (state.minYear && state.minYear > 1763 && p.year < state.minYear) return false;

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
              <span style="color: var(--text-muted); font-size: 0.72rem;">[CAT. ${p.year}.${p.id}]</span>
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
            </div>
            <div class="table-paper-authors">${escapeHtml(p.authors)}</div>
          </td>
          <td style="font-family: var(--font-mono); font-size: 0.8rem; color: var(--text-muted);">${escapeHtml(p.area_name)}</td>
          <td>
            <div style="display: flex; gap: 8px; font-family: var(--font-mono); font-size: 0.78rem; flex-wrap: wrap;">
              <a href="${pdfUrl}" target="_blank" rel="noopener" style="color: var(--link-color);">PDF ↗</a>
              <a href="${pdfUrl}" download="${p.year}_${p.id}.pdf" style="color: var(--text-muted);">Download</a>
              <button class="action-link toggle-bibtex-btn" data-id="${p.id}" style="color: var(--text-muted);">Cite</button>
              <button class="action-link drawer-open-btn" data-id="${p.id}" style="color: var(--text-muted);">Reader</button>
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

    // BibTeX toggles & cite actions
    document.querySelectorAll('.toggle-bibtex-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const id = btn.dataset.id;
        const p = papers.find(item => item.id === id);
        if (!p) return;

        // In table view, copy BibTeX directly to clipboard
        if (btn.closest('#tableBody') || !document.getElementById(`box_${id}`)) {
          navigator.clipboard.writeText(p.bibtex).then(() => {
            const originalText = btn.textContent;
            btn.textContent = 'Copied!';
            showToast('BibTeX copied to clipboard');
            setTimeout(() => { btn.textContent = originalText; }, 1800);
          });
          return;
        }

        const box = document.getElementById(`box_${id}`);
        if (!box) return;

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
          <button class="box-copy-btn" data-text="${encodeURIComponent(p.sha256 || '')}">Copy SHA-256</button>
          <div style="display: flex; flex-direction: column; gap: 4px; font-family: var(--font-mono); font-size: 0.8rem;">
            <div><strong>File:</strong> ${escapeHtml(p.local_path)} (${(p.bytes || 0).toLocaleString()} bytes)</div>
            <div><strong>SHA-256:</strong> <span style="color: var(--link-color); word-break: break-all;">${escapeHtml(p.sha256 || 'Verified')}</span></div>
            <div><strong>Original PDF URL:</strong> <a href="${p.pdf_url}" target="_blank" rel="noopener" style="color: var(--link-color); word-break: break-all;">${escapeHtml(p.pdf_url)}</a></div>
          </div>
        `;
        box.classList.add('open');

        box.querySelector('.box-copy-btn').addEventListener('click', function () {
          navigator.clipboard.writeText(decodeURIComponent(this.dataset.text)).then(() => {
            this.textContent = 'Copied!';
            showToast('SHA-256 checksum copied to clipboard');
            setTimeout(() => { this.textContent = 'Copy SHA-256'; }, 1800);
          });
        });
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
        updateSearchUI();
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
          updateSearchUI();
          render();
        });
      }

      if (searchClearBtn) {
        searchClearBtn.addEventListener('click', () => {
          if (searchInput) {
            searchInput.value = '';
            searchInput.focus();
          }
          state.query = '';
          updateSearchUI();
          render();
        });
      }

      if (decadeSelect) {
        decadeSelect.addEventListener('change', (e) => {
          state.decade = e.target.value;
          render();
        });
      }

      // Year Horizon Slider Control
      const yearSlider = document.getElementById('yearSlider');
      const yearSliderVal = document.getElementById('yearSliderVal');
      const yearSliderReset = document.getElementById('yearSliderReset');

      function updateYearSliderUI() {
        if (!yearSliderVal) return;
        if (state.minYear && state.minYear > 1763) {
          const count = papers.filter(p => {
            if (state.area !== 'all' && p.area !== state.area) return false;
            if (state.lpOnly && !p.learning_path) return false;
            return p.year >= state.minYear;
          }).length;
          yearSliderVal.textContent = `Since ${state.minYear} (${count} works)`;
          if (yearSliderReset) yearSliderReset.style.display = 'inline-block';
        } else {
          yearSliderVal.textContent = 'All (1763–2026)';
          if (yearSliderReset) yearSliderReset.style.display = 'none';
        }
      }

      if (yearSlider) {
        yearSlider.addEventListener('input', (e) => {
          state.minYear = parseInt(e.target.value, 10);
          updateYearSliderUI();
          render();
        });
      }

      if (yearSliderReset) {
        yearSliderReset.addEventListener('click', () => {
          if (yearSlider) yearSlider.value = '1763';
          state.minYear = 1763;
          updateYearSliderUI();
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

      // Deep linking via ?id=paper_id to open Reader Drawer automatically
      if (params.has('id')) {
        const targetId = params.get('id');
        const p = papers.find(item => item.id === targetId);
        if (p) {
          setTimeout(() => openDrawer(p), 150);
        }
      }

    } catch (e) {
      console.error('Catalog initialization error:', e);
      if (matchCount) matchCount.textContent = 'Failed to load paper index.';
    }
  }

  /* ==========================================================================
     Homepage Epigraph Quotes Carousel / Slider
     ========================================================================== */

  function initQuotesCarousel() {
    const slider = document.getElementById('quoteSlider');
    const cards = document.querySelectorAll('.quote-card');
    const tabs = document.querySelectorAll('.quote-tab-btn');
    const prevBtn = document.getElementById('prevQuoteBtn');
    const nextBtn = document.getElementById('nextQuoteBtn');
    const counterCurrent = document.querySelector('#quoteCounter .current-slide');
    const counterTotal = document.querySelector('#quoteCounter .total-slides');
    const progressBar = document.getElementById('quoteProgressBar');

    if (!cards.length) return;

    let currentIndex = 0;
    let autoPlayTimer = null;

    if (counterTotal) {
      counterTotal.textContent = String(cards.length).padStart(2, '0');
    }

    function showQuote(index) {
      if (index < 0) index = cards.length - 1;
      if (index >= cards.length) index = 0;
      currentIndex = index;

      cards.forEach((card, i) => {
        const isActive = i === currentIndex;
        card.classList.toggle('active', isActive);
        card.setAttribute('aria-hidden', isActive ? 'false' : 'true');
      });

      tabs.forEach((tab, i) => {
        const isActive = i === currentIndex;
        tab.classList.toggle('active', isActive);
        tab.setAttribute('aria-selected', isActive ? 'true' : 'false');
        if (isActive) {
          tab.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }
      });

      if (counterCurrent) {
        counterCurrent.textContent = String(currentIndex + 1).padStart(2, '0');
      }

      if (progressBar) {
        progressBar.style.width = `${((currentIndex + 1) / cards.length) * 100}%`;
      }
    }

    function startAutoPlay() {
      stopAutoPlay();
      autoPlayTimer = setInterval(() => {
        showQuote(currentIndex + 1);
      }, 9000);
    }

    function stopAutoPlay() {
      if (autoPlayTimer) {
        clearInterval(autoPlayTimer);
        autoPlayTimer = null;
      }
    }

    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        showQuote(currentIndex - 1);
        startAutoPlay();
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        showQuote(currentIndex + 1);
        startAutoPlay();
      });
    }

    tabs.forEach((tab, i) => {
      tab.addEventListener('click', () => {
        showQuote(i);
        startAutoPlay();
      });
    });

    // Touch Swipe Gestures for Mobile
    if (slider) {
      let touchStartX = 0;
      let touchEndX = 0;

      slider.addEventListener('touchstart', (e) => {
        stopAutoPlay();
        touchStartX = e.changedTouches[0].screenX;
      }, { passive: true });

      slider.addEventListener('touchend', (e) => {
        touchEndX = e.changedTouches[0].screenX;
        const diff = touchEndX - touchStartX;
        if (Math.abs(diff) > 40) {
          if (diff < 0) {
            showQuote(currentIndex + 1);
          } else {
            showQuote(currentIndex - 1);
          }
        }
        startAutoPlay();
      }, { passive: true });

      slider.addEventListener('mouseenter', stopAutoPlay);
      slider.addEventListener('mouseleave', startAutoPlay);
      slider.addEventListener('focusin', stopAutoPlay);
      slider.addEventListener('focusout', startAutoPlay);

      // Keyboard arrow navigation
      slider.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          showQuote(currentIndex - 1);
          startAutoPlay();
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          showQuote(currentIndex + 1);
          startAutoPlay();
        }
      });
    }

    showQuote(0);
    startAutoPlay();
  }

  document.addEventListener('DOMContentLoaded', () => {
    initCatalog();
    initQuotesCarousel();
  });

})();
