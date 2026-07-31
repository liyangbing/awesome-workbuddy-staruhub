import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  parseReadmeCatalog,
  resolveCatalogUrl,
} from '../src/lib/catalog.mjs';
import {
  EXPECTED_PROMPT_CATEGORY_COUNTS,
  validatePrompts,
} from '../src/lib/prompts.mjs';
import { matchesPrompt } from '../src/lib/prompt-search.mjs';

const readme = readFileSync(new URL('../../README.md', import.meta.url), 'utf8');
const prompts = JSON.parse(
  readFileSync(
    new URL('../../prompts/100-work-efficiency-prompts.json', import.meta.url),
    'utf8',
  ),
);

test('README parser returns every declared non-empty catalog section', () => {
  const result = parseReadmeCatalog(readme);
  assert.equal(result.categories.length, 9);
  assert.ok(result.categories.every(({ items }) => items.length > 0));
  assert.equal(
    result.total,
    result.categories.reduce((sum, { items }) => sum + items.length, 0),
  );
});

test('README parser fails on a missing known heading', () => {
  assert.throws(
    () => parseReadmeCatalog(readme.replace('## Community 社区与讨论', '### Community 社区与讨论')),
    /unknown, missing, or reordered H2 headings/u,
  );
});

test('README parser fails on an unknown heading', () => {
  assert.throws(
    () => parseReadmeCatalog(readme.replace('## Contributing', '## Surprise\n\n## Contributing')),
    /unknown, missing, or reordered H2 headings/u,
  );
});

test('README parser fails on a malformed catalog entry', () => {
  assert.throws(
    () => parseReadmeCatalog(readme.replace('- [WorkBuddy 官网（国内版）]', '* [WorkBuddy 官网（国内版）]')),
    /malformed entry/u,
  );
});

test('README parser fails on duplicate URLs', () => {
  const duplicate = readme.replace(
    'https://www.workbuddy.ai/',
    'https://www.workbuddy.cn/',
  );
  assert.throws(() => parseReadmeCatalog(duplicate), /duplicate URL/u);
});

test('README parser fails on an empty description', () => {
  const empty = readme.replace(
    ' - 产品首页，下载入口、功能演示与最新活动都在这里.',
    ' - ',
  );
  assert.throws(() => parseReadmeCatalog(empty), /empty description/u);
});

test('relative catalog URLs route to the correct destination', () => {
  assert.deepEqual(
    resolveCatalogUrl(
      './prompts/100-work-efficiency-prompts.json',
      '/awesome-workbuddy',
    ),
    {
      href: '/awesome-workbuddy/prompts/',
      external: false,
      host: '本站 Prompt 库',
    },
  );
  assert.equal(
    resolveCatalogUrl('./docs/example.md', '/awesome-workbuddy').href,
    'https://github.com/staruhub/awesome-workbuddy/blob/main/docs/example.md',
  );
});

test('the canonical absolute prompt source routes to the local prompt library', () => {
  assert.deepEqual(
    resolveCatalogUrl(
      'https://github.com/staruhub/awesome-workbuddy/blob/main/prompts/100-work-efficiency-prompts.json',
      '/awesome-workbuddy',
    ),
    {
      href: '/awesome-workbuddy/prompts/',
      external: false,
      host: '本站 Prompt 库',
    },
  );
});

test('prompt validator accepts the canonical 100-record distribution', () => {
  const result = validatePrompts(prompts);
  assert.equal(result.prompts.length, 100);
  assert.deepEqual(result.counts, EXPECTED_PROMPT_CATEGORY_COUNTS);
  assert.equal(new Set(result.prompts.map(({ id }) => id)).size, 100);
});

test('prompt validator rejects malformed schema, duplicate ids, and count drift', () => {
  const missingField = structuredClone(prompts);
  delete missingField[0].tip;
  assert.throws(() => validatePrompts(missingField), /fields must be exactly/u);

  const duplicateId = structuredClone(prompts);
  duplicateId[1].id = duplicateId[0].id;
  assert.throws(() => validatePrompts(duplicateId), /duplicate id/u);

  assert.throws(
    () => validatePrompts(prompts.slice(0, 99)),
    /expected exactly 100 records/u,
  );
});

test('prompt validator rejects empty fields and category distribution drift', () => {
  const emptyField = structuredClone(prompts);
  emptyField[0].prompt = ' ';
  assert.throws(() => validatePrompts(emptyField), /must be a non-empty string/u);

  const categoryDrift = structuredClone(prompts);
  categoryDrift[0].category = 'data-analysis';
  assert.throws(() => validatePrompts(categoryDrift), /category "deep-research" expected 10/u);
});

test('prompt filtering covers category, required-field search, and empty state', () => {
  assert.equal(
    prompts.filter((prompt) => matchesPrompt(prompt, { category: 'meeting' })).length,
    10,
  );
  assert.deepEqual(
    prompts
      .filter((prompt) => matchesPrompt(prompt, { query: '一键生成竞品对比矩阵' }))
      .map(({ id }) => id),
    [2],
  );
  assert.ok(
    prompts.some((prompt) =>
      matchesPrompt(prompt, { query: prompt.expected_output }),
    ),
  );
  assert.equal(
    prompts.filter((prompt) =>
      matchesPrompt(prompt, { category: 'dev', query: '绝对不会命中的词' }),
    ).length,
    0,
  );
});
