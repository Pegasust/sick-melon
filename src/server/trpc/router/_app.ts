import { router } from "../trpc";
import { authRouter } from "./auth";
import { exampleRouter } from "./example";
import { userImageRouter } from "./image";
import { movieRouter } from "./movie";

export const appRouter = router({
  example: exampleRouter,
  auth: authRouter,
  movie: movieRouter,
  upload: router({
    user: userImageRouter,
  })
});

// export type definition of API
export type AppRouter = typeof appRouter;
