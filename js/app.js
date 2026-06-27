/**
 * ProposalAI — App Builder JS
 * Multi-step form + OpenAI proposal generation
 */

const APP = (() => {

  // ── State ───────────────────────────────────────────────
  let state = {
    step: 1,
    logoDataUrl: null,
    formData: {},
    generatedProposal: null,
  };

  // ── DOM refs ────────────────────────────────────────────
  const steps = () => document.querySelectorAll('.step-item');
  const panels = () => document.querySelectorAll('.step-panel');

  // ── Init ────────────────────────────────────────────────
  function init() {
    setupStepNav();
    setupLogoUpload();
    setupGenerateBtn();
    renderStep(1);
    checkApiKey();
  }

  // ── Check API key ───────────────────────────────────────
  function checkApiKey() {
    const notice = document.getElementById('api-key-notice');
    if (!notice) return;
    const missing = !CONFIG?.AI_API_KEY || CONFIG.AI_API_KEY.includes('YOUR_');
    notice.style.display = missing ? 'flex' : 'none';
  }

  // ── Step navigation ─────────────────────────────────────
  function setupStepNav() {
    document.querySelectorAll('[data-next-step]').forEach(btn => {
      btn.addEventListener('click', () => {
        const panel = btn.closest('.step-panel');
        if (panel && !validatePanel(panel)) return;
        collectFormData(panel);
        goToStep(state.step + 1);
      });
    });

    document.querySelectorAll('[data-prev-step]').forEach(btn => {
      btn.addEventListener('click', () => goToStep(state.step - 1));
    });
  }

  function goToStep(n) {
    if (n < 1 || n > 4) return;
    state.step = n;
    renderStep(n);
  }

  function renderStep(n) {
    // Update step indicator
    steps().forEach((item, idx) => {
      const num = idx + 1;
      item.classList.remove('active', 'completed');
      if (num === n) item.classList.add('active');
      if (num < n) item.classList.add('completed', );
      const numEl = item.querySelector('.step-num');
      if (numEl) numEl.textContent = num < n ? '✓' : num;
    });

    // Progress bar
    const bar = document.getElementById('steps-progress');
    if (bar) {
      const pct = ((n - 1) / 3) * 100;
      bar.style.width = `${pct}%`;
    }

    // Show/hide panels
    panels().forEach(panel => {
      const panelStep = parseInt(panel.dataset.step);
      panel.style.display = panelStep === n ? 'block' : 'none';
      if (panelStep === n) {
        panel.style.animation = 'fadeUp 0.4s ease';
      }
    });

    // Special logic for step 3 (generate) and step 4 (result)
    if (n === 3) renderSummary();
    if (n === 4) renderResult();
  }

  // ── Form validation ─────────────────────────────────────
  function validatePanel(panel) {
    const required = panel.querySelectorAll('[required]');
    let valid = true;
    required.forEach(field => {
      field.style.borderColor = '';
      if (!field.value.trim()) {
        field.style.borderColor = 'var(--color-danger)';
        field.focus();
        valid = false;
      }
    });
    if (!valid) showToast(I18N.t('error_fields'), 'error');
    return valid;
  }

  // ── Collect form data ───────────────────────────────────
  function collectFormData(panel) {
    panel.querySelectorAll('input[name], select[name], textarea[name]').forEach(field => {
      state.formData[field.name] = field.value;
    });
    // Handle custom budget overriding
    if (state.formData['budget_range'] === 'Custom') {
      state.formData['budget_range'] = state.formData['custom_budget'] || 'Not specified';
    }
  }

  window.toggleCustomBudget = function() {
    const select = document.getElementById('budget_range');
    const customInput = document.getElementById('custom_budget');
    if (select && customInput) {
      if (select.value === 'Custom') {
        customInput.style.display = 'block';
        customInput.required = true;
      } else {
        customInput.style.display = 'none';
        customInput.required = false;
        customInput.value = '';
      }
    }
  };

  // ── Logo Upload ─────────────────────────────────────────
  function setupLogoUpload() {
    const input = document.getElementById('logo-input');
    const preview = document.getElementById('logo-preview');
    if (!input || !preview) return;

    input.addEventListener('change', () => {
      const file = input.files[0];
      if (!file) return;
      if (file.size > 2 * 1024 * 1024) {
        showToast('Logo must be under 2MB', 'error');
        return;
      }
      const reader = new FileReader();
      reader.onload = e => {
        state.logoDataUrl = e.target.result;
        preview.innerHTML = `<img src="${e.target.result}" alt="Logo"/>`;
      };
      reader.readAsDataURL(file);
    });

    document.getElementById('logo-preview')?.addEventListener('click', () => input.click());
  }

  // ── Summary (Step 3) ────────────────────────────────────
  function renderSummary() {
    // Collect data from all panels before showing summary
    document.querySelectorAll('.step-panel').forEach(p => collectFormData(p));

    const container = document.getElementById('summary-items');
    if (!container) return;
    const d = state.formData;
    const items = [
      { label: I18N.t('app_yourname'),    value: d.your_name },
      { label: I18N.t('app_company'),     value: d.company_name },
      { label: I18N.t('app_clientname'), value: d.client_name },
      { label: I18N.t('app_industry'),   value: d.client_industry },
      { label: I18N.t('app_projtype'),   value: d.project_type },
      { label: I18N.t('app_budget'),     value: d.budget_range },
    ];
    container.innerHTML = items.map(item => `
      <div class="summary-item">
        <div class="summary-item-label">${item.label}</div>
        <div class="summary-item-value">${item.value || '—'}</div>
      </div>
    `).join('');
  }

  // ── Generate button ─────────────────────────────────────
  function setupGenerateBtn() {
    const btn = document.getElementById('generate-btn');
    if (btn) btn.addEventListener('click', generateProposal);
  }

  // ── OpenRouter / AI proposal generation ─────────────────
  async function generateProposal() {
    if (!CONFIG?.AI_API_KEY || CONFIG.AI_API_KEY.includes('YOUR_')) {
      showToast('Please add your OpenRouter API key to config.js first.', 'error', 6000);
      return;
    }

    // ── Efeito IKEA: Cobrar apenas no clique de Gerar ──
    const user = await window.AUTH?.getCurrentUser();
    if (!user) {
      window.location.href = 'login.html';
      return;
    }
    const plan = await window.AUTH?.requirePlan(user);
    if (!plan) {
      // O usuário não tem plano ativo. O requirePlan já abriu o popup de preços.
      return;
    }

    // Limit check for Starter plan
    let usedExtraCredit = false;
    let currentExtraCredits = 0;
    
    if (plan.plan === 'starter') {
      const { data: proposals } = await window.AUTH?.getUserProposals(user.id);
      
      // We must fetch the sub again to get the freshest extra_credits value
      const { data: currentSub } = await window.AUTH?.client
        .from('subscriptions')
        .select('*')
        .eq('email', user.email)
        .eq('status', 'active')
        .maybeSingle();
        
      currentExtraCredits = currentSub?.extra_credits || 0;

      if (proposals) {
        const thisMonth = new Date().getMonth();
        const thisYear = new Date().getFullYear();
        const countThisMonth = proposals.filter(p => {
          const d = new Date(p.created_at);
          return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
        }).length;

        if (countThisMonth >= 5) {
          if (currentExtraCredits > 0) {
            // Deduct 1 credit
            const { error } = await window.AUTH?.client
              .from('subscriptions')
              .update({ extra_credits: currentExtraCredits - 1 })
              .eq('id', currentSub.id);
              
            if (!error) {
              usedExtraCredit = true;
              currentExtraCredits -= 1;
            } else {
              console.error("Failed to deduct credit:", error);
            }
          } else {
            // No credits, block!
            showToast('Você atingiu o limite de propostas. Compre créditos ou faça o upgrade.', 'error', 6000);
            if (window.AUTH?.showPricingModal) {
              window.AUTH.showPricingModal(true); 
            }
            return;
          }
        }
      }
    }
    // ───────────────────────────────────────────────────

    // Collect all form data
    document.querySelectorAll('.step-panel').forEach(p => collectFormData(p));
    const d = state.formData;

    // Show loading
    document.getElementById('generate-section').style.display = 'none';
    document.getElementById('ai-loading').style.display = 'flex';
    
    if (usedExtraCredit) {
       showToast(`⚡ 1 Extra Credit used. (${currentExtraCredits} remaining)`, 'success', 5000);
    }

    const proposalLang = d.proposal_language || I18N.getCurrentLang() || 'en';
    const currency = d.proposal_currency || 'USD';

    const prompt = buildPrompt(d, proposalLang, currency);

    try {
      const response = await fetch(CONFIG.AI_BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${CONFIG.AI_API_KEY}`,
          'HTTP-Referer': window.location.origin,  // Required by OpenRouter
          'X-Title': CONFIG.APP_NAME || 'ProposalAI', // Optional but recommended
        },
        body: JSON.stringify({
          model: CONFIG.AI_MODEL || 'google/gemini-2.5-flash',
          temperature: 0.7,
          messages: [
            {
              role: 'system',
              content: `You are a world-class business proposal writer. You write in ${proposalLang}. 
              Output ONLY a valid JSON object with the proposal sections. Do not add markdown code blocks. 
              The JSON must have these exact keys: title, executive_summary, scope, deliverables (array of strings), 
              timeline (array of objects with {phase, duration, description}), 
              pricing (array of objects with {item, description, amount}), total_amount, currency, terms. ${user.user_metadata?.payment_link ? `\nVERY IMPORTANT: At the end of the "terms" text, you MUST explicitly add the following payment link exactly as provided so the client can pay and secure their spot: ${user.user_metadata.payment_link}` : ''}`
            },
            { role: 'user', content: prompt }
          ],
          max_tokens: 3000,
          response_format: { type: "json_object" }
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error?.message || 'API error');
      }

      const data = await response.json();
      const content = data.choices[0].message.content.trim();

      // Parse JSON from response
      let proposal;
      try {
        // Remove potential code fences
        const clean = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        proposal = JSON.parse(clean);
      } catch (e) {
        throw new Error('Failed to parse AI response. Please try again.');
      }

      // Attach meta info
      proposal._meta = {
        yourName: d.your_name,
        company: d.company_name,
        email: d.your_email,
        phone: d.your_phone,
        logo: state.logoDataUrl,
        clientName: d.client_name,
        clientEmail: d.client_email,
        paymentLink: user.user_metadata?.payment_link || '',
        date: new Date().toLocaleDateString(proposalLang === 'en' ? 'en-US' : proposalLang, { year: 'numeric', month: 'long', day: 'numeric' }),
        lang: proposalLang,
        currency,
      };

      // Save to Supabase (so it shows in Dashboard)
      if (typeof window.AUTH !== 'undefined' && window.AUTH.saveProposal) {
        const result = await window.AUTH.saveProposal(user, proposal);
        if (result && result.data && result.data.id) {
          proposal._id = result.data.id;
        }
      }

      // Save to localStorage for proposal.html to read
      localStorage.setItem('proposalai_proposal', JSON.stringify(proposal));

      // Hide loading, show result
      document.getElementById('ai-loading').style.display = 'none';
      document.getElementById('result-section').style.display = 'block';

    } catch (err) {
      console.error(err);
      document.getElementById('ai-loading').style.display = 'none';
      document.getElementById('generate-section').style.display = 'block';
      showToast(err.message || I18N.t('error_gen'), 'error', 6000);
    }
  }

  // ── Build AI prompt ─────────────────────────────────────
  function buildPrompt(d, lang, currency) {
    return `
Write a professional sales proposal in "${lang}" language for the following project. 
Output a JSON object only.

SERVICE PROVIDER:
- Name: ${d.your_name}
- Company: ${d.company_name}
- Email: ${d.your_email}

CLIENT:
- Name: ${d.client_name}
- Industry: ${d.client_industry}

PROJECT:
- Type: ${d.project_type}
- Description: ${d.project_description}
- Budget Range: ${d.budget_range}
- Desired Start: ${d.start_date}
- Currency: ${currency}

Write a compelling, detailed professional proposal.
For the "title" field, create an impactful proposal title.
For "pricing", break the budget into logical line items (design, development, testing, etc.).
For "timeline", create 3-5 phases.
For "terms", write 5-6 standard terms (payment schedule, revisions, IP ownership, confidentiality, etc.).
All text must be in "${lang}" language.
The "currency" field should be: "${currency}".
`.trim();
  }

  // ── Result section ──────────────────────────────────────
  function renderResult() {
    // Handled by result section visibility
  }

  return { init, goToStep };
})();

// ── App init ────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Nav scroll effect
  const nav = document.querySelector('.nav');
  window.addEventListener('scroll', () => {
    nav?.classList.toggle('scrolled', window.scrollY > 20);
  }, { passive: true });

  // Lang switcher
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

  // Init app
  APP.init();
});

// ── Toast (shared) ──────────────────────────────────────────
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

console.log("Netlify Auto-deploy connected!");
