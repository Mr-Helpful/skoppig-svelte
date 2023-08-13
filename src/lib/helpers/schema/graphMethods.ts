import type { FlowNode } from './schema.js'
import { intersect } from './setMethods.js'

/**
 * A directed graph representation of a schema
 */
type Graph = { [id: string]: string[] }

/**
 * Creates a linked list representation of the graph from the schema
 * A linked list representation is as so:
 * ```
 * {[n0.id]: [n3.id, n9.id, ..., n2.id],
 *  [n1.id]: [n2.id, n4.id, ..., n7.id],
 *  ...,
 *  [n9.id]: [n0.id, n4.id, ..., n1.id]}
 * ```
 *
 * @param schema The schema to convert from
 * @return The linked list representation
 */
export const toGraph = (nodes: FlowNode[]): Graph => {
  let graph: Graph = {}
  for (const { id, output_nodes } of nodes)
    graph[id] = output_nodes.map(([{ id }, _]) => id)
  return graph
}

/**
 * Uses a breadth search to find all direct descendants of nodes
 * (importantly, this doesn't include the nodes themselves)
 *
 * @param id The id of the node to search from
 * @param graph The linked list graph to search within
 * @return The ids of all direct descendants
 */
export const graphChildren = (ids: string[], graph: Graph): Set<string> => {
  let queue = [...ids]
  let seen = new Set<string>()

  while (queue.length > 0) {
    const id = queue.shift()
    if (id !== undefined && graph[id] !== undefined) {
      for (const sub of graph[id].filter(id => !seen.has(id))) {
        queue.push(sub)
        seen.add(sub)
      }
    }
  }

  return seen
}

/** Flips the direction of all links in a graph */
const reverse = (graph: Graph): Graph => {
  let reversed: Graph = {}
  for (const id in graph) reversed[id] = []

  for (const id in graph) {
    for (const cId of graph[id]) {
      reversed[cId].push(id)
    }
  }
  return reversed
}

/** Transforms a graph into an undirected graph */
const undirect = (graph: Graph): Graph => {
  let undirected: Graph = {}
  for (const id in graph) undirected[id] = []

  for (const id in graph) {
    for (const cId of graph[id]) {
      undirected[cId].push(id)
      undirected[id].push(cId)
    }
  }
  return undirected
}

/** Finds **all** roots in a given graph */
const graphRoots = (graph: Graph): Set<string> => {
  const reversed = reverse(graph)
  const nodeIds = Object.keys(reversed)
  return new Set(nodeIds.filter(id => reversed[id].length === 0))
}

/** Finds all roots within a graph accessible from nodes */
export const graphRootsFrom = (ids: string[], graph: Graph): Set<string> => {
  const connected = graphChildren(ids, undirect(graph))
  return intersect(graphRoots(graph), connected)
}
