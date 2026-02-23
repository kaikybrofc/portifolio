const normalizeTag = (rawTag) => {
  if (rawTag == null) return '';

  return String(rawTag)
    .trim()
    .replace(/^#+/, '')
    .replace(/\s+/g, ' ')
    .toLowerCase();
};

export const parseTags = (input) => {
  if (!input) return [];

  let parts = [];

  if (Array.isArray(input)) {
    parts = input;
  } else if (typeof input === 'string') {
    parts = input.split(/[,;\n]/g);
  } else {
    parts = [input];
  }

  const normalized = parts.map(normalizeTag).filter(Boolean);
  return Array.from(new Set(normalized));
};

export const stringifyTags = (tags) => parseTags(tags).join(', ');

const extractHashtags = (text) => {
  if (!text) return [];
  const matches = String(text).match(/#([a-zA-Z0-9_-]+)/g) || [];
  return parseTags(matches.map((value) => value.slice(1)));
};

export const getPostTags = (post) => {
  const explicitTags = parseTags(post?.tags);
  if (explicitTags.length > 0) return explicitTags;

  return extractHashtags(`${post?.title || ''} ${post?.content || ''}`);
};
