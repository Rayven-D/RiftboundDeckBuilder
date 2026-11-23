/** A run that must not replace the previous snapshot (CARD-010, CARD-032, CARD-064). */
export class IngestionError extends Error {
  readonly problems: readonly string[];
  constructor(problems: readonly string[]) {
    super(`Ingestion failed:\n- ${problems.join('\n- ')}`);
    this.name = 'IngestionError';
    this.problems = problems;
  }
}
