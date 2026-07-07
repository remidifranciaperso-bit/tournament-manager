import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("App crash:", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-dvh flex-col items-center justify-center bg-arena-950 px-6 text-center text-white">
          <p className="font-display text-2xl text-lime">Erreur d&apos;affichage</p>
          <p className="mt-4 max-w-lg text-sm text-white/55">
            {this.state.error.message}
          </p>
          <button
            type="button"
            className="mt-8 rounded-xl bg-lime px-6 py-3 text-sm font-bold text-arena-950"
            onClick={() => window.location.reload()}
          >
            Recharger
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
