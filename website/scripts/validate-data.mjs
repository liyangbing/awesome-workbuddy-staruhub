import { loadReadmeCatalog } from '../src/lib/catalog.mjs';
import { loadPrompts } from '../src/lib/prompts.mjs';

const catalog = loadReadmeCatalog();
const promptData = loadPrompts();

console.log(
  `README catalog: PASS (${catalog.total} resources across ${catalog.categories.length} categories)`,
);
console.log(
  `Prompt library: PASS (${promptData.prompts.length} prompts; ${Object.entries(promptData.counts)
    .map(([category, count]) => `${category}=${count}`)
    .join(', ')})`,
);
