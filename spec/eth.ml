module Address = struct
  type t = string

  let equal = String.equal
  let compare = String.compare
end

module Abi = struct
  type t =
    [ `Uint16 of int
    | `Uint32 of int
    | `Uint64 of int
    | `Uint256 of int
    | `Address of Address.t
    | `Bytes32 of string ]

  let encode (_ : t list) = Placeholder.fn ()
  let encode_packed (_ : t list) = Placeholder.fn ()
  let encode_call (_ : string) (_ : t list) = Placeholder.fn ()
  let hash_typed_data (_ : 'a) : string = Placeholder.fn ()
end
