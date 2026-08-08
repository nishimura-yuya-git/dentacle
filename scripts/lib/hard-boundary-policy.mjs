/**
 * Hard Boundary パターンの SSoT。
 * check-hard-boundaries / loop-discover / PreToolUse ガードが共有する。
 */
import { existsSync, readFileSync } from 'node:fs';
import { isAbsolute, relative, resolve } from 'node:path';

export const DEFAULT_BOUNDARY_CONFIG_PATH = '.cursor/hard-boundaries.json';
export const SESSION_ALLOW_PATH = '.cursor/hard-boundary-session-allow.json';

export const DEFAULT_PROTECTED_PATTERNS = [
  { pattern: /^supabase\/migrations\//, label: 'DBマイグレーション' },
  { pattern: /^supabase\/functions\//, label: 'Supabase Edge Function' },
  { pattern: /^api\//, label: 'APIエンドポイント' },
  { pattern: /^\.github\/workflows\//, label: 'GitHub Actions設定' },
  { pattern: /^\.cursor\/rules\//, label: 'Cursorルール' },
  { pattern: /^PROJECT_MEMORY\.md$/, label: '長期記憶・Hard Boundary定義' },
  { pattern: /^docs\/architecture\//, label: '業務フロー設計図' },
  { pattern: /^vercel\.json$/, label: 'Vercel設定' },
  { pattern: /^vite\.config\.(ts|mts|js|mjs)$/, label: 'Vite設定' },
  { pattern: /^next\.config\.(ts|mts|js|mjs)$/, label: 'Next.js設定' },
  { pattern: /^tsconfig(?:\.[^/]+)?\.json$/, label: 'TypeScript設定' },
  { pattern: /^src\/lib\/supabase\.ts$/, label: 'Supabaseクライアント初期化' },
  { pattern: /^src\/lib\/db\.ts$/, label: 'DBクライアント初期化' },
];

export function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function normalizeProjectPath(filePath) {
  return String(filePath || '')
    .replace(/\\/g, '/')
    .replace(/^\.\/+/, '');
}

export function configEntryToPattern(entry, index) {
  if (!entry || typeof entry !== 'object') {
    throw new Error(`entries[${index}] はオブジェクトで指定してください。`);
  }

  const label =
    typeof entry.label === 'string' && entry.label.trim()
      ? entry.label.trim()
      : '案件固有の保護対象';

  if (typeof entry.path === 'string' && entry.path.trim()) {
    const normalized = normalizeProjectPath(entry.path.trim());
    return { pattern: new RegExp(`^${escapeRegExp(normalized)}$`), label };
  }

  if (typeof entry.prefix === 'string' && entry.prefix.trim()) {
    const normalized = normalizeProjectPath(entry.prefix.trim());
    return { pattern: new RegExp(`^${escapeRegExp(normalized)}`), label };
  }

  if (typeof entry.regex === 'string' && entry.regex.trim()) {
    return { pattern: new RegExp(entry.regex), label };
  }

  throw new Error(`entries[${index}] は path / prefix / regex のいずれかを指定してください。`);
}

export function loadProjectBoundaryConfig(configPath = DEFAULT_BOUNDARY_CONFIG_PATH) {
  if (!existsSync(configPath)) {
    return { patterns: [], errors: [] };
  }

  try {
    const content = readFileSync(configPath, 'utf8');
    const config = JSON.parse(content);
    const entries = Array.isArray(config) ? config : config.entries;

    if (!Array.isArray(entries)) {
      return {
        patterns: [],
        errors: [`${configPath} は配列、または { "entries": [...] } で指定してください。`],
      };
    }

    return {
      patterns: entries.map(configEntryToPattern),
      errors: [],
    };
  } catch (error) {
    return {
      patterns: [],
      errors: [
        `${configPath} の読み込みに失敗しました: ${
          error instanceof Error ? error.message : String(error)
        }`,
      ],
    };
  }
}

export function getProtectedPatterns(configPath = DEFAULT_BOUNDARY_CONFIG_PATH) {
  const projectConfig = loadProjectBoundaryConfig(configPath);
  return {
    patterns: [...DEFAULT_PROTECTED_PATTERNS, ...projectConfig.patterns],
    errors: projectConfig.errors,
  };
}

export function matchHardBoundary(relativePath, patterns) {
  const normalized = normalizeProjectPath(relativePath);
  for (const item of patterns) {
    if (item.pattern.test(normalized)) {
      return { matched: true, file: normalized, label: item.label };
    }
  }
  return { matched: false, file: normalized, label: null };
}

/**
 * 絶対/相対パスをリポジトリ相対パスへ正規化する。
 * workspace 外なら null。
 */
export function toProjectRelativePath(filePath, workspaceRoot) {
  if (!filePath || !workspaceRoot) return null;

  const normalizedRoot = resolve(workspaceRoot);
  const absolutePath = isAbsolute(filePath)
    ? resolve(filePath)
    : resolve(normalizedRoot, filePath);
  const rel = relative(normalizedRoot, absolutePath).replace(/\\/g, '/');

  if (!rel || rel === '..' || rel.startsWith('../')) {
    return null;
  }

  return normalizeProjectPath(rel);
}

export function extractEditTargetPath(toolInput) {
  if (!toolInput || typeof toolInput !== 'object') return null;

  const candidates = [
    toolInput.path,
    toolInput.file_path,
    toolInput.filePath,
    toolInput.target_notebook,
    toolInput.targetNotebook,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate.trim();
    }
  }

  return null;
}

export function loadSessionAllow(allowPath = SESSION_ALLOW_PATH) {
  if (!existsSync(allowPath)) {
    return { allowed: false, reason: null, paths: [], prefixes: [], errors: [] };
  }

  try {
    const config = JSON.parse(readFileSync(allowPath, 'utf8'));
    const paths = Array.isArray(config.paths)
      ? config.paths.map((p) => normalizeProjectPath(String(p))).filter(Boolean)
      : [];
    const prefixes = Array.isArray(config.prefixes)
      ? config.prefixes.map((p) => normalizeProjectPath(String(p))).filter(Boolean)
      : [];
    const reason = typeof config.reason === 'string' ? config.reason.trim() : '';
    const expiresAt = typeof config.expires_at === 'string' ? config.expires_at.trim() : '';

    if (expiresAt) {
      const expiresMs = Date.parse(expiresAt);
      if (!Number.isNaN(expiresMs) && Date.now() > expiresMs) {
        return {
          allowed: false,
          reason: null,
          paths: [],
          prefixes: [],
          errors: [`${allowPath} の有効期限が切れています: ${expiresAt}`],
        };
      }
    }

    return {
      allowed: paths.length > 0 || prefixes.length > 0,
      reason: reason || null,
      paths,
      prefixes,
      errors: [],
    };
  } catch (error) {
    return {
      allowed: false,
      reason: null,
      paths: [],
      prefixes: [],
      errors: [
        `${allowPath} の読み込みに失敗しました: ${
          error instanceof Error ? error.message : String(error)
        }`,
      ],
    };
  }
}

export function isSessionAllowed(relativePath, sessionAllow) {
  if (!sessionAllow?.allowed) return false;
  const normalized = normalizeProjectPath(relativePath);

  if (sessionAllow.paths.includes(normalized)) return true;
  return sessionAllow.prefixes.some(
    (prefix) => normalized === prefix || normalized.startsWith(prefix),
  );
}

export function isEnvBypassEnabled(env = process.env) {
  const value = String(env.HARD_BOUNDARY_ALLOW || '').trim().toLowerCase();
  return value === '1' || value === 'true' || value === 'yes';
}
