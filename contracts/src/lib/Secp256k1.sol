// SPDX-License-Identifier: GPL-3.0-only
pragma solidity ^0.8.30;

/// @title Secp256k1
/// @notice Secp256k1 curve operations.
library Secp256k1 {
    struct Point {
        uint256 x;
        uint256 y;
    }

    error NotOnCurve();
    error InvalidMulMulAddWitness();

    uint256 internal constant B = 7;
    uint256 internal constant P = 0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffefffffc2f;
    uint256 internal constant N = 0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141;

    /// @notice Computes `R = P + Q`.
    function add(Point memory p, Point memory q) internal view returns (Point memory r) {
        // See <https://www.hyperelliptic.org/EFD/g1p/auto-shortw.html>
        //
        // Since we are doing a single addition; we just implement the affine
        // formulas instead of the more efficient projective formulas, the
        // additional gas cost of storing the projective `Z` coordinate in
        // storage is higher than the additional cost of arithmetic. Note
        // that we optimize the computation to do as few `_divmod`s as
        // possible (one per operation), as that is by far the most expensive
        // computation (~200 gas for the `modexp` precompile call).

        (uint256 px, uint256 py) = _unpack(p);
        (uint256 qx, uint256 qy) = _unpack(q);

        uint256 l;
        if (px | py == 0) {
            return q;
        } else if (qx | qy == 0) {
            return p;
        } else if (px != qx) {
            unchecked {
                l = _divmod(addmod(qy, P - py, P), addmod(qx, P - px, P), P);
            }
        } else if (py == qy) {
            unchecked {
                l = _divmod(mulmod(3, mulmod(px, px, P), P), addmod(py, py, P), P);
            }
        } else {
            return r;
        }

        unchecked {
            uint256 l2 = mulmod(l, l, P);
            uint256 l3 = mulmod(l2, l, P);
            uint256 xx = addmod(px, qx, P);
            r.x = addmod(l2, P - xx, P);
            r.y = addmod(mulmod(addmod(px, xx, P), l, P), P - addmod(l3, py, P), P);
        }
        return r;
    }

    /// @notice Verifies that `z⋅G - e⋅P = R`.
    function mulmuladd(uint256 z, uint256 e, Point memory p, Point memory r) internal view {
        (uint256 px, uint256 py) = _unpack(p);
        (uint256 rx, uint256 ry) = _unpack(r);
        bool valid;
        assembly ("memory-safe") {
            let ptr := mload(0x40)
            mstore(ptr, mulmod(z, px, N))
            mstore(add(ptr, 0x20), add(and(py, 1), 27))
            mstore(add(ptr, 0x40), px)
            mstore(add(ptr, 0x60), mulmod(e, px, N))
            let minusR := mul(mload(0x00), staticcall(gas(), 0x1, ptr, 0x80, 0x00, 0x20))
            mstore(0x00, rx)
            mstore(0x20, sub(P, ry))
            valid := eq(minusR, and(keccak256(0x00, 0x40), 0xffffffffffffffffffffffffffffffffffffffff))
        }
        require(valid, InvalidMulMulAddWitness());
    }

    function _unpack(Point memory p) private pure returns (uint256 x, uint256 y) {
        x = p.x;
        y = p.y;
        bool valid;
        assembly ("memory-safe") {
            valid := or(
                iszero(or(x, y)),
                and(eq(mulmod(y, y, P), addmod(mulmod(x, mulmod(x, x, P), P), B, P)), and(lt(x, P), lt(y, P)))
            )
        }
        require(valid, NotOnCurve());
    }

    function _divmod(uint256 x, uint256 y, uint256 p) private view returns (uint256 result) {
        bool success;
        assembly ("memory-safe") {
            let ptr := mload(0x40)
            mstore(ptr, 32)
            mstore(add(ptr, 0x20), 32)
            mstore(add(ptr, 0x40), 32)
            mstore(add(ptr, 0x60), y)
            mstore(add(ptr, 0x80), sub(p, 2))
            mstore(add(ptr, 0xa0), p)
            success := staticcall(gas(), 0x5, ptr, 0xc0, 0x00, 0x20)
            result := mulmod(x, mload(0x00), p)
        }
        assert(success);
    }
}
