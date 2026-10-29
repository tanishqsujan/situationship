import unittest

from situaship_logic import (
    CANCELLATION_PENALTY,
    apply_cancellation,
    apply_coupon,
    baggage_fee,
    coupon_discount,
    extra_stops_for_tip,
    fallback_custom_item,
    fallback_review,
    fallback_rider_chat,
    pricing_breakdown,
    rider_mood,
    total_stops,
    validate_custom_item,
)


class RiderMoodTests(unittest.TestCase):
    def test_furious_below_20(self):
        self.assertEqual(rider_mood(19.99), "furious")
        self.assertEqual(extra_stops_for_tip(10), 2)

    def test_neutral_at_20(self):
        self.assertEqual(rider_mood(20), "neutral")
        self.assertEqual(extra_stops_for_tip(20), 0)

    def test_smug_at_100(self):
        self.assertEqual(rider_mood(100), "smug")
        self.assertEqual(extra_stops_for_tip(100), 0)


class StopTests(unittest.TestCase):
    def test_two_units_low_tip_is_four_stops(self):
        self.assertEqual(total_stops(2, 10), 4)

    def test_three_units_high_tip_is_three_stops(self):
        self.assertEqual(total_stops(3, 100), 3)


class CouponTests(unittest.TestCase):
    def test_single50(self):
        result = apply_coupon("single50")
        self.assertEqual(result["status"], "valid")
        self.assertEqual(coupon_discount(400, "valid"), 200)

    def test_moveon_expired(self):
        result = apply_coupon("MOVEON")
        self.assertEqual(result["status"], "expired")
        self.assertEqual(coupon_discount(400, "expired"), 0)

    def test_invalid(self):
        result = apply_coupon("FREEHUG")
        self.assertEqual(result["status"], "invalid")

    def test_never_double_discount(self):
        once = coupon_discount(200, "valid")
        twice = coupon_discount(200, "valid")
        self.assertEqual(once, twice)
        self.assertEqual(once, 100)


class PricingTests(unittest.TestCase):
    def test_total_is_sum_of_parts(self):
        breakdown = pricing_breakdown(400, "valid", "ex", 15, 500)
        expected = 400 - 200 + 49 + 88 + 37 + 15 + 500
        self.assertEqual(breakdown["total"], expected)

    def test_empty_subtotal_has_no_fees(self):
        breakdown = pricing_breakdown(0, "valid", "ex", 10, 0)
        self.assertEqual(breakdown["deliveryFee"], 0)
        self.assertEqual(breakdown["total"], 10)

    def test_emotional_baggage_fee_is_deterministic_by_relationship_path(self):
        self.assertEqual(baggage_fee("ex", 349), 88)
        self.assertEqual(baggage_fee("ex", 349), baggage_fee("ex", 349))
        self.assertEqual(baggage_fee("never", 349), 42)
        self.assertEqual(baggage_fee("never", 349), baggage_fee("never", 349))
        self.assertEqual(baggage_fee("ex", 0), 0)
        self.assertEqual(baggage_fee("never", 0), 0)


class CancellationTests(unittest.TestCase):
    def test_first_five_do_not_penalize(self):
        completed = 2
        penalty = False
        for i in range(5):
            result = apply_cancellation(i, completed, penalty)
            self.assertFalse(result["cancelled"])
            self.assertEqual(result["penaltyAdded"], 0)
            self.assertEqual(result["completedStops"], 2)

    def test_sixth_adds_penalty_once_and_rolls_back(self):
        sixth = apply_cancellation(5, 3, False)
        self.assertEqual(sixth["penaltyAdded"], CANCELLATION_PENALTY)
        self.assertEqual(sixth["completedStops"], 2)
        seventh = apply_cancellation(6, 2, True)
        self.assertEqual(seventh["penaltyAdded"], 0)
        self.assertEqual(seventh["completedStops"], 2)

    def test_rollback_never_negative(self):
        result = apply_cancellation(5, 0, False)
        self.assertEqual(result["completedStops"], 0)
        self.assertEqual(result["penaltyAdded"], CANCELLATION_PENALTY)


class CustomItemTests(unittest.TestCase):
    def test_fallback_is_deterministic(self):
        a = fallback_custom_item("someone who texts back immediately")
        b = fallback_custom_item("someone who texts back immediately")
        self.assertEqual(a["price"], b["price"])
        self.assertGreaterEqual(a["price"], 99)
        self.assertLessEqual(a["price"], 899)

    def test_rejects_malformed(self):
        self.assertIsNone(validate_custom_item("not json"))
        self.assertIsNone(validate_custom_item({"price": 12}))

    def test_clamps_price_and_strips_html(self):
        item = validate_custom_item(
            {
                "name": "<b>Danger</b> Soft Launch",
                "description": "Mostly house-trained.",
                "category": "Chaos",
                "price": 50000,
            }
        )
        self.assertIsNotNone(item)
        self.assertNotIn("<", item["name"])
        self.assertEqual(item["price"], 899)


class ReviewFallbackTests(unittest.TestCase):
    def test_review_uses_actual_facts(self):
        review = fallback_review(
            {
                "relationshipOption": "ex",
                "enteredName": "Rahul",
                "tip": 100,
                "riderMood": "smug",
                "cancellationAttempts": 2,
                "cancellationPenalty": 0,
                "products": ["Green-Flag Girlfriend"],
                "complaintReason": "Wrong person delivered",
            }
        )
        self.assertIn("Rahul", review)
        self.assertIn("2", review)
        self.assertNotIn("six", review.lower())
        self.assertIn("100", review)


class ChatFallbackTests(unittest.TestCase):
    def test_chat_does_not_spoil_ending(self):
        reply = fallback_rider_chat(
            {
                "relationshipOption": "ex",
                "enteredName": "Rahul",
                "riderMood": "neutral",
                "remainingStops": 2,
                "currentStop": 1,
                "tip": 40,
            },
            "Where are you?",
        )
        self.assertTrue(reply)
        self.assertNotIn("empty box", reply.lower())


if __name__ == "__main__":
    unittest.main()
