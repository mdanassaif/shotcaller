import * as React from "react";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { XIcon } from "lucide-react";

import { cn } from "@/lib/utils";

const Dialog = DialogPrimitive.Root;
const DialogTrigger = DialogPrimitive.Trigger;
const DialogClose = DialogPrimitive.Close;

function DialogContent({
  className,
  children,
  showClose = true,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Popup> & { showClose?: boolean }) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Backdrop
        className={cn(
          "fixed inset-0 z-50 bg-black/25 backdrop-blur-[2px]",
          "data-[starting-style]:opacity-0 data-[ending-style]:opacity-0 transition-opacity duration-200"
        )}
      />
      <DialogPrimitive.Popup
        className={cn(
          "fixed top-[8vh] left-1/2 z-50 w-[calc(100vw-2rem)] max-w-lg -translate-x-1/2",
          "max-h-[84vh] overflow-y-auto rounded-xl border bg-card p-6 shadow-2xl shadow-black/10",
          "transition-all duration-200 ease-[cubic-bezier(0.2,0,0,1)]",
          "data-[starting-style]:scale-[0.97] data-[starting-style]:opacity-0",
          "data-[ending-style]:scale-[0.98] data-[ending-style]:opacity-0",
          className
        )}
        {...props}
      >
        {children}
        {showClose && (
          <DialogPrimitive.Close className="absolute top-4 right-4 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
            <XIcon className="size-4" />
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Popup>
    </DialogPrimitive.Portal>
  );
}

function DialogTitle({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      className={cn("text-[17px] font-semibold tracking-[-0.01em] text-balance", className)}
      {...props}
    />
  );
}

function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      className={cn("mt-1.5 text-[13px] leading-relaxed text-muted-foreground text-pretty", className)}
      {...props}
    />
  );
}

/** Mono uppercase section label, the app's docs-style header. */
function DialogSectionLabel({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "mb-2.5 text-[11px] font-semibold tracking-[0.1em] text-muted-foreground uppercase",
        className
      )}
      {...props}
    />
  );
}

export { Dialog, DialogTrigger, DialogClose, DialogContent, DialogTitle, DialogDescription, DialogSectionLabel };
