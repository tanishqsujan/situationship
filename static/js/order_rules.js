(() => {
  "use strict";

  const CANCELLATION_PENALTY = 500;
  const CANCELLATION_JOKES = [
    "Cancel request received. Our intern is looking for the button.",
    "Still delivering. Commitment is easier for us than for you.",
    "Cancellation is in another warehouse.",
    "The rider says they already left their feelings at your door.",
    "We forwarded your cancel request to a group chat that never reads it.",
  ];

  function applyCancellationAttempt(attemptsBefore, completedStops, penaltyApplied) {
    const attempts = Math.max(0, Number(attemptsBefore) || 0) + 1;
    const completed = Math.max(0, Number(completedStops) || 0);
    if (attempts < 6) {
      return {
        attempts,
        penaltyAdded: 0,
        penaltyApplied: false,
        completedStops: completed,
        message: CANCELLATION_JOKES[attempts - 1],
      };
    }

    if (!penaltyApplied) {
      return {
        attempts,
        penaltyAdded: CANCELLATION_PENALTY,
        penaltyApplied: true,
        completedStops: Math.max(0, completed - 1),
        message: "Cancellation failed spectacularly. ₹500 processing fee applied. The rider reversed one street and called it growth.",
      };
    }

    return {
      attempts,
      penaltyAdded: 0,
      penaltyApplied: true,
      completedStops: completed,
      message: "Cancellation was already processed unsuccessfully. The fee stays. The order stays.",
    };
  }

  const api = { applyCancellationAttempt };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (typeof window !== "undefined") window.SituashipOrderRules = api;
})();
