// SPDX-License-Identifier: GPL-3.0-only
pragma solidity ^0.8.30;

contract ParticipantMerkleTree {
    // forge-lint: disable-start(mixed-case-variable)
    mapping(address participant => uint256 index) private $indexes;
    mapping(uint256 index => address participant) private $addresses;
    mapping(uint256 x => mapping(uint256 y => bytes32 digest)) private $tree;
    bytes32 private $root;
    uint256 private $height;
    // forge-lint: disable-end(mixed-case-variable)

    constructor(address[] memory participants) {
        address last = address(0);
        for (uint256 i = 0; i < participants.length; i++) {
            // Note that for FROST, participant indexes start from 1.
            uint256 index = i + 1;
            address participant = participants[i];
            $indexes[participant] = index;
            $addresses[index] = participant;
            $tree[i][0] = keccak256(abi.encode(index, participant));

            assert(participant > last);
            last = participant;
        }

        uint256 l = _nextPowerOfTwo(participants.length);
        uint256 y = 0;
        while (l > 1) {
            l >>= 1;
            y++;
            for (uint256 x = 0; x < l; x++) {
                uint256 xx = x << 1;
                uint256 yy = y - 1;

                bytes32 a = $tree[xx][yy];
                bytes32 b = $tree[xx + 1][yy];

                (bytes32 left, bytes32 right) = a < b ? (a, b) : (b, a);
                $tree[x][y] = keccak256(abi.encode(left, right));
            }
        }

        $root = $tree[0][y];
        $height = y;
    }

    function root() external view returns (bytes32 r) {
        return $root;
    }

    function addr(uint256 index) external view returns (address participant) {
        participant = $addresses[index];
        assert(participant != address(0));
    }

    function proof(uint256 index) external view returns (address participant, bytes32[] memory poap) {
        participant = $addresses[index];
        poap = _proof(index - 1);
        assert(participant != address(0));
    }

    function proof(address participant) external view returns (uint256 index, bytes32[] memory poap) {
        index = $indexes[participant];
        poap = _proof(index - 1);
        assert(index != 0);
    }

    function _proof(uint256 x) private view returns (bytes32[] memory poap) {
        poap = new bytes32[]($height);
        for (uint256 y = 0; y < poap.length; y++) {
            poap[y] = $tree[x ^ 1][y];
            x >>= 1;
        }
    }

    function _nextPowerOfTwo(uint256 l) private pure returns (uint256 result) {
        // See <https://stackoverflow.com/questions/466204/rounding-up-to-next-power-of-2>
        assert(l < 0x80000000);
        l--;
        l |= l >> 1;
        l |= l >> 2;
        l |= l >> 4;
        l |= l >> 8;
        l |= l >> 16;
        l++;
        return l;
    }
}
