import "@tanstack/react-start/server-only"
import { createHash, randomBytes } from "node:crypto"

function base64url(input: Buffer) {
  return input
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "")
}

export function generateCodeVerifier() {
  return base64url(randomBytes(64))
}

export function generateCodeChallenge(verifier: string) {
  return base64url(createHash("sha256").update(verifier).digest())
}

export function generateState() {
  return base64url(randomBytes(24))
}
