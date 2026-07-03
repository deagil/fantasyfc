import { useState } from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { KickoffThemePicker } from "@/components/kickoff-theme-picker"
import { useMediaQuery } from "@/hooks/use-media-query"
import { useTeam } from "@/lib/fpl/team-context"

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
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <span className="text-muted-foreground">Team</span>
          <span className="font-medium">{entry?.name ?? "Loading team..."}</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-muted-foreground">Team ID</span>
          <span className="font-medium">{teamId}</span>
        </div>
        {error ? <p className="text-destructive">{error}</p> : null}
      </div>
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
        />
        {submitError ? (
          <p className="text-sm text-destructive">{submitError}</p>
        ) : null}
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </div>
    </div>
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
                <DialogDescription>
                  Connected to the public FPL API using your team ID.
                </DialogDescription>
              </DialogHeader>
              {settingsBody}
              <DialogFooter>
                <Button variant="outline" onClick={clearTeam}>
                  Log out
                </Button>
              </DialogFooter>
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
              {loginBody}
              <DialogFooter>
                <Button
                  disabled={isLoading}
                  onClick={() => void handleConnect()}
                >
                  {isLoading ? "Connecting..." : "Connect"}
                </Button>
              </DialogFooter>
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
      <DrawerContent>
        {isLoggedIn ? (
          <>
            <DrawerHeader className="text-left">
              <DrawerTitle>Team settings</DrawerTitle>
              <DrawerDescription>
                Connected to the public FPL API using your team ID.
              </DrawerDescription>
            </DrawerHeader>
            <div className="px-4">{settingsBody}</div>
            <DrawerFooter className="pt-2">
              <Button variant="outline" onClick={clearTeam}>
                Log out
              </Button>
              <DrawerClose asChild>
                <Button variant="ghost">Close</Button>
              </DrawerClose>
            </DrawerFooter>
          </>
        ) : (
          <>
            <DrawerHeader className="text-left">
              <DrawerTitle>Connect FPL team</DrawerTitle>
              <DrawerDescription>
                Enter your public FPL team ID. It will be saved in this browser.
              </DrawerDescription>
            </DrawerHeader>
            <div className="px-4">{loginBody}</div>
            <DrawerFooter className="pt-2">
              <Button disabled={isLoading} onClick={() => void handleConnect()}>
                {isLoading ? "Connecting..." : "Connect"}
              </Button>
              <DrawerClose asChild>
                <Button variant="ghost">Cancel</Button>
              </DrawerClose>
            </DrawerFooter>
          </>
        )}
      </DrawerContent>
    </Drawer>
  )
}
