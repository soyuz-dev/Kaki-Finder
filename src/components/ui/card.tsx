import type { ReactNode } from 'react';
export function Card({ children }: { children: ReactNode }) {
  return <article className="rounded-3xl border border-line bg-paper p-7">{children}</article>;
}
