import type { CollabStatus } from "./types";

/** Allowed moves for an invitation (spec 11.1). Anything else is rejected with 400. */
export const TRANSITIONS: Record<CollabStatus, CollabStatus[]> = {
  invited: ["accepted", "declined", "countered"],
  countered: ["accepted", "invited"],
  accepted: ["in_progress"],
  in_progress: ["submitted"],
  submitted: ["completed"],
  declined: [],
  completed: []
};

export const canMove = (from: CollabStatus, to: CollabStatus) => TRANSITIONS[from].includes(to);
