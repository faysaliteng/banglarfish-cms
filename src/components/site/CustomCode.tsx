import { useEffect } from "react";

// Tracks what we've already injected so re-renders don't duplicate. Resets on
// full page reload (fresh module), which is the desired behaviour.
const injected = new Set<string>();

function inject(html: string, target: HTMLElement, marker: string) {
  if (!html || !html.trim() || injected.has(marker)) return;
  injected.add(marker);
  const tpl = document.createElement("template");
  tpl.innerHTML = html;
  Array.from(tpl.content.childNodes).forEach((node) => {
    // Scripts inserted via innerHTML don't execute — recreate them so they do.
    if (node.nodeType === 1 && (node as Element).tagName === "SCRIPT") {
      const old = node as HTMLScriptElement;
      const s = document.createElement("script");
      for (const attr of Array.from(old.attributes)) s.setAttribute(attr.name, attr.value);
      s.textContent = old.textContent;
      target.appendChild(s);
    } else {
      target.appendChild(node.cloneNode(true));
    }
  });
}

/**
 * Injects the admin's custom <head> and footer HTML/JS on the client (analytics,
 * chat widgets, pixels, meta). Custom CSS is injected separately (SSR) in the
 * root. Manager-authored, storefront-only — never runs server code.
 */
export function CustomCode({ headHtml, bodyEnd }: { headHtml: string; bodyEnd: string }) {
  useEffect(() => {
    if (typeof document === "undefined") return;
    inject(headHtml, document.head, "bf-cc-head");
    inject(bodyEnd, document.body, "bf-cc-body");
  }, [headHtml, bodyEnd]);
  return null;
}
