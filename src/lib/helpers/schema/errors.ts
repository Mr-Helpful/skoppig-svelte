export type Result<Data, Error> = { data?: Data; error?: Error }

export class NotConnectedError extends Error {
  name = 'NotConnectedError'
  message = 'Input is not connected'
}

export class InputError extends Error {
  name = 'InputError'
  message

  constructor(public input_idx: number, public cause: Error) {
    super()
    this.message = `Error in input ${input_idx}`
  }
}

export class ProcessError extends Error {
  name = 'ProcessError'
  message = 'Error in process function'

  constructor(public cause: any) {
    super()
  }
}
