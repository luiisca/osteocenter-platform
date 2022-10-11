import { GetServerSidePropsContext } from "next";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import Head from "next/head";
import { useRouter } from "next/router";
import { z } from "zod";

import { getSession } from "@calcom/lib/auth";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { User, PatientProfile, DoctorProfile } from "@calcom/prisma/client";
import { Button } from "@calcom/ui/v2";

import prisma from "@lib/prisma";

import { StepCard } from "@components/getting-started/components/StepCard";
import { Steps } from "@components/getting-started/components/Steps";
import { ConnectedCalendars } from "@components/getting-started/steps-views/ConnectCalendars";
import { SetupAvailability } from "@components/getting-started/steps-views/SetupAvailability";
import UserProfile from "@components/getting-started/steps-views/UserProfile";
import { UserSettings } from "@components/getting-started/steps-views/UserSettings";

interface IOnboardingPageProps {
  user: User & { patientProfile: PatientProfile; doctorProfile: DoctorProfile };
}

const INITIAL_STEP = "user-settings";
const steps = ["user-settings", "connected-calendar", "setup-availability", "user-profile"] as const;
type adminSteps = readonly ["user-settings", "connected-calendar", "setup-availability", "user-profile"];
type userSteps = readonly ["user-settings", "user-profile"];
const isAdminArr = (steps: adminSteps | userSteps): steps is adminSteps => {
  return true;
};

// const stepTransform = (step: typeof steps[number]) => {
//   const stepIndex = steps.indexOf(step);
//   if (stepIndex > -1) {
//     return steps[stepIndex];
//   }
//   return INITIAL_STEP;
// };

const OnboardingPage = (props: IOnboardingPageProps) => {
  const router = useRouter();

  const { user } = props;
  const { t } = useLocale();

  const stepsByProfile: adminSteps | userSteps =
    user.role === "ADMIN" ? steps : (["user-settings", "user-profile"] as const);
  const result = z
    .object({
      step: z.array(z.enum(stepsByProfile)).default([INITIAL_STEP]),
    })
    .safeParse(router.query);
  const currentStep = result.success ? result.data.step[0] : INITIAL_STEP;

  const headers = [
    {
      title: `${t("welcome_to_osteocenter")}`,
      subtitle: [`${t("we_just_need_basic_info")}`, `${t("edit_form_later_subtitle")}`],
    },
    {
      title: `${t("connect_your_calendar")}`,
      subtitle: [`${t("connect_your_calendar_instructions")}`],
      skipText: `${t("connect_calendar_later")}`,
    },
    {
      title: `${t("set_availability")}`,
      subtitle: [
        `${t("set_availability_getting_started_subtitle_1")}`,
        `${t("set_availability_getting_started_subtitle_2")}`,
      ],
      skipText: `${t("set_my_availability_later")}`,
    },
    {
      title: `${t("nearly_there")}`,
      subtitle: [
        `${t(user.role === "ADMIN" ? "nearly_there_instructions" : "nearly_there_instructions_user")}`,
      ],
    },
  ];
  const headersByProfile = user.role === "ADMIN" ? headers : [headers[0], headers[headers.length - 1]];

  const goToIndex = (index: number) => {
    const newStep = stepsByProfile[index] || INITIAL_STEP;
    router.push(
      {
        pathname: `/getting-started/${newStep}`,
      },
      undefined
    );
  };

  const getStepsIndex: () => number = () => {
    if (isAdminArr(stepsByProfile)) {
      return stepsByProfile.indexOf(currentStep);
    } else if (currentStep === "user-settings" || currentStep === "user-profile") {
      return stepsByProfile.indexOf(currentStep);
    }
    return 0;
  };
  const currentStepIndex: number = getStepsIndex();

  return (
    <div
      className="dark:bg-brand dark:text-brand-contrast min-h-screen text-black"
      data-testid="onboarding"
      key={router.asPath}>
      <Head>
        <title>Osteocenter - {t("getting_started")}</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="mx-auto px-4 py-24">
        <div className="relative">
          <div className="sm:mx-auto sm:w-full sm:max-w-[600px]">
            <div className="mx-auto sm:max-w-[520px]">
              <header>
                <p className="font-cal mb-3 text-[28px] font-medium leading-7">
                  {headersByProfile[currentStepIndex]?.title || "Undefined title"}
                </p>

                {headersByProfile[currentStepIndex]?.subtitle.map((subtitle, index) => (
                  <p className="font-sans text-sm font-normal text-gray-500" key={index}>
                    {subtitle}
                  </p>
                ))}
              </header>
              <Steps
                maxSteps={stepsByProfile.length}
                currentStep={currentStepIndex}
                navigateToStep={goToIndex}
              />
            </div>
            <StepCard>
              {currentStep === "user-settings" && <UserSettings user={user} nextStep={() => goToIndex(1)} />}

              {currentStep === "connected-calendar" && <ConnectedCalendars nextStep={() => goToIndex(2)} />}

              {currentStep === "setup-availability" && (
                <SetupAvailability nextStep={() => goToIndex(3)} defaultScheduleId={user.defaultScheduleId} />
              )}

              {currentStep === "user-profile" && <UserProfile user={user} />}
            </StepCard>
            {headersByProfile[currentStepIndex]?.skipText && (
              <div className="flex w-full flex-row justify-center">
                <Button
                  color="minimalSecondary"
                  data-testid="skip-step"
                  onClick={(event) => {
                    event.preventDefault();
                    goToIndex(currentStepIndex + 1);
                  }}
                  className="mt-24 cursor-pointer px-4 py-2 font-sans text-sm font-medium">
                  {headersByProfile[currentStepIndex]?.skipText}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export const getServerSideProps = async (context: GetServerSidePropsContext) => {
  const crypto = await import("crypto");
  const session = await getSession(context);

  if (!session?.user?.id) {
    return { redirect: { permanent: false, destination: "/auth/login" } };
  }

  const user = await prisma.user.findUnique({
    where: {
      id: session.user.id,
    },
    select: {
      id: true,
      country: true,
      role: true,
      username: true,
      name: true,
      firstName: true,
      lastName: true,
      phoneNumber: true,
      email: true,
      bio: true,
      avatar: true,
      timeZone: true,
      weekStart: true,
      hideBranding: true,
      theme: true,
      plan: true,
      brandColor: true,
      darkBrandColor: true,
      metadata: true,
      timeFormat: true,
      allowDynamicBooking: true,
      defaultScheduleId: true,
      completedOnboarding: true,
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
    throw new Error("User from session not found");
  }

  return {
    props: {
      session,
      ...(await serverSideTranslations(context.locale ?? "", ["common"])),
      user: {
        ...user,
        emailMd5: crypto.createHash("md5").update(user.email).digest("hex"),
      },
    },
  };
};

export default OnboardingPage;
