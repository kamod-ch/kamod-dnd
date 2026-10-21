import { signal } from "@preact/signals";
import type {
  BatchDropRule,
  BatchMoveIntent,
  CancelReason,
  DndContainerRegistration,
  DndId,
  DndItemRegistration,
  DndPhase,
  DndSessionEvent,
  DndSessionSnapshot,
  DropRule,
  GetContainerDropIndex,
  MoveIntent,
  SortableOrientation,
} from "./types.js";
import type { PointerActivation } from "../engine/pragmatic/pointer-activation.js";
import { buildMoveIntent, indexAfterRemoval, isNoOpMove } from "../sortable/move-helpers.js";
import { indexEdgeFromPhysical } from "../sortable/orientation.js";
import type { Edge } from "@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge";

export type DndControllerOptions<TData> = {
  dropRule?: DropRule<TData>;
  batchDropRule?: BatchDropRule<TData>;
  onMove?: (intent: MoveIntent<TData>) => boolean | void;
  onBatchMove?: (intent: BatchMoveIntent<TData>) => boolean | void;
  onCancel?: (reason: CancelReason) => void;
  pointerActivation?: PointerActivation;
};

export type ItemSessionState = {
  isDragging: boolean;
  isOver: boolean;
};

type ItemStateListener = (state: ItemSessionState) => void;
type ContainerPreviewListener = (previewIndex: number | null) => void;

export class DndController<TData = unknown> {
  readonly #phase = signal<DndPhase>("idle");
  readonly #activeId = signal<DndId | null>(null);
  readonly #overId = signal<DndId | null>(null);
  readonly #overContainerId = signal<DndId | null>(null);
  readonly #canDrop = signal(false);
  readonly #previewIndex = signal<number | null>(null);
  readonly #previewContainerId = signal<DndId | null>(null);
  readonly #activeData = signal<TData | null>(null);

  readonly #items = new Map<DndId, DndItemRegistration<TData>>();
  readonly #containers = new Map<DndId, DndContainerRegistration>();
  readonly #containerOrder = new Map<DndId, DndId[]>();
  readonly #handles = new Map<DndId, HTMLElement>();
  readonly #itemElements = new Map<DndId, HTMLElement>();
  readonly #detachedItemIds = new Set<DndId>();
  readonly pointerActivation: PointerActivation | undefined;

  readonly #itemStateListeners = new Map<DndId, Set<ItemStateListener>>();
  readonly #containerPreviewListeners = new Map<DndId, Set<ContainerPreviewListener>>();

  readonly #options: DndControllerOptions<TData>;
  readonly #listeners = new Set<(event: DndSessionEvent<TData>) => void>();
  #lastOverKey: string | null = null;
  /** Opaque provider scope. Internal to the engine; not part of MoveIntent. */
  readonly scopeToken = globalThis.crypto.randomUUID();

  constructor(options: DndControllerOptions<TData> = {}) {
    this.#options = options;
    this.pointerActivation = options.pointerActivation;
  }

  subscribe(listener: (event: DndSessionEvent<TData>) => void): () => void {
    this.#listeners.add(listener);
    return () => {
      this.#listeners.delete(listener);
    };
  }

  subscribeToItemState(itemId: DndId, listener: ItemStateListener): () => void {
    let set = this.#itemStateListeners.get(itemId);
    if (!set) {
      set = new Set();
      this.#itemStateListeners.set(itemId, set);
    }
    set.add(listener);
    listener(this.#readItemState(itemId));
    const disposers = [
      this.#activeId.subscribe(() => listener(this.#readItemState(itemId))),
      this.#overId.subscribe(() => listener(this.#readItemState(itemId))),
    ];
    return () => {
      set!.delete(listener);
      if (set!.size === 0) this.#itemStateListeners.delete(itemId);
      disposers.forEach((d) => d());
    };
  }

  subscribeToContainerPreview(containerId: DndId, listener: ContainerPreviewListener): () => void {
    let set = this.#containerPreviewListeners.get(containerId);
    if (!set) {
      set = new Set();
      this.#containerPreviewListeners.set(containerId, set);
    }
    set.add(listener);
    listener(this.#readContainerPreview(containerId));
    const disposers = [
      this.#previewContainerId.subscribe(() => listener(this.#readContainerPreview(containerId))),
      this.#previewIndex.subscribe(() => listener(this.#readContainerPreview(containerId))),
    ];
    return () => {
      set!.delete(listener);
      if (set!.size === 0) this.#containerPreviewListeners.delete(containerId);
      disposers.forEach((d) => d());
    };
  }

  #readItemState(itemId: DndId): ItemSessionState {
    return {
      isDragging: this.#activeId.value === itemId,
      isOver: this.#overId.value === itemId,
    };
  }

  #readContainerPreview(containerId: DndId): number | null {
    return this.#previewContainerId.value === containerId ? this.#previewIndex.value : null;
  }

  #emit(event: DndSessionEvent<TData>): void {
    const snapshot: Array<(event: DndSessionEvent<TData>) => void> = [];
    for (const listener of this.#listeners) snapshot.push(listener);
    for (const listener of snapshot) {
      try {
        listener(event);
      } catch {
        // A listener must not block reset or the remaining listeners.
      }
    }
  }

  readSnapshot(): DndSessionSnapshot<TData> {
    return {
      phase: this.#phase.value,
      activeId: this.#activeId.value,
      overId: this.#overId.value,
      overContainerId: this.#overContainerId.value,
      canDrop: this.#canDrop.value,
      previewIndex: this.#previewIndex.value,
      previewContainerId: this.#previewContainerId.value,
      activeData: this.#activeData.value,
    };
  }

  // Expose signals for Preact bindings
  readonly signals = {
    phase: this.#phase,
    activeId: this.#activeId,
    overId: this.#overId,
    overContainerId: this.#overContainerId,
    canDrop: this.#canDrop,
    previewIndex: this.#previewIndex,
    previewContainerId: this.#previewContainerId,
    activeData: this.#activeData,
  };

  registerContainer(reg: DndContainerRegistration): void {
    const previous = this.#containers.get(reg.id);
    this.#containers.set(reg.id, { ...previous, ...reg, id: reg.id });
    if (!this.#containerOrder.has(reg.id)) {
      this.#containerOrder.set(reg.id, []);
    }
  }

  updateContainerRegistration(reg: Partial<DndContainerRegistration> & { id: DndId }): void {
    const previous = this.#containers.get(reg.id);
    if (!previous) {
      this.registerContainer({ ...reg, id: reg.id });
      return;
    }
    this.#containers.set(reg.id, { ...previous, ...reg, id: reg.id });
  }

  getContainerRegistration(containerId: DndId): DndContainerRegistration | undefined {
    return this.#containers.get(containerId);
  }

  unregisterContainer(id: DndId): void {
    const activeId = this.#activeId.value;
    const activeItem = activeId ? this.#items.get(activeId) : undefined;
    const removesLiveTarget =
      activeItem?.containerId === id ||
      this.#overContainerId.value === id ||
      this.#previewContainerId.value === id;
    this.#containers.delete(id);
    this.#containerOrder.delete(id);
    if (activeId && removesLiveTarget) {
      this.cancel("target-removed");
    }
  }

  setContainerOrder(containerId: DndId, ids: DndId[]): void {
    const previous = this.#containerOrder.get(containerId) ?? [];
    const next = [...ids];
    if (sameIds(previous, next)) return;
    const activeId = this.#activeId.value;
    const activeItem = activeId ? this.#items.get(activeId) : undefined;
    const sessionActive = this.#phase.value === "dragging" || this.#phase.value === "dropping";
    const affectsSession =
      sessionActive &&
      !!activeItem &&
      (containerId === activeItem.containerId || containerId === this.#previewContainerId.value);
    this.#containerOrder.set(containerId, next);
    if (affectsSession) this.cancel("external-data-change");
  }

  registerItem(reg: DndItemRegistration<TData>): void {
    this.#items.set(reg.id, reg);
    this.#detachedItemIds.delete(reg.id);
  }

  updateItemRegistration(reg: DndItemRegistration<TData>): void {
    const previous = this.#items.get(reg.id);
    if (!previous) {
      this.registerItem(reg);
      return;
    }
    const sessionActive = this.#phase.value === "dragging" || this.#phase.value === "dropping";
    const isActive = sessionActive && this.#activeId.value === reg.id;
    this.#items.set(reg.id, reg);
    if (!isActive) return;
    if (reg.disabled && !previous.disabled) {
      this.cancel("disabled");
      return;
    }
    if (reg.containerId !== previous.containerId) {
      this.cancel("external-data-change");
      return;
    }
    // Keep the latest payload on the registration. The active-data signal stays
    // at drag start so a fresh data object cannot retrigger snapshot subscribers.
  }

  #itemStillInOrder(itemId: DndId): boolean {
    for (const ids of this.#containerOrder.values()) {
      if (ids.includes(itemId)) return true;
    }
    return false;
  }

  detachItem(id: DndId): void {
    if (this.#activeId.value === id && this.#itemStillInOrder(id)) {
      this.#detachedItemIds.add(id);
      this.#handles.delete(id);
      return;
    }
    this.unregisterItem(id);
  }

  unregisterItem(id: DndId): void {
    this.#items.delete(id);
    this.#detachedItemIds.delete(id);
    if (this.#activeId.value === id) {
      this.cancel("source-removed");
    }
  }

  getItemData(id: DndId): TData | undefined {
    return this.#items.get(id)?.data;
  }

  isItemDetached(id: DndId): boolean {
    return this.#detachedItemIds.has(id);
  }

  registerHandle(id: DndId, element: HTMLElement): void {
    this.#handles.set(id, element);
  }

  unregisterHandle(id: DndId, element: HTMLElement): void {
    if (this.#handles.get(id) === element) this.#handles.delete(id);
  }

  registerItemElement(id: DndId, element: HTMLElement): void {
    this.#itemElements.set(id, element);
  }

  unregisterItemElement(id: DndId, element: HTMLElement): void {
    if (this.#itemElements.get(id) === element) this.#itemElements.delete(id);
  }

  getItemElement(id: DndId): HTMLElement | undefined {
    return this.#itemElements.get(id);
  }

  focusHandle(id: DndId): boolean {
    const element = this.#handles.get(id);
    const item = this.#items.get(id);
    if (!element || !element.isConnected || !item || item.disabled) return false;
    element.focus();
    return true;
  }

  getContainerIds(containerId: DndId): DndId[] {
    return this.#containerOrder.get(containerId) ?? [];
  }

  handleDragStart(itemId: DndId): void {
    const item = this.#items.get(itemId);
    if (!item || item.disabled) return;
    this.#phase.value = "dragging";
    this.#activeId.value = itemId;
    this.#activeData.value = item.data;
    this.#lastOverKey = null;
    this.#emit({ type: "start", itemId, data: item.data });
  }

  setPreviewIndex(containerId: DndId, targetIndex: number): void {
    if (this.#phase.value !== "dragging") return;
    const activeId = this.#activeId.value;
    if (!activeId) return;
    const item = this.#items.get(activeId);
    if (!item || item.containerId !== containerId) return;

    const targetIds = this.getContainerIds(containerId);
    const clamped = Math.max(0, Math.min(targetIndex, targetIds.length));

    this.#overId.value = null;
    this.#overContainerId.value = containerId;
    this.#previewContainerId.value = containerId;
    this.#previewIndex.value = clamped;

    const intent = buildMoveIntent({
      itemId: activeId,
      sourceContainerId: item.containerId,
      targetContainerId: containerId,
      targetIndex: clamped,
      data: item.data,
    });

    const allowed = this.#options.dropRule ? this.#options.dropRule(intent) : true;
    this.#canDrop.value = allowed;

    const overKey = `${containerId}\0${clamped}\0${allowed}\0keyboard`;
    if (overKey === this.#lastOverKey) return;
    this.#lastOverKey = overKey;
    this.#emit({
      type: "over",
      itemId: activeId,
      sourceContainerId: item.containerId,
      containerId,
      targetIndex: clamped,
      overId: null,
      canDrop: allowed,
    });
  }

  handleDragOver(args: {
    overId: DndId | null;
    overContainerId: DndId;
    edge: Edge | null;
    clientX?: number;
    clientY?: number;
  }): void {
    if (this.#phase.value !== "dragging") return;
    const activeId = this.#activeId.value;
    if (!activeId) return;
    const item = this.#items.get(activeId);
    if (!item) return;

    this.#overId.value = args.overId;
    this.#overContainerId.value = args.overContainerId;

    const sourceIds = this.getContainerIds(item.containerId);
    const targetIds = this.getContainerIds(args.overContainerId);
    const containerReg = this.#containers.get(args.overContainerId);
    const orientation: SortableOrientation = containerReg?.orientation ?? "vertical";
    const direction = containerReg?.direction ?? "ltr";

    let targetIndex: number;
    if (args.overId === null && containerReg?.getDropIndex && args.clientX !== undefined) {
      const projected = containerReg.getDropIndex({
        containerId: args.overContainerId,
        clientX: args.clientX,
        clientY: args.clientY ?? 0,
        itemIds: targetIds,
        activeId,
      });
      targetIndex = Math.max(0, Math.min(projected, targetIds.length));
    } else {
      const edge = indexEdgeFromPhysical(orientation, direction, args.edge);
      targetIndex = indexAfterRemoval(
        sourceIds,
        targetIds,
        activeId,
        args.overId,
        edge,
        item.containerId === args.overContainerId,
      );
    }

    this.#previewContainerId.value = args.overContainerId;
    this.#previewIndex.value = targetIndex;

    const intent = buildMoveIntent({
      itemId: activeId,
      sourceContainerId: item.containerId,
      targetContainerId: args.overContainerId,
      targetIndex,
      data: item.data,
    });

    const allowed = this.#options.dropRule ? this.#options.dropRule(intent) : true;
    this.#canDrop.value = allowed;

    const overKey = `${args.overContainerId}\0${targetIndex}\0${allowed}`;
    if (overKey === this.#lastOverKey) return;
    this.#lastOverKey = overKey;
    this.#emit({
      type: "over",
      itemId: activeId,
      sourceContainerId: item.containerId,
      containerId: args.overContainerId,
      targetIndex,
      overId: args.overId,
      canDrop: allowed,
    });
  }

  clearDragTarget(): void {
    if (this.#phase.value !== "dragging") return;
    this.#overId.value = null;
    this.#overContainerId.value = null;
    this.#previewContainerId.value = null;
    this.#previewIndex.value = null;
    this.#canDrop.value = false;
    this.#lastOverKey = null;
  }

  handleDrop(): void {
    if (this.#phase.value !== "dragging") return;
    const activeId = this.#activeId.value;
    if (!activeId) return;
    const item = this.#items.get(activeId);
    if (!item) {
      this.cancel("source-removed");
      return;
    }
    const targetContainer = this.#previewContainerId.value;
    const targetIndex = this.#previewIndex.value;
    if (targetContainer === null || targetIndex === null) {
      this.cancel("pointer-cancel");
      return;
    }
    const container = this.#containers.get(targetContainer);
    if (!container || container.disabled) {
      this.cancel("target-removed");
      return;
    }

    const intent = buildMoveIntent({
      itemId: activeId,
      sourceContainerId: item.containerId,
      targetContainerId: targetContainer,
      targetIndex,
      data: item.data,
    });
    if (this.#completeNoOp(intent)) return;

    const allowed = this.#options.dropRule ? this.#options.dropRule(intent) : true;
    if (!allowed) {
      this.cancel("rejected");
      return;
    }

    this.#phase.value = "dropping";
    const accepted = this.#options.onMove?.(intent);
    if (accepted === false) {
      this.cancel("rejected");
      return;
    }
    this.#emit({ type: "drop", intent });
    this.reset();
  }

  cancel(reason: CancelReason): void {
    if (this.#phase.value === "idle") return;
    const itemId = this.#activeId.value;
    this.#phase.value = "cancelled";
    this.#options.onCancel?.(reason);
    if (itemId) {
      this.#emit({ type: "cancel", itemId, reason });
    }
    this.reset();
  }

  tryCommitMove(intent: MoveIntent<TData>): boolean {
    const sourceIndex = this.getContainerIds(intent.sourceContainerId).indexOf(intent.itemId);
    if (sourceIndex >= 0 && isNoOpMove(intent, sourceIndex)) return true;
    const allowed = this.#options.dropRule ? this.#options.dropRule(intent) : true;
    if (!allowed) return false;
    const accepted = this.#options.onMove?.(intent);
    if (accepted === false) return false;
    return true;
  }

  tryCommitBatch(intent: BatchMoveIntent<TData>): boolean {
    const batchRule = this.#options.batchDropRule;
    for (const member of intent.members) {
      const allowed = batchRule
        ? batchRule({
            ...member,
            targetContainerId: intent.targetContainerId,
            targetIndex: intent.targetIndex,
          })
        : this.#options.dropRule
          ? this.#options.dropRule({
              itemId: member.id,
              sourceContainerId: member.containerId,
              targetContainerId: intent.targetContainerId,
              targetIndex: intent.targetIndex,
              data: member.data,
            })
          : true;
      if (!allowed) return false;
    }
    if (!this.#options.onBatchMove) return false;
    const accepted = this.#options.onBatchMove(intent);
    if (accepted === false) return false;
    this.#emit({ type: "dropBatch", intent });
    return true;
  }

  reset(): void {
    this.#phase.value = "idle";
    this.#activeId.value = null;
    this.#overId.value = null;
    this.#overContainerId.value = null;
    this.#canDrop.value = false;
    this.#previewIndex.value = null;
    this.#previewContainerId.value = null;
    this.#activeData.value = null;
    this.#lastOverKey = null;
    this.#detachedItemIds.clear();
  }

  dispose(): void {
    this.cancel("unmount");
    this.#items.clear();
    this.#containers.clear();
    this.#containerOrder.clear();
    this.#handles.clear();
    this.#itemElements.clear();
    this.#listeners.clear();
    this.#itemStateListeners.clear();
    this.#containerPreviewListeners.clear();
    this.#detachedItemIds.clear();
  }

  #completeNoOp(intent: MoveIntent<TData>): boolean {
    const sourceIndex = this.getContainerIds(intent.sourceContainerId).indexOf(intent.itemId);
    if (sourceIndex < 0 || !isNoOpMove(intent, sourceIndex)) return false;
    this.#phase.value = "dropping";
    this.#emit({ type: "drop", intent });
    this.reset();
    return true;
  }
}

function sameIds(left: readonly DndId[], right: readonly DndId[]): boolean {
  return left.length === right.length && left.every((id, index) => id === right[index]);
}

export type { GetContainerDropIndex, SortableOrientation };
