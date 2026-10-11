import { createFileRoute } from "@tanstack/react-router";
import { Text } from "@mantine/core";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  return <Text>HomePage</Text>;
}
