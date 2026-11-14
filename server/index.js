import { connectDatabase, createIndexes } from "./db.js";
import { createApp } from "./app.js";

try {
  const connection = await connectDatabase();
  await createIndexes(connection.db);
  const app = createApp({ ...connection, production: process.env.NODE_ENV === "production" });
  const port = Number(process.env.PORT || 3001);
  const server = app.listen(port, "0.0.0.0", () => console.log(`Ayush CRM API ready at http://localhost:${port}`));
  for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => server.close(async () => { await connection.client.close(); process.exit(0); }));
} catch (error) {
  console.error("CRM startup failed:", error.name, "Check MongoDB credentials, Atlas IP access and network connectivity.");
  process.exitCode = 1;
}
