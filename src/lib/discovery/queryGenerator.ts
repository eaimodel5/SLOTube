import { NormalizedSloGoal } from "../slo/sloTypes";

export type QueryGroup =
  | "basis"
  | "domein"
  | "uitwerking"
  | "illustratie"
  | "niveau"
  | "bronSpecifiek";

export interface GeneratedQuery {
  text: string;
  group: QueryGroup;
  priority: number;
}

function clean(text?: string): string {
  if (!text) return "";
  return text.trim().replace(/\s+/g, " ");
}

export function generateQueriesForGoal(goal: NormalizedSloGoal): GeneratedQuery[] {
  const queries: GeneratedQuery[] = [];

  // Group: Basis
  if (goal.subject && goal.domain) {
    queries.push({
      text: `${goal.subject} ${goal.domain}`,
      group: "basis",
      priority: 100
    });
  }
  
  if (goal.sentence) {
    queries.push({
      text: goal.sentence,
      group: "basis",
      priority: 95
    });
  }

  // Group: Domein + Details
  if (goal.domain && goal.description) {
    queries.push({
      text: `${goal.domain} ${goal.description.slice(0, 50)}`,
      group: "domein",
      priority: 80
    });
  }

  // Group: Uitwerkingen (Rijke SLO data)
  const allUitwerkingen = [...goal.elaborations, ...goal.baseUitwerkingen, ...goal.hvwoUitwerkingen];
  allUitwerkingen.slice(0, 3).forEach((u, i) => {
    queries.push({
      text: `${goal.subject} ${u}`,
      group: "uitwerking",
      priority: 90 - i
    });
  });

  // Group: Illustraties
  const allIllustraties = [...goal.examples, ...goal.baseIllustraties, ...goal.hvwoIllustraties];
  allIllustraties.slice(0, 2).forEach((ill, i) => {
    queries.push({
      text: `${goal.subject} ${ill}`,
      group: "illustratie",
      priority: 85 - i
    });
  });

  // Group: Niveau / Doelgroep
  if (goal.actor && goal.sentence) {
    queries.push({
      text: `${goal.sentence} voor ${goal.actor}`,
      group: "niveau",
      priority: 70
    });
  }

  // Group: Bron Specifiek
  if (goal.domain) {
    queries.push({ text: `${goal.domain} schooltv`, group: "bronSpecifiek", priority: 60 });
    queries.push({ text: `${goal.domain} klokhuis`, group: "bronSpecifiek", priority: 60 });
    queries.push({ text: `${goal.domain} wikiwijs`, group: "bronSpecifiek", priority: 55 });
  }

  // Filter out duplicates and ensure valid length
  const seen = new Set<string>();
  return queries
    .map(q => ({ ...q, text: clean(q.text) }))
    .filter(q => {
      if (q.text.length < 4) return false;
      if (seen.has(q.text.toLowerCase())) return false;
      seen.add(q.text.toLowerCase());
      return true;
    })
    .sort((a, b) => b.priority - a.priority);
}
