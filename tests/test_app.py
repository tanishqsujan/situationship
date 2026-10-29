import unittest
from unittest.mock import Mock, patch

from app import app


class FlaskAppTests(unittest.TestCase):
    def setUp(self):
        self.client = app.test_client()

    def test_home_renders(self):
        res = self.client.get("/")
        self.assertEqual(res.status_code, 200)
        self.assertIn(b"Situaship", res.data)
        self.assertIn(b"Start Ordering", res.data)

    def test_status(self):
        with patch.dict("os.environ", {"GROQ_API_KEY": "test-key"}):
            configured = self.client.get("/api/status").get_json()
        with patch.dict("os.environ", {}, clear=True):
            unconfigured = self.client.get("/api/status").get_json()
        self.assertTrue(configured["groq_configured"])
        self.assertFalse(unconfigured["groq_configured"])
        self.assertNotIn("test-key", str(configured))

    @staticmethod
    def provider_response(content, status_code=200):
        response = Mock()
        response.status_code = status_code
        response.json.return_value = {
            "choices": [{"message": {"content": content}}]
        }
        return response

    def test_groq_success_for_all_three_features(self):
        responses = [
            self.provider_response('{"name":"Reply Guy","description":"Replies eventually.","category":"Hope","price":299}'),
            self.provider_response("I am circling the emotional support roundabout."),
            self.provider_response("A review with premium disappointment."),
        ]
        with patch.dict("os.environ", {"GROQ_API_KEY": "test-key", "GROQ_MODEL": "test-model"}), \
             patch("app.requests.post", side_effect=responses) as post:
            item = self.client.post("/api/custom-item", json={"prompt": "someone who replies eventually"}).get_json()
            chat = self.client.post("/api/chat", json={"message": "Where are you?"}).get_json()
            review = self.client.post("/api/review", json={"context": {"tip": 20}}).get_json()

        self.assertFalse(item["fallback"])
        self.assertEqual(item["item"]["name"], "Reply Guy")
        self.assertFalse(chat["fallback"])
        self.assertIn("roundabout", chat["reply"])
        self.assertFalse(review["fallback"])
        self.assertIn("premium disappointment", review["review"])
        self.assertEqual(post.call_count, 3)
        for call in post.call_args_list:
            self.assertEqual(call.args[0], "https://api.groq.com/openai/v1/chat/completions")
            self.assertEqual(call.kwargs["headers"]["Authorization"], "Bearer test-key")
            self.assertEqual(call.kwargs["json"]["model"], "test-model")

    def test_provider_error_uses_fallback(self):
        with patch.dict("os.environ", {"GROQ_API_KEY": "test-key"}), \
             patch("app.requests.post", return_value=self.provider_response("error", 429)):
            res = self.client.post("/api/chat", json={"message": "Where are you?"})
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.get_json()["fallback"])
        self.assertTrue(res.get_json()["reply"])

    def test_malformed_provider_content_uses_fallback(self):
        with patch.dict("os.environ", {"GROQ_API_KEY": "test-key"}), \
             patch("app.requests.post", return_value=self.provider_response("not valid product JSON")):
            res = self.client.post("/api/custom-item", json={"prompt": "someone who replies eventually"})
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.get_json()["fallback"])
        self.assertIn("item", res.get_json())

    def test_malformed_provider_response_uses_fallback(self):
        response = Mock(status_code=200)
        response.json.side_effect = ValueError("invalid JSON")
        with patch.dict("os.environ", {"GROQ_API_KEY": "test-key"}), \
             patch("app.requests.post", return_value=response):
            res = self.client.post("/api/review", json={"context": {"tip": 20}})
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.get_json()["fallback"])
        self.assertTrue(res.get_json()["review"])

    def test_custom_item_validation(self):
        res = self.client.post("/api/custom-item", json={"prompt": "hi"})
        self.assertEqual(res.status_code, 400)

    def test_custom_item_fallback_without_key(self):
        with patch.dict("os.environ", {}, clear=True):
            res = self.client.post(
                "/api/custom-item",
                json={"prompt": "someone who remembers birthdays and replies before midnight"},
            )
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data["ok"])
        self.assertIn("name", data["item"])
        self.assertGreaterEqual(data["item"]["price"], 99)
        self.assertLessEqual(data["item"]["price"], 899)

    def test_chat_fallback(self):
        with patch.dict("os.environ", {}, clear=True):
            res = self.client.post(
                "/api/chat",
                json={
                    "message": "Where are you?",
                    "context": {
                        "relationshipOption": "ex",
                        "enteredName": "Rahul",
                        "tip": 10,
                        "riderMood": "furious",
                        "currentStop": 1,
                        "remainingStops": 3,
                        "products": ["Green-Flag Girlfriend"],
                    },
                },
            )
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data["ok"])
        self.assertTrue(data["reply"])
        self.assertNotIn("<script", data["reply"].lower())

    def test_review_fallback(self):
        with patch.dict("os.environ", {}, clear=True):
            res = self.client.post(
                "/api/review",
                json={
                    "context": {
                        "relationshipOption": "never",
                        "enteredName": "My Imaginary Soulmate",
                        "tip": 100,
                        "riderMood": "smug",
                        "cancellationAttempts": 2,
                        "cancellationPenalty": 0,
                        "products": ["Someone Who Texts Back"],
                        "deliveryOutcome": "empty box",
                        "complaintReason": "Empty box.",
                        "refundResult": "virtual hug worth ₹0",
                    }
                }
            )
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertIn("100", data["review"])
        self.assertNotIn("six", data["review"].lower())


if __name__ == "__main__":
    unittest.main()
