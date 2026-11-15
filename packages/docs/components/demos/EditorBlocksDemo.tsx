import { DndProvider, type MoveIntent } from "@kamod-ch/dnd";
import { applyMoveIntentToIds, useSortable, useSortableContainer } from "@kamod-ch/dnd/sortable";
import type { JSX } from "preact";
import { Fragment } from "preact";
import { useRef, useState } from "preact/hooks";
import { DragHandle, dragItemClass } from "../shared/DragHandle";
import { useDemoReset, useExampleFrame } from "../shared/ExampleFrame";
import { InsertionMarker } from "../shared/InsertionMarker";
import { MoveMenu } from "../shared/MoveMenu";
import { formatMove } from "../shared/format-move";

type BlockType = "heading" | "text" | "image";
type Block = { id: string; type: BlockType; body: string };

function createBlocks(): Block[] {
  return [
    { id: "b1", type: "heading", body: "Chapter title" },
    { id: "b2", type: "text", body: "Paragraph with variable height.\nSecond line." },
    { id: "b3", type: "image", body: "Image placeholder" },
  ];
}

export const editorBlocksDemoCode = `import { DndProvider, type MoveIntent } from "@kamod-ch/dnd";
import { applyMoveIntentToIds, useSortable, useSortableContainer } from "@kamod-ch/dnd/sortable";
import { useState } from "preact/hooks";

type Block = { id: string; type: "heading" | "text" | "image"; body: string };

export function EditorBlocks() {
  const [blocks, setBlocks] = useState<Block[]>([
    { id: "b1", type: "heading", body: "Chapter title" },
    { id: "b2", type: "text", body: "Paragraph with variable height." },
    { id: "b3", type: "image", body: "Image placeholder" },
  ]);
  const [order, setOrder] = useState(() => blocks.map((block) => block.id));

  const onMove = (intent: MoveIntent<Block>) => {
    setOrder(applyMoveIntentToIds({ editor: order }, intent).editor);
    return true;
  };

  return (
    <DndProvider onMove={onMove} getItemLabel={(_, block) => block.body}>
      <EditorList order={order} blocks={blocks} setBlocks={setBlocks} />
    </DndProvider>
  );
}

function EditorList({
  order,
  blocks,
  setBlocks,
}: {
  order: string[];
  blocks: Block[];
  setBlocks: (fn: (prev: Block[]) => Block[]) => void;
}) {
  const { ref, previewIndex } = useSortableContainer({ id: "editor", itemIds: order });
  const byId = new Map(blocks.map((block) => [block.id, block]));

  return (
    <div ref={ref}>
      {order.map((id, index) => {
        const block = byId.get(id);
        if (!block) return null;
        return <EditorBlock key={id} block={block} showMarker={previewIndex === index} setBlocks={setBlocks} />;
      })}
      {previewIndex === order.length ? <div class="h-1 rounded-full bg-brand" /> : null}
    </div>
  );
}

function EditorBlock({
  block,
  showMarker,
  setBlocks,
}: {
  block: Block;
  showMarker?: boolean;
  setBlocks: (fn: (prev: Block[]) => Block[]) => void;
}) {
  const { itemRef, handleProps, moveByKeyboard } = useSortable({
    id: block.id,
    containerId: "editor",
    data: block,
  });

  return (
    <>
      {showMarker ? <div class="h-1 rounded-full bg-brand" aria-hidden="true" /> : null}
      <div ref={itemRef} class="mb-3 flex gap-2">
        <button {...handleProps} aria-label={\`Drag \${block.type}\`} class="min-h-11 min-w-11">⠿</button>
        {block.type === "text" ? (
          <div contentEditable>{block.body}</div>
        ) : (
          <input value={block.body} onInput={(event) => {
            const body = (event.target as HTMLInputElement).value;
            setBlocks((prev) => prev.map((item) => (item.id === block.id ? { ...item, body } : item)));
          }} />
        )}
        <button type="button" onClick={() => moveByKeyboard({ type: "up" })}>Up</button>
        <button type="button" onClick={() => moveByKeyboard({ type: "down" })}>Down</button>
      </div>
    </>
  );
}

// Drag starts on the handle, so the text stays selectable.`;

export function EditorBlocksDemo(): JSX.Element {
  const [blocks, setBlocks] = useState(createBlocks);
  const [order, setOrder] = useState(() => createBlocks().map((block) => block.id));
  const [resetKey, setResetKey] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { setNotice } = useExampleFrame();
  useDemoReset(() => {
    setBlocks(createBlocks());
    setOrder(createBlocks().map((block) => block.id));
    setResetKey((key) => key + 1);
  });

  const onMove = (intent: MoveIntent<Block>) => {
    setOrder(applyMoveIntentToIds({ editor: order }, intent).editor);
    const label = intent.data.body.split("\n")[0] || intent.data.type;
    setNotice({ tone: "move", text: formatMove(label, intent) });
    return true;
  };

  return (
    <div class="w-full max-w-xl">
      <p class="m-0 mb-3 text-xs text-muted-foreground">
        Select text in a block without starting a drag. Only the handle moves the block.
      </p>
      <DndProvider<Block>
        onMove={onMove}
        scrollRef={scrollRef}
        getItemLabel={(_, block) => block.body}
      >
        <div ref={scrollRef} class="max-h-80 overflow-auto pr-1">
          <SortableEditorList key={resetKey} order={order} blocks={blocks} setBlocks={setBlocks} />
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
  const { ref, previewIndex } = useSortableContainer({ id: "editor", itemIds: order });
  const byId = new Map(blocks.map((block) => [block.id, block]));

  return (
    <div ref={ref}>
      {order.map((id, index) => {
        const block = byId.get(id);
        if (!block) return null;
        return (
          <Fragment key={id}>
            {previewIndex === index ? <InsertionMarker /> : null}
            <EditorBlock block={block} setBlocks={setBlocks} />
          </Fragment>
        );
      })}
      {previewIndex === order.length ? <InsertionMarker /> : null}
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
  const { itemRef, handleProps, isDragging, moveByKeyboard } = useSortable({
    id: block.id,
    containerId: "editor",
    data: block,
  });
  const minHeight = block.type === "image" ? 120 : block.type === "heading" ? 56 : 72;

  return (
    <div
      ref={itemRef}
      data-dragging={isDragging ? "true" : "false"}
      class={`mb-3 flex items-start gap-1 ${dragItemClass}`}
    >
      <DragHandle label={`Drag ${block.type} block`} handleProps={handleProps} />
      <div class="min-w-0 flex-1 rounded-lg border border-border bg-card p-3" style={{ minHeight }}>
        <div class="mb-2 flex justify-end">
          <MoveMenu
            actions={[
              { id: "up", label: "Up", onSelect: () => moveByKeyboard({ type: "up" }) },
              { id: "down", label: "Down", onSelect: () => moveByKeyboard({ type: "down" }) },
            ]}
          />
        </div>
        {block.type === "heading" && (
          <input
            value={block.body}
            aria-label="Heading"
            onInput={(event) => {
              const body = (event.target as HTMLInputElement).value;
              setBlocks((prev) =>
                prev.map((item) => (item.id === block.id ? { ...item, body } : item)),
              );
            }}
            class="w-full border-0 bg-transparent text-lg font-semibold text-foreground outline-none"
          />
        )}
        {block.type === "text" && (
          <div
            contentEditable
            role="textbox"
            aria-label="Paragraph"
            aria-multiline="true"
            onInput={(event) => {
              const body = (event.target as HTMLElement).innerText;
              setBlocks((prev) =>
                prev.map((item) => (item.id === block.id ? { ...item, body } : item)),
              );
            }}
            class="text-sm whitespace-pre-wrap text-foreground outline-none"
          >
            {block.body}
          </div>
        )}
        {block.type === "image" && (
          <div class="flex h-24 items-center justify-center rounded-md bg-muted text-sm text-muted-foreground">
            {block.body}
          </div>
        )}
      </div>
    </div>
  );
}
