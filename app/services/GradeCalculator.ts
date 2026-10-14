/**
 * Pure grade computation: weighted final score, predikat, and pass status.
 * Free of DB access so it can be unit-tested directly.
 */

export interface GradeComponentWeight {
  type: string;
  name: string;
  weight: number;
}

/**
 * Weighted average of entered component scores.
 * Components without a score are skipped and their weight redistributed
 * proportionally, so partial entries still produce a fair result.
 * Returns null when no component has a score.
 */
export const computeFinalScore = (scores: Record<string, number | null>, components: GradeComponentWeight[]): number | null => {
  let total = 0;
  let weightSum = 0;
  for (const component of components) {
    const score = scores[component.type];
    if (score !== null && score !== undefined && Number.isFinite(score)) {
      total += score * component.weight;
      weightSum += component.weight;
    }
  }
  if (weightSum === 0) return null;
  return Math.round((total / weightSum) * 10) / 10;
};

export const computeAverageScore = (scores: Record<string, number | null>): number | null => {
  const values = Object.values(scores).filter((score): score is number =>
    score !== null && score !== undefined && Number.isFinite(score),
  );
  if (values.length === 0) return null;
  const average = values.reduce((sum, score) => sum + score, 0) / values.length;
  return Math.round(average * 10) / 10;
};

export const predikatOf = (score: number | null, kkm: number): string | null => {
  if (score === null) return null;
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= kkm) return 'C';
  return 'D';
};

export const isPassed = (score: number | null, kkm: number): boolean | null => {
  if (score === null) return null;
  return score >= kkm;
};
