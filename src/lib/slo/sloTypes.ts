export type NormalizedSloGoal = {
  id: string;
  subject: string;
  subjectCode?: string;
  domain?: string;

  sentence: string;
  description?: string;
  actor?: string;

  frameworkCode?: string;
  curriculumVersion?: string;
  levelScope?: string[];

  kernTitle?: string;
  kernDescription?: string;

  examples: string[];
  elaborations: string[];

  baseUitwerkingen: string[];
  hvwoUitwerkingen: string[];

  baseIllustraties: string[];
  hvwoIllustraties: string[];

  karakteristiek?: string;
  samenhangBinnenLeergebied?: string;
  samenhangTussenLeergebieden?: string;

  raw?: any;
};
