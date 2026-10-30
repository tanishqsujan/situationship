# Rizzorante

Love, delivered. Not what you ordered.

Rizzorante is a food delivery app where the menu is people. We built it for What The Hack 2.0 (ACM x MTC) because the theme was to make something nobody asked for, and nobody has ever asked for this.

## The idea

Every delivery app asks about your allergies and then ignores the answer. Rizzorante does the same thing, but with people. Before you order, it asks who you are allergic to. Then it delivers that exact person to you.

## What happens when you use it

1. You enter your name, age and gender. You have to be 18 or older.
2. The app asks you to name someone who should not be delivered to you. If you do not have anyone, there is a button that assigns you a random ex.
3. You pick items from the menu, or type a wish and let the AI make a custom item out of it.
4. You apply a coupon, set a tip and place the order. A low tip makes the rider angry and adds extra stops.
5. You follow the rider on the tracking screen. He takes detours, the ETA keeps going up, he calls you to confirm the order, and you can chat with him.
6. The order arrives and it is the person from your allergy list, with a name and an age.
7. You can rate the delivery or file a complaint. A complaint gets read, ignored and the refund is rejected.
8. If you want the refund back, you can play a small flappy-bird style game with a heart. Win and you get another hug instead of money. Lose and you get a chocolate.
9. You get a receipt with everything on it. You can download it as an image.

## Tech

- Plain HTML, CSS and JavaScript on the front end, no framework
- A small Node server (`server.js`) that serves the files and runs the API function
- One serverless-style function (`api/generate.js`) that calls the Groq API
- The browser's built-in speech for the rider's voice, and the Web Audio API for the sound effects
- html2canvas for the receipt download

The AI is used in three places: the custom menu item, the rider's chat replies, and the review on the receipt. Every one of them has a pre-written fallback, so the app still works with no key or no internet.

## How to run it

You need Node.js 18 or newer.

1. Clone the repo and open the folder in a terminal.
2. Create a file named `.env` in the same folder as `server.js` with this line:

```
AI_API_KEY=your_groq_key_here
GROQ_MODEL=openai/gpt-oss-20b
```

3. Start the server:

```
node server.js
```

4. Open http://localhost:3000 in your browser.

If you skip step 2, the app still runs and uses the fallback lines instead of the AI.

For a quick run, open http://localhost:3000/?fast. The splash screen is shorter and the rider moves faster.

Groq changes its model names from time to time. If the AI stops working, check the terminal output and set `GROQ_MODEL` to a model that is listed in the Groq console.

## Project structure

```
index.html        page structure and all screens
style.css         styling
script.js         app logic and the heart game
server.js         local server
api/generate.js   calls the AI for the menu item, rider chat and receipt review
```

## Notes

- The `.env` file holds your API key. It is in `.gitignore` and should never be committed.
- Nothing you type is stored. Everything lives in the page until you close it.
- All the names are made up. None of them are real people.

## Team

Team Name:- ACM_Techie
Member:- Tanishq Sujan