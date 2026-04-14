import { createApp } from "./app.js";
import { getEnv } from "./config/env.js";

const port = getEnv().port;
const app = createApp();

if (!process.env.VERCEL) {
  app.listen(port, () => {
    console.log(`itda-seoul backend listening on port ${port}`);
  });
}

export default app;
