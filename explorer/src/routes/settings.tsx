import { createFileRoute } from "@tanstack/react-router";
import { Container } from "@/components/Groups";

export const Route = createFileRoute("/settings")({
	component: SettingsPage,
});

export function SettingsPage() {
	return <Container>Not Implemented</Container>;
}
