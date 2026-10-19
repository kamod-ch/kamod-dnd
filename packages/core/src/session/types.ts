export type DndId = string;

export type DndPhase = "idle" | "dragging" | "dropping" | "cancelled";

export type CancelReason =
  | "escape"
  | "pointer-cancel"
  | "unmount"
  | "source-removed"
  | "target-removed"
  | "rejected"
  | "external-data-change"
  | "disabled";

export type DndSessionEvent<TData = unknown> =
  | {
      readonly type: "start";
      readonly itemId: DndId;
      readonly data: TData;
    }
  | {
      readonly type: "over";
      readonly itemId: DndId;
      readonly sourceContainerId: DndId;
      readonly containerId: DndId;
      readonly targetIndex: number;
      readonly overId: DndId | null;
      readonly canDrop: boolean;
    }
  | {
      readonly type: "drop";
      readonly intent: MoveIntent<TData>;
    }
  | {
      readonly type: "cancel";
      readonly itemId: DndId;
      readonly reason: CancelReason;
    };

export type MoveIntent<TData = unknown> = {
  readonly kind: "move";
  readonly itemId: DndId;
  readonly sourceContainerId: DndId;
  readonly targetContainerId: DndId;
  /** Index in the target container after removing the item from its source. */
  readonly targetIndex: number;
  readonly data: TData;
};

export type DropRuleContext<TData = unknown> = {
  readonly itemId: DndId;
  readonly sourceContainerId: DndId;
  readonly targetContainerId: DndId;
  readonly targetIndex: number;
  readonly data: TData;
};

export type DropRule<TData = unknown> = (ctx: DropRuleContext<TData>) => boolean;

export type DndSessionSnapshot<TData = unknown> = {
  readonly phase: DndPhase;
  readonly activeId: DndId | null;
  readonly overId: DndId | null;
  readonly overContainerId: DndId | null;
  readonly canDrop: boolean;
  readonly previewIndex: number | null;
  readonly previewContainerId: DndId | null;
  readonly activeData: TData | null;
};

export type DndItemRegistration<TData = unknown> = {
  id: DndId;
  containerId: DndId;
  data: TData;
  disabled?: boolean;
};

export type DndContainerRegistration = {
  id: DndId;
  disabled?: boolean;
};

export function isSamePositionIntent(intent: MoveIntent, sourceIndex: number): boolean {
  return (
    intent.sourceContainerId === intent.targetContainerId && intent.targetIndex === sourceIndex
  );
}
