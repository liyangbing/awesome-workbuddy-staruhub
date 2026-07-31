import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

export const PROMPT_FIELDS = Object.freeze([
  'id',
  'title',
  'category',
  'scene',
  'prompt',
  'expected_output',
  'tip',
]);

export const EXPECTED_PROMPT_CATEGORY_COUNTS = Object.freeze({
  'deep-research': 10,
  'data-analysis': 10,
  'doc-writing': 10,
  ppt: 10,
  meeting: 10,
  'email-calendar': 10,
  'project-mgmt': 10,
  dev: 10,
  growth: 10,
  'admin-hr-finance': 10,
});

function fail(message) {
  throw new Error(`Prompt data validation failed: ${message}`);
}

export function validatePrompts(data) {
  if (!Array.isArray(data)) fail('root value must be an array');
  if (data.length !== 100) fail(`expected exactly 100 records, received ${data.length}`);

  const ids = new Set();
  const counts = Object.fromEntries(
    Object.keys(EXPECTED_PROMPT_CATEGORY_COUNTS).map((category) => [category, 0]),
  );

  data.forEach((record, index) => {
    const label = `record ${index + 1}`;
    if (!record || typeof record !== 'object' || Array.isArray(record)) {
      fail(`${label} must be an object`);
    }

    const keys = Object.keys(record).sort();
    const expectedKeys = [...PROMPT_FIELDS].sort();
    if (
      keys.length !== expectedKeys.length ||
      keys.some((key, keyIndex) => key !== expectedKeys[keyIndex])
    ) {
      fail(`${label} fields must be exactly ${PROMPT_FIELDS.join(', ')}`);
    }

    if (!Number.isInteger(record.id) || record.id < 1 || record.id > 100) {
      fail(`${label} id must be an integer from 1 through 100`);
    }
    if (ids.has(record.id)) fail(`duplicate id ${record.id}`);
    ids.add(record.id);

    for (const field of PROMPT_FIELDS.filter((field) => field !== 'id')) {
      if (typeof record[field] !== 'string' || !record[field].trim()) {
        fail(`${label} field "${field}" must be a non-empty string`);
      }
    }

    if (!Object.hasOwn(counts, record.category)) {
      fail(`${label} has unknown category "${record.category}"`);
    }
    counts[record.category] += 1;
  });

  for (let id = 1; id <= 100; id += 1) {
    if (!ids.has(id)) fail(`missing id ${id}`);
  }
  for (const [category, expected] of Object.entries(EXPECTED_PROMPT_CATEGORY_COUNTS)) {
    if (counts[category] !== expected) {
      fail(`category "${category}" expected ${expected}, received ${counts[category]}`);
    }
  }

  return { prompts: data, counts };
}

export function loadPrompts(
  promptPath = resolve(
    process.cwd(),
    '../prompts/100-work-efficiency-prompts.json',
  ),
) {
  let parsed;
  try {
    parsed = JSON.parse(readFileSync(promptPath, 'utf8'));
  } catch (error) {
    fail(`could not read or parse canonical JSON: ${error.message}`);
  }
  return validatePrompts(parsed);
}
