import type { Nutrition } from "@/lib/types";

// FDA reference Daily Values (2,000 kcal) used to compute the %DV column for macros.
// Trans fat, total sugars, and protein have no required %DV — left blank, as on a real label.
const DV: Partial<Record<string, number>> = {
  total_fat_g: 78,
  sat_fat_g: 20,
  cholesterol_mg: 300,
  sodium_mg: 2300,
  total_carb_g: 275,
  fiber_g: 28,
  added_sugars_g: 50,
};

function dv(amount: number, key: string): number | null {
  const ref = DV[key];
  return ref ? Math.round((amount / ref) * 100) : null;
}

function fmt(n: number): string {
  const r = Math.round(n * 10) / 10;
  return Number.isInteger(r) ? String(r) : r.toFixed(1);
}

function Row({
  name,
  amount,
  percent,
  bold = false,
  indent = 0,
}: {
  name: string;
  amount?: string;
  percent?: number | null;
  bold?: boolean;
  indent?: 0 | 1 | 2;
}) {
  const pad = indent === 2 ? "pl-8" : indent === 1 ? "pl-4" : "";
  return (
    <div className="flex justify-between gap-3 border-t border-label py-[3px] text-[13px] leading-snug">
      <span className={pad}>
        <span className={bold ? "font-bold" : ""}>{name}</span>
        {amount !== undefined && (
          <span className="ml-1 font-mono">{amount}</span>
        )}
      </span>
      {percent !== null && percent !== undefined && (
        <span className="font-mono font-bold tabular-nums">{percent}%</span>
      )}
    </div>
  );
}

export function NutritionLabel({ data }: { data: Nutrition }) {
  const m = data.macros;
  const servings = data.servings_per_container;

  return (
    <section
      aria-label={`Nutrition Facts for ${data.food_name}`}
      className="w-full max-w-[20rem] border border-label bg-surface px-2.5 pb-1 text-label"
    >
      {/* Title */}
      <h3 className="pt-1.5 text-[2rem] font-black leading-[0.95] tracking-[-0.025em]">
        Nutrition Facts
      </h3>

      <div className="border-t border-label pt-1 text-[13px]">
        {servings} serving{servings === 1 ? "" : "s"} per container
      </div>
      <div className="flex items-baseline justify-between gap-3 pb-1 text-[15px]">
        <span className="font-bold">Serving size</span>
        <span className="text-right font-bold">{data.serving_size}</span>
      </div>

      {/* Thick bar */}
      <div className="-mx-2.5 border-t-[10px] border-label" />

      {/* Calories */}
      <p className="pt-0.5 text-[11px] font-bold">Amount per serving</p>
      <div className="flex items-end justify-between border-b-[6px] border-label pb-0.5">
        <span className="text-[1.6rem] font-black leading-none">Calories</span>
        <span className="font-mono text-[2.7rem] font-black leading-[0.8] tabular-nums">
          {data.calories}
        </span>
      </div>

      {/* % Daily Value header */}
      <p className="py-0.5 text-right text-[12px] font-bold">% Daily Value*</p>

      {/* Macros */}
      <Row name="Total Fat" amount={`${fmt(m.total_fat_g)}g`} percent={dv(m.total_fat_g, "total_fat_g")} bold />
      <Row name="Saturated Fat" amount={`${fmt(m.sat_fat_g)}g`} percent={dv(m.sat_fat_g, "sat_fat_g")} indent={1} />
      <Row name="Trans Fat" amount={`${fmt(m.trans_fat_g)}g`} indent={1} />
      <Row name="Cholesterol" amount={`${fmt(m.cholesterol_mg)}mg`} percent={dv(m.cholesterol_mg, "cholesterol_mg")} bold />
      <Row name="Sodium" amount={`${fmt(m.sodium_mg)}mg`} percent={dv(m.sodium_mg, "sodium_mg")} bold />
      <Row name="Total Carbohydrate" amount={`${fmt(m.total_carb_g)}g`} percent={dv(m.total_carb_g, "total_carb_g")} bold />
      <Row name="Dietary Fiber" amount={`${fmt(m.fiber_g)}g`} percent={dv(m.fiber_g, "fiber_g")} indent={1} />
      <Row name="Total Sugars" amount={`${fmt(m.sugars_g)}g`} indent={1} />
      {m.added_sugars_g > 0 && (
        <Row
          name={`Includes ${fmt(m.added_sugars_g)}g Added Sugars`}
          percent={dv(m.added_sugars_g, "added_sugars_g")}
          indent={2}
        />
      )}
      <Row name="Protein" amount={`${fmt(m.protein_g)}g`} bold />

      {/* Thick bar before micros */}
      <div className="-mx-2.5 border-t-[10px] border-label" />

      {/* Micronutrients */}
      {data.micros.length > 0 ? (
        data.micros.map((micro, i) => (
          <Row
            key={`${micro.name}-${i}`}
            name={micro.name}
            amount={`${fmt(micro.amount)}${micro.unit}`}
            percent={micro.dv_percent}
          />
        ))
      ) : (
        <p className="border-t border-label py-1 text-[11px] italic text-label/70">
          No standout vitamins or minerals.
        </p>
      )}

      {/* Footnote */}
      <p className="mt-0.5 border-t-[6px] border-label pt-1 text-[10px] leading-snug">
        * The % Daily Value (DV) tells you how much a nutrient in a serving of food
        contributes to a daily diet. 2,000 calories a day is used for general
        nutrition advice.
      </p>
    </section>
  );
}
