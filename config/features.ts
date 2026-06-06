/**
 * Single source of truth for feature flags.
 *
 * Every screen/route checks its flag and degrades gracefully when off.
 * Parked modules (see spec §6) stay OFF until their real-world constraint
 * (cost, platform, or policy) is acceptable.
 *
 * Guiding rule: Less, better. If a feature isn't in the spec, don't add it
 * without first updating the spec.
 */
export const FEATURES = {
  workoutLogging: true, // core
  splitBuilder: true, // core
  progress: true, // core
  socialFeed: true, // core (photos + text only in v1)
  aiSplitHelper: true, // core
  foodTracker: true, // core (USDA + Open Food Facts)
  weightGoals: true, // core

  // Parked — OFF until the constraint in §6 is acceptable:
  appleWatch: false, // requires NATIVE iOS / RN bridge, not web
  spotify: false, // API gated to orgs w/ 250k MAU; dev mode = 5 users
  videoPosts: false, // storage + moderation + bandwidth cost
} as const;

export type FeatureKey = keyof typeof FEATURES;

export function isFeatureEnabled(key: FeatureKey): boolean {
  return FEATURES[key];
}
