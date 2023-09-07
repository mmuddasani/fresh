import { PartialSlot } from "$fresh/runtime.ts";

export default function SlotDemo() {
  return (
    <div>
      <h1>Slots</h1>
      <PartialSlot name="slot-1">
        <p>Default slot content</p>
      </PartialSlot>
      <div>
        <a href="/foo/bar" fh-partial="/partials/foo">/foo/bar</a>
      </div>
    </div>
  );
}
