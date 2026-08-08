/**
 * 薄い知識Graph層: Working Graph（共有メモリの型付け）。
 *
 * エージェントが整理した Entity / Relation だけを state に残す。
 * 全文書 NER・自動抽出・グラフDBは持たない（本格版へのインターフェース互換）。
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

export const DEFAULT_WORKING_GRAPH_PATH = 'state/working-graph.json';

export const ENTITY_TYPES = ['SCREEN', 'API', 'TABLE', 'SSOT', 'SYMPTOM', 'DOC'];
export const RELATION_PREDICATES = ['touches', 'depends_on', 'reported_in'];

/**
 * @typedef {object} WorkingEntity
 * @property {string} id
 * @property {string} name
 * @property {string} type
 * @property {string} [description]
 * @property {string[]} [evidence]
 */

/**
 * @typedef {object} WorkingRelation
 * @property {string} source
 * @property {string} predicate
 * @property {string} target
 * @property {string[]} [evidence]
 */

export function createEmptyGraph() {
  return {
    version: 1,
    updatedAt: null,
    entities: [],
    relations: [],
  };
}

function slugify(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_\-./\u3040-\u30ff\u4e00-\u9faf]+/gi, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
}

export function makeEntityId(type, name) {
  return `${String(type).toUpperCase()}:${slugify(name)}`;
}

export function normalizeEntity(input) {
  const type = String(input?.type ?? '').toUpperCase();
  if (!ENTITY_TYPES.includes(type)) {
    throw new Error(`未対応の EntityType です: ${input?.type}. 許可: ${ENTITY_TYPES.join(', ')}`);
  }
  const name = String(input?.name ?? '').trim();
  if (!name) throw new Error('Entity.name は必須です。');

  const id = input?.id ? String(input.id) : makeEntityId(type, name);
  return {
    id,
    name,
    type,
    description: String(input?.description ?? '').trim(),
    evidence: Array.isArray(input?.evidence) ? input.evidence.map(String) : [],
  };
}

export function normalizeRelation(input) {
  const predicate = String(input?.predicate ?? '').trim();
  if (!RELATION_PREDICATES.includes(predicate)) {
    throw new Error(
      `未対応の predicate です: ${input?.predicate}. 許可: ${RELATION_PREDICATES.join(', ')}`,
    );
  }
  const source = String(input?.source ?? '').trim();
  const target = String(input?.target ?? '').trim();
  if (!source || !target) throw new Error('Relation.source / target は必須です。');

  return {
    source,
    predicate,
    target,
    evidence: Array.isArray(input?.evidence) ? input.evidence.map(String) : [],
  };
}

export function upsertEntity(graph, input) {
  const entity = normalizeEntity(input);
  const next = {
    version: graph?.version ?? 1,
    updatedAt: new Date().toISOString(),
    entities: [...(graph?.entities ?? [])],
    relations: [...(graph?.relations ?? [])],
  };
  const index = next.entities.findIndex((item) => item.id === entity.id);
  if (index >= 0) {
    next.entities[index] = {
      ...next.entities[index],
      ...entity,
      evidence: [...new Set([...(next.entities[index].evidence ?? []), ...entity.evidence])],
    };
  } else {
    next.entities.push(entity);
  }
  return next;
}

export function addRelation(graph, input) {
  const relation = normalizeRelation(input);
  const next = {
    version: graph?.version ?? 1,
    updatedAt: new Date().toISOString(),
    entities: [...(graph?.entities ?? [])],
    relations: [...(graph?.relations ?? [])],
  };

  const exists = next.relations.some(
    (item) =>
      item.source === relation.source &&
      item.predicate === relation.predicate &&
      item.target === relation.target,
  );
  if (!exists) {
    next.relations.push(relation);
  }
  return next;
}

/**
 * Context に載せる要約（Finite budget 向け）。
 */
export function summarizeWorkingGraph(graph, { maxEntities = 12, maxRelations = 12 } = {}) {
  const entities = graph?.entities ?? [];
  const relations = graph?.relations ?? [];
  const entityLines = entities.slice(0, maxEntities).map((entity) => {
    const desc = entity.description ? ` — ${entity.description}` : '';
    return `- [${entity.type}] ${entity.name}${desc}`;
  });
  const relationLines = relations.slice(0, maxRelations).map((relation) => {
    return `- ${relation.source} --${relation.predicate}--> ${relation.target}`;
  });

  return {
    entityCount: entities.length,
    relationCount: relations.length,
    truncatedEntities: Math.max(0, entities.length - maxEntities),
    truncatedRelations: Math.max(0, relations.length - maxRelations),
    markdown: [
      '## Working Graph（薄い共有メモリ）',
      `- entities: ${entities.length}`,
      `- relations: ${relations.length}`,
      '',
      '### Entities',
      ...(entityLines.length > 0 ? entityLines : ['- なし']),
      '',
      '### Relations',
      ...(relationLines.length > 0 ? relationLines : ['- なし']),
    ].join('\n'),
  };
}

export function loadWorkingGraph(filePath = DEFAULT_WORKING_GRAPH_PATH) {
  if (!existsSync(filePath)) return createEmptyGraph();
  try {
    const parsed = JSON.parse(readFileSync(filePath, 'utf8'));
    return {
      version: parsed.version ?? 1,
      updatedAt: parsed.updatedAt ?? null,
      entities: Array.isArray(parsed.entities) ? parsed.entities : [],
      relations: Array.isArray(parsed.relations) ? parsed.relations : [],
    };
  } catch {
    return {
      ...createEmptyGraph(),
      error: `working-graph を解析できません: ${filePath}`,
    };
  }
}

export function saveWorkingGraph(graph, filePath = DEFAULT_WORKING_GRAPH_PATH) {
  mkdirSync(dirname(filePath), { recursive: true });
  const payload = {
    version: graph.version ?? 1,
    updatedAt: graph.updatedAt ?? new Date().toISOString(),
    entities: graph.entities ?? [],
    relations: graph.relations ?? [],
  };
  writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  return payload;
}
