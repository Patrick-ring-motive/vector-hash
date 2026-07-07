/**
 * Default document-id hash for Embassy: SHA-256 of the UTF-8 bytes of `text`,
 * lowercase hex-encoded. Kept in its own module so it can be reused or swapped
 * independently. Called as a plain function (no `this`), matching Embassy's
 * `hash` option:
 *
 *   await hash(text) => string
 */
export const hash = async (text) => {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", bytes);

  return [...new Uint8Array(digest)]
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
};

export default hash;
