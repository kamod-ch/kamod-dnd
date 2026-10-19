import {
  elementScroll,
  observeElementOffset,
  observeElementRect,
  Virtualizer,
} from "@tanstack/virtual-core";
import { useLayoutEffect, useRef, useState } from "preact/hooks";

export type ElementVirtualizerOptions = {
  count: number;
  getScrollElement: () => HTMLElement | null;
  estimateSize: (index: number) => number;
  getItemKey: (index: number) => string;
  overscan?: number;
};

export function useElementVirtualizer(
  options: ElementVirtualizerOptions,
): Virtualizer<HTMLElement, Element> {
  const optionsRef = useRef(options);
  optionsRef.current = options;
  const [, bump] = useState(0);
  const virtualizerRef = useRef<Virtualizer<HTMLElement, Element> | null>(null);

  const resolved = {
    count: options.count,
    overscan: options.overscan ?? 8,
    getScrollElement: () => optionsRef.current.getScrollElement(),
    estimateSize: (index: number) => optionsRef.current.estimateSize(index),
    getItemKey: (index: number) => optionsRef.current.getItemKey(index),
    scrollToFn: elementScroll,
    observeElementRect,
    observeElementOffset,
    onChange: () => bump((value) => value + 1),
  };

  if (!virtualizerRef.current) {
    virtualizerRef.current = new Virtualizer(resolved);
  }
  const virtualizer = virtualizerRef.current;
  virtualizer.setOptions(resolved);

  useLayoutEffect(() => virtualizer._didMount(), [virtualizer]);
  useLayoutEffect(() => {
    virtualizer._willUpdate();
  });

  return virtualizer;
}
