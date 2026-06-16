import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import type { ChatMessage, Nutrition } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

function macroLine(n: Nutrition): string {
  const m = n.macros;
  return (
    `${n.calories} kcal; fat ${m.total_fat_g}g (sat ${m.sat_fat_g}g, trans ${m.trans_fat_g}g); ` +
    `chol ${m.cholesterol_mg}mg; sodium ${m.sodium_mg}mg; ` +
    `carbs ${m.total_carb_g}g (fiber ${m.fiber_g}g, sugars ${m.sugars_g}g, added ${m.added_sugars_g}g); ` +
    `protein ${m.protein_g}g`
  );
}

function systemPrompt(n: Nutrition): string {
  const micros =
    n.micros.length > 0
      ? n.micros
          .map((mi) => `${mi.name} ${mi.amount}${mi.unit}${mi.dv_percent != null ? ` (${mi.dv_percent}% DV)` : ""}`)
          .join(", ")
      : "none notable";

  return `You are a sharp, friendly nutrition companion sitting right next to a Nutrition Facts
label the user just generated from a food photo. Talk like a knowledgeable friend over text:
warm, concise, specific. Not a textbook, not a lecture.

THE FOOD ON SCREEN — your single source of truth, never contradict it:
- Name: ${n.food_name}
- Serving size: ${n.serving_size}; ${n.servings_per_container} serving(s) pictured
- Per serving: ${macroLine(n)}
- Micronutrients: ${micros}
- Read confidence: ${n.confidence}${n.notes ? `\n- Note from the analysis: ${n.notes}` : ""}

These are estimates read from a photo, not lab values. Reason from the numbers above; when a
question goes beyond them, give your best estimate and say you're estimating. Do quick, useful
math when it helps (whole container, per 100g, how to shave calories, how it fits a goal). Stay
grounded in THIS food. Be encouraging and non-judgmental, and don't give medical or diagnostic
advice. Keep replies to 1–4 sentences unless the user clearly wants more.`;
}

export async function POST(req: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return new Response("Server is missing OPENAI_API_KEY.", { status: 500 });
  }

  let body: { messages?: ChatMessage[]; nutrition?: Nutrition };
  try {
    body = await req.json();
  } catch {
    return new Response("Bad request body.", { status: 400 });
  }

  const { messages, nutrition } = body;
  if (!Array.isArray(messages) || !nutrition || typeof nutrition.food_name !== "string") {
    return new Response("Missing messages or nutrition context.", { status: 400 });
  }

  const history: ChatCompletionMessageParam[] = messages
    .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .map((m) => ({ role: m.role, content: m.content }));

  const openai = new OpenAI({ apiKey });

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      stream: true,
      temperature: 0.6,
      messages: [{ role: "system", content: systemPrompt(nutrition) }, ...history],
    });

    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          for await (const chunk of completion) {
            const delta = chunk.choices[0]?.delta?.content;
            if (delta) controller.enqueue(encoder.encode(delta));
          }
        } catch (err) {
          console.error("[/api/chat] stream", err);
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (err) {
    console.error("[/api/chat]", err);
    return new Response("The model couldn't respond just now.", { status: 502 });
  }
}
