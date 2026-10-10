import "@mantine/core/styles.css";
import { Button, MantineProvider } from "@mantine/core";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

// 参照ドキュメント: https://ja.react.dev/reference/react-dom/client/createRoot
const root = createRoot(document.getElementById("root")!);
root.render(
  <StrictMode>
    <MantineProvider>
      <Button variant="outline">KASANE Student</Button>
    </MantineProvider>
  </StrictMode>,
);
