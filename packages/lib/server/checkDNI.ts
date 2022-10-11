import prisma from "@calcom/prisma";

export default async function checkDNI(DNI: string) {
  const patientProfile = await prisma.patientProfile.findUnique({
    where: { DNI },
    select: {
      DNI: true,
    },
  });
  const doctorProfile = await prisma.doctorProfile.findUnique({
    where: { DNI },
    select: {
      DNI: true,
    },
  });
  console.log("PATIENT PROFILE FOUND?", patientProfile);
  console.log("DOCTOR PROFILE FOUND?", doctorProfile);

  if (patientProfile || doctorProfile) {
    return {
      available: false as const,
    };
  }
  return {
    available: true as const,
  };
}
