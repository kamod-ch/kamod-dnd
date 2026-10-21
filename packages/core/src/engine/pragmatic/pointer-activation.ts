export type PointerActivation = {
  distance?: number;
  delay?: number;
};

type ActivationOrigin = { x: number; y: number; t: number };

const origins = new WeakMap<HTMLElement, ActivationOrigin>();

export function bindPointerActivationOrigin(handle: HTMLElement): () => void {
  const onDown = (event: PointerEvent) => {
    origins.set(handle, { x: event.clientX, y: event.clientY, t: Date.now() });
  };
  handle.addEventListener("pointerdown", onDown);
  return () => handle.removeEventListener("pointerdown", onDown);
}

export function pointerActivationAllowsDrag(
  handle: HTMLElement,
  input: { clientX: number; clientY: number },
  config: PointerActivation | undefined,
): boolean {
  if (!config?.distance && !config?.delay) return true;
  const start = origins.get(handle);
  if (!start) return false;
  if (config.distance !== undefined) {
    const dist = Math.hypot(input.clientX - start.x, input.clientY - start.y);
    if (dist < config.distance) return false;
  }
  if (config.delay !== undefined && Date.now() - start.t < config.delay) return false;
  return true;
}
