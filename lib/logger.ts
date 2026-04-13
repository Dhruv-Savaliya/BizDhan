type LogMeta = Record<string, unknown> | undefined;

function write(level: "info" | "warn" | "error", msg: string, meta?: LogMeta) {
  const ts = Date.now();
  const payload = { level, msg, ...(meta ?? {}), ts };

  if (process.env.NODE_ENV === "production") {
    console.log(JSON.stringify(payload));
    return;
  }

  const method = level === "error" ? console.error : level === "warn" ? console.warn : console.log;
  method(`[${new Date(ts).toISOString()}] ${level.toUpperCase()} ${msg}`, meta ?? {});
}

export const logger = {
  info(msg: string, meta?: LogMeta) {
    write("info", msg, meta);
  },
  warn(msg: string, meta?: LogMeta) {
    write("warn", msg, meta);
  },
  error(msg: string, meta?: LogMeta) {
    write("error", msg, meta);
  },
};
