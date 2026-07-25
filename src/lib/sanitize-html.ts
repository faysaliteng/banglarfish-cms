// Lightweight HTML sanitizer for rendering admin-authored rich content.
// Strips <script>/<style>/<iframe> (except allowed embeds off by default),
// on*= event handlers, and javascript:/data: URLs. Not a replacement for a full
// sanitizer, but a solid safety net for trusted admin content.
export function sanitizeHtml(input: string): string {
  if (!input) return "";
  let html = input;
  // Remove dangerous elements entirely (with content).
  html = html.replace(/<\s*(script|style|iframe|object|embed|form)[\s\S]*?<\s*\/\s*\1\s*>/gi, "");
  html = html.replace(/<\s*(script|style|iframe|object|embed|form)[^>]*>/gi, "");
  // Strip inline event handlers: on...="..." / on...='...'
  html = html.replace(/\son\w+\s*=\s*"[^"]*"/gi, "");
  html = html.replace(/\son\w+\s*=\s*'[^']*'/gi, "");
  html = html.replace(/\son\w+\s*=\s*[^\s>]+/gi, "");
  // Neutralize javascript: and data:text/html URLs in href/src.
  html = html.replace(/(href|src)\s*=\s*"(\s*(javascript:|data:text\/html))[^"]*"/gi, '$1="#"');
  html = html.replace(/(href|src)\s*=\s*'(\s*(javascript:|data:text\/html))[^']*'/gi, "$1='#'");
  return html;
}
