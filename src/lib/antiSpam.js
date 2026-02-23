const RATE_LIMIT_PREFIX = "portfolio_rate_limit";

const getStorage = () => {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage;
};

const getRateLimitKey = (key) => `${RATE_LIMIT_PREFIX}:${key}`;

const readAttempts = (key) => {
  const storage = getStorage();
  if (!storage) return [];

  try {
    const raw = storage.getItem(getRateLimitKey(key));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((entry) => Number.isFinite(entry)) : [];
  } catch {
    return [];
  }
};

const writeAttempts = (key, attempts) => {
  const storage = getStorage();
  if (!storage) return;

  try {
    storage.setItem(getRateLimitKey(key), JSON.stringify(attempts));
  } catch {
    // Ignore storage write errors (private mode/quota/full storage).
  }
};

const getWindowedAttempts = (key, windowMs) => {
  const now = Date.now();
  const attempts = readAttempts(key).filter((timestamp) => now - timestamp < windowMs);
  writeAttempts(key, attempts);
  return attempts;
};

export const getRateLimitStatus = (key, windowMs, maxAttempts) => {
  const now = Date.now();
  const attempts = getWindowedAttempts(key, windowMs);

  if (attempts.length < maxAttempts) {
    return { allowed: true, retryAfterMs: 0, remaining: maxAttempts - attempts.length };
  }

  const oldestAttempt = attempts[0];
  const retryAfterMs = Math.max(0, windowMs - (now - oldestAttempt));

  return { allowed: false, retryAfterMs, remaining: 0 };
};

export const consumeRateLimitAttempt = (key, windowMs) => {
  const attempts = getWindowedAttempts(key, windowMs);
  attempts.push(Date.now());
  writeAttempts(key, attempts);
};

export const createMathChallenge = () => {
  const left = Math.floor(Math.random() * 8) + 2;
  const right = Math.floor(Math.random() * 8) + 2;

  return {
    left,
    right,
    answer: left + right,
  };
};

export const isMathChallengeCorrect = (challenge, value) => {
  const numericValue = Number(String(value || "").trim());
  return Number.isFinite(numericValue) && numericValue === Number(challenge?.answer);
};

export const formatRetryTime = (retryAfterMs) => {
  const minutes = Math.ceil(retryAfterMs / 60000);
  if (minutes <= 1) return "1 minuto";
  return `${minutes} minutos`;
};
