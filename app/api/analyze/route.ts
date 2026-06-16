import { NextResponse } from "next/server";
import OpenAI from "openai";
import type { Macros, Nutrition } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const SYSTEM = `You are a nutrition estimation assistant. You are shown a photo of food and you
estimate an FDA Nutrition Facts panel for ONE typical serving of it.

You always respond with a single JSON object and nothing else — no prose, no markdown fences.
Estimate realistic values from visual cues: portion size, ingredients, and how it's prepared.
When you can't be sure, still give your best numeric estimate and lower the "confidence" field
instead of refusing. Never use null for a calorie or macro value — use 0 if it's truly absent.`;

const MACRO_KEYS: (keyof Macros)[] = [
  "total_fat_g",
  "sat_fat_g",
  "trans_fat_g",
  "cholesterol_mg",
  "sodium_mg",
  "total_carb_g",
  "fiber_g",
  "sugars_g",
  "added_sugars_g",
  "protein_g",
];

const USER_PROMPT = `Estimate the Nutrition Facts for the food in this image and return JSON in exactly this shape
(every calorie/macro value is a number, not a string):

{
  "food_name": "string",
  "serving_size": "string, e.g. '1 medium apple (182g)'",
  "servings_per_container": 1,
  "calories": 0,
  "macros": {
    "total_fat_g": 0, "sat_fat_g": 0, "trans_fat_g": 0, "cholesterol_mg": 0,
    "sodium_mg": 0, "total_carb_g": 0, "fiber_g": 0, "sugars_g": 0,
    "added_sugars_g": 0, "protein_g": 0
  },
  "micros": [{ "name": "Vitamin C", "amount": 8.4, "unit": "mg", "dv_percent": 9 }],
  "confidence": "high | medium | low",
  "notes": "one short sentence on assumptions or what's uncertain"
}

Rules:
- "serving_size": a human-readable amount with an approximate weight when you can.
- "servings_per_container": how many servings the pictured food represents (often 1).
- "calories": integer kcal for one serving.
- "macros": grams, except cholesterol_mg and sodium_mg which are milligrams.
- "micros": notable vitamins/minerals only; "dv_percent" may be null if unknown; use [] if none stand out.
- "confidence": how sure you are given the photo quality and how identifiable the food is.
- If the image is not food, set "food_name" to a short description of what it is, set calories to 0,
  set "confidence" to "low", and explain in "notes".`;

function num(value: unknown, fallback = 0): number {
  const n = typeof value === "string" ? Number(value) : (value as number);
  return Number.isFinite(n) ? n : fallback;
}

function normalize(raw: Record<string, unknown>): Nutrition {
  const macrosRaw = (raw.macros ?? {}) as Record<string, unknown>;
  const macros = MACRO_KEYS.reduce((acc, key) => {
    acc[key] = Math.max(0, num(macrosRaw[key]));
    return acc;
  }, {} as Macros);

  const microsRaw = Array.isArray(raw.micros) ? raw.micros : [];
  const micros = microsRaw
    .map((m) => {
      const o = (m ?? {}) as Record<string, unknown>;
      const dv = o.dv_percent;
      return {
        name: String(o.name ?? "").trim(),
        amount: num(o.amount),
        unit: String(o.unit ?? "").trim(),
        dv_percent: dv === null || dv === undefined ? null : num(dv),
      };
    })
    .filter((m) => m.name.length > 0);

  const confidence = raw.confidence === "high" || raw.confidence === "medium" ? raw.confidence : "low";

  return {
    food_name: String(raw.food_name ?? "Unknown food").trim() || "Unknown food",
    serving_size: String(raw.serving_size ?? "1 serving").trim() || "1 serving",
    servings_per_container: Math.max(1, Math.round(num(raw.servings_per_container, 1))),
    calories: Math.max(0, Math.round(num(raw.calories))),
    macros,
    micros,
    confidence,
    notes: String(raw.notes ?? "").trim(),
  };
}

export async function POST(req: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Server is missing OPENAI_API_KEY." },
      { status: 500 },
    );
  }

  let image: unknown;
  try {
    ({ image } = await req.json());
  } catch {
    return NextResponse.json({ error: "Bad request body." }, { status: 400 });
  }

  if (typeof image !== "string" || !image.startsWith("data:image/")) {
    return NextResponse.json(
      { error: "No image provided." },
      { status: 400 },
    );
  }

  const openai = new OpenAI({ apiKey });

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      temperature: 0.2,
      max_tokens: 1500,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM },
        {
          role: "user",
          content: [
            { type: "text", text: USER_PROMPT },
            { type: "image_url", image_url: { url: image, detail: "auto" } },
          ],
        },
      ],
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      return NextResponse.json({ error: "Empty response from model." }, { status: 502 });
    }

    const parsed = JSON.parse(content) as Record<string, unknown>;
    return NextResponse.json(normalize(parsed));
  } catch (err) {
    console.error("[/api/analyze]", err);
    return NextResponse.json(
      { error: "The model couldn't read that photo." },
      { status: 502 },
    );
  }
}
