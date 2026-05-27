type LogPayload = unknown;

function serialize(payload: LogPayload): string {
  if (payload instanceof Error) {
    return `${payload.name}: ${payload.message}\n${payload.stack ?? ''}`;
  }

  if (typeof payload === 'string') return payload;

  try {
    return JSON.stringify(payload);
  } catch {
    return String(payload);
  }
}

export const logger = {
  debug(message: string, payload?: LogPayload) {
    console.log(`[debug] ${message}${payload === undefined ? '' : ` ${serialize(payload)}`}`);
  },
  info(message: string, payload?: LogPayload) {
    console.log(`[info] ${message}${payload === undefined ? '' : ` ${serialize(payload)}`}`);
  },
  warn(message: string, payload?: LogPayload) {
    console.warn(`[warn] ${message}${payload === undefined ? '' : ` ${serialize(payload)}`}`);
  },
  error(message: string, payload?: LogPayload) {
    console.error(`[error] ${message}${payload === undefined ? '' : ` ${serialize(payload)}`}`);
  },
};
