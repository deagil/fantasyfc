import type {
  TrophyBaseId,
  TrophyBodyId,
  TrophyHandlesId,
  TrophyStemId,
} from "@/lib/trophies/trophy-visual"

export type TrophyRect = {
  x: number
  y: number
  width: number
  height: number
  rx: number
}

export type TrophyShape = {
  paths?: string[]
  rects?: TrophyRect[]
}

export type TrophyPartDefinition = {
  shapes: TrophyShape
  panelLines?: string[]
}

export const trophyHandlesParts: Record<TrophyHandlesId, TrophyPartDefinition> = {
  ears: {
    shapes: {
      paths: [
        "M21.5 14c-5.2.6-8.5 4.8-7.8 10.2.6 4.4 3.8 7.2 7.8 7.6V29c-2.6-.4-4.6-2.4-5-5.2-.5-3.8 1.6-7 5-7.8V14Z",
        "M42.5 14c5.2.6 8.5 4.8 7.8 10.2-.6 4.4-3.8 7.2-7.8 7.6V29c2.6-.4 4.6-2.4 5-5.2.5-3.8-1.6-7-5-7.8V14Z",
      ],
    },
  },
  none: {
    shapes: { paths: [] },
  },
  wings: {
    shapes: {
      paths: [
        "M20 16 14 24 20 30 20 16Z",
        "M44 16 50 24 44 30 44 16Z",
      ],
    },
  },
}

export const trophyBodyParts: Record<TrophyBodyId, TrophyPartDefinition> = {
  urn: {
    shapes: {
      paths: [
        "M21 11.5h22c1.1 0 2 .9 2 2v1c0 .8-.4 1.5-1.1 1.9-2.6 1.5-6.4 2.4-10.9 2.4s-8.3-.9-10.9-2.4c-.7-.4-1.1-1.1-1.1-1.9v-1c0-1.1.9-2 2-2Z",
        "M20.5 18c2.8 2.4 6.8 3.8 11.5 3.8s8.7-1.4 11.5-3.8c.3 1.6.5 3.4.5 5.4 0 7.4-4 13-12 13s-12-5.6-12-13c0-2 .2-3.8.5-5.4Z",
      ],
      rects: [{ x: 25.5, y: 35.5, width: 13, height: 3.5, rx: 1.25 }],
    },
    panelLines: [
      "M32 13v21",
      "M26.5 14.5c0 3.5.1 7.5.3 11 .2 2.4.6 4.5 1.2 6",
      "M37.5 14.5c0 3.5-.1 7.5-.3 11-.2 2.4-.6 4.5-1.2 6",
      "M23.5 25.5h17",
    ],
  },
  bowl: {
    shapes: {
      paths: [
        "M18 12.5h28c1.2 0 2.2 1 2.2 2.2v.8c0 1-.5 1.8-1.3 2.3-3 1.8-7.4 2.8-12.9 2.8S20.1 19.4 17.1 17.8c-.8-.5-1.3-1.3-1.3-2.3v-.8c0-1.2 1-2.2 2.2-2.2Z",
        "M18.5 19.5c3.2 3.2 8 5 13.5 5s10.3-1.8 13.5-5c.2 1.4.3 2.9.3 4.5 0 6.8-4.8 11.5-13.8 11.5S18 30.8 18 24c0-1.6.1-3.1.3-4.5Z",
      ],
      rects: [{ x: 26, y: 35.5, width: 12, height: 3, rx: 1.25 }],
    },
    panelLines: ["M32 14v18", "M22 24h20"],
  },
  chalice: {
    shapes: {
      paths: [
        "M23 10.5h18c1 0 1.8.8 1.8 1.8v1.2c0 .7-.3 1.3-.9 1.6-2.2 1.2-5.4 1.9-9.9 1.9s-7.7-.7-9.9-1.9c-.6-.3-.9-.9-.9-1.6v-1.2c0-1 .8-1.8 1.8-1.8Z",
        "M22.5 16.5c2.2 2.8 5.6 4.3 9.5 4.3s7.3-1.5 9.5-4.3c.2 1.2.3 2.5.3 3.9 0 8.6-3.6 14.6-9.8 14.6S22.2 28.9 22.2 20.4c0-1.4.1-2.7.3-3.9Z",
      ],
      rects: [{ x: 27, y: 35, width: 10, height: 3.5, rx: 1.25 }],
    },
    panelLines: ["M32 12v19", "M27 18.5c.8 2.5 2.8 4 5 4s4.2-1.5 5-4"],
  },
}

export const trophyStemParts: Record<TrophyStemId, TrophyPartDefinition> = {
  short: {
    shapes: {
      rects: [{ x: 29.25, y: 38.5, width: 5.5, height: 7.5, rx: 1.25 }],
    },
  },
  ringed: {
    shapes: {
      paths: ["M27 39.5h10a1.5 1.5 0 0 1 0 3H27a1.5 1.5 0 0 1 0-3Z"],
      rects: [{ x: 29.5, y: 42.5, width: 5, height: 5.5, rx: 1.25 }],
    },
  },
  tall: {
    shapes: {
      rects: [{ x: 29.75, y: 38.5, width: 4.5, height: 10.5, rx: 1.25 }],
    },
  },
}

export const trophyBaseParts: Record<TrophyBaseId, TrophyPartDefinition> = {
  stepped: {
    shapes: {
      rects: [
        { x: 23.5, y: 45.5, width: 17, height: 4, rx: 1.5 },
        { x: 19.5, y: 50.5, width: 25, height: 5, rx: 1.75 },
      ],
    },
  },
  disc: {
    shapes: {
      rects: [{ x: 18.5, y: 48.5, width: 27, height: 6, rx: 3 }],
    },
  },
  plinth: {
    shapes: {
      rects: [
        { x: 17, y: 46.5, width: 30, height: 4.5, rx: 1.25 },
        { x: 15, y: 51.5, width: 34, height: 5.5, rx: 1.5 },
      ],
    },
  },
}
