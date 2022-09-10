import { zodResolver } from "@hookform/resolvers/zod";
import { Prisma } from "@prisma/client";
import classnames from "classnames";
import debounce from "lodash/debounce";
import omit from "lodash/omit";
import { NextPageContext } from "next";
import { useSession } from "next-auth/react";
import Head from "next/head";
import { useRouter } from "next/router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";

import getApps from "@calcom/app-store/utils";
import dayjs from "@calcom/dayjs";
import { DEFAULT_SCHEDULE } from "@calcom/lib/availability";
import { fetchUsername } from "@calcom/lib/fetchUsername";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import showToast from "@calcom/lib/notification";
import prisma from "@calcom/prisma";
import { profileData, ProfileDataInputType } from "@calcom/prisma/zod-utils";
import { trpc } from "@calcom/trpc/react";
import type { AppRouter } from "@calcom/trpc/server/routers/_app";
import { Alert } from "@calcom/ui/Alert";
import Button from "@calcom/ui/Button";
import { Icon } from "@calcom/ui/Icon";
import TimezoneSelect from "@calcom/ui/form/TimezoneSelect";
import { Form } from "@calcom/ui/form/fields";

import { getSession } from "@lib/auth";
import { inferSSRProps } from "@lib/types/inferSSRProps";
import { Schedule as ScheduleType } from "@lib/types/schedule";

import { ClientSuspense } from "@components/ClientSuspense";
import Loader from "@components/Loader";
import Schedule from "@components/availability/Schedule";
import { CalendarListContainer } from "@components/integrations/CalendarListContainer";
import { UsernameAvailability } from "@components/ui/UsernameAvailability";

import { TRPCClientErrorLike } from "@trpc/client";

// Embed isn't applicable to onboarding, so ignore the rule
/* eslint-disable @calcom/eslint/avoid-web-storage */

type ScheduleFormValues = {
  schedule: ScheduleType;
};

let mutationComplete: ((err: Error | null) => void) | null;

export default function Onboarding(props: inferSSRProps<typeof getServerSideProps>) {
  const { t } = useLocale();
  const { user } = props;
  const router = useRouter();
  const utils = trpc.useContext();
  const [hasErrors, setHasErrors] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const { data: eventTypes } = trpc.useQuery(["viewer.eventTypes.list"]);
  const onSuccessMutation = async () => {
    showToast(t("your_user_profile_updated_successfully"), "success");
    setHasErrors(false); // dismiss any open errors
    await utils.invalidateQueries(["viewer.me"]);
  };

  const onErrorMutation = (error: TRPCClientErrorLike<AppRouter>) => {
    setHasErrors(true);
    setErrorMessage(error.message);
    document?.getElementsByTagName("main")[0]?.scrollTo({ top: 0, behavior: "smooth" });
  };
  const mutation = trpc.useMutation("viewer.updateProfile", {
    onSuccess: async () => {
      setSubmitting(true);
      setInputUsernameValue(usernameRef.current?.value || "");
      if (mutationComplete) {
        mutationComplete(null);
        mutationComplete = null;
      }
      setSubmitting(false);
    },
    onError: (err: TRPCClientErrorLike<AppRouter>) => {
      setError(new Error(err.message));
      if (mutationComplete) {
        mutationComplete(new Error(err.message));
      }
      setSubmitting(false);
    },
  });

  const DEFAULT_EVENT_TYPES = [
    {
      title: t("15min_meeting"),
      slug: "15min",
      length: 15,
    },
    {
      title: t("30min_meeting"),
      slug: "30min",
      length: 30,
    },
    {
      title: t("secret_meeting"),
      slug: "secret",
      length: 15,
      hidden: true,
    },
  ];

  const [isSubmitting, setSubmitting] = React.useState(false);
  const [currentUsername, setCurrentUsername] = useState(user.username || undefined);
  const [inputUsernameValue, setInputUsernameValue] = useState(currentUsername);

  const { status } = useSession();
  const loading = status === "loading";
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const updateUser = useCallback(
    async (data: Prisma.UserUpdateInput) => {
      const res = await fetch(`/api/user/${user.id}`, {
        method: "PATCH",
        body: JSON.stringify({ data: { ...data } }),
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) {
        throw new Error((await res.json()).message);
      }
      const responseData = await res.json();
      return responseData.data;
    },
    [user.id]
  );

  const createEventType = trpc.useMutation("viewer.eventTypes.create");

  const createSchedule = trpc.useMutation("viewer.availability.schedule.create", {
    onError: (error: TRPCClientErrorLike<AppRouter>) => {
      throw new Error(error.message);
    },
  });

  /** Username */
  const usernameRef = useRef<HTMLInputElement>(null!);
  /** TimeZone */
  const [selectedTimeZone, setSelectedTimeZone] = useState(dayjs.tz.guess());
  /** End TimeZone */

  /** Onboarding Steps */
  const [currentStep, setCurrentStep] = useState(props.initialStep);
  const handleConfirmStep = async (formData: ProfileDataInputType | null) => {
    try {
      setSubmitting(true);
      const onComplete = steps[currentStep]?.onComplete;
      if (onComplete) {
        await onComplete(formData);
      }
      incrementStep();
      setSubmitting(false);
    } catch (error) {
      setSubmitting(false);
      setError(error as Error);
    }
  };

  const debouncedHandleConfirmStep = debounce(handleConfirmStep, 850);

  const incrementStep = () => {
    const nextStep = currentStep + 1;

    if (nextStep >= (user.role === "ADMIN" ? steps.length : 1)) {
      completeOnboarding();
      return;
    }
    setCurrentStep(nextStep);
  };

  const decrementStep = () => {
    const previous = currentStep - 1;

    if (previous < 0) {
      return;
    }
    setCurrentStep(previous);
  };

  const goToStep = (step: number) => {
    setCurrentStep(step);
  };

  /**
   * Complete Onboarding finalizes the onboarding flow for a new user.
   *
   * Here, 3 event types are pre-created for the user as well.
   * Set to the availability the user enter during the onboarding.
   *
   * If a user skips through the Onboarding flow,
   * then the default availability is applied.
   */
  const completeOnboarding = async () => {
    setSubmitting(true);
    if (eventTypes?.length === 0) {
      await Promise.all(
        DEFAULT_EVENT_TYPES.map(async (event) => {
          return createEventType.mutate(event);
        })
      );
    }
    await updateUser({
      completedOnboarding: true,
    });

    setSubmitting(false);
    router.push("/event-types");
  };

  // Should update username on user when being redirected from sign up and doing google/saml
  useEffect(() => {
    async function validateAndSave(username: string) {
      const { data } = await fetchUsername(username);

      // Only persist username if its available and not premium
      // premium usernames are saved via stripe webhook
      if (data.available && !data.premium) {
        await updateUser({
          username,
        });
      }
      // Remove it from localStorage
      window.localStorage.removeItem("username");
      return;
    }

    // Looking for username on localStorage
    const username = window.localStorage.getItem("username");
    if (username) {
      validateAndSave(username);
    }
  }, [updateUser]);

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<ProfileDataInputType>({
    resolver: zodResolver(profileData),
  });
  const availabilityForm = useForm({ defaultValues: { schedule: DEFAULT_SCHEDULE } });
  const steps = [
    {
      id: t("welcome"),
      title: t("welcome_to_osteocenter"),
      description: t("welcome_instructions"),
      Component: (
        <>
          <form className="sm:mx-auto sm:w-full">
            <section className="space-y-8">
              {user.username !== "" && (
                <UsernameAvailability
                  currentUsername={currentUsername}
                  setCurrentUsername={setCurrentUsername}
                  inputUsernameValue={inputUsernameValue}
                  usernameRef={usernameRef}
                  setInputUsernameValue={setInputUsernameValue}
                  onSuccessMutation={onSuccessMutation}
                  onErrorMutation={onErrorMutation}
                  user={user}
                />
              )}
              <fieldset>
                <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
                  {t("first_name")}
                </label>
                <input
                  type="text"
                  id="firstName"
                  autoComplete="given-name"
                  placeholder={t("first_name")}
                  {...register("firstName")}
                  className="mt-1 block w-full rounded-sm border border-gray-300 px-3 py-2 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm"
                  defaultValue={user.firstName || undefined}
                />
                {errors.firstName && (
                  <p className="text-red-400 sm:text-sm">{t(errors.firstName.message as string)}</p>
                )}

                <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">
                  {t("last_name")}
                </label>
                <input
                  id="lastName"
                  type="text"
                  autoComplete="family-name"
                  placeholder={t("last_name")}
                  {...register("lastName")}
                  className="mt-1 block w-full rounded-sm border border-gray-300 px-3 py-2 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm"
                  defaultValue={user.lastName || undefined}
                />
                {errors.lastName && (
                  <p className="text-red-400 sm:text-sm">{t(errors.lastName.message as string)}</p>
                )}
              </fieldset>
              <fieldset>
                <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700">
                  {t("phone_number")}
                </label>
                <input
                  {...register("phoneNumber")}
                  id="phoneNumber"
                  autoComplete="tel"
                  placeholder="+51931109731"
                  className="mt-1 block w-full rounded-sm border border-gray-300 px-3 py-2 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm"
                  defaultValue={user.phoneNumber || undefined}
                />
                <>{console.log("INPUT ERRORS", errors)}</>
                {errors.phoneNumber && (
                  <p className="text-red-400 sm:text-sm">{t(errors.phoneNumber.message)}</p>
                )}
              </fieldset>
              <fieldset>
                <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
                  {t("DNI")}
                </label>
                <input
                  {...register("DNI")}
                  id="DNI"
                  placeholder="76097512"
                  className="mt-1 block w-full rounded-sm border border-gray-300 px-3 py-2 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm"
                  defaultValue={
                    (user.role === "USER" ? user?.patientProfile?.DNI : user?.doctorProfile?.DNI) || undefined
                  }
                />
                {errors.DNI && <p className="text-red-400 sm:text-sm">{t(errors.DNI.message)}</p>}
              </fieldset>

              <fieldset>
                <section className="flex justify-between">
                  <label htmlFor="timeZone" className="block text-sm font-medium text-gray-700">
                    {t("timezone")}
                  </label>
                  <p className="text-sm leading-tight text-gray-500 dark:text-white">
                    {t("current_time")}:&nbsp;
                    <span className="text-black">{dayjs().tz(selectedTimeZone).format("LT")}</span>
                  </p>
                </section>
                <TimezoneSelect
                  id="timeZone"
                  value={selectedTimeZone}
                  onChange={({ value }) => setSelectedTimeZone(value)}
                  className="mt-1 block w-full rounded-md border-gray-300 focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
              </fieldset>
            </section>
          </form>
        </>
      ),
      hideConfirm: false,
      confirmText: t("continue"),
      showCancel: true,
      cancelText: t("set_up_later"),
      onComplete: async (formData: ProfileDataInputType | null) => {
        mutationComplete = null;
        setError(null);
        const mutationAsync = new Promise((resolve, reject) => {
          mutationComplete = (err) => {
            if (err) {
              reject(err);
              return;
            }
            resolve(null);
          };
        });

        if (formData) {
          const name = `${formData.firstName} ${formData.lastName}`;
          mutation.mutate({ ...formData, name });
        }

        if (mutationComplete) {
          await mutationAsync;
        }
      },
    },
    {
      id: "connect-calendar",
      title: t("connect_your_calendar"),
      description: t("connect_your_calendar_instructions"),
      Component: (
        <ClientSuspense fallback={<Loader />}>
          <CalendarListContainer heading={false} fromOnboarding={true} />
        </ClientSuspense>
      ),
      hideConfirm: true,
      confirmText: t("continue"),
      showCancel: true,
      cancelText: t("continue_without_calendar"),
    },
    {
      id: "set-availability",
      title: t("set_availability"),
      description: t("set_availability_instructions"),
      Component: (
        <Form<ScheduleFormValues>
          className="mx-auto max-w-lg bg-white text-black dark:bg-opacity-5 dark:text-white"
          form={availabilityForm}
          handleSubmit={async (values) => {
            try {
              setSubmitting(true);
              await createSchedule.mutate({
                name: t("default_schedule_name"),
                ...values,
              });
              debouncedHandleConfirmStep(null);
              setSubmitting(false);
            } catch (error) {
              if (error instanceof Error) {
                setError(error);
              }
            }
          }}>
          <section>
            <Schedule name="schedule" />
            <footer className="flex flex-col space-y-6 py-6 sm:mx-auto sm:w-full">
              <Button className="justify-center" EndIcon={Icon.FiArrowRight} type="submit">
                {t("continue")}
              </Button>
            </footer>
          </section>
        </Form>
      ),
      hideConfirm: true,
      showCancel: false,
    },
  ];
  /** End Onboarding Steps */

  useEffect(() => {
    setReady(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading || !ready) {
    return <div className="loader" />;
  }

  return (
    <div className="bg-brand min-h-screen" data-testid="onboarding">
      <Head>
        <title>Osteocenter - {t("getting_started")}</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>

      {isSubmitting && (
        <div className="fixed z-10 flex h-full w-full flex-col content-center items-center justify-center bg-white bg-opacity-25">
          <Loader />
        </div>
      )}
      <div className="mx-auto px-4 py-24">
        <article className="relative">
          <section className="space-y-4 sm:mx-auto sm:w-full sm:max-w-lg">
            <header>
              <p className="font-cal mb-2 text-3xl tracking-wider text-white">{steps[currentStep].title}</p>
              <p className="text-sm font-normal text-white">{steps[currentStep].description}</p>
            </header>
            <section className="space-y-2 pt-4">
              {user.role === "ADMIN" && (
                <p className="text-xs font-medium text-gray-500 dark:text-white">
                  {`${t("step")} ${currentStep + 1} ${t("of")} ${steps.length}`}
                </p>
              )}

              {error && <Alert severity="error" message={error?.message} />}
              {hasErrors && <Alert severity="error" message={errorMessage} />}

              {user.role === "ADMIN" && (
                <section className="flex w-full space-x-2 rtl:space-x-reverse">
                  {steps.map((s, index) => {
                    return index <= currentStep ? (
                      <div
                        key={`step-${index}`}
                        onClick={() => goToStep(index)}
                        className={classnames(
                          "h-1 w-1/4 bg-white",
                          index < currentStep ? "cursor-pointer" : ""
                        )}
                      />
                    ) : (
                      <div key={`step-${index}`} className="h-1 w-1/4 bg-white bg-opacity-25" />
                    );
                  })}
                </section>
              )}
            </section>
          </section>
          <section className="mx-auto mt-10 max-w-xl rounded-sm bg-white p-10">
            {steps[currentStep].Component}

            {!steps[currentStep].hideConfirm && (
              <footer className="mt-8 flex flex-col space-y-6 sm:mx-auto sm:w-full">
                <Button
                  className="justify-center"
                  disabled={isSubmitting}
                  onClick={handleSubmit(debouncedHandleConfirmStep)}
                  EndIcon={Icon.FiArrowRight}
                  data-testid={`continue-button-${currentStep}`}>
                  {steps[currentStep].confirmText}
                </Button>
              </footer>
            )}
          </section>
          <section className="mx-auto max-w-xl py-8">
            <div className="flex flex-row-reverse justify-between">
              <button
                disabled={isSubmitting || !isValid}
                onClick={incrementStep}
                className="text-sm leading-tight text-gray-500 dark:text-white">
                {t(currentStep === 1 ? "next_step" : "skip_step")}
              </button>
              {currentStep !== 0 && (
                <button
                  disabled={isSubmitting}
                  onClick={decrementStep}
                  className="text-sm leading-tight text-gray-500 dark:text-white">
                  {t("prev_step")}
                </button>
              )}
            </div>
          </section>
        </article>
      </div>
    </div>
  );
}

export async function getServerSideProps(context: NextPageContext) {
  const session = await getSession(context);

  if (!session?.user?.id) {
    return {
      redirect: {
        permanent: false,
        destination: "/auth/login",
      },
    };
  }
  const user = await prisma.user.findFirst({
    where: {
      id: session.user.id,
    },
    select: {
      id: true,
      role: true,
      startTime: true,
      endTime: true,
      username: true,
      name: true,
      firstName: true,
      lastName: true,
      phoneNumber: true,
      email: true,
      bio: true,
      avatar: true,
      timeZone: true,
      identityProvider: true,
      completedOnboarding: true,
      weekStart: true,
      hideBranding: true,
      theme: true,
      plan: true,
      brandColor: true,
      darkBrandColor: true,
      metadata: true,
      timeFormat: true,
      allowDynamicBooking: true,
      selectedCalendars: {
        select: {
          externalId: true,
          integration: true,
        },
      },
      credentials: {
        where: {
          userId: session.user.id,
        },
        select: {
          id: true,
          type: true,
          key: true,
          userId: true,
          appId: true,
        },
      },
      schedules: {
        where: {
          userId: session.user.id,
        },
        select: {
          id: true,
        },
      },
      patientProfile: {
        select: {
          id: true,
          DNI: true,
        },
      },
      doctorProfile: {
        select: {
          id: true,
          DNI: true,
        },
      },
    },
  });

  if (!user) {
    throw new Error(`Signed in as ${session.user.id} but cannot be found in db`);
  }

  if (user.completedOnboarding) {
    return {
      redirect: {
        permanent: false,
        destination: "/event-types",
      },
    };
  }

  const integrations = getApps(user.credentials)
    .filter((item) => item.type.endsWith("_calendar"))
    .map((item) => omit(item, "key"));
  const { schedules } = user;
  const hasConfigureCalendar = integrations.some((integration) => integration.credential !== null);
  const hasSchedules = schedules && schedules.length > 0;

  return {
    props: {
      session,
      user,
      initialStep: hasSchedules ? (hasConfigureCalendar ? 2 : 3) : 0,
    },
  };
}
