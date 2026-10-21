import type { BatchMember, BatchMoveIntent, DndId } from "../session/types.js";

export type { BatchMember, BatchMoveIntent } from "../session/types.js";

export type ContainerOrders = Record<DndId, readonly DndId[]>;

export function stableBatchMembers<TData>(
  containerOrder: readonly DndId[],
  containers: ContainerOrders,
  selected: ReadonlySet<DndId>,
  dataFor: (id: DndId) => TData,
): BatchMember<TData>[] {
  const members: BatchMember<TData>[] = [];
  for (const containerId of containerOrder) {
    for (const id of containers[containerId] ?? []) {
      if (!selected.has(id)) continue;
      members.push({ id, containerId, data: dataFor(id) });
    }
  }
  return members;
}

/**
 * The engine index counts a list that still contains every selected id except
 * the active one when the drag started in that container. The batch index
 * counts only ids that stay behind.
 */
export function batchIndexFromSingle(args: {
  targetIds: readonly DndId[];
  activeId: DndId;
  selected: ReadonlySet<DndId>;
  singleTargetIndex: number;
  sameContainer: boolean;
}): number {
  const visible = args.sameContainer
    ? args.targetIds.filter((id) => id !== args.activeId)
    : args.targetIds;
  const clamped = Math.max(0, Math.min(args.singleTargetIndex, visible.length));
  let index = 0;
  for (let cursor = 0; cursor < clamped; cursor += 1) {
    if (!args.selected.has(visible[cursor]!)) index += 1;
  }
  return index;
}

export function applyBatchToContainers(
  containers: ContainerOrders,
  members: readonly BatchMember[],
  targetContainerId: DndId,
  targetIndex: number,
): ContainerOrders | null {
  if (members.length === 0) return null;
  const ids = members.map((member) => member.id);
  if (new Set(ids).size !== ids.length) return null;
  const located = new Map<DndId, DndId>();
  for (const [containerId, list] of Object.entries(containers)) {
    for (const id of list) located.set(id, containerId);
  }
  for (const member of members) {
    if (located.get(member.id) !== member.containerId) return null;
  }
  const moving = new Set(ids);
  const next: Record<DndId, DndId[]> = {};
  for (const [containerId, list] of Object.entries(containers)) {
    next[containerId] = list.filter((id) => !moving.has(id));
  }
  if (!next[targetContainerId]) next[targetContainerId] = [];
  const insertAt = Math.max(0, Math.min(targetIndex, next[targetContainerId].length));
  next[targetContainerId] = [
    ...next[targetContainerId].slice(0, insertAt),
    ...ids,
    ...next[targetContainerId].slice(insertAt),
  ];
  return next;
}

export function commitBatchMove<TData>(
  containers: ContainerOrders,
  members: readonly BatchMember<TData>[],
  targetContainerId: DndId,
  targetIndex: number,
  allow: (member: BatchMember<TData>) => boolean,
): { intent: BatchMoveIntent<TData>; orders: ContainerOrders } | null {
  if (members.length === 0 || members.some((member) => !allow(member))) return null;
  const orders = applyBatchToContainers(containers, members, targetContainerId, targetIndex);
  if (!orders) return null;
  return {
    intent: {
      kind: "batch",
      itemIds: members.map((member) => member.id),
      targetContainerId,
      targetIndex,
      members,
    },
    orders,
  };
}
