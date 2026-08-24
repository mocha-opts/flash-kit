'use client';

import { Dialog as DialogPrimitive } from 'radix-ui';
import {
  type ComponentPropsWithoutRef,
  forwardRef,
  type HTMLAttributes,
  type ReactNode,
} from 'react';

import { cn } from '#utils/cn';

export type DialogCloseProps = ComponentPropsWithoutRef<typeof DialogPrimitive.Close>;
export type DialogContentProps = ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & {
  /** Localized accessible name for the built-in close control. */
  readonly closeLabel: string;
};
export type DialogDescriptionProps = ComponentPropsWithoutRef<typeof DialogPrimitive.Description>;
export type DialogFooterProps = HTMLAttributes<HTMLDivElement>;
export type DialogHeaderProps = HTMLAttributes<HTMLDivElement>;
export type DialogOverlayProps = ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>;
export type DialogPortalProps = ComponentPropsWithoutRef<typeof DialogPrimitive.Portal>;
export type DialogProps = ComponentPropsWithoutRef<typeof DialogPrimitive.Root>;
export type DialogTitleProps = ComponentPropsWithoutRef<typeof DialogPrimitive.Title>;
export type DialogTriggerProps = ComponentPropsWithoutRef<typeof DialogPrimitive.Trigger>;

/** Root dialog state managed by Radix. */
const Dialog = DialogPrimitive.Root;

/** Trigger that opens a dialog and preserves Radix keyboard semantics. */
const DialogTrigger = DialogPrimitive.Trigger;

/** Portal that keeps modal content outside the caller's layout stacking context. */
const DialogPortal = DialogPrimitive.Portal;

/** Closes a dialog and restores focus to its trigger. */
const DialogClose = forwardRef<HTMLButtonElement, DialogCloseProps>(
  ({ className, ...props }, ref) => (
    <DialogPrimitive.Close
      ref={ref}
      className={cn(
        'inline-flex items-center justify-center rounded-md text-sm font-medium outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 motion-reduce:transition-none',
        className,
      )}
      {...props}
    />
  ),
);
DialogClose.displayName = DialogPrimitive.Close.displayName;

/** Backdrop for modal dialogs with a neutral, high-contrast scrim. */
const DialogOverlay = forwardRef<HTMLDivElement, DialogOverlayProps>(
  ({ className, ...props }, ref) => (
    <DialogPrimitive.Overlay
      ref={ref}
      className={cn(
        'fixed inset-0 z-50 bg-foreground/60 transition-opacity data-[state=closed]:opacity-0 data-[state=open]:opacity-100 motion-reduce:transition-none',
        className,
      )}
      {...props}
    />
  ),
);
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

/** Content surface with a built-in accessible close affordance. */
const DialogContent = forwardRef<HTMLDivElement, DialogContentProps>(
  ({ className, children, closeLabel, ...props }, ref) => (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        ref={ref}
        className={cn(
          'fixed left-1/2 top-1/2 z-50 grid w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 gap-4 rounded-lg border bg-card p-6 text-card-foreground shadow-xl transition-[opacity,transform] data-[state=closed]:scale-95 data-[state=closed]:opacity-0 data-[state=open]:scale-100 data-[state=open]:opacity-100 motion-reduce:transition-none',
          className,
        )}
        {...props}
      >
        {children}
        <DialogClose
          aria-label={closeLabel}
          className="absolute right-4 top-4 inline-flex size-8 items-center justify-center rounded-md text-muted-foreground outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card motion-reduce:transition-none"
        >
          <span aria-hidden="true" className="text-lg leading-none">
            ×
          </span>
        </DialogClose>
      </DialogPrimitive.Content>
    </DialogPortal>
  ),
);
DialogContent.displayName = DialogPrimitive.Content.displayName;

/** Layout helper for a dialog's title and description. */
function DialogHeader({ className, ...props }: DialogHeaderProps): ReactNode {
  return <div className={cn('flex flex-col gap-1.5 text-left', className)} {...props} />;
}

/** Layout helper for a dialog's actions. */
function DialogFooter({ className, ...props }: DialogFooterProps): ReactNode {
  return (
    <div
      className={cn('flex flex-col-reverse gap-2 sm:flex-row sm:justify-end', className)}
      {...props}
    />
  );
}

/** Accessible heading announced by Radix when a dialog opens. */
const DialogTitle = forwardRef<HTMLHeadingElement, DialogTitleProps>(
  ({ className, ...props }, ref) => (
    <DialogPrimitive.Title
      ref={ref}
      className={cn('text-lg font-semibold tracking-tight', className)}
      {...props}
    />
  ),
);
DialogTitle.displayName = DialogPrimitive.Title.displayName;

/** Supporting copy associated with a dialog title. */
const DialogDescription = forwardRef<HTMLParagraphElement, DialogDescriptionProps>(
  ({ className, ...props }, ref) => (
    <DialogPrimitive.Description
      ref={ref}
      className={cn('text-sm leading-6 text-muted-foreground', className)}
      {...props}
    />
  ),
);
DialogDescription.displayName = DialogPrimitive.Description.displayName;

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
};
