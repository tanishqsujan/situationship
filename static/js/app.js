(() => {
  "use strict";

  const DELIVERY_FEE = 49;
  const SURGE_FEE = 37;
  const EX_BAGGAGE_FEE = 88;
  const NEVER_BAGGAGE_FEE = 42;
  const CANCELLATION_PENALTY = 500;
  const MINUTES_PER_STOP = 4;
  const FALLBACK_SOULMATE = "Your Imaginary Soulmate";
  const CUSTOM_PRICE_MIN = 99;
  const CUSTOM_PRICE_MAX = 899;
  const AUTO_TRACK_MS = 12000;

  const CATALOG = [
    {
      id: "available-bf",
      name: "Emotionally Available Boyfriend",
      description: "Theoretically in stock. Practically a myth we keep on the menu for hope.",
      price: 499,
      category: "Commitment",
      inStock: false,
      accent: "#ff6482",
    },
    {
      id: "green-flag",
      name: "Green-Flag Girlfriend",
      description: "Apologizes first, hydrates, and does not make you decode the text 'k'.",
      price: 349,
      category: "Commitment",
      inStock: true,
      accent: "#d6ff78",
    },
    {
      id: "texts-back",
      name: "Someone Who Texts Back",
      description: "Replies in the same calendar day. Occasionally with words.",
      price: 199,
      category: "Communication",
      inStock: true,
      accent: "#b9a0ff",
    },
    {
      id: "premium-comm",
      name: "Premium Communicator",
      description: "Uses voice notes under 40 seconds and never starts with 'we need to talk' by accident.",
      price: 399,
      category: "Communication",
      inStock: true,
      accent: "#ff4fb8",
    },
    {
      id: "five-year",
      name: "Five-Year-Plan Partner",
      description: "Owns a calendar, a passport, and the audacity of a shared spreadsheet.",
      price: 549,
      category: "Commitment",
      inStock: true,
      accent: "#ff6482",
    },
    {
      id: "no-mixed",
      name: "No Mixed Signals Subscription",
      description: "Monthly clarity. Cancellation of mixed signals, not of you.",
      price: 299,
      category: "Communication",
      inStock: true,
      accent: "#b9a0ff",
    },
    {
      id: "finance",
      name: "Financially Responsible Soulmate",
      description: "Splits the bill without a TED Talk. Has an emergency fund and a favorite noodle place.",
      price: 799,
      category: "Lifestyle",
      inStock: true,
      accent: "#d6ff78",
    },
    {
      id: "three-am",
      name: "3 AM Emotional Support Partner",
      description: "Answers the spiral. Brings water. Does not say 'just sleep'.",
      price: 249,
      category: "Support",
      inStock: true,
      accent: "#ff4fb8",
    },
    {
      id: "weekend",
      name: "Weekend-Only Lover",
      description: "Available Friday 7pm to Sunday brunch, then legally evaporates.",
      price: 179,
      category: "Casual",
      inStock: true,
      accent: "#ff6482",
    },
  ];

  const SPLASH_LINES = [
    "Finding your perfect match…",
    "Checking emotional availability…",
    "Scanning for red flags…",
    "Calculating the probability of regret…",
    "Checking if your ex is nearby…",
  ];

  const QUICK_REPLIES = [
    "Where are you?",
    "Why is the ETA increasing?",
    "I want to cancel.",
    "Did you see my ex?",
    "Please hurry.",
  ];

  const SCREENS = [
    "splash",
    "relationship",
    "terms",
    "menu",
    "cart",
    "tracking",
    "reveal",
    "complaint",
    "receipt",
  ];

  const DRAMATIC = new Set(["splash", "tracking", "reveal"]);

  function createInitialState() {
    return {
      screen: "splash",
      relationshipOption: null,
      enteredName: "",
      termsNoted: false,
      catalog: CATALOG.map((p) => ({ ...p })),
      customProducts: [],
      cart: {},
      couponCode: "",
      couponStatus: null,
      couponMessage: "",
      tip: 50,
      checkoutLocked: false,
      lockedTip: null,
      lockedCart: null,
      lockedBaseStops: null,
      lockedExtraStops: 0,
      orderId: "",
      orderAt: null,
      completedStops: 0,
      trackingStarted: false,
      autoTracking: false,
      fakeCallShown: false,
      fakeCallOpen: false,
      cancellationAttempts: 0,
      cancellationPenalty: 0,
      penaltyApplied: false,
      chatHistory: [],
      chatPending: false,
      deliveryOutcome: null,
      complaintReason: "",
      complaintSubmitted: false,
      refundDone: false,
      riderReview: "",
      filter: "All",
      splashDone: false,
    };
  }

  let state = createInitialState();
  let splashTimer = null;
  let trackTimer = null;
  let refundTimer = null;
  let refundPause = null;
  let callKeyHandler = null;
  let callLastFocus = null;

  const $ = (id) => document.getElementById(id);

  function toast(message) {
    const region = $("toasts");
    const el = document.createElement("div");
    el.className = "toast";
    el.textContent = message;
    region.appendChild(el);
    setTimeout(() => el.remove(), 4200);
  }

  function formatINR(n) {
    const value = Number(n) || 0;
    const rounded = Math.round(value * 100) / 100;
    return "₹" + rounded.toLocaleString("en-IN", { maximumFractionDigits: 2 });
  }

  function riderMood(tip) {
    if (tip < 20) return "furious";
    if (tip < 100) return "neutral";
    return "smug";
  }

  function moodCopy(mood) {
    if (mood === "furious") return "Rider mood: furious. Two scenic grudges added to the route.";
    if (mood === "smug") return "Rider mood: smug. The tip bought commentary, not speed.";
    return "Rider mood: professionally unbothered.";
  }

  function displayName() {
    const raw = (state.enteredName || "").trim();
    if (state.relationshipOption === "ex") return raw;
    return raw || FALLBACK_SOULMATE;
  }

  function effectiveTip() {
    if (state.checkoutLocked && state.lockedTip != null) return Number(state.lockedTip) || 0;
    return Number(state.tip) || 0;
  }

  function activeCart() {
    if (state.checkoutLocked && state.lockedCart) return state.lockedCart;
    return state.cart;
  }

  function allProducts() {
    return state.catalog.concat(state.customProducts);
  }

  function findProduct(id) {
    return allProducts().find((p) => p.id === id);
  }

  function cartLines() {
    return Object.entries(activeCart())
      .map(([id, qty]) => {
        const product = findProduct(id);
        if (!product || qty < 1) return null;
        return {
          id,
          name: product.name,
          qty,
          unit: product.price,
          lineTotal: product.price * qty,
        };
      })
      .filter(Boolean);
  }

  function cartQty() {
    return cartLines().reduce((sum, line) => sum + line.qty, 0);
  }

  function subtotal() {
    return cartLines().reduce((sum, line) => sum + line.lineTotal, 0);
  }

  function couponDiscountAmount() {
    if (state.couponStatus !== "valid") return 0;
    return Math.round(subtotal() * 0.5 * 100) / 100;
  }

  function pricing() {
    const sub = subtotal();
    const discount = couponDiscountAmount();
    const delivery = sub > 0 ? DELIVERY_FEE : 0;
    const baggage = sub > 0 ? (state.relationshipOption === "ex" ? EX_BAGGAGE_FEE : NEVER_BAGGAGE_FEE) : 0;
    const surge = sub > 0 ? SURGE_FEE : 0;
    const tip = effectiveTip();
    const penalty = Number(state.cancellationPenalty) || 0;
    const total = Math.round((sub - discount + delivery + baggage + surge + tip + penalty) * 100) / 100;
    return { sub, discount, delivery, baggage, surge, tip, penalty, total };
  }

  function extraStops() {
    if (state.checkoutLocked && state.lockedExtraStops != null) {
      return Number(state.lockedExtraStops) || 0;
    }
    return riderMood(effectiveTip()) === "furious" ? 2 : 0;
  }

  function stopStats() {
    const base = state.checkoutLocked && state.lockedBaseStops != null
      ? Number(state.lockedBaseStops)
      : cartQty();
    const extra = extraStops();
    const total = Math.max(0, base + extra);
    const completed = Math.min(state.completedStops, total);
    const remaining = Math.max(0, total - completed);
    return { base, extra, total, completed, remaining };
  }

  function etaMinutes() {
    return stopStats().remaining * MINUTES_PER_STOP;
  }

  function setScreen(name) {
    if (!SCREENS.includes(name)) return;
    if (name !== "tracking") stopTrackingLoop();
    state.screen = name;
    document.body.dataset.mood = DRAMATIC.has(name) ? "dramatic" : "calm";
    document.querySelectorAll(".screen").forEach((el) => {
      const on = el.dataset.screen === name;
      el.classList.toggle("active", on);
      el.hidden = !on;
    });
    const chip = $("cartChip");
    chip.hidden = !(name === "menu" || name === "cart");
    render();
    if (name === "tracking") startTracking();
    if (name === "receipt") loadReview();
  }

  function resetOrder() {
    stopTrackingLoop();
    if (refundTimer) {
      clearInterval(refundTimer);
      refundTimer = null;
    }
    if (refundPause) {
      clearTimeout(refundPause);
      refundPause = null;
    }
    document.querySelectorAll(".choice-card[data-option]").forEach((btn) => {
      btn.setAttribute("aria-pressed", "false");
    });
    state = createInitialState();
    $("personName").value = "";
    $("customPrompt").value = "";
    $("couponInput").value = "";
    $("chatInput").value = "";
    $("tipSlider").value = "50";
    $("refundStage").hidden = true;
    $("refundPunch").hidden = true;
    $("splashDone").hidden = true;
    $("startBtn").disabled = true;
    $("callModal").hidden = true;
    $("nameField").hidden = true;
    $("refundBar").style.width = "0%";
    $("refundPct").textContent = "0%";
    if ($("autoTrack")) $("autoTrack").checked = false;
    closeCallModal();
    runSplash();
    setScreen("splash");
  }

  function applyCoupon() {
    const code = ($("couponInput").value || "").trim().toUpperCase();
    if (!code) {
      state.couponMessage = "Enter a coupon code first.";
      state.couponStatus = "empty";
      renderCart();
      return;
    }
    if (code === "SINGLE50") {
      state.couponCode = code;
      state.couponStatus = "valid";
      state.couponMessage = "SINGLE50 applied. Half the romance, half the subtotal.";
    } else if (code === "MOVEON") {
      state.couponCode = code;
      state.couponStatus = "expired";
      state.couponMessage = "MOVEON expired in 2022. Moving on remains a premium feature.";
    } else {
      state.couponCode = code;
      state.couponStatus = "invalid";
      state.couponMessage = "That coupon is as real as a 24-hour reply.";
    }
    renderCart();
  }

  function removeCoupon() {
    state.couponCode = "";
    state.couponStatus = null;
    state.couponMessage = "Coupon removed.";
    $("couponInput").value = "";
    renderCart();
  }

  function addToCart(id) {
    const product = findProduct(id);
    if (!product || !product.inStock) {
      toast("That item is emotionally unavailable.");
      return;
    }
    const current = state.cart[id] || 0;
    if (current >= 9) {
      toast("Warehouse refuses to enable your nine-copy fantasy.");
      return;
    }
    state.cart[id] = current + 1;
    render();
    toast("Added to cart. Commitment pending.");
  }

  function changeQty(id, delta) {
    const product = findProduct(id);
    if (!product || !product.inStock) return;
    const next = (state.cart[id] || 0) + delta;
    if (next <= 0) delete state.cart[id];
    else state.cart[id] = Math.min(9, next);
    render();
  }

  function checkpointsFor(total) {
    const name = displayName();
    const pool =
      state.relationshipOption === "ex"
        ? [
            "Restaurant of Questionable Decisions",
            "Gym Mirror",
            `The Street We Should Not Have Visited with ${name}`,
            "Emotional Support Station",
            "Five-Minute Detour",
            `${name}'s Block (do not stop, we will stop)`,
            "Final Delivery Location",
          ]
        : [
            "Restaurant of Questionable Decisions",
            "Gym Mirror",
            "The Street We Should Not Have Visited",
            "Emotional Support Station",
            "Unmapped Soulmate Zone",
            "Five-Minute Detour",
            "Final Delivery Location",
          ];
    const list = [];
    for (let i = 0; i < total; i += 1) {
      list.push(pool[i] || `Improvised stop ${i + 1}`);
    }
    if (total > 0) list[total - 1] = "Final Delivery Location";
    return list;
  }

  function localChatReply(message) {
    const mood = riderMood(effectiveTip());
    const name = displayName();
    const { remaining, completed } = stopStats();
    const text = (message || "").toLowerCase();
    if (text.includes("cancel")) {
      return "Cancel? I already accepted the order emotionally. That's binding in three zip codes.";
    }
    if (text.includes("eta") || text.includes("increasing")) {
      return `ETA is a suggestion. I have ${remaining} poetic detours left and a playlist to finish.`;
    }
    if (text.includes("ex")) {
      if (state.relationshipOption === "ex") {
        return `I have not seen ${name}. I also have not not seen ${name}. Traffic is complicated.`;
      }
      return "I don't do exes. I do left turns and poorly timed honesty.";
    }
    if (text.includes("where")) {
      return `Currently at stop ${completed}. If the map looks lost, that's a feature.`;
    }
    if (text.includes("hurry")) {
      if (mood === "furious") return "Hurry? For that tip I am sightseeing through every unresolved alley.";
      if (mood === "smug") return "Relax. Premium tippers get premium dawdling. I am thriving.";
      return "I am hurrying in spirit. The scooter is negotiating with a roundabout.";
    }
    if (mood === "furious") return "Noted. Added to the pile of things I am ignoring professionally.";
    if (mood === "smug") return "Thanks for the gold-star tip. I may arrive. I may also narrate the sunset first.";
    return "Copy that. Package is a vibe. Do not open until I invent a doorbell.";
  }

  function localReview() {
    const p = pricing();
    const lines = cartLines().map((l) => l.name);
    const goods = lines.slice(0, 3).join(", ") || "an empty kind of hope";
    if (state.relationshipOption === "ex") {
      return `You ordered a fresh start, received ${displayName()}, and still paid ${formatINR(p.total)}. You mashed cancel ${state.cancellationAttempts} time(s)${state.cancellationPenalty ? ` and unlocked a ${formatINR(state.cancellationPenalty)} fee` : ""}. Tip ${formatINR(effectiveTip())} made the rider ${riderMood(effectiveTip())}. Cart energy: ${goods}. Complaint: ${state.complaintReason || "unspecified"}. Refund: one virtual hug, ₹0. Would deliver disappointment again.`;
    }
    return `You ordered ${displayName()}, who does not exist, then complained when the box arrived conceptually. Tip ${formatINR(effectiveTip())} / rider ${riderMood(effectiveTip())}. Cancel attempts: ${state.cancellationAttempts}. Items: ${goods}. Complaint: ${state.complaintReason || "empty air"}. The soulmate may be imaginary, but the handling fee is very real.`;
  }

  function el(tag, attrs, text) {
    const node = document.createElement(tag);
    if (attrs) {
      Object.entries(attrs).forEach(([k, v]) => {
        if (v === false || v == null) return;
        if (k === "class") node.className = v;
        else node.setAttribute(k, String(v));
      });
    }
    if (text != null) node.textContent = text;
    return node;
  }

  function renderCartCount() {
    $("cartCount").textContent = String(cartQty());
  }

  function renderProducts() {
    const grid = $("productGrid");
    const filters = $("filters");
    if (!grid || !filters) return;
    const cats = ["All", ...new Set(allProducts().map((p) => p.category))];
    filters.replaceChildren();
    cats.forEach((cat) => {
      const btn = el("button", { class: "filter-btn" + (state.filter === cat ? " active" : ""), type: "button" }, cat);
      btn.addEventListener("click", () => {
        state.filter = cat;
        renderProducts();
      });
      filters.appendChild(btn);
    });
    grid.replaceChildren();
    allProducts()
      .filter((p) => state.filter === "All" || p.category === state.filter)
      .forEach((p) => {
        const card = el("article", { class: "product glass" });
        card.style.setProperty("--accent", p.accent || "#b9a0ff");
        card.appendChild(el("p", { class: "kicker" }, p.category));
        card.appendChild(el("h3", null, p.name));
        card.appendChild(el("p", { class: "muted" }, p.description));
        card.appendChild(el("p", { class: "price" }, formatINR(p.price)));
        if (!p.inStock) {
          card.appendChild(el("p", { class: "oos" }, "OUT OF STOCK"));
          const dead = el("button", { class: "btn btn-ghost", type: "button", disabled: true }, "Unavailable");
          card.appendChild(dead);
        } else {
          const qtyWrap = el("div", { class: "qty" });
          const minus = el("button", { type: "button", "aria-label": "Decrease" }, "−");
          const count = el("span", null, String(state.cart[p.id] || 0));
          const plus = el("button", { type: "button", "aria-label": "Increase" }, "+");
          minus.addEventListener("click", () => changeQty(p.id, -1));
          plus.addEventListener("click", () => addToCart(p.id));
          qtyWrap.append(minus, count, plus);
          card.appendChild(qtyWrap);
        }
        grid.appendChild(card);
      });
  }

  function renderTotals(target) {
    const p = pricing();
    const stops = stopStats();
    target.replaceChildren();
    const rows = [
      ["Subtotal", formatINR(p.sub)],
      ["Delivery fee", formatINR(p.delivery)],
      ["Emotional-baggage fee", formatINR(p.baggage)],
      ["Surge-pricing fee", formatINR(p.surge)],
      ["Coupon discount", p.discount ? "−" + formatINR(p.discount) : formatINR(0)],
      ["Tip", formatINR(p.tip)],
    ];
    if (p.penalty) rows.push(["Cancellation penalty", formatINR(p.penalty)]);
    rows.forEach(([k, v]) => {
      const line = el("p");
      line.append(el("span", null, k), el("span", null, v));
      target.appendChild(line);
    });
    const grand = el("p", { class: "grand" });
    grand.append(el("span", null, "Total"), el("span", null, formatINR(p.total)));
    target.appendChild(grand);
    target.appendChild(el("p", { class: "muted" }, `Base stops ${stops.base} · extra ${stops.extra} · total ${stops.total}`));
  }

  function renderCart() {
    const wrap = $("cartLines");
    if (!wrap) return;
    wrap.replaceChildren();
    const lines = cartLines();
    if (!lines.length) {
      wrap.appendChild(el("p", { class: "muted" }, "Cart is empty. Romance refuses to ship itself."));
    } else {
      lines.forEach((line) => {
        const row = el("div", { class: "line" });
        const left = el("div");
        left.appendChild(el("strong", null, line.name));
        left.appendChild(el("p", { class: "muted" }, `${line.qty} × ${formatINR(line.unit)}`));
        row.append(left, el("strong", null, formatINR(line.lineTotal)));
        wrap.appendChild(row);
      });
    }
    $("couponMsg").textContent = state.couponMessage;
    $("tipReadout").textContent = `Tip: ${formatINR(effectiveTip())} — below ₹20 the rider becomes furious and adds two stops. ₹20–₹99.99: neutral. ₹100+: smug.`;
    $("moodPill").textContent = moodCopy(riderMood(effectiveTip()));
    renderTotals($("cartTotals"));
    $("checkoutBtn").disabled = lines.length === 0;
  }

  function placeRider() {
    const path = $("deliveryPath");
    const rider = $("riderMark");
    if (!path || !rider) return;
    const { completed, total } = stopStats();
    const t = total === 0 ? 0 : completed / total;
    const len = path.getTotalLength();
    const pt = path.getPointAtLength(len * t);
    rider.setAttribute("transform", `translate(${pt.x} ${pt.y})`);
    $("trackProgress").style.width = `${Math.round(t * 100)}%`;
  }

  function renderTracking() {
    const stops = stopStats();
    $("stopNow").textContent = String(stops.completed);
    $("stopTotal").textContent = String(stops.total);
    $("etaReadout").textContent = stops.remaining === 0 ? "Arrived (sort of)" : `${etaMinutes()} min`;
    $("trackMood").textContent = moodCopy(riderMood(effectiveTip()));
    const tl = $("timeline");
    tl.replaceChildren();
    checkpointsFor(stops.total).forEach((label, i) => {
      const item = el("li", null, `${i < stops.completed ? "Done" : i === stops.completed ? "Now" : "Queued"} — ${label}`);
      tl.appendChild(item);
    });
    const log = $("chatLog");
    log.replaceChildren();
    state.chatHistory.forEach((msg) => {
      log.appendChild(el("div", { class: "bubble" + (msg.from === "me" ? " me" : "") }, msg.text));
    });
    log.scrollTop = log.scrollHeight;
    placeRider();
    $("nextStop").disabled = stops.remaining === 0 || state.fakeCallOpen;
  }

  function svgNode(tag, attrs) {
    const node = document.createElementNS("http://www.w3.org/2000/svg", tag);
    Object.entries(attrs || {}).forEach(([k, v]) => node.setAttribute(k, String(v)));
    return node;
  }

  function exParcelArt(name) {
    const svg = svgNode("svg", { viewBox: "0 0 280 180", role: "img", "aria-label": "Wrong parcel delivered" });
    svg.appendChild(svgNode("rect", { x: "70", y: "48", width: "140", height: "100", rx: "10", fill: "#3a2248", stroke: "#b9a0ff", "stroke-width": "2" }));
    svg.appendChild(svgNode("path", { d: "M70 78h140", stroke: "#ff6482", "stroke-width": "8" }));
    svg.appendChild(svgNode("path", { d: "M140 48v100", stroke: "#ff6482", "stroke-width": "6" }));
    svg.appendChild(svgNode("rect", { x: "96", y: "92", width: "88", height: "36", rx: "6", fill: "#fff7fb" }));
    const label = svgNode("text", { x: "140", y: "115", "text-anchor": "middle", fill: "#100b18", "font-size": "13", "font-family": "Georgia, serif" });
    label.textContent = name.slice(0, 16);
    svg.appendChild(label);
    svg.appendChild(svgNode("path", { d: "M54 40c12-18 32-18 36 0 4-18 24-18 36 0", fill: "none", stroke: "#ff4fb8", "stroke-width": "2" }));
    const stamp = svgNode("text", { x: "140", y: "36", "text-anchor": "middle", fill: "#d6ff78", "font-size": "11", "letter-spacing": "1.5" });
    stamp.textContent = "DO NOT DELIVER";
    svg.appendChild(stamp);
    return svg;
  }

  function emptyBoxArt() {
    const svg = svgNode("svg", { viewBox: "0 0 280 180", role: "img", "aria-label": "Empty delivery box" });
    svg.appendChild(svgNode("path", { d: "M70 78l70-28 70 28v70l-70 28-70-28z", fill: "#1a1126", stroke: "#b9a0ff", "stroke-width": "2", "stroke-dasharray": "6 5" }));
    svg.appendChild(svgNode("path", { d: "M70 78l70 28 70-28", fill: "none", stroke: "#ff6482", "stroke-width": "2" }));
    svg.appendChild(svgNode("path", { d: "M140 106v70", stroke: "#b9a0ff", "stroke-width": "1.5" }));
    svg.appendChild(svgNode("circle", { cx: "140", cy: "90", r: "18", fill: "none", stroke: "#d6ff78", "stroke-dasharray": "3 3" }));
    const voidLabel = svgNode("text", { x: "140", y: "168", "text-anchor": "middle", fill: "#b9adc5", "font-size": "11" });
    voidLabel.textContent = "contents: nobody";
    svg.appendChild(voidLabel);
    return svg;
  }

  function renderReveal() {
    const art = $("revealArt");
    art.replaceChildren();
    const name = displayName();
    if (state.relationshipOption === "ex") {
      art.appendChild(exParcelArt(name));
      $("revealTitle").textContent = "DELIVERY COMPLETE!";
      $("revealLead").textContent = `You ordered a fresh start. We delivered ${name}.`;
      $("revealSub").textContent = `You specifically told us NOT to deliver ${name}. We interpreted that as a priority instruction.`;
    } else {
      art.appendChild(emptyBoxArt());
      $("revealTitle").textContent = "YOUR SOULMATE IS OUT OF STOCK.";
      $("revealLead").textContent = "We delivered the space they would have occupied.";
      $("revealSub").textContent = `${name} could not be located on our map. A handling fee still applies.`;
    }
  }

  function renderComplaint() {
    const box = $("complaintChoices");
    const name = displayName();
    $("complaintContext").textContent =
      state.relationshipOption === "ex"
        ? `You received ${name} instead of a fresh start.`
        : `You received an empty box in place of ${name}.`;
    const options =
      state.relationshipOption === "ex"
        ? [
            "Wrong person delivered.",
            "Ordered commitment, received confusion.",
            "Empty box of a fresh start.",
            `Instructions ignored — you said not to send ${name}.`,
            "Other.",
          ]
        : [
            "Wrong person delivered (a conceptual void).",
            "Ordered commitment, received confusion.",
            "Empty box.",
            `Instructions ignored — ${name} was supposed to exist.`,
            "Other.",
          ];
    box.replaceChildren();
    options.forEach((label) => {
      const btn = el("button", {
        class: "choice-card",
        type: "button",
        "aria-pressed": state.complaintReason === label ? "true" : "false",
      }, label);
      btn.addEventListener("click", () => {
        if (state.complaintSubmitted) return;
        state.complaintReason = label;
        renderComplaint();
      });
      box.appendChild(btn);
    });
    $("submitComplaint").disabled = state.complaintSubmitted;
  }

  function renderReceipt() {
    const p = pricing();
    const stops = stopStats();
    $("receiptMeta").textContent = `${state.orderId} · ${state.orderAt || ""}`;
    const body = $("receiptBody");
    body.replaceChildren();
    const add = (k, v) => {
      const row = el("p");
      row.append(el("span", null, k), el("strong", null, v));
      row.style.display = "flex";
      row.style.justifyContent = "space-between";
      row.style.gap = "1rem";
      body.appendChild(row);
    };
    add("Path", state.relationshipOption === "ex" ? "I have an ex" : "I've never dated anyone");
    add("Named person", displayName());
    cartLines().forEach((line) => add(`${line.name} × ${line.qty}`, formatINR(line.lineTotal)));
    add("Subtotal", formatINR(p.sub));
    add("Delivery fee", formatINR(p.delivery));
    add("Emotional-baggage fee", formatINR(p.baggage));
    add("Surge fee", formatINR(p.surge));
    add("Coupon", state.couponStatus === "valid" ? `${state.couponCode} (−${formatINR(p.discount)})` : state.couponCode || "None");
    add("Tip", formatINR(p.tip));
    add("Rider mood", riderMood(effectiveTip()));
    add("Base delivery stops", String(stops.base));
    add("Extra stops (furious rider)", String(stops.extra));
    add("Actual total stops", String(stops.total));
    add("Cancellation attempts", String(state.cancellationAttempts));
    add("Cancellation penalty", formatINR(p.penalty));
    add(
      "Delivered outcome",
      state.relationshipOption === "ex" ? `Wrong delivery: ${displayName()}` : `Empty box / ${displayName()} unavailable`
    );
    add("Complaint reason", state.complaintReason || "—");
    add("Refund status", "Processed as virtual hug");
    add("Monetary refund", formatINR(0));
    add("Final amount charged", formatINR(p.total));
    $("receiptReview").textContent = state.riderReview || "Generating rider review…";
  }

  function render() {
    renderCartCount();
    if (state.screen === "menu") renderProducts();
    if (state.screen === "cart") renderCart();
    if (state.screen === "tracking") renderTracking();
    if (state.screen === "reveal") renderReveal();
    if (state.screen === "complaint") renderComplaint();
    if (state.screen === "receipt") renderReceipt();
  }

  function runSplash() {
    if (splashTimer) clearInterval(splashTimer);
    let i = 0;
    $("splashStatus").textContent = SPLASH_LINES[0];
    $("splashBar").style.width = "12%";
    splashTimer = setInterval(() => {
      i += 1;
      if (i < SPLASH_LINES.length) {
        $("splashStatus").textContent = SPLASH_LINES[i];
        $("splashBar").style.width = `${12 + i * 18}%`;
      } else {
        clearInterval(splashTimer);
        splashTimer = null;
        $("splashBar").style.width = "100%";
        $("splashDone").hidden = false;
        $("startBtn").disabled = false;
        state.splashDone = true;
      }
    }, 700);
    setTimeout(() => {
      if (!$("startBtn").disabled) return;
      if (splashTimer) clearInterval(splashTimer);
      $("splashDone").hidden = false;
      $("startBtn").disabled = false;
      state.splashDone = true;
    }, 6000);
  }

  function completeDelivery() {
    stopTrackingLoop();
    state.autoTracking = false;
    if ($("autoTrack")) $("autoTrack").checked = false;
    state.completedStops = stopStats().total;
    closeCallModal();
    if (state.relationshipOption === "ex") {
      state.deliveryOutcome = `Delivered ${displayName()} instead of a fresh start`;
    } else {
      state.deliveryOutcome = `${displayName()} unavailable; empty box delivered`;
    }
    setScreen("reveal");
  }

  function closeCallModal() {
    state.fakeCallOpen = false;
    const modal = $("callModal");
    if (modal) modal.hidden = true;
    if (callKeyHandler) {
      document.removeEventListener("keydown", callKeyHandler);
      callKeyHandler = null;
    }
    if (callLastFocus && typeof callLastFocus.focus === "function") {
      callLastFocus.focus();
    }
    callLastFocus = null;
  }

  function openCallModal() {
    const modal = $("callModal");
    callLastFocus = document.activeElement;
    state.fakeCallOpen = true;
    modal.hidden = false;
    const buttons = [ $("acceptCall"), $("declineCall") ].filter(Boolean);
    $("acceptCall").focus();
    callKeyHandler = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        dismissCall("Declined. The rider took it personally and named a roundabout after you.");
        return;
      }
      if (event.key !== "Tab" || !buttons.length) return;
      const first = buttons[0];
      const last = buttons[buttons.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", callKeyHandler);
  }

  function maybeFakeCall() {
    if (state.fakeCallShown || state.completedStops !== 2) return false;
    state.fakeCallShown = true;
    openCallModal();
    renderTracking();
    return true;
  }

  function dismissCall(message) {
    closeCallModal();
    toast(message);
    if (stopStats().remaining <= 0) {
      completeDelivery();
      return;
    }
    renderTracking();
    if (state.autoTracking) startAutoAdvance();
  }

  function advanceStop() {
    if (state.fakeCallOpen) return;
    const stops = stopStats();
    if (stops.remaining <= 0) {
      completeDelivery();
      return;
    }
    state.completedStops += 1;
    if (maybeFakeCall()) return;
    if (state.completedStops >= stopStats().total) {
      completeDelivery();
      return;
    }
    renderTracking();
  }

  function startAutoAdvance() {
    stopTrackingLoop();
    if (!state.autoTracking || state.screen !== "tracking") return;
    trackTimer = setInterval(() => {
      if (state.screen !== "tracking" || state.fakeCallOpen || !state.autoTracking) return;
      if (stopStats().remaining <= 0) {
        completeDelivery();
        return;
      }
      advanceStop();
    }, AUTO_TRACK_MS);
  }

  function startTracking() {
    if (!state.trackingStarted) {
      state.trackingStarted = true;
      state.completedStops = 0;
      state.autoTracking = false;
      if ($("autoTrack")) $("autoTrack").checked = false;
      state.chatHistory = [
        {
          from: "rider",
          text: "Hi it's your Situaship rider. I have the package and several opinions. Use Advance to Next Stop — I am not in a hurry unless you enable slow auto-advance.",
        },
      ];
    }
    stopTrackingLoop();
    if (state.autoTracking) startAutoAdvance();
    renderTracking();
  }

  function stopTrackingLoop() {
    if (trackTimer) {
      clearInterval(trackTimer);
      trackTimer = null;
    }
  }

  function handleCancel() {
    const result = window.SituashipOrderRules.applyCancellationAttempt(
      state.cancellationAttempts,
      state.completedStops,
      state.penaltyApplied
    );
    state.cancellationAttempts = result.attempts;
    state.penaltyApplied = result.penaltyApplied;
    state.cancellationPenalty += result.penaltyAdded;
    state.completedStops = result.completedStops;
    toast(result.message);
    if (result.penaltyAdded) renderTracking();
  }

  async function postJSON(url, payload) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(data.error || "Request failed");
      err.data = data;
      throw err;
    }
    return data;
  }

  async function generateCustom() {
    const prompt = ($("customPrompt").value || "").trim();
    if (prompt.length < 8) {
      toast("Give the warehouse a slightly longer fantasy.");
      return;
    }
    const btn = $("customBtn");
    btn.disabled = true;
    $("customSkeleton").hidden = false;
    try {
      const data = await postJSON("/api/custom-item", { prompt });
      const item = data.item || {};
      const name = String(item.name || "").replace(/<[^>]+>/g, "").slice(0, 48);
      const description = String(item.description || "").replace(/<[^>]+>/g, "").slice(0, 180);
      let price = Number(item.price);
      if (!Number.isFinite(price)) price = 299;
      price = Math.max(CUSTOM_PRICE_MIN, Math.min(CUSTOM_PRICE_MAX, Math.round(price)));
      if (!name || !description) throw new Error("bad item");
      const custom = {
        id: "custom-" + Date.now(),
        name,
        description,
        price,
        category: String(item.category || "Custom Order").slice(0, 32),
        inStock: true,
        accent: "#d6ff78",
      };
      state.customProducts.push(custom);
      state.cart[custom.id] = (state.cart[custom.id] || 0) + 1;
      toast(data.fallback ? "Custom SKU invented locally. Groq was napping." : "Groq invented a new SKU. It's in your cart.");
      render();
    } catch (err) {
      toast(err.message || "Could not invent that SKU. Try a slightly longer description.");
    } finally {
      btn.disabled = false;
      $("customSkeleton").hidden = true;
    }
  }

  async function sendChat(text) {
    const message = (text || $("chatInput").value || "").trim();
    if (message.length < 2 || state.chatPending) return;
    state.chatPending = true;
    state.chatHistory.push({ from: "me", text: message });
    $("chatInput").value = "";
    $("sendChat").disabled = true;
    renderTracking();
    const context = {
      relationshipOption: state.relationshipOption,
      enteredName: displayName(),
      products: cartLines().map((l) => l.name),
      currentStop: stopStats().completed,
      remainingStops: stopStats().remaining,
      tip: effectiveTip(),
      riderMood: riderMood(effectiveTip()),
      cancellationAttempts: state.cancellationAttempts,
    };
    let reply = localChatReply(message);
    try {
      const data = await postJSON("/api/chat", { message, context });
      if (data.reply) reply = String(data.reply).replace(/<[^>]+>/g, "").slice(0, 280);
    } catch (_err) {
      /* local reply already set */
    }
    state.chatHistory.push({ from: "rider", text: reply });
    state.chatPending = false;
    $("sendChat").disabled = false;
    renderTracking();
  }

  async function loadReview() {
    if (state.riderReview) {
      renderReceipt();
      return;
    }
    const context = {
      relationshipOption: state.relationshipOption,
      enteredName: displayName(),
      products: cartLines().map((l) => l.name),
      tip: effectiveTip(),
      riderMood: riderMood(effectiveTip()),
      cancellationAttempts: state.cancellationAttempts,
      cancellationPenalty: state.cancellationPenalty,
      deliveryOutcome: state.deliveryOutcome,
      complaintReason: state.complaintReason,
      refundResult: "virtual hug worth ₹0",
    };
    state.riderReview = localReview();
    renderReceipt();
    try {
      const data = await postJSON("/api/review", { context });
      if (data.review) {
        state.riderReview = String(data.review).replace(/<[^>]+>/g, "").slice(0, 420);
        renderReceipt();
      }
    } catch (_err) {
      /* keep fallback */
    }
  }

  function runRefund() {
    if (state.complaintSubmitted) return;
    if (!state.complaintReason) {
      toast("Pick a complaint. We need a category for the hug.");
      return;
    }
    state.complaintSubmitted = true;
    $("submitComplaint").disabled = true;
    $("refundStage").hidden = false;
    let pct = 0;
    if (refundTimer) clearInterval(refundTimer);
    if (refundPause) clearTimeout(refundPause);
    refundTimer = setInterval(() => {
      pct += 7;
      if (pct >= 99) {
        pct = 99;
        $("refundBar").style.width = "99%";
        $("refundPct").textContent = "99%";
        clearInterval(refundTimer);
        refundTimer = null;
        refundPause = setTimeout(() => {
          $("refundPunch").hidden = false;
          state.refundDone = true;
        }, 700);
        return;
      }
      $("refundBar").style.width = `${pct}%`;
      $("refundPct").textContent = `${pct}%`;
    }, 80);
  }

  function bind() {
    $("startBtn").addEventListener("click", () => setScreen("relationship"));
    $("cartChip").addEventListener("click", () => {
      if (state.checkoutLocked) return;
      if (state.screen === "menu") setScreen("cart");
      else if (state.screen === "cart") setScreen("menu");
    });
    document.querySelectorAll(".choice-card[data-option]").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.relationshipOption = btn.dataset.option;
        document.querySelectorAll(".choice-card[data-option]").forEach((other) => {
          other.setAttribute("aria-pressed", other === btn ? "true" : "false");
        });
        const field = $("nameField");
        field.hidden = false;
        $("nameLabel").textContent =
          state.relationshipOption === "ex" ? "Enter your ex's name" : "Name your imaginary soulmate";
        $("personName").placeholder =
          state.relationshipOption === "ex" ? "e.g. Rahul" : "My Imaginary Soulmate";
        $("nameError").hidden = true;
      });
    });
    $("relContinue").addEventListener("click", () => {
      if (!state.relationshipOption) {
        toast("Choose a path. Ambiguity is later, as a fee.");
        return;
      }
      const value = ($("personName").value || "").trim();
      if (state.relationshipOption === "ex" && !value) {
        $("nameError").hidden = false;
        $("nameError").textContent = "We need a name so we can deliver the wrong person accurately.";
        return;
      }
      state.enteredName = value;
      $("nameError").hidden = true;
      setScreen("terms");
    });
    $("acceptTerms").addEventListener("click", () => {
      state.termsNoted = true;
      setScreen("menu");
    });
    $("declineTerms").addEventListener("click", () => {
      state.termsNoted = true;
      toast("Your preference has been noted and immediately disregarded.");
      $("acceptTerms").setAttribute("aria-pressed", "true");
      setTimeout(() => setScreen("menu"), 700);
    });
    $("customBtn").addEventListener("click", generateCustom);
    $("toCart").addEventListener("click", () => {
      if (!cartQty()) {
        toast("Add something available first. Empty carts cannot be disappointed.");
        return;
      }
      setScreen("cart");
    });
    $("backMenu").addEventListener("click", () => setScreen("menu"));
    $("applyCoupon").addEventListener("click", applyCoupon);
    $("removeCoupon").addEventListener("click", removeCoupon);
    $("tipSlider").addEventListener("input", (e) => {
      if (state.checkoutLocked) return;
      state.tip = Number(e.target.value);
      renderCart();
    });
    $("checkoutBtn").addEventListener("click", () => {
      if (!cartQty()) {
        toast("Empty cart checkout is blocked. Even we have standards.");
        return;
      }
      state.checkoutLocked = true;
      state.lockedTip = Number(state.tip) || 0;
      state.lockedCart = { ...state.cart };
      state.lockedBaseStops = cartQty();
      state.lockedExtraStops = riderMood(state.lockedTip) === "furious" ? 2 : 0;
      state.orderId = "SITU-" + Math.random().toString(36).slice(2, 8).toUpperCase();
      state.orderAt = new Date().toLocaleString("en-IN");
      setScreen("tracking");
    });
    $("nextStop").addEventListener("click", advanceStop);
    $("autoTrack").addEventListener("change", (e) => {
      state.autoTracking = Boolean(e.target.checked);
      if (state.autoTracking) {
        toast("Slow auto-advance on. You still have time to cancel and take the call.");
        handleCancel();
        startAutoAdvance();
      } else {
        stopTrackingLoop();
      }
    });
    $("cancelBtn").addEventListener("click", handleCancel);
    QUICK_REPLIES.forEach((label) => {
      const btn = el("button", { type: "button" }, label);
      btn.addEventListener("click", () => sendChat(label));
      $("quickReplies").appendChild(btn);
    });
    $("sendChat").addEventListener("click", () => sendChat());
    $("chatInput").addEventListener("keydown", (e) => {
      if (e.key === "Enter") sendChat();
    });
    $("acceptCall").addEventListener("click", () => {
      dismissCall("You accepted. It was a pocket dial about the package's 'energy'.");
    });
    $("declineCall").addEventListener("click", () => {
      dismissCall("Declined. The rider took it personally and named a roundabout after you.");
    });
    $("toComplaint").addEventListener("click", () => setScreen("complaint"));
    $("submitComplaint").addEventListener("click", runRefund);
    $("toReceipt").addEventListener("click", () => setScreen("receipt"));
    $("downloadReceipt").addEventListener("click", () => window.print());
    $("orderAgain").addEventListener("click", resetOrder);
  }

  async function pingStatus() {
    try {
      const res = await fetch("/api/status");
      const data = await res.json();
      $("groqBadge").textContent = data.groq_configured ? "Groq configured" : "Fallback comedy";
    } catch (_err) {
      $("groqBadge").textContent = "Fallback comedy";
    }
  }

  bind();
  pingStatus();
  runSplash();
})();
