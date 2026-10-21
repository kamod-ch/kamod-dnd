import { createContext } from "preact";
import { useContext, useEffect, useMemo, useRef } from "preact/hooks";
import type { ComponentChildren, RefObject } from "preact";
import { DndController, type DndControllerOptions } from "../session/controller.js";
import type { BatchMoveIntent, DndId } from "../session/types.js";
import type { PointerActivation } from "../engine/pragmatic/pointer-activation.js";
import { bindPragmaticEngine } from "../engine/pragmatic/bindings.js";
import type { DndLocale } from "../accessibility/messages.js";
import { resolveMessage, type DndMessageKey } from "../accessibility/messages.js";
import { DndAnnouncer } from "./announcer.js";

export type DndProviderProps<TData> = DndControllerOptions<TData> & {
  children: ComponentChildren;
  locale?: DndLocale;
  scrollRef?: RefObject<HTMLElement>;
  reducedMotion?: boolean;
  getItemLabel?: (id: DndId, data: TData) => string;
  getContainerLabel?: (id: DndId) => string;
  focusFallbackRef?: RefObject<HTMLElement | null>;
  pointerActivation?: PointerActivation;
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

export function DndProvider<TData>({
  children,
  locale,
  scrollRef,
  reducedMotion = false,
  getItemLabel,
  getContainerLabel,
  focusFallbackRef,
  pointerActivation,
  ...options
}: DndProviderProps<TData>) {
  const optionsRef = useRef(options);
  optionsRef.current = options;
  const labelsRef = useRef({ getItemLabel, getContainerLabel });
  labelsRef.current = { getItemLabel, getContainerLabel };

  const itemLabelFn = (id: DndId, data: TData | undefined) => {
    const resolve = labelsRef.current.getItemLabel;
    const payload = data ?? controllerRef.current?.getItemData(id);
    if (resolve && payload !== undefined) return resolve(id, payload);
    return id;
  };
  const containerLabelFn = (id: DndId) => labelsRef.current.getContainerLabel?.(id) ?? id;

  const scheduleFocusRef = useRef<(id: DndId) => void>(() => {});
  scheduleFocusRef.current = (itemId) => {
    const fallback = focusFallbackRef?.current ?? null;
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
      ...optionsRef.current,
      pointerActivation,
      dropRule: (intent) => {
        const rule = optionsRef.current.dropRule;
        return rule ? rule(intent) : true;
      },
      batchDropRule: (ctx) => {
        const rule = optionsRef.current.batchDropRule;
        return rule ? rule(ctx) : true;
      },
      onMove: (intent) => {
        const accepted = optionsRef.current.onMove?.(intent);
        if (accepted !== false) scheduleFocusRef.current(intent.itemId);
        return accepted;
      },
      onBatchMove: (intent: BatchMoveIntent<TData>) => {
        const accepted = optionsRef.current.onBatchMove?.(intent);
        if (accepted !== false && intent.itemIds[0]) {
          scheduleFocusRef.current(intent.itemIds[0]);
        }
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

  const setMessageRef = useRef<(message: string) => void>(() => {});

  const announceRef = useRef((key: DndMessageKey, args: Record<string, string>) => {
    setMessageRef.current(resolveMessage(localeRef.current, key, args));
  });

  const value = useMemo(
    (): DndContextValue<TData> => ({
      controller,
      locale,
      announce: announceRef.current,
      reducedMotion,
      itemLabel: (id, data) => itemLabelFn(id, data),
      containerLabel: containerLabelFn,
      restoreHandleFocus: (id) => scheduleFocusRef.current(id),
    }),
    [controller, locale, reducedMotion],
  );

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
      if (event.type === "dropBatch") {
        const first = event.intent.itemIds[0];
        if (first) scheduleFocusRef.current(first);
        return;
      }
      if (event.type === "drop" || event.type === "cancel") {
        const itemId = event.type === "drop" ? event.intent.itemId : event.itemId;
        scheduleFocusRef.current(itemId);
      }
    });
  }, [controller]);

  return (
    <DndContext.Provider value={value as DndContextValue<unknown>}>
      {children}
      <DndAnnouncer
        controller={controller}
        localeRef={localeRef}
        itemLabel={itemLabelFn}
        containerLabel={containerLabelFn}
        setMessageRef={setMessageRef}
      />
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
