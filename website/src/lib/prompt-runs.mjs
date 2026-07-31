import { createHash } from 'node:crypto';
import {
  existsSync,
  lstatSync,
  readFileSync,
  readdirSync,
  realpathSync,
} from 'node:fs';
import { basename, dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

function findRepositoryRoot() {
  let current = dirname(fileURLToPath(import.meta.url));
  const filesystemRoot = resolve(current, current.startsWith('/') ? '/' : '\\');

  while (true) {
    if (
      existsSync(resolve(current, 'prompts/100-work-efficiency-prompts.json')) &&
      existsSync(resolve(current, 'website/package.json'))
    ) {
      return current;
    }
    if (current === filesystemRoot || dirname(current) === current) break;
    current = dirname(current);
  }

  throw new Error(
    'Prompt run validation failed: repository root could not be resolved from the module location',
  );
}

const REPOSITORY_ROOT = findRepositoryRoot();
const DEFAULT_RUNS_ROOT = process.env.PROMPT_RUNS_ROOT
  ? resolve(process.env.PROMPT_RUNS_ROOT)
  : resolve(REPOSITORY_ROOT, 'prompts/runs');
const EXPECTED_RUN_COUNT = 100;
const SYNTHETIC_DISCLOSURE =
  '> 演示输入：合成数据，不代表真实客户/生产结果';
const PROMPT_RECORD_FIELDS = Object.freeze([
  'id',
  'category',
  'title',
  'scene',
  'prompt',
  'expected_output',
  'tip',
]);

export const RUN_METADATA_FIELDS = Object.freeze([
  'schema_version',
  'run_id',
  'prompt_id',
  'prompt_sha256',
  'prompt_record_sha256',
  'runner',
  'executed_at',
  'conversation_url',
  'input_mode',
  'input_summary',
  'network_research',
  'outcome',
  'output_file',
  'output_sha256',
  'review',
  'limitations',
]);

const RUNNER_FIELDS = Object.freeze([
  'product',
  'model',
  'mode',
  'surface',
]);

const REVIEW_FIELDS = Object.freeze([
  'status',
  'reviewer',
  'reviewed_at',
  'scope',
]);

function fail(runLabel, message) {
  throw new Error(`Prompt run validation failed (${runLabel}): ${message}`);
}

function assertExactFields(value, fields, runLabel, objectLabel) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    fail(runLabel, `${objectLabel} must be an object`);
  }

  const actual = Object.keys(value).sort();
  const expected = [...fields].sort();
  if (
    actual.length !== expected.length ||
    actual.some((field, index) => field !== expected[index])
  ) {
    fail(runLabel, `${objectLabel} fields must be exactly ${fields.join(', ')}`);
  }
}

function assertNonEmptyString(value, runLabel, field) {
  if (typeof value !== 'string' || !value.trim()) {
    fail(runLabel, `${field} must be a non-empty string`);
  }
}

function assertSha256(value, runLabel, field) {
  if (typeof value !== 'string' || !/^[a-f0-9]{64}$/u.test(value)) {
    fail(runLabel, `${field} must be a lowercase SHA-256 digest`);
  }
}

function assertIsoDate(value, runLabel, field) {
  assertNonEmptyString(value, runLabel, field);
  const parsed = new Date(value);
  if (
    Number.isNaN(parsed.getTime()) ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/u.test(value) ||
    parsed.toISOString() !== (
      value.includes('.') ? value : value.replace('Z', '.000Z')
    )
  ) {
    fail(runLabel, `${field} must be an ISO 8601 UTC timestamp`);
  }
  if (parsed.getTime() > Date.now()) {
    fail(runLabel, `${field} must not be in the future`);
  }
}

function assertOutputFileName(value, runLabel) {
  assertNonEmptyString(value, runLabel, 'output_file');
  if (basename(value) !== value || !value.endsWith('.md')) {
    fail(runLabel, 'output_file must be a local Markdown filename');
  }
}

function assertStringArray(value, runLabel, field) {
  if (
    !Array.isArray(value) ||
    value.length === 0 ||
    value.some((item) => typeof item !== 'string' || !item.trim())
  ) {
    fail(runLabel, `${field} must be a non-empty string array`);
  }
}

function assertContainedRegularFile(path, parent, runLabel, label) {
  if (!existsSync(path)) {
    fail(runLabel, `${label} is missing`);
  }
  const stat = lstatSync(path);
  if (stat.isSymbolicLink() || !stat.isFile()) {
    fail(runLabel, `${label} must be a regular file, not a symbolic link`);
  }
  const realParent = realpathSync(parent);
  const realPath = realpathSync(path);
  const relativePath = relative(realParent, realPath);
  if (
    relativePath.startsWith('..') ||
    relativePath === '' ||
    dirname(relativePath) !== '.'
  ) {
    fail(runLabel, `${label} must stay directly inside its run directory`);
  }
}

export function sha256Text(value) {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

export function sha256PromptRecord(prompt) {
  const snapshot = Object.fromEntries(
    PROMPT_RECORD_FIELDS.map((field) => [field, prompt[field]]),
  );
  return sha256Text(JSON.stringify(snapshot));
}

export function validatePromptRun(
  metadata,
  output,
  prompt,
  { policy = 'publication' } = {},
) {
  const runLabel =
    metadata && typeof metadata.run_id === 'string'
      ? metadata.run_id
      : 'unknown run';

  if (!['publication', 'review'].includes(policy)) {
    fail(runLabel, `unknown validation policy "${policy}"`);
  }
  assertExactFields(metadata, RUN_METADATA_FIELDS, runLabel, 'metadata');
  assertExactFields(metadata.runner, RUNNER_FIELDS, runLabel, 'runner');
  assertExactFields(metadata.review, REVIEW_FIELDS, runLabel, 'review');

  if (metadata.schema_version !== 2) {
    fail(runLabel, 'schema_version must equal 2');
  }
  assertNonEmptyString(metadata.run_id, runLabel, 'run_id');
  if (!/^[a-z0-9][a-z0-9-]*$/u.test(metadata.run_id)) {
    fail(runLabel, 'run_id must use lowercase letters, numbers, and hyphens');
  }
  if (!Number.isInteger(metadata.prompt_id)) {
    fail(runLabel, 'prompt_id must be an integer');
  }
  if (!prompt || prompt.id !== metadata.prompt_id) {
    fail(runLabel, `prompt_id ${metadata.prompt_id} does not resolve`);
  }

  assertSha256(metadata.prompt_sha256, runLabel, 'prompt_sha256');
  assertSha256(
    metadata.prompt_record_sha256,
    runLabel,
    'prompt_record_sha256',
  );
  if (metadata.prompt_sha256 !== sha256Text(prompt.prompt)) {
    fail(runLabel, 'prompt_sha256 does not match the canonical Prompt text');
  }
  if (metadata.prompt_record_sha256 !== sha256PromptRecord(prompt)) {
    fail(
      runLabel,
      'prompt_record_sha256 does not match the canonical Prompt record',
    );
  }

  for (const field of RUNNER_FIELDS) {
    assertNonEmptyString(metadata.runner[field], runLabel, `runner.${field}`);
  }
  if (
    metadata.runner.product !== 'ChatGPT' ||
    metadata.runner.model !== 'GPT-5.6 Sol'
  ) {
    fail(runLabel, 'runner must equal ChatGPT GPT-5.6 Sol');
  }
  if (
    RUNNER_FIELDS.some((field) =>
      /work[\s_-]*buddy/iu.test(metadata.runner[field]),
    )
  ) {
    fail(runLabel, 'this recorded run is not allowed to claim WorkBuddy provenance');
  }

  assertIsoDate(metadata.executed_at, runLabel, 'executed_at');
  assertNonEmptyString(metadata.conversation_url, runLabel, 'conversation_url');
  let conversationUrl;
  try {
    conversationUrl = new URL(metadata.conversation_url);
  } catch {
    fail(runLabel, 'conversation_url must be a valid URL');
  }
  if (
    conversationUrl.origin !== 'https://chatgpt.com' ||
    !conversationUrl.pathname.startsWith('/c/')
  ) {
    fail(runLabel, 'conversation_url must identify the ChatGPT run conversation');
  }

  if (!['prompt_only', 'synthetic_demo'].includes(metadata.input_mode)) {
    fail(runLabel, 'input_mode must be prompt_only or synthetic_demo');
  }
  assertNonEmptyString(metadata.input_summary, runLabel, 'input_summary');
  if (typeof metadata.network_research !== 'boolean') {
    fail(runLabel, 'network_research must be a boolean');
  }
  if (!['complete', 'partial'].includes(metadata.outcome)) {
    fail(runLabel, 'outcome must be complete or partial');
  }

  assertOutputFileName(metadata.output_file, runLabel);
  if (typeof output !== 'string' || [...output].length < 600) {
    fail(runLabel, 'recorded output must contain at least 600 characters');
  }
  assertSha256(metadata.output_sha256, runLabel, 'output_sha256');
  if (metadata.output_sha256 !== sha256Text(output)) {
    fail(runLabel, 'output_sha256 does not match the recorded output');
  }
  if (/此处略|待补充|结构示例|lorem\s+ipsum/iu.test(output)) {
    fail(runLabel, 'recorded output contains placeholder language');
  }
  if (!output.endsWith('\n')) {
    fail(runLabel, 'recorded output must preserve a trailing newline');
  }

  if (metadata.input_mode === 'synthetic_demo') {
    if (!metadata.input_summary.includes('合成')) {
      fail(runLabel, 'synthetic_demo input_summary must explicitly say it is synthetic');
    }
    if (!output.startsWith(SYNTHETIC_DISCLOSURE)) {
      fail(
        runLabel,
        `synthetic_demo output must begin with "${SYNTHETIC_DISCLOSURE}"`,
      );
    }
    if (metadata.outcome !== 'partial') {
      fail(runLabel, 'synthetic_demo outcome must be partial');
    }
  }

  if (metadata.network_research) {
    const sourceLinks = new Set(output.match(/https:\/\/[^\s)>]+/gu) ?? []);
    const sourceHosts = new Set(
      [...sourceLinks].map((sourceUrl) => new URL(sourceUrl).hostname),
    );
    if (sourceHosts.size < 3) {
      fail(
        runLabel,
        'network research output must cite at least three independent HTTPS source hosts',
      );
    }
  }

  if (!['approved', 'pending'].includes(metadata.review.status)) {
    fail(runLabel, 'review.status must be approved or pending');
  }
  assertStringArray(metadata.review.scope, runLabel, 'review.scope');
  if (metadata.review.status === 'approved') {
    assertNonEmptyString(metadata.review.reviewer, runLabel, 'review.reviewer');
    assertIsoDate(metadata.review.reviewed_at, runLabel, 'review.reviewed_at');
    if (
      Date.parse(metadata.review.reviewed_at) <
      Date.parse(metadata.executed_at)
    ) {
      fail(runLabel, 'review.reviewed_at must not be earlier than executed_at');
    }
  } else {
    if (
      metadata.review.reviewer !== null ||
      metadata.review.reviewed_at !== null
    ) {
      fail(
        runLabel,
        'pending review must keep reviewer and reviewed_at null until independent review',
      );
    }
    if (policy === 'publication') {
      fail(runLabel, 'pending review is forbidden by the publication gate');
    }
  }

  assertStringArray(metadata.limitations, runLabel, 'limitations');
  if (!metadata.limitations.some((item) => item.includes('不是 WorkBuddy'))) {
    fail(runLabel, 'limitations must state that this is not a WorkBuddy run');
  }
  if (
    metadata.input_mode === 'synthetic_demo' &&
    !metadata.limitations.some((item) => item.includes('合成'))
  ) {
    fail(runLabel, 'synthetic_demo limitations must disclose synthetic input');
  }

  return Object.freeze({
    ...metadata,
    output,
    runner_label: [
      metadata.runner.product,
      metadata.runner.model,
      metadata.runner.mode,
    ].join(' · '),
    conversation_available: true,
  });
}

export function loadPromptRuns({
  prompts,
  runsRoot = DEFAULT_RUNS_ROOT,
  policy = 'publication',
} = {}) {
  if (!Array.isArray(prompts)) {
    throw new Error('Prompt run validation failed: prompts must be an array');
  }
  if (prompts.length !== EXPECTED_RUN_COUNT) {
    fail(
      'canonical prompts',
      `expected exactly ${EXPECTED_RUN_COUNT} prompts, received ${prompts.length}`,
    );
  }
  const promptIds = prompts.map((prompt) => prompt.id);
  if (new Set(promptIds).size !== promptIds.length) {
    fail('canonical prompts', 'duplicate Prompt ids are forbidden');
  }

  if (!existsSync(runsRoot)) {
    throw new Error(
      `Prompt run validation failed: recorded runs directory is missing (${runsRoot})`,
    );
  }
  const runsRootStat = lstatSync(runsRoot);
  if (runsRootStat.isSymbolicLink() || !runsRootStat.isDirectory()) {
    fail('recorded runs', 'runs root must be a real directory, not a symbolic link');
  }
  const realRunsRoot = realpathSync(runsRoot);
  const entries = readdirSync(runsRoot, { withFileTypes: true }).sort(
    (left, right) => left.name.localeCompare(right.name),
  );
  if (entries.some((entry) => entry.isSymbolicLink())) {
    fail('recorded runs', 'symbolic links are forbidden anywhere under runs');
  }
  if (entries.some((entry) => !entry.isDirectory())) {
    fail('recorded runs', 'runs root may contain run directories only');
  }
  if (entries.length !== EXPECTED_RUN_COUNT) {
    fail(
      'recorded runs',
      `expected exactly ${EXPECTED_RUN_COUNT} run directories, received ${entries.length}`,
    );
  }

  const promptById = new Map(prompts.map((prompt) => [prompt.id, prompt]));
  const runsByPromptId = new Map();
  const runIds = new Set();

  for (const entry of entries) {
    const directory = resolve(runsRoot, entry.name);
    const directoryStat = lstatSync(directory);
    if (directoryStat.isSymbolicLink() || !directoryStat.isDirectory()) {
      fail(entry.name, 'run directory must be a real directory');
    }
    const realDirectory = realpathSync(directory);
    const directoryRelative = relative(realRunsRoot, realDirectory);
    if (
      directoryRelative.startsWith('..') ||
      directoryRelative === '' ||
      dirname(directoryRelative) !== '.'
    ) {
      fail(entry.name, 'run directory escapes the configured runs root');
    }

    const metadataPath = resolve(directory, 'run.json');
    assertContainedRegularFile(
      metadataPath,
      directory,
      entry.name,
      'run.json',
    );

    let metadata;
    try {
      metadata = JSON.parse(readFileSync(metadataPath, 'utf8'));
    } catch (error) {
      fail(entry.name, `run.json could not be parsed: ${error.message}`);
    }

    if (entry.name !== metadata.run_id) {
      fail(entry.name, 'run directory name must equal metadata.run_id');
    }
    if (runIds.has(metadata.run_id)) {
      fail(metadata.run_id, 'run_id must be unique');
    }
    if (runsByPromptId.has(metadata.prompt_id)) {
      fail(metadata.run_id, `prompt_id ${metadata.prompt_id} already has a run`);
    }

    const currentRunLabel = metadata.run_id ?? entry.name;
    assertOutputFileName(metadata.output_file, currentRunLabel);
    const allowedFiles = ['run.json', metadata.output_file].sort();
    const runFiles = readdirSync(directory, { withFileTypes: true });
    if (runFiles.some((file) => file.isSymbolicLink() || !file.isFile())) {
      fail(currentRunLabel, 'run directory may contain regular files only');
    }
    const actualFiles = runFiles.map((file) => file.name).sort();
    if (
      actualFiles.length !== allowedFiles.length ||
      actualFiles.some((file, index) => file !== allowedFiles[index])
    ) {
      fail(
        currentRunLabel,
        `run directory files must be exactly ${allowedFiles.join(', ')}`,
      );
    }

    const outputPath = resolve(directory, metadata.output_file);
    assertContainedRegularFile(
      outputPath,
      directory,
      currentRunLabel,
      'recorded output file',
    );
    const output = readFileSync(outputPath, 'utf8');
    const run = validatePromptRun(
      metadata,
      output,
      promptById.get(metadata.prompt_id),
      { policy },
    );

    runIds.add(run.run_id);
    runsByPromptId.set(run.prompt_id, run);
  }

  if (runsByPromptId.size !== EXPECTED_RUN_COUNT) {
    fail(
      'recorded runs',
      `expected exactly ${EXPECTED_RUN_COUNT} unique Prompt runs, received ${runsByPromptId.size}`,
    );
  }
  for (const prompt of prompts) {
    if (!runsByPromptId.has(prompt.id)) {
      fail('recorded runs', `Prompt ${prompt.id} has no run directory`);
    }
  }

  return runsByPromptId;
}
