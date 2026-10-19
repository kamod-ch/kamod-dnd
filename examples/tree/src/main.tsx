import {
  DndProvider,
  isNoOpMove,
  useDndContext,
  useDndState,
  type MoveIntent,
} from "@kamod-ch/dnd";
import { useSortable, useSortableContainer } from "@kamod-ch/dnd/sortable";
import {
  applyTreeMove,
  createFixtureTree,
  DEFAULT_ROOT_CONTAINER_ID,
  parentOf,
  projectKeyboardMove,
  validateTreeMove,
  type TreeNode,
  type TreeState,
} from "@kamod-ch/dnd/tree";
import { render } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";

/** Application recipe: expand a collapsed parent after the pointer rests on it. */
export const COLLAPSED_HOVER_EXPAND_MS = 900;

function App() {
  const reducedMotion = new URLSearchParams(window.location.search).get("motion") === "reduce";
  const fixture = new URLSearchParams(window.location.search).get("fixture");
  if (fixture === "isolation") return <IsolationApp reducedMotion={reducedMotion} />;
  return <TreePage name="main" reducedMotion={reducedMotion} />;
}

function IsolationApp({ reducedMotion }: { reducedMotion: boolean }) {
  return (
    <div style={{ display: "flex", gap: 48, padding: 16 }}>
      <TreePage name="a" reducedMotion={reducedMotion} />
      <TreePage name="b" reducedMotion={reducedMotion} />
    </div>
  );
}

function TreePage({ name, reducedMotion }: { name: string; reducedMotion: boolean }) {
  const [tree, setTree] = useState<TreeState>(() => createFixtureTree());
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    rA: true,
    c1: true,
    rB: true,
  });
  const [lastIntent, setLastIntent] = useState("none");
  const [lastReject, setLastReject] = useState("none");
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
      sourceContainerId: DEFAULT_ROOT_CONTAINER_ID,
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

  useEffect(() => {
    const host = window as Window & { __collapseNode?: (id: string) => void };
    host.__collapseNode = (id: string) => setExpanded((prev) => ({ ...prev, [id]: false }));
    return () => {
      delete host.__collapseNode;
    };
  }, []);

  return (
    <DndProvider<TreeNode>
      onMove={onMove}
      reducedMotion={reducedMotion}
      getItemLabel={(_id, node) => node.label}
    >
      <CommitBridge commitRef={commitRef} />
      <div
        style={{ fontFamily: "system-ui", padding: 16, maxWidth: 720 }}
        data-testid={`tree-${name}`}
      >
        <h1 data-testid="tree-title">Tree example</h1>
        <DebugPanel
          name={name}
          lastIntent={lastIntent}
          lastReject={lastReject}
          tree={tree}
          onMoveG1ToEmptyRootB={moveG1ToEmptyRootB}
        />
        <div role="tree" aria-label={`Sample hierarchy ${name}`} data-testid={`tree-root-${name}`}>
          <TreeList
            containerId={DEFAULT_ROOT_CONTAINER_ID}
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
  const { controller, announce, itemLabel, containerLabel } = useDndContext<TreeNode>();
  commitRef.current = (intent) => {
    const sourceIndex = controller.getContainerIds(intent.sourceContainerId).indexOf(intent.itemId);
    const accepted = controller.tryCommitMove(intent);
    if (!accepted) return false;
    if (sourceIndex >= 0 && isNoOpMove(intent, sourceIndex)) return true;
    const item = itemLabel(intent.itemId, intent.data);
    if (intent.sourceContainerId === intent.targetContainerId) {
      announce("moved", { item, position: String(intent.targetIndex + 1) });
      return true;
    }
    announce("movedToContainer", { item, container: containerLabel(intent.targetContainerId) });
    return true;
  };
  return null;
}

function DebugPanel({
  name,
  lastIntent,
  lastReject,
  tree,
  onMoveG1ToEmptyRootB,
}: {
  name: string;
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
      <p data-testid={`last-intent-${name}`}>Last intent: {lastIntent}</p>
      <p data-testid={`last-reject-${name}`}>Last reject: {lastReject}</p>
      <p data-testid={`engine-over-container-${name}`}>
        Engine over container: {snapshot.overContainerId ?? "none"}
      </p>
      <p data-testid={`engine-over-id-${name}`}>Engine over id: {snapshot.overId ?? "none"}</p>
      <p data-testid={`parent-c2-${name}`}>Parent of c2: {parentOf(tree, "c2") ?? "unknown"}</p>
      <button type="button" data-testid={`move-g1-to-rB-${name}`} onClick={onMoveG1ToEmptyRootB}>
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
      style={{ marginLeft: depth > 1 ? 16 : 0, minHeight: itemIds.length === 0 ? 36 : undefined }}
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

function useCollapsedHoverExpand(
  nodeId: string,
  hasChildren: boolean,
  isOpen: boolean,
  setExpanded: (fn: (prev: Record<string, boolean>) => Record<string, boolean>) => void,
) {
  const { reducedMotion } = useDndContext();
  const state = useDndState();
  const resting = state.phase === "dragging" && state.overId === nodeId && hasChildren && !isOpen;

  useEffect(() => {
    if (!resting) return;
    const delay = reducedMotion ? 0 : COLLAPSED_HOVER_EXPAND_MS;
    const timer = window.setTimeout(() => {
      setExpanded((prev) => (prev[nodeId] ? prev : { ...prev, [nodeId]: true }));
    }, delay);
    return () => window.clearTimeout(timer);
  }, [resting, nodeId, reducedMotion, setExpanded]);
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
  const hasChildren = node.childIds.length > 0;
  const { itemRef, handleRef, isDragging } = useSortable({
    id: node.id,
    containerId: parentOf(tree, node.id) ?? DEFAULT_ROOT_CONTAINER_ID,
    data: node,
  });
  useCollapsedHoverExpand(node.id, hasChildren, isOpen, setExpanded);

  return (
    <div
      role="treeitem"
      aria-level={depth}
      aria-expanded={hasChildren ? isOpen : undefined}
      data-testid={`node-${node.id}`}
      data-parent={parentOf(tree, node.id) ?? "unknown"}
      style={{ marginBottom: 8, opacity: isDragging ? 0.5 : 1 }}
    >
      <div ref={itemRef} style={{ display: "flex", gap: 8, alignItems: "center", minHeight: 32 }}>
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
        {hasChildren ? (
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
