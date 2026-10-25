/**
 * AI Paper Library - Client Application
 */

(function () {
  'use strict';

  // State
  let papersData = [];
  let currentFilter = {
    search: '',
    area: 'all',
    decade: 'all',
    learningPathOnly: false,
    sort: 'year-desc',
    view: localStorage.getItem('ai_papers_view') || 'grid'
  };

  const BASE_URL = (window.SITE_CONFIG && window.SITE_CONFIG.baseUrl) || '';

  // DOM Elements
  const themeToggle = document.getElementById('themeToggle');
  const mobileMenuBtn = document.getElementById('mobileMenuBtn');
  const siteNav = document.getElementById('siteNav');
  const searchInput = document.getElementById('searchInput');
  const searchClearBtn = document.getElementById('searchClearBtn');
  const decadeSelect = document.getElementById('decadeSelect');
  const sortSelect = document.getElementById('sortSelect');
  const lpFilterCheckbox = document.getElementById('lpFilterCheckbox');
  const filterPills = document.querySelectorAll('.filter-pill');
  const papersGrid = document.getElementById('papersGrid');
  const papersTableWrapper = document.getElementById('papersTableWrapper');
  const papersTableBody = document.getElementById('papersTableBody');
  const resultsCount = document.getElementById('resultsCount');
  const emptyState = document.getElementById('emptyState');
  const viewGridBtn = document.getElementById('viewGridBtn');
  const viewTableBtn = document.getElementById('viewTableBtn');

  // Modals
  const pdfModal = document.getElementById('pdfModal');
  const pdfViewerFrame = document.getElementById('pdfViewerFrame');
  const pdfModalTitle = document.getElementById('pdfModalTitle');
  const modalAreaBadge = document.getElementById('modalAreaBadge');
  const modalYearBadge = document.getElementById('modalYearBadge');
  const modalAuthors = document.getElementById('modalAuthors');
  const modalDirectTab = document.getElementById('modalDirectTab');
  const modalDownloadBtn = document.getElementById('modalDownloadBtn');
  const closePdfModal = document.getElementById('closePdfModal');

  const citationModal = document.getElementById('citationModal');
  const bibtexContent = document.getElementById('bibtexContent');
  const copyBibtexBtn = document.getElementById('copyBibtexBtn');
  const copyBtnText = document.getElementById('copyBtnText');
  const closeCitationModal = document.getElementById('closeCitationModal');

  const detailsModal = document.getElementById('detailsModal');
  const detailsModalBody = document.getElementById('detailsModalBody');
  const closeDetailsModal = document.getElementById('closeDetailsModal');

  const siteToast = document.getElementById('siteToast');

  /* ==========================================================================
     Theme & Mobile Menu
     ========================================================================== */

  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      const isDark = document.documentElement.classList.toggle('dark');
      localStorage.setItem('ai_papers_theme', isDark ? 'dark' : 'light');
    });
  }

  if (mobileMenuBtn && siteNav) {
    mobileMenuBtn.addEventListener('click', () => {
      siteNav.classList.toggle('open');
    });
  }

  /* ==========================================================================
     Toast Notifications
     ========================================================================== */

  function showToast(message, duration = 2500) {
    if (!siteToast) return;
    siteToast.textContent = message;
    siteToast.classList.add('show');
    setTimeout(() => {
      siteToast.classList.remove('show');
    }, duration);
  }

  /* ==========================================================================
     Modals
     ========================================================================== */

  function openPdf(paper) {
    if (!pdfModal || !pdfViewerFrame) return;
    const pdfPath = `${BASE_URL}/${paper.local_path}`;
    
    pdfViewerFrame.src = pdfPath;
    pdfModalTitle.textContent = paper.title;
    modalAuthors.textContent = paper.authors;
    modalYearBadge.textContent = paper.year;
    modalAreaBadge.textContent = paper.area_name;
    modalAreaBadge.style.backgroundColor = paper.area_color;
    
    modalDirectTab.href = pdfPath;
    modalDownloadBtn.href = pdfPath;
    modalDownloadBtn.setAttribute('download', `${paper.year}_${paper.id}.pdf`);

    pdfModal.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closePdf() {
    if (!pdfModal || !pdfViewerFrame) return;
    pdfModal.classList.remove('open');
    pdfViewerFrame.src = '';
    document.body.style.overflow = '';
  }

  function openCitation(paper) {
    if (!citationModal || !bibtexContent) return;
    bibtexContent.textContent = paper.bibtex;
    citationModal.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeCitation() {
    if (!citationModal) return;
    citationModal.classList.remove('open');
    document.body.style.overflow = '';
  }

  function openDetails(paper) {
    if (!detailsModal || !detailsModalBody) return;
    const pdfPath = `${BASE_URL}/${paper.local_path}`;
    detailsModalBody.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 14px;">
        <div>
          <h4 style="font-size: 1.1rem; font-weight: 700; margin-bottom: 4px;">${escapeHtml(paper.title)}</h4>
          <p style="color: var(--text-secondary); font-size: 0.88rem;">${escapeHtml(paper.authors)}</p>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 0.85rem;">
          <div style="background: var(--bg-surface-secondary); padding: 10px; border-radius: var(--radius-sm);">
            <strong>Publication Year:</strong> ${paper.year}
          </div>
          <div style="background: var(--bg-surface-secondary); padding: 10px; border-radius: var(--radius-sm);">
            <strong>Category:</strong> ${escapeHtml(paper.area_name)}
          </div>
          <div style="background: var(--bg-surface-secondary); padding: 10px; border-radius: var(--radius-sm);">
            <strong>File Size:</strong> ${paper.size_human} (${(paper.bytes || 0).toLocaleString()} bytes)
          </div>
          <div style="background: var(--bg-surface-secondary); padding: 10px; border-radius: var(--radius-sm);">
            <strong>Curriculum:</strong> ${paper.learning_path ? 'Guided Learning Path (121)' : 'General Archive'}
          </div>
        </div>
        <div>
          <label style="font-size: 0.8rem; font-weight: 600; color: var(--text-muted);">LOCAL PATH</label>
          <div style="font-family: var(--font-mono); font-size: 0.8rem; background: var(--bg-surface-secondary); padding: 8px 12px; border-radius: var(--radius-sm); word-break: break-all;">
            ${escapeHtml(paper.local_path)}
          </div>
        </div>
        <div>
          <label style="font-size: 0.8rem; font-weight: 600; color: var(--text-muted);">SHA-256 CHECKSUM</label>
          <div style="font-family: var(--font-mono); font-size: 0.78rem; background: var(--bg-surface-secondary); padding: 8px 12px; border-radius: var(--radius-sm); word-break: break-all; color: var(--primary);">
            ${escapeHtml(paper.sha256 || 'Verified')}
          </div>
        </div>
        <div style="display: flex; gap: 10px; margin-top: 10px;">
          <a href="${paper.source_url}" target="_blank" rel="noopener noreferrer" class="btn btn-outline btn-sm" style="flex: 1;">
            View Publisher / DOI
          </a>
          <a href="${pdfPath}" download="${paper.year}_${paper.id}.pdf" class="btn btn-primary btn-sm" style="flex: 1;">
            Download PDF
          </a>
        </div>
      </div>
    `;
    detailsModal.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeDetails() {
    if (!detailsModal) return;
    detailsModal.classList.remove('open');
    document.body.style.overflow = '';
  }

  // Close modals on events
  if (closePdfModal) closePdfModal.addEventListener('click', closePdf);
  if (closeCitationModal) closeCitationModal.addEventListener('click', closeCitation);
  if (closeDetailsModal) closeDetailsModal.addEventListener('click', closeDetails);

  [pdfModal, citationModal, detailsModal].forEach(modal => {
    if (!modal) return;
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closePdf();
        closeCitation();
        closeDetails();
      }
    });
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closePdf();
      closeCitation();
      closeDetails();
    }
  });

  if (copyBibtexBtn && bibtexContent) {
    copyBibtexBtn.addEventListener('click', () => {
      navigator.clipboard.writeText(bibtexContent.textContent).then(() => {
        copyBtnText.textContent = 'Copied to Clipboard!';
        showToast('BibTeX citation copied to clipboard');
        setTimeout(() => {
          copyBtnText.textContent = 'Copy BibTeX';
        }, 2000);
      }).catch(err => {
        console.error('Copy failed', err);
      });
    });
  }

  /* ==========================================================================
     Filtering & Sorting Logic
     ========================================================================== */

  function filterPapers() {
    return papersData.filter(paper => {
      // Search term
      if (currentFilter.search) {
        const query = currentFilter.search.toLowerCase();
        const matchesTitle = paper.title.toLowerCase().includes(query);
        const matchesAuthors = paper.authors.toLowerCase().includes(query);
        const matchesYear = paper.year.toString().includes(query);
        const matchesId = paper.id.toLowerCase().includes(query);
        const matchesArea = paper.area_name.toLowerCase().includes(query);
        if (!matchesTitle && !matchesAuthors && !matchesYear && !matchesId && !matchesArea) {
          return false;
        }
      }

      // Area filter
      if (currentFilter.area !== 'all' && paper.area !== currentFilter.area) {
        return false;
      }

      // Learning path filter
      if (currentFilter.learningPathOnly && !paper.learning_path) {
        return false;
      }

      // Decade filter
      if (currentFilter.decade !== 'all') {
        const y = paper.year;
        if (currentFilter.decade === 'pre-1950' && y >= 1950) return false;
        if (currentFilter.decade === '1950s' && (y < 1950 || y > 1959)) return false;
        if (currentFilter.decade === '1960s' && (y < 1960 || y > 1969)) return false;
        if (currentFilter.decade === '1970s' && (y < 1970 || y > 1979)) return false;
        if (currentFilter.decade === '1980s' && (y < 1980 || y > 1989)) return false;
        if (currentFilter.decade === '1990s' && (y < 1990 || y > 1999)) return false;
        if (currentFilter.decade === '2000s' && (y < 2000 || y > 2009)) return false;
        if (currentFilter.decade === '2010s' && (y < 2010 || y > 2019)) return false;
        if (currentFilter.decade === '2020s' && y < 2020) return false;
      }

      return true;
    }).sort((a, b) => {
      if (currentFilter.sort === 'year-desc') return b.year - a.year || a.title.localeCompare(b.title);
      if (currentFilter.sort === 'year-asc') return a.year - b.year || a.title.localeCompare(b.title);
      if (currentFilter.sort === 'title-asc') return a.title.localeCompare(b.title);
      if (currentFilter.sort === 'size-desc') return (b.bytes || 0) - (a.bytes || 0);
      return 0;
    });
  }

  function renderPapers() {
    if (!papersGrid || !papersTableBody) return;

    const filtered = filterPapers();

    if (resultsCount) {
      resultsCount.textContent = `Showing ${filtered.length} of ${papersData.length} papers`;
    }

    if (emptyState) {
      emptyState.style.display = filtered.length === 0 ? 'block' : 'none';
    }

    // Render Cards
    papersGrid.innerHTML = filtered.map(paper => {
      const pdfPath = `${BASE_URL}/${paper.local_path}`;
      return `
        <article class="paper-card" data-id="${paper.id}">
          <div class="card-top">
            <div class="card-badges">
              <span class="badge badge-area" style="background-color: ${paper.area_color};">${escapeHtml(paper.area_name)}</span>
              <span class="badge badge-year">${paper.year}</span>
              ${paper.learning_path ? '<span class="badge badge-lp" title="Included in 121-paper guided learning path">★ Learning Path</span>' : ''}
            </div>
            <span class="card-size">${paper.size_human}</span>
          </div>

          <h3 class="paper-title">
            <a href="javascript:void(0)" class="paper-pdf-trigger" data-id="${paper.id}">
              ${escapeHtml(paper.title)}
            </a>
          </h3>

          <p class="paper-authors">${escapeHtml(paper.authors)}</p>

          <div class="card-actions">
            <button class="btn btn-primary btn-sm paper-read-btn" data-id="${paper.id}">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
                <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
              </svg>
              Read PDF
            </button>
            <a href="${pdfPath}" download="${paper.year}_${paper.id}.pdf" class="btn btn-outline btn-sm" title="Download PDF file">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
              Download
            </a>
            <button class="btn btn-ghost btn-sm paper-cite-btn" data-id="${paper.id}" title="Cite / BibTeX">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M16 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 3 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
              </svg>
              Cite
            </button>
            <button class="btn btn-ghost btn-sm paper-details-btn" data-id="${paper.id}" title="View Details & Checksum">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="16" x2="12" y2="12"></line>
                <line x1="12" y1="8" x2="12.01" y2="8"></line>
              </svg>
            </button>
          </div>
        </article>
      `;
    }).join('');

    // Render Table
    papersTableBody.innerHTML = filtered.map(paper => {
      const pdfPath = `${BASE_URL}/${paper.local_path}`;
      return `
        <tr data-id="${paper.id}">
          <td style="font-family: var(--font-mono); font-weight: 600;">${paper.year}</td>
          <td>
            <div class="table-title">
              <a href="javascript:void(0)" class="paper-pdf-trigger" data-id="${paper.id}">
                ${escapeHtml(paper.title)}
              </a>
              ${paper.learning_path ? '<span class="badge badge-lp" style="margin-left: 6px; font-size: 0.68rem;">★ Path</span>' : ''}
            </div>
            <div class="table-authors">${escapeHtml(paper.authors)}</div>
          </td>
          <td>
            <span class="badge" style="background-color: ${paper.area_color}; color: #fff;">
              ${escapeHtml(paper.area_name)}
            </span>
          </td>
          <td style="font-family: var(--font-mono); font-size: 0.8rem; color: var(--text-muted);">${paper.size_human}</td>
          <td>
            <div class="table-actions">
              <button class="btn btn-primary btn-sm paper-read-btn" data-id="${paper.id}">Read</button>
              <a href="${pdfPath}" download="${paper.year}_${paper.id}.pdf" class="btn btn-outline btn-sm">PDF</a>
              <button class="btn btn-ghost btn-sm paper-cite-btn" data-id="${paper.id}">Cite</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    bindPaperActionButtons();
  }

  function bindPaperActionButtons() {
    document.querySelectorAll('.paper-read-btn, .paper-pdf-trigger').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const id = btn.dataset.id;
        const paper = papersData.find(p => p.id === id);
        if (paper) openPdf(paper);
      });
    });

    document.querySelectorAll('.paper-cite-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const id = btn.dataset.id;
        const paper = papersData.find(p => p.id === id);
        if (paper) openCitation(paper);
      });
    });

    document.querySelectorAll('.paper-details-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const id = btn.dataset.id;
        const paper = papersData.find(p => p.id === id);
        if (paper) openDetails(paper);
      });
    });
  }

  function setView(view) {
    currentFilter.view = view;
    localStorage.setItem('ai_papers_view', view);
    if (view === 'grid') {
      if (papersGrid) papersGrid.style.display = 'grid';
      if (papersTableWrapper) papersTableWrapper.style.display = 'none';
      if (viewGridBtn) viewGridBtn.classList.add('active');
      if (viewTableBtn) viewTableBtn.classList.remove('active');
    } else {
      if (papersGrid) papersGrid.style.display = 'none';
      if (papersTableWrapper) papersTableWrapper.style.display = 'block';
      if (viewGridBtn) viewGridBtn.classList.remove('active');
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
     Learning Path Checklist & Progress
     ========================================================================== */

  function initLearningPath() {
    const checklist = document.querySelectorAll('.lp-checkbox');
    if (!checklist.length) return;

    let readSet = new Set(JSON.parse(localStorage.getItem('ai_papers_read') || '[]'));

    function updateProgressBar() {
      const total = checklist.length;
      let completed = 0;
      checklist.forEach(cb => {
        if (readSet.has(cb.dataset.id)) {
          cb.checked = true;
          cb.closest('.lp-paper-item').classList.add('completed');
          completed++;
        } else {
          cb.checked = false;
          cb.closest('.lp-paper-item').classList.remove('completed');
        }
      });

      const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
      const fill = document.getElementById('lpProgressFill');
      const text = document.getElementById('lpProgressText');
      if (fill) fill.style.width = `${percent}%`;
      if (text) text.textContent = `${completed} / ${total} papers (${percent}%)`;
    }

    checklist.forEach(cb => {
      cb.addEventListener('change', () => {
        const id = cb.dataset.id;
        if (cb.checked) {
          readSet.add(id);
          showToast('Paper marked as read');
        } else {
          readSet.delete(id);
        }
        localStorage.setItem('ai_papers_read', JSON.stringify(Array.from(readSet)));
        updateProgressBar();
      });
    });

    const resetBtn = document.getElementById('lpResetBtn');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to reset your reading progress?')) {
          readSet.clear();
          localStorage.removeItem('ai_papers_read');
          updateProgressBar();
          showToast('Reading progress reset');
        }
      });
    }

    updateProgressBar();
  }

  /* ==========================================================================
     Initialization
     ========================================================================== */

  async function initLibrary() {
    if (!papersGrid) return; // Not on the library explorer page

    try {
      const response = await fetch(`${BASE_URL}/assets/data/papers.json`);
      if (!response.ok) throw new Error('Failed to load papers catalog');
      papersData = await response.json();

      // Read URL Query Parameters
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.has('q')) {
        currentFilter.search = urlParams.get('q');
        if (searchInput) searchInput.value = currentFilter.search;
      }
      if (urlParams.has('area')) {
        currentFilter.area = urlParams.get('area');
        filterPills.forEach(pill => {
          pill.classList.toggle('active', pill.dataset.area === currentFilter.area);
        });
      }
      if (urlParams.has('learning_path')) {
        currentFilter.learningPathOnly = urlParams.get('learning_path') === 'true';
        if (lpFilterCheckbox) lpFilterCheckbox.checked = currentFilter.learningPathOnly;
      }

      // Event Listeners for Filters
      if (searchInput) {
        searchInput.addEventListener('input', (e) => {
          currentFilter.search = e.target.value.trim();
          if (searchClearBtn) {
            searchClearBtn.style.display = currentFilter.search ? 'block' : 'none';
          }
          renderPapers();
        });
      }

      if (searchClearBtn) {
        searchClearBtn.addEventListener('click', () => {
          if (searchInput) searchInput.value = '';
          currentFilter.search = '';
          searchClearBtn.style.display = 'none';
          renderPapers();
        });
      }

      if (decadeSelect) {
        decadeSelect.addEventListener('change', (e) => {
          currentFilter.decade = e.target.value;
          renderPapers();
        });
      }

      if (sortSelect) {
        sortSelect.addEventListener('change', (e) => {
          currentFilter.sort = e.target.value;
          renderPapers();
        });
      }

      if (lpFilterCheckbox) {
        lpFilterCheckbox.addEventListener('change', (e) => {
          currentFilter.learningPathOnly = e.target.checked;
          renderPapers();
        });
      }

      filterPills.forEach(pill => {
        pill.addEventListener('click', () => {
          filterPills.forEach(p => p.classList.remove('active'));
          pill.classList.add('active');
          currentFilter.area = pill.dataset.area;
          renderPapers();
        });
      });

      if (viewGridBtn) {
        viewGridBtn.addEventListener('click', () => setView('grid'));
      }

      if (viewTableBtn) {
        viewTableBtn.addEventListener('click', () => setView('table'));
      }

      setView(currentFilter.view);
      renderPapers();

    } catch (err) {
      console.error('Error initializing papers library:', err);
      if (resultsCount) resultsCount.textContent = 'Failed to load papers. Please check console.';
    }
  }

  // Kickoff on DOMContentLoaded
  document.addEventListener('DOMContentLoaded', () => {
    initLibrary();
    initLearningPath();
  });

})();
