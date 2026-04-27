import type { Goal } from "../../types";

function compact(values: Array<string | undefined | null>): string[] {
  return values.map((v) => String(v || "").trim()).filter(Boolean);
}

export function generateQueriesForGoal(goal: Goal): string[] {
  const base = compact([
    goal.subject,
    goal.domain,
    goal.sentence,
    goal.description
  ]);

  const examples = Array.isArray(goal.examples) ? goal.examples.slice(0, 3) : [];
  const elaborations = Array.isArray(goal.elaborations) ? goal.elaborations.slice(0, 3) : [];

  const queries = [
    compact([goal.subject, goal.domain]).join(" "),
    compact([goal.subject, goal.sentence]).join(" "),
    compact([goal.domain, goal.description]).join(" "),
    ...examples.map((x) => compact([goal.subject, x]).join(" ")),
    ...elaborations.map((x) => compact([goal.subject, x]).join(" ")),
    compact([goal.subject, goal.domain, "uitleg leerlingen"]).join(" "),
    compact([goal.domain, "schooltv"]).join(" "),
    compact([goal.domain, "klokhuis"]).join(" ")
  ];

  return Array.from(new Set(queries.map((q) => q.trim()).filter((q) => q.length >= 4))).slice(0, 10);
}
