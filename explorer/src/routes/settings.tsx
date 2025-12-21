import { createFileRoute } from "@tanstack/react-router";
import { ConditionalBackButton } from "@/components/BackButton";
import { Box, Container, ContainerTitle } from "@/components/Groups";
import { SettingsForm } from "@/components/settings/SettingsForms";

export const Route = createFileRoute("/settings")({
	component: SettingsPage,
});

export function SettingsPage() {
	return (
		<Container>
			<ConditionalBackButton />
			<ContainerTitle>Settings</ContainerTitle>
			<Box>
				<SettingsForm />
			</Box>
		</Container>
	);
}
