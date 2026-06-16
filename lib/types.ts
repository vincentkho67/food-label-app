// The strict nutrition shape the vision model returns (see SPEC + /api/analyze).
// Shared contract across the analyze route, the label, and the chat system prompt.

export type Confidence = "high" | "medium" | "low";

export interface Macros {
  total_fat_g: number;
  sat_fat_g: number;
  trans_fat_g: number;
  cholesterol_mg: number;
  sodium_mg: number;
  total_carb_g: number;
  fiber_g: number;
  sugars_g: number;
  added_sugars_g: number;
  protein_g: number;
}

export interface Micro {
  name: string;
  amount: number;
  unit: string;
  dv_percent: number | null;
}

export interface Nutrition {
  food_name: string;
  serving_size: string;
  servings_per_container: number;
  calories: number;
  macros: Macros;
  micros: Micro[];
  confidence: Confidence;
  notes: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}
