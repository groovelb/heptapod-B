#!/usr/bin/env node
/**
 * Supabase의 `gen types typescript` 결과를 JSDoc typedef로 변환.
 *
 * Usage:
 *   supabase gen types typescript --linked > /tmp/db.ts
 *   node ts-to-jsdoc.mjs /tmp/db.ts > src/types/database.js
 *
 * 동작:
 *   - public 스키마의 각 테이블 Row 타입만 추출
 *   - Row 타입을 JSDoc @typedef로 변환
 *   - 기본적인 TS 타입 → JS 타입 매핑 (string, number, boolean, Json, null)
 */

import fs from 'fs';

const inputPath = process.argv[2];
if (!inputPath) {
  console.error('Usage: node ts-to-jsdoc.mjs <path-to-db.ts>');
  process.exit(1);
}

const src = fs.readFileSync(inputPath, 'utf8');

/**
 * `public: { Tables: { ... } }` 블록에서 각 테이블의 Row 정의를 찾음.
 * 각 테이블 블록은:
 *   table_name: {
 *     Row: { col: type; ... }
 *     Insert: { ... }
 *     Update: { ... }
 *   }
 */
function extractRows(source) {
  const publicStart = source.indexOf('public: {');
  if (publicStart === -1) return [];

  const tablesStart = source.indexOf('Tables: {', publicStart);
  if (tablesStart === -1) return [];

  // 단순 중괄호 카운팅으로 Tables 블록 전체 추출
  const tablesBlock = sliceBraceBlock(source, tablesStart + 'Tables: '.length);
  if (!tablesBlock) return [];

  return parseTables(tablesBlock);
}

function sliceBraceBlock(src, startIdx) {
  // startIdx는 '{' 위치
  if (src[startIdx] !== '{') return null;
  let depth = 0;
  for (let i = startIdx; i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}') {
      depth--;
      if (depth === 0) return src.slice(startIdx, i + 1);
    }
  }
  return null;
}

function parseTables(block) {
  const tables = [];
  const inner = block.slice(1, -1);
  let i = 0;
  while (i < inner.length) {
    while (i < inner.length && /\s/.test(inner[i])) i++;
    if (i >= inner.length) break;

    // 테이블 이름 읽기 (식별자)
    const nameMatch = inner.slice(i).match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*:\s*\{/);
    if (!nameMatch) break;
    const tableName = nameMatch[1];
    i += nameMatch[0].length - 1; // '{' 위치로

    const tableBlock = sliceBraceBlock(inner, i);
    if (!tableBlock) break;
    i += tableBlock.length;

    // Row 블록 추출
    const rowStart = tableBlock.indexOf('Row:');
    if (rowStart !== -1) {
      const braceStart = tableBlock.indexOf('{', rowStart);
      const rowBlock = sliceBraceBlock(tableBlock, braceStart);
      if (rowBlock) {
        tables.push({ name: tableName, fields: parseFields(rowBlock) });
      }
    }
  }
  return tables;
}

function parseFields(block) {
  const inner = block.slice(1, -1);
  const fields = [];
  // 간단 라인 분리 — TS 출력은 한 줄에 한 필드 패턴이 일반적
  const lines = inner.split('\n');
  for (const rawLine of lines) {
    const line = rawLine.trim().replace(/,$/, '').replace(/;$/, '');
    if (!line) continue;
    const m = line.match(/^([a-zA-Z_][a-zA-Z0-9_]*)(\??)\s*:\s*(.+)$/);
    if (!m) continue;
    const [, name, optional, tsType] = m;
    fields.push({ name, optional: optional === '?', type: tsToJsdoc(tsType.trim()) });
  }
  return fields;
}

function tsToJsdoc(tsType) {
  // 유니언 처리: "string | null" → "string | null"
  return tsType
    .replace(/\bJson\b/g, 'object')
    .replace(/\bstring\b/g, 'string')
    .replace(/\bnumber\b/g, 'number')
    .replace(/\bboolean\b/g, 'boolean')
    .replace(/\[\]/g, '[]')
    .replace(/\s+/g, ' ')
    .trim();
}

function pascalCase(snake) {
  return snake.split('_').map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join('');
}

const tables = extractRows(src);

let out = '/**\n * Auto-generated from Supabase schema. Do not edit manually.\n * Regenerate: pnpm db:types\n */\n\n';

for (const table of tables) {
  const typeName = pascalCase(table.name);
  out += `/**\n * @typedef {Object} ${typeName}\n`;
  for (const f of table.fields) {
    const name = f.optional ? `[${f.name}]` : f.name;
    out += ` * @property {${f.type}} ${name}\n`;
  }
  out += ` */\n\n`;
}

out += 'export {};\n';

process.stdout.write(out);
