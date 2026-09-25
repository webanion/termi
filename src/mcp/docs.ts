import { version } from '../../package.json';
import guideText from './docs.md?raw';
import { SETTINGS_FILE } from './settingsFile';
import { LAYOUTS } from '../shared/layouts';
import type { Tool } from './tools';

export const DOCS_URI = 'termi://docs';

export const RESOURCES = [
  {
    uri: DOCS_URI,
    name: 'termi-docs',
    title: 'Termi MCP guide',
    description:
      'How the Termi MCP server works: saved commands, rules, layouts, live sync, setup, and tools.',
    mimeType: 'text/markdown',
  },
];

// The guide in docs.md, then a reference built from the code, so the reference is always current.
export function docsText(tools: Tool[]): string {
  const guide = guideText.trimEnd();

  const layouts = Object.entries(LAYOUTS).flatMap(([count, list]) =>
    list.map(
      (l, index) => `| ${count} | \`${l.id}\` | ${l.label}${index === 0 ? ' (default)' : ''} |`,
    ),
  );

  const reference = tools.map((tool) => {
    const { properties, required = [] } = tool.inputSchema;
    const params = Object.entries(properties).map(([name, schema]) => {
      const type = schema.type === 'array' ? `${schema.items?.type}[]` : schema.type;
      const need = required.includes(name) ? 'required' : 'optional';
      return `- \`${name}\` (${type}, ${need}): ${schema.description}`;
    });
    return [
      `### \`${tool.name}\``,
      '',
      tool.description,
      '',
      ...(params.length ? params : ['No parameters.']),
    ].join('\n');
  });

  return [
    guide,
    '',
    '## Layouts',
    '',
    '| Terminals | Id | Looks like |',
    '| --- | --- | --- |',
    ...layouts,
    '',
    '## Tool reference',
    '',
    reference.join('\n\n'),
    '',
    '## This install',
    '',
    `- Settings file: \`${SETTINGS_FILE}\``,
    `- Server: \`${__filename}\``,
    `- Version: ${version}`,
    '',
  ].join('\n');
}
