/**
 * generate-project-structure.js
 *
 * src/App.jsx 를 루트로 삼아 src/** (stories·data·styles·assets 제외,
 * stories/page 는 포함) 의 import 관계를 재귀 탐색하고
 * src/data/** (정적 데이터) 와 훅(useXxx) 사용 여부를 수집하여
 * src/data/projectStructure.js 를 생성한다.
 * components/ 외에 pages/, sections/, common/, hooks/ 처럼 프로젝트마다
 * 다른 폴더 구조를 그대로 따라간다.
 *
 * 사용: pnpm generate-structure
 */

import { readdirSync, readFileSync, writeFileSync, existsSync, statSync } from 'node:fs';
import { join, relative, dirname, basename, extname, resolve } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname.replace(/\/$/, '');
const SRC = join(ROOT, 'src');
const PAGE_DIR = join(SRC, 'stories', 'page');
const DATA_DIR = join(SRC, 'data');
const APP_FILE = join(SRC, 'App.jsx');
const OUT = join(SRC, 'data', 'projectStructure.js');

// ── 유틸 ──────────────────────────────────────────────────────

function walk(dir) {
  if (!existsSync(dir)) return [];
  const out = [];
  for (const entry of readdirSync(dir)) {
    if (entry.startsWith('.')) continue;
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

function isComponentSourceFile(file) {
  return file.endsWith('.jsx') && !file.endsWith('.stories.jsx');
}

function isHookSourceFile(file) {
  return (
    (file.endsWith('.js') || file.endsWith('.jsx')) &&
    /\/use[A-Z][A-Za-z0-9]*\.(js|jsx)$/.test(file)
  );
}

function sanitizeStoryId(str) {
  return String(str)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** import 문에서 module specifier 를 추출 */
function extractImportSpecifiers(source) {
  const specs = [];
  const re = /import\s+(?:[\s\S]+?\s+from\s+)?['"]([^'"]+)['"]/g;
  let m;
  while ((m = re.exec(source)) !== null) {
    specs.push(m[1]);
  }
  return specs;
}

/** 상대/절대 import 를 실제 파일로 해석. 외부 패키지는 null */
function resolveImport(spec, fromFile) {
  if (!spec.startsWith('.') && !spec.startsWith('/')) return null;
  const baseAbs = resolve(dirname(fromFile), spec);
  const candidates = [
    baseAbs,
    baseAbs + '.jsx',
    baseAbs + '.js',
    join(baseAbs, 'index.jsx'),
    join(baseAbs, 'index.js'),
  ];
  for (const c of candidates) {
    if (existsSync(c) && statSync(c).isFile()) return c;
  }
  return null;
}

/** 스토리 파일 (.stories.jsx) 에서 title 을 추출 */
function extractStoryTitle(storyFile) {
  if (!existsSync(storyFile)) return null;
  const content = readFileSync(storyFile, 'utf-8');
  const m = content.match(/title\s*:\s*['"]([^'"]+)['"]/);
  return m ? m[1] : null;
}

/** 파일 경로를 받아 짝이 되는 .stories.jsx 경로를 반환 */
function storyFileFor(sourceFile) {
  return sourceFile.replace(/\.jsx$/, '.stories.jsx');
}

// ── 1) 컴포넌트/페이지/훅 메타 수집 ───────────────────────────

const fileInfo = new Map(); // abs path → { name, kind, category, imports[], storyTitle, storyId }

function registerFile(file) {
  if (fileInfo.has(file)) return;
  const rel = relative(SRC, file);
  const ext = extname(file);
  const name = basename(file, ext);
  const category = dirname(rel).replace(/^stories\/page$/, 'page');

  const source = readFileSync(file, 'utf-8');
  const specs = extractImportSpecifiers(source);

  let kind = 'component';
  if (rel.startsWith('stories/page/') || rel.startsWith('pages/')) kind = 'page';
  else if (/\/use[A-Z]/.test(file)) kind = 'hook';

  const storyTitle = extractStoryTitle(storyFileFor(file));

  fileInfo.set(file, {
    abs: file,
    rel,
    name,
    kind,
    category,
    specs,
    storyTitle,
    storyId: storyTitle ? sanitizeStoryId(storyTitle) : null,
  });
}

/** src/ 아래에서 구조 탐색 대상이 아닌 폴더 (스토리북 문서·정적 데이터·스타일·에셋) */
const SKIP_DIRS = ['stories', 'data', 'styles', 'assets'];
const PAGE_REL = relative(SRC, PAGE_DIR) + '/';

function isTraversable(file) {
  const rel = relative(SRC, file);
  if (rel.startsWith(PAGE_REL)) return true;
  return !SKIP_DIRS.some((d) => rel === d || rel.startsWith(d + '/'));
}

const allSources = walk(SRC).filter(isTraversable);
const componentSourceFiles = [
  APP_FILE,
  ...allSources.filter(isComponentSourceFile),
  ...allSources.filter(isHookSourceFile),
];

for (const f of componentSourceFiles) registerFile(f);

// ── 2) 각 파일의 import 를 분류 ────────────────────────────────

/**
 * import 를 아래 타입으로 분류:
 *  - component  : 탐색 대상 폴더의 컴포넌트 (.jsx)
 *  - page       : src/stories/page/ 또는 src/pages/ 의 페이지 (.jsx)
 *  - hook       : useXxx.(js|jsx)
 *  - data       : src/data/ 의 정적 데이터
 *  - ignore     : 그 외 (MUI / 외부 라이브러리 / 유틸 / 스타일 / 에셋)
 */
function classifyResolvedImport(resolved) {
  if (!resolved) return { type: 'ignore' };
  if (resolved.startsWith(DATA_DIR)) {
    const name = basename(resolved, extname(resolved));
    return { type: 'data', file: resolved, name };
  }
  const info = fileInfo.get(resolved);
  if (info) return { type: info.kind, file: resolved };
  return { type: 'ignore' };
}

for (const [, info] of fileInfo) {
  info.resolvedImports = [];
  for (const spec of info.specs) {
    const resolved = resolveImport(spec, info.abs);
    const classified = classifyResolvedImport(resolved);
    if (classified.type !== 'ignore') {
      info.resolvedImports.push(classified);
    }
  }
}

// ── 3) 트리 빌드 (App.jsx 를 루트로) ──────────────────────────

function buildNode(file, pathStack) {
  const info = fileInfo.get(file);
  if (!info) return null;

  if (pathStack.has(file)) {
    return {
      name: info.name,
      kind: info.kind,
      category: info.category,
      circular: true,
    };
  }

  const nextStack = new Set(pathStack);
  nextStack.add(file);

  const children = [];
  const dataSources = [];
  const hooks = [];

  const seenChildren = new Set();
  const seenData = new Set();
  const seenHooks = new Set();

  for (const imp of info.resolvedImports) {
    if (imp.type === 'component' || imp.type === 'page') {
      if (seenChildren.has(imp.file)) continue;
      seenChildren.add(imp.file);
      const child = buildNode(imp.file, nextStack);
      if (child) children.push(child);
    } else if (imp.type === 'hook') {
      if (seenHooks.has(imp.file)) continue;
      seenHooks.add(imp.file);
      const hookInfo = fileInfo.get(imp.file);
      hooks.push({
        name: hookInfo.name,
        file: hookInfo.rel,
        category: hookInfo.category,
      });
    } else if (imp.type === 'data') {
      if (seenData.has(imp.name)) continue;
      seenData.add(imp.name);
      dataSources.push({ name: imp.name, file: relative(SRC, imp.file) });
    }
  }

  return {
    name: info.name,
    kind: info.kind,
    category: info.category,
    file: info.rel,
    storyTitle: info.storyTitle,
    storyId: info.storyId,
    children,
    hooks,
    data: dataSources,
  };
}

const root = buildNode(APP_FILE, new Set());

// ── 4) 출력 ────────────────────────────────────────────────────

const output = {
  generatedAt: new Date().toISOString(),
  root,
};

writeFileSync(
  OUT,
  `/* eslint-disable */\n/**\n * Auto-generated by scripts/generate-project-structure.js\n * 수동 편집 금지. 재생성: pnpm generate-structure\n */\nexport default ${JSON.stringify(output, null, 2)};\n`
);

const totalNodes = (function count(node) {
  if (!node) return 0;
  let n = 1;
  for (const c of node.children || []) n += count(c);
  return n;
})(root);

console.log(`✓ wrote ${relative(ROOT, OUT)}`);
console.log(`  total nodes: ${totalNodes}`);
