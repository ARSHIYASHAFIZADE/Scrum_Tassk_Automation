type MicStatus = "idle" | "active" | "busy" | "error";

interface MicButtonProps {
  status: MicStatus;
  onClick: () => void;
}

const MicIcon = ({ className }: { className?: string }) => (
  <svg
    width="26" height="26" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round"
    className={className}
  >
    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
    <line x1="12" y1="19" x2="12" y2="22" />
    <line x1="8" y1="22" x2="16" y2="22" />
  </svg>
);

const StopIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <rect x="5" y="5" width="14" height="14" rx="3" />
  </svg>
);

const SpinnerIcon = () => (
  <svg className="animate-spin" width="24" height="24" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth="2.5">
    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
  </svg>
);

export default function MicButton({ status, onClick }: MicButtonProps) {
  const isActive = status === "active";
  const isBusy   = status === "busy";
  const isError  = status === "error";

  return (
    <div className="relative flex items-center justify-center">
      {/* Pulse rings when recording */}
      {isActive && (
        <>
          <span
            className="absolute w-24 h-24 rounded-full"
            style={{
              backgroundColor: "var(--t-accent)",
              opacity: 0.15,
              animation: "pulse-ring 1.4s ease-out infinite",
            }}
          />
          <span
            className="absolute w-20 h-20 rounded-full"
            style={{
              backgroundColor: "var(--t-accent)",
              opacity: 0.1,
              animation: "pulse-ring 1.4s ease-out 0.4s infinite",
            }}
          />
        </>
      )}

      <button
        onClick={onClick}
        disabled={isBusy}
        aria-label={isActive ? "Stop recording" : "Start recording"}
        className={`
          relative z-10 flex items-center justify-center
          w-[72px] h-[72px] rounded-full border-2 transition-all duration-300
          focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
          ${isActive
            ? "border-[var(--t-accent)] text-[var(--t-accent-fg)] scale-110"
            : isBusy
            ? "t-card border-[var(--t-border)] t-faint cursor-not-allowed opacity-60"
            : isError
            ? "t-card border-[var(--t-error)] text-[var(--t-error)] hover:scale-105"
            : "t-card border-[var(--t-border)] t-muted hover:border-[var(--t-accent)] hover:t-accent-text hover:scale-105 active:scale-95"
          }
        `}
        style={isActive ? { backgroundColor: "var(--t-accent)" } : undefined}
      >
        {isBusy ? <SpinnerIcon /> : isActive ? <StopIcon /> : <MicIcon />}
      </button>
    </div>
  );
}
