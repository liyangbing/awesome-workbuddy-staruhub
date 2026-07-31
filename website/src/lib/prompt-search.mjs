const SEARCH_FIELDS = Object.freeze([
  'title',
  'scene',
  'prompt',
  'expected_output',
  'tip',
]);

function normalize(value) {
  return String(value).trim().toLocaleLowerCase('zh-CN');
}

export function buildPromptSearchText(prompt) {
  return SEARCH_FIELDS.map((field) => normalize(prompt[field])).join(' ');
}

export function matchesPrompt(prompt, { category = 'all', query = '' } = {}) {
  const categoryMatch = category === 'all' || prompt.category === category;
  const normalizedQuery = normalize(query);
  const searchMatch =
    normalizedQuery === '' ||
    buildPromptSearchText(prompt).includes(normalizedQuery);
  return categoryMatch && searchMatch;
}
