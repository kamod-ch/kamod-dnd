import { createContext } from "preact";
import { useContext, useEffect, useRef, useState } from "preact/hooks";
import type { ComponentChildren, RefObject } from "preact";
import { DndController, type DndControllerOptions } from "../session/controller.js";
import { bindPragmaticEngine } from "../engine/pragmatic/bindings.js";
import type { DndLocale } from "../accessibility/messages.js";
import { resolveMessage, type DndMessageKey } from "../accessibility/messages.js";
import { DndLiveRegion } from "../accessibility/live-region.js";

export type DndProviderProps<TData> = DndControllerOptions<TData> & {
  children: ComponentChildren;
  locale?: DndLocale;
  scrollRef?: RefObject<HTMLElement>;
  reducedMotion?: boolean;
};

export type DndContextValue<TData> = {
  controller: DndController<TData>;
  locale?: DndLocale;
  announce: (key: DndMessageKey, args: Record<string, string>) => void;
  reducedMotion: boolean;
};

const DndContext = createContext<DndContextValue<unknown> | null>(null);

export function DndProvider<TData>({
  children,
  locale,
  scrollRef,
  reducedMotion = false,
  ...options
}: DndProviderProps<TData>) {
  const controllerRef = useRef<DndController<TData> | null>(null);
  const controller = controllerRef.current ?? new DndController<TData>(options);
  if (!controllerRef.current) {
    controllerRef.current = controller;
  }

  const [liveMessage, setLiveMessage] = useState("");

  const announce = (key: DndMessageKey, args: Record<string, string>) => {
    setLiveMessage(resolveMessage(locale, key, args));
  };

  const value: DndContextValue<TData> = {
    controller,
    locale,
    announce,
    reducedMotion,
  };

  useEffect(() => {
    const scrollEl = scrollRef?.current ?? null;
    const unbind = bindPragmaticEngine(controller, {
      scrollElement: scrollEl,
      onEscape: () => announce("cancelled", { item: controller.signals.activeId.value ?? "item" }),
    });
    return () => {
      unbind();
      controller.dispose();
      controllerRef.current = null;
    };
  }, [controller, scrollRef]);

  return (
    <DndContext.Provider value={value as DndContextValue<unknown>}>
      {children}
      <DndLiveRegion message={liveMessage} />
    </DndContext.Provider>
  );
}

export function useDndContext<TData>(): DndContextValue<TData> {
  const ctx = useContext(DndContext);
  if (!ctx) {
    throw new Error("useDndContext must be used within DndProvider");
  }
  return ctx as DndContextValue<TData>;
}
