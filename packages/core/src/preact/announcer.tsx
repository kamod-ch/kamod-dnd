import { useEffect, useRef, useState } from "preact/hooks";
import type { RefObject } from "preact";
import type { DndController } from "../session/controller.js";
import type { DndId, DndSessionEvent } from "../session/types.js";
import { DndLiveRegion } from "../accessibility/live-region.js";
import type { DndLocale } from "../accessibility/messages.js";
import { resolveMessage } from "../accessibility/messages.js";

function messageForSessionEvent<TData>(
  locale: DndLocale | undefined,
  event: DndSessionEvent<TData>,
  itemLabel: (id: DndId, data: TData | undefined) => string,
  containerLabel: (id: DndId) => string,
): string | null {
  if (event.type === "start") {
    return resolveMessage(locale, "pickedUp", { item: itemLabel(event.itemId, event.data) });
  }
  if (event.type === "over") {
    if (!event.canDrop) return null;
    if (event.containerId === event.sourceContainerId) {
      return resolveMessage(locale, "moved", {
        item: itemLabel(event.itemId, undefined),
        position: String(event.targetIndex + 1),
      });
    }
    return resolveMessage(locale, "movedToContainer", {
      item: itemLabel(event.itemId, undefined),
      container: containerLabel(event.containerId),
    });
  }
  if (event.type === "drop") {
    return resolveMessage(locale, "dropped", {
      item: itemLabel(event.intent.itemId, event.intent.data),
    });
  }
  if (event.type === "dropBatch") {
    const labels = event.intent.members.map((m) => itemLabel(m.id, m.data)).join(", ");
    return resolveMessage(locale, "droppedBatch", {
      count: String(event.intent.itemIds.length),
      items: labels,
    });
  }
  return resolveMessage(locale, "cancelled", { item: itemLabel(event.itemId, undefined) });
}

export type DndAnnouncerProps<TData> = {
  controller: DndController<TData>;
  localeRef: RefObject<DndLocale | undefined>;
  itemLabel: (id: DndId, data: TData | undefined) => string;
  containerLabel: (id: DndId) => string;
  setMessageRef: RefObject<(message: string) => void>;
};

/** Subscribes to session events for screen reader output without re-rendering the provider tree. */
export function DndAnnouncer<TData>({
  controller,
  localeRef,
  itemLabel,
  containerLabel,
  setMessageRef,
}: DndAnnouncerProps<TData>) {
  const [liveMessage, setLiveMessage] = useState("");

  useEffect(() => {
    setMessageRef.current = setLiveMessage;
    return () => {
      setMessageRef.current = () => {};
    };
  }, [setMessageRef]);

  const itemLabelRef = useRef(itemLabel);
  const containerLabelRef = useRef(containerLabel);
  itemLabelRef.current = itemLabel;
  containerLabelRef.current = containerLabel;

  useEffect(() => {
    return controller.subscribe((event) => {
      const message = messageForSessionEvent(
        localeRef.current ?? undefined,
        event,
        itemLabelRef.current,
        containerLabelRef.current,
      );
      if (message !== null) setLiveMessage(message);
    });
  }, [controller, localeRef]);

  return <DndLiveRegion message={liveMessage} />;
}
