import { useQuery } from "@tanstack/react-query";
import { useProvider } from "@/hooks/useProvider";
import { useSettings } from "@/hooks/useSettings";
import { loadTransactionProposals, type TransactionProposal } from "@/lib/consensus";

export function useRecentTransactionProposals() {
	const [settings] = useSettings();
	const provider = useProvider();
	return useQuery<TransactionProposal[], Error>({
		queryKey: ["recentProposals", settings.consensus],
		queryFn: () => loadTransactionProposals({ provider, consensus: settings.consensus }),
		refetchInterval: 10000,
		initialData: [],
	});
}
