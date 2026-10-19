import { createContext } from "preact";
import { useContext, useEffect, useRef, useState } from "preact/hooks";
import type { ComponentChildren, RefObject } from "preact";
import { DndController, type DndControllerOptions } from "../session/controller.js";
import type { DndId, DndSessionEvent } from "../session/types.js";
import { bindPragmaticEngine } from "../engine/pragmatic/bindings.js";
import type { DndLocale } from "../accessibility/messages.js";
import { resolveMessage, type DndMessageKey } from "../accessibility/messages.js";
import { DndLiveRegion } from "../accessibility/live-region.js";

export type DndProviderProps<TData> = DndControllerOptions<TData> & {
  children: ComponentChildren;
  locale?: DndLocale;
  scrollRef?: RefObject<HTMLElement>;
  reducedMotion?: boolean;
  getItemLabel?: (id: DndId, data: TData) => string;
  getContainerLabel?: (id: DndId) => string;
  focusFallbackRef?: RefObject<HTMLElement | null>;
};

export type DndContextValue<TData> = {
  controller: DndController<TData>;
  locale?: DndLocale;
  announce: (key: DndMessageKey, args: Record<string, string>) => void;
  reducedMotion: boolean;
  itemLabel: (id: DndId, data: TData) => string;
  containerLabel: (id: DndId) => string;
  restoreHandleFocus: (id: DndId) => void;
};

const DndContext = createContext<DndContextValue<unknown> | null>(null);

function announceSessionEvent<TData>(
  locale: DndLocale | undefined,
  event: DndSessionEvent<TData>,
  setLiveMessage: (message: string) => void,
  itemLabel: (id: DndId, data: TData | undefined) => string,
  containerLabel: (id: DndId) => string,
) {
  if (event.type === "start") {
    setLiveMessage(
      resolveMessage(locale, "pickedUp", { item: itemLabel(event.itemId, event.data) }),
    );
    return;
  }
  if (event.type === "over") {
    if (!event.canDrop) return;
    if (event.containerId === event.sourceContainerId) {
      setLiveMessage(
        resolveMessage(locale, "moved", {
          item: itemLabel(event.itemId, undefined),
          position: String(event.targetIndex + 1),
        }),
      );
      return;
    }
    setLiveMessage(
      resolveMessage(locale, "movedToContainer", {
        item: itemLabel(event.itemId, undefined),
        container: containerLabel(event.containerId),
      }),
    );
    return;
  }
  if (event.type === "drop") {
    setLiveMessage(
      resolveMessage(locale, "dropped", {
        item: itemLabel(event.intent.itemId, event.intent.data),
      }),
    );
    return;
  }
  setLiveMessage(resolveMessage(locale, "cancelled", { item: itemLabel(event.itemId, undefined) }));
}

export function DndProvider<TData>({
  children,
  locale,
  scrollRef,
  reducedMotion = false,
  getItemLabel,
  getContainerLabel,
  focusFallbackRef,
  ...options
}: DndProviderProps<TData>) {
  const optionsRef = useRef(options);
  optionsRef.current = options;
  const labelsRef = useRef({ getItemLabel, getContainerLabel });
  labelsRef.current = { getItemLabel, getContainerLabel };

  const itemLabel = (id: DndId, data: TData | undefined) => {
    const resolve = labelsRef.current.getItemLabel;
    const payload = data ?? controllerRef.current?.getItemData(id);
    if (resolve && payload !== undefined) return resolve(id, payload);
    return id;
  };
  const containerLabel = (id: DndId) => labelsRef.current.getContainerLabel?.(id) ?? id;

  const scheduleFocusRef = useRef<(id: DndId) => void>(() => {});
  scheduleFocusRef.current = (itemId) => {
    const fallback = focusFallbackRef?.current ?? null;
    // Two frames: the first lets Preact commit and the browser drop focus from
    // an unmounted control; the second reads the handle registry.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const controller = controllerRef.current;
        if (controller?.focusHandle(itemId)) return;
        if (fallback?.isConnected) fallback.focus();
      });
    });
  };

  const controllerRef = useRef<DndController<TData> | null>(null);
  if (!controllerRef.current) {
    controllerRef.current = new DndController<TData>({
      dropRule: (intent) => {
        const rule = optionsRef.current.dropRule;
        return rule ? rule(intent) : true;
      },
      onMove: (intent) => {
        const accepted = optionsRef.current.onMove?.(intent);
        if (accepted !== false) scheduleFocusRef.current(intent.itemId);
        return accepted;
      },
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
    itemLabel: (id, data) => itemLabel(id, data),
    containerLabel,
    restoreHandleFocus: (id) => scheduleFocusRef.current(id),
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
      announceSessionEvent(
        localeRef.current,
        event,
        setLiveMessage,
        (id, data) => itemLabel(id, data),
        containerLabel,
      );
      if (event.type === "drop" || event.type === "cancel") {
        const itemId = event.type === "drop" ? event.intent.itemId : event.itemId;
        scheduleFocusRef.current(itemId);
      }
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
