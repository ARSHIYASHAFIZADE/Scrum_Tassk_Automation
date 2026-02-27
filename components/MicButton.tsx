type Status = "idle" | "connecting" | "connected" | "error" | "stopping";

interface MicButtonProps {
  status: Status;
  onStart: () => void;
  onStop: () => void;
}

const MicIcon = ({ className }: { className?: string }) => (
  <svg
    width="28"
    height="28"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
    <line x1="12" y1="19" x2="12" y2="22" />
    <line x1="8" y1="22" x2="16" y2="22" />
  </svg>
);

const StopIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
    <rect x="4" y="4" width="16" height="16" rx="2" />
  </svg>
);

const SpinnerIcon = () => (
  <svg
    className="animate-spin"
    width="26"
    height="26"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
  >
    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
  </svg>
);

export default function MicButton({ status, onStart, onStop }: MicButtonProps) {
  const isActive    = status === "connected";
  const isBusy      = status === "connecting" || status === "stopping";
  const isError     = status === "error";

  function handleClick() {
    if (isBusy) return;
    if (isActive) {
      onStop();
    } else {
      onStart();
    }
  }

  return (
    <div className="relative flex items-center justify-center">
      {/* Pulsing ring — only when recording */}
      {isActive && (
        <>
          <span className="absolute inline-flex h-24 w-24 rounded-full bg-violet-500/20 animate-ping" />
          <span className="absolute inline-flex h-20 w-20 rounded-full bg-violet-500/10 animate-ping [animation-delay:0.3s]" />
        </>
      )}

      <button
        onClick={handleClick}
        disabled={isBusy}
        aria-label={isActive ? "Stop transcription" : "Start transcription"}
        className={`
          relative z-10 flex items-center justify-center
          w-20 h-20 rounded-full
          border-2 transition-all duration-300 ease-in-out
          focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950
          ${isActive
            ? "bg-violet-600 border-violet-500 text-white shadow-2xl shadow-violet-900/50 scale-110"
            : isBusy
            ? "bg-zinc-800 border-zinc-700 text-zinc-500 cursor-not-allowed"
            : isError
            ? "bg-zinc-800 border-red-800/50 text-red-400 hover:border-red-600 hover:scale-105"
            : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-violet-600/60 hover:bg-zinc-700 hover:text-zinc-200 hover:scale-105 active:scale-95"
          }
        `}
      >
        {isBusy  ? <SpinnerIcon />
        : isActive ? <StopIcon />
        : <MicIcon />}
      </button>
    </div>
  );
}
