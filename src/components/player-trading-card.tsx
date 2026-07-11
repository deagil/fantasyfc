import { useCallback, useEffect, useState } from "react"
import Tilt from "react-parallax-tilt"

import "@/components/player-trading-card.css"
import { useEnrichmentMaps } from "@/lib/enrichment/hooks"
import {
  formatPlayerForm,
  formatPlayerOwnership,
  formatPlayerPrice,
  formatPlayerStatus,
  getElementTypeLabel,
  getPlayerInitials,
} from "@/lib/fpl/players"
import type { FplElement, FplElementTypeId, FplTeam } from "@/lib/fpl/types"
import { cardFoilCssVars, getCardFoilSkin } from "@/lib/ratings/card-foil"
import { CATEGORY_SHORT_LABELS } from "@/lib/ratings/copy"
import type { CategoryId } from "@/lib/ratings/model"
import { cn } from "@/lib/utils"

const CARD_CATEGORY_ORDER: Record<"outfield" | "goalkeeper", CategoryId[]> = {
  // Grid fills row-first: left col ATK/GKP · PLY · IMP, right col DEF · REL · VAL
  outfield: ["ATK", "DEF", "PLY", "REL", "IMP", "FPL"],
  goalkeeper: ["GKP", "DEF", "PLY", "REL", "IMP", "FPL"],
}

function getCardCategories(elementType: FplElementTypeId): CategoryId[] {
  return elementType === 1
    ? CARD_CATEGORY_ORDER.goalkeeper
    : CARD_CATEGORY_ORDER.outfield
}

/** Prefer full-body render, then cutout, then thumb — never the PL CDN. */
function resolvePlayerArtUrl(options: {
  renderUrl: string | null | undefined
  cutoutUrl: string | null | undefined
  thumbUrl: string | null | undefined
}): string | null {
  return options.renderUrl || options.cutoutUrl || options.thumbUrl || null
}

type PlayerTradingCardProps = {
  player: FplElement
  team: FplTeam | undefined
  overall: number | null | undefined
  categories: Partial<Record<CategoryId, number>> | undefined
  className?: string
}

function CardStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="trading-card-stat">
      <span className="trading-card-stat-value">{value}</span>
      <span className="trading-card-stat-label">{label}</span>
    </div>
  )
}

function BackStat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="trading-card-back-stat-label">{label}</div>
      <div className="trading-card-back-stat-value">{value}</div>
    </div>
  )
}

function cleanEnrichmentText(value: string | null | undefined): string | null {
  if (value == null) {
    return null
  }
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function formatPreferredFoot(side: string | null | undefined): string | null {
  const value = cleanEnrichmentText(side)
  if (value == null) {
    return null
  }
  const lower = value.toLowerCase()
  if (lower === "left" || lower === "l") {
    return "Left"
  }
  if (lower === "right" || lower === "r") {
    return "Right"
  }
  if (lower === "both") {
    return "Both"
  }
  return value
}

function formatBirthYear(birthDate: string | null | undefined): string | null {
  const value = cleanEnrichmentText(birthDate)
  if (value == null) {
    return null
  }
  const match = /^(\d{4})/.exec(value)
  return match?.[1] ?? value
}

function formatShirtNumber(number: string | null | undefined): string | null {
  const value = cleanEnrichmentText(number)
  if (value == null) {
    return null
  }
  return value.startsWith("#") ? value : `#${value}`
}

type BackTriviaItem = { label: string; value: string }

function buildBackTrivia(bio: {
  height: string | null
  weight: string | null
  side: string | null
  birthDate: string | null
  nationality: string | null
  number: string | null
  birthLocation: string | null
} | null | undefined): BackTriviaItem[] {
  if (bio == null) {
    return []
  }

  const candidates: Array<{ label: string; value: string | null }> = [
    { label: "Height", value: cleanEnrichmentText(bio.height) },
    { label: "Weight", value: cleanEnrichmentText(bio.weight) },
    { label: "Born", value: formatBirthYear(bio.birthDate) },
    { label: "Foot", value: formatPreferredFoot(bio.side) },
    { label: "Nation", value: cleanEnrichmentText(bio.nationality) },
    { label: "Number", value: formatShirtNumber(bio.number) },
  ]

  const filled = candidates.filter(
    (item): item is BackTriviaItem => item.value != null
  )
  if (filled.length > 0) {
    return filled
  }

  const birthPlace = cleanEnrichmentText(bio.birthLocation)
  return birthPlace == null ? [] : [{ label: "From", value: birthPlace }]
}

function CardFace({
  children,
  holoActive,
  showSparkles,
  showHolo,
}: {
  children: React.ReactNode
  holoActive: boolean
  showSparkles: boolean
  showHolo: boolean
}) {
  return (
    <div className="trading-card-shield">
      {/* Stack: sparkles → player (via z-index) → holo */}
      {showSparkles ? (
        <div
          aria-hidden="true"
          className={cn(
            "trading-card-sparkles",
            !holoActive && "trading-card-sparkles--animated"
          )}
        />
      ) : null}
      {showHolo ? (
        <div
          aria-hidden="true"
          className={cn(
            "trading-card-holo",
            !holoActive && "trading-card-holo--animated",
            holoActive && "trading-card-holo--active"
          )}
        />
      ) : null}
      {children}
      <div className="trading-card-frame" aria-hidden="true" />
    </div>
  )
}

export function PlayerTradingCard({
  player,
  team,
  overall,
  categories,
  className,
}: PlayerTradingCardProps) {
  const [isFlipped, setIsFlipped] = useState(false)
  const [photoFailed, setPhotoFailed] = useState(false)
  const [holoActive, setHoloActive] = useState(false)
  const { playersByCode, teamsByCode } = useEnrichmentMaps()

  const enrichment = playersByCode.get(player.code)
  const teamEnrichment =
    team?.code != null ? teamsByCode.get(team.code) : undefined
  const artUrl = resolvePlayerArtUrl({
    renderUrl: enrichment?.renderUrl,
    cutoutUrl: enrichment?.cutoutUrl,
    thumbUrl: enrichment?.thumbUrl,
  })
  const badgeUrl = teamEnrichment?.badgeUrl ?? null
  const usingRender = Boolean(
    enrichment?.renderUrl && artUrl === enrichment.renderUrl
  )

  useEffect(() => {
    setPhotoFailed(false)
    setIsFlipped(false)
  }, [player.id, artUrl])

  const positionLabel = getElementTypeLabel(player.element_type)
  const foilOverall = overall ?? 50
  const foil = getCardFoilSkin(foilOverall)
  const foilStyle = cardFoilCssVars(foilOverall)
  const showHolo = foil.holoOpacity > 0
  const playerHolo = (overall ?? 0) >= 85 && showHolo
  /** GAIA-style sparkle GIF on the holo layer — elite cards only. */
  const showSparkles = (overall ?? 0) >= 94 && showHolo
  const categoryIds = getCardCategories(player.element_type)

  const handleFlip = useCallback(() => {
    setIsFlipped((current) => !current)
  }, [])

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault()
        handleFlip()
      }
    },
    [handleFlip]
  )

  const cardCategories = categoryIds
    .map((id) => {
      const score = categories?.[id]
      if (score == null) {
        return null
      }
      return { id, label: CATEGORY_SHORT_LABELS[id], score }
    })
    .filter(
      (entry): entry is { id: CategoryId; label: string; score: number } =>
        entry != null
    )

  const showPhoto = artUrl != null && !photoFailed
  const bio = enrichment?.bio
  const fullName = cleanEnrichmentText(bio?.fullName)
  const backTrivia = buildBackTrivia(bio)
  const backSubtitle = [team?.short_name, formatPlayerStatus(player.status)]
    .filter(Boolean)
    .join(" · ")

  const cardInner = (
    <div
      className={cn(
        "trading-card-inner",
        isFlipped && "trading-card-inner--flipped"
      )}
      style={foilStyle}
    >
      <div className="trading-card-face">
        <CardFace
          holoActive={holoActive}
          showHolo={showHolo}
          showSparkles={showSparkles}
        >
          <div className="trading-card-ovr">
            <span className="trading-card-ovr-value">
              {overall != null ? overall : "—"}
            </span>
            <span className="trading-card-ovr-pos">{positionLabel}</span>
          </div>

          {badgeUrl ? (
            <img alt="" className="trading-card-crest" src={badgeUrl} />
          ) : null}

          {showPhoto ? (
            <div
              className={cn(
                "trading-card-photo-wrap",
                usingRender && "trading-card-photo-wrap--render",
                playerHolo && "trading-card-photo-wrap--player-holo"
              )}
            >
              <img
                alt=""
                className="trading-card-photo"
                src={artUrl}
                onError={() => setPhotoFailed(true)}
              />
            </div>
          ) : (
            <span aria-hidden="true" className="trading-card-photo-fallback">
              {getPlayerInitials(player.web_name)}
            </span>
          )}

          <h3 className="trading-card-name">{player.web_name}</h3>

          <div className="trading-card-stats">
            {cardCategories.map(({ label, score }) => (
              <CardStat key={label} label={label} value={score} />
            ))}
          </div>
        </CardFace>
      </div>

      <div className="trading-card-face trading-card-face--back">
        <CardFace
          holoActive={holoActive}
          showHolo={showHolo}
          showSparkles={showSparkles}
        >
          <div className="trading-card-back-content">
            <div>
              <div className="trading-card-back-title">
                {fullName ?? player.web_name}
              </div>
              <div className="trading-card-back-sub">{backSubtitle || "—"}</div>
            </div>

            {backTrivia.length > 0 ? (
              <div className="trading-card-back-stats trading-card-back-stats--trivia">
                {backTrivia.map((item) => (
                  <BackStat
                    key={item.label}
                    label={item.label}
                    value={item.value}
                  />
                ))}
              </div>
            ) : null}

            <div className="trading-card-back-stats trading-card-back-stats--fpl">
              <BackStat
                label="Price"
                value={formatPlayerPrice(player.now_cost)}
              />
              <BackStat label="Form" value={formatPlayerForm(player.form)} />
              <BackStat label="Points" value={player.total_points} />
              <BackStat
                label="Owned"
                value={formatPlayerOwnership(player.selected_by_percent)}
              />
            </div>
          </div>
        </CardFace>
      </div>
    </div>
  )

  return (
    <div className={cn("flex flex-col items-center", className)}>
      <div
        className="trading-card-scene"
        onClick={handleFlip}
        onKeyDown={handleKeyDown}
        onMouseEnter={() => setHoloActive(true)}
        onMouseLeave={() => setHoloActive(false)}
        role="button"
        tabIndex={0}
        title={`${player.web_name} trading card. Click to flip.`}
      >
        <Tilt
          glareEnable={false}
          gyroscope={false}
          scale={1.02}
          tiltEnable
          tiltMaxAngleX={12}
          tiltMaxAngleY={12}
          transitionSpeed={400}
        >
          {cardInner}
        </Tilt>
      </div>
      <p className="trading-card-flip-hint">Tap to flip</p>
    </div>
  )
}
