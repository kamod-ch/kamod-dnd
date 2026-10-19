import { createContext } from "preact";
import { useContext, useEffect, useRef, useState } from "preact/hooks";
import type { ComponentChildren, RefObject } from "preact";
import { DndController, type DndControllerOptions } from "../session/controller.js";
import type { DndSessionEvent } from "../session/types.js";
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

function announceSessionEvent<TData>(
  locale: DndLocale | undefined,
  event: DndSessionEvent<TData>,
  setLiveMessage: (message: string) => void,
) {
  if (event.type === "start") {
    setLiveMessage(resolveMessage(locale, "pickedUp", { item: event.itemId }));
    return;
  }
  if (event.type === "over") {
    if (!event.canDrop) return;
    if (event.containerId === event.sourceContainerId) {
      setLiveMessage(
        resolveMessage(locale, "moved", {
          item: event.itemId,
          position: String(event.targetIndex + 1),
        }),
      );
      return;
    }
    setLiveMessage(
      resolveMessage(locale, "movedToContainer", {
        item: event.itemId,
        container: event.containerId,
      }),
    );
    return;
  }
  if (event.type === "drop") {
    setLiveMessage(resolveMessage(locale, "dropped", { item: event.intent.itemId }));
    return;
  }
  setLiveMessage(resolveMessage(locale, "cancelled", { item: event.itemId }));
}

export function DndProvider<TData>({
  children,
  locale,
  scrollRef,
  reducedMotion = false,
  ...options
}: DndProviderProps<TData>) {
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const controllerRef = useRef<DndController<TData> | null>(null);
  if (!controllerRef.current) {
    controllerRef.current = new DndController<TData>({
      dropRule: (intent) => {
        const rule = optionsRef.current.dropRule;
        return rule ? rule(intent) : true;
      },
      onMove: (intent) => optionsRef.current.onMove?.(intent),
      onCancel: (reason) => {
        optionsRef.current.onCancel?.(reason);
      },
    });
  }
  const controller = controllerRef.current;

  const localeRef = useRef(locale);
  localeRef.current = locale;

  const [liveMessage, setLiveMessage] = useState("");

  const announce = (key: DndMessageKey, args: Record<string, string>) => {
    setLiveMessage(resolveMessage(localeRef.current, key, args));
  };

  const value: DndContextValue<TData> = {
    controller,
    locale,
    announce,
    reducedMotion,
  };

  useEffect(() => {
    const scrollEl = scrollRef?.current ?? null;
    return bindPragmaticEngine(controller, {
      scrollElement: scrollEl,
    });
  }, [controller, scrollRef]);

  useEffect(() => {
    return () => {
      controller.dispose();
    };
  }, [controller]);

  useEffect(() => {
    return controller.subscribe((event) => {
      announceSessionEvent(localeRef.current, event, setLiveMessage);
    });
  }, [controller]);

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
