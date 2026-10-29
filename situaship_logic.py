"""Deterministic Situaship rules used by Flask fallbacks and unit tests.

Pricing, coupons, tips, stops, cancellation, and refunds are never delegated
to the language model. Groq may only write comedy copy.
"""

from __future__ import annotations

import hashlib
import re
from typing import Any

PRICE_MIN = 99
PRICE_MAX = 899
CUSTOM_NAME_MAX = 48
CUSTOM_DESC_MAX = 180
CUSTOM_CATEGORY_MAX = 32
CHAT_MAX = 280
PROMPT_MAX = 400
REVIEW_MAX = 420

DELIVERY_FEE = 49
SURGE_FEE = 37
EX_BAGGAGE_FEE = 88
NEVER_BAGGAGE_FEE = 42
CANCELLATION_PENALTY = 500
MINUTES_PER_STOP = 4

COUPON_SINGLE50 = "SINGLE50"
COUPON_MOVEON = "MOVEON"


def clamp_price(value: Any) -> int:
    try:
        n = int(round(float(value)))
    except (TypeError, ValueError):
        n = 299
    return max(PRICE_MIN, min(PRICE_MAX, n))


def sanitize_text(value: Any, fallback: str, max_len: int) -> str:
    if value is None:
        return fallback
    text = str(value)
    text = re.sub(r"<[^>]+>", "", text)
    text = re.sub(r"[\x00-\x1f\x7f]", " ", text)
    text = " ".join(text.split())
    text = text[:max_len].strip()
    return text or fallback


def rider_mood(tip: float) -> str:
    if tip < 20:
        return "furious"
    if tip < 100:
        return "neutral"
    return "smug"


def extra_stops_for_tip(tip: float) -> int:
    return 2 if rider_mood(tip) == "furious" else 0


def total_stops(base_qty: int, tip: float) -> int:
    base = max(0, int(base_qty))
    return base + extra_stops_for_tip(tip)


def eta_minutes(remaining_stops: int) -> int:
    remaining = max(0, int(remaining_stops))
    return remaining * MINUTES_PER_STOP


def apply_coupon(code: str | None) -> dict[str, Any]:
    raw = (code or "").strip().upper()
    if not raw:
        return {"code": "", "status": "empty", "message": "Enter a coupon code first."}
    if raw == COUPON_SINGLE50:
        return {
            "code": raw,
            "status": "valid",
            "message": "SINGLE50 applied. Half the romance, half the subtotal.",
        }
    if raw == COUPON_MOVEON:
        return {
            "code": raw,
            "status": "expired",
            "message": "MOVEON expired in 2022. Moving on remains a premium feature.",
        }
    return {
        "code": raw,
        "status": "invalid",
        "message": "That coupon is as real as a 24-hour reply.",
    }


def coupon_discount(subtotal: float, coupon_status: str | None) -> float:
    if coupon_status == "valid":
        return round(max(0.0, float(subtotal)) * 0.5, 2)
    return 0.0


def baggage_fee(option: str | None, subtotal: float) -> int:
    if float(subtotal) <= 0:
        return 0
    return EX_BAGGAGE_FEE if option == "ex" else NEVER_BAGGAGE_FEE


def pricing_breakdown(
    subtotal: float,
    coupon_status: str | None,
    option: str | None,
    tip: float,
    cancellation_penalty: float,
) -> dict[str, float]:
    subtotal = round(max(0.0, float(subtotal)), 2)
    discount = coupon_discount(subtotal, coupon_status)
    delivery = DELIVERY_FEE if subtotal > 0 else 0
    baggage = baggage_fee(option, subtotal)
    surge = SURGE_FEE if subtotal > 0 else 0
    tip_amt = round(max(0.0, float(tip)), 2)
    penalty = round(max(0.0, float(cancellation_penalty)), 2)
    total = round(subtotal - discount + delivery + baggage + surge + tip_amt + penalty, 2)
    return {
        "subtotal": subtotal,
        "discount": discount,
        "deliveryFee": delivery,
        "emotionalBaggageFee": baggage,
        "surgeFee": surge,
        "tip": tip_amt,
        "cancellationPenalty": penalty,
        "total": total,
    }


def apply_cancellation(
    attempts_before: int,
    completed_stops: int,
    penalty_applied: bool,
) -> dict[str, Any]:
    attempts = int(attempts_before) + 1
    completed = max(0, int(completed_stops))
    if attempts < 6:
        messages = {
            1: "Cancel request received. Our intern is looking for the button.",
            2: "Still delivering. Commitment is easier for us than for you.",
            3: "Cancellation is in another warehouse.",
            4: "The rider says they already left their feelings at your door.",
            5: "We forwarded your cancel request to a group chat that never reads it.",
        }
        return {
            "attempts": attempts,
            "cancelled": False,
            "penaltyAdded": 0,
            "penaltyApplied": False,
            "completedStops": completed,
            "rolledBack": False,
            "message": messages.get(attempts, "Order remains stubbornly active."),
        }

    if not penalty_applied:
        rolled = max(0, completed - 1)
        return {
            "attempts": attempts,
            "cancelled": False,
            "penaltyAdded": CANCELLATION_PENALTY,
            "penaltyApplied": True,
            "completedStops": rolled,
            "rolledBack": rolled < completed,
            "message": "Cancellation failed spectacularly. ₹500 processing fee applied. The rider reversed one street and called it growth.",
        }

    return {
        "attempts": attempts,
        "cancelled": False,
        "penaltyAdded": 0,
        "penaltyApplied": True,
        "completedStops": completed,
        "rolledBack": False,
        "message": "Cancellation was already processed unsuccessfully. The fee stays. The order stays. You stay.",
    }


def fallback_custom_item(prompt: str) -> dict[str, Any]:
    cleaned = sanitize_text(prompt, "someone who replies", PROMPT_MAX)
    digest = hashlib.sha256(cleaned.lower().encode("utf-8")).hexdigest()
    price = PRICE_MIN + (int(digest[:4], 16) % (PRICE_MAX - PRICE_MIN + 1))
    snippet = " ".join(cleaned.split()[:5]).title() or "Bespoke Soft Launch"
    name = sanitize_text(f"Limited: {snippet}", "Bespoke Situationship", CUSTOM_NAME_MAX)
    desc = sanitize_text(
        f"Warehouse notes: we almost found '{cleaned}'. Substitutions remain a lifestyle.",
        "A custom order with unresolved chemistry.",
        CUSTOM_DESC_MAX,
    )
    return {
        "name": name,
        "description": desc,
        "category": "Custom Order",
        "price": int(price),
        "source": "fallback",
    }


def validate_custom_item(payload: Any) -> dict[str, Any] | None:
    if not isinstance(payload, dict):
        return None
    name = sanitize_text(payload.get("name") or payload.get("product_name"), "", CUSTOM_NAME_MAX)
    description = sanitize_text(
        payload.get("description") or payload.get("desc"),
        "",
        CUSTOM_DESC_MAX,
    )
    category = sanitize_text(payload.get("category"), "Custom Order", CUSTOM_CATEGORY_MAX)
    if not name or not description:
        return None
    return {
        "name": name,
        "description": description,
        "category": category or "Custom Order",
        "price": clamp_price(payload.get("price")),
        "source": "groq",
    }


def fallback_rider_chat(context: dict[str, Any], message: str) -> str:
    mood = context.get("riderMood") or rider_mood(float(context.get("tip") or 0))
    option = context.get("relationshipOption") or "never"
    name = sanitize_text(context.get("enteredName"), "them", 40)
    remaining = int(context.get("remainingStops") or 0)
    current = int(context.get("currentStop") or 0)
    text = (message or "").lower()

    if "cancel" in text:
        return "Cancel? I already accepted the order emotionally. That's binding in three zip codes."
    if "eta" in text or "increasing" in text:
        return f"ETA is a suggestion. I have {remaining} poetic detours left and a playlist to finish."
    if "ex" in text:
        if option == "ex":
            return f"I have not seen {name}. I also have not not seen {name}. Traffic is complicated."
        return "I don't do exes. I do left turns and poorly timed honesty."
    if "where" in text:
        return f"Currently at stop {current}. If the map looks lost, that's a feature."
    if "hurry" in text:
        if mood == "furious":
            return "Hurry? For that tip I am sightseeing through every unresolved alley."
        if mood == "smug":
            return "Relax. Premium tippers get premium dawdling. I am thriving."
        return "I am hurrying in spirit. The scooter is negotiating with a roundabout."
    if mood == "furious":
        return "Noted. I will add this message to the pile of things I am ignoring professionally."
    if mood == "smug":
        return "Thanks for the gold-star tip. I may arrive. I may also narrate the sunset first."
    return "Copy that. Package is... a vibe. Do not open until I invent a doorbell."


def fallback_review(context: dict[str, Any]) -> str:
    option = context.get("relationshipOption")
    name = sanitize_text(context.get("enteredName"), "Your Imaginary Soulmate", 40)
    tip = float(context.get("tip") or 0)
    mood = context.get("riderMood") or rider_mood(tip)
    attempts = int(context.get("cancellationAttempts") or 0)
    products = context.get("products") or []
    if isinstance(products, list):
        product_bit = ", ".join(str(p) for p in products[:3]) or "nothing in particular"
    else:
        product_bit = str(products)
    complaint = sanitize_text(context.get("complaintReason"), "unspecified disappointment", 80)
    penalty = float(context.get("cancellationPenalty") or 0)

    if option == "ex":
        lead = f"You ordered a fresh start, received {name}, and still paid for packaging."
    else:
        lead = f"You ordered {name}, who does not exist, then acted surprised when the box had opinions."

    cancel_bit = (
        f" You mashed cancel {attempts} time(s)"
        + (f" and unlocked a ₹{int(penalty)} fee" if penalty else "")
        + "."
    )
    tip_bit = f" Tip: ₹{int(tip)} made the rider {mood}."
    goods = f" Cart energy: {product_bit}."
    end = f" Complaint filed as '{complaint}'. Refund: one virtual hug, ₹0 cash. Would deliver disappointment again."
    return sanitize_text(lead + cancel_bit + tip_bit + goods + end, lead, REVIEW_MAX)
