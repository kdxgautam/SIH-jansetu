/** Server-only reads of the public API, for metadata, sitemaps and link previews.
 *
 * Browser requests reach FastAPI through the /api rewrite, which does not exist
 * during rendering, so the server talks to the backend directly. Every caller
 * here is describing already-public information; nothing private is fetched.
 */
const BACKEND = process.env.BACKEND_URL || "http://127.0.0.1:8000";
export const SITE_URL = (process.env.SITE_URL || "https://jansetu-jharkhand.vercel.app").replace(/\/$/, "");

export async function publicApi<T>(path: string, revalidate = 600): Promise<T | null> {
  try {
    const response = await fetch(`${BACKEND}/api/v1${path}`, { next: { revalidate } });
    return response.ok ? ((await response.json()) as T) : null;
  } catch {
    return null; // A page still renders when the API is briefly unreachable; it just carries default metadata.
  }
}
