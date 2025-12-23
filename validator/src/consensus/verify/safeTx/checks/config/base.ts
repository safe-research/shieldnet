import {
	type AbiStateMutability,
	type ContractFunctionArgs,
	decodeFunctionData,
	type ParseAbiItem,
	parseAbiItem,
	size,
	toFunctionSelector,
} from "viem";
import type { TransactionCheck } from "../../handler.js";
import type { MetaTransaction } from "../../schemas.js";

abstract class BaseSafeConfigCheck<S extends string> implements TransactionCheck {
	private selector: string;
	private abi: ParseAbiItem<S>;

	constructor(signature: S) {
		this.abi = parseAbiItem(signature as string) as ParseAbiItem<S>;
		this.selector = toFunctionSelector(signature);
	}

	check(tx: MetaTransaction): void {
		// Config changes are transactions to the account itself
		if (tx.account !== tx.to) return;
		if (tx.operation !== 0) throw new Error("Delegatecall not allowed");
		if (tx.value !== 0n) throw new Error(`Expected no value got ${tx.value}`);
		// Don't handle transactions with too short data
		if (size(tx.data) < 4) return;
		const extractedSelector = tx.data.slice(0, 10);
		// Don't handle unknown selector
		if (extractedSelector !== this.selector) return;
		const parsedData = decodeFunctionData<ParseAbiItem<S>[]>({ abi: [this.abi], data: tx.data });
		this.handleParsedData(parsedData.args);
	}

	abstract handleParsedData(data: ContractFunctionArgs<ParseAbiItem<S>[], AbiStateMutability>): void;
}

export function createConfigCheck<S extends string>(
	signature: S,
	handler: (args: ContractFunctionArgs<[ParseAbiItem<S>], "nonpayable">) => void,
) {
	return class extends BaseSafeConfigCheck<S> {
		constructor() {
			super(signature);
		}
		handleParsedData(args: ContractFunctionArgs<[ParseAbiItem<S>], "nonpayable">) {
			handler(args);
		}
	};
}
