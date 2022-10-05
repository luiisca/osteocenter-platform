import { ArrowRightIcon } from "@heroicons/react/outline";
import { zodResolver } from "@hookform/resolvers/zod";
import omit from "lodash/omit";
import { useRef, useState } from "react";
import { useForm } from "react-hook-form";

import dayjs from "@calcom/dayjs";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { User, PatientProfile, DoctorProfile } from "@calcom/prisma/client";
import { profileData, ProfileDataInputType } from "@calcom/prisma/zod-utils";
import { trpc } from "@calcom/trpc/react";
import TimezoneSelect from "@calcom/ui/form/TimezoneSelect";
import { Button } from "@calcom/ui/v2";

import { UsernameAvailability } from "@components/ui/UsernameAvailability";

interface IUserSettingsProps {
  user: User & { patientProfile: PatientProfile; doctorProfile: DoctorProfile };
  nextStep: () => void;
}

const UserSettings = (props: IUserSettingsProps) => {
  const { user, nextStep } = props;
  const { t } = useLocale();
  const [selectedTimeZone, setSelectedTimeZone] = useState(user.timeZone ?? dayjs.tz.guess());
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProfileDataInputType>({
    resolver: zodResolver(profileData.omit({ name: true })),
    reValidateMode: "onChange",
  });

  const utils = trpc.useContext();
  const onSuccess = async () => {
    await utils.invalidateQueries(["viewer.me"]);
    nextStep();
  };
  const mutation = trpc.useMutation("viewer.updateProfile", {
    onSuccess: onSuccess,
  });
  const onSubmit = handleSubmit((formData: ProfileDataInputType) => {
    if (formData) {
      const name = `${formData.firstName} ${formData.lastName}`;
      mutation.mutate({ ...formData, name, timeZone: selectedTimeZone });
    }
  });

  const [currentUsername, setCurrentUsername] = useState(user.username || undefined);
  const [inputUsernameValue, setInputUsernameValue] = useState(currentUsername);
  const usernameRef = useRef<HTMLInputElement>(null!);

  return (
    <form onSubmit={onSubmit}>
      <div className="space-y-6">
        {/* Username textfield */}
        <UsernameAvailability
          readonly={true}
          currentUsername={currentUsername}
          setCurrentUsername={setCurrentUsername}
          inputUsernameValue={inputUsernameValue}
          usernameRef={usernameRef}
          setInputUsernameValue={setInputUsernameValue}
          user={user}
        />

        {/* First name textfield */}
        <div className="w-full">
          <label htmlFor="firstName" className="mb-2 block text-sm font-medium text-gray-700">
            {t("first_name")}
          </label>
          <input
            {...register("firstName")}
            id="firstName"
            type="text"
            autoComplete="given-name"
            placeholder={t("first_name")}
            className="w-full rounded-md border border-gray-300 text-sm"
          />
          {errors.firstName && (
            <p className="text-xs italic text-red-500">{t(errors.firstName.message as string)}</p>
          )}
        </div>
        {/* Last name textfield */}
        <div className="w-full">
          <label htmlFor="lastName" className="mb-2 block text-sm font-medium text-gray-700">
            {t("last_name")}
          </label>
          <input
            {...register("lastName")}
            id="lastName"
            type="text"
            autoComplete="family-name"
            placeholder={t("last_name")}
            className="w-full rounded-md border border-gray-300 text-sm"
          />
          {errors.lastName && (
            <p className="text-xs italic text-red-500">{t(errors.lastName.message as string)}</p>
          )}
        </div>
        {/* DNI textfield */}
        <label htmlFor="phoneNumber" className="mb-2 block text-sm font-medium text-gray-700">
          {t("phone_number")}
        </label>
        <input
          {...register("phoneNumber")}
          id="phoneNumber"
          type="text"
          autoComplete="tel"
          placeholder="+51931109731"
          className="w-full rounded-md border border-gray-300 text-sm"
          defaultValue={user.phoneNumber || undefined}
        />
        <>{console.log("INPUT ERRORS", errors)}</>
        {errors.phoneNumber && (
          <p className="text-xs italic text-red-500">{t(errors.phoneNumber.message as string)}</p>
        )}
        {/* Phone number textfield */}
        <div className="w-full">
          <label htmlFor="DNI" className="mb-2 block text-sm font-medium text-gray-700">
            {t("DNI")}
          </label>
          <input
            {...register("DNI")}
            id="DNI"
            type="text"
            placeholder="76097512"
            className="w-full rounded-md border border-gray-300 text-sm"
            defaultValue={
              (user.role === "USER" ? user?.patientProfile?.DNI : user?.doctorProfile?.DNI) || undefined
            }
          />
          {errors.DNI && <p className="text-xs italic text-red-500">{t(errors.DNI.message as string)}</p>}
          {mutation.error && (
            <p className="text-xs italic text-red-500">
              {t(`JSON.parse(mutation.error?.message?.key)`, JSON.parse(mutation.error?.message?.variables))}
            </p>
          )}
          {console.log("MUTATION ERRORS", JSON.parse(mutation.error?.message))}
        </div>
        {/* Timezone select field */}
        <div className="w-full">
          <label htmlFor="timeZone" className="block text-sm font-medium text-gray-700">
            {t("timezone")}
          </label>

          <TimezoneSelect
            id="timeZone"
            value={selectedTimeZone}
            onChange={({ value }) => setSelectedTimeZone(value)}
            className="mt-2 w-full rounded-md text-sm"
          />

          <p className="mt-3 flex flex-row font-sans text-xs leading-tight text-gray-500 dark:text-white">
            {t("current_time")} {dayjs().tz(selectedTimeZone).format("LT").toString().toLowerCase()}
          </p>
        </div>
      </div>
      <Button
        type="submit"
        className="mt-8 flex w-full flex-row justify-center"
        disabled={mutation.isLoading}>
        {t("next_step")}
        <ArrowRightIcon className="ml-2 h-4 w-4 self-center" aria-hidden="true" />
      </Button>
    </form>
  );
};

export { UserSettings };
