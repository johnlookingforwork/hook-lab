declare module 'node-webvtt' {
  interface Cue {
    identifier: string
    start: number
    end: number
    text: string
    styles: string
  }

  interface ParseResult {
    valid: boolean
    cues: Cue[]
    errors: unknown[]
    meta: Record<string, string>
  }

  function parse(input: string, options?: { strict?: boolean; meta?: boolean }): ParseResult

  export { parse }
  export default { parse }
}
