import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthenticatedUser, updateUserProfile } from "./lib/auth";

export const getCurrentProfile = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    try {
      const { user, userId: resolvedUserId } = await getAuthenticatedUser(ctx);

      return {
        id: resolvedUserId,
        displayName:
          user.displayName ??
          user.name ??
          identity.name ??
          identity.email ??
          null,
        trainingFocus: user.trainingFocus ?? null,
        email: user.email ?? identity.email ?? null,
      } as const;
    } catch (_error) {
      return {
        id: null,
        displayName: identity.name ?? identity.email ?? null,
        trainingFocus: null,
        email: identity.email ?? null,
      } as const;
    }
  },
});

export const completeOnboarding = mutation({
  args: {
    displayName: v.string(),
    trainingFocus: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId } = await updateUserProfile(ctx, {
      displayName: args.displayName,
      trainingFocus: args.trainingFocus ?? null,
      email: (await ctx.auth.getUserIdentity())?.email ?? null,
    });

    return { userId };
  },
});
