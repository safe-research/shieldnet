import { formatEther, type Hex, size } from "viem";

export const opString = (operation: 0 | 1) => (operation === 0 ? "CALL" : "DELEGATECALL");
export const valueString = (value: bigint) => `${formatEther(value)} ETH`;
export const dataString = (data: Hex) => `${size(data)} bytes of data`;
