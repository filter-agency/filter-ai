const { readFileSync } = require('fs');
const { join } = require('path');

describe('ContentSource spacing', () => {
  it('adds vertical breathing room above the Save button', () => {
    const contentSource = readFileSync(join(process.cwd(), 'src/settings/batchGeneration/contentSource.tsx'), 'utf8');
    const settingsStyles = readFileSync(join(process.cwd(), 'src/styles/settings.css'), 'utf8');

    expect(contentSource).toContain('className="filter-ai-content-source-save"');
    expect(settingsStyles).toMatch(
      /\.filter-ai-content-source-save\.filter-ai-content-source-save\s*{[\s\S]*margin-top:\s*16px;/
    );
  });
});
