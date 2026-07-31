import { spawnSync } from 'node:child_process';
import {
  cpSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';

const websiteRoot = resolve(import.meta.dirname, '..');
const repositoryRoot = resolve(websiteRoot, '..');
const sourceRuns = resolve(repositoryRoot, 'prompts/runs');
const fixtureRoot = mkdtempSync(resolve(tmpdir(), 'workbuddy-reviewed-runs-'));
const fixtureRuns = resolve(fixtureRoot, 'runs');
const fixtureDist = resolve(websiteRoot, '.test-dist');

try {
  cpSync(sourceRuns, fixtureRuns, { recursive: true });
  for (const directory of readdirSync(fixtureRuns, { withFileTypes: true })) {
    if (!directory.isDirectory()) continue;
    const metadataPath = resolve(fixtureRuns, directory.name, 'run.json');
    const metadata = JSON.parse(readFileSync(metadataPath, 'utf8'));
    if (metadata.review.status === 'pending') {
      metadata.review = {
        ...metadata.review,
        status: 'approved',
        reviewer: 'post-review build fixture',
        reviewed_at: new Date().toISOString(),
        scope: [
          ...metadata.review.scope,
          '测试夹具：仅模拟独立审核完成后的发布状态，不修改源码记录。',
        ],
      };
      writeFileSync(
        metadataPath,
        `${JSON.stringify(metadata, null, 2)}\n`,
        'utf8',
      );
    }
  }

  rmSync(fixtureDist, { recursive: true, force: true });
  const result = spawnSync(
    process.execPath,
    [resolve(websiteRoot, 'node_modules/astro/bin/astro.mjs'), 'build'],
    {
      cwd: websiteRoot,
      env: {
        ...process.env,
        ASTRO_TELEMETRY_DISABLED: '1',
        PROMPT_RUNS_ROOT: fixtureRuns,
        ASTRO_OUT_DIR: fixtureDist,
      },
      encoding: 'utf8',
    },
  );
  process.stdout.write(result.stdout);
  process.stderr.write(result.stderr);
  if (result.status !== 0) {
    throw new Error(
      `Post-review production-build fixture failed with status ${result.status}`,
    );
  }
} finally {
  rmSync(fixtureRoot, { recursive: true, force: true });
}
