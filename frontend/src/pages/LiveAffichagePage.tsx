import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { LiveBroadcastContent } from "../manager/LiveBroadcastContent";
import { loadBroadcastOutput } from "../manager/liveBroadcastStore";
import type { BroadcastableTab } from "../manager/liveRetransmission";
import { loadLiveSession } from "../manager/liveSessionStore";

export default function LiveAffichagePage() {
  const { token } = useParams<{ token: string }>();
  const output = token ? loadBroadcastOutput(token) : null;
  const session = loadLiveSession();

  const liveData =
    session && output && session.liveData.live_token === output.liveToken
      ? session.liveData
      : null;

  const [rotateIndex, setRotateIndex] = useState(0);

  const activeTab = useMemo((): BroadcastableTab | null => {
    if (!output || output.tabs.length === 0) return null;

    switch (output.mode) {
      case "fixed":
      case "mirror":
        return output.fixedTab ?? output.tabs[0] ?? null;
      case "multi":
        return output.dedicatedTab ?? output.tabs[0] ?? null;
      case "rotation":
        return output.tabs[rotateIndex % output.tabs.length] ?? null;
      default:
        return output.tabs[0] ?? null;
    }
  }, [output, rotateIndex]);

  useEffect(() => {
    if (!output || output.mode !== "rotation" || output.tabs.length <= 1) return;

    const timer = window.setInterval(() => {
      setRotateIndex((index) => (index + 1) % output.tabs.length);
    }, output.rotationSeconds * 1000);

    return () => window.clearInterval(timer);
  }, [output]);

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

  if (!liveData || !activeTab) {
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

  return <LiveBroadcastContent liveData={liveData} activeTab={activeTab} />;
}
