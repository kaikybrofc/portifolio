const VOTER_KEY_STORAGE = "portfolio_voter_key_v1";

const generateVoterKey = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `voter_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
};

export const getOrCreateVoterKey = () => {
  if (typeof window === "undefined") {
    return "server-render";
  }

  const existing = window.localStorage.getItem(VOTER_KEY_STORAGE);
  if (existing) return existing;

  const next = generateVoterKey();
  window.localStorage.setItem(VOTER_KEY_STORAGE, next);
  return next;
};

export const CONTENT_REACTION_TYPES = {
  BLOG_POST: "blog_post",
  PROJECT: "project",
};
