const STOPWORDS = new Set([
  "de", "het", "een", "en", "of", "in", "op", "voor", "van", "met", "aan", "bij", "te", "om", "is", "dat", "die", "dit", "als", "welke", "tot"
]);

export function normalizeText(value: unknown): string {
  if (typeof value !== "string") return "";

  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function tokenize(value: unknown): string[] {
  return normalizeText(value)
    .split(" ")
    .filter(Boolean)
    .filter((word) => !STOPWORDS.has(word));
}
