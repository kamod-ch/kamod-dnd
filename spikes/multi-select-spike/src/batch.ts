export type ContainerOrders = Record<string, readonly string[]>;

export type BatchMember<TData = unknown> = {
  id: string;
  containerId: string;
  data: TData;
};

/** Separate from `MoveIntent`. `itemIds` stays a list; the single-item intent keeps one id. */
export type BatchMoveIntent<TData = unknown> = {
  kind: "batch";
  itemIds: readonly string[];
  targetContainerId: string;
  /** Index in the target after every selected id has been removed. */
  targetIndex: number;
  members: readonly BatchMember<TData>[];
};

export function stableMembers<TData>(
  containerOrder: readonly string[],
  containers: ContainerOrders,
  selected: ReadonlySet<string>,
  dataFor: (id: string) => TData,
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
  targetIds: readonly string[];
  activeId: string;
  selected: ReadonlySet<string>;
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

export function applyBatch(
  containers: ContainerOrders,
  members: readonly BatchMember[],
  targetContainerId: string,
  targetIndex: number,
): ContainerOrders | null {
  if (members.length === 0) return null;
  const ids = members.map((member) => member.id);
  if (new Set(ids).size !== ids.length) return null;
  const located = new Map<string, string>();
  for (const [containerId, list] of Object.entries(containers)) {
    for (const id of list) located.set(id, containerId);
  }
  for (const member of members) {
    if (located.get(member.id) !== member.containerId) return null;
  }
  const moving = new Set(ids);
  const next: Record<string, string[]> = {};
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

export function commitBatch<TData>(
  containers: ContainerOrders,
  members: readonly BatchMember<TData>[],
  targetContainerId: string,
  targetIndex: number,
  allow: (member: BatchMember<TData>) => boolean,
): { intent: BatchMoveIntent<TData>; orders: ContainerOrders } | null {
  if (members.length === 0 || members.some((member) => !allow(member))) return null;
  const orders = applyBatch(containers, members, targetContainerId, targetIndex);
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

export function sameOrders(left: ContainerOrders, right: ContainerOrders): boolean {
  const keys = new Set([...Object.keys(left), ...Object.keys(right)]);
  for (const key of keys) {
    const a = left[key] ?? [];
    const b = right[key] ?? [];
    if (a.length !== b.length || a.some((id, index) => id !== b[index])) return false;
  }
  return true;
}
