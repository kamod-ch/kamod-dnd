import { DndProvider, useDndContext, useDndState, type MoveIntent } from "@kamod-ch/dnd";
import { useSortable, useSortableContainer } from "@kamod-ch/dnd/sortable";
import { render } from "preact";
import { useRef, useState } from "preact/hooks";
import {
  applyTreeMove,
  createFixtureTree,
  parentOf,
  projectKeyboardMove,
  ROOT_CONTAINER_ID,
  validateTreeMove,
  type TreeNode,
  type TreeState,
} from "./model.js";

function App() {
  const [tree, setTree] = useState<TreeState>(() => createFixtureTree());
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    rA: true,
    c1: true,
    rB: true,
  });
  const [lastIntent, setLastIntent] = useState<string>("none");
  const [lastReject, setLastReject] = useState<string>("none");
  const commitRef = useRef<(intent: MoveIntent<TreeNode>) => boolean>(() => false);
  const commit = (intent: MoveIntent<TreeNode>) => commitRef.current(intent);

  const onMove = (intent: MoveIntent<TreeNode>) => {
    const validation = validateTreeMove(tree, intent);
    if (validation) {
      setLastReject(validation);
      setLastIntent(
        `${intent.itemId} → ${intent.targetContainerId}@${intent.targetIndex} (rejected)`,
      );
      return false;
    }
    const result = applyTreeMove(tree, intent);
    if (!result.ok) {
      setLastReject(result.reason);
      return false;
    }
    setTree(result.state);
    setLastReject("none");
    setLastIntent(
      `${intent.itemId} → ${intent.targetContainerId}@${intent.targetIndex} (accepted)`,
    );
    return true;
  };

  const runKeyboard = (itemId: string, action: "up" | "down" | "indent" | "outdent") => {
    const intent = projectKeyboardMove(tree, itemId, { type: action });
    if (!intent) {
      setLastReject(`keyboard-${action}-blocked`);
      return;
    }
    commit(intent);
  };

  const attemptCycle = () => {
    const node = tree.nodes.rA!;
    commit({
      kind: "move",
      itemId: "rA",
      sourceContainerId: ROOT_CONTAINER_ID,
      targetContainerId: "c1",
      targetIndex: 0,
      data: node,
    });
  };

  const moveG1ToEmptyRootB = () => {
    const node = tree.nodes.g1!;
    commit({
      kind: "move",
      itemId: "g1",
      sourceContainerId: "c1",
      targetContainerId: "rB",
      targetIndex: 0,
      data: node,
    });
  };

  return (
    <DndProvider<TreeNode> onMove={onMove} getItemLabel={(_id, node) => node.label}>
      <CommitBridge commitRef={commitRef} />
      <div style={{ fontFamily: "system-ui", padding: 16, maxWidth: 720 }}>
        <h1 data-testid="tree-title">Tree spike</h1>
        <DebugPanel
          lastIntent={lastIntent}
          lastReject={lastReject}
          tree={tree}
          onMoveG1ToEmptyRootB={moveG1ToEmptyRootB}
        />
        <div role="tree" aria-label="Sample hierarchy" data-testid="tree-root">
          <TreeList
            containerId={ROOT_CONTAINER_ID}
            itemIds={tree.rootIds}
            tree={tree}
            depth={1}
            expanded={expanded}
            setExpanded={setExpanded}
            onKeyboard={runKeyboard}
            onAttemptCycle={attemptCycle}
          />
        </div>
      </div>
    </DndProvider>
  );
}

function CommitBridge({
  commitRef,
}: {
  commitRef: { current: (intent: MoveIntent<TreeNode>) => boolean };
}) {
  const { controller } = useDndContext<TreeNode>();
  commitRef.current = (intent) => controller.tryCommitMove(intent);
  return null;
}

function DebugPanel({
  lastIntent,
  lastReject,
  tree,
  onMoveG1ToEmptyRootB,
}: {
  lastIntent: string;
  lastReject: string;
  tree: TreeState;
  onMoveG1ToEmptyRootB: () => void;
}) {
  const snapshot = useDndState();
  return (
    <aside
      style={{
        marginBottom: 16,
        padding: 12,
        border: "1px solid #ccc",
        borderRadius: 8,
        fontSize: 13,
      }}
    >
      <p data-testid="last-intent">Last intent: {lastIntent}</p>
      <p data-testid="last-reject">Last reject: {lastReject}</p>
      <p data-testid="engine-over-container">
        Engine over container: {snapshot.overContainerId ?? "none"}
      </p>
      <p data-testid="engine-over-id">Engine over id: {snapshot.overId ?? "none"}</p>
      <p data-testid="parent-c2">Parent of c2: {parentOf(tree, "c2") ?? "unknown"}</p>
      <button type="button" data-testid="move-g1-to-rB" onClick={onMoveG1ToEmptyRootB}>
        Move g1 → empty rB
      </button>
    </aside>
  );
}

function TreeList({
  containerId,
  itemIds,
  tree,
  depth,
  expanded,
  setExpanded,
  onKeyboard,
  onAttemptCycle,
}: {
  containerId: string;
  itemIds: readonly string[];
  tree: TreeState;
  depth: number;
  expanded: Record<string, boolean>;
  setExpanded: (fn: (prev: Record<string, boolean>) => Record<string, boolean>) => void;
  onKeyboard: (itemId: string, action: "up" | "down" | "indent" | "outdent") => void;
  onAttemptCycle?: () => void;
}) {
  const { ref } = useSortableContainer({ id: containerId, itemIds });

  return (
    <div
      ref={ref}
      role="group"
      data-testid={`children-${containerId}`}
      style={{ marginLeft: depth > 1 ? 16 : 0 }}
    >
      {itemIds.length === 0 ? (
        <p data-testid={`empty-${containerId}`} style={{ color: "#666", fontSize: 12 }}>
          Empty drop zone
        </p>
      ) : null}
      {itemIds.map((id) => (
        <TreeNodeView
          key={id}
          node={tree.nodes[id]!}
          tree={tree}
          depth={depth}
          expanded={expanded}
          setExpanded={setExpanded}
          onKeyboard={onKeyboard}
          onAttemptCycle={onAttemptCycle}
        />
      ))}
    </div>
  );
}

function TreeNodeView({
  node,
  tree,
  depth,
  expanded,
  setExpanded,
  onKeyboard,
  onAttemptCycle,
}: {
  node: TreeNode;
  tree: TreeState;
  depth: number;
  expanded: Record<string, boolean>;
  setExpanded: (fn: (prev: Record<string, boolean>) => Record<string, boolean>) => void;
  onKeyboard: (itemId: string, action: "up" | "down" | "indent" | "outdent") => void;
  onAttemptCycle?: () => void;
}) {
  const isOpen = expanded[node.id] ?? true;
  const { itemRef, handleRef, isDragging } = useSortable({
    id: node.id,
    containerId: parentOf(tree, node.id) ?? ROOT_CONTAINER_ID,
    data: node,
  });

  return (
    <div
      role="treeitem"
      aria-level={depth}
      aria-expanded={node.childIds.length > 0 ? isOpen : undefined}
      data-testid={`node-${node.id}`}
      data-parent={parentOf(tree, node.id) ?? "unknown"}
      style={{ marginBottom: 8, opacity: isDragging ? 0.5 : 1 }}
    >
      <div ref={itemRef} style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <button
          ref={handleRef}
          type="button"
          data-testid={`handle-${node.id}`}
          aria-label={`Drag ${node.label}`}
          style={{ cursor: "grab", touchAction: "none" }}
        >
          ⠿
        </button>
        <span>{node.label}</span>
        {node.childIds.length > 0 ? (
          <button
            type="button"
            data-testid={`toggle-${node.id}`}
            onClick={() =>
              setExpanded((prev) => ({ ...prev, [node.id]: !(prev[node.id] ?? true) }))
            }
          >
            {isOpen ? "▼" : "▶"}
          </button>
        ) : null}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, margin: "4px 0 4px 28px" }}>
        <button
          type="button"
          data-testid={`kb-up-${node.id}`}
          onClick={() => onKeyboard(node.id, "up")}
        >
          Up
        </button>
        <button
          type="button"
          data-testid={`kb-down-${node.id}`}
          onClick={() => onKeyboard(node.id, "down")}
        >
          Down
        </button>
        <button
          type="button"
          data-testid={`kb-indent-${node.id}`}
          onClick={() => onKeyboard(node.id, "indent")}
        >
          Indent
        </button>
        <button
          type="button"
          data-testid={`kb-outdent-${node.id}`}
          onClick={() => onKeyboard(node.id, "outdent")}
        >
          Outdent
        </button>
        {node.id === "rA" && onAttemptCycle ? (
          <button type="button" data-testid="attempt-cycle" onClick={onAttemptCycle}>
            Cycle rA→c1
          </button>
        ) : null}
      </div>
      {isOpen ? (
        <TreeList
          containerId={node.id}
          itemIds={node.childIds}
          tree={tree}
          depth={depth + 1}
          expanded={expanded}
          setExpanded={setExpanded}
          onKeyboard={onKeyboard}
        />
      ) : null}
    </div>
  );
}

render(<App />, document.getElementById("app")!);
