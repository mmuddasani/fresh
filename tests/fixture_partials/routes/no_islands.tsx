import { PartialSlot } from "$fresh/runtime.ts";

export default function SlotDemo() {
  return (
    <div>
      <div id="output">
        <PartialSlot name="slot-1">
          <p>Default content</p>
        </PartialSlot>
      </div>
      <a href="/no_islands/injected" fh-partial="/partials/no_islands">
        click me
      </a>
    </div>
  );
}
