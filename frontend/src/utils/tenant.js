// The central application lives on the root domain.
export function isCentralHost() {
  const host = window.location.hostname.toLowerCase();
  return (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "mytenantdemo.site" ||
    host === "www.mytenantdemo.site"
  );
}

// Tenant development: http://pratik:5173 -> pratik
// Tenant production: https://pratik.mytenantdemo.site -> pratik
export function getTenantIdentifier() {
  const host = window.location.hostname.toLowerCase();
  if (isCentralHost()) return "";
  if (host.endsWith(".mytenantdemo.site")) return host.replace(/\.mytenantdemo\.site$/i, "");
  if (host.endsWith(".local")) return host.replace(/\.local$/i, "");
  return host.split(".")[0] || "";
}

export function getTenantLoginUrl(identifier = getTenantIdentifier()) {
  if (!identifier) return "/login";
  const host = window.location.hostname.toLowerCase();
  if (host === "localhost" || host === "127.0.0.1") return `http://${identifier}:5173/login`;
  if (host.endsWith(".mytenantdemo.site")) return `https://${identifier}.mytenantdemo.site/login`;
  return `http://${identifier}:5173/login`;
}
