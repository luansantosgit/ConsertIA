/* DeeperIA — site institucional (vanilla JS, ESM p/ testes unitários) */

export const LOSS_RATE = 0.25;
export const DEFAULT_SUPPORT_WA = '5518997411233';
export const LANDING_LEAD_ENDPOINT = 'https://sknimzjwpdbcuutxbycq.supabase.co/functions/v1/landing-lead';

export function digits(value) {
  return String(value ?? '').replace(/\D+/g, '');
}

export function formatBRL(value) {
  return Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
}

/**
 * Lucro mensal estimado perdido por demora no atendimento:
 * orçamentos/dia × ticket × 30 dias × taxa de perda (25% —
 * conservadora frente ao ganho médio de +35% em conversão).
 */
export function calculateMonthlyLoss(quotesPerDay, ticket) {
  const quotes = Math.max(0, Math.round(quotesPerDay) || 0);
  const avg = Math.max(0, Math.round(ticket) || 0);
  const monthlyLoss = Math.round(quotes * avg * 30 * LOSS_RATE);
  const lostQuotes = Math.round(quotes * 30 * LOSS_RATE);
  return { monthlyLoss, lostQuotes };
}

export function validateLead(input) {
  const errors = {};
  const name = String(input?.name ?? '').trim();
  const whatsapp = digits(input?.whatsapp);
  const store = String(input?.store_name ?? '').trim();

  if (name.length < 2 || name.length > 80) errors.name = 'Informe seu nome.';
  if (whatsapp.length < 10 || whatsapp.length > 15) errors.whatsapp = 'WhatsApp inválido — inclua o DDD.';
  if (store.length < 2 || store.length > 100) errors.store_name = 'Informe o nome da loja.';

  return { ok: Object.keys(errors).length === 0, errors, data: { name, whatsapp, store_name: store } };
}

/* ───────────────────────── DOM (site) ───────────────────────── */

function initSupportLinks(number) {
  const wa = digits(number) || DEFAULT_SUPPORT_WA;
  document.querySelectorAll('[data-wa]').forEach((el) => {
    const msg = el.getAttribute('data-wa-msg');
    const text = msg ? `?text=${encodeURIComponent(msg)}` : '';
    el.href = `https://wa.me/${wa}${text}`;
  });
}

async function loadConfig() {
  try {
    const res = await fetch(LANDING_LEAD_ENDPOINT, { method: 'GET' });
    if (!res.ok) throw new Error('config');
    const cfg = await res.json();
    initSupportLinks(cfg.support_whatsapp);
    const { logo_url: logoUrl, logo_text: logoText } = cfg.branding ?? {};
    if (logoUrl) {
      const img = document.getElementById('brand-logo');
      const mark = document.getElementById('brand-mark');
      if (img) { img.src = logoUrl; img.style.display = ''; }
      if (mark) mark.style.display = 'none';
      const favicon = document.querySelector('link[rel="icon"]');
      if (favicon) favicon.href = logoUrl;
    }
    if (logoText) {
      document.querySelectorAll('[data-brand-text]').forEach((el) => {
        el.textContent = logoText;
      });
    }
  } catch {
    initSupportLinks(DEFAULT_SUPPORT_WA);
  }
}

/* ── Simulador de chat ── */

const SCENARIOS = {
  screen: [
    { from: 'customer', text: 'Oi! Quebrei a tela do meu iPhone 13. Quanto fica pra trocar?' },
    { from: 'ia', text: 'Olá! 👋 Sou o agente da assistência. A troca de tela do iPhone 13 sai entre R$ 450 e R$ 690, com garantia de 3 meses.' },
    { from: 'ia', text: 'Só pra confirmar: o touch e a imagem funcionam normalmente?' },
    { from: 'customer', text: 'Sim, só o vidro estourou' },
    { from: 'ia', text: 'Perfeito — é a troca da tela completa, sem risco pra placa. Quer agendar a visita à loja?' },
    { from: 'customer', text: 'Quero sim' },
    { from: 'ia', text: 'Tenho amanhã às 10h ou às 14h. Qual fica melhor?' },
    { from: 'customer', text: '10h' },
    { from: 'ia', text: 'Agendado ✅ Amanhã às 10h. Enviei a confirmação com endereço e protocolo. Até logo!' },
  ],
  water: [
    { from: 'customer', text: 'Meu celular caiu na água! Atende agora?' },
    { from: 'ia', text: 'Calma, dá pra salvar 💪 Quanto tempo desde o contato com a água?' },
    { from: 'customer', text: 'Uns 20 minutos' },
    { from: 'ia', text: 'Ótimo, ainda em janela segura. NÃO ligue o aparelho. O banho químico + limpeza de placa sai entre R$ 150 e R$ 350.' },
    { from: 'ia', text: 'É urgente, então encaixei hoje às 16h. Confirma?' },
    { from: 'customer', text: 'Confirmo, obrigado!' },
    { from: 'ia', text: 'Reservado ✅ Traga o aparelho desligado. Protocolo enviado no seu WhatsApp. Até daqui a pouco!' },
  ],
  battery: [
    { from: 'customer', text: 'A bateria do meu Galaxy S22 está durando nada. Trocam?' },
    { from: 'ia', text: 'Trocar sim! A bateria original do S22 sai por R$ 180 a R$ 280, com garantia de 6 meses.' },
    { from: 'ia', text: 'O aparelho desliga sozinho com carga na tela também?' },
    { from: 'customer', text: 'Desliga com 20% às vezes' },
    { from: 'ia', text: 'Confirma o diagnóstico da bateria. Temos horário hoje às 11h ou amanhã às 9h. Qual prefere?' },
    { from: 'customer', text: 'Hoje às 11h' },
    { from: 'ia', text: 'Agendado ✅ Troca em até 40 minutos. Confirmação com endereço enviada. Até já!' },
  ],
};

let simRunId = 0;

function bubbleEl(turn, waBody) {
  const div = document.createElement('div');
  div.className = `bubble ${turn.from === 'ia' ? 'bubble-ia' : 'bubble-customer'}`;
  const time = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const ticks = turn.from === 'ia' ? ' <span class="ticks">✓✓</span>' : '';
  div.innerHTML = `${turn.text}<time>${time}${ticks}</time>`;
  const typing = document.getElementById('wa-typing');
  if (typing && typing.parentElement === waBody) {
    waBody.insertBefore(div, typing);
  } else {
    waBody.appendChild(div);
  }
  waBody.scrollTop = waBody.scrollHeight;
}

function runScenario(key) {
  const waBody = document.getElementById('wa-body');
  const typing = document.getElementById('wa-typing');
  const overlay = document.getElementById('phone-cta');
  const quickReplies = document.getElementById('quick-replies');
  const turns = SCENARIOS[key];
  if (!waBody || !turns) return;

  const runId = ++simRunId;
  waBody.querySelectorAll('.bubble').forEach((b) => b.remove());
  typing.classList.remove('show');
  overlay.classList.remove('show');
  quickReplies.querySelectorAll('.qr-btn').forEach((b) => (b.disabled = true));

  let delay = 150;
  turns.forEach((turn) => {
    if (turn.from === 'ia') {
      setTimeout(() => { if (runId === simRunId) typing.classList.add('show'); waBody.scrollTop = waBody.scrollHeight; }, delay);
      delay += 950;
      setTimeout(() => { if (runId === simRunId) typing.classList.remove('show'); }, delay);
    } else {
      delay += 550;
    }
    setTimeout(() => { if (runId === simRunId) bubbleEl(turn, waBody); }, delay);
    delay += 350;
  });

  setTimeout(() => {
    if (runId !== simRunId) return;
    quickReplies.querySelectorAll('.qr-btn').forEach((b) => (b.disabled = false));
    overlay.classList.add('show');
  }, delay + 300);
}

/* ── Calculadora ── */

function initCalculator() {
  const quotes = document.getElementById('calc-quotes');
  const ticket = document.getElementById('calc-ticket');
  const result = document.getElementById('calc-result');
  const detail = document.getElementById('calc-detail');
  const outQuotes = document.getElementById('calc-quotes-out');
  const outTicket = document.getElementById('calc-ticket-out');
  if (!quotes || !ticket || !result) return;

  const render = () => {
    const { monthlyLoss, lostQuotes } = calculateMonthlyLoss(Number(quotes.value), Number(ticket.value));
    outQuotes.textContent = `${quotes.value} orçamentos`;
    outTicket.textContent = formatBRL(Number(ticket.value));
    result.textContent = formatBRL(monthlyLoss);
    detail.textContent = `≈ ${lostQuotes} orçamentos perdidos por mês — respostas lentas e follow-up inexistente.`;
  };
  quotes.addEventListener('input', render);
  ticket.addEventListener('input', render);
  render();
}

/* ── Modal de lead ── */

function markInvalid(field, on) {
  document.getElementById(`field-${field}`)?.classList.toggle('invalid', on);
}

async function submitLead(payload) {
  const res = await fetch(LANDING_LEAD_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.ok) throw new Error(body.error || 'Falha ao enviar. Tente novamente.');
}

function initLeadModal() {
  const overlay = document.getElementById('lead-modal');
  const form = document.getElementById('lead-form');
  const success = document.getElementById('lead-success');
  const alert = document.getElementById('lead-alert');
  if (!overlay || !form) return;

  let ctx = {};
  const open = (context) => {
    ctx = context || {};
    form.reset();
    form.style.display = '';
    success.classList.remove('show');
    alert.classList.remove('show');
    ['name', 'whatsapp', 'store_name'].forEach((f) => markInvalid(f, false));
    overlay.classList.add('show');
    document.getElementById('lead-name')?.focus();
  };
  const close = () => overlay.classList.remove('show');

  document.querySelectorAll('[data-open-lead]').forEach((el) =>
    el.addEventListener('click', (e) => { e.preventDefault(); open(el.getAttribute('data-lead-ctx') === 'calc' ? calcContext() : {}); })
  );
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  document.getElementById('lead-close')?.addEventListener('click', close);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });

  function calcContext() {
    const quotes = document.getElementById('calc-quotes');
    const ticket = document.getElementById('calc-ticket');
    return quotes && ticket ? { quotes_per_day: Number(quotes.value), ticket: Number(ticket.value) } : {};
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    alert.classList.remove('show');
    ['name', 'whatsapp', 'store_name'].forEach((f) => markInvalid(f, false));

    const raw = {
      name: document.getElementById('lead-name')?.value,
      whatsapp: document.getElementById('lead-whatsapp')?.value,
      store_name: document.getElementById('lead-store')?.value,
    };
    const { ok, errors, data } = validateLead(raw);
    if (!ok) {
      Object.entries(errors).forEach(([field]) => markInvalid(field, true));
      return;
    }

    const btn = document.getElementById('lead-submit');
    btn.disabled = true;
    btn.textContent = 'Enviando...';
    try {
      await submitLead({ ...data, ...ctx });
      form.style.display = 'none';
      success.classList.add('show');
    } catch (err) {
      alert.textContent = err.message || 'Falha ao enviar. Tente novamente.';
      alert.classList.add('show');
    } finally {
      btn.disabled = false;
      btn.textContent = 'QUERO ATIVAR NA MINHA LOJA';
    }
  });
}

/* ── Misc UI ── */

function initNav() {
  const toggle = document.getElementById('nav-toggle');
  const nav = document.getElementById('site-nav');
  toggle?.addEventListener('click', () => nav.classList.toggle('open'));
  nav?.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => nav.classList.remove('open')));
}

function initReveal() {
  if (!('IntersectionObserver' in window)) {
    document.querySelectorAll('.reveal').forEach((el) => el.classList.add('visible'));
    return;
  }
  const io = new IntersectionObserver(
    (entries) => entries.forEach((entry) => {
      if (entry.isIntersecting) { entry.target.classList.add('visible'); io.unobserve(entry.target); }
    }),
    { rootMargin: '0px 0px -8% 0px', threshold: 0.08 }
  );
  document.querySelectorAll('.reveal').forEach((el) => io.observe(el));
}

if (typeof document !== 'undefined' && document.getElementById('site-root')) {
  loadConfig();
  initCalculator();
  initLeadModal();
  initNav();
  initReveal();
  document.querySelectorAll('[data-scenario]').forEach((btn) =>
    btn.addEventListener('click', () => runScenario(btn.dataset.scenario))
  );
}
