// SPDX-License-Identifier: GPL-3.0-only
pragma solidity ^0.8.30;

import {Secp256k1} from "@/lib/Secp256k1.sol";

/// @title FROST Commitment Set
/// @notice A set of nonce commitments for FROST signature ceremonies.
library FROSTCommitmentSet {
    struct T {
        uint256 count;
        mapping(uint256 index => bytes32) commitments;
    }

    error AlreadyCommitted();
    error NotIncluded();

    /// @notice Commits to a hiding nonce `d` and binding nonce `e`.
    function commit(T storage self, uint256 index, Secp256k1.Point memory d, Secp256k1.Point memory e) internal {
        require(self.commitments[index] == bytes32(0), AlreadyCommitted());
        d.requireNonZero();
        e.requireNonZero();
        self.commitments[index] = _hash(d, e);
    }

    /// @notice Verifies that the specified commitment is part of the set.
    function verify(T storage self, uint256 index, Secp256k1.Point memory d, Secp256k1.Point memory e) internal {
        require(self.commitments[index] == _hash(d, e), NotIncluded());
    }

    function _hash(Secp256k1.Point memory d, Secp256k1.Point memory e) private pure returns (bytes32 digest) {
        return keccak256(abi.encode(d.x, d.y, e.x, e.y));
    }
}
