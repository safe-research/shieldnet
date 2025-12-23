import { type Hex, size } from "viem";
import type { TransactionCheck } from "../handler.js";
import type { MetaTransaction } from "../schemas.js";

export class NoDelegateCallCheck implements TransactionCheck {
	check(tx: MetaTransaction): void {
		if (tx.operation !== 0) throw new Error("Delegatecall not allowed");
	}
}

export class FixedParamsCheck implements TransactionCheck {
	constructor(private params: Partial<MetaTransaction>) {}

	check(tx: MetaTransaction): void {
		if (this.params.operation !== undefined && tx.operation !== this.params.operation) {
			throw new Error(`Expected operation ${this.params.operation} got ${tx.operation}`);
		}
		if (this.params.to !== undefined && tx.to !== this.params.to) {
			throw new Error(`Expected to ${this.params.to} got ${tx.to}`);
		}
		if (this.params.data !== undefined && tx.data !== this.params.data) {
			throw new Error(`Expected data ${this.params.data} got ${tx.data}`);
		}
		if (this.params.value !== undefined && tx.value !== this.params.value) {
			throw new Error(`Expected value ${this.params.value} got ${tx.value}`);
		}
	}
}

export class SupportedSelectorCheck implements TransactionCheck {
	constructor(
		private selectors: Hex[],
		private allowEmpty: boolean,
	) {}

	check(tx: MetaTransaction): void {
		const dataSize = size(tx.data);
		if (dataSize === 0 && this.allowEmpty) return;
		if (dataSize < 4) {
			throw new Error(`${tx.data} is not a valid selector`);
		}
		const selector = tx.data.slice(0, 10) as Hex;
		if (!this.selectors.includes(selector)) {
			throw new Error(`${selector} not supported`);
		}
	}
}
