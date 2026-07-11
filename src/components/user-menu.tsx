import { useState } from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Drawer,
  DrawerContent,
  DrawerPanel,
  drawerChromeOffsetClassName,
  DrawerTrigger,
} from "@/components/ui/drawer"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { KickoffThemePicker } from "@/components/kickoff-theme-picker"
import { AccountSection } from "@/components/account-section"
import { SettingsRow } from "@/components/settings-row"
import {
  TrophyClaimButton,
  TrophyClaimProvider,
} from "@/components/trophy-claim-section"
import { useMediaQuery } from "@/hooks/use-media-query"
import { useTeam } from "@/lib/fpl/team-context"
import { cn } from "@/lib/utils"

export function UserMenu() {
  const isDesktop = useMediaQuery("(min-width: 1024px)")
  const { teamId, entry, isLoggedIn, isLoading, error, setTeamId, clearTeam } =
    useTeam()
  const [open, setOpen] = useState(false)
  const [teamIdInput, setTeamIdInput] = useState("")
  const [submitError, setSubmitError] = useState<string | null>(null)

  const triggerLabel = isLoggedIn ? "Settings" : "Login"

  const handleConnect = async () => {
    const parsedTeamId = Number.parseInt(teamIdInput, 10)
    if (!Number.isFinite(parsedTeamId) || parsedTeamId <= 0) {
      setSubmitError("Enter a valid team ID.")
      return
    }

    setSubmitError(null)
    const success = await setTeamId(parsedTeamId)
    if (success) {
      setOpen(false)
      setTeamIdInput("")
    }
  }

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen)
    setSubmitError(null)

    if (nextOpen && teamId) {
      setTeamIdInput(String(teamId))
    }

    if (!nextOpen) {
      setTeamIdInput("")
    }
  }

  const settingsBody = (
    <div className="flex flex-col gap-4 text-sm">
      <KickoffThemePicker />
      <div className="flex flex-col gap-2">
        <SettingsRow
          label="Team"
          value={entry?.name ?? "Loading team..."}
          action={
            <Button variant="outline" size="sm" onClick={clearTeam}>
              Switch Team
            </Button>
          }
        />
        <TrophyClaimButton />
      </div>
      {error ? <p className="text-destructive">{error}</p> : null}
      <AccountSection />
    </div>
  )

  const loginBody = (
    <div className="flex flex-col gap-4">
      <KickoffThemePicker />
      <div className="flex flex-col gap-2">
        <Label htmlFor="team-id">Team ID</Label>
        <Input
          id="team-id"
          inputMode="numeric"
          placeholder="e.g. 216925"
          value={teamIdInput}
          onChange={(event) => setTeamIdInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              void handleConnect()
            }
          }}
        />
        <Button
          className="w-full lg:w-auto lg:self-start"
          disabled={isLoading}
          onClick={() => void handleConnect()}
        >
          {isLoading ? "Connecting..." : "Connect"}
        </Button>
        {submitError ? (
          <p className="text-sm text-destructive">{submitError}</p>
        ) : null}
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </div>
      <AccountSection />
    </div>
  )

  const body = (
    <TrophyClaimProvider>
      {isLoggedIn ? settingsBody : loginBody}
    </TrophyClaimProvider>
  )

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogTrigger
          render={
            <Button
              size="sm"
              variant="outline"
              className="shell-chrome-btn"
            >
              {triggerLabel}
            </Button>
          }
        />
        <DialogContent>
          {isLoggedIn ? (
            <>
              <DialogHeader>
                <DialogTitle>Team settings</DialogTitle>
              </DialogHeader>
              {body}
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Connect FPL team</DialogTitle>
                <DialogDescription>
                  Enter your public FPL team ID. It will be saved in this
                  browser.
                </DialogDescription>
              </DialogHeader>
              {body}
            </>
          )}
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Drawer open={open} onOpenChange={handleOpenChange}>
      <DrawerTrigger asChild>
        <Button size="sm" variant="outline" className="shell-chrome-btn">
          {triggerLabel}
        </Button>
      </DrawerTrigger>
      <DrawerContent size="md">
        {isLoggedIn ? (
          <DrawerPanel
            title="App settings"
            // description="Connected to the public FPL API using your team ID."
            bodyClassName={cn(
              drawerChromeOffsetClassName,
              "overflow-y-auto overscroll-contain px-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
            )}
          >
            {body}
          </DrawerPanel>
        ) : (
          <DrawerPanel
            title="Connect FPL team"
            description="Enter your public FPL team ID. It will be saved in this browser."
            bodyClassName={cn(
              drawerChromeOffsetClassName,
              "overflow-y-auto overscroll-contain px-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
            )}
          >
            {body}
          </DrawerPanel>
        )}
      </DrawerContent>
    </Drawer>
  )
}
