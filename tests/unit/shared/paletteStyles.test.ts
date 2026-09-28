// Palette search field sits inside a .dialog, so dialog input rules used to beat
// .palette-input and leave the field flush with the palette edge.
import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';

describe('palette search field styles', () => {
  it('insets the field with body padding and a higher-specificity palette input rule', () => {
    const css = fs.readFileSync(
      path.join(__dirname, '../../../src/renderer/styles/help.css'),
      'utf8',
    );
    expect(css).toMatch(/\.palette-body\s*\{[^}]*padding:\s*6px/s);
    expect(css).toMatch(/\.palette\s+\.palette-input\s*\{/);
    expect(css).not.toMatch(/\.palette-input\s*\{[^}]*border-bottom:/s);
  });
});
