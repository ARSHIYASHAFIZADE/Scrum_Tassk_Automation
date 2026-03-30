const BAR_HEIGHTS = [
  10, 20, 32, 24, 40, 18, 36, 28, 44, 16, 38, 22,
  48, 30, 20, 42, 14, 34, 26, 44, 18, 36, 24, 40,
  16, 28, 38, 12,
];

interface WaveformProps {
  active: boolean;
}

import { memo } from "react";

export default memo(function Waveform({ active }: WaveformProps) {
  return (
    <div className="flex items-center gap-[3px] h-12">
      {BAR_HEIGHTS.map((maxH, i) => (
        <div
          key={i}
          className="w-[3px] rounded-full origin-bottom transition-colors duration-300"
          style={{
            height: active ? maxH : 4,
            backgroundColor: active ? "var(--t-accent)" : "var(--t-border)",
            animationName: active ? "waveform" : "none",
            animationDuration: `${0.8 + (i % 5) * 0.15}s`,
            animationDelay: `${(i * 0.04) % 0.6}s`,
            animationTimingFunction: "ease-in-out",
            animationIterationCount: "infinite",
            transition: active
              ? "background-color 0.3s"
              : "height 0.4s ease, background-color 0.3s",
          }}
        />
      ))}
    </div>
  );
})
