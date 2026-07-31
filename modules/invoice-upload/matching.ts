// Mirrors the DB triggers that populate client.name_parts / provider.name_parts
// (lowercase, split on non-alphanumeric runs) so tokens compare equally.
export function tokenizeName(name: string): string[] {
  return name
    .trim()
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

// Spec 11.4: rank candidates by number of name_parts token matches (desc), tiebreak
// by highest id. A candidate with zero overlapping tokens is not considered a match
// at all — ranking purely by id tiebreak in that case would be a false positive.
export function rankByNameTokenMatches<T extends { id: number; name_parts: string[] }>(
  candidates: T[],
  tokens: string[],
): T | null {
  if (candidates.length === 0) return null;

  const tokenSet = new Set(tokens);
  const scored = candidates
    .map((candidate) => ({
      candidate,
      score: candidate.name_parts.filter((part) => tokenSet.has(part)).length,
    }))
    .filter((entry) => entry.score > 0);

  if (scored.length === 0) return null;

  scored.sort((a, b) => (b.score !== a.score ? b.score - a.score : b.candidate.id - a.candidate.id));
  return scored[0].candidate;
}
