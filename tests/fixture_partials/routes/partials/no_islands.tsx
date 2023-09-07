import { defineRoute } from "$fresh/src/server/defines.ts";
import { RouteConfig } from "$fresh/server.ts";
import { PartialSlot } from "$fresh/runtime.ts";

export const config: RouteConfig = {
  skipAppWrapper: true,
  skipInheritedLayouts: true,
};

export default defineRoute((req, ctx) => {
  return (
    <PartialSlot name="slot-1">
      <p class="status">it works</p>
    </PartialSlot>
  );
});
