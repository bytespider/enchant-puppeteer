export type LogOptions = {
  level: 'info' | 'debug' | 'error' | 'none'
}

export type Logger = ReturnType<typeof createLogger>

export const createLogger = (options?: Partial<LogOptions>) => {
  const _options: LogOptions = {
    level: 'error',
    ...options,
  }
  const { level } = _options

  return {
    info: (...args: any[]) =>
      ['info', 'debug'].includes(level) ? console.log(...args) : undefined,
    debug: (...args: any[]) =>
      ['debug'].includes(level) ? console.log(...args) : undefined,
    error: (...args: any[]) =>
      ['info', 'debug', 'error'].includes(level)
        ? console.error(...args)
        : undefined,
  }
}
