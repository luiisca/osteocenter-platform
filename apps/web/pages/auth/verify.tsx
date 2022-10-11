import { MailOpenIcon } from "@heroicons/react/outline";
import { signIn } from "next-auth/react";
import Head from "next/head";
import { useRouter } from "next/router";
import * as React from "react";
import { useEffect, useState, useRef } from "react";

import { WEBAPP_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import showToast from "@calcom/lib/notification";
import { Button } from "@calcom/ui/v2/";

async function sendVerificationLogin(email: string) {
  await signIn("email", {
    email: email.toLowerCase(),
    redirect: false,
    callbackUrl: WEBAPP_URL,
  })
    .then(() => {
      showToast("Verification email sent", "success");
    })
    .catch((err) => {
      showToast(err, "error");
    });
}

function useSendFirstVerificationLogin() {
  const router = useRouter();
  const { email } = router.query;
  const sent = useRef(false);
  useEffect(() => {
    if (router.isReady && !sent.current) {
      (async () => {
        await sendVerificationLogin(`${email}`);
        sent.current = true;
      })();
    }
  }, [email, router.isReady]);
}

export default function Verify() {
  const router = useRouter();
  const { t: trans } = useLocale();
  const { email, t } = router.query;
  const [secondsLeft, setSecondsLeft] = useState(30);
  console.log("ROUTER QUERY verify page", router.query);
  // @note: check for t=timestamp and apply disabled state and secondsLeft accordingly
  // to avoid refresh to skip waiting 30 seconds to re-send email
  useEffect(() => {
    const lastSent = new Date(parseInt(`${t}`));
    // @note: This double round() looks ugly but it's the only way I came up to get the time difference in seconds
    const difference = Math.round(Math.round(new Date().getTime() - lastSent.getTime()) / 1000);
    if (difference < 30) {
      // If less than 30 seconds, set the seconds left to 30 - difference
      setSecondsLeft(30 - difference);
    } else {
      // else set the seconds left to 0 and disabled false
      setSecondsLeft(0);
    }
  }, [t]);
  // @note: here we make sure each second is decremented if disabled up to 0.
  useEffect(() => {
    if (secondsLeft > 0) {
      const interval = setInterval(() => {
        if (secondsLeft > 0) {
          setSecondsLeft(secondsLeft - 1);
        }
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [secondsLeft]);

  useSendFirstVerificationLogin();

  return (
    <div className="bg-black bg-opacity-90 text-white backdrop-blur-md backdrop-grayscale backdrop-filter">
      <Head>
        <title>{trans("verify_your_email")} | Osteocenter.com</title>
      </Head>
      <div className="flex min-h-screen flex-col items-center justify-center px-6">
        <div className="m-10 flex max-w-2xl flex-col items-start border border-white p-12 text-left">
          <div className="rounded-full border border-white p-3">
            <MailOpenIcon className="h-12 w-12 flex-shrink-0 p-0.5 font-extralight text-white" />
          </div>
          <h3 className="font-cal my-6 text-3xl font-normal">{trans("check_your_inbox")}</h3>
          <p>
            {trans("sent_email_to")}
            <b>{email} </b>
            {trans("with a link to activate your account.")}
          </p>
          <p className="mt-6 text-gray-400">{trans("dont_see_email")}</p>

          <div className="mt-6 flex space-x-5 text-center">
            <Button
              color="secondary"
              disabled={secondsLeft > 0}
              onClick={async (e) => {
                e.preventDefault();
                setSecondsLeft(30);
                // Update query params with t:timestamp, shallow: true doesn't re-render the page
                router.push(
                  router.asPath,
                  {
                    query: {
                      ...router.query,
                      t: Date.now(),
                    },
                  },
                  { shallow: true }
                );
                return await sendVerificationLogin(`${email}`);
              }}>
              {secondsLeft > 0
                ? trans("resend_in_seconds", { seconds: secondsLeft })
                : trans("send_another_email")}
            </Button>
            <Button color="primary" href={`${WEBAPP_URL}/auth/login`}>
              {trans("login_using_another_method")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
