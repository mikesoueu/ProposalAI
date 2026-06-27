/**
 * ProposalAI — Supabase Auth Helper
 * ==================================
 * Gerencia: login, cadastro, sessão, verificação de plano
 */

// ── Inicializar cliente Supabase ─────────────────────────────
const { createClient } = supabase; // carregado via CDN
const _supabase = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);

// ── Auth: Cadastro ───────────────────────────────────────────
async function authSignUp(email, password, name) {
  const { data, error } = await _supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: name },
      emailRedirectTo: `${window.location.origin}/dashboard.html`,
    },
  });
  return { data, error };
}

// ── Auth: Login ──────────────────────────────────────────────
async function authSignIn(email, password) {
  const { data, error } = await _supabase.auth.signInWithPassword({
    email,
    password,
  });
  return { data, error };
}

// ── Auth: Logout ─────────────────────────────────────────────
async function authSignOut() {
  await _supabase.auth.signOut();
  window.location.href = 'index.html';
}

// ── Auth: Usuário atual ──────────────────────────────────────
async function getCurrentUser() {
  const { data: { user } } = await _supabase.auth.getUser();
  return user;
}

// ── Auth: Sessão atual ───────────────────────────────────────
async function getSession() {
  const { data: { session } } = await _supabase.auth.getSession();
  return session;
}

// ── Plano: Buscar assinatura do usuário ──────────────────────
async function getUserPlan(email) {
  const { data, error } = await _supabase
    .from('subscriptions')
    .select('*')
    .eq('email', email)
    .eq('status', 'active')
    .maybeSingle();

  if (error) {
    console.error('Error fetching plan:', error);
    return null;
  }
  return data;
}

// ── Plano: Verificar se assinatura está ativa ────────────────
function isPlanActive(subscription) {
  if (!subscription) return false;
  if (subscription.status !== 'active') return false;
  if (subscription.expires_at) {
    return new Date(subscription.expires_at) > new Date();
  }
  return true;
}

// ── Guard: Redireciona se não logado ─────────────────────────
async function requireAuth(redirectTo = 'login.html') {
  const user = await getCurrentUser();
  if (!user) {
    window.location.href = redirectTo;
    return null;
  }
  return user;
}

// ── Native Pricing Modal ───────────────────────────────────────
function showPricingModal(isClosable = false) {
  // Check if already exists
  if (document.getElementById('pricing-modal-overlay')) return;

  const overlay = document.createElement('div');
  overlay.id = 'pricing-modal-overlay';
  overlay.style.cssText = `
    position: fixed; top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(10, 10, 12, 0.85);
    backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
    z-index: 9999; display: flex; align-items: center; justify-content: center;
    padding: var(--space-4); opacity: 0; transition: opacity 0.3s ease;
    overflow-y: auto;
  `;

  const closeBtnHtml = isClosable ? `
    <button onclick="document.getElementById('pricing-modal-overlay').remove()" 
      style="position:absolute; top:24px; right:24px; background:none; border:none; color:#fff; cursor:pointer; font-size:24px; z-index:10;">
      ✕
    </button>
  ` : `
    <div style="text-align:center; margin-bottom: 16px;">
      <span style="background: rgba(255, 92, 122, 0.15); color: var(--color-danger); padding: 6px 12px; border-radius: 20px; font-size: 12px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase;">
        Action Required
      </span>
    </div>
  `;

  overlay.innerHTML = `
    ${closeBtnHtml}
    <div style="background: var(--color-bg); border: 1px solid var(--color-border); border-radius: 24px; max-width: 900px; width: 100%; padding: 40px; position: relative; animation: fadeUp 0.4s ease; margin: auto;">
      
      <div style="text-align: center; margin-bottom: 32px;">
        <h2 style="font-size: 28px; font-weight: 800; margin-bottom: 8px;">Choose your plan</h2>
        <p style="color: var(--color-text-muted); font-size: 15px; margin-bottom: 24px;">Unlock premium features and win more clients.</p>
        
        <div style="background: rgba(124,108,255,0.1); border: 1px solid rgba(124,108,255,0.3); border-radius: 12px; padding: 16px; margin-bottom: 24px; display: flex; flex-direction: column; align-items: center; gap: 8px;">
          <div style="font-weight: 600; color: var(--color-text);">Run out of proposals? Buy Extra Credits</div>
          <div style="font-size: 14px; color: var(--color-text-muted);">Choose the amount of credits (Min. 10). Each credit costs $0.50.</div>
          
          <div style="display: flex; align-items: center; gap: 12px; margin-top: 8px;">
            <input type="number" id="extra-credits-input" min="10" value="10" style="width: 80px; padding: 6px 12px; border-radius: 8px; border: 1px solid var(--color-border); background: var(--color-surface); color: #fff; text-align: center; font-weight: bold;" oninput="document.getElementById('extra-credits-price').innerText = '$' + (Math.max(10, this.value) * 0.5).toFixed(2)">
            <span style="font-weight: 600; color: var(--color-primary); font-size: 18px;" id="extra-credits-price">$5.00</span>
          </div>

          <button onclick="window.AUTH.buyExtraCredits()" id="buy-credits-btn" class="btn btn-primary btn-sm" style="margin-top: 8px;">⚡ Buy Credits</button>
        </div>

        <div style="display:inline-flex; background: var(--color-surface-2); border-radius: 30px; padding: 4px;">
          <button id="modal-toggle-monthly" class="active" style="background:var(--grad-primary); border:none; color:#fff; padding: 8px 20px; border-radius: 20px; font-weight:600; font-size:14px; cursor:pointer;">Monthly</button>
          <button id="modal-toggle-annual" style="background:transparent; border:none; color:var(--color-text-muted); padding: 8px 20px; border-radius: 20px; font-weight:600; font-size:14px; cursor:pointer;">Annual (-20%)</button>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 24px;">
        
        <!-- Starter -->
        <div style="background: var(--color-surface); border: 1px solid var(--color-border); border-radius: 16px; padding: 24px;">
          <div style="font-size: 18px; font-weight: 700; color: #8888AA;">Starter</div>
          <div style="font-size: 32px; font-weight: 800; margin: 16px 0;">
            <span class="modal-price-m">$${CONFIG.PLANS.starter.price_monthly}</span>
            <span class="modal-price-a" style="display:none;">$${CONFIG.PLANS.starter.price_annual}</span>
            <span style="font-size: 14px; color: var(--color-text-muted); font-weight: 500;">/mo</span>
          </div>
          <ul style="list-style:none; padding:0; margin:0 0 24px 0; font-size: 13px; color: var(--color-text-muted); display:flex; flex-direction:column; gap:12px;">
            <li>✓ ${CONFIG.PLANS.starter.proposals} proposals / month</li>
            <li>✓ AI generation</li>
            <li>✓ PDF Export</li>
          </ul>
          <button onclick="AUTH.openStripeCheckout('starter', window._modalBilling || 'monthly')" class="btn btn-ghost" style="width:100%; border: 1px solid var(--color-border);">Select Starter</button>
        </div>

        <!-- Pro -->
        <div style="background: rgba(124,108,255,0.05); border: 1.5px solid var(--color-primary); border-radius: 16px; padding: 24px; position: relative;">
          <div style="position: absolute; top: -12px; left: 50%; transform: translateX(-50%); background: var(--grad-primary); color: #fff; font-size: 11px; font-weight: 700; padding: 4px 12px; border-radius: 12px; text-transform: uppercase;">Most Popular</div>
          <div style="font-size: 18px; font-weight: 700; color: var(--color-primary);">Pro</div>
          <div style="font-size: 32px; font-weight: 800; margin: 16px 0;">
            <span class="modal-price-m">$${CONFIG.PLANS.pro.price_monthly}</span>
            <span class="modal-price-a" style="display:none;">$${CONFIG.PLANS.pro.price_annual}</span>
            <span style="font-size: 14px; color: var(--color-text-muted); font-weight: 500;">/mo</span>
          </div>
          <ul style="list-style:none; padding:0; margin:0 0 24px 0; font-size: 13px; color: var(--color-text-muted); display:flex; flex-direction:column; gap:12px;">
            <li>✓ <strong style="color:#fff;">No Watermarks</strong></li>
            <li>✓ Custom Branding</li>
            <li>✓ Unlimited Proposals</li>
          </ul>
          <button onclick="AUTH.openStripeCheckout('pro', window._modalBilling || 'monthly')" class="btn btn-primary" style="width:100%;">Select Pro</button>
        </div>

        <!-- Agency -->
        <div style="background: var(--color-surface); border: 1px solid var(--color-border); border-radius: 16px; padding: 24px;">
          <div style="font-size: 18px; font-weight: 700; color: var(--color-accent);">Agency</div>
          <div style="font-size: 32px; font-weight: 800; margin: 16px 0;">
            <span class="modal-price-m">$${CONFIG.PLANS.agency.price_monthly}</span>
            <span class="modal-price-a" style="display:none;">$${CONFIG.PLANS.agency.price_annual}</span>
            <span style="font-size: 14px; color: var(--color-text-muted); font-weight: 500;">/mo</span>
          </div>
          <ul style="list-style:none; padding:0; margin:0 0 24px 0; font-size: 13px; color: var(--color-text-muted); display:flex; flex-direction:column; gap:12px;">
            <li>✓ Unlimited proposals</li>
            <li>✓ API Access</li>
            <li>✓ White-label</li>
          </ul>
          <button onclick="AUTH.openStripeCheckout('agency', window._modalBilling || 'monthly')" class="btn btn-ghost" style="width:100%; border: 1px solid var(--color-border);">Select Agency</button>
        </div>

      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  // Toggle logic
  window._modalBilling = 'monthly';
  const btnM = document.getElementById('modal-toggle-monthly');
  const btnA = document.getElementById('modal-toggle-annual');
  const pricesM = document.querySelectorAll('.modal-price-m');
  const pricesA = document.querySelectorAll('.modal-price-a');

  const setBilling = (type) => {
    window._modalBilling = type;
    const isA = type === 'annual';
    
    btnM.style.background = isA ? 'transparent' : 'var(--grad-primary)';
    btnM.style.color = isA ? 'var(--color-text-muted)' : '#fff';
    
    btnA.style.background = isA ? 'var(--grad-primary)' : 'transparent';
    btnA.style.color = isA ? '#fff' : 'var(--color-text-muted)';

    pricesM.forEach(el => el.style.display = isA ? 'none' : 'inline');
    pricesA.forEach(el => el.style.display = isA ? 'inline' : 'none');
  };

  btnM.onclick = () => setBilling('monthly');
  btnA.onclick = () => setBilling('annual');

  // Fade in
  requestAnimationFrame(() => {
    overlay.style.opacity = '1';
  });
}

// ── Guard: Redireciona se não tem plano ativo ────────────────
async function requirePlan(user) {
  // Admin bypass
  if (user?.email === 'mikemovell2.0@gmail.com' || user?.email === 'mikemovel2.0@gmail.com') {
    return { plan: 'agency', status: 'active', expires_at: '2030-01-01T00:00:00Z' };
  }

  const plan = await getUserPlan(user.email);
  if (!isPlanActive(plan)) {
    showPricingModal(false); // Blocks screen, cannot be closed
    return null;
  }
  return plan;
}

// ── Plano: Nome formatado ────────────────────────────────────
function getPlanDisplayName(plan) {
  const names = { starter: 'Starter', pro: 'Pro', agency: 'Agency' };
  return names[plan?.plan] || 'Free';
}

// ── Plano: Cor do badge ──────────────────────────────────────
function getPlanColor(plan) {
  const colors = {
    starter: '#8888AA',
    pro:     '#7C6CFF',
    agency:  '#00D9A3',
  };
  return colors[plan?.plan] || '#555';
}

// ── Propostas: Salvar proposta gerada ────────────────────────
async function saveProposal(user, proposalData) {
  const { data, error } = await _supabase.from('proposals').insert({
    user_id: user.id,
    email: user.email,
    title: proposalData.title || 'Untitled Proposal',
    client_name: proposalData._meta?.clientName || '',
    data: proposalData,
  }).select('id').single();
  return { data, error };
}

// ── Propostas: Buscar propostas do usuário ───────────────────
async function getUserProposals(userId) {
  const { data, error } = await _supabase
    .from('proposals')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  return { data, error };
}

// ── Stripe: Abrir checkout com email pré-preenchido ──────────
function openStripeCheckout(plan, billing = 'monthly') {
  const key = billing === 'annual' ? `${plan}_annual` : plan;
  const links = billing === 'annual'
    ? CONFIG.STRIPE_LINKS_ANNUAL
    : CONFIG.STRIPE_LINKS;

  let url = links[key] || links[plan];
  if (!url || url.includes('YOUR_')) {
    alert('Stripe links not configured yet in config.js');
    return;
  }

  // Pré-preencher email do usuário logado no checkout do Stripe
  getCurrentUser().then(user => {
    if (user?.email) {
      url += (url.includes('?') ? '&' : '?') + `prefilled_email=${encodeURIComponent(user.email)}`;
    }
    window.location.href = url;
  });
}

// ── Stripe: Comprar Créditos Extras Dinamicamente ─────────────
async function buyExtraCredits() {
  const input = document.getElementById('extra-credits-input');
  const btn = document.getElementById('buy-credits-btn');
  let credits = parseInt(input.value);
  if (isNaN(credits) || credits < 10) credits = 10;
  
  const user = await getCurrentUser();
  if (!user) {
    alert('You must be logged in to buy credits.');
    return;
  }

  btn.innerText = 'Loading...';
  btn.disabled = true;

  try {
    const session = await getSession();
    const token = session?.access_token;
    
    const response = await fetch(`${CONFIG.SUPABASE_URL}/functions/v1/create-checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ credits })
    });

    const data = await response.json();
    if (data.url) {
      window.location.href = data.url;
    } else {
      throw new Error(data.error || 'Failed to create checkout session');
    }
  } catch (err) {
    console.error(err);
    alert('Error connecting to billing system. Try again later.');
    btn.innerText = '⚡ Buy Credits';
    btn.disabled = false;
  }
}

// ── Observar mudanças de autenticação ───────────────────────
_supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_OUT') {
    // Limpar dados locais ao deslogar
    localStorage.removeItem('proposalai_proposal');
  }
});

// Expor globalmente
window.AUTH = {
  signUp: authSignUp,
  signIn: authSignIn,
  signOut: authSignOut,
  getCurrentUser,
  getSession,
  getUserPlan,
  isPlanActive,
  requireAuth,
  requirePlan,
  getPlanDisplayName,
  getPlanColor,
  saveProposal,
  getUserProposals,
  openStripeCheckout,
  buyExtraCredits,
  showPricingModal,
  client: _supabase,
};
