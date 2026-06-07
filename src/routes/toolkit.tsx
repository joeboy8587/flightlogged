import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/toolkit")({
  component: () => <Outlet />,
});