module Make () : sig
  type t

  val of_string : string -> t
  val equal : t -> t -> bool
  val compare : t -> t -> int
end = struct
  include String

  let of_string = Fun.id
end
