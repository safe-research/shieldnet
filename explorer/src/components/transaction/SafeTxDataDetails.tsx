import type { Hex } from "viem";
import { useSettings } from "@/hooks/useSettings";
import { dataString } from "@/lib/safe/formatting";

export function SafeTxDataDetails({ data }: { data: Hex }) {
	const [settings] = useSettings();
	return (
		<>
			<div className={"flex justify-between"}>
				<p className={"text-xs"}>Data ({dataString(data)})</p>
				<a className={"text-xs"} href={`${settings.decoder}${data}`} target="_blank" rel="noopener noreferrer">
					decode
				</a>
			</div>
			<p className={"break-all font-mono"}>{data}</p>
		</>
	);
}
