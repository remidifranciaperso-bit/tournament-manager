/** Base URL des appels Engine V2 depuis le build Platform (service distant). */
export function engineV2ApiUrl(path: string): string {
  const base = (import.meta.env.VITE_ENGINE_V2_URL as string | undefined)?.replace(/\/$/, "");
  if (import.meta.env.VITE_DEPLOY_TARGET === "platform" && base && path.startsWith("/api/")) {
    return `${base}${path}`;
  }
  return path;
}

export const isPlatformBuild = import.meta.env.VITE_DEPLOY_TARGET === "platform";
