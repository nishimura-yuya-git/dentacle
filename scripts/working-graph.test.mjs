#!/usr/bin/env node
/**
 * Working Graph 単体テスト。
 * 期待値根拠: 薄い共有メモリ（Entity/Relation）。自動 NER はしない。
 */
import {
  addRelation,
  createEmptyGraph,
  makeEntityId,
  summarizeWorkingGraph,
  upsertEntity,
} from './lib/working-graph.mjs';

let failed = 0;

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    failed += 1;
    console.error(`FAIL: ${message}`);
    console.error(`  expected: ${expected}`);
    console.error(`  actual:   ${actual}`);
    return;
  }
  console.log(`PASS: ${message}`);
}

function assertTrue(value, message) {
  assertEqual(Boolean(value), true, message);
}

{
  let graph = createEmptyGraph();
  graph = upsertEntity(graph, {
    type: 'SCREEN',
    name: '給与明細',
    description: '表示ズレ報告の対象画面',
    evidence: ['問題文'],
  });
  graph = upsertEntity(graph, {
    type: 'TABLE',
    name: 'payroll_summaries',
    description: '確定給与',
  });
  graph = addRelation(graph, {
    source: makeEntityId('SCREEN', '給与明細'),
    predicate: 'touches',
    target: makeEntityId('TABLE', 'payroll_summaries'),
  });

  assertEqual(graph.entities.length, 2, 'entity 2件');
  assertEqual(graph.relations.length, 1, 'relation 1件');
  assertEqual(graph.entities[0].type, 'SCREEN', '型が正規化される');
}

{
  let graph = createEmptyGraph();
  graph = upsertEntity(graph, { type: 'SYMPTOM', name: '金額ズレ', description: '初回' });
  graph = upsertEntity(graph, { type: 'SYMPTOM', name: '金額ズレ', description: '更新', evidence: ['再報'] });
  assertEqual(graph.entities.length, 1, '同名同型は upsert');
  assertEqual(graph.entities[0].description, '更新', 'description 更新');
  assertTrue(graph.entities[0].evidence.includes('再報'), 'evidence がマージされる');
}

{
  let threw = false;
  try {
    upsertEntity(createEmptyGraph(), { type: 'PERSON', name: 'x' });
  } catch {
    threw = true;
  }
  assertTrue(threw, '未対応タイプはエラー');
}

{
  let graph = createEmptyGraph();
  for (let i = 0; i < 5; i += 1) {
    graph = upsertEntity(graph, { type: 'DOC', name: `doc-${i}` });
  }
  const summary = summarizeWorkingGraph(graph, { maxEntities: 3, maxRelations: 0 });
  assertEqual(summary.entityCount, 5, '件数は全体');
  assertEqual(summary.truncatedEntities, 2, '要約は truncate');
  assertTrue(summary.markdown.includes('Working Graph'), 'markdown 要約がある');
}

if (failed > 0) {
  console.error(`\n${failed} test(s) failed`);
  process.exit(1);
}

console.log('\nAll working-graph tests passed');
