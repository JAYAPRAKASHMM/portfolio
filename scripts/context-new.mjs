import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const contextDir = join(root, 'context');
const indexPath = join(contextDir, 'INDEX.md');
const templatePath = join(contextDir, 'CONVERSATION_TEMPLATE.md');

if (!existsSync(contextDir)) {
  mkdirSync(contextDir, { recursive: true });
}

const now = new Date();
const yyyy = now.getFullYear();
const mm = String(now.getMonth() + 1).padStart(2, '0');
const dd = String(now.getDate()).padStart(2, '0');
const dateKey = `${yyyy}-${mm}-${dd}`;

const dayFiles = readdirSync(contextDir)
  .filter((name) => new RegExp(`^${dateKey}-session-\\d\\d\\.md$`).test(name))
  .sort();

const nextNumber = dayFiles.length + 1;
const sessionId = String(nextNumber).padStart(2, '0');
const nextFileName = `${dateKey}-session-${sessionId}.md`;
const nextFilePath = join(contextDir, nextFileName);

const template = existsSync(templatePath)
  ? readFileSync(templatePath, 'utf8')
  : '# Conversation Template\n\n## Metadata\n- Date:\n- Session:\n\n## User Goal\n-\n';

writeFileSync(nextFilePath, template, 'utf8');

const entry = `- [${nextFileName}](./${nextFileName})`;
let indexContent = existsSync(indexPath) ? readFileSync(indexPath, 'utf8') : '# Context Index\n\n';
if (!indexContent.includes(entry)) {
  if (!indexContent.endsWith('\n')) indexContent += '\n';
  indexContent += `${entry}\n`;
  writeFileSync(indexPath, indexContent, 'utf8');
}

console.log(`Created ${nextFileName}`);
