"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cx, optionButtonClass, type OptionButtonSize } from "@/src/lib/theme/ui-classes";

type ThemedOptionButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
  selected: boolean;
  children: ReactNode;
  size?: OptionButtonSize;
  minWidthClass?: string;
  uppercase?: boolean;
};

export default function ThemedOptionButton({
  selected,
  children,
  size = "md",
  minWidthClass,
  uppercase = false,
  className,
  type = "button",
  ...props
}: ThemedOptionButtonProps) {
  return (
    <button
      {...props}
      type={type}
      aria-pressed={props["aria-pressed"] ?? selected}
      className={optionButtonClass({
        selected,
        size,
        className: cx(minWidthClass, uppercase && "uppercase", className)
      })}
    >
      {children}
    </button>
  );
}
