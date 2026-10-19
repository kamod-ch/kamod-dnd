import { signal } from "@preact/signals";
import type {
  CancelReason,
  DndContainerRegistration,
  DndId,
  DndItemRegistration,
  DndPhase,
  DndSessionSnapshot,
  DropRule,
  MoveIntent,
} from "./types.js";
import { buildMoveIntent, indexAfterRemoval } from "../sortable/move-helpers.js";
import type { Edge } from "@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge";

export type DndControllerOptions<TData> = {
  dropRule?: DropRule<TData>;
  onMove?: (intent: MoveIntent<TData>) => boolean | void;
  onCancel?: (reason: CancelReason) => void;
};

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

  readonly #options: DndControllerOptions<TData>;

  constructor(options: DndControllerOptions<TData> = {}) {
    this.#options = options;
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
    this.#containers.set(reg.id, reg);
    if (!this.#containerOrder.has(reg.id)) {
      this.#containerOrder.set(reg.id, []);
    }
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
    this.#containerOrder.set(containerId, [...ids]);
  }

  registerItem(reg: DndItemRegistration<TData>): void {
    this.#items.set(reg.id, reg);
  }

  unregisterItem(id: DndId): void {
    this.#items.delete(id);
    if (this.#activeId.value === id) {
      this.cancel("source-removed");
    }
  }

  getItemData(id: DndId): TData | undefined {
    return this.#items.get(id)?.data;
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
  }

  handleDragOver(args: { overId: DndId | null; overContainerId: DndId; edge: Edge | null }): void {
    if (this.#phase.value !== "dragging") return;
    const activeId = this.#activeId.value;
    if (!activeId) return;
    const item = this.#items.get(activeId);
    if (!item) return;

    this.#overId.value = args.overId;
    this.#overContainerId.value = args.overContainerId;

    const sourceIds = this.getContainerIds(item.containerId);
    const targetIds = this.getContainerIds(args.overContainerId);
    const edge = args.edge === "bottom" ? "bottom" : "top";
    const targetIndex = indexAfterRemoval(
      sourceIds,
      targetIds,
      activeId,
      args.overId,
      edge,
      item.containerId === args.overContainerId,
    );

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
  }

  clearDragTarget(): void {
    if (this.#phase.value !== "dragging") return;
    this.#overId.value = null;
    this.#overContainerId.value = null;
    this.#previewContainerId.value = null;
    this.#previewIndex.value = null;
    this.#canDrop.value = false;
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
    this.reset();
  }

  cancel(reason: CancelReason): void {
    if (this.#phase.value === "idle") return;
    this.#phase.value = "cancelled";
    this.#options.onCancel?.(reason);
    this.reset();
  }

  tryCommitMove(intent: MoveIntent<TData>): boolean {
    const allowed = this.#options.dropRule ? this.#options.dropRule(intent) : true;
    if (!allowed) return false;
    const accepted = this.#options.onMove?.(intent);
    if (accepted === false) return false;
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
  }

  dispose(): void {
    this.cancel("unmount");
    this.#items.clear();
    this.#containers.clear();
    this.#containerOrder.clear();
  }
}
