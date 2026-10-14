/**
 * Lightweight request timing for API routes.
 * Adds a `Server-Timing` header (visible in DevTools → Network → Timing)
 * and logs one line per request so latency can be tracked from the server log.
 */
export function withTiming<Args extends unknown[]>(
  name: string,
  handler: (...args: Args) => Promise<Response>
): (...args: Args) => Promise<Response> {
  return async (...args: Args) => {
    const start = performance.now();
    let res: Response;
    try {
      res = await handler(...args);
    } catch (err) {
      const ms = Math.round(performance.now() - start);
      console.log(`[timing] ${name} ERROR ${ms}ms`);
      throw err;
    }
    const ms = Math.round(performance.now() - start);
    const provider = res.headers.get('X-Voice-Provider') || res.headers.get('X-Provider');
    console.log(`[timing] ${name} ${res.status} ${ms}ms${provider ? ` (${provider})` : ''}`);
    try {
      res.headers.append('Server-Timing', `${name};dur=${ms}`);
    } catch {
      // Some responses have immutable headers; timing is still logged.
    }
    return res;
  };
}
