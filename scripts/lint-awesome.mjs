import awesomeLint from 'awesome-lint';
import defaultConfig from 'awesome-lint/config.js';

const ownerOnlyRule = 'remark-lint:awesome-github';
const config = defaultConfig.filter(entry => {
  const rule = Array.isArray(entry) ? entry[0] : entry;
  return rule?.name !== ownerOnlyRule;
});

if (config.length !== defaultConfig.length - 1) {
  throw new Error(`Expected to exclude exactly one rule: ${ownerOnlyRule}`);
}

await awesomeLint.report({
  filename: 'README.md',
  config
});

if (!process.exitCode) {
  console.log(`awesome-lint: passed (excluded owner-only rule ${ownerOnlyRule})`);
}
