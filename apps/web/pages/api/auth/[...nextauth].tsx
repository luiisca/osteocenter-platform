import { IdentityProvider, UserPermissionRole } from "@prisma/client";
import { readFileSync } from "fs";
import Handlebars from "handlebars";
import NextAuth, { Session, NextAuthOptions } from "next-auth";
import { Provider } from "next-auth/providers";
import EmailProvider from "next-auth/providers/email";
import FacebookProvider from "next-auth/providers/facebook";
import GoogleProvider from "next-auth/providers/google";
import nodemailer, { TransportOptions } from "nodemailer";
import path from "path";

import checkLicense from "@calcom/features/ee/common/server/checkLicense";
import { WEBAPP_URL } from "@calcom/lib/constants";
import { defaultCookies } from "@calcom/lib/default-cookies";
import { serverConfig } from "@calcom/lib/serverConfig";
import prisma from "@calcom/prisma";

import CalComAdapter from "@lib/auth/next-auth-custom-adapter";
import { randomString } from "@lib/random";
import { hostedCal } from "@lib/saml";
import slugify from "@lib/slugify";

import {
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  FACEBOOK_CLIENT_ID,
  FACEBOOK_CLIENT_SECRET,
} from "@server/lib/constants";

const transporter = nodemailer.createTransport<TransportOptions>({
  ...(serverConfig.transport as TransportOptions),
} as TransportOptions);

const usernameSlug = (username: string) => slugify(username) + "-" + randomString(6).toLowerCase();

const providers: Provider[] = [
  FacebookProvider({
    clientId: FACEBOOK_CLIENT_ID,
    clientSecret: FACEBOOK_CLIENT_SECRET,
  }),
  GoogleProvider({
    clientId: GOOGLE_CLIENT_ID,
    clientSecret: GOOGLE_CLIENT_SECRET,
  }),
];

if (true) {
  const emailsDir = path.resolve(process.cwd(), "..", "..", "packages/emails", "templates");
  providers.push(
    EmailProvider({
      type: "email",
      maxAge: 10 * 60 * 60, // Magic links are valid for 10 min only
      // Here we setup the sendVerificationRequest that calls the email template with the identifier (email) and token to verify.
      async sendVerificationRequest({ identifier, url }) {
        const originalUrl = new URL(url);
        const webappUrl = new URL(WEBAPP_URL);
        if (originalUrl.origin !== webappUrl.origin) {
          url = url.replace(originalUrl.origin, webappUrl.origin);
        }
        const emailFile = readFileSync(path.join(emailsDir, "confirm-email.html"), {
          encoding: "utf8",
        });
        const emailTemplate = Handlebars.compile(emailFile);
        transporter.sendMail({
          from: `${process.env.EMAIL_FROM}` || "Cl??nica Osteocenter",
          to: identifier,
          subject: "Bienvenido a tu cuenta Osteocenter",
          html: emailTemplate({
            base_url: WEBAPP_URL,
            signin_url: url,
            email: identifier,
          }),
        });
      },
    })
  );
}

const calcomAdapter = CalComAdapter(prisma);
export const authOptions: NextAuthOptions = {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  adapter: calcomAdapter,
  session: {
    strategy: "jwt",
  },
  cookies: defaultCookies(WEBAPP_URL?.startsWith("https://")),
  pages: {
    signIn: "/auth/login",
    signOut: "/auth/logout",
    error: "/auth/error", // Error code passed in query string as ?error=
    verifyRequest: "/auth/verify",
    // newUser: "/auth/new", // New users will be directed here on first sign in (leave the property out if not of interest)
  },
  providers,
  callbacks: {
    async jwt({ token, user, account }) {
      console.log("JWT CALLBACK");
      console.log("JWT token", token);
      console.log("JWT user", user);
      console.log("JWT account", account);
      const autoMergeIdentities = async () => {
        const existingUser = await prisma.user.findFirst({
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          where: { email: token.email! },
        });

        if (!existingUser) {
          return token;
        }

        return {
          id: existingUser.id,
          username: existingUser.username,
          name: existingUser.name,
          email: existingUser.email,
          role: existingUser.role,
        };
      };
      if (!user) {
        return await autoMergeIdentities();
      }

      // The arguments above are from the provider so we need to look up the
      // user based on those values in order to construct a JWT.
      if (account && account.type === "oauth" && account.provider && account.providerAccountId) {
        const idP: IdentityProvider = IdentityProvider.GOOGLE;
        const existingUser = await prisma.user.findFirst({
          where: {
            AND: [
              {
                identityProvider: idP,
              },
              {
                identityProviderId: account.providerAccountId as string,
              },
            ],
          },
        });

        if (!existingUser) {
          return await autoMergeIdentities();
        }

        return {
          id: existingUser.id,
          name: existingUser.name,
          username: existingUser.username,
          email: existingUser.email,
          role: existingUser.role,
        };
      }

      return token;
    },
    async session({ session, token }) {
      console.log("SESSION CALLBACK");
      const hasValidLicense = await checkLicense(process.env.CALCOM_LICENSE_KEY || "");
      const calendsoSession: Session = {
        ...session,
        hasValidLicense,
        user: {
          ...session.user,
          id: token.id as number,
          name: token.name,
          username: token.username as string,
          role: token.role as UserPermissionRole,
          impersonatedByUID: token.impersonatedByUID as number,
        },
      };
      return calendsoSession;
    },
    async signIn(params) {
      console.log("SIGNIN CALLBACK");
      const { user, account, profile } = params;
      console.log("SIGNIN account", account);
      console.log("SIGNIN user", user);
      console.log("SIGNIN profile", profile);

      // maybe because we don't send verification email when using credentials?
      if (account.provider === "email") {
        return true;
      }

      if (account.type !== "oauth") {
        return false;
      }

      if (!user.email) {
        return false;
      }

      if (!user.name) {
        return false;
      }

      if (account.provider) {
        let idP: IdentityProvider = IdentityProvider.GOOGLE;
        user.email_verified = user.email_verified || profile.email_verified;
        if (account.provider === "facebook") {
          idP = IdentityProvider.FACEBOOK;
        }

        if (idP === "GOOGLE" && !user.email_verified) {
          return "/auth/error?error=unverified-email";
        }
        // Only google oauth on this path
        const provider = account.provider.toUpperCase() as IdentityProvider;

        console.log("SIGNIN CALLBACK BEFORE EXISTING USER");
        const existingUser = await prisma.user.findFirst({
          include: {
            accounts: {
              where: {
                provider: account.provider,
              },
            },
          },
          where: {
            identityProvider: provider,
            identityProviderId: account.providerAccountId,
          },
        });

        console.log("SIGNIN CALLBACK AFTER EXISTING USER", existingUser);
        if (existingUser) {
          console.log("EXISTING USER IN SIGNIN", existingUser);
          // In this case there's an existing user and their email address
          // hasn't changed since they last logged in.
          if (existingUser.email === user.email) {
            try {
              // If old user without Account entry we link their google account
              if (existingUser.accounts.length === 0) {
                const linkAccountWithUserData = { ...account, userId: existingUser.id };
                await calcomAdapter.linkAccount(linkAccountWithUserData);
              }
            } catch (error) {
              if (error instanceof Error) {
                console.error("Error while linking account of already existing user");
              }
            }
            return true;
          }

          // If the email address doesn't match, check if an account already exists
          // with the new email address. If it does, for now we return an error. If
          // not, update the email of their account and log them in.
          const userWithNewEmail = await prisma.user.findFirst({
            where: { email: user.email },
          });

          if (!userWithNewEmail) {
            await prisma.user.update({ where: { id: existingUser.id }, data: { email: user.email } });
            return true;
          } else {
            return "/auth/error?error=new-email-conflict";
          }
        }

        // If there's no existing user for this identity provider and id, create
        // a new account. If an account already exists with the incoming email
        // address return an error for now.
        const existingUserWithEmail = await prisma.user.findFirst({
          where: { email: user.email },
        });

        if (existingUserWithEmail) {
          // if self-hosted then we can allow auto-merge of identity providers if email is verified
          if (!hostedCal && existingUserWithEmail.emailVerified) {
            return true;
          }

          // check if user was invited
          if (
            !existingUserWithEmail.password &&
            !existingUserWithEmail.emailVerified &&
            !existingUserWithEmail.username
          ) {
            await prisma.user.update({
              where: { email: user.email },
              data: {
                // Slugify the incoming name and append a few random characters to
                // prevent conflicts for users with the same name.
                username: usernameSlug(user.name),
                emailVerified: new Date(Date.now()),
                name: user.name,
                identityProvider: idP,
                identityProviderId: user.id as string,
              },
            });

            return true;
          }

          console.log("SIGNIN CALLBACK, there is an existing user with this email", existingUserWithEmail);
          return "/auth/error?error=use-identity-login";
        }

        console.log("SIGNIN CALLBACK: A NEW USER IS ABOUT TO BE CREATED ");
        const newUser = await prisma.user.create({
          data: {
            // Slugify the incoming name and append a few random characters to
            // prevent conflicts for users with the same name.
            username: usernameSlug(user.name),
            emailVerified: new Date(Date.now()),
            name: user.name,
            email: user.email,
            identityProvider: idP,
            identityProviderId: user.id as string,
          },
        });
        console.log("SIGNIN CALLBACK: New user created", newUser);
        const linkAccountNewUserData = { ...account, userId: newUser.id };
        await calcomAdapter.linkAccount(linkAccountNewUserData);

        return true;
      }

      return false;
    },
    async redirect({ url, baseUrl }) {
      console.log("REDIRECT CALLBACK");
      console.log("REDIRECT URL + BASEURL", url, baseUrl);
      // Allows relative callback URLs
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      // Allows callback URLs on the same domain
      else if (new URL(url).hostname === new URL(WEBAPP_URL).hostname) return url;
      return baseUrl;
    },
  },
};
export default NextAuth(authOptions);
