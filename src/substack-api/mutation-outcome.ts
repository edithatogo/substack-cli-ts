export type MutationOutcome<T> =
  | { kind: "succeeded"; value: T }
  | { kind: "failed"; error: Error }
  | { kind: "outcome-unknown"; operation: string; reason: string };

export function outcomeUnknown(operation: string, reason: string): MutationOutcome<never> {
  return { kind: "outcome-unknown", operation, reason };
}

export function classifyMutationError<T>(operation: string, error: unknown): MutationOutcome<T> {
  return outcomeUnknown(operation, error instanceof Error ? error.message : String(error));
}

export function requireReconciliationBeforeReplay<T>(outcome: MutationOutcome<T>): void {
  if (outcome.kind === "outcome-unknown") {
    throw new Error(`Reconcile ${outcome.operation} before replay: ${outcome.reason}`);
  }
}
