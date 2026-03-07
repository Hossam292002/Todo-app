'use client';

import { createContext, useContext, type ReactNode } from 'react';

export type DropDirection = 'vertical-above' | 'vertical-below' | 'horizontal-left' | 'horizontal-right';

export type DropIndicatorState = {
  overId: string | null;
  direction: DropDirection | null;
};

export const DropIndicatorContext = createContext<{
  state: DropIndicatorState;
  setState: React.Dispatch<React.SetStateAction<DropIndicatorState>>;
} | null>(null);

export function useDropIndicator() {
  const ctx = useContext(DropIndicatorContext);
  return ctx?.state ?? { overId: null, direction: null };
}

export function useSetDropIndicator() {
  const ctx = useContext(DropIndicatorContext);
  return ctx?.setState ?? (() => {});
}
