export default function AppLoading() {
  return (
    <div className="flex-1 flex items-center justify-center h-screen t-bg">
      <div className="flex flex-col items-center gap-3">
        <div className="w-6 h-6 border-2 border-[var(--t-border)] border-t-[var(--t-accent)] rounded-full animate-spin" />
        <span className="font-mono text-xs t-faint">Loading...</span>
      </div>
    </div>
  );
}
