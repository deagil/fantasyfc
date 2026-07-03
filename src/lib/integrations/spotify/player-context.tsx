/// <reference types="spotify-web-playback-sdk" />
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import { useServerFn } from "@tanstack/react-start"

import { useAuth } from "@/lib/auth/auth-context"
import { getConnection } from "@/lib/integrations/connections"
import {
  getHubPlaylistPreview,
  getSpotifyAccessToken,
  playSpotifyHubPlaylist,
} from "@/lib/integrations/spotify/server"

const SDK_SCRIPT_SRC = "https://sdk.scdn.co/spotify-player.js"
const PLAYER_NAME = "Deadline"
const DRM_ERROR_MESSAGE =
  "This browser can't play Spotify (DRM unavailable). Use Chrome or Safari."

type NowPlayingTrack = {
  name: string
  artists: string
  albumArtUrl: string | null
  url: string
}

function spotifyTrackUrl(uri: string): string {
  const trackId = uri.replace("spotify:track:", "")
  return `https://open.spotify.com/track/${trackId}`
}

type PlaylistPreview = {
  name: string
  imageUrl: string | null
}

type SpotifyPlayerContextValue = {
  isConnected: boolean
  isReady: boolean
  isPaused: boolean
  track: NowPlayingTrack | null
  playlistPreview: PlaylistPreview | null
  position: number
  duration: number
  canSkipPrev: boolean
  canSkipNext: boolean
  playerError: string | null
  startPlayback: () => void
  togglePlay: () => void
  skipPrev: () => void
  skipNext: () => void
}

const SpotifyPlayerContext = createContext<SpotifyPlayerContextValue | null>(null)

function loadSdkScript(): Promise<void> {
  if (window.Spotify) {
    return Promise.resolve()
  }

  return new Promise((resolve) => {
    window.onSpotifyWebPlaybackSDKReady = () => resolve()
    const script = document.createElement("script")
    script.src = SDK_SCRIPT_SRC
    script.async = true
    document.body.appendChild(script)
  })
}

async function probeDrmSupport(): Promise<boolean> {
  if (!window.isSecureContext || !navigator.requestMediaKeySystemAccess) {
    return false
  }

  try {
    await navigator.requestMediaKeySystemAccess("com.widevine.alpha", [
      {
        initDataTypes: ["cenc"],
        audioCapabilities: [
          {
            contentType: 'audio/mp4; codecs="mp4a.40.2"',
            robustness: "SW_SECURE_CRYPTO",
          },
        ],
      },
    ])
    return true
  } catch {
    return false
  }
}

type FetchAccessToken = () => Promise<string | null>

let latestFetchAccessToken: FetchAccessToken = async () => null
let sharedPlayer: Spotify.Player | null = null
let sharedPlayerInit: Promise<Spotify.Player | null> | null = null
let sharedPlayerDeviceId: string | null = null
let sharedPlayerConnected = false

function destroySharedPlayer() {
  sharedPlayer?.disconnect()
  sharedPlayer = null
  sharedPlayerInit = null
  sharedPlayerDeviceId = null
  sharedPlayerConnected = false
}

function waitForDeviceId(player: Spotify.Player): Promise<string | null> {
  if (sharedPlayerDeviceId) {
    return Promise.resolve(sharedPlayerDeviceId)
  }

  return new Promise((resolve) => {
    const onReady = ({ device_id }: { device_id: string }) => {
      player.removeListener("ready", onReady)
      clearTimeout(timer)
      resolve(device_id)
    }

    player.addListener("ready", onReady)

    const timer = window.setTimeout(() => {
      player.removeListener("ready", onReady)
      resolve(sharedPlayerDeviceId)
    }, 8000)
  })
}

async function getOrCreatePlayer(): Promise<Spotify.Player | null> {
  if (sharedPlayer && !sharedPlayerDeviceId && sharedPlayerConnected) {
    destroySharedPlayer()
  }

  if (sharedPlayer) {
    return sharedPlayer
  }

  if (sharedPlayerInit) {
    return sharedPlayerInit
  }

  sharedPlayerInit = (async () => {
    await loadSdkScript()

    const player = new window.Spotify.Player({
      name: PLAYER_NAME,
      enableMediaSession: true,
      getOAuthToken: (callback) => {
        void latestFetchAccessToken().then((token) => {
          if (token) {
            callback(token)
          }
        })
      },
      volume: 0.5,
    })

    player.addListener("ready", ({ device_id }) => {
      sharedPlayerDeviceId = device_id
      sharedPlayerConnected = true
    })

    player.addListener("not_ready", () => {
      sharedPlayerDeviceId = null
      sharedPlayerConnected = false
    })

    sharedPlayer = player
    return player
  })().finally(() => {
    sharedPlayerInit = null
  })

  return sharedPlayerInit
}

async function connectSharedPlayer(): Promise<boolean> {
  const player = await getOrCreatePlayer()
  if (!player) {
    return false
  }

  if (sharedPlayerConnected && sharedPlayerDeviceId) {
    return true
  }

  const connected = await player.connect()
  sharedPlayerConnected = connected

  if (!connected) {
    destroySharedPlayer()
    return false
  }

  const deviceId = await waitForDeviceId(player)
  if (!deviceId) {
    destroySharedPlayer()
    return false
  }

  return true
}

function withPlayerAction(action: (player: Spotify.Player) => void) {
  const player = sharedPlayer
  if (!player) {
    return
  }

  void player.activateElement().then(() => {
    action(player)
  })
}

export function SpotifyPlayerProvider({ children }: { children: React.ReactNode }) {
  const { isLoggedIn, isInitializing } = useAuth()
  const fetchConnection = useServerFn(getConnection)
  const fetchAccessToken = useServerFn(getSpotifyAccessToken)
  const fetchPlaylistPreview = useServerFn(getHubPlaylistPreview)
  const playHubPlaylist = useServerFn(playSpotifyHubPlaylist)
  const fetchConnectionRef = useRef(fetchConnection)
  const fetchPlaylistPreviewRef = useRef(fetchPlaylistPreview)
  const playHubPlaylistRef = useRef(playHubPlaylist)
  const isLoggedInRef = useRef(isLoggedIn)
  const isInitializingRef = useRef(isInitializing)
  const trackRef = useRef<NowPlayingTrack | null>(null)

  fetchConnectionRef.current = fetchConnection
  fetchPlaylistPreviewRef.current = fetchPlaylistPreview
  playHubPlaylistRef.current = playHubPlaylist
  latestFetchAccessToken = fetchAccessToken
  isLoggedInRef.current = isLoggedIn
  isInitializingRef.current = isInitializing

  const [isConnected, setIsConnected] = useState(false)
  const [connectionResolved, setConnectionResolved] = useState(false)
  const [isReady, setIsReady] = useState(() => Boolean(sharedPlayerDeviceId))
  const [isPaused, setIsPaused] = useState(true)
  const [track, setTrack] = useState<NowPlayingTrack | null>(null)
  const [playlistPreview, setPlaylistPreview] = useState<PlaylistPreview | null>(null)
  const [position, setPosition] = useState(0)
  const [duration, setDuration] = useState(0)
  const [canSkipPrev, setCanSkipPrev] = useState(false)
  const [canSkipNext, setCanSkipNext] = useState(false)
  const [playerError, setPlayerError] = useState<string | null>(null)
  const playerRef = useRef<Spotify.Player | null>(null)

  trackRef.current = track

  useEffect(() => {
    if (!isLoggedIn) {
      if (!isInitializingRef.current) {
        setIsConnected(false)
        setConnectionResolved(false)
      }
      return
    }

    let cancelled = false

    void fetchConnectionRef.current({ data: { provider: "spotify" } }).then((connection) => {
      if (!cancelled) {
        setIsConnected(connection !== null)
        setConnectionResolved(true)
      }
    })

    return () => {
      cancelled = true
    }
  }, [isLoggedIn])

  useEffect(() => {
    if (!isConnected) {
      return
    }

    let cancelled = false

    void probeDrmSupport().then((supported) => {
      if (!cancelled && !supported) {
        setPlayerError(DRM_ERROR_MESSAGE)
      }
    })

    return () => {
      cancelled = true
    }
  }, [isConnected])

  useEffect(() => {
    if (!isReady || !isConnected) {
      return
    }

    let cancelled = false

    void fetchPlaylistPreviewRef.current().then((preview) => {
      if (!cancelled && preview) {
        setPlaylistPreview(preview)
      }
    })

    return () => {
      cancelled = true
    }
  }, [isReady, isConnected])

  useEffect(() => {
    if (isInitializing) {
      return
    }

    if (!isLoggedIn) {
      destroySharedPlayer()
      setIsReady(false)
      setTrack(null)
      setPlaylistPreview(null)
      setPlayerError(null)
      playerRef.current = null
      return
    }

    if (connectionResolved && !isConnected) {
      destroySharedPlayer()
      setIsReady(false)
      setTrack(null)
      setPlaylistPreview(null)
      setPlayerError(null)
      playerRef.current = null
    }
  }, [isInitializing, isLoggedIn, isConnected, connectionResolved])

  useEffect(() => {
    if (isInitializingRef.current || !isLoggedInRef.current || !isConnected) {
      return
    }

    let active = true

    const onReady = ({ device_id }: { device_id: string }) => {
      sharedPlayerDeviceId = device_id
      setIsReady(true)
      setPlayerError(null)
    }

    const onNotReady = () => {
      sharedPlayerDeviceId = null
      sharedPlayerConnected = false
      setIsReady(false)
    }

    const onInitializationError = ({ message }: { message: string }) => {
      destroySharedPlayer()
      setIsReady(false)
      setPlayerError(
        message.toLowerCase().includes("keysystem") ? DRM_ERROR_MESSAGE : message
      )
    }

    const onAuthenticationError = ({ message }: { message: string }) => {
      setPlayerError(message)
    }

    const onAccountError = ({ message }: { message: string }) => {
      setPlayerError(message)
    }

    const onPlaybackError = ({ message }: { message: string }) => {
      setPlayerError(message)
    }

    const onPlayerStateChanged = (state: Spotify.PlaybackState | null) => {
      if (!state) {
        setTrack(null)
        setPosition(0)
        setDuration(0)
        setCanSkipPrev(false)
        setCanSkipNext(false)
        return
      }

      setIsPaused(state.paused)
      setPosition(state.position)
      setDuration(state.duration)
      setCanSkipPrev(!state.disallows.skipping_prev)
      setCanSkipNext(!state.disallows.skipping_next)

      const current = state.track_window.current_track
      setTrack({
        name: current.name,
        artists: current.artists.map((artist) => artist.name).join(", "),
        albumArtUrl: current.album.images[0]?.url ?? null,
        url: spotifyTrackUrl(current.uri),
      })
    }

    void getOrCreatePlayer().then(async (player) => {
      if (!player || !active) {
        return
      }

      playerRef.current = player
      player.addListener("ready", onReady)
      player.addListener("not_ready", onNotReady)
      player.addListener("initialization_error", onInitializationError)
      player.addListener("authentication_error", onAuthenticationError)
      player.addListener("account_error", onAccountError)
      player.addListener("playback_error", onPlaybackError)
      player.addListener("player_state_changed", onPlayerStateChanged)

      if (sharedPlayerDeviceId) {
        setIsReady(true)
        return
      }

      const connected = await connectSharedPlayer()
      if (!active) {
        return
      }

      if (connected && sharedPlayerDeviceId) {
        setIsReady(true)
      }
    })

    return () => {
      active = false
      const player = playerRef.current
      if (player) {
        player.removeListener("ready", onReady)
        player.removeListener("not_ready", onNotReady)
        player.removeListener("initialization_error", onInitializationError)
        player.removeListener("authentication_error", onAuthenticationError)
        player.removeListener("account_error", onAccountError)
        player.removeListener("playback_error", onPlaybackError)
        player.removeListener("player_state_changed", onPlayerStateChanged)
      }
      playerRef.current = null
    }
  }, [isConnected])

  const startPlayback = useCallback(() => {
    const deviceId = sharedPlayerDeviceId
    if (!deviceId) {
      return
    }

    withPlayerAction(() => {
      void playHubPlaylistRef.current({ data: { deviceId } }).catch(() => {})
    })
  }, [])

  const togglePlay = useCallback(() => {
    if (!trackRef.current) {
      startPlayback()
      return
    }

    withPlayerAction((player) => {
      void player.togglePlay()
    })
  }, [startPlayback])

  const skipPrev = useCallback(() => {
    withPlayerAction((player) => {
      void player.previousTrack()
    })
  }, [])

  const skipNext = useCallback(() => {
    withPlayerAction((player) => {
      void player.nextTrack()
    })
  }, [])

  const value = useMemo(
    () => ({
      isConnected,
      isReady,
      isPaused,
      track,
      playlistPreview,
      position,
      duration,
      canSkipPrev,
      canSkipNext,
      playerError,
      startPlayback,
      togglePlay,
      skipPrev,
      skipNext,
    }),
    [
      isConnected,
      isReady,
      isPaused,
      track,
      playlistPreview,
      position,
      duration,
      canSkipPrev,
      canSkipNext,
      playerError,
      startPlayback,
      togglePlay,
      skipPrev,
      skipNext,
    ]
  )

  return (
    <SpotifyPlayerContext.Provider value={value}>
      {children}
    </SpotifyPlayerContext.Provider>
  )
}

export function useSpotifyPlayer() {
  const context = useContext(SpotifyPlayerContext)
  if (!context) {
    throw new Error("useSpotifyPlayer must be used within SpotifyPlayerProvider")
  }
  return context
}
