// SPDX-License-Identifier: GPL-3.0-only
pragma solidity ^0.8.30;

library Hash {
    /// @notice Efficienly hashes a pair of values without allocating memory.
    function pair(bytes32 a, bytes32 b) internal pure returns (bytes32 digest) {
        assembly ("memory-safe") {
            mstore(0x00, a)
            mstore(0x20, b)
            digest := keccak256(0x00, 0x40)
        }
    }
}
