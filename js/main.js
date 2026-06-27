/**
 * ProposalAI — Main Landing Page JS
 */

document.addEventListener('DOMContentLoaded', () => {

  // ── Navbar scroll effect ────────────────────────────────
  const nav = document.querySelector('.nav');
  const onScroll = () => {
    nav?.classList.toggle('scrolled', window.scrollY > 20);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // ── Language Switcher ───────────────────────────────────
  const langBtn = document.getElementById('lang-btn');
  const langDropdown = document.getElementById('lang-dropdown');

  if (langBtn && langDropdown) {
    // Build menu after i18n inits
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(() => I18N.buildLangMenu('lang-dropdown'), 100);
    });
    // Rebuild on lang change
    document.addEventListener('langchange', () => {
      I18N.buildLangMenu('lang-dropdown');
    });

    langBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      langDropdown.classList.toggle('open');
    });
    document.addEventListener('click', () => langDropdown.classList.remove('open'));
    langDropdown.addEventListener('click', e => e.stopPropagation());
  }

  // Rebuild lang menu after i18n ready
  setTimeout(() => {
    if (typeof I18N !== 'undefined') I18N.buildLangMenu('lang-dropdown');
  }, 300);

  // ── Scroll animations ───────────────────────────────────
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry, i) => {
      if (entry.isIntersecting) {
        setTimeout(() => {
          entry.target.classList.add('visible');
        }, i * 80);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  document.querySelectorAll('[data-animate]').forEach(el => observer.observe(el));

  // ── Pricing Toggle ──────────────────────────────────────
  const toggleTrack = document.getElementById('pricing-toggle');
  const prices = document.querySelectorAll('.price-monthly');
  const pricesAnnual = document.querySelectorAll('.price-annual');
  const toggleLabelMonthly = document.getElementById('toggle-monthly');
  const toggleLabelAnnual = document.getElementById('toggle-annual');

  if (toggleTrack) {
    let isAnnual = false;
    toggleTrack.addEventListener('click', () => {
      isAnnual = !isAnnual;
      toggleTrack.classList.toggle('on', isAnnual);
      prices.forEach(el => el.style.display = isAnnual ? 'none' : 'block');
      pricesAnnual.forEach(el => el.style.display = isAnnual ? 'block' : 'none');
      if (toggleLabelMonthly) toggleLabelMonthly.classList.toggle('active', !isAnnual);
      if (toggleLabelAnnual) toggleLabelAnnual.classList.toggle('active', isAnnual);
    });
  }

  // ── Smooth hero CTA scroll ──────────────────────────────
  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', e => {
      const target = document.querySelector(link.getAttribute('href'));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });

  // ── Counter animation for stats ─────────────────────────
  const counters = document.querySelectorAll('[data-count]');
  const countObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const el = entry.target;
        const target = parseFloat(el.dataset.count);
        const suffix = el.dataset.suffix || '';
        const prefix = el.dataset.prefix || '';
        const duration = 1800;
        const start = performance.now();
        const update = (now) => {
          const progress = Math.min((now - start) / duration, 1);
          const eased = 1 - Math.pow(1 - progress, 3);
          const val = Math.floor(eased * target);
          el.textContent = prefix + val.toLocaleString() + suffix;
          if (progress < 1) requestAnimationFrame(update);
        };
        requestAnimationFrame(update);
        countObserver.unobserve(el);
      }
    });
  }, { threshold: 0.5 });

  counters.forEach(el => countObserver.observe(el));

  // ── Mobile nav toggle ───────────────────────────────────
  const mobileToggle = document.getElementById('mobile-nav-toggle');
  const mobileMenu = document.getElementById('mobile-nav-menu');
  if (mobileToggle && mobileMenu) {
    mobileToggle.addEventListener('click', () => {
      mobileMenu.classList.toggle('open');
    });
  }

});

// ── Toast utility (global) ──────────────────────────────────
function showToast(message, type = 'info', duration = 3500) {
  const container = document.querySelector('.toast-container') || (() => {
    const c = document.createElement('div');
    c.className = 'toast-container';
    document.body.appendChild(c);
    return c;
  })();

  const icons = {
    success: '✅',
    error:   '❌',
    warning: '⚠️',
    info:    'ℹ️'
  };

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${icons[type] || 'ℹ️'}</span><span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'toastOut 0.3s ease forwards';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}
