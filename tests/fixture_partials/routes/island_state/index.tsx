import { PartialSlot } from "$fresh/runtime.ts";
import Counter from "../../islands/Counter.tsx";

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
      <p>
        <a href="/island_state/injected" fh-partial="/island_state/partial">
          click me
        </a>
      </p>
    </div>
  );
}
