import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { LiveBroadcastContent } from "../manager/LiveBroadcastContent";
import { loadBroadcastOutput } from "../manager/liveBroadcastStore";
import {
  expandBroadcastSchedule,
  type BroadcastFrame,
} from "../manager/liveRetransmission";
import { loadLiveSession } from "../manager/liveSessionStore";

function resolveActiveFrame(
  output: NonNullable<ReturnType<typeof loadBroadcastOutput>>,
  liveData: NonNullable<ReturnType<typeof loadLiveSession>>["liveData"],
  rotateIndex: number
): BroadcastFrame | null {
  if (output.tabs.length === 0) return null;

  switch (output.mode) {
    case "rotation": {
      const frames = expandBroadcastSchedule(output.tabs, liveData.page_map);
      return frames[rotateIndex % frames.length] ?? null;
    }
    case "fixed":
    case "mirror":
      return { tab: output.fixedTab ?? output.tabs[0] };
    case "multi":
      return { tab: output.dedicatedTab ?? output.tabs[0] };
    default:
      return { tab: output.tabs[0] };
  }
}

export default function LiveAffichagePage() {
  const { token } = useParams<{ token: string }>();
  const output = token ? loadBroadcastOutput(token) : null;
  const session = loadLiveSession();

  const liveData =
    session && output && session.liveData.live_token === output.liveToken
      ? session.liveData
      : null;

  const [rotateIndex, setRotateIndex] = useState(0);

  const rotationFrames = useMemo(() => {
    if (!output || !liveData || output.mode !== "rotation") return [];
    return expandBroadcastSchedule(output.tabs, liveData.page_map);
  }, [output, liveData]);

  const activeFrame = useMemo((): BroadcastFrame | null => {
    if (!output || !liveData) return null;
    return resolveActiveFrame(output, liveData, rotateIndex);
  }, [output, liveData, rotateIndex]);

  useEffect(() => {
    if (rotationFrames.length <= 1) return;

    const timer = window.setInterval(() => {
      setRotateIndex((index) => (index + 1) % rotationFrames.length);
    }, (output?.rotationSeconds ?? 10) * 1000);

    return () => window.clearInterval(timer);
  }, [rotationFrames.length, output?.rotationSeconds]);

  useEffect(() => {
    const enterFullscreen = () => {
      void document.documentElement.requestFullscreen?.().catch(() => {});
    };
    const timer = window.setTimeout(enterFullscreen, 400);
    return () => window.clearTimeout(timer);
  }, []);

  if (!token || !output) {
    return (
      <div className="flex h-dvh items-center justify-center bg-white px-6 text-center">
        <p className="text-sm text-arena-600/60">
          Lien d&apos;affichage invalide ou expiré.
        </p>
      </div>
    );
  }

  if (!liveData || !activeFrame) {
    return (
      <div className="flex h-dvh items-center justify-center bg-white px-6 text-center">
        <p className="text-sm text-arena-600/60">
          Tournoi live introuvable. Ouvrez d&apos;abord le manager sur cet
          appareil, ou relancez la retransmission depuis l&apos;onglet
          Retransmission.
        </p>
      </div>
    );
  }

  return (
    <LiveBroadcastContent
      liveData={liveData}
      activeTab={activeFrame.tab}
      activeSubPage={activeFrame.subPage}
    />
  );
}
