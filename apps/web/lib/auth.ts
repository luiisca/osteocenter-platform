import { IdentityProvider } from "@prisma/client";
import { compare, hash } from "bcryptjs";
import { Session } from "next-auth";
import { unstable_getServerSession as getServerSession } from "next-auth";
import { getSession as getSessionInner, GetSessionParams } from "next-auth/react";

import { authOptions } from "../../web/pages/api/auth/[...nextauth]";

export async function hashPassword(password: string) {
  const hashedPassword = await hash(password, 12);
  return hashedPassword;
}

export async function verifyPassword(password: string, hashedPassword: string) {
  const isValid = await compare(password, hashedPassword);
  return isValid;
}

export async function getSession(options: GetSessionParams): Promise<Session | null> {
  const session = await getSessionInner(options);

  // that these are equal are ensured in `[...nextauth]`'s callback
  return session as Session | null;
}

export async function getSessionServerSide(
  req?: NextApiRequest,
  res?: NextApiResponse
): Promise<Session | null> {
  const session = await getServerSession(req, res, authOptions);

  // that these are equal are ensured in `[...nextauth]`'s callback
  return session as Session | null;
}

export enum ErrorCode {
  UserNotFound = "user-not-found",
  IncorrectPassword = "incorrect-password",
  UserMissingPassword = "missing-password",
  TwoFactorDisabled = "two-factor-disabled",
  TwoFactorAlreadyEnabled = "two-factor-already-enabled",
  TwoFactorSetupRequired = "two-factor-setup-required",
  SecondFactorRequired = "second-factor-required",
  IncorrectTwoFactorCode = "incorrect-two-factor-code",
  InternalServerError = "internal-server-error",
  NewPasswordMatchesOld = "new-password-matches-old",
  ThirdPartyIdentityProviderEnabled = "third-party-identity-provider-enabled",
  IncorrectProvider = "IncorrectProvider",
}

export const identityProviderNameMap: { [key in IdentityProvider]: string } = {
  [IdentityProvider.MAGIC]: "Magic",
  [IdentityProvider.GOOGLE]: "Google",
  [IdentityProvider.FACEBOOK]: "Facebook",
};
