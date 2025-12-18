import { type Hex, hashTypedData, zeroAddress } from "viem";
import type { TransactionProposal } from "./consensus";

const SAFE_TX_TYPE = {
	SafeTx: [
		{ name: "to", type: "address" },
		{ name: "value", type: "uint256" },
		{ name: "data", type: "bytes" },
		{ name: "operation", type: "uint8" },
		{ name: "safeTxGas", type: "uint256" },
		{ name: "baseGas", type: "uint256" },
		{ name: "gasPrice", type: "uint256" },
		{ name: "gasToken", type: "address" },
		{ name: "refundReceiver", type: "address" },
		{ name: "nonce", type: "uint256" },
	],
};

export const calculateSafeTxHash = ({ transaction }: TransactionProposal): Hex => {
	const domain = {
		chainId: transaction.chainId,
		verifyingContract: transaction.account,
	};

	const message = {
		to: transaction.to,
		value: transaction.value,
		data: transaction.data,
		operation: transaction.operation,
		safeTxGas: 0n,
		baseGas: 0n,
		gasPrice: 0n,
		gasToken: zeroAddress,
		refundReceiver: zeroAddress,
		nonce: transaction.nonce,
	};

	return hashTypedData({
		domain,
		types: SAFE_TX_TYPE,
		primaryType: "SafeTx",
		message,
	});
};
