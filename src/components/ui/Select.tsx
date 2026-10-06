"use client";

import * as SelectPrimitive from "@radix-ui/react-select";
import { Check, ChevronDown, ChevronUp } from "lucide-react";
import { useId, useRef, useState, type ButtonHTMLAttributes } from "react";
import { useOverlayContainer } from "./OverlayHost";
import "./select.css";

export interface SelectOption<Value extends string = string> {
  value: Value;
  label: string;
  disabled?: boolean;
}

export interface SelectProps<Value extends string = string> extends Pick<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "id" | "className" | "aria-label" | "aria-labelledby" | "aria-describedby" | "aria-invalid" | "autoFocus" | "onBlur"
> {
  value?: Value;
  onValueChange: (value: Value) => void;
  options: readonly SelectOption<Value>[];
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  name?: string;
}

/** String values stay unchanged at the boundary, including an explicit empty
 * "All" value. An absent value is a placeholder. Numeric schema conversions
 * belong to the typed consumer rather than to a fabricated change event. */
export function Select<Value extends string = string>({
  value,
  onValueChange,
  options,
  placeholder = "Choose an option",
  disabled = false,
  required = false,
  name,
  id,
  className = "",
  ...triggerProps
}: SelectProps<Value>) {
  const generatedId = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const inheritedContainer = useOverlayContainer();
  const [container, setContainer] = useState<HTMLElement | null>(null);
  const [open, setOpen] = useState(false);
  const isDisabled = disabled || !options.some(option => !option.disabled);
  const selectedOption = options.find(option => option.value === value);
  // Radix reserves an empty internal value for its placeholder. Prefix every
  // actual option so a real empty-string filter remains selectable and distinct.
  const encode = (optionValue: string) => `option:${optionValue}`;

  function handleOpenChange(next: boolean) {
    if (next) {
      setContainer(trigger.current?.closest<HTMLDialogElement>("dialog[open]") ?? inheritedContainer);
    }
    setOpen(next);
  }

  return <SelectPrimitive.Root
    value={selectedOption ? encode(selectedOption.value) : ""}
    onValueChange={next => {
      const option = options.find(item => encode(item.value) === next);
      if (option && !option.disabled) onValueChange(option.value);
    }}
    open={open}
    onOpenChange={handleOpenChange}
    disabled={isDisabled}
    required={required}
  >
    {name ? <input type="hidden" name={name} value={selectedOption?.value ?? ""} disabled={isDisabled} /> : null}
    <SelectPrimitive.Trigger {...triggerProps} id={id ?? generatedId} ref={trigger} type="button" className={`ui-select studio-select-trigger ${className}`}>
      <SelectPrimitive.Value placeholder={options.length ? placeholder : "No options available"} />
      <SelectPrimitive.Icon className="studio-select-chevron"><ChevronDown size={16} aria-hidden /></SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
    <SelectPrimitive.Portal container={container ?? undefined}>
      <SelectPrimitive.Content
        className="studio-select-content"
        data-imagino-popup="select"
        position="popper"
        sideOffset={6}
        collisionPadding={12}
        align="start"
        onEscapeKeyDown={event => {
          // Prevent the native dialog's cancel action and header Escape handlers.
          event.preventDefault();
          event.stopPropagation();
          setOpen(false);
        }}
        onCloseAutoFocus={event => {
          event.preventDefault();
          trigger.current?.focus({ preventScroll: true });
        }}
      >
        <SelectPrimitive.ScrollUpButton className="studio-select-scroll" aria-hidden><ChevronUp size={16} /></SelectPrimitive.ScrollUpButton>
        <SelectPrimitive.Viewport className="studio-select-viewport">
          {options.map(option => <SelectPrimitive.Item className="studio-select-option" key={option.value} value={encode(option.value)} disabled={option.disabled} textValue={option.label}>
            <SelectPrimitive.ItemIndicator className="studio-select-indicator"><Check size={16} aria-hidden /></SelectPrimitive.ItemIndicator>
            <SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>
          </SelectPrimitive.Item>)}
        </SelectPrimitive.Viewport>
        <SelectPrimitive.ScrollDownButton className="studio-select-scroll" aria-hidden><ChevronDown size={16} /></SelectPrimitive.ScrollDownButton>
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  </SelectPrimitive.Root>;
}
