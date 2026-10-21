import { app } from "./app";

app.listen(3000);

console.log(`@kasane/api : ${app.server?.url.href}`);
