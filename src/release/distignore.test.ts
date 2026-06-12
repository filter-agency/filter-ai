import fs from 'fs';
import path from 'path';

const distignorePath = path.resolve(__dirname, '../../.distignore');
const distignore = fs.readFileSync(distignorePath, 'utf8');
const packageJsonPath = path.resolve(__dirname, '../../package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

describe('release package exclusions', () => {
  const expectedPrivatePaths = ['/compose.wp*.yml', '/docker', '/tests', '/src/**/*.test.*'];

  it('excludes private Docker environments and tests from release zips', () => {
    expectedPrivatePaths.forEach((entry) => {
      expect(distignore).toContain(entry);
    });
  });

  it('keeps test files out when plugin-zip builds from package files', () => {
    expect(packageJson.files).toEqual(
      expect.arrayContaining(['!tests', '!src/**/*.test.*', '!docker', '!compose.wp*.yml'])
    );
  });
});
