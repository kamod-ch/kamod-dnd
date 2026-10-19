import type { DndId, MoveIntent } from "../session/types.js";
import { applyMoveIntentToIds } from "../sortable/apply-move.js";

/** Default root container id for container-per-parent tree adapters. */
export const DEFAULT_ROOT_CONTAINER_ID = "__tree_root__";

export type TreeNode = {
  readonly id: DndId;
  readonly label: string;
  readonly childIds: readonly DndId[];
};

export type TreeState = {
  readonly rootIds: readonly DndId[];
  readonly nodes: Readonly<Record<DndId, TreeNode>>;
};

export type TreeMoveResult =
  | { readonly ok: true; readonly state: TreeState }
  | { readonly ok: false; readonly reason: string };

export type TreeKeyboardAction =
  | { readonly type: "up" }
  | { readonly type: "down" }
  | { readonly type: "indent" }
  | { readonly type: "outdent" };

export function treeToContainers(state: TreeState): Record<DndId, DndId[]> {
  const containers: Record<DndId, DndId[]> = {
    [DEFAULT_ROOT_CONTAINER_ID]: [...state.rootIds],
  };
  for (const node of Object.values(state.nodes)) {
    containers[node.id] = [...node.childIds];
  }
  return containers;
}

export function treeFromContainers(
  containers: Record<DndId, DndId[]>,
  previous: TreeState,
): TreeState {
  const rootIds = [...(containers[DEFAULT_ROOT_CONTAINER_ID] ?? [])];
  const nodes: Record<DndId, TreeNode> = {};
  for (const node of Object.values(previous.nodes)) {
    nodes[node.id] = {
      ...node,
      childIds: [...(containers[node.id] ?? [])],
    };
  }
  return { rootIds, nodes };
}

export function parentOf(state: TreeState, itemId: DndId): DndId | null {
  if (state.rootIds.includes(itemId)) return DEFAULT_ROOT_CONTAINER_ID;
  for (const node of Object.values(state.nodes)) {
    if (node.childIds.includes(itemId)) return node.id;
  }
  return null;
}

export function descendantIds(state: TreeState, itemId: DndId): DndId[] {
  const node = state.nodes[itemId];
  if (!node) return [];
  const collected: DndId[] = [];
  const walk = (id: DndId) => {
    const current = state.nodes[id];
    if (!current) return;
    for (const childId of current.childIds) {
      collected.push(childId);
      walk(childId);
    }
  };
  walk(itemId);
  return collected;
}

export function isKnownContainer(state: TreeState, containerId: DndId): boolean {
  if (containerId === DEFAULT_ROOT_CONTAINER_ID) return true;
  return containerId in state.nodes;
}

export function validateTreeMove(state: TreeState, intent: MoveIntent): string | null {
  if (!(intent.itemId in state.nodes)) return "unknown-item";
  const actualParent = parentOf(state, intent.itemId);
  if (actualParent === null) return "orphan-item";
  if (actualParent !== intent.sourceContainerId) return "source-mismatch";
  if (!isKnownContainer(state, intent.targetContainerId)) return "unknown-target";

  const blockedTargets = new Set<DndId>([intent.itemId, ...descendantIds(state, intent.itemId)]);
  if (blockedTargets.has(intent.targetContainerId)) return "cycle";

  return null;
}

export function applyTreeMove(state: TreeState, intent: MoveIntent): TreeMoveResult {
  const reason = validateTreeMove(state, intent);
  if (reason) return { ok: false, reason };

  const containers = treeToContainers(state);
  const nextContainers = applyMoveIntentToIds(containers, intent);
  return { ok: true, state: treeFromContainers(nextContainers, state) };
}

function siblingOrder(state: TreeState, containerId: DndId): readonly DndId[] {
  if (containerId === DEFAULT_ROOT_CONTAINER_ID) return state.rootIds;
  return state.nodes[containerId]?.childIds ?? [];
}

export function projectKeyboardMove(
  state: TreeState,
  itemId: DndId,
  action: TreeKeyboardAction,
): MoveIntent<TreeNode> | null {
  const node = state.nodes[itemId];
  if (!node) return null;
  const containerId = parentOf(state, itemId);
  if (containerId === null) return null;
  const siblings = siblingOrder(state, containerId);
  const idx = siblings.indexOf(itemId);
  if (idx < 0) return null;

  if (action.type === "up") {
    if (idx === 0) return null;
    return {
      kind: "move",
      itemId,
      sourceContainerId: containerId,
      targetContainerId: containerId,
      targetIndex: idx - 1,
      data: node,
    };
  }

  if (action.type === "down") {
    if (idx >= siblings.length - 1) return null;
    return {
      kind: "move",
      itemId,
      sourceContainerId: containerId,
      targetContainerId: containerId,
      targetIndex: idx + 1,
      data: node,
    };
  }

  if (action.type === "indent") {
    if (idx === 0) return null;
    const prevSibling = siblings[idx - 1]!;
    const targetChildren = state.nodes[prevSibling]?.childIds ?? [];
    return {
      kind: "move",
      itemId,
      sourceContainerId: containerId,
      targetContainerId: prevSibling,
      targetIndex: targetChildren.length,
      data: node,
    };
  }

  if (containerId === DEFAULT_ROOT_CONTAINER_ID) return null;
  const parentNode = state.nodes[containerId];
  if (!parentNode) return null;
  const grandparent = parentOf(state, containerId);
  if (grandparent === null) return null;
  const parentIndex = siblingOrder(state, grandparent).indexOf(containerId);
  if (parentIndex < 0) return null;
  return {
    kind: "move",
    itemId,
    sourceContainerId: containerId,
    targetContainerId: grandparent,
    targetIndex: parentIndex + 1,
    data: node,
  };
}

export function createFixtureTree(): TreeState {
  return {
    rootIds: ["rA", "rB"],
    nodes: {
      rA: { id: "rA", label: "Root A", childIds: ["c1", "c2"] },
      rB: { id: "rB", label: "Root B (empty children)", childIds: [] },
      c1: { id: "c1", label: "Child 1", childIds: ["g1"] },
      c2: { id: "c2", label: "Child 2", childIds: [] },
      g1: { id: "g1", label: "Grandchild", childIds: [] },
    },
  };
}
