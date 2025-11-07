// SPDX-License-Identifier: GPL-3.0-only
pragma solidity ^0.8.30;

import {Hashes} from "@oz/utils/cryptography/Hashes.sol";
import {MerkleProof} from "@oz/utils/cryptography/MerkleProof.sol";
import {Secp256k1} from "@/lib/Secp256k1.sol";

/// @title FROST Merkle Map
/// @notice A mapping of FROST participant indexes to their public address and
///         verification share.
library FROSTMerkleMap {
    using Secp256k1 for Secp256k1.Point;

    struct T {
        bytes32 root;
        mapping(uint256 index => Entry) entries;
    }

    struct Entry {
        address participant;
        Secp256k1.Point y;
    }

    error AlreadyInitialized();
    error AlreadyRegistered();
    error AlreadySet();
    error NotParticipating();

    bytes32 private constant _SEALED = bytes32(uint256(1));

    /// @notice initializes a merkle map with a root.
    function init(T storage self, bytes32 root) internal {
        require(self.root == bytes32(0), AlreadyInitialized());
        self.root = root;
    }

    /// @notice Seals the merkle map, making it no longer possible to register
    ///         new participants or set keys for existing participants.
    function seal(T storage self) internal {
        self.root = _SEALED;
    }

    /// @notice Registers a particpant to the merkle tree for the specified index.
    function register(T storage self, uint256 index, address participant, bytes32[] memory poap) internal {
        require(self.entries[index].participant == address(0), AlreadyRegistered());
        bytes32 leaf = Hashes.efficientKeccak256(bytes32(index), bytes32(uint256(uint160(participant))));
        require(MerkleProof.verify(poap, self.root, leaf), NotParticipating());
        self.entries[index].participant = participant;
    }

    /// @notice Sets the participant's verification share.
    function set(T storage self, uint256 index, address participant, Secp256k1.Point memory y) internal {
        Entry storage entry = self.entries[index];
        require(entry.y.x | entry.y.y == 0, AlreadySet());
        require(self.root != _SEALED && entry.participant == participant, NotParticipating());
        y.requireNonZero();
        entry.y = y;
    }

    /// @notice Gets the participants verification share.
    function get(T storage self, uint256 index) internal view returns (Secp256k1.Point memory y) {
        return self.entries[index].y;
    }
}
