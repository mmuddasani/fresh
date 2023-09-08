import { defineRoute } from "$fresh/src/server/defines.ts";
import { RouteConfig } from "$fresh/server.ts";
import { PartialSlot } from "$fresh/runtime.ts";
import Counter from "../../islands/Counter.tsx";

export const config: RouteConfig = {
  skipAppWrapper: true,
  skipInheritedLayouts: true,
};

export default defineRoute((req, ctx) => {
  return (
    <PartialSlot name="slot-1">
      <div>
        <p class="status">it works</p>
        <Counter />
      </div>
    </PartialSlot>
  );
});
