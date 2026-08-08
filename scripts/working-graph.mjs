#!/usr/bin/env node
/**
 * Working Graph CLI（薄い共有メモリ）。
 *
 * 例:
 *   pnpm run working-graph -- summary
 *   pnpm run working-graph -- upsert-entity --type=SCREEN --name=給与明細 --description=表示ズレ
 *   pnpm run working-graph -- add-relation --source=SCREEN:kyuyo --predicate=touches --target=TABLE:payroll
 */
import {
  DEFAULT_WORKING_GRAPH_PATH,
  addRelation,
  loadWorkingGraph,
  makeEntityId,
  saveWorkingGraph,
  summarizeWorkingGraph,
  upsertEntity,
} from './lib/working-graph.mjs';

const args = process.argv.slice(2);
const jsonMode = args.includes('--json');
const filePath = process.env.WORKING_GRAPH_FILE || DEFAULT_WORKING_GRAPH_PATH;

function readFlag(name) {
  const hit = args.find((arg) => arg.startsWith(`${name}=`));
  return hit ? hit.slice(name.length + 1) : null;
}

function main() {
  const command = args.find((arg) => !arg.startsWith('--')) || 'summary';
  let graph = loadWorkingGraph(filePath);

  if (graph.error) {
    console.error(graph.error);
    process.exit(1);
  }

  if (command === 'summary') {
    const summary = summarizeWorkingGraph(graph);
    if (jsonMode) {
      console.log(JSON.stringify({ path: filePath, graph, summary }, null, 2));
    } else {
      console.log(`[working-graph] ${filePath}`);
      console.log(summary.markdown);
    }
    return;
  }

  if (command === 'upsert-entity') {
    const type = readFlag('--type');
    const name = readFlag('--name');
    const description = readFlag('--description') || '';
    const evidence = (readFlag('--evidence') || '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
    graph = upsertEntity(graph, { type, name, description, evidence });
    saveWorkingGraph(graph, filePath);
    if (jsonMode) {
      console.log(JSON.stringify(graph, null, 2));
    } else {
      console.log(`[working-graph] upsert entity: ${makeEntityId(type, name)}`);
    }
    return;
  }

  if (command === 'add-relation') {
    const source = readFlag('--source');
    const predicate = readFlag('--predicate');
    const target = readFlag('--target');
    const evidence = (readFlag('--evidence') || '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
    graph = addRelation(graph, { source, predicate, target, evidence });
    saveWorkingGraph(graph, filePath);
    if (jsonMode) {
      console.log(JSON.stringify(graph, null, 2));
    } else {
      console.log(`[working-graph] add relation: ${source} --${predicate}--> ${target}`);
    }
    return;
  }

  console.error(`未対応コマンド: ${command}`);
  console.error('summary | upsert-entity | add-relation');
  process.exit(1);
}

main();
