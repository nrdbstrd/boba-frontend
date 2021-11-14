import boardHandlers from "./boards";
import feedHandlers from "./feeds";
import realmHandlers from "./realms";
import { setupServer } from "msw/node";
import usersHandlers from "./users";

// let worker: SetupWorkerApi;
// let server: SetupServerApi;
// if (typeof window !== "undefined" && process.env.JEST_WORKER_ID === undefined) {
//
//   worker.start();
// } else {
//   const server = setupServer(...handlers);
//   server.listen();
// }
// export default { worker, server };
export const server = setupServer(
  ...boardHandlers,
  ...usersHandlers,
  ...realmHandlers,
  ...feedHandlers
);