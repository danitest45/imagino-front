"use client";
import {
  useId,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type TextareaHTMLAttributes,
  type ReactNode,
} from "react";
import { Loader2 } from "lucide-react";
export { Dialog } from "./Dialog";
export type { DialogProps } from "./Dialog";
export { Select } from "./Select";
export type { SelectProps, SelectOption } from "./Select";
export function Button({
  variant = "primary",
  loading = false,
  className = "",
  children,
  disabled,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  loading?: boolean;
}) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`ui-button ${variant} ${className}`}
    >
      {loading && <Loader2 size={16} className="ui-spin" aria-hidden />}
      {children}
    </button>
  );
}
export function IconButton({
  label,
  children,
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      {...props}
      aria-label={label}
      title={label}
      className={`ui-icon-button ${className}`}
    >
      {children}
    </button>
  );
}
export function Input({
  className = "",
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`ui-input ${className}`} />;
}
export function Textarea({
  className = "",
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`ui-textarea ${className}`} />;
}
export function StatusBadge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "success" | "warning" | "error" | "info";
}) {
  return <span className={`status-badge ${tone}`}>{children}</span>;
}
export function EmptyState({
  title,
  children,
  action,
}: {
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <span className="empty-frame" aria-hidden />
      <h2>{title}</h2>
      <div className="muted">{children}</div>
      {action}
    </div>
  );
}
export function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden className={`ui-skeleton ${className}`} />;
}
export function Tooltip({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  const id = useId();
  return (
    <span className="ui-tooltip" aria-describedby={id}>
      {children}
      <span role="tooltip" id={id}>
        {label}
      </span>
    </span>
  );
}
