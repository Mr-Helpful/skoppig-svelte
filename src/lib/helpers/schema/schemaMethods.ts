import type { FlowNode } from './schema.js'
import { difference, toArray } from './setMethods.js'
import { graphChildren, toGraph, graphRootsFrom } from './graphMethods.js'

/** All descendants of nodes within a schema */
export const childrenOf = (ids: string[], schema: FlowNode[]): Set<string> => {
  return graphChildren(ids, toGraph(schema))
}

/**
 * Tests whether there is a cycle in the graph containing the specified nodes
 *
 * @param id The id of the node to check from
 * @param schema The schema to check within
 */
export const cycleWith = (ids: string[], schema: FlowNode[]): boolean => {
  const children = childrenOf(ids, schema)
  return ids.every(id => children.has(id))
}

/** Finds **all** roots in a schema */
export const rootsIn = (schema: FlowNode[]): Set<string> => {
  return new Set(
    schema
      .filter(({ output_nodes }) => output_nodes.length === 0)
      .map(({ id }) => id)
  )
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
  schema: FlowNode[]
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
  schema: FlowNode[]
): [string, number][] => {
  return schema
    .filter(({ id }) => ids.has(id))
    .flatMap(({ id, input_nodes }): [string, number][] =>
      input_nodes.map((_, i) => [id, i])
    )
}

/**
 * Splits a schema into a segment of the graph and everything else,
 * based on the provided set of nodes
 */
export const splitSchema = (
  ids: Set<string>,
  schema: FlowNode[]
): { in_schema: FlowNode[]; out_schema: FlowNode[] } => {
  let in_schema: FlowNode[] = []
  let out_schema: FlowNode[] = []
  for (const node of schema) {
    if (ids.has(node.id)) in_schema.push(node)
    else out_schema.push(node)
  }

  return { in_schema, out_schema }
}

type SelectGraph<FlowData> = {
  node: FlowNode<FlowData[], FlowData>
  selected: boolean
}[]

/** Finds all currently selected nodes in the schema */
export const selectedIds = <Data>(schema: SelectGraph<Data>): string[] => {
  return schema.filter(({ selected }) => selected).map(({ node: { id } }) => id)
}

/** Selects all nodes in a schema from a given set */
export const selectIn = <Data>(
  ids: Set<string>,
  schema: SelectGraph<Data>
): SelectGraph<Data> => {
  return schema.map(({ node }) => ({ node, selected: ids.has(node.id) }))
}
