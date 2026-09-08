import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";

import { cn } from "../../lib/utils";
import {
  useDatagridPortalContainer,
  useDatagridThemeBase,
  useDatagridThemeName,
} from "../../theme/context";

const Dialog = DialogPrimitive.Root;

const DialogTrigger = DialogPrimitive.Trigger;

/* Into the grid's own portal container by default, exactly as the menus do:
   the token and item rules are scoped to a grid root. */
function DialogPortal({
  container,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Portal>) {
  const portalContainer = useDatagridPortalContainer();

  return (
    <DialogPrimitive.Portal
      {...props}
      container={container ?? portalContainer ?? undefined}
    />
  );
}

const DialogClose = DialogPrimitive.Close;

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    data-slot="dialog-overlay"
    className={cn(
      "tdg-dialog-overlay fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    {...props}
  />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & {
    /** For a content shape whose backdrop has to animate with it. */
    overlayClassName?: string;
    /** Portals outside the grid root, for a sheet host chrome must not cover. */
    container?: HTMLElement | null;
  }
>(
  (
    { className, children, style, overlayClassName, container, ...props },
    ref
  ) => {
    /*
     * A dialog normally portals inside the grid root, which keeps it in the
     * grid's own stacking context. A modal sheet has to escape that: the root
     * isolates its layers, so any host element with a z-index of its own paints
     * over the sheet however high the sheet's own z-index is. Escaping leaves
     * the root's custom properties behind, so the portal carries them itself.
     */
    const themeName = useDatagridThemeName();
    const themeBase = useDatagridThemeBase();
    const escapes = container != null;

    return (
      <DialogPortal container={container}>
        <div
          className={cn("tdg-dialog-portal", escapes && "tdg-tokens")}
          data-slot="dialog-portal"
          data-theme={
            escapes && themeBase !== "default" ? themeName : undefined
          }
          data-theme-base={
            escapes && themeBase !== "default" ? themeBase : undefined
          }
        >
          <DialogOverlay className={overlayClassName} />
          <DialogPrimitive.Content
            ref={ref}
            data-slot="dialog-content"
            style={style}
            className={cn(
              "tdg-dialog-content fixed left-1/2 top-1/2 z-50 grid w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 sm:w-full sm:rounded-lg",
              className
            )}
            {...props}
          >
            {children}
            <DialogPrimitive.Close
              data-slot="dialog-close"
              className="tdg-dialog-close absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </DialogPrimitive.Close>
          </DialogPrimitive.Content>
        </div>
      </DialogPortal>
    );
  }
);
DialogContent.displayName = DialogPrimitive.Content.displayName;

const DialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "tdg-dialog-header flex flex-col space-y-1.5 text-center sm:text-left",
      className
    )}
    {...props}
  />
);
DialogHeader.displayName = "DialogHeader";

const DialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "tdg-dialog-footer flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
      className
    )}
    {...props}
  />
);
DialogFooter.displayName = "DialogFooter";

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn(
      "tdg-dialog-title text-lg font-semibold leading-none tracking-tight",
      className
    )}
    {...props}
  />
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn(
      "tdg-dialog-description text-sm text-muted-foreground",
      className
    )}
    {...props}
  />
));
DialogDescription.displayName = DialogPrimitive.Description.displayName;

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogTrigger,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
};
