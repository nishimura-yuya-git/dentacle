/**
 * PROJECT_MEMORY 要詰め監査（Memory Tighten / Phase F）。
 * MEMORY 自体は書かない。薄い箇所の検出と提示だけ行う。
 */
import { existsSync, readFileSync } from 'node:fs';

export const DEFAULT_MEMORY_PATH = 'PROJECT_MEMORY.md';

/** テンプレ／未置換っぽい角括弧（Markdownリンク `[text](url)` は別処理） */
export const PLACEHOLDER_RE =
  /\[(?:[^\]\n]*\.\.\.|[^\]\n]*例:|プロジェクト名|業務コア[A-Z]?|関数名・?ファイル名|計算SSoTファイル|表示値解決ファイル|自動再計算ファイル|権限判定ファイル|table\.column|YYYY-MM-DD|画面[AB]|整数円|四捨五入|切り上げ|切り捨て|Asia\/Tokyo|logs\s*\/|summaries\s*\/|monthly_summaries|何を実現|主な利用者|デプロイ先|売上\/金額|勤怠\/時間|在庫\/残数|ステータス\/権限|計算内容|判定内容|何の計算根拠|複数データソース|保存後に|ロール・RLS|何が壊れたか|ルール・テスト|見るべき矢印|docs\/architecture\/xxx|docs\/architecture\/yyy|docs\/specs|tests\/invariants)[^\]]*\]/;

const FILE_HINT_RE =
  /(?:`[^`]+`|\b(?:src|scripts|docs|api|supabase|loops|tests|\.cursor)\/[A-Za-z0-9_./\u3040-\u30ff\u4e00-\u9faf-]+|\b[\w.-]+\.(?:ts|tsx|js|mjs|mdc|md|sql|json)\b)/;

const CRITICAL_SECTION_RE = /^(?:2(?:\.\d+)?|3|4|7)\b/;
const HIGH_SECTION_RE = /^(?:5|6|9)\b/;

/**
 * @param {string} markdown
 * @param {{ sourcePath?: string }} [options]
 */
export function auditProjectMemory(markdown, options = {}) {
  const sourcePath = options.sourcePath || DEFAULT_MEMORY_PATH;
  const sections = splitSections(markdown);
  /** @type {Array<Record<string, unknown>>} */
  const findings = [];

  for (const section of sections) {
    const placeholders = findPlaceholders(section.body);
    if (placeholders.length > 0) {
      const severity = severityForSection(section.id);
      findings.push({
        id: `placeholder-${section.id || 'root'}`,
        severity,
        section: section.heading || '(root)',
        title: `プレースホルダが ${placeholders.length} 件残っている`,
        detail: uniqueSample(placeholders, 5).join(' / '),
        nextAction: '打ち合わせ確定内容で置換する。未確定なら「要確認」と残課題を明示する。',
        count: placeholders.length,
      });
    }

    if (isSparseSection(section)) {
      findings.push({
        id: `sparse-${section.id || 'root'}`,
        severity: severityForSection(section.id) === 'critical' ? 'high' : 'medium',
        section: section.heading || '(root)',
        title: '節の中身がテンプレまたは空に近い',
        detail: '見出しの直後に具体的な決定・表・関連ファイルがほぼない。',
        nextAction: '議事録・仕様から最低1つの具体項目（ファイル / テーブル / 画面）を入れる。',
        count: 1,
      });
    }

    if (needsEvidenceLink(section)) {
      findings.push({
        id: `link-gap-${section.id || 'root'}`,
        severity: severityForSection(section.id) === 'critical' ? 'high' : 'medium',
        section: section.heading || '(root)',
        title: '決定文に関連ファイル・テーブルへのリンクがない',
        detail: '「関連:」やパス表記がなく、実装時に辿れない。',
        nextAction: '関連ファイル / テーブル / 画面を「関連:」行で追記する。',
        count: 1,
      });
    }
  }

  const summary = {
    critical: findings.filter((f) => f.severity === 'critical').length,
    high: findings.filter((f) => f.severity === 'high').length,
    medium: findings.filter((f) => f.severity === 'medium').length,
    total: findings.length,
  };

  return {
    generatedAt: new Date().toISOString(),
    sourcePath,
    summary,
    findings: sortFindings(findings),
    autoEdit: false,
  };
}

export function auditProjectMemoryFile(filePath = DEFAULT_MEMORY_PATH) {
  if (!existsSync(filePath)) {
    return {
      generatedAt: new Date().toISOString(),
      sourcePath: filePath,
      summary: { critical: 1, high: 0, medium: 0, total: 1 },
      findings: [
        {
          id: 'missing-memory',
          severity: 'critical',
          section: '(file)',
          title: 'PROJECT_MEMORY.md が存在しない',
          detail: filePath,
          nextAction: '/project-memory で案件向け MEMORY を作成する。',
          count: 1,
        },
      ],
      autoEdit: false,
    };
  }

  return auditProjectMemory(readFileSync(filePath, 'utf8'), { sourcePath: filePath });
}

/**
 * @param {ReturnType<typeof auditProjectMemory>} report
 * @param {{ limit?: number }} [options]
 */
export function formatAuditForContext(report, options = {}) {
  const limit = options.limit ?? 8;
  if (!report?.summary?.total) return '';

  const lines = [
    '## PROJECT_MEMORY 要詰め（Memory Tighten）',
    '',
    `- critical: ${report.summary.critical}, high: ${report.summary.high}, medium: ${report.summary.medium}`,
    '- PROJECT_MEMORY.md は自動編集しない。提示のみ。',
    '- 詳細: pnpm run memory:audit',
    '- 反映: 人間が詰めた内容を /project-memory-learn で確定',
    '',
  ];

  for (const finding of report.findings.slice(0, limit)) {
    lines.push(`- [${finding.severity}] ${finding.section}: ${finding.title}`);
    lines.push(`  → ${finding.nextAction}`);
  }

  if (report.findings.length > limit) {
    lines.push(`- 他 ${report.findings.length - limit} 件（pnpm run memory:audit で確認）`);
  }

  return lines.join('\n');
}

function splitSections(markdown) {
  const lines = String(markdown || '').split(/\r?\n/);
  /** @type {Array<{ id: string, heading: string, body: string, level: number }>} */
  const sections = [];
  let current = { id: '0', heading: '(preamble)', body: '', level: 0 };

  for (const line of lines) {
    const match = /^(#{2,3})\s+(.+)$/.exec(line);
    if (match) {
      sections.push(current);
      const heading = match[2].trim();
      const idMatch = heading.match(/^(\d+(?:\.\d+)?)/);
      current = {
        id: idMatch ? idMatch[1] : slugId(heading),
        heading,
        body: '',
        level: match[1].length,
      };
      continue;
    }
    current.body += `${line}\n`;
  }
  sections.push(current);
  return sections.filter((s) => s.heading !== '(preamble)' || s.body.trim());
}

function findPlaceholders(body) {
  const found = [];
  // Markdown リンクのラベルは除外するため、先にリンクを潰す
  const stripped = String(body || '').replace(/\[[^\]]+\]\([^)]+\)/g, ' ');
  const re = /\[([^\]\n]+)\]/g;
  let match = re.exec(stripped);
  while (match) {
    const full = `[${match[1]}]`;
    if (PLACEHOLDER_RE.test(full) || looksLikeTemplateBracket(match[1])) {
      found.push(full);
    }
    match = re.exec(stripped);
  }
  return found;
}

function looksLikeTemplateBracket(inner) {
  const text = String(inner || '').trim();
  if (!text) return false;
  if (text.includes('...')) return true;
  if (text.includes('例:')) return true;
  if (/^YYYY/.test(text)) return true;
  // 短い汎用ラベル（テンプレ表セル）
  if (
    /^(?:role|制約|計算式|丸めルール|pending, approved, rejected|draft, confirmed, closed|manual_fields.*|locked_fields.*)$/i.test(
      text,
    )
  ) {
    return true;
  }
  return false;
}

function severityForSection(sectionId) {
  const id = String(sectionId || '');
  if (CRITICAL_SECTION_RE.test(id)) return 'critical';
  if (HIGH_SECTION_RE.test(id)) return 'high';
  return 'medium';
}

function isSparseSection(section) {
  const body = section.body.trim();
  // 親見出しの直後が子見出しだけの場合、body は空になる。それは構造であり sparse ではない。
  if (!body) return false;

  // 表だけで全部プレースホルダなら sparse（placeholder finding と二重でもよいが、テンプレ表専用）
  const meaningful = body
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('|---') && !/^\|?\s*---/.test(l));

  if (meaningful.length === 0) return true;

  const nonTable = meaningful.filter((l) => !l.startsWith('|'));
  const tableRows = meaningful.filter((l) => l.startsWith('|') && !/^\|\s*[-: ]+\|/.test(l));

  // 見出し＋表ヘッダ＋テンプレ1行だけ
  if (nonTable.length === 0 && tableRows.length <= 2) {
    const joined = tableRows.join(' ');
    if (findPlaceholders(joined).length > 0 || /`\[/.test(joined)) return true;
  }

  return false;
}

function needsEvidenceLink(section) {
  const body = section.body.trim();
  if (!body) return false;
  if (findPlaceholders(body).length > 0) return false; // placeholder 側で拾う
  if (FILE_HINT_RE.test(body)) return false;
  if (/関連\s*[:：]/.test(body)) return false;

  // 決定・禁止・必須っぽい具体文があるのにパスが無い
  const decisionLike =
    /決定|禁止|必須|壊してはいけ|守る|再発防止|SSoT|Hard Boundary|RLS/.test(
      `${section.heading}\n${body}`,
    );
  if (!decisionLike) return false;

  // テンプレ説明だけの短い節は除外（プレースホルダ無し・抽象のみ）
  const bullets = body.split('\n').filter((l) => /^[-*]\s+/.test(l.trim()));
  if (bullets.length === 0 && body.length < 40) return false;

  return true;
}

function sortFindings(findings) {
  const order = { critical: 0, high: 1, medium: 2 };
  return [...findings].sort((a, b) => {
    const sev = (order[a.severity] ?? 9) - (order[b.severity] ?? 9);
    if (sev !== 0) return sev;
    return String(a.id).localeCompare(String(b.id));
  });
}

function uniqueSample(items, limit) {
  return [...new Set(items)].slice(0, limit);
}

function slugId(heading) {
  return heading
    .toLowerCase()
    .replace(/[^\w\u3040-\u30ff\u4e00-\u9faf]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40) || 'section';
}
