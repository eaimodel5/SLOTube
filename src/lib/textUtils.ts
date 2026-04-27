export const isTextSimilar = (a?: string, b?: string) => {
  if (!a || !b) return false;
  const cA = a.toLowerCase().replace(/[^a-z0-9]/g, '');
  const cB = b.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (cA.length < 5 || cB.length < 5) return false;
  return cA.includes(cB) || cB.includes(cA);
};
