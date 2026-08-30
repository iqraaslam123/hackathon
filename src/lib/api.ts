export function jsonError(message: string, status = 400, extra?: Record<string, unknown>) {
  return Response.json({ success: false, message, ...extra }, { status });
}

export function jsonOk(data: Record<string, unknown>, status = 200) {
  return Response.json({ success: true, ...data }, { status });
}
