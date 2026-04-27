import { NormalizedSloGoal } from "./sloTypes";

export function normalizeSloData(rawData: any): NormalizedSloGoal[] {
  const flattened: NormalizedSloGoal[] = [];

  if (!rawData || !rawData.subjects) return [];

  rawData.subjects.forEach((subject: any) => {
    const subjectName = subject.meta?.subject || "Onbekend vak";
    const subjectCode = subject.meta?.subject_code;

    if (subject.domains) {
      subject.domains.forEach((domain: any) => {
        const domainTitle = domain.title || "Onbekend domein";

        if (domain.kerns) {
          domain.kerns.forEach((kern: any) => {
            const kernTitle = kern.title;
            const kernDescription = kern.description;

            if (kern.goals) {
              kern.goals.forEach((goal: any) => {
                flattened.push({
                  id: goal.item_code || goal.id,
                  subject: subjectName,
                  subjectCode,
                  domain: domainTitle,
                  sentence: goal.sentence || goal.title || goal.item_code || "",
                  description: goal.description || "",
                  actor: goal.actor || "leerling",
                  
                  kernTitle,
                  kernDescription,

                  examples: goal.examples || [],
                  elaborations: goal.elaborations || [],

                  baseUitwerkingen: goal.base_uitwerkingen || [],
                  hvwoUitwerkingen: goal.hvwo_uitwerkingen || [],
                  
                  baseIllustraties: goal.base_illustraties || [],
                  hvwoIllustraties: goal.hvwo_illustraties || [],

                  karakteristiek: subject.meta?.karakteristiek,
                  samenhangBinnenLeergebied: subject.meta?.samenhang_binnen_leergebied,
                  samenhangTussenLeergebieden: subject.meta?.samenhang_tussen_leergebieden,

                  raw: goal
                });
              });
            }
          });
        }
      });
    }
  });

  // Sort by item code (e.g., '21-A' -> 21)
  return flattened.sort((a, b) => {
    const numA = parseInt(a.id.split('-')[0]) || 0;
    const numB = parseInt(b.id.split('-')[0]) || 0;
    if (numA !== numB) return numA - numB;
    return a.id.localeCompare(b.id);
  });
}
