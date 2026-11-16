export function serializeData(data) {
  if (data === null || data === undefined) return data;
  if (typeof data === 'bigint') return data.toString();
  if (Array.isArray(data)) return data.map(serializeData);
  if (typeof data === 'object' && !(data instanceof Date)) {
    const serialized = {};
    for (const [key, value] of Object.entries(data)) {
      serialized[key] = serializeData(value);
    }
    return serialized;
  }
  return data;
}

export function successResponse(res, data = null, message = 'Operation completed successfully', statusCode = 200, meta = {}) {
  return res.status(statusCode).json({
    success: true,
    statusCode,
    message,
    data: serializeData(data),
    meta: {
      timestamp: new Date().toISOString(),
      ...meta,
    },
  });
}

