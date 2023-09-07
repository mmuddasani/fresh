import { PartialSlot } from "$fresh/runtime.ts";
import Counter from "../islands/Counter.tsx";

export default function SlotDemo() {
  return (
    <div>
      <div id="output">
        <PartialSlot name="slot-1">
          <div>
            <p>Default content</p>
            <Counter />
          </div>
        </PartialSlot>
      </div>
      <a href="/island_state/injected" fh-partial="/partials/island_state">
        click me
      </a>
    </div>
  );
}
