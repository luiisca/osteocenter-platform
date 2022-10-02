import { GetServerSidePropsContext } from "next";
import { signIn } from "next-auth/react";
import { useRouter } from "next/router";
import { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";

import { getSafeRedirectUrl } from "@calcom/lib/getSafeRedirectUrl";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { collectPageParameters, telemetryEventTypes, useTelemetry } from "@calcom/lib/telemetry";
import prisma from "@calcom/prisma";
import { Alert } from "@calcom/ui/Alert";
import Button from "@calcom/ui/Button";
import { EmailField } from "@calcom/ui/form/fields";

import { ErrorCode, getSession } from "@lib/auth";
import { WEBAPP_URL } from "@lib/config/constants";

import AddToHomescreen from "@components/AddToHomescreen";
import AuthContainer from "@components/ui/AuthContainer";

import { ssrInit } from "@server/lib/ssr";

interface LoginValues {
  email: string;
}

export default function Login() {
  const { t } = useLocale();
  const router = useRouter();
  const form = useForm<LoginValues>();
  const { formState } = form;
  const { isSubmitting } = formState;

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [oAuthError, setOAuthError] = useState<boolean>(false);

  const errorMessages: { [key: string]: string } = useMemo(
    () => ({
      // [ErrorCode.SecondFactorRequired]: t("2fa_enabled_instructions"),
      [ErrorCode.IncorrectPassword]: `${t("incorrect_password")} ${t("please_try_again")}`,
      [ErrorCode.UserNotFound]: t("no_account_exists"),
      [ErrorCode.IncorrectTwoFactorCode]: `${t("incorrect_2fa_code")} ${t("please_try_again")}`,
      [ErrorCode.InternalServerError]: `${t("something_went_wrong")} ${t("please_try_again_and_contact_us")}`,
      [ErrorCode.ThirdPartyIdentityProviderEnabled]: t("account_created_with_identity_provider"),
      [ErrorCode.IncorrectProvider]: t("email_already_registered_with_different_provider"),
    }),
    [t]
  );

  const telemetry = useTelemetry();

  let callbackUrl = typeof router.query?.callbackUrl === "string" ? router.query.callbackUrl : "";

  if (/"\//.test(callbackUrl)) callbackUrl = callbackUrl.substring(1);

  // If not absolute URL, make it absolute
  if (!/^https?:\/\//.test(callbackUrl)) {
    callbackUrl = `${WEBAPP_URL}/${callbackUrl}`;
  }

  const safeCallbackUrl = getSafeRedirectUrl(callbackUrl);

  callbackUrl = safeCallbackUrl || "";
  console.log("LOGIN PAGE CALLBACKURL", router.query?.error);
  useEffect(() => {
    if (router.query?.error === "OAuthCallback" || router.query?.error === "OAuthAccountNotLinked") {
      setOAuthError(true);
      setErrorMessage(errorMessages[ErrorCode.IncorrectProvider]);
    } else if (router.query?.error) {
      setOAuthError(true);
      setErrorMessage(errorMessages[router.query?.error as string] || t("something_went_wrong"));
    }
  }, [errorMessages, router.query?.error, t]);

  return (
    <>
      <AddToHomescreen />
    </>
  );
}

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const { req } = context;
  const session = await getSession({ req });
  const ssr = await ssrInit(context);

  if (session) {
    return {
      redirect: {
        destination: "/",
        permanent: false,
      },
    };
  }

  return {
    props: {
      // SSR i18n translations to avoid visual flickering
      trpcState: ssr.dehydrate(),
    },
  };
}
