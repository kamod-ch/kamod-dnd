import {
  applyBatchToContainers,
  batchIndexFromSingle,
  commitBatchMove,
  stableBatchMembers,
  type BatchMember,
  type BatchMoveIntent,
} from "@kamod-ch/dnd";

export type { BatchMember, BatchMoveIntent };
export type ContainerOrders = Record<string, readonly string[]>;

export const stableMembers = stableBatchMembers;
export { batchIndexFromSingle };

export function applyBatch(
  containers: ContainerOrders,
  members: readonly BatchMember[],
  targetContainerId: string,
  targetIndex: number,
): ContainerOrders | null {
  return applyBatchToContainers(containers, members, targetContainerId, targetIndex);
}

export function commitBatch<TData>(
  containers: ContainerOrders,
  members: readonly BatchMember<TData>[],
  targetContainerId: string,
  targetIndex: number,
  allow: (member: BatchMember<TData>) => boolean,
): { intent: BatchMoveIntent<TData>; orders: ContainerOrders } | null {
  return commitBatchMove(containers, members, targetContainerId, targetIndex, allow);
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
