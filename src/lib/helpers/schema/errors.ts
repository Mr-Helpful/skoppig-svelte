export type Result<Data, Error> = { data: Data } | { error: Error }

export class NotConnectedError extends Error {
  name = 'NotConnectedError'
  message = 'Input is not connected'
}

export class InputError {
  name = 'InputError'
  message

  constructor(input_idx: number, public cause: Error) {
    this.message = `Input ${input_idx} is an error`
  }
}
