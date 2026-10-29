"""Situaship Flask entry point — Groq comedy copy, deterministic everything else."""

from __future__ import annotations

import json
import os
import re
from typing import Any

import requests
from dotenv import load_dotenv
from flask import Flask, jsonify, render_template, request

from situaship_logic import (
    CHAT_MAX,
    PROMPT_MAX,
    REVIEW_MAX,
    fallback_custom_item,
    fallback_review,
    fallback_rider_chat,
    sanitize_text,
    validate_custom_item,
)

load_dotenv()

app = Flask(__name__)

GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
DEFAULT_MODEL = "openai/gpt-oss-120b"
REQUEST_TIMEOUT = 18


class GroqUnavailable(Exception):
    """Raised when a Groq request cannot be completed."""


def groq_configured() -> bool:
    return bool(os.getenv("GROQ_API_KEY", "").strip())


def extract_json_object(text: str) -> dict[str, Any] | None:
    if not text:
        return None
    cleaned = text.strip()
    cleaned = re.sub(r"^```(?:json)?", "", cleaned, flags=re.IGNORECASE).strip()
    cleaned = re.sub(r"```$", "", cleaned).strip()
    try:
        parsed = json.loads(cleaned)
        return parsed if isinstance(parsed, dict) else None
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", cleaned, flags=re.DOTALL)
        if not match:
            return None
        try:
            parsed = json.loads(match.group(0))
            return parsed if isinstance(parsed, dict) else None
        except json.JSONDecodeError:
            return None


def call_groq(system: str, user: str, max_tokens: int = 280) -> str:
    api_key = os.getenv("GROQ_API_KEY", "").strip()
    if not api_key:
        raise GroqUnavailable("missing_key")

    model = os.getenv("GROQ_MODEL", DEFAULT_MODEL).strip() or DEFAULT_MODEL
    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        "temperature": 0.9,
        "max_tokens": max_tokens,
    }
    try:
        response = requests.post(
            GROQ_API_URL,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json=payload,
            timeout=REQUEST_TIMEOUT,
        )
    except requests.RequestException as exc:
        raise GroqUnavailable("network") from exc

    if response.status_code >= 400:
        raise GroqUnavailable(f"http_{response.status_code}")

    try:
        data = response.json()
        return data["choices"][0]["message"]["content"].strip()
    except (ValueError, KeyError, IndexError, TypeError, AttributeError) as exc:
        raise GroqUnavailable("malformed") from exc


@app.get("/")
def index():
    return render_template("index.html")


@app.get("/api/status")
def status():
    # Configuration status does not imply that a live provider request succeeded.
    return jsonify({"ok": True, "groq_configured": groq_configured()})


@app.post("/api/custom-item")
def custom_item():
    body = request.get_json(silent=True) or {}
    prompt = sanitize_text(body.get("prompt"), "", PROMPT_MAX)
    if len(prompt) < 8:
        return jsonify({"ok": False, "error": "Describe your ideal partner in a little more detail."}), 400

    item = None
    source = "fallback"
    try:
        raw = call_groq(
            (
                "You invent satirical dating-menu products for Situaship, a fake relationship-delivery app. "
                "Return ONLY compact JSON with keys name, description, category, price. "
                "price must be an integer INR between 99 and 899. No HTML. Keep it funny, not cruel."
            ),
            f"Customer request: {prompt}",
            max_tokens=220,
        )
        item = validate_custom_item(extract_json_object(raw))
        if item:
            source = "groq"
    except GroqUnavailable:
        item = None

    if item is None:
        item = fallback_custom_item(prompt)
        source = "fallback"

    item["source"] = source
    return jsonify({"ok": True, "item": item, "fallback": source != "groq"})


@app.post("/api/chat")
def rider_chat():
    body = request.get_json(silent=True) or {}
    message = sanitize_text(body.get("message"), "", CHAT_MAX)
    if len(message) < 2:
        return jsonify({"ok": False, "error": "Say something the rider can ignore."}), 400

    context = body.get("context") if isinstance(body.get("context"), dict) else {}
    safe_context = {
        "relationshipOption": context.get("relationshipOption"),
        "enteredName": sanitize_text(context.get("enteredName"), "", 40),
        "products": context.get("products") if isinstance(context.get("products"), list) else [],
        "currentStop": context.get("currentStop"),
        "remainingStops": context.get("remainingStops"),
        "tip": context.get("tip"),
        "riderMood": context.get("riderMood"),
        "cancellationAttempts": context.get("cancellationAttempts"),
    }

    reply = None
    source = "fallback"
    try:
        raw = call_groq(
            (
                "You are a chaotic Situaship delivery rider chatting in-app. "
                "Reply in 1-2 short funny sentences. Do not reveal the final wrong-delivery twist. "
                "Do not mention refunds or the ex/empty-box ending as a spoiler. No HTML."
            ),
            json.dumps({"message": message, "state": safe_context}, ensure_ascii=True),
            max_tokens=160,
        )
        reply = sanitize_text(raw, "", 280)
        if reply:
            source = "groq"
    except GroqUnavailable:
        reply = None

    if not reply:
        reply = fallback_rider_chat(safe_context, message)
        source = "fallback"

    return jsonify({"ok": True, "reply": reply, "fallback": source != "groq"})


@app.post("/api/review")
def rider_review():
    body = request.get_json(silent=True) or {}
    context = body.get("context") if isinstance(body.get("context"), dict) else {}
    safe_context = {
        "relationshipOption": context.get("relationshipOption"),
        "enteredName": sanitize_text(context.get("enteredName"), "", 40),
        "products": context.get("products") if isinstance(context.get("products"), list) else [],
        "tip": context.get("tip"),
        "riderMood": context.get("riderMood"),
        "cancellationAttempts": context.get("cancellationAttempts"),
        "cancellationPenalty": context.get("cancellationPenalty"),
        "deliveryOutcome": sanitize_text(context.get("deliveryOutcome"), "", 120),
        "complaintReason": sanitize_text(context.get("complaintReason"), "", 80),
        "refundResult": sanitize_text(context.get("refundResult"), "virtual hug worth ₹0", 80),
    }

    review = None
    source = "fallback"
    try:
        raw = call_groq(
            (
                "Write one short, funny Situaship rider review (2-4 sentences). "
                "Reference only facts provided. Do not invent tip amounts, cancel counts, or products. "
                "No HTML. Satirical, not hateful."
            ),
            json.dumps(safe_context, ensure_ascii=True),
            max_tokens=220,
        )
        review = sanitize_text(raw, "", REVIEW_MAX)
        if review:
            source = "groq"
    except GroqUnavailable:
        review = None

    if not review:
        review = fallback_review(safe_context)
        source = "fallback"

    return jsonify({"ok": True, "review": review, "fallback": source != "groq"})


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=True)
