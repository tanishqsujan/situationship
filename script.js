const $ = s => document.querySelector(s);
const pick = a => a[Math.floor(Math.random() * a.length)];
const wait = ms => new Promise(r => setTimeout(r, ms));
// Shared state: the ex's name (start) comes back at the end; tip sets mood; mood sets stops
const S = { ex: '', cart: [], tip: 0, coupon: 0, mood: 'furious', stops: 4, total: 0 };

/* ---------- helpers ---------- */
let ac;
function tone(f, d = .15, t = 'square', at = 0) {
  try {
    ac = ac || new AudioContext();
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = t; o.frequency.value = f; g.gain.value = .08;
    o.connect(g); g.connect(ac.destination);
    o.start(ac.currentTime + at); o.stop(ac.currentTime + at + d);
  } catch (e) {}
}
const ding = () => { tone(880, .1, 'sine'); tone(1320, .2, 'sine', .1); };
const horn = () => tone(300, .4, 'sawtooth');
const sting = () => [200, 150, 100, 60].forEach((f, i) => tone(f, .3, 'sawtooth', i * .15));
const bone = () => [300, 280, 260, 200].forEach((f, i) => tone(f, .4, 'triangle', i * .35));
function toast(t) {
  const e = $('#toast'); e.textContent = t; e.classList.add('show');
  clearTimeout(toast.t); toast.t = setTimeout(() => e.classList.remove('show'), 2600);
}
function show(id) {
  document.querySelectorAll('.scr').forEach(e => e.classList.toggle('on', e.id === id));
  window.scrollTo(0, 0);
}
function say(t) {
  if (!window.speechSynthesis) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(t); u.pitch = .7; speechSynthesis.speak(u);
}
async function ai(type, data, fb) {
  try {
    const r = await fetch('/api/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type, data }) });
    if (!r.ok) throw 0;
    const j = await r.json();
    return j.text || fb;
  } catch (e) { return fb; }
}
const inr = n => '₹' + Math.round(n).toLocaleString('en-IN');

/* ---------- background + ticker ---------- */
for (let i = 0; i < 22; i++) {
  const s = document.createElement('span');
  s.textContent = pick(['🍕', '🛵', '💘', '🍔', '🚩', '📦', '🥡', '💔']);
  s.style.left = Math.random() * 100 + '%';
  s.style.animationDuration = 12 + Math.random() * 16 + 's';
  s.style.animationDelay = -Math.random() * 20 + 's';
  $('#bg').appendChild(s);
}
$('#tick').textContent = ['Aman ordered: Boyfriend (Veg), status: stuck in traffic', 'Riya ordered: The Situationship, status: left on read', 'Karan cancelled: commitment issues', 'Therapists thanking us today: 0', 'Orders delivered on time: 0'].join('   🚩   ');

/* ---------- 1. FUNNY START ---------- */
const LT = ['Locating your feelings...', "Checking if your ex is nearby...", "Finding someone who won't ghost you...", 'Error: none found. Loading anyway.'];
let li = 0;
const lt = setInterval(() => {
  if (li >= LT.length) { clearInterval(lt); return show('profile'); }
  $('#ltxt').textContent = LT[li];
  $('#lbar').style.width = (++li / LT.length * 100) + '%';
}, 900);

$('#decline').onclick = () => {
  $('#a1').checked = $('#a2').checked = true;
  toast('Declining is not available in your region.');
};
const MALE_EX = ['Chad Gymsworth', 'Kevin Podcastson', 'Aman Busy-Lately', 'Rohan Hey-Stranger', 'Dylan Seen-Zoned', 'Brad Leftonread'];
const FEMALE_EX = ['Priya Maybe-Later', 'Tanya Typing-Dots', 'Riya Ghostwell', 'Meera Seen-Only', 'Kiara Left-Open', 'Sana Busy-Bee'];
$('#noex').onclick = () => {
  const g = S.user && S.user.g;
  $('#ex').value = pick(g === 'm' ? FEMALE_EX : g === 'f' ? MALE_EX : [...MALE_EX, ...FEMALE_EX]);
  toast("No ex? We assigned you someone to avoid. You're welcome.");
};
$('#accept').onclick = () => {
  S.ex = $('#ex').value.trim();
  if (!S.ex) return toast('Name someone you are allergic to, or tap "Assign me one".');
  if (!$('#a1').checked || !$('#a2').checked) return toast('Please accept your fate.');
  ding(); renderMenu(); show('home');
  say('Welcome to Rizzorante. Love, delivered. Eventually.');
};
$('#goTc').onclick = () => {
  const n = $('#uname').value.trim(), a = $('#uage').value, g = $('#ugender').value;
  if (!n || !a || !g) return toast('Fill all three. Even a fake delivery needs a name, age and gender.');
  S.user = { n, a, g };
  ding(); show('tc');
};  

/* ---------- 2. MENU ---------- */
const MENU = [
  { n: 'Boyfriend (Veg)', t: 'm', e: '🥗', p: 299, d: 'Mild. Replies in 2 days.', h: 3, r: '3.1' },
  { n: 'Boyfriend (Non-Veg)', t: 'm', e: '🍗', p: 399, d: 'Spicy red flags. Gym selfies included.', h: 2, r: '2.8' },
  { n: 'Girlfriend (Extra Cheese)', t: 'f', e: '🧀', p: 349, d: 'Cheesy texts. No onions, no baggage.', h: 3, r: '3.4' },
  { n: 'Girlfriend (Spicy)', t: 'f', e: '🌶️', p: 379, d: 'Spicy red flags. Always says "fine". Never fine.', h: 2, r: '2.9' },
  { n: 'The Situationship', t: 'x', e: '🌫️', p: 99, d: 'Not a boyfriend. Not a friend. Nobody knows what this is.', h: 1, r: '2.0' },
  { n: 'Emotionally Available Person', t: 'x', e: '🦄', p: 9999, d: 'Out of stock (rumoured to exist).', h: 5, r: '5.0', oos: 1 }
];
const hidden = m => {
  const g = S.user && S.user.g, want = g === 'm' ? 'f' : g === 'f' ? 'm' : null;
  return !!(want && m.t && m.t !== 'x' && m.t !== want);
};
function renderMenu() {
  $('#menu').innerHTML = MENU.map((m, i) => hidden(m) ? '' : `<div class="item"><div class="em">${m.e}</div><div class="in"><h3>${m.n}</h3><small>${m.d}</small><small>⭐ ${m.r} · Hygiene ${m.h}/5 · 🔥 ${Math.ceil(Math.random() * 60)} viewing</small><b>${inr(m.p)}</b></div><button class="add" data-i="${i}" ${m.oos ? 'disabled' : ''}>${m.oos ? 'Out' : 'ADD'}</button></div>`).join('');
}
function addItem(it) {
  S.cart.push(it); ding();
  $('#cnt').textContent = S.cart.length;
  toast(it.n + ' added. No refunds on feelings.');
}
$('#menu').onclick = e => {
  const b = e.target.closest('.add');
  if (b && !b.disabled) addItem(MENU[b.dataset.i]);
};
$('#cook').onclick = async () => {
  const w = $('#wish').value.trim();
  if (!w) return toast('Type your ideal partner first');
  $('#cook').disabled = true; $('#cook').textContent = 'Cooking...';
  const raw = await ai('item', { wish: w }, null);
  let o = null;
  try { o = JSON.parse(String(raw).replace(/```json|```/g, '').trim()); } catch (e) {}
  if (!o || !o.name) o = { name: w.slice(0, 28) + ' (Custom)', desc: 'Made to order. May arrive undefined.', price: pick([199, 349, 499]), warning: 'May contain: ghosting' };
  const it = { n: o.name, e: '🧪', p: Number(o.price) || 299, d: o.desc + ' ⚠️ ' + o.warning, h: 1, r: '1.4' };
  MENU.unshift(it); renderMenu(); addItem(it);
  $('#cook').disabled = false; $('#cook').textContent = 'Cook it up';
};

/* ---------- 3. CART ---------- */
$('#cartBtn').onclick = () => {
  if (!S.cart.length) return toast('Cart empty. Like your DMs.');
  renderCart(); show('cart');
};
$('#back').onclick = () => { toast('You left a person in your cart. They are still waiting.'); show('home'); };
function renderCart() {
  const sub = S.cart.reduce((a, i) => a + i.p, 0), surge = sub * 1.5, fees = 239;
  const disc = S.coupon ? (sub + surge) * .5 : 0;
  S.tip = Number($('#tip').value);
  S.total = sub + surge + fees - disc + S.tip;
  S.mood = S.tip < 20 ? 'furious' : S.tip < 100 ? 'bored' : 'smug';
  $('#tipv').textContent = S.tip;
  $('#meter').textContent = S.tip < 20 ? 'Rider thinks you are a red flag 🚩 (angry rider, 2 extra stops)' : S.tip < 100 ? 'Rider is neutral. Like your ex. (normal stops)' : 'Rider loves you. This will not help. (normal stops)';
  $('#cartList').innerHTML = S.cart.map(i => `<div class="item"><div class="em">${i.e}</div><div class="in"><h3>${i.n}</h3><b>${inr(i.p)}</b></div></div>`).join('');
  $('#bill').innerHTML = [['Items', sub], ['Surge (everyone is single)', surge], ['Late-night texting + friends tax', fees], ...(disc ? [['SINGLE50 (50% off self-esteem)', -disc]] : []), ['Rider tip', S.tip]].map(r => `<li><span>${r[0]}</span><b>${inr(r[1])}</b></li>`).join('') + `<li class="t"><span>Total</span><span>${inr(S.total)}</span></li>`;
}
$('#tip').oninput = renderCart;
$('#apply').onclick = () => {
  const c = $('#coupon').value.trim().toUpperCase();
  $('#coupon').value = '';
  if (c === 'SINGLE50') { S.coupon = 1; ding(); toast('Coupon applied. Self-esteem now half price.'); }
  else if (c === 'MOVEON') toast('Expired in 2022. Like your relationship.');
  else toast('Invalid code. Like your excuses.');
  renderCart();
};

/* ---------- 4. TRACKING ---------- */
const PL = [['the gym mirror', '🏋️'], ['a podcast studio', '🎙️'], [`your ex's street`, '💔'], ['a group chat', '💬'], ['the "we need to talk" signal', '🚦'], ['an overthinking roundabout', '🔄'], ["your mother's WhatsApp", '📱']];
const RB = ['Sir, I am outside your commitment issues. Please come down.', 'Traffic is bad. Emotional baggage on the main road.', 'I am 2 minutes away. I said that 40 minutes ago.', 'Sir, I stopped to overthink. Back soon.'];
let tm, step = 0, dodge = 0;
function addLog(who, t) {
  const li = document.createElement('li');
  if (who === 'You') li.className = 'me';
  li.textContent = who + ': ' + t;
  $('#log').appendChild(li); li.scrollIntoView({ block: 'nearest' });
  return li;
}
$('#place').onclick = () => {
  renderCart();
  S.stops = Math.min(7, 3 + S.cart.length + (S.mood === 'furious' ? 2 : 0));
  step = 0; dodge = 0; S.answered = false; S.n = 0; $('#log').innerHTML = '';
  show('track'); ding(); $('#msg').focus();
  say(`Order placed. Rider mood: ${S.mood}. Expect ${S.stops} stops.`);
  tm = setInterval(tick, 5000);
};
function tick() {
  step++;
  const p = PL[(step - 1) % PL.length];
  $('#rider').style.left = Math.min(step / S.stops, 1) * 78 + '%';
  $('#where').textContent = `Rider is at ${p[0]} ${p[1]}`;
  $('#eta').textContent = `ETA: ${8 + step * 5} min (it went UP)`;
  if (step === 1) addLog('Rider', 'I will call you in a moment to confirm your order.');
  horn();
  if (step === 2) incoming();
  if (step >= S.stops) {
    clearInterval(tm);
    // Declined call = wrong delivery. Answered call = 50/50.
    S.wrong = !S.answered || Math.random() < .5;
    setTimeout(wtf, 2500);
  }
}
function incoming() {
  $('#call').classList.remove('hide');
  [0, .6, 1.2].forEach(t => tone(700, .3, 'sine', t));
}
$('#ans').onclick = () => {
  $('#call').classList.add('hide'); S.answered = true;
  say(`Sir, confirming your order: ${S.cart.map(i => i.n).join(' and ')}. Delivering to the correct person. Yes? Great.`);
  addLog('Rider', 'Order confirmed. Odds of a correct delivery: 50%.');
};
$('#rej').onclick = () => {
  $('#call').classList.add('hide'); S.answered = false;
  addLog('Rider', 'You declined my call. I will guess who you are.');
};
$('#send').onclick = async () => {
  const m = $('#msg').value.trim();
  if (!m) return;
  $('#msg').value = ''; $('#msg').focus(); addLog('You', m);
  S.n = (S.n || 0) + 1;
  if ($('#a2').checked && S.ex && m.toLowerCase().includes(S.ex.toLowerCase())) {
    const w = `You promised not to text ${S.ex}. Reporting you.`;
    addLog('Rider', w); say(w);
    return;
  }
  if ($('#a1').checked && S.n % 3 === 0) {
    addLog('Rider', '✓✓ Seen'); say('Seen. Left on read.');
    return;
  }
  const typing = addLog('Rider', 'typing...');
  const r = await ai('rider', { msg: m, mood: S.mood, items: S.cart.map(i => i.n).join(', ') }, pick(RB));
  typing.textContent = 'Rider: ' + r;
  say(r);
};
// Cancel button runs away, then costs money
const cb = $('#cancel');
['mouseenter', 'touchstart'].forEach(ev => cb.addEventListener(ev, e => {
  if (dodge < 3) { e.preventDefault(); dodge++; cb.style.transform = `translate(${Math.random() * 100 - 50}px,${Math.random() * 30 - 15}px)`; }
}, { passive: false }));
cb.onclick = () => {
  toast('Cancellation fee: ₹500 and one apology. Order NOT cancelled.');
  S.total += 500; step = Math.max(0, step - 1); horn();
};

/* ---------- 5. WHAT THE HECK ENDING ---------- */
function wtf() {
  clearInterval(tm); ding();
  S.orderNo = Math.floor(10000 + Math.random() * 90000);
  $('#dInfo').innerHTML = `Order <b>#${S.orderNo}</b><br>${S.cart.map(i => i.n).join(' + ')}<br>${S.stops} stops · ${inr(S.total)} paid`;
  $('#wtf').classList.remove('hide');
  say('Order delivered. Please view details.');
}
$('#details').onclick = () => {
  $('#details').classList.add('hide');
  $('#twist').classList.remove('hide');
  if (S.wrong) {
    sting(); $('#wtf .ph').classList.add('red');
    $('#dTitle').textContent = 'WRONG ORDER DELIVERED';
    $('#wtfEm').textContent = pick(['😐', '🙂', '😬', '🫠']);
    $('#wtfName').textContent = S.ex;
    $('#twTxt').textContent = `You listed ${S.ex} as an allergy. We delivered them anyway, with a bouquet.`;
    say(`Wrong order. We delivered ${S.ex}. Your allergy list was ignored.`);
  } else {
    horn();
    $('#dTitle').textContent = 'ORDER CORRECT (suspicious)';
    $('#wtfEm').textContent = '😶';
    $('#twTxt').textContent = `Your partner arrived after ${S.stops} stops, said "hey", then went offline. Suspiciously correct. Complain below anyway.`;
    say('Order correct. This has never happened before.');
  }
};
$('#report').onclick = async () => {
  S.issue = $('#issue').value.trim() || 'No reason given';
  $('#report').disabled = true; $('#issue').disabled = true;
  const who = S.wrong ? S.ex : 'the rider\'s manager';
  for (const l of [`Complaint registered: "${S.issue}"`, `Forwarded to ${who}.`, `${who} is typing...`, `${who} left you on read.`, 'Reviewing refund...']) {
    $('#rlog').textContent = l; horn(); await wait(1500);
  }
  let p = 0;
  while (p < 99) { p += 3; $('#rbar').style.width = p + '%'; await wait(70); }
  $('#rlog').textContent = 'Refund rejected. No refunds on feelings. 1 hug issued instead 🤗';
  bone(); say('Refund rejected. No refunds on feelings.');
  await wait(2800);
  receipt();
};
async function receipt() {
  const items = S.cart.map(i => i.n).join(', ');
  const rv = await ai('review', { items, tip: S.tip, ex: S.wrong ? `the wrong person (${S.ex})` : 'the correct person, which shocked everyone' }, `Customer ordered ${S.cart.length} partner(s), tipped ${inr(S.tip)} and ${S.wrong ? 'got the wrong person' : 'somehow got the right order'}. Rated 2 stars. Left on read.`);
  $('#receipt').innerHTML = `<h2>Rizzorante</h2><div class="r"><span>Order #</span><b>${S.orderNo}</b></div><div class="r"><span>Ordered</span><b></b></div><div class="r"><span>Delivered</span><b></b></div><div class="r"><span>Stops</span><b>${S.stops}</b></div><div class="r"><span>Refund</span><b>₹0 (rejected)</b></div><div class="r"><span>Complaint</span><b></b></div><div class="r"><span>Total paid</span><b>${inr(S.total)}</b></div><p><i></i></p><div class="bar"></div><p>Thank you for choosing heartbreak.</p>`;
  const b = document.querySelectorAll('#receipt .r b');
  b[1].textContent = items;
  b[2].textContent = S.wrong ? S.ex + ' (wrong order)' : 'Correct order (shockingly)';
  b[5].textContent = S.issue || '-';
  $('#receipt i').textContent = 'Rider review: ' + rv;
  $('#wtf').classList.add('hide'); show('end');
}
$('#dl').onclick = () => {
  if (!window.html2canvas) return toast('Screenshot library did not load. Take a screenshot!');
  html2canvas($('#receipt')).then(c => { const a = document.createElement('a'); a.download = 'Rizzorante-receipt.png'; a.href = c.toDataURL(); a.click(); });
};
$('#again').onclick = () => location.reload();
$('#coupon').addEventListener('keydown', e => { if (e.key === 'Enter') $('#apply').click(); });
$('#msg').addEventListener('keydown', e => { if (e.key === 'Enter') $('#send').click(); });