import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  ...authTables,
  users: defineTable({
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    email: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    phone: v.optional(v.string()),
    phoneVerificationTime: v.optional(v.number()),
    isAnonymous: v.optional(v.boolean()),
    displayName: v.optional(v.string()),
    trainingFocus: v.optional(v.string()),
    createdAt: v.optional(v.number()),
  })
    .index("email", ["email"])
    .index("phone", ["phone"]),
  workouts: defineTable({
    userId: v.id("users"),
    type: v.union(v.literal("cycling"), v.literal("strength")),
    performedAt: v.number(),
    durationSeconds: v.number(),
    perceivedEffort: v.optional(v.number()),
    memo: v.optional(v.string()),
    distanceKm: v.optional(v.number()),
    avgPower: v.optional(v.number()),
    elevationGain: v.optional(v.number()),
  })
    .index("by_user_performedAt", ["userId", "performedAt"])
    .index("by_user_type", ["userId", "type"]),
  strengthSets: defineTable({
    workoutId: v.id("workouts"),
    exerciseName: v.string(),
    setIndex: v.number(),
    weightKg: v.optional(v.number()),
    reps: v.number(),
  }).index("by_workout", ["workoutId"]),
});
