"use client";

import type { ElementType, ReactNode } from "react";

type GlassCardProps = {
  as?: ElementType;
  className?: string;
  innerClassName?: string;
  children: ReactNode;
};

function joinClassNames(...parts: Array<string | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

export function GlassCard({ as: Component = "section", className, innerClassName, children }: GlassCardProps) {
  return (
    <Component className={joinClassNames("glass-card-shell", className)}>
      <div className={joinClassNames("glass-card-inner", innerClassName)}>{children}</div>
    </Component>
  );
}
