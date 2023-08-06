import type { Result, InputError } from './errors.js'

/*
Requirements:
- A Schema should be comprised of Nodes
- Each Node should have a single `output` and N `input`s
- Each Node should have a single `render` function with N arguments
- Each `output` should be connected to any number of `input`s
- Each `input` should be connected to a single `output`
- Each node should keep a `cached` value, which is the result of the `render`   
  function on the prior inputs
- This result should be an error if:
  - Any of the inputs are errors
  - The render function throws an error
  - Any of the inputs aren't connected
*/

export type FlowNode<
  Inputs extends any[] = any[],
  Output = any,
  NodeData = any
> = {
  /**
   * A unique identifier for each node,
   * used to identify the inputs and outputs to a node
   */
  id: string
  /**
   * A function used to update the data attached to a node.
   * Called whenever all inputs are updated and are valid.
   */
  update: (...args: Inputs) => Promise<Output>
  /**
   * The cached result of the most recent update to the node.
   * If any of the inputs are invalid, this will be an InputError.
   * If the update function throws an error, this will be that Error.
   */
  cached: Result<Output, Error | InputError>
  /**
   * The ids of nodes currently connected to this node's inputs.
   * These will be undefined if the input is not connected.
   * These are primarily used to collect cached data from lower nodes.
   */
  input_nodes: (string | undefined)[]
  /**
   * A list of the ids of nodes and index of the input to update.
   * This will be used to pass updates upwards through the graph.
   */
  output_nodes: [string, number][]
  /**
   * Extra data that can be attached to a node.
   */
  data: NodeData
}

export type FlowGraph<FlowData = any, NodeData = any> = {
  nodes: FlowNode<FlowData[], FlowData, NodeData>[]
}
