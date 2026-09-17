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
const NEXT_APP_DIR = join(ROOT, 'app');
const NEXT_LAYOUT = ['layout.jsx', 'layout.tsx'].map((f) => join(NEXT_APP_DIR, f)).find((f) => existsSync(f)) || join(NEXT_APP_DIR, 'layout.jsx');
/** 루트: Next.js 앱이면 app/layout.jsx, 아니면 src/App.jsx */
const APP_FILE = existsSync(NEXT_LAYOUT) ? NEXT_LAYOUT : (['App.jsx', 'App.tsx', 'main.jsx', 'main.tsx'].map((f) => join(SRC, f)).find((f) => existsSync(f)) || join(SRC, 'App.jsx'));
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
  return /\.(jsx|tsx)$/.test(file) && !/\.stories\.(jsx|tsx)$/.test(file) && !/\.test\.(jsx|tsx)$/.test(file);
}

function isHookSourceFile(file) {
  return (
    /\.(js|jsx|ts|tsx)$/.test(file) &&
    /\/use[A-Z][A-Za-z0-9]*\.(js|jsx|ts|tsx)$/.test(file)
  );
}

function sanitizeStoryId(str) {
  return String(str)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** import 절에서 가져온 이름 목록. `{ A, B as C }` → [A, B], default/namespace 는 빈 목록(전부) */
function parseImportNames(clause) {
  if (!clause) return [];
  const names = [];
  const braces = clause.match(/\{([^}]*)\}/);
  if (braces) {
    for (const part of braces[1].split(',')) {
      const name = part.trim().split(/\s+as\s+/)[0].trim();
      if (name) names.push(name);
    }
  }
  const outside = clause.replace(/\{[^}]*\}/, '').replace(/\*\s+as\s+\w+/, '').replace(/,/g, ' ').trim();
  if (outside) names.push(outside.split(/\s+/)[0]);
  return names;
}

/** import 문에서 { spec, names } 를 추출. names 가 비면 모듈 전체를 뜻한다 */
function extractImportSpecifiers(source) {
  const specs = [];
  const re = /import\s+(?:([\s\S]+?)\s+from\s+)?['"]([^'"]+)['"]/g;
  let m;
  while ((m = re.exec(source)) !== null) {
    specs.push({ spec: m[2], names: parseImportNames(m[1]) });
  }
  // React.lazy(() => import('./X')) 같은 동적 로드
  const dyn = /import\(\s*['"]([^'"]+)['"]\s*\)/g;
  while ((m = dyn.exec(source)) !== null) {
    specs.push({ spec: m[1], names: [] });
  }
  return specs;
}

/** 상대/절대 import 를 실제 파일로 해석. 외부 패키지는 null */
function resolveImport(spec, fromFile) {
  // '@/x' 별칭: src/x 가 있으면 src, 아니면 프로젝트 루트 기준
  if (spec.startsWith('@/')) {
    const rest = spec.slice(2);
    const inSrc = join(SRC, rest);
    const inRoot = join(ROOT, rest);
    const hit = [inSrc, inSrc + '.jsx', inSrc + '.js', inSrc + '.tsx', inSrc + '.ts', join(inSrc, 'index.jsx'), join(inSrc, 'index.js'), join(inSrc, 'index.tsx'), join(inSrc, 'index.ts')].some((c) => existsSync(c));
    spec = hit ? inSrc : inRoot;
  } else if (!spec.startsWith('.') && !spec.startsWith('/')) {
    return null;
  }
  const baseAbs = resolve(dirname(fromFile), spec);
  const candidates = [
    baseAbs,
    baseAbs + '.jsx',
    baseAbs + '.js',
    baseAbs + '.tsx',
    baseAbs + '.ts',
    join(baseAbs, 'index.jsx'),
    join(baseAbs, 'index.js'),
    join(baseAbs, 'index.tsx'),
    join(baseAbs, 'index.ts'),
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

const STORIES_DIR = join(SRC, 'stories');
let storiesIndex = null;
/** src/stories/** 아래 스토리 파일을 이름(확장자 제외)으로 찾는 색인 */
function findStoryByName(name) {
  if (!storiesIndex) {
    storiesIndex = new Map();
    for (const f of walk(STORIES_DIR)) {
      const m = basename(f).match(/^(.+)\.stories\.(jsx|tsx|js|ts)$/);
      if (m && !storiesIndex.has(m[1])) storiesIndex.set(m[1], f);
    }
  }
  return storiesIndex.get(name) || null;
}

/** 소스 파일의 스토리: 형제 X.stories.(jsx|tsx) → 없으면 src/stories/**\/X.stories.* */
function storyFileFor(sourceFile) {
  const ext = extname(sourceFile);
  const name = basename(sourceFile, ext);
  for (const e of ['.stories.jsx', '.stories.tsx']) {
    const sib = join(dirname(sourceFile), name + e);
    if (existsSync(sib)) return sib;
  }
  return findStoryByName(name) || sourceFile.replace(/\.(jsx|tsx)$/, '.stories.jsx');
}

// ── 1) 컴포넌트/페이지/훅 메타 수집 ───────────────────────────

const fileInfo = new Map(); // abs path → { name, kind, category, imports[], storyTitle, storyId }

function registerFile(file) {
  if (fileInfo.has(file)) return;
  const rel = file.startsWith(NEXT_APP_DIR) ? relative(ROOT, file) : relative(SRC, file);
  const ext = extname(file);
  const name = rel.startsWith('app/') && /^(page|layout)$/.test(basename(file, ext))
    ? `${dirname(rel)}/${basename(file, ext)}`
    : basename(file, ext);
  const category = dirname(rel).replace(/^stories\/page$/, 'page');

  const source = readFileSync(file, 'utf-8');
  const specs = extractImportSpecifiers(source);

  let kind = 'component';
  if (rel.startsWith('stories/page/') || rel.startsWith('pages/') || /^app\/.*page$/.test(name)) kind = 'page';
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

const allSources = [...walk(SRC).filter(isTraversable), ...walk(NEXT_APP_DIR)];
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

/**
 * 배럴 파일(등록되지 않은 .js/.ts)이면 export ... from 대상을 펼친다.
 * names 가 있으면 그 이름을 내보내는 줄만 따라간다 (`export { A as B } from './F'` 의 B, `export * from` 은 재귀).
 */
function expandBarrel(resolved, names = [], seen = new Set()) {
  if (!resolved || seen.has(resolved)) return [];
  seen.add(resolved);
  const wanted = new Set(names);
  if (fileInfo.has(resolved) || resolved.startsWith(DATA_DIR)) {
    const base = basename(resolved, extname(resolved));
    return wanted.size === 0 || wanted.has(base) || seen.size === 1 ? [resolved] : [];
  }
  if (!/\.(js|ts)$/.test(resolved)) return [];
  const src = readFileSync(resolved, 'utf-8');
  const out = [];
  const re = /export\s+(\*(?:\s+as\s+\w+)?|\{[^}]*\})\s+from\s+['"]([^'"]+)['"]/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    const inner = resolveImport(m[2], resolved);
    if (!inner) continue;
    if (m[1].startsWith('*')) {
      out.push(...expandBarrel(inner, names, seen));
      continue;
    }
    const exported = m[1].slice(1, -1).split(',').map((x) => x.trim()).filter(Boolean)
      .map((x) => x.split(/\s+as\s+/).pop().trim());
    if (wanted.size === 0 || exported.some((n) => wanted.has(n))) {
      if (fileInfo.has(inner) || inner.startsWith(DATA_DIR)) out.push(inner);
      else out.push(...expandBarrel(inner, [], seen));
    }
  }
  return out;
}

for (const [, info] of fileInfo) {
  info.resolvedImports = [];
  for (const { spec, names } of info.specs) {
    const resolved = resolveImport(spec, info.abs);
    for (const target of expandBarrel(resolved, names)) {
      const classified = classifyResolvedImport(target);
      if (classified.type !== 'ignore') {
        info.resolvedImports.push(classified);
      }
    }
  }
}

// ── 3) 트리 빌드 (App.jsx 를 루트로) ──────────────────────────

const expandedOnce = new Set(); // 같은 파일의 하위 트리는 처음 한 번만 펼친다

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
  if (expandedOnce.has(file)) {
    return { name: info.name, kind: info.kind, category: info.category, file: info.rel, ref: true, children: [], hooks: [], data: [] };
  }
  expandedOnce.add(file);

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

let root = buildNode(APP_FILE, new Set());

// Next.js 앱: 파일 기반 라우트(app/**/page.jsx)는 layout 이 import 하지 않으므로 루트 아래에 나란히 둔다
if (existsSync(NEXT_LAYOUT)) {
  const pageFiles = walk(NEXT_APP_DIR).filter((f) => /\/page\.(jsx|tsx)$/.test(f) && fileInfo.has(f));
  const pageNodes = pageFiles.map((f) => buildNode(f, new Set())).filter(Boolean);
  root = { name: 'app', kind: 'root', category: 'app', file: 'app', storyTitle: null, storyId: null, children: [root, ...pageNodes], hooks: [], data: [] };
}

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
