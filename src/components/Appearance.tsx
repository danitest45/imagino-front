"use client";

import { useRef, useState, useSyncExternalStore } from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Check, Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { themePreference } from "../lib/theme";
import { useOverlayContainer } from "./ui/OverlayHost";
import "./appearance.css";

const subscribe = () => () => {};
const options = [
  { value: "system", label: "System", Icon: Monitor },
  { value: "light", label: "Light", Icon: Sun },
  { value: "dark", label: "Dark", Icon: Moon },
] as const;

export default function Appearance() {
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);
  const { theme, setTheme } = useTheme();
  const preference = themePreference(theme);
  const [portalContainer, setPortalContainer] = useState<HTMLElement | undefined>();
  const [open, setOpen] = useState(false);
  const inheritedContainer = useOverlayContainer();
  const trigger = useRef<HTMLButtonElement>(null);
  const deferredTouch = useRef(false);
  const SelectedIcon = options.find(option => option.value === preference)?.Icon ?? Monitor;
  function handleOpenChange(next: boolean) {
    if (next) setPortalContainer(trigger.current?.closest<HTMLElement>("[data-imagino-dialog], dialog[open]") ?? inheritedContainer ?? undefined);
    setOpen(next);
  }
  return (
    <DropdownMenu.Root modal={false} open={open} onOpenChange={handleOpenChange}>
      <DropdownMenu.Trigger asChild disabled={!mounted}
        onPointerDown={event => {
          deferredTouch.current = event.pointerType === "touch";
          // Open touch menus after release, as Select does. Otherwise WebKit's
          // synthetic click can move focus to the parent modal and dismiss them.
          if (deferredTouch.current) event.preventDefault();
        }}
        onPointerCancel={() => { deferredTouch.current = false; }}
        onClick={() => {
          if (!deferredTouch.current) return;
          deferredTouch.current = false;
          handleOpenChange(!open);
        }}>
        <button type="button" className="appearance-trigger" aria-label="Appearance"
          ref={trigger}>
          {mounted ? <SelectedIcon size={18} aria-hidden /> : <span className="appearance-icon-placeholder" aria-hidden />}
          <span className="appearance-label">Appearance</span>
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal container={portalContainer}>
        <DropdownMenu.Content className="appearance-menu" data-imagino-popup="appearance" sideOffset={8} collisionPadding={12} align="end"
          onEscapeKeyDown={event => { event.preventDefault(); event.stopPropagation(); setOpen(false); }}>
          <DropdownMenu.Label className="appearance-menu-label">Appearance</DropdownMenu.Label>
          <DropdownMenu.RadioGroup value={preference} onValueChange={value => setTheme(themePreference(value))}>
            {options.map(({ value, label, Icon }) => (
              <DropdownMenu.RadioItem className="appearance-option" value={value} key={value}>
                <Icon size={17} aria-hidden /><span>{label}</span>
                <DropdownMenu.ItemIndicator className="appearance-check"><Check size={16} aria-hidden /></DropdownMenu.ItemIndicator>
              </DropdownMenu.RadioItem>
            ))}
          </DropdownMenu.RadioGroup>
          <p className="appearance-hint">System follows your device.</p>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
