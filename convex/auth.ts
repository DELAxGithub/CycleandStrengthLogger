import Apple from "@auth/core/providers/apple";
import Google from "@auth/core/providers/google";
import { Anonymous } from "@convex-dev/auth/providers/Anonymous";
import type { AuthProviderConfig } from "@convex-dev/auth/server";
import { convexAuth } from "@convex-dev/auth/server";

function readEnv(name: string) {
  const value = process.env[name];
  return typeof value === "string" && value.length > 0 ? value : null;
}

function readApplePrivateKey(rawKey: string | null) {
  if (!rawKey) {
    return null;
  }

  return rawKey.replace(/\\n/g, "\n");
}

const providers: AuthProviderConfig[] = [];

const googleClientId = readEnv("GOOGLE_CLIENT_ID");
const googleClientSecret = readEnv("GOOGLE_CLIENT_SECRET");

if (googleClientId && googleClientSecret) {
  providers.push(
    Google({
      clientId: googleClientId,
      clientSecret: googleClientSecret,
    })
  );
}

const appleClientId = readEnv("APPLE_CLIENT_ID");
const appleTeamId = readEnv("APPLE_TEAM_ID");
const appleKeyId = readEnv("APPLE_KEY_ID");
const applePrivateKey = readApplePrivateKey(readEnv("APPLE_PRIVATE_KEY"));

if (appleClientId && appleTeamId && appleKeyId && applePrivateKey) {
  providers.push(
    Apple({
      clientId: appleClientId,
      teamId: appleTeamId,
      keyId: appleKeyId,
      privateKey: applePrivateKey,
    })
  );
}

if (providers.length === 0) {
  providers.push(Anonymous());
}

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers,
  callbacks: {
    async afterUserCreatedOrUpdated(ctx, args) {
      const existing = await ctx.db.get(args.userId);
      if (!existing) {
        return;
      }

      const patch: Partial<typeof existing> = {};
      const displayName =
        (typeof args.profile?.name === "string" && args.profile.name) ||
        (typeof args.profile?.email === "string" && args.profile.email) ||
        undefined;

      if (!existing.displayName && displayName) {
        patch.displayName = displayName;
      }

      if (!existing.email && typeof args.profile?.email === "string") {
        patch.email = args.profile.email;
      }

      if (!existing.image && typeof args.profile?.image === "string") {
        patch.image = args.profile.image;
      }

      if (!existing.createdAt) {
        patch.createdAt = Date.now();
      }

      if (Object.keys(patch).length > 0) {
        await ctx.db.patch(args.userId, patch);
      }
    },
  },
});
