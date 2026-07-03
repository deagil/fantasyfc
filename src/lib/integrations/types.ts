export type IntegrationConnection = {
  id: string
  userId: string
  provider: string
  accessToken: string
  refreshToken: string | null
  expiresAt: string | null
  scopes: string[] | null
  accountLabel: string | null
  connectedAt: string
}

export type ExchangedTokens = {
  accessToken: string
  refreshToken: string | null
  expiresAt: string | null
  scopes: string[]
  accountLabel?: string
}

export type IntegrationProvider = {
  id: string
  authorizationUrl: (params: {
    state: string
    codeChallenge: string
    redirectUri: string
  }) => string
  exchangeCode: (params: {
    code: string
    codeVerifier: string
    redirectUri: string
  }) => Promise<ExchangedTokens>
  refresh: (refreshToken: string) => Promise<ExchangedTokens>
}
