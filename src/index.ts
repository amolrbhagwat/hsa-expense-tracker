import { buildApp } from "./app.js";

const app = buildApp(process.cwd());

app.listen({ host: "127.0.0.1", port: 3000 }, (err) => {
  if (err) {
    app.log.error(err);
    process.exit(1);
  }
});
