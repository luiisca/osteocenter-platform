import { ArrowRightIcon } from "@heroicons/react/outline";
import { zodResolver } from "@hookform/resolvers/zod";
import classNames from "classnames";
import { debounce } from "lodash";
import { useRef, useState, useCallback, useEffect } from "react";
import { useForm, useFormContext, FormProvider } from "react-hook-form";
import ReactPhoneInput from "react-phone-input-2";
import es from "react-phone-input-2/lang/es.json";
import "react-phone-input-2/lib/high-res.css";
import { v4 } from "uuid";

import dayjs from "@calcom/dayjs";
import { fetchDNI } from "@calcom/lib/fetchDNI";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { User, PatientProfile, DoctorProfile } from "@calcom/prisma/client";
import { DNI, profileData, ProfileDataInputType } from "@calcom/prisma/zod-utils";
import { trpc } from "@calcom/trpc/react";
import { Icon } from "@calcom/ui/Icon";
import TimezoneSelect from "@calcom/ui/form/TimezoneSelect";
import { Button } from "@calcom/ui/v2";

import { UsernameAvailability } from "@components/ui/UsernameAvailability";

interface IUserSettingsProps {
  user: User & { patientProfile: PatientProfile; doctorProfile: DoctorProfile };
  nextStep: () => void;
}
interface IDNIAvailabilityProps {
  currentDNI: string | undefined;
  setCurrentDNI: (value: string | undefined) => void;
  DNIAvailable: boolean;
  setDNIIsAvailable: (value: boolean) => void;
  user: IUserSettingsProps["user"];
}

const DNIAvailability = (props: IDNIAvailabilityProps) => {
  const { t } = useLocale();
  const { currentDNI, setCurrentDNI, DNIAvailable, setDNIIsAvailable, user } = props;
  const {
    register,
    formState: { errors },
    setError,
    clearErrors,
  } = useFormContext();

  const [inputDNIValue, setInputDNIValue] = useState(currentDNI);
  const [isChecking, setIsChecking] = useState(false);
  const [markAsError, setMarkAsError] = useState(false);

  const debouncedApiCall = useCallback(
    debounce(async (DNI) => {
      if ((DNI.length || 0) >= 1) {
        clearErrors("DNI");
      }
      if (DNI === "") {
        setError("DNI", {
          type: "min",
          message: "not_empty",
        });
        return;
      }
      if (!Number(DNI || 0)) {
        setError("DNI", {
          type: "valueAsNumber",
          message: "not_number",
        });
        return;
      }
      if (DNI.length > 8) {
        setError("DNI", {
          type: "length",
          message: "required_length_8",
        });
        return;
      }
      if (DNI.length !== 8) return;

      setIsChecking(true);
      const { data } = await fetchDNI(DNI);
      setIsChecking(false);
      setMarkAsError(!data.available);
      setDNIIsAvailable(data.available);
      if (data.available) {
        setCurrentDNI(inputDNIValue);
      }
    }),
    []
  );
  const getDefaultValue = () => {
    if (user?.role === "USER") {
      if (DNI.safeParse(user?.patientProfile?.DNI).success) {
        return user?.patientProfile?.DNI;
      } else {
        return undefined;
      }
    }
    if (DNI.safeParse(user?.doctorProfile?.DNI).success) {
      return user?.doctorProfile?.DNI;
    } else {
      return undefined;
    }
  };

  useEffect(() => {
    if (currentDNI !== inputDNIValue) {
      debouncedApiCall(inputDNIValue);
    } else if (inputDNIValue === "") {
      setMarkAsError(false);
      setDNIIsAvailable(false);
    } else {
      setDNIIsAvailable(false);
    }
  }, [inputDNIValue]);

  return (
    <div className="relative w-full">
      <label htmlFor="DNI" className="mb-2 block text-sm font-medium text-gray-700">
        DNI
      </label>
      <div className="relative">
        <input
          {...register("DNI")}
          id="DNI"
          type="text"
          placeholder="76097512"
          className="w-full rounded-md border border-gray-300 text-sm"
          defaultValue={getDefaultValue()}
          onChange={(e) => {
            e.preventDefault();
            setInputDNIValue(e.target.value);
          }}
        />
        {currentDNI !== inputDNIValue && (
          <>
            <div className="absolute right-[2px] top-0 flex flex-row">
              <span className={classNames("mx-2 py-2")}>
                {!isChecking && DNIAvailable ? <Icon.FiCheck className="mt-[2px] w-6" /> : <></>}
              </span>
            </div>
            {isChecking && (
              <div className="absolute right-[2px] top-0 flex flex-row">
                <span className={classNames("mx-2 py-2")}>
                  <svg
                    className={classNames("mt-[2px] h-4 w-4 animate-spin", "text-black")}
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                </span>
              </div>
            )}
          </>
        )}
      </div>
      {errors?.DNI && <p className="mt-1 text-xs italic text-red-500">{t(errors?.DNI.message as string)}</p>}
      {markAsError && <p className="mt-1 text-xs italic text-red-500">{t("dni_taken")}</p>}
    </div>
  );
};

const UserSettings = (props: IUserSettingsProps) => {
  const { user, nextStep } = props;
  const { t } = useLocale();
  const [selectedTimeZone, setSelectedTimeZone] = useState(user.timeZone ?? dayjs.tz.guess());
  const [currentUsername, setCurrentUsername] = useState(user.username || undefined);
  const [inputUsernameValue, setInputUsernameValue] = useState(currentUsername);
  const usernameRef = useRef<HTMLInputElement>(null!);
  const [currentDNI, setCurrentDNI] = useState(
    (user.role === "ADMIN" ? user.doctorProfile?.DNI : user.patientProfile?.DNI) || undefined
  );
  const [DNIAvailable, setDNIIsAvailable] = useState(true);
  const [phoneNumber, setPhoneNumber] = useState(user.phoneNumber || undefined);
  const [phoneCountry, setPhoneCountry] = useState<string>(user.country);
  const phoneNumberRef = useRef(null);
  const methods = useForm<ProfileDataInputType>({
    resolver: zodResolver(
      profileData.omit(phoneCountry !== "pe" ? { name: true, DNI: true } : { name: true })
    ),
    reValidateMode: "onChange",
  });
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
    setFocus,
    clearErrors,
  } = methods;

  const utils = trpc.useContext();
  const onSuccess = async () => {
    await utils.invalidateQueries(["viewer.me"]);
    nextStep();
  };
  const mutation = trpc.useMutation("viewer.updateProfile", {
    onSuccess: onSuccess,
  });

  const onSubmit = handleSubmit((formData: ProfileDataInputType) => {
    if (phoneCountry === "pe" && !DNIAvailable && !DNI.safeParse(formData.DNI).success) {
      setFocus("DNI");

      return;
    }
    if (formData) {
      const name = `${formData.firstName} ${formData.lastName}`;
      mutation.mutate({
        ...formData,
        country: phoneCountry,
        name,
        username: currentUsername,
        DNI: phoneCountry !== "pe" ? v4() : formData.DNI,
        phoneNumber,
        timeZone: selectedTimeZone,
      });
    }
  });

  const debouncedOnPhoneChange = useCallback(
    debounce((value, country) => {
      setPhoneNumber(value);
      if (phoneCountry !== country?.countryCode) setPhoneCountry(country?.countryCode);
      // if (country?.name !== "Peru") setValue("DNI", "1");
      if (country?.name === "Peru" && value.length > 11) {
        setError("phoneNumber", {
          type: "length",
          message: "required_length_11",
        });
      }
      if (country?.name === "Peru" && value.length === 11) {
        clearErrors("phoneNumber");
      }
    }),
    []
  );

  return (
    <FormProvider {...methods}>
      <form onSubmit={onSubmit}>
        <div className="space-y-6">
          {/* Username textfield */}
          {user.role === "ADMIN" && (
            <UsernameAvailability
              readonly={true}
              currentUsername={currentUsername}
              setCurrentUsername={setCurrentUsername}
              inputUsernameValue={inputUsernameValue}
              setInputUsernameValue={setInputUsernameValue}
              usernameRef={usernameRef}
              user={user}
            />
          )}

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
              <p className="mt-1 text-xs italic text-red-500">{t(errors.firstName.message as string)}</p>
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
              <p className="mt-1 text-xs italic text-red-500">{t(errors.lastName.message as string)}</p>
            )}
          </div>

          {/* Phone number textfield */}
          <div className="w-full">
            <label htmlFor="phoneNumber" className="mb-2 block text-sm font-medium text-gray-700">
              {t("phone_number")}
            </label>
            <ReactPhoneInput
              country={user.country || "pe"}
              regions={["south-america", "central-america", "caribean"]}
              localization={es}
              value={user.phoneNumber || undefined}
              placeholder={t("type_phone_number")}
              inputProps={{
                name: "phoneNumber",
                id: "phoneNumber",
                ref: phoneNumberRef,
              }}
              containerClass="w-full!"
              inputClass="text-sm border border-gray-300 rounded-r-md"
              inputStyle={{
                width: "100%",
                height: "auto",
                fontSize: "0.875rem",
                lineHeight: "1.25rem",
              }}
              buttonClass="text-sm border border-gray-300 rounded-l-md"
              onChange={debouncedOnPhoneChange}
              preferredCountries={["pe", "co", "ec", "cl", "ar", "mx", "es", "bo"]}
            />
            {errors.phoneNumber && (
              <p className="mt-1 text-xs italic text-red-500">{t(errors.phoneNumber.message as string)}</p>
            )}
          </div>

          {/* DNI textfield */}
          {phoneCountry === "pe" && (
            <DNIAvailability
              currentDNI={currentDNI}
              setCurrentDNI={setCurrentDNI}
              DNIAvailable={DNIAvailable}
              setDNIIsAvailable={setDNIIsAvailable}
              user={user}
            />
          )}

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
    </FormProvider>
  );
};

export { UserSettings };
