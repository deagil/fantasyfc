import type { TrophyMedal } from "@/lib/trophies/types"
import {
  trophyBaseParts,
  trophyBodyParts,
  trophyHandlesParts,
  trophyStemParts,
  type TrophyPartDefinition,
  type TrophyRect,
} from "@/lib/trophies/trophy-parts"
import { medalPalette, resolveTrophyParts } from "@/lib/trophies/trophy-visual"

function TrophyRects({ rects }: { rects: TrophyRect[] }) {
  return (
    <>
      {rects.map((rect) => (
        <rect
          key={`${rect.x}-${rect.y}-${rect.width}-${rect.height}`}
          x={rect.x}
          y={rect.y}
          width={rect.width}
          height={rect.height}
          rx={rect.rx}
        />
      ))}
    </>
  )
}

function TrophyPartShapes({ part }: { part: TrophyPartDefinition }) {
  const { paths = [], rects = [] } = part.shapes

  return (
    <>
      {paths.map((path) => (
        <path key={path} d={path} />
      ))}
      <TrophyRects rects={rects} />
    </>
  )
}

/** Procedural Borderlands-style mashup from leagueId. Kept for later reactivation. */
export function ModularTrophySvg({
  leagueId,
  medal,
}: {
  leagueId: number
  medal: TrophyMedal
}) {
  const parts = resolveTrophyParts(leagueId)
  const { fill, stroke } = medalPalette[medal]
  const handles = trophyHandlesParts[parts.handles]
  const body = trophyBodyParts[parts.body]
  const stem = trophyStemParts[parts.stem]
  const base = trophyBaseParts[parts.base]

  return (
    <svg
      viewBox="0 0 64 64"
      className="h-full w-full"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g fill={fill} stroke={stroke} strokeWidth="1.5" strokeLinejoin="round">
        <TrophyPartShapes part={handles} />
        <TrophyPartShapes part={body} />
        <TrophyPartShapes part={stem} />
        <TrophyPartShapes part={base} />
      </g>

      {body.panelLines && body.panelLines.length > 0 ? (
        <g
          fill="none"
          stroke={stroke}
          strokeWidth="1.25"
          strokeLinecap="round"
          opacity="0.4"
        >
          {body.panelLines.map((path) => (
            <path key={path} d={path} />
          ))}
        </g>
      ) : null}
    </svg>
  )
}
