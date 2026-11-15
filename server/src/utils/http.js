export class AppError extends Error {
  constructor(status, code, message, details) {
    super(message); this.status = status; this.code = code; this.details = details;
  }
}
export const asyncHandler = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
export const ok = (res, data, meta) => res.json({ success: true, data, ...(meta && { meta }) });
export const created = (res, data) => res.status(201).json({ success: true, data });
