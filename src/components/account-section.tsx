import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { SettingsRow } from "@/components/settings-row"
import { SpotifyConnectControl } from "@/components/spotify-connect-control"
import { useAuth } from "@/lib/auth/auth-context"

export function AccountSection() {
  const { user, isLoggedIn, isInitializing, sendCode, verifyCode, signOut } = useAuth()
  const [email, setEmail] = useState("")
  const [code, setCode] = useState("")
  const [codeSent, setCodeSent] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const handleSendCode = async () => {
    setSubmitError(null)
    const success = await sendCode(email)
    if (success) {
      setCodeSent(true)
    } else {
      setSubmitError("Could not send code. Try again.")
    }
  }

  const handleVerifyCode = async () => {
    setSubmitError(null)
    setIsVerifying(true)
    try {
      const success = await verifyCode(email, code)
      if (!success) {
        setSubmitError("Invalid or expired code. Try again.")
      }
    } catch {
      setSubmitError("Could not verify code. Try again.")
    } finally {
      setIsVerifying(false)
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-muted/30 p-3 text-sm">
      {isInitializing ? null : isLoggedIn ? (
        <>
          <SettingsRow
            label="Account"
            value={`Signed in as ${user?.email ?? ""}`}
            action={
              <Button
                variant="outline"
                size="sm"
                onClick={() => void signOut()}
              >
                Log out
              </Button>
            }
          />
          <SpotifyConnectControl />
        </>
      ) : (
        <>
          <span className="text-muted-foreground">Account</span>
          {codeSent ? (
            <div className="flex flex-col gap-2">
              <p className="text-muted-foreground">
                Enter the code we sent to {email}.
              </p>
              <Label htmlFor="account-code">Code</Label>
              <Input
                id="account-code"
                inputMode="numeric"
                placeholder="123456"
                value={code}
                onChange={(event) => setCode(event.target.value)}
              />
              {submitError ? (
                <p className="text-destructive">{submitError}</p>
              ) : null}
              <Button
                size="sm"
                className="self-start"
                disabled={!code || isVerifying}
                onClick={() => void handleVerifyCode()}
              >
                {isVerifying ? "Verifying..." : "Verify code"}
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <Label htmlFor="account-email">Email</Label>
              <Input
                id="account-email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
              {submitError ? (
                <p className="text-destructive">{submitError}</p>
              ) : null}
              <Button
                size="sm"
                className="self-start"
                disabled={!email}
                onClick={() => void handleSendCode()}
              >
                Send code
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
