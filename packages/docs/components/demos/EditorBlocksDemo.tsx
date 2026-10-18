import { DndProvider, type MoveIntent } from "@kamod-ch/dnd";
import { applyMoveIntentToIds, useSortable, useSortableContainer } from "@kamod-ch/dnd/sortable";
import type { JSX } from "preact";
import { useRef, useState } from "preact/hooks";
import { DemoButton } from "../shared/DemoButton";

type BlockType = "heading" | "text" | "image";
type Block = { id: string; type: BlockType; body: string };

const initialBlocks: Block[] = [
  { id: "b1", type: "heading", body: "Chapter title" },
  { id: "b2", type: "text", body: "Paragraph with variable height.\nSecond line." },
  { id: "b3", type: "image", body: "Image placeholder" },
];

export const editorBlocksDemoCode = `const onMove = (intent: MoveIntent<Block>) => {
  const next = applyMoveIntentToIds({ editor: order }, intent);
  setOrder(next.editor);
  return true;
};

<DndProvider<Block> onMove={onMove} scrollRef={scrollRef}>
  <div ref={scrollRef} style={{ maxHeight: 420, overflow: "auto" }}>
    <SortableEditorList order={order} blocks={blocks} setBlocks={setBlocks} />
  </div>
</DndProvider>

// Drag only from the handle — text fields stay selectable.`;

export function EditorBlocksDemo(): JSX.Element {
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
    <div class="kp-theme w-full max-w-xl">
      <p class="mb-3 text-xs text-muted-foreground">
        Select text in a block without starting a drag — only the ⠿ handle moves blocks.
      </p>
      <DndProvider<Block> onMove={onMove} scrollRef={scrollRef}>
        <div ref={scrollRef} class="max-h-80 overflow-auto pr-1">
          <SortableEditorList order={order} blocks={blocks} setBlocks={setBlocks} />
        </div>
      </DndProvider>
    </div>
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
    <div ref={ref}>
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
      class="mb-3 flex items-start gap-3"
      style={{ opacity: isDragging ? 0.5 : 1 }}
    >
      <button
        ref={handleRef}
        type="button"
        aria-label="Drag block"
        class="mt-2 text-muted-foreground"
        style={{ touchAction: "none", cursor: "grab" }}
      >
        ⠿
      </button>
      <div class="flex-1 rounded-lg border border-border bg-card p-3" style={{ minHeight }}>
        {block.type === "heading" && (
          <input
            value={block.body}
            onInput={(e) =>
              setBlocks((prev) =>
                prev.map((b) =>
                  b.id === block.id ? { ...b, body: (e.target as HTMLInputElement).value } : b,
                ),
              )
            }
            class="w-full border-0 bg-transparent text-lg font-semibold outline-none"
          />
        )}
        {block.type === "text" && (
          <div
            contentEditable
            onInput={(e) =>
              setBlocks((prev) =>
                prev.map((b) =>
                  b.id === block.id ? { ...b, body: (e.target as HTMLElement).innerText } : b,
                ),
              )
            }
            class="text-sm whitespace-pre-wrap outline-none"
          >
            {block.body}
          </div>
        )}
        {block.type === "image" && (
          <div class="flex h-24 items-center justify-center rounded-md bg-muted text-sm text-muted-foreground">
            {block.body}
          </div>
        )}
        <div class="mt-2 flex gap-1">
          <DemoButton onClick={() => moveByKeyboard({ type: "up" })}>Up</DemoButton>
          <DemoButton onClick={() => moveByKeyboard({ type: "down" })}>Down</DemoButton>
        </div>
      </div>
    </div>
  );
}
