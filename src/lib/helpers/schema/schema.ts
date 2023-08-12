import {
  type Result,
  InputError,
  NotConnectedError,
  ProcessError
} from './errors.js'

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

/*
36^8 = 2.82e12 unique ids
ids are only used for active nodes in a graph, so this should be plenty
*/
let i = 0
function get_id(name: string): string {
  return `${(i++).toString(36).padStart(8, '0')}-${name}`
}

export class FlowNode<Inputs extends any[] = any[], Output = any, Data = any> {
  /** A unique identifier for this node.
   *
   * This is used to identify nodes in the graph.
   */
  id: string
  /** The cached result of the most recent update to the node.
   *
   * - If any of the inputs are invalid, this will be an InputError.
   * - If the update function throws an error, this will be that Error.
   */
  cached: Result<Output, Error | InputError>
  /** The ids of nodes currently connected to this node's inputs.
   *
   * These will be undefined if the input is not connected.
   * These are primarily used to collect cached data from lower nodes.
   */
  input_nodes: (FlowNode | undefined)[]
  /** A list of the ids of nodes and index of the input to update.
   *
   * This will be used to pass updates upwards through the graph.
   *
   * TODO: This should be type checked for validity (see [stackoverflow](https://stackoverflow.com/questions/76885944/typescript-type-for-validly-indexed-tuples)).
   */
  output_nodes: [FlowNode, number][]

  constructor(
    /** The type of process that this node represents */
    public type: string,
    /** A function used to update the data attached to a node.
     *
     * Called whenever all inputs are updated and are valid.
     */
    public process: (...args: Inputs) => Promise<Output>
  ) {
    this.id = get_id(type)
    this.cached = { error: new InputError(0, new NotConnectedError()) }
    this.input_nodes = new Array(process.length).fill(undefined)
    this.output_nodes = []
  }

  /** Connects this node's output to another node's input.
   * @param node The node to connect to this node's output.
   * @param index The index of the input to connect to.
   */
  add_output(node: FlowNode, index: number) {
    this.output_nodes.push([node, index])
    node.input_nodes[index] = this as unknown as FlowNode
  }

  /** Disconnects this node's output from another node's input.
   * @param node The node to disconnect from this node's output.
   * @param index The index of the input to disconnect.
   */
  remove_output(node: FlowNode, index: number) {
    this.output_nodes = this.output_nodes.filter(
      ([n, i]) => n !== node || i !== index
    )
    node.input_nodes[index] = undefined
  }

  /**
   * Tests whether an input is connected and has no errors.
   * @param node_idx the index of the input to check
   * @returns An error if the input is not connected or has an error.
   */
  private error_at(node_idx: number): Error | undefined {
    const input = this.input_nodes[node_idx]
    if (input === undefined) {
      return new InputError(node_idx, new NotConnectedError())
    } else if (input.cached.error !== undefined) {
      return new InputError(node_idx, input.cached.error)
    }
  }

  /**
   * Tests whether all inputs are connected and have no errors.
   * @returns undefined if all errors are resolved, otherwise the first error.
   */
  private errors_resolved(): Error | undefined {
    for (const i in this.input_nodes) {
      const error = this.error_at(Number(i))
      if (error !== undefined) return error
    }
  }

  /** Runs the update function and sets the cached value. */
  private async run_process(): Promise<void> {
    const inputs = this.input_nodes.map(node => node?.cached.data)
    try {
      const data = await this.process(...(inputs as Inputs))
      this.cached = { data }
    } catch (error) {
      this.cached = { error: new ProcessError(error) }
    }
  }

  /**
   * Reads the inputs and sets the cached value using the update function.
   * @returns A promise that resolves when the node's cache and all downstream nodes are updated.
   */
  async update(): Promise<void> {
    const error = this.errors_resolved()
    if (error !== undefined) this.cached = { error }
    else await this.run_process()

    await Promise.all(this.output_nodes.map(([node, _]) => node.update()))
  }
}
