const TRIAL_KEY = "vexora.trial.startedAt.v1";
export const TRIAL_DURATION_MS = 5 * 60 * 1000;

export function getTrialStartedAt(): number | null {
  try {
    const value = localStorage.getItem(TRIAL_KEY);
    if (!value) return null;
    const timestamp = Number(value);
    return Number.isFinite(timestamp) && timestamp > 0 ? timestamp : null;
  } catch {
    return null;
  }
}

export function startTrial(): number {
  const existing = getTrialStartedAt();
  if (existing !== null) return existing;
  const startedAt = Date.now();
  localStorage.setItem(TRIAL_KEY, String(startedAt));
  return startedAt;
}

export function isTrialActive(): boolean {
  const startedAt = getTrialStartedAt();
  return startedAt !== null && Date.now() < startedAt + TRIAL_DURATION_MS;
}

export function trialHasBeenUsed(): boolean {
  return getTrialStartedAt() !== null;
}
