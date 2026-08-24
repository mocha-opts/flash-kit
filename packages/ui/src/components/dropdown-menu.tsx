'use client';

import { DropdownMenu as DropdownMenuPrimitive } from 'radix-ui';
import {
  type ComponentPropsWithoutRef,
  forwardRef,
  type HTMLAttributes,
  type ReactNode,
} from 'react';

import { cn } from '#utils/cn';

export type DropdownMenuArrowProps = ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Arrow>;
export type DropdownMenuCheckboxItemProps = ComponentPropsWithoutRef<
  typeof DropdownMenuPrimitive.CheckboxItem
>;
export type DropdownMenuContentProps = ComponentPropsWithoutRef<
  typeof DropdownMenuPrimitive.Content
>;
export type DropdownMenuGroupProps = ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Group>;
export type DropdownMenuItemIndicatorProps = ComponentPropsWithoutRef<
  typeof DropdownMenuPrimitive.ItemIndicator
>;
export type DropdownMenuItemProps = ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Item>;
export type DropdownMenuLabelProps = ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Label>;
export type DropdownMenuPortalProps = ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Portal>;
export type DropdownMenuProps = ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Root>;
export type DropdownMenuRadioGroupProps = ComponentPropsWithoutRef<
  typeof DropdownMenuPrimitive.RadioGroup
>;
export type DropdownMenuRadioItemProps = ComponentPropsWithoutRef<
  typeof DropdownMenuPrimitive.RadioItem
>;
export type DropdownMenuSeparatorProps = ComponentPropsWithoutRef<
  typeof DropdownMenuPrimitive.Separator
>;
export type DropdownMenuShortcutProps = HTMLAttributes<HTMLSpanElement>;
export type DropdownMenuSubContentProps = ComponentPropsWithoutRef<
  typeof DropdownMenuPrimitive.SubContent
>;
export type DropdownMenuSubProps = ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Sub>;
export type DropdownMenuSubTriggerProps = ComponentPropsWithoutRef<
  typeof DropdownMenuPrimitive.SubTrigger
>;
export type DropdownMenuTriggerProps = ComponentPropsWithoutRef<
  typeof DropdownMenuPrimitive.Trigger
>;

/** Root dropdown state managed by Radix. */
const DropdownMenu = DropdownMenuPrimitive.Root;

/** Trigger that opens the menu and carries Radix's keyboard behavior. */
const DropdownMenuTrigger = forwardRef<HTMLButtonElement, DropdownMenuTriggerProps>(
  ({ className, ...props }, ref) => (
    <DropdownMenuPrimitive.Trigger
      ref={ref}
      className={cn(
        'inline-flex items-center justify-center rounded-md text-sm font-medium outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 motion-reduce:transition-none',
        className,
      )}
      {...props}
    />
  ),
);
DropdownMenuTrigger.displayName = DropdownMenuPrimitive.Trigger.displayName;

/** Portal that keeps menu content above surrounding stacking contexts. */
const DropdownMenuPortal = DropdownMenuPrimitive.Portal;

/** Surface that positions and styles the menu items. */
const DropdownMenuContent = forwardRef<HTMLDivElement, DropdownMenuContentProps>(
  ({ className, sideOffset = 6, ...props }, ref) => (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.Content
        ref={ref}
        sideOffset={sideOffset}
        className={cn(
          'z-50 min-w-40 overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-lg outline-none transition-[opacity,transform] data-[state=closed]:scale-95 data-[state=closed]:opacity-0 data-[state=open]:scale-100 data-[state=open]:opacity-100 motion-reduce:transition-none',
          className,
        )}
        {...props}
      />
    </DropdownMenuPrimitive.Portal>
  ),
);
DropdownMenuContent.displayName = DropdownMenuPrimitive.Content.displayName;

/** Groups related menu items for assistive technology. */
const DropdownMenuGroup = DropdownMenuPrimitive.Group;

/** Non-interactive menu section label. */
const DropdownMenuLabel = forwardRef<HTMLDivElement, DropdownMenuLabelProps>(
  ({ className, ...props }, ref) => (
    <DropdownMenuPrimitive.Label
      ref={ref}
      className={cn('px-2 py-1.5 text-xs font-semibold text-muted-foreground', className)}
      {...props}
    />
  ),
);
DropdownMenuLabel.displayName = DropdownMenuPrimitive.Label.displayName;

/** Standard actionable menu item. */
const DropdownMenuItem = forwardRef<HTMLDivElement, DropdownMenuItemProps>(
  ({ className, ...props }, ref) => (
    <DropdownMenuPrimitive.Item
      ref={ref}
      className={cn(
        'relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground motion-reduce:transition-none',
        className,
      )}
      {...props}
    />
  ),
);
DropdownMenuItem.displayName = DropdownMenuPrimitive.Item.displayName;

/** Checkable menu item; place an indicator as its child when desired. */
const DropdownMenuCheckboxItem = forwardRef<HTMLDivElement, DropdownMenuCheckboxItemProps>(
  ({ className, ...props }, ref) => (
    <DropdownMenuPrimitive.CheckboxItem
      ref={ref}
      className={cn(
        'relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none transition-colors data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground motion-reduce:transition-none',
        className,
      )}
      {...props}
    />
  ),
);
DropdownMenuCheckboxItem.displayName = DropdownMenuPrimitive.CheckboxItem.displayName;

/** Radio group container for mutually exclusive menu items. */
const DropdownMenuRadioGroup = DropdownMenuPrimitive.RadioGroup;

/** Radio menu item with the same focus and highlight treatment as other items. */
const DropdownMenuRadioItem = forwardRef<HTMLDivElement, DropdownMenuRadioItemProps>(
  ({ className, ...props }, ref) => (
    <DropdownMenuPrimitive.RadioItem
      ref={ref}
      className={cn(
        'relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none transition-colors data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground motion-reduce:transition-none',
        className,
      )}
      {...props}
    />
  ),
);
DropdownMenuRadioItem.displayName = DropdownMenuPrimitive.RadioItem.displayName;

/** Positioning wrapper for custom checkbox/radio indicators. */
const DropdownMenuItemIndicator = forwardRef<HTMLSpanElement, DropdownMenuItemIndicatorProps>(
  ({ className, ...props }, ref) => (
    <DropdownMenuPrimitive.ItemIndicator
      ref={ref}
      className={cn('absolute left-2 inline-flex size-4 items-center justify-center', className)}
      {...props}
    />
  ),
);
DropdownMenuItemIndicator.displayName = DropdownMenuPrimitive.ItemIndicator.displayName;

/** Visual divider between menu sections. */
const DropdownMenuSeparator = forwardRef<HTMLDivElement, DropdownMenuSeparatorProps>(
  ({ className, ...props }, ref) => (
    <DropdownMenuPrimitive.Separator
      ref={ref}
      className={cn('-mx-1 my-1 h-px bg-border', className)}
      {...props}
    />
  ),
);
DropdownMenuSeparator.displayName = DropdownMenuPrimitive.Separator.displayName;

/** Nested menu state managed by Radix. */
const DropdownMenuSub = DropdownMenuPrimitive.Sub;

/** Trigger for a nested menu. */
const DropdownMenuSubTrigger = forwardRef<HTMLDivElement, DropdownMenuSubTriggerProps>(
  ({ className, ...props }, ref) => (
    <DropdownMenuPrimitive.SubTrigger
      ref={ref}
      className={cn(
        'flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors data-[state=open]:bg-accent data-[state=open]:text-accent-foreground data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground motion-reduce:transition-none',
        className,
      )}
      {...props}
    />
  ),
);
DropdownMenuSubTrigger.displayName = DropdownMenuPrimitive.SubTrigger.displayName;

/** Surface for a nested menu. */
const DropdownMenuSubContent = forwardRef<HTMLDivElement, DropdownMenuSubContentProps>(
  ({ className, ...props }, ref) => (
    <DropdownMenuPrimitive.SubContent
      ref={ref}
      className={cn(
        'z-50 min-w-40 overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-lg outline-none transition-[opacity,transform] data-[state=closed]:scale-95 data-[state=closed]:opacity-0 data-[state=open]:scale-100 data-[state=open]:opacity-100 motion-reduce:transition-none',
        className,
      )}
      {...props}
    />
  ),
);
DropdownMenuSubContent.displayName = DropdownMenuPrimitive.SubContent.displayName;

/** Optional menu arrow that uses the same semantic border color. */
const DropdownMenuArrow = forwardRef<SVGSVGElement, DropdownMenuArrowProps>(
  ({ className, ...props }, ref) => (
    <DropdownMenuPrimitive.Arrow ref={ref} className={cn('fill-popover', className)} {...props} />
  ),
);
DropdownMenuArrow.displayName = DropdownMenuPrimitive.Arrow.displayName;

/** Small layout helper for a menu item's shortcut or trailing content. */
function DropdownMenuShortcut({ className, ...props }: DropdownMenuShortcutProps): ReactNode {
  return (
    <span
      className={cn('ml-auto pl-4 text-xs tracking-widest text-muted-foreground', className)}
      {...props}
    />
  );
}

export {
  DropdownMenu,
  DropdownMenuArrow,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuItemIndicator,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
};
