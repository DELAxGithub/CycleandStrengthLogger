import { getAuthUserId } from "@convex-dev/auth/server";
import type { MutationCtx, QueryCtx } from "../_generated/server";

type AuthContext = QueryCtx | MutationCtx;

type ProfileInput = {
  displayName?: string | null;
  trainingFocus?: string | null;
  email?: string | null;
  image?: string | null;
};

async function requireUserId(ctx: AuthContext) {
  const userId = await getAuthUserId(ctx);
  if (!userId) {
    throw new Error("Authentication required");
  }
  return userId;
}

export async function getAuthenticatedUser(ctx: AuthContext) {
  const userId = await requireUserId(ctx);
  const user = await ctx.db.get(userId);

  if (!user) {
    throw new Error("User profile not initialized");
  }

  return { userId, user };
}

export async function updateUserProfile(
  ctx: MutationCtx,
  profile: ProfileInput
) {
  const { user, userId } = await getAuthenticatedUser(ctx);
  const patch: Partial<typeof user> = {};

  if (
    typeof profile.displayName === "string" &&
    profile.displayName.length > 0
  ) {
    patch.displayName = profile.displayName;
  }

  if (
    typeof profile.trainingFocus === "string" &&
    profile.trainingFocus.length > 0
  ) {
    patch.trainingFocus = profile.trainingFocus;
  }

  if (typeof profile.email === "string" && profile.email.length > 0) {
    patch.email = profile.email;
  }

  if (typeof profile.image === "string" && profile.image.length > 0) {
    patch.image = profile.image;
  }

  if (!user.createdAt) {
    patch.createdAt = Date.now();
  }

  if (Object.keys(patch).length > 0) {
    await ctx.db.patch(userId, patch);
  }

  return { userId };
}
