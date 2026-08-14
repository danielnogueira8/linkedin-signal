import { createAvatar } from "@dicebear/core";
import { thumbs } from "@dicebear/collection";

/**
 * DiceBear "thumbs" faces are the visual identity of our synthetic agents —
 * arena personas and the job-runner agents. Real humans (engagers) keep
 * initials dots; only agents get faces, so synthetic vs. real stays legible.
 *
 * Generated locally (no network) and returned as a data URI for <img>.
 */
export function agentAvatarUri(seed: string): string {
  const avatar = createAvatar(thumbs, {
    seed,
    // brand-tinted background palette: cobalt, teal, ember soft tones
    backgroundColor: ["e5eeff", "d9f2e6", "fdeadb"],
    shapeColor: ["2f6fec", "1f7a5f", "e56d24", "1b1a16"],
  });
  return avatar.toDataUri();
}
