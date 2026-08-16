/**
 * 差分セキュリティ検査ルール（外部 API 非依存）。
 * 秘匿情報漏洩・クライアント危険 API・禁止ロックファイルを中心に検知する。
 */

/** @typedef {'critical' | 'high' | 'medium' | 'low'} Severity */

/**
 * @typedef {object} SecurityRule
 * @property {string} id
 * @property {Severity} severity
 * @property {string} title
 * @property {string} remediation
 * @property {RegExp} [pattern]
 * @property {'line' | 'file'} [scope]
 * @property {(ctx: { filePath: string, line?: string }) => boolean} [applies]
 */

/** スキャン対象の拡張子・ファイル名 */
export const SCANNABLE_PATH_PATTERN =
  /\.(?:[cm]?[jt]sx?|json|ya?ml|env(?:\..+)?|sql|toml|sh)$|(?:^|\/)\.env(?:\..+)?$/i;

/** 依存・生成物などスキャン対象外 */
export const SKIP_PATH_PATTERN =
  /(?:^|\/)(?:node_modules|\.git|\.worktrees|dist|coverage)\//i;

/**
 * ルール定義・テスト fixture 自身はメタファイルとして除外する
 * （パターン文字列が自己検知されるのを防ぐ）
 */
export const META_PATH_PATTERN =
  /(?:^|\/)scripts\/lib\/security-rules\.mjs$|(?:^|\/)scripts\/security-scan\.test\.mjs$|\.test\.[cm]?[jt]sx?$/i;

/**
 * @param {string} filePath
 * @returns {boolean}
 */
export function isDocumentationPath(filePath) {
  const normalized = filePath.replace(/\\/g, '/');
  return /\.(?:md|mdc)$/i.test(normalized) || normalized.endsWith('pull_request_template.md');
}

/**
 * @param {string} filePath
 * @returns {boolean}
 */
export function isMetaPath(filePath) {
  return META_PATH_PATTERN.test(filePath.replace(/\\/g, '/'));
}

/** @type {SecurityRule[]} */
export const SECURITY_RULES = [
  {
    id: 'SEC-LOCKFILE-NPM',
    severity: 'high',
    title: 'package-lock.json / yarn.lock が追加または変更されています',
    remediation: 'このプロジェクトは pnpm 固定です。package-lock.json / yarn.lock は削除してください。',
    scope: 'file',
    applies: ({ filePath }) => {
      const normalized = filePath.replace(/\\/g, '/');
      return (
        normalized === 'package-lock.json' ||
        normalized === 'yarn.lock' ||
        normalized.endsWith('/package-lock.json') ||
        normalized.endsWith('/yarn.lock')
      );
    },
  },
  {
    id: 'SEC-SECRET-PRIVATE-KEY',
    severity: 'critical',
    title: '秘密鍵の埋め込みが疑われます',
    remediation: '秘密鍵をリポジトリに含めず、シークレットマネージャまたは環境変数へ移してください。',
    scope: 'line',
    pattern: /-----BEGIN (?:RSA |OPENSSH |EC |DSA )?PRIVATE KEY-----/,
  },
  {
    id: 'SEC-SECRET-OPENAI-KEY',
    severity: 'critical',
    title: 'API キー形式の文字列が埋め込まれています',
    remediation: 'APIキーをコードから除去し、環境変数または CI secrets で管理してください。',
    scope: 'line',
    pattern: /\bsk-(?:proj-)?[A-Za-z0-9_-]{20,}\b/,
  },
  {
    id: 'SEC-SECRET-SUPABASE-SERVICE',
    severity: 'critical',
    title: 'Supabase service role キーの埋め込みが疑われます',
    remediation: 'service role はサーバー側のみ。フロントやコミット済みファイルへ置かないでください。',
    scope: 'line',
    pattern: /SERVICE_ROLE(?:_KEY)?\s*[=:]\s*['"`]eyJ[A-Za-z0-9_-]+/,
  },
  {
    id: 'SEC-CLIENT-SERVICE-ROLE',
    severity: 'high',
    title: 'フロントエンド配下で service role への参照があります',
    remediation: 'src/ から service role を参照せず、サーバー / Edge Function 側へ閉じ込めてください。',
    scope: 'line',
    pattern: /SERVICE_ROLE|service_role/,
    applies: ({ filePath }) => filePath.replace(/\\/g, '/').startsWith('src/'),
  },
  {
    id: 'SEC-VITE-SECRET-PREFIX',
    severity: 'high',
    title: 'VITE_ 付きの秘匿系環境変数名が使われています',
    remediation:
      'VITE_ はクライアントに露出します。SECRET / PRIVATE / SERVICE_ROLE / PASSWORD 系はサーバー専用名にしてください。',
    scope: 'line',
    pattern: /\bVITE_[A-Z0-9_]*(?:SECRET|PRIVATE|SERVICE_ROLE|PASSWORD|API_KEY)[A-Z0-9_]*\b/,
  },
  {
    id: 'SEC-DANGER-EVAL',
    severity: 'high',
    title: 'eval の使用が検知されました',
    remediation: 'eval を避け、安全なパースまたは明示的な分岐に置き換えてください。',
    scope: 'line',
    pattern: /\beval\s*\(/,
  },
  {
    id: 'SEC-DANGER-NEW-FUNCTION',
    severity: 'high',
    title: 'new Function の使用が検知されました',
    remediation: '動的コード生成を避け、静的な実装へ置き換えてください。',
    scope: 'line',
    pattern: /\bnew\s+Function\s*\(/,
  },
  {
    id: 'SEC-DANGER-HTML',
    severity: 'medium',
    title: 'dangerouslySetInnerHTML の使用が検知されました',
    remediation: '入力のサニタイズと必要性を確認し、可能なら通常の React 子要素へ置き換えてください。',
    scope: 'line',
    pattern: /dangerouslySetInnerHTML/,
  },
  {
    id: 'SEC-LOGIN-DANGER-HTML',
    severity: 'high',
    title: 'ログイン／認証経路で HTML 埋め込みが検知されました',
    remediation:
      'ログイン系は React のテキスト描画のみにしてください。innerHTML / dangerouslySetInnerHTML は使いません。',
    scope: 'line',
    pattern: /dangerouslySetInnerHTML|\.innerHTML\s*=/,
    applies: ({ filePath }) => {
      const normalized = filePath.replace(/\\/g, '/');
      return normalized.startsWith('src/pages/Login/') || normalized.startsWith('src/features/auth/');
    },
  },
  {
    id: 'SEC-LOGIN-SQL-CONCAT',
    severity: 'high',
    title: 'ログイン／認証経路で SQL 文字列結合が疑われます',
    remediation:
      'メール／パスワードを SQL に連結せず、signInWithPassword または RPC 引数で渡してください。',
    scope: 'line',
    pattern:
      /(?:SELECT|INSERT|UPDATE|DELETE|DROP|UNION)\s+[\s\S]{0,80}(?:\$\{|\+\s*email|\+\s*password)/i,
    applies: ({ filePath }) => {
      const normalized = filePath.replace(/\\/g, '/');
      return normalized.startsWith('src/pages/Login/') || normalized.startsWith('src/features/auth/');
    },
  },
  {
    id: 'SEC-FEEDBACK-DANGER-HTML',
    severity: 'high',
    title: 'ご意見チャット経路で HTML 埋め込みが検知されました',
    remediation:
      'ご意見は React のテキスト描画のみにしてください。innerHTML / dangerouslySetInnerHTML は使いません。',
    scope: 'line',
    pattern: /dangerouslySetInnerHTML|\.innerHTML\s*=/,
    applies: ({ filePath }) => {
      const normalized = filePath.replace(/\\/g, '/');
      return (
        normalized.startsWith('src/features/feedback/') ||
        normalized.startsWith('src/components/features/feedback/') ||
        normalized.startsWith('src/pages/Feedback/') ||
        normalized.startsWith('server/feedback/') ||
        normalized.startsWith('api/feedback/')
      );
    },
  },
  {
    id: 'SEC-FEEDBACK-SQL-CONCAT',
    severity: 'high',
    title: 'ご意見チャット経路で SQL 文字列結合が疑われます',
    remediation: '本文を SQL に連結せず、パラメータ付き insert / RPC 引数で渡してください。',
    scope: 'line',
    pattern:
      /(?:SELECT|INSERT|UPDATE|DELETE|DROP|UNION)\s+[\s\S]{0,80}(?:\$\{|\+\s*body)/i,
    applies: ({ filePath }) => {
      const normalized = filePath.replace(/\\/g, '/');
      return (
        normalized.startsWith('src/features/feedback/') ||
        normalized.startsWith('src/components/features/feedback/') ||
        normalized.startsWith('src/pages/Feedback/') ||
        normalized.startsWith('server/feedback/') ||
        normalized.startsWith('api/feedback/')
      );
    },
  },
];

/**
 * @param {string} filePath
 * @returns {boolean}
 */
export function shouldScanFile(filePath) {
  const normalized = filePath.replace(/\\/g, '/');
  if (SKIP_PATH_PATTERN.test(normalized)) return false;
  if (isDocumentationPath(normalized)) return false;
  if (isMetaPath(normalized)) return false;

  const lockfileRule = SECURITY_RULES.find((rule) => rule.id === 'SEC-LOCKFILE-NPM');
  if (lockfileRule?.applies?.({ filePath: normalized })) return true;

  return SCANNABLE_PATH_PATTERN.test(normalized);
}
