"use client"

import * as React from "react"
import { Check, Loader2, AlertCircle } from "lucide-react"

import { Button, type ButtonProps } from "@/components/ui/button"
import type { SaveStatus } from "@/hooks/useSaveState"
import { cn } from "@/lib/utils"

interface SaveButtonProps extends Omit<ButtonProps, "children" | "variant"> {
  status: SaveStatus
  /** Whether there is anything to save. Disables the button when false. */
  dirty: boolean
  /** Label in the resting state. The confirmation reuses its past tense. */
  idleLabel?: string
  savingLabel?: string
  savedLabel?: string
  retryLabel?: string
}

/**
 * A save control that reports its own state. It stays disabled until something
 * changes, shows progress while the request is in flight, turns green to
 * confirm, then settles back to disabled once the confirmation clears.
 */
export const SaveButton = React.forwardRef<HTMLButtonElement, SaveButtonProps>(
  (
    {
      status,
      dirty,
      idleLabel = "Save changes",
      savingLabel = "Saving…",
      savedLabel = "Saved",
      retryLabel = "Try again",
      className,
      disabled,
      ...props
    },
    ref
  ) => {
    const content = {
      idle: { icon: null, label: idleLabel },
      saving: { icon: <Loader2 className="animate-spin" />, label: savingLabel },
      saved: { icon: <Check />, label: savedLabel },
      error: { icon: <AlertCircle />, label: retryLabel },
    }[status]

    return (
      <Button
        ref={ref}
        type="submit"
        data-state={status}
        aria-live="polite"
        variant={
          status === "saved"
            ? "success"
            : status === "error"
              ? "destructive"
              : "default"
        }
        // Once saved, the confirmation is the only thing left to show — there
        // is nothing to re-submit until the user changes something again.
        disabled={disabled || status === "saving" || (!dirty && status !== "error")}
        className={cn(
          "min-w-[9.5rem]",
          // In-flight and confirmed states are non-interactive but must stay
          // legible — greying them out hides the very feedback they carry.
          (status === "saved" || status === "saving") && "disabled:opacity-100",
          className
        )}
        {...props}
      >
        {content.icon}
        {content.label}
      </Button>
    )
  }
)
SaveButton.displayName = "SaveButton"
