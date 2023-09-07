import { defineRoute } from "$fresh/src/server/defines.ts";
import { RouteConfig } from "$fresh/server.ts";
import { PartialSlot } from "$fresh/runtime.ts";

export const config: RouteConfig = {
  skipAppWrapper: true,
  skipInheritedLayouts: true,
};

let i = 0;

export default defineRoute((req, ctx) => {
  console.log(req.url);

  return (
    <PartialSlot name="slot-1">
      <p>Injected by server #{i++}</p>
    </PartialSlot>
  );
});
