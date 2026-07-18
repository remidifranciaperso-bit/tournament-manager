import { ExportCaptureLayer } from "../manager/ExportCaptureLayer";
import type { ExportCaptureTarget } from "../manager/exportCapture";
import type {
  LiveLayoutField,
  LiveMatch,
  LivePageMap,
  LiveTournamentMeta,
} from "../manager/liveTypes";

interface EngineV2ExportCaptureProps {
  target: ExportCaptureTarget | null;
  templateId: string;
  pageMap: LivePageMap;
  matches: LiveMatch[];
  planningLayout: Record<string, LiveLayoutField[]>;
  meta: LiveTournamentMeta;
  fields: Record<string, string>;
}

/** Couche off-screen identique à l'export Manager Live (captures DOM). */
export function EngineV2ExportCapture({
  target,
  templateId,
  pageMap,
  matches,
  planningLayout,
  meta,
  fields,
}: EngineV2ExportCaptureProps) {
  return (
    <ExportCaptureLayer
      target={target}
      templateId={templateId}
      pageMap={pageMap}
      matches={matches}
      matchResults={{}}
      completed={new Set()}
      planningLayout={planningLayout}
      meta={meta}
      fields={fields}
    />
  );
}
