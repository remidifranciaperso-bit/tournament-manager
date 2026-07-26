import type { EngineV2PrepareResult } from "../api";
import type { ManagerExportCapture } from "../manager/exportCapture";

/** Snapshot Manager Live compatible init-from-pack (sans fichier JSON téléchargé). */
export function buildPlatformLiveSnapshot(
  prepared: EngineV2PrepareResult,
  exportBundle?: Pick<ManagerExportCapture, "captures" | "crosspageStubs">
): Record<string, unknown> {
  return {
    version: "engine-v2-live-capture-1",
    engine: "v2-live-capture",
    pdf_filename: prepared.pdf_filename,
    meta: prepared.meta,
    matches: prepared.matches,
    fields: prepared.fields,
    page_map: prepared.page_map,
    planning_layout: prepared.planning_layout,
    nb_equipes: prepared.nb_equipes,
    template_id: prepared.template_id,
    equipes: prepared.equipes ?? [],
    export_captures: exportBundle?.captures ?? {},
    crosspage_stubs: exportBundle?.crosspageStubs ?? {},
  };
}
