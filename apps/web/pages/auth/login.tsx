import { GetServerSidePropsContext } from "next";
import { signIn } from "next-auth/react";
import { useRouter } from "next/router";
import { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";

import { getSafeRedirectUrl } from "@calcom/lib/getSafeRedirectUrl";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { collectPageParameters, telemetryEventTypes, useTelemetry } from "@calcom/lib/telemetry";
import { Alert } from "@calcom/ui/Alert";
import Button from "@calcom/ui/Button";
import { EmailField, Form } from "@calcom/ui/form/fields";

import { ErrorCode, getSessionServerSide } from "@lib/auth";
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
      <AuthContainer title={t("login")} description={t("login")} showLogo heading={t("sign_in_account")}>
        <>
          <div className="mt-5">
            <Button
              color="secondary"
              className="flex w-full justify-center"
              data-testid="google"
              onClick={async (e) => {
                e.preventDefault();
                // track Google logins. Without personal data/payload
                telemetry.event(telemetryEventTypes.googleLogin, collectPageParameters());
                await signIn("google");
              }}>
              {t("signin_with_google")}
            </Button>
          </div>
          <div className="my-5">
            <Button
              color="secondary"
              className="flex w-full justify-center"
              data-testid="facebook"
              onClick={async (e) => {
                e.preventDefault();
                await signIn("facebook");
              }}>
              {t("signin_with_facebook")}
            </Button>
          </div>
        </>
        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center" aria-hidden="true">
            <div className="w-full border-t border-gray-300" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-white px-2 text-sm text-gray-500">{t("or")}</span>
          </div>
        </div>
        <Form
          form={form}
          className="space-y-6"
          handleSubmit={async (values) => {
            setErrorMessage(null);
            telemetry.event(telemetryEventTypes.login, collectPageParameters());
            console.log("FORM VALUES", values);
            const res = await signIn<"email">("email", {
              redirect: false,
              email: values.email,
            });
            console.log("EMAIL PROVIDER", res, values);
            if (!res) setErrorMessage(errorMessages[ErrorCode.InternalServerError]);
            // we're logged in! let's do a hard refresh to the desired url
            else if (!res.error) router.push(res.url || "");
            else setErrorMessage(errorMessages[res.error] || t("something_went_wrong"));
          }}
          data-testid="login-form">
          <EmailField
            id="email"
            label={t("magic_link")}
            name="email"
            defaultValue={router.query.email || ""}
            placeholder="john.doe@example.com"
            required
            registerValue="email"
          />

          {errorMessage && !oAuthError && <Alert severity="error" title={errorMessage} />}
          <div className="flex space-y-2">
            <Button className="flex w-full justify-center" type="submit" disabled={isSubmitting}>
              {t("sign_in")}
            </Button>
          </div>
        </Form>
        {oAuthError && <Alert severity="error" title={errorMessage} />}
      </AuthContainer>
      <AddToHomescreen />
    </>
  );
}

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const session = await getSessionServerSide(context);
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
