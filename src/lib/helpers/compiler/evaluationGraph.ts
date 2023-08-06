import type { RenderNode } from '../../src/BrushNode/renderNodes.js'
import type { Schema } from '../beautiful-react-diagrams'
import { portToNode, rootsIn } from '../schema/schemaMethods.js'

type FlatNode = [RenderNode, string[]]
type FlatGraph = { [key: string]: FlatNode }

function toFlatGraph({ nodes, links }: Schema): FlatGraph {
  const portMap = portToNode({ nodes, links })
  return Object.fromEntries(
    nodes.map(({ id, outputs, data: { instance } }) => [
      id,
      [instance, outputs.map(({ id }) => portMap[id])]
    ])
  )
}

function toTransformOrder(
  graph: FlatGraph,
  id: string,
  order: string[] = [],
  found: Set<string> = new Set(),
  covered: Set<string> = new Set()
): string[] {
  if (found.has(id)) throw new Error('Graph has a cycle!')
  if (covered.has(id)) return order

  found.add(id)
  for (let cId of graph[id][1]) {
    if (cId) toTransformOrder(graph, cId, order, found, covered)
  }

  found.delete(id)
  covered.add(id)
  order.push(id)
  return order
}

/** [Transform to use, write to, read from] */
export type Transform = [RenderNode, number, number[]]

export function toTransforms(schema: Schema): Transform[] {
  const root = rootsIn(schema)[0] // find some root in the graph
  const graph = toFlatGraph(schema)
  const order = toTransformOrder(graph, root)
  const reverse = Object.fromEntries(order.map((k, i) => [k, i]))

  const noSources = Object.values(graph).flatMap(node =>
    node[1].filter(id => id === undefined)
  ).length

  let sourceNo = 0
  return new Array(noSources)
    .fill(0)
    .map((_, i): Transform => [undefined, i, []])
    .concat(
      order.map((id, i) => {
        const [render, outputs] = graph[id]
        return [
          render,
          i + noSources,
          outputs.map(cId =>
            cId === undefined ? sourceNo++ : reverse[cId] + noSources
          )
        ]
      })
    )
}

function isComplete<T>(nodes: T[], colours: Map<T, number>) {
  return nodes.every(n => colours.get(n) !== undefined)
}

/** Add a single colour to the graph, respecting the colour constraints */
function addColour<T>(
  nodes: T[],
  graph: Map<T, T[]>,
  colours: Map<T, number>,
  colour: number
): Map<T, number> {
  for (const node of nodes) {
    if (
      colours.get(node) === undefined &&
      graph.get(node).every(c => colours.get(c) !== colour)
    ) {
      colours.set(node, colour)
    }
  }
  return colours
}

/** A greedy algorithm for graph colouring */
function greedyColour<T>(nodes: T[], links: [T, T][]): number[] {
  let colours = new Map<T, number>()
  const graph = new Map<T, T[]>()
  for (const [i, j] of links) {
    graph.set(i, (graph.get(i) ?? []).concat([j]))
    graph.set(j, (graph.get(j) ?? []).concat([i]))
  }

  let colour = 0
  while (!isComplete(nodes, colours)) {
    colours = addColour(nodes, graph, colours, colour++)
  }
  return nodes.map(n => colours.get(n))
}

/**
 * Attempts to reduce the amount of memory (the size of array) needed to
 * evaluate a graph of transformations.
 * Uses common techniques for register allocation (Graph coloring allocation)
 * @param graph the transform graph to optimise
 */
export function optimiseTransforms(graph: Transform[]): Transform[] {
  let conflicts = new Set<[number, number]>()
  let live = new Set<number>()

  for (let i = graph.length - 1; i >= 0; i--) {
    live.delete(graph[i][1])

    for (let j of graph[i][2]) {
      for (let k of Array.from(live)) {
        conflicts.add([j, k])
      }
      live.add(j)
    }
  }

  // create a conflict graph and use a greedy algorithm to solve it
  const nodes = graph.map((_, i) => i)
  const links = Array.from(conflicts)
  const colours = greedyColour(nodes, links)

  // use the output colouring to optimise the allocations
  return graph.map(([renderer, input, outputs]) => [
    renderer,
    colours[input],
    outputs.map(output => colours[output])
  ])
}
