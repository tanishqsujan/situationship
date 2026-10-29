# Situaship

A satirical relationship-delivery web app. You order a dream partner. The logistics department has other plans.

**Tagline:** Your perfect match. Our questionable delivery.

Situaship is a single-page Flask app (HTML, CSS, vanilla JavaScript). It is not a dating product. It is a comedy about treating romance like a delivery SKU.

## Features

- Two journeys: **I have an ex** and **I've never dated anyone**
- Ridiculous terms you cannot actually decline
- Partner menu with stock states, filters, cart quantities, and a custom AI SKU
- Coupons (`SINGLE50`, expired `MOVEON`), tip slider, rider mood
- Fictional SVG tracking map, rider chat, fake incoming call, cancellation gag
- Wrong-delivery reveal, complaint desk, ₹0 virtual-hug refund
- Personalized emotional-damage receipt with print/PDF download
- Order Again resets the entire order
- Groq integration for comedy copy, with deterministic fallbacks

## Project structure

```
app.py                 Flask app and Groq routes
situaship_logic.py     Deterministic pricing, coupons, stops, fallbacks
templates/index.html   Single-page UI
static/css/styles.css  Visual system and animated background
static/js/app.js       Shared order state and all screens
tests/                 Unit tests for logic and Flask routes
requirements.txt
.env.example
```

## Pricing notes (deterministic)

- Delivery fee: ₹49 when the cart is non-empty
- Emotional-baggage fee: ₹88 (ex path) or ₹42 (never-dated path)
- Surge fee: ₹37 when the cart is non-empty
- `SINGLE50`: 50% off **product subtotal only**, never stacked
- Tip below ₹20: rider furious, **exactly two** extra stops
- Tip ₹20–₹99.99: neutral
- Tip ₹100+: smug
- Base stops = sum of purchased quantities
- ETA = remaining stops × 4 minutes
- Sixth cancellation attempt: ₹500 penalty once, rider rolls back one completed stop (never below zero)

AI never calculates totals, discounts, stops, penalties, or refunds.

## Windows setup (CMD)

```bat
cd path\to\situationship
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
python app.py
```

Open http://127.0.0.1:5000

PowerShell activation:

```powershell
.\.venv\Scripts\Activate.ps1
```

## Groq configuration

1. Create an API key in the [Groq Console](https://console.groq.com/keys).
2. Put it only in a local `.env` file (never commit it):

```
GROQ_API_KEY=your_groq_api_key_here
GROQ_MODEL=openai/gpt-oss-120b
```

The backend calls Groq's OpenAI-compatible Chat Completions endpoint:

`POST https://api.groq.com/openai/v1/chat/completions`

Authorization: `Bearer $GROQ_API_KEY`

Default model: `openai/gpt-oss-120b` (override with `GROQ_MODEL`).

The key stays on the server. The browser never sees it.

## Fallback mode

If `GROQ_API_KEY` is missing, billing fails, the request times out, or Groq returns malformed output, the app uses local comedy templates. You can complete both journeys without a key. The header shows **Fallback comedy** or **Groq configured**; that status indicates only that a key is present, not that a live API request has succeeded.

## How to demo both journeys

**Journey A — I have an ex**

1. Start ordering → choose **I have an ex** → enter `Rahul`
2. Accept or decline the terms (decline still continues)
3. Add in-stock items. Try the out-of-stock boyfriend (it should refuse)
4. Optionally generate a custom item
5. Cart: try `MOVEON`, then `SINGLE50`, then a tip under ₹20
6. Track delivery, trigger the fake call at stop 2, mash **Cancel Order** six times
7. Receive Rahul, complain, watch the refund freeze at 99%, open the receipt
8. Download/print, then **Order Again**

**Journey B — I've never dated anyone**

1. Choose that path. Leave the name blank to get **Your Imaginary Soulmate**, or type a custom name
2. Complete checkout with a tip of ₹100 (smug rider, no extra stops)
3. Confirm the empty-box reveal, complaint, receipt, and reset

## Tests

```bat
python -m unittest tests.test_logic tests.test_app
```

## Known limitations

- There is no real payment, real map, or real refund
- Groq quality and availability depend on your Groq account, selected model, and service limits
- Print/PDF uses the browser print dialog (`window.print()`)
- The incoming-call overlay is fictional UI, not a telephony integration
