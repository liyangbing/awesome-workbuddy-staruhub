import { loadReadmeCatalog } from '../src/lib/catalog.mjs';
import { loadPrompts } from '../src/lib/prompts.mjs';
import { loadPromptRuns } from '../src/lib/prompt-runs.mjs';

const catalog = loadReadmeCatalog();
const promptData = loadPrompts();
const allowPending = process.argv.includes('--allow-pending');
const promptRuns = loadPromptRuns({
  prompts: promptData.prompts,
  policy: allowPending ? 'review' : 'publication',
});
const reviewCounts = [...promptRuns.values()].reduce(
  (counts, run) => {
    counts[run.review.status] += 1;
    return counts;
  },
  { approved: 0, pending: 0 },
);

console.log(
  `README catalog: PASS (${catalog.total} resources across ${catalog.categories.length} categories)`,
);
console.log(
  `Prompt library: PASS (${promptData.prompts.length} prompts; ${Object.entries(promptData.counts)
    .map(([category, count]) => `${category}=${count}`)
    .join(', ')})`,
);
console.log(
  `Recorded Prompt runs: PASS (${promptRuns.size} runs; approved=${reviewCounts.approved}, pending=${reviewCounts.pending}; policy=${allowPending ? 'review' : 'publication'})`,
);
