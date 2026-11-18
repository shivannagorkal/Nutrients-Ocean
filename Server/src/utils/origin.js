/**
 * Utility for flexible CORS and CSRF origin verification.
 * Supports exact matches, full URLs, root domains, and wildcards (*.domain.com, *.vercel.app).
 */
export function isOriginAllowed(origin, allowedOrigins = []) {
  if (!origin) return true; // Server-to-server, health probes, curl, non-browser clients
  const cleanOrigin = origin.replace(/\/$/, '').toLowerCase();

  // If no allowed origins specified or contains wildcard '*', allow all
  if (allowedOrigins.length === 0 || allowedOrigins.includes('*')) {
    return true;
  }

  // Exact origin match (e.g. "https://nutrientsocean.com" === "https://nutrientsocean.com")
  if (allowedOrigins.some((o) => o.toLowerCase() === cleanOrigin)) {
    return true;
  }

  // Extract hostname from incoming origin
  let originHost = '';
  try {
    const url = new URL(cleanOrigin.startsWith('http') ? cleanOrigin : `https://${cleanOrigin}`);
    originHost = url.hostname.toLowerCase();
  } catch (_) {
    return false;
  }

  // Check against each configured pattern
  for (const allowed of allowedOrigins) {
    let pattern = allowed.toLowerCase().trim().replace(/\/$/, '');
    if (pattern.startsWith('http://') || pattern.startsWith('https://')) {
      try {
        const pUrl = new URL(pattern);
        pattern = pUrl.hostname;
      } catch (_) {}
    }

    // Wildcard match: *.example.com matches sub.example.com and example.com
    if (pattern.startsWith('*.')) {
      const rootDomain = pattern.slice(2);
      if (originHost === rootDomain || originHost.endsWith('.' + rootDomain)) {
        return true;
      }
    }

    // Domain match: example.com matches example.com and www.example.com / sub.example.com
    if (originHost === pattern || originHost.endsWith('.' + pattern)) {
      return true;
    }
  }

  return false;
}

export default isOriginAllowed;
