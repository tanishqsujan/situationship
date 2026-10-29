"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { applyCancellationAttempt } = require("../static/js/order_rules.js");

let attempts = 0;
let completedStops = 3;
let penaltyApplied = false;
let totalPenalty = 0;
for (let expected = 1; expected <= 6; expected += 1) {
  const result = applyCancellationAttempt(attempts, completedStops, penaltyApplied);
  attempts = result.attempts;
  completedStops = result.completedStops;
  penaltyApplied = result.penaltyApplied;
  totalPenalty += result.penaltyAdded;
  assert.equal(attempts, expected, `attempt ${expected} increments exactly once`);
  if (expected < 6) assert.equal(result.penaltyAdded, 0, `attempt ${expected} has no penalty`);
  else assert.equal(result.penaltyAdded, 500, "attempt 6 adds the penalty");
}
assert.equal(totalPenalty, 500, "penalty is applied once through attempt 6");

const repeated = applyCancellationAttempt(attempts, completedStops, penaltyApplied);
assert.equal(repeated.attempts, 7);
assert.equal(repeated.penaltyAdded, 0, "later attempts do not repeat the penalty");
assert.equal(repeated.completedStops, completedStops, "later attempts do not roll back more stops");

const oneStop = applyCancellationAttempt(5, 1, false);
assert.equal(oneStop.completedStops, 0, "rollback cannot go below zero");
const fiveStops = applyCancellationAttempt(5, 5, false);
assert.equal(fiveStops.completedStops, 4, "rollback is limited to one stop");

const appJs = fs.readFileSync(path.join(__dirname, "../static/js/app.js"), "utf8");
const template = fs.readFileSync(path.join(__dirname, "../templates/index.html"), "utf8");
const receipt = appJs.slice(appJs.indexOf("function renderReceipt()"), appJs.indexOf("function render()"));
const helper = appJs.slice(appJs.indexOf("function el(tag, attrs, text)"), appJs.indexOf("function renderCartCount()"));
const autoHandler = appJs.slice(appJs.indexOf('$("autoTrack").addEventListener'), appJs.indexOf('$("cancelBtn").addEventListener'));

for (const label of ["Subtotal", "Delivery fee", "Tip", "Cancellation penalty"]) {
  assert.ok(receipt.includes(`"${label}"`), `receipt contains plain ${label} label`);
}
assert.ok(!receipt.includes("&#x"), "receipt labels contain no literal numeric HTML entities");
assert.ok(!receipt.includes(".innerHTML"), "receipt does not inject HTML");
assert.ok(helper.includes("node.textContent = text"), "receipt values render through textContent");
assert.ok(autoHandler.includes("handleCancel();"), "enabling slow auto-advance counts a cancellation attempt");
assert.ok(template.indexOf("js/order_rules.js") < template.indexOf("js/app.js"), "cancellation rules load before the app");

console.log("Frontend rule and rendering regression checks passed.");
