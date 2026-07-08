/**
 * Cloudflare Worker wrapper for vector-hash.
 *
 * Exposes the default SHA-256 hex hash (see ./hash.js) as an HTTP microservice,
 * mirroring the shape of the edge-embedding worker. The core `hash` function is
 * re-exported on the default export so this module can also be imported
 * directly.
 *
 *   GET  /?text=hello
 *   GET  /?text=hello,world              -> hashes each
 *   POST / { "text": "hello" }
 *   POST / { "text": ["hello", "world"] }
 *
 * Response (single): { "algorithm": "SHA-256", "hash": "..." }
 * Response (multi):  { "algorithm": "SHA-256", "hashes": ["...", "..."] }
 */
import { hash } from "./hash.js";

const isString = x => typeof x === "string" || x instanceof String;
const isArray = x => Array.isArray(x) || x instanceof Array;

// Parse a GET ?text= value into a list: a JSON array if it parses as one,
// otherwise a comma-separated list.
const parseList = x => {
  try {
    const parsed = JSON.parse(x);
    if (isArray(parsed)) return parsed.map(String);
  } catch {
    // Not JSON — fall through to comma splitting.
  }
  return String(x).split(",").map(t => t.trim()).filter(Boolean);
};

const json = (data, status = 200) =>
  new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { "Content-Type": "application/json" }
  });

export default {
  hash,

  async fetch(request) {
    try {
      let text;

      if (request.method === "GET") {
        const url = new URL(request.url);
        const param = url.searchParams.get("text");

        if (param == null)
          return json({ error: 'Missing "text" query parameter.' }, 400);

        const list = parseList(param);
        text = list.length === 1 ? list[0] : list;
      } else if (request.method === "POST") {
        const body = await request.json();
        text = body?.text;
      } else {
        return json({ error: "Method not allowed. Use GET or POST." }, 405);
      }

      if (text == null || (!isString(text) && !isArray(text)))
        return json({ error: 'Missing or invalid "text". Must be a string or array of strings.' }, 400);

      if (isArray(text)) {
        if (!text.every(isString))
          return json({ error: "All text values must be strings." }, 400);

        const hashes = await Promise.all(text.map(hash));
        return json({ algorithm: "SHA-256", hashes });
      }

      return json({ algorithm: "SHA-256", hash: await hash(text) });
    } catch (error) {
      return json({ error: "Internal server error", message: error.message }, 500);
    }
  }
};
