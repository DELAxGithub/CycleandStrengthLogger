import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import type { Doc } from "../_generated/dataModel";
import { mutation, query } from "./_generated/server";
import { getAuthenticatedUser } from "./lib/auth";

const DEFAULT_RECENT_LIMIT = 20;
const MIN_RECENT_LIMIT = 1;
const MAX_RECENT_LIMIT = 100;

export const listRecent = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return [];
    }

    const limit = Math.min(
      Math.max(args.limit ?? DEFAULT_RECENT_LIMIT, MIN_RECENT_LIMIT),
      MAX_RECENT_LIMIT
    );

    const workouts = await ctx.db
      .query("workouts")
      .withIndex("by_user_performedAt", (q) => q.eq("userId", userId))
      .order("desc")
      .take(limit);

    const enriched = await Promise.all(
      workouts.map(async (workout) => {
        if (workout.type === "strength") {
          const sets = await ctx.db
            .query("strengthSets")
            .withIndex("by_workout", (q) => q.eq("workoutId", workout._id))
            .collect();

          return {
            ...workout,
            strengthSets: sets.map((set) => ({
              id: set._id,
              exerciseName: set.exerciseName,
              setIndex: set.setIndex,
              weightKg: set.weightKg ?? null,
              reps: set.reps,
            })),
          };
        }

        return {
          ...workout,
          strengthSets: [] as never[],
        };
      })
    );

    return enriched;
  },
});

export const createCyclingWorkout = mutation({
  args: {
    performedAt: v.number(),
    durationSeconds: v.number(),
    avgPower: v.optional(v.number()),
    avgHeartRate: v.optional(v.number()),
    elevationGain: v.optional(v.number()),
    perceivedEffort: v.optional(v.number()),
    memo: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { user } = await getAuthenticatedUser(ctx);

    const workoutId = await ctx.db.insert("workouts", {
      userId: user._id,
      type: "cycling",
      performedAt: args.performedAt,
      durationSeconds: args.durationSeconds,
      avgPower: args.avgPower ?? undefined,
      avgHeartRate: args.avgHeartRate ?? undefined,
      elevationGain: args.elevationGain ?? undefined,
      perceivedEffort: args.perceivedEffort ?? undefined,
      memo: args.memo ?? undefined,
    });

    return { workoutId };
  },
});

export const createStrengthWorkout = mutation({
  args: {
    performedAt: v.number(),
    durationSeconds: v.number(),
    perceivedEffort: v.optional(v.number()),
    memo: v.optional(v.string()),
    exercises: v.array(
      v.object({
        name: v.string(),
        sets: v.array(
          v.object({
            weightKg: v.optional(v.number()),
            reps: v.number(),
          })
        ),
      })
    ),
  },
  handler: async (ctx, args) => {
    const { user } = await getAuthenticatedUser(ctx);

    const workoutId = await ctx.db.insert("workouts", {
      userId: user._id,
      type: "strength",
      performedAt: args.performedAt,
      durationSeconds: args.durationSeconds,
      perceivedEffort: args.perceivedEffort ?? undefined,
      memo: args.memo ?? undefined,
    });

    await Promise.all(
      args.exercises.flatMap((exercise) =>
        exercise.sets.map((set, index) =>
          ctx.db.insert("strengthSets", {
            workoutId,
            exerciseName: exercise.name,
            setIndex: index,
            weightKg: set.weightKg ?? undefined,
            reps: set.reps,
          })
        )
      )
    );

    return { workoutId };
  },
});

export type StrengthSetView = {
  id: Doc<"strengthSets">["_id"];
  exerciseName: string;
  setIndex: number;
  weightKg: number | null;
  reps: number;
};

export type EnrichedWorkout =
  | (Doc<"workouts"> & { type: "cycling"; strengthSets: never[] })
  | (Doc<"workouts"> & { type: "strength"; strengthSets: StrengthSetView[] });
