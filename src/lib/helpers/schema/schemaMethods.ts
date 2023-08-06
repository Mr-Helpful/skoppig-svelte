import type { FlowNode, FlowGraph } from './schema.js'
import { difference, toArray } from './setMethods.js'
import {
  graphChildren,
  toGraph,
  graphRootsFrom,
  graphRoots
} from './graphMethods.js'

/** All descendants of nodes within a schema */
export const childrenOf = (ids: string[], schema: FlowGraph): Set<string> => {
  return graphChildren(ids, toGraph(schema))
}

/**
 * Tests whether there is a cycle in the graph containing the specified nodes
 *
 * @param id The id of the node to check from
 * @param schema The schema to check within
 */
export const cycleWith = (ids: string[], schema: FlowGraph): boolean => {
  const children = childrenOf(ids, schema)
  return ids.every(id => children.has(id))
}

/** Finds **all** roots in a schema */
export const rootsIn = (schema: FlowGraph): Set<string> => {
  return graphRoots(toGraph(schema))
}

// /** Finds all roots in a schema accessible from nodes */
// export const rootsFrom = (ids: string[], schema: Schema): Set<string> => {
//   return graphRootsFrom(ids, toGraph(schema))
// }

/**
 * Uses a breadth first search to find all nodes
 * that **only** contribute to the given node
 */
export const collapsibleFrom = (
  ids: string[],
  schema: FlowGraph
): Set<string> => {
  const graph = toGraph(schema)

  // nodes accessible from the id
  const children_with = graphChildren(ids, graph)

  // nodes accessible from the graph without the node
  const rootSet = graphRootsFrom(ids, graph)
  for (const id of ids) delete graph[id]
  const children_without = graphChildren(toArray(rootSet), graph)

  // nodes only accessible via specified nodes
  return difference(children_with, children_without)
}

/**
 * Calculates all ports on the exterior of a given set of nodes
 *
 * Example:
 * ```
 * ids:
 * {node0, node1}
 * schema:
 *  ┌──────────┐               ┌──────────┐
 *  │          ├ 0             │          ├ 0
 *  │          │               │          │
 *  ┤  node0   ├ 1         ┌───┤  node1   ├ 1
 *  │          │           │   │          │
 *  │          ├ 2 ────────┘   │          ├ 2
 *  └──────────┘               └──────────┘
 > [
 >  [node0, 0], [node0, 1],
 >  [node1, 0], [node1, 1], [node1, 2]
 > ] // but **not** [node0, 2]
 * ```
 */
export const exposedPorts = (
  ids: Set<string>,
  { nodes }: FlowGraph
): [string, number][] => {
  const node_map = Object.fromEntries(nodes.map(node => [node.id, node]))
  return Array.from(ids, id => node_map[id]).flatMap(node =>
    node.input_nodes
      .filter(input => input !== undefined)
      .map((_, i): [string, number] => [node.id, i])
  )
}

/**
 * Splits nodes into internal nodes and other nodes
 */
const splitNodes = (
  ids: Set<string>,
  { nodes }: FlowGraph
): { inNodes: FlowNode[]; outNodes: FlowNode[] } => {
  let inNodes: FlowNode[] = []
  let outNodes: FlowNode[] = []
  for (const node of nodes) {
    if (ids.has(node.id)) inNodes.push(node)
    else outNodes.push(node)
  }
  return { inNodes, outNodes }
}

/**
 * Splits a schema into a segment of the graph and everything else,
 * based on the provided set of nodes
 */
export const splitSchema = (
  ids: Set<string>,
  { nodes }: FlowGraph
): { inSchema: FlowGraph; outSchema: FlowGraph } => {
  let inNodes: FlowNode[] = []
  let outNodes: FlowNode[] = []
  for (const node of nodes) {
    if (ids.has(node.id)) inNodes.push(node)
    else outNodes.push(node)
  }
  return {
    inSchema: { nodes: inNodes },
    outSchema: { nodes: outNodes }
  }
}

type SelectGraph<FlowData> = FlowGraph<FlowData, { selected: boolean }>

/** Finds all currently selected nodes in the schema */
export const selectedIds = <Data>({ nodes }: SelectGraph<Data>): string[] => {
  return nodes.filter(node => node.data.selected).map(node => node.id)
}

/** Selects all nodes in a schema from a given set */
export const selectIn = <Data>(
  ids: Set<string>,
  { nodes }: SelectGraph<Data>
): SelectGraph<Data> => {
  return {
    nodes: nodes.map(node => ({
      ...node,
      data: { selected: ids.has(node.id) }
    }))
  }
}
