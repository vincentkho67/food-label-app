# SPEC — Food Label App

Upload a food photo → app generates an FDA-style Nutrition Facts label for it → smooth, natural back-and-forth chat about the food. Multimodal (vision) + conversational. "Smooth and natural conversation" is the explicitly graded behavior — streaming is non-negotiable.

## Build order (commit after each works)

1. Next.js app scaffold + upload UI.
2. Vision API route → structured nutrition JSON.
3. FDA-style label component renders from JSON.
4. Streaming chat with the food kept in context.
5. Suggested follow-up chips + polish.

## Stack

- **Single Next.js (App Router) app** — no separate backend. API routes handle the model calls. One repo, no CORS, one server.
- **OpenAI SDK (GPT-4o)** for both vision and chat. Stream chat responses, render token-by-token.
- Tailwind for styling. TypeScript.
- `OPENAI_API_KEY` from a **shared parent env file at `secondtalent/.env`** (this app lives inside `secondtalent/`). Next.js only auto-loads `.env*` from its own project root, so either symlink/copy the key into the app's own gitignored `.env.local`, or load the parent explicitly in the API route. Make sure whichever `.env` holds the real key is gitignored; commit only `.env.example`.
- Node/npm run from **WSL (Ubuntu)** — keep the project inside the WSL filesystem (e.g. `~/projects/...`), not `/mnt/c`, or file-watching/HMR will be slow.

## Notes on the model calls

- **Vision:** pass the image as a content part in the user message — a `data:image/jpeg;base64,...` data URL or a public URL — alongside the text prompt.
- **Structured nutrition JSON:** use `response_format={"type": "json_object"}` so parsing is reliable rather than prompt-only "return JSON".
- **Chat:** stream with `stream: true`, render tokens as they arrive.

## Flow

1. **Upload:** drag/drop or file picker, show a preview. On submit, send the image (base64) to `/api/analyze`.
2. **Analyze (`/api/analyze`):** one GPT-4o vision call with `response_format` JSON. Strict JSON shape:
   ```
   {
     "food_name": str,
     "serving_size": str,
     "servings_per_container": number,
     "calories": int,
     "macros": {"total_fat_g", "sat_fat_g", "trans_fat_g", "cholesterol_mg", "sodium_mg", "total_carb_g", "fiber_g", "sugars_g", "added_sugars_g", "protein_g"},
     "micros": [{"name", "amount", "unit", "dv_percent"}],
     "confidence": "high|medium|low",
     "notes": str
   }
   ```
   Prompt the model to estimate reasonable values for a typical serving and flag uncertainty via `confidence`.
3. **Label component:** render an actual FDA Nutrition Facts label in CSS — thick black border, heavy horizontal rules, the bold/regular weight hierarchy, "Amount per serving", "% Daily Value" right-aligned column. Make it instantly recognizable. This is the product-thinking flourish; it should screenshot well.
4. **Chat (`/api/chat`):** the analyzed food JSON + a short description live in the system prompt so context never drops. Stream responses. Maintain message history client-side, send full history each call.
5. **Suggested chips:** after the label renders, show 3 tappable follow-ups ("Is this good for a cut?", "How could I lower the calories?", "What's the biggest macro here?"). Tapping sends it as a chat message.

## Feel (this is what's graded)

- Stream every assistant reply — no spinner-then-dump.
- Keep the label visible alongside the chat so the conversation feels grounded in the food.
- Empty/error states speak plainly ("Couldn't read that photo — try a clearer shot"), in the app's voice.

## Design direction

Don't ship the default cream-serif-terracotta AI look. Pick something that fits "food + clinical nutrition label": clean, slightly utilitarian, the FDA label as the visual anchor with everything else quiet around it. One characterful display face for the food name, a clean body face, a mono utility face for the numbers. Spend the boldness on the label; keep the rest disciplined.

## Deliverables

- Working app.
- README with setup + run.
- 3–4 test food photos in `/samples` (one clear, one mixed plate).