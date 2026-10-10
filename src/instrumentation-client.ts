import { initBotId } from "botid/client/core";

initBotId({
  protect: [{ path: "/api/convert", method: "POST" }],
});
