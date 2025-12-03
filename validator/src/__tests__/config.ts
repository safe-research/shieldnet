import type { Address } from "viem";
import { InMemoryClientStorage } from "../consensus/storage/inmemory.js";
import { SqliteClientStorage } from "../consensus/storage/sqlite.js";
import { InMemoryStateStorage } from "../machine/storage/inmemory.js";
import { SqliteStateStorage } from "../machine/storage/sqlite.js";

const { SHIELDNET_TEST_VERBOSE, SHIELDNET_TEST_STORAGE } = process.env;

export const log =
	SHIELDNET_TEST_VERBOSE === "true" || SHIELDNET_TEST_VERBOSE === "1"
		? (...args: unknown[]) => console.log(...args)
		: (..._args: unknown[]) => {};

export const createClientStorage =
	SHIELDNET_TEST_STORAGE === "sqlite"
		? (account: Address) => new SqliteClientStorage(account, ":memory:")
		: (account: Address) => new InMemoryClientStorage(account);

export const createStateStorage =
	SHIELDNET_TEST_STORAGE === "sqlite" ? () => new SqliteStateStorage(":memory:") : () => new InMemoryStateStorage();
