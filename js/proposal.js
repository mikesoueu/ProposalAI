/**
 * ProposalAI — Proposal Viewer JS
 * Renders proposal, handles signature canvas, PDF export
 */

document.addEventListener('DOMContentLoaded', async () => {

  // ── Nav scroll ──────────────────────────────────────────
  const nav = document.querySelector('.nav');
  window.addEventListener('scroll', () => {
    nav?.classList.toggle('scrolled', window.scrollY > 20);
  }, { passive: true });

  // ── Lang switcher ───────────────────────────────────────
  const langBtn = document.getElementById('lang-btn');
  const langDropdown = document.getElementById('lang-dropdown');
  if (langBtn && langDropdown) {
    langBtn.addEventListener('click', e => {
      e.stopPropagation();
      langDropdown.classList.toggle('open');
    });
    document.addEventListener('click', () => langDropdown.classList.remove('open'));
    document.addEventListener('langchange', () => I18N.buildLangMenu('lang-dropdown'));
  }
  setTimeout(() => {
    if (typeof I18N !== 'undefined') I18N.buildLangMenu('lang-dropdown');
  }, 300);

  // ── Load proposal data ──────────────────────────────────
  let proposal = null;
  try {
    const raw = localStorage.getItem('proposalai_proposal');
    if (raw) proposal = JSON.parse(raw);
  } catch (e) { console.error('Failed to load proposal', e); }

  if (!proposal) {
    document.getElementById('proposal-placeholder').style.display = 'block';
    document.getElementById('proposal-document').style.display = 'none';
    return;
  }

  // ── Render document ─────────────────────────────────────
  renderDocument(proposal);
  setupSignatureCanvas();
  setupSignBtn();
  setupPDFExport();
  setupSendEmail();
  setupNewProposal();
});

// ── Render Proposal Document ────────────────────────────────
function renderDocument(p) {
  const meta = p._meta || {};
  const t = (key) => typeof I18N !== 'undefined' ? I18N.t(key) : key;
  const currency = meta.currency || 'USD';

  // Header
  el('doc-company-name').textContent  = meta.company || 'Your Company';
  el('doc-company-contact').textContent = `${meta.email || ''} ${meta.phone ? '· ' + meta.phone : ''}`;
  el('doc-meta-for').textContent      = meta.clientName || '—';
  el('doc-meta-date').textContent     = meta.date || new Date().toLocaleDateString();

  // Logo
  if (meta.logo) {
    const img = el('doc-logo-img');
    if (img) { img.src = meta.logo; img.style.display = 'block'; }
  }

  // Title block
  el('doc-proposal-title').textContent = p.title || 'Project Proposal';
  el('doc-proposal-client').textContent = meta.clientName || '—';

  // Executive Summary
  el('doc-executive').innerHTML = formatText(p.executive_summary);

  // Scope
  el('doc-scope').innerHTML = formatText(p.scope);

  // Deliverables
  if (Array.isArray(p.deliverables)) {
    el('doc-deliverables').innerHTML = `<ul>${p.deliverables.map(d => `<li>${d}</li>`).join('')}</ul>`;
  } else {
    el('doc-deliverables').innerHTML = formatText(p.deliverables);
  }

  // Timeline
  const timelineEl = el('doc-timeline-body');
  if (timelineEl && Array.isArray(p.timeline)) {
    timelineEl.innerHTML = p.timeline.map(row => `
      <tr>
        <td><strong>${row.phase}</strong></td>
        <td>${row.duration}</td>
        <td>${row.description}</td>
      </tr>
    `).join('');
  }

  // Pricing
  const pricingEl = el('doc-pricing');
  if (pricingEl && Array.isArray(p.pricing)) {
    pricingEl.innerHTML = p.pricing.map(item => `
      <div class="doc-pricing-item">
        <div>
          <div class="doc-pricing-name">${item.item}</div>
          ${item.description ? `<div class="doc-pricing-desc">${item.description}</div>` : ''}
        </div>
        <div class="doc-pricing-amount">${currency} ${formatAmount(item.amount)}</div>
      </div>
    `).join('') + `
      <div class="doc-pricing-item total">
        <div class="doc-pricing-name" style="font-weight:800;font-size:16px;">Total</div>
        <div class="doc-pricing-amount">${currency} ${formatAmount(p.total_amount)}</div>
      </div>
    `;
  }

  // Terms
  el('doc-terms').innerHTML = formatText(p.terms);

  // Payment CTA
  const payLink = el('doc-payment-link');
  if (payLink) {
    if (p._meta && p._meta.paymentLink) {
      payLink.href = p._meta.paymentLink;
    } else {
      el('doc-payment-section').style.display = 'none';
    }
  }

  // Toolbar info
  const toolbarTitle = el('toolbar-proposal-title');
  if (toolbarTitle) toolbarTitle.textContent = p.title || 'Proposal';
}

// ── Canvas Signature ────────────────────────────────────────
function setupSignatureCanvas() {
  const canvas = document.getElementById('signature-canvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  let drawing = false;
  let hasSignature = false;

  // Set canvas resolution
  function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    ctx.strokeStyle = '#7C6CFF';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  function getPos(e) {
    const rect = canvas.getBoundingClientRect();
    const source = e.touches ? e.touches[0] : e;
    return {
      x: source.clientX - rect.left,
      y: source.clientY - rect.top
    };
  }

  function startDraw(e) {
    e.preventDefault();
    drawing = true;
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    document.querySelector('.signature-placeholder').style.opacity = '0';
  }

  function draw(e) {
    if (!drawing) return;
    e.preventDefault();
    hasSignature = true;
    const pos = getPos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  }

  function stopDraw() { drawing = false; }

  canvas.addEventListener('mousedown', startDraw);
  canvas.addEventListener('mousemove', draw);
  canvas.addEventListener('mouseup', stopDraw);
  canvas.addEventListener('touchstart', startDraw, { passive: false });
  canvas.addEventListener('touchmove', draw, { passive: false });
  canvas.addEventListener('touchend', stopDraw);

  // Clear button
  document.getElementById('clear-signature')?.addEventListener('click', () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    hasSignature = false;
    document.querySelector('.signature-placeholder').style.opacity = '1';
  });

  window._signatureCanvas = canvas;
  window._hasSignature = () => hasSignature;
}

// ── Sign Button ─────────────────────────────────────────────
function setupSignBtn() {
  const signBtn = document.getElementById('sign-btn');
  if (!signBtn) return;

  signBtn.addEventListener('click', () => {
    const name = document.getElementById('sign-name')?.value.trim();
    if (!name) {
      showToast(I18N.t('error_fields'), 'error');
      document.getElementById('sign-name')?.focus();
      return;
    }
    if (!window._hasSignature()) {
      showToast('Please sign in the signature box first', 'error');
      return;
    }

    // Set date
    const dateInput = document.getElementById('sign-date');
    if (dateInput && !dateInput.value) {
      dateInput.value = new Date().toISOString().split('T')[0];
    }

    // Show signed state
    document.getElementById('signature-input-area').style.display = 'none';
    document.getElementById('signed-state').style.display = 'flex';

    // Update status dot
    const dot = document.querySelector('.proposal-status-dot');
    if (dot) dot.classList.add('signed');
    const statusText = document.getElementById('proposal-status-text');
    if (statusText) statusText.textContent = I18N.t('prop_signed_badge');

    showToast(I18N.t('toast_signed'), 'success');

    // Save signed state
    const proposal = JSON.parse(localStorage.getItem('proposalai_proposal') || '{}');
    proposal._signed = { name, date: dateInput?.value, timestamp: new Date().toISOString() };
    localStorage.setItem('proposalai_proposal', JSON.stringify(proposal));
    
    // Also save to Supabase
    if (proposal._id && typeof AUTH !== 'undefined' && AUTH.client) {
      AUTH.client.from('proposals').update({ data: proposal }).eq('id', proposal._id).then(({error}) => {
        if (error) console.error("Failed to sync signature to Supabase:", error);
      });
    }
  });
}

// ── PDF Export ──────────────────────────────────────────────
function setupPDFExport() {
  const pdfBtn = document.getElementById('pdf-btn');
  if (!pdfBtn) return;

  pdfBtn.addEventListener('click', () => {
    showToast(I18N.t('toast_pdf'), 'info');

    // Hide signature input area, show only the document
    const sigInput = document.getElementById('signature-input-area');
    const wasVisible = sigInput?.style.display !== 'none';
    if (sigInput) sigInput.style.display = 'none';

    const docEl = document.getElementById('proposal-document');

    setTimeout(() => {
      const opt = {
        margin:       [10, 10, 10, 10],
        filename:     'ProposalAI_Proposal.pdf',
        image:        { type: 'jpeg', quality: 0.95 },
        html2canvas:  { scale: 2, useCORS: true, logging: false },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };

      if (window.html2pdf) {
        html2pdf().set(opt).from(docEl).save().then(() => {
          if (wasVisible && sigInput) sigInput.style.display = '';
        });
      } else {
        // Fallback: browser print
        window.print();
        if (wasVisible && sigInput) sigInput.style.display = '';
      }
    }, 300);
  });
}

// ── Send Email (copy link) ──────────────────────────────────
function setupSendEmail() {
  const sendBtn = document.getElementById('send-btn');
  if (!sendBtn) return;

  sendBtn.addEventListener('click', () => {
    const url = window.location.href;
    const subject = encodeURIComponent("Your Project Proposal");
    const body = encodeURIComponent(`Hi,\n\nI have prepared a proposal for you. You can view, approve, and sign it online here:\n\n${url}\n\nLet me know if you have any questions!\n\nBest regards,`);
    const mailto = `mailto:?subject=${subject}&body=${body}`;
    
    // 1. Open Email Client
    window.location.href = mailto;

    // 2. Copy link to clipboard
    navigator.clipboard.writeText(url).then(() => {
      showToast(I18N.t('toast_copied') || 'Link copied to clipboard!', 'success');
    }).catch(() => {
      // Fallback
      const ta = document.createElement('textarea');
      ta.value = url;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
      showToast(I18N.t('toast_copied') || 'Link copied to clipboard!', 'success');
    });
  });
}

// ── New Proposal ────────────────────────────────────────────
function setupNewProposal() {
  document.getElementById('new-proposal-btn')?.addEventListener('click', () => {
    window.location.href = 'app.html';
  });
}

// ── Helpers ─────────────────────────────────────────────────
function el(id) { return document.getElementById(id); }

function formatText(text) {
  if (!text) return '';
  return text
    .split('\n\n')
    .map(para => `<p>${para.replace(/\n/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}</p>`)
    .join('');
}

function formatAmount(val) {
  if (!val) return '0.00';
  const num = typeof val === 'string' ? parseFloat(val.replace(/[^0-9.]/g, '')) : Number(val);
  return isNaN(num) ? val : num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function showToast(message, type = 'info', duration = 3500) {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${icons[type] || 'ℹ️'}</span><span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = 'toastOut 0.3s ease forwards';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}
