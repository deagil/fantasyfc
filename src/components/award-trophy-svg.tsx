import { useId } from "react"

import type { TrophyMedal } from "@/lib/trophies/types"

/**
 * Apple Watch–style award badge (Perfect Week hex).
 * Shared silver metal frame; full-face enamel is the tier colour
 * (gold / silver / bronze) — no cream split field.
 */
const awardPalette: Record<
  TrophyMedal,
  {
    accent: string
    accentShade: string
    mark: string
  }
> = {
  gold: {
    accent: "#ebff00",
    accentShade: "#c9d600",
    mark: "#3d195b",
  },
  silver: {
    accent: "#e8e8f0",
    accentShade: "#b0b0be",
    mark: "#3d195b",
  },
  bronze: {
    accent: "#ff8f3d",
    accentShade: "#e05a00",
    mark: "#3d195b",
  },
}

const medalDigit: Record<TrophyMedal, string> = {
  gold: "1",
  silver: "2",
  bronze: "3",
}

/** Rounded hexagon (pointy-top), viewBox 0 0 64 64 */
const HEX_OUTER =
  "M32 5.5c1.2 0 2.3.5 3.1 1.3l15.2 15.2c.8.8 1.3 1.9 1.3 3.1v13.8c0 1.2-.5 2.3-1.3 3.1L35.1 57.2c-.8.8-1.9 1.3-3.1 1.3s-2.3-.5-3.1-1.3L13.7 42c-.8-.8-1.3-1.9-1.3-3.1V25.1c0-1.2.5-2.3 1.3-3.1L28.9 6.8c.8-.8 1.9-1.3 3.1-1.3Z"

const HEX_INNER =
  "M32 11.2c.7 0 1.4.3 1.9.8l12.4 12.4c.5.5.8 1.2.8 1.9v11.4c0 .7-.3 1.4-.8 1.9L33.9 51.9c-.5.5-1.2.8-1.9.8s-1.4-.3-1.9-.8L17.7 39.6c-.5-.5-.8-1.2-.8-1.9V26.3c0-.7.3-1.4.8-1.9L30.1 12c.5-.5 1.2-.8 1.9-.8Z"

export function AwardTrophySvg({ medal }: { medal: TrophyMedal }) {
  const reactId = useId().replace(/:/g, "")
  const metalId = `badge-metal-${reactId}`
  const faceId = `badge-face-${reactId}`
  const palette = awardPalette[medal]
  const digit = medalDigit[medal]

  return (
    <svg
      viewBox="0 0 64 64"
      className="h-full w-full drop-shadow-sm"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient
          id={metalId}
          x1="14"
          y1="6"
          x2="50"
          y2="58"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#f5f5f7" />
          <stop offset="35%" stopColor="#c8c8d0" />
          <stop offset="65%" stopColor="#8e8e9a" />
          <stop offset="100%" stopColor="#e8e8ee" />
        </linearGradient>
        <linearGradient
          id={faceId}
          x1="20"
          y1="12"
          x2="44"
          y2="52"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor={palette.accent} />
          <stop offset="100%" stopColor={palette.accentShade} />
        </linearGradient>
      </defs>

      {/* Silver metal frame */}
      <path d={HEX_OUTER} fill={`url(#${metalId})`} />

      {/* Full-face tier enamel */}
      <path d={HEX_INNER} fill={`url(#${faceId})`} />

      {/* Inner silver lip */}
      <path
        d={HEX_INNER}
        fill="none"
        stroke={`url(#${metalId})`}
        strokeWidth="1.5"
        opacity="0.9"
      />

      {/* Soft top highlight */}
      <path
        d="M22 18c3.5-4 10-6 16-4"
        fill="none"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.35"
      />

      {/* Rank mark */}
      <text
        x="32"
        y="38"
        textAnchor="middle"
        fill={palette.mark}
        stroke={`url(#${metalId})`}
        strokeWidth="2.25"
        paintOrder="stroke fill"
        fontSize="22"
        fontWeight="800"
        fontFamily="ui-sans-serif, system-ui, sans-serif"
        letterSpacing="-0.04em"
      >
        {digit}
      </text>
    </svg>
  )
}
