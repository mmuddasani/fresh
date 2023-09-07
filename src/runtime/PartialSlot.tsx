import { ComponentChildren, VNode } from "preact";

export interface PartialSlotProps {
  children?: ComponentChildren;
  name: string;
}

export function PartialSlot(props: PartialSlotProps): VNode {
  // deno-lint-ignore no-explicit-any
  return props.children as any;
}
