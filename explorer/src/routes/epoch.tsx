import { createFileRoute } from "@tanstack/react-router";
import { Container } from "@/components/Groups";

export const Route = createFileRoute("/epoch")({
	component: EpochInfoPage,
});

export function EpochInfoPage() {
	return <Container>Test</Container>;
}
