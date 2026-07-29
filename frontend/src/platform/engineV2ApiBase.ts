/** Appels Engine V2 : sur Platform, prepare/export passent en local (même origine). */
export function engineV2ApiUrl(path: string): string {
  if (import.meta.env.VITE_DEPLOY_TARGET === "platform" && path.startsWith("/api/")) {
    return path;
  }
  const base = (import.meta.env.VITE_ENGINE_V2_URL as string | undefined)?.replace(/\/$/, "");
  if (base && path.startsWith("/api/")) {
    return `${base}${path}`;
  }
  return path;
}

export const isPlatformBuild = import.meta.env.VITE_DEPLOY_TARGET === "platform";
