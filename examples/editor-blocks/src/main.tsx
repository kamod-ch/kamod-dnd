import "@kamod-ch/themes/theme.css";
import { DndProvider } from "@kamod-ch/dnd";
import type { MoveIntent } from "@kamod-ch/dnd";
import { applyMoveIntentToIds, useSortable, useSortableContainer } from "@kamod-ch/dnd/sortable";
import { Button } from "@kamod-ch/ui/button";
import { render } from "preact";
import { useRef, useState } from "preact/hooks";

type BlockType = "heading" | "text" | "image";
type Block = { id: string; type: BlockType; body: string };

const initialBlocks: Block[] = [
  { id: "b1", type: "heading", body: "Chapter title" },
  { id: "b2", type: "text", body: "Paragraph with variable height.\nSecond line." },
  { id: "b3", type: "image", body: "Image placeholder" },
];

function App() {
  const [blocks, setBlocks] = useState(initialBlocks);
  const [order, setOrder] = useState(() => initialBlocks.map((b) => b.id));
  const scrollRef = useRef<HTMLDivElement>(null);

  const onMove = (intent: MoveIntent<Block>) => {
    const containers = { editor: order };
    const next = applyMoveIntentToIds(containers, intent);
    setOrder(next.editor);
    return true;
  };

  return (
    <DndProvider<Block> onMove={onMove} scrollRef={scrollRef}>
      <div class="kp-theme" style={{ padding: 24, maxWidth: 720, margin: "0 auto" }}>
        <h1 data-testid="editor-title">Editor blocks</h1>
        <p>
          Select text here without dragging: <strong>stable selection</strong>
        </p>
        <div
          ref={scrollRef}
          data-testid="editor-scroll"
          style={{ maxHeight: 420, overflow: "auto", paddingRight: 8 }}
        >
          <SortableEditorList order={order} blocks={blocks} setBlocks={setBlocks} />
        </div>
      </div>
    </DndProvider>
  );
}

function SortableEditorList({
  order,
  blocks,
  setBlocks,
}: {
  order: string[];
  blocks: Block[];
  setBlocks: (fn: (prev: Block[]) => Block[]) => void;
}) {
  const { ref } = useSortableContainer({ id: "editor", itemIds: order });
  const byId = new Map(blocks.map((b) => [b.id, b]));

  return (
    <div ref={ref} data-testid="editor-list">
      {order.map((id) => {
        const block = byId.get(id);
        if (!block) return null;
        return <EditorBlock key={id} block={block} setBlocks={setBlocks} />;
      })}
    </div>
  );
}

function EditorBlock({
  block,
  setBlocks,
}: {
  block: Block;
  setBlocks: (fn: (prev: Block[]) => Block[]) => void;
}) {
  const { itemRef, handleRef, isDragging, moveByKeyboard } = useSortable({
    id: block.id,
    containerId: "editor",
    data: block,
  });

  const minHeight = block.type === "image" ? 120 : block.type === "heading" ? 56 : 72;

  return (
    <div
      ref={itemRef}
      data-testid={`block-${block.id}`}
      style={{
        display: "flex",
        gap: 12,
        marginBottom: 12,
        opacity: isDragging ? 0.5 : 1,
        alignItems: "flex-start",
      }}
    >
      <button
        ref={handleRef}
        type="button"
        data-testid={`handle-${block.id}`}
        aria-label="Drag block"
        style={{ touchAction: "none", marginTop: 8, cursor: "grab" }}
      >
        ⠿
      </button>
      <div
        style={{
          flex: 1,
          minHeight,
          border: "1px solid var(--kp-color-border, #ccc)",
          borderRadius: 8,
          padding: 12,
          background: "var(--kp-color-surface, #fff)",
        }}
      >
        {block.type === "heading" && (
          <input
            data-testid={`input-${block.id}`}
            value={block.body}
            onInput={(e) =>
              setBlocks((prev) =>
                prev.map((b) =>
                  b.id === block.id ? { ...b, body: (e.target as HTMLInputElement).value } : b,
                ),
              )
            }
            style={{ fontSize: 20, fontWeight: 600, width: "100%", border: "none" }}
          />
        )}
        {block.type === "text" && (
          <div
            contentEditable
            data-testid={`ce-${block.id}`}
            onInput={(e) =>
              setBlocks((prev) =>
                prev.map((b) =>
                  b.id === block.id ? { ...b, body: (e.target as HTMLElement).innerText } : b,
                ),
              )
            }
            style={{ whiteSpace: "pre-wrap", outline: "none" }}
          >
            {block.body}
          </div>
        )}
        {block.type === "image" && (
          <div
            data-testid={`image-${block.id}`}
            style={{
              height: 96,
              background: "var(--kp-color-muted, #eee)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {block.body}
          </div>
        )}
        <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
          <Button size="sm" variant="ghost" onClick={() => moveByKeyboard({ type: "up" })}>
            Up
          </Button>
          <Button size="sm" variant="ghost" onClick={() => moveByKeyboard({ type: "down" })}>
            Down
          </Button>
        </div>
      </div>
    </div>
  );
}

render(<App />, document.getElementById("app")!);
