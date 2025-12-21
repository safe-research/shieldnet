import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { Container } from "@/components/Groups";
import { TransactionProposalList } from "@/components/transaction/Proposals";
import { useRecentTransactionProposals } from "@/hooks/useRecentTransactions";

const SafeIllustration = () => (
	<svg
		width="240"
		height="180"
		viewBox="0 0 240 180"
		fill="none"
		xmlns="http://www.w3.org/2000/svg"
		className="mx-auto mb-8"
	>
		<title>Safe Illustration</title>
		<rect x="40" y="40" width="160" height="120" rx="8" fill="#f8f8f8" stroke="#333" strokeWidth="2" />
		<rect x="60" y="60" width="120" height="80" rx="4" fill="#f0f0f0" stroke="#666" strokeWidth="1" />
		<rect x="90" y="80" width="60" height="10" rx="2" fill="#d0d0d0" />
		<rect x="90" y="100" width="60" height="10" rx="2" fill="#e0e0e0" />
		<rect x="90" y="120" width="60" height="10" rx="2" fill="#e0e0e0" />
		<rect x="60" y="40" width="30" height="20" rx="2" fill="#333" />
		<circle cx="75" cy="50" r="2" fill="#fff" />
	</svg>
);

export function App() {
	return <AppInner />;
}

const PAGE_SIZE = 10;

function AppInner() {
	const recentProposals = useRecentTransactionProposals();
	const { limit } = Route.useSearch();
	const navigate = useNavigate({ from: Route.fullPath });

	const handleShowMore = () => {
		navigate({
			search: (prev) => ({ ...prev, limit: (prev.limit ?? PAGE_SIZE) + PAGE_SIZE }),
			resetScroll: false,
			replace: true,
		});
	};
	return (
		<Container>
			<div className="text-center mb-12">
				<h1 className="text-3xl font-bold text-title sm:text-4xl mb-4">Shieldnet Explorer</h1>
				<p className="text-lg text-sub-title max-w-2xl mx-auto">Explore the future of transaction security!</p>
			</div>

			{recentProposals.data.length > 0 ? (
				<TransactionProposalList
					proposals={recentProposals.data}
					itemsToDisplay={limit ?? PAGE_SIZE}
					onShowMore={handleShowMore}
				/>
			) : (
				<div className="bg-white rounded-lg shadow-md p-8 border border-surface-outline max-w-2xl mx-auto">
					<SafeIllustration />
				</div>
			)}
		</Container>
	);
}

const entriesSearchSchema = z.object({
	limit: z.number().optional().catch(PAGE_SIZE),
});

export const Route = createFileRoute("/")({
	validateSearch: (search) => entriesSearchSchema.parse(search),
	component: App,
});
