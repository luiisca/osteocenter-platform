import slugify from "@calcom/lib/slugify";
import prisma from "@calcom/prisma";

export async function checkRegularUsername(_username: string) {
  const username = slugify(_username);

  const user = await prisma.user.findUnique({
    where: { username },
    select: {
      username: true,
    },
  });
  console.log("FOUND USER WITH SAME USERNAME", user);

  if (user) {
    return {
      available: false as const,
      premium: true,
      message: "A user exists with that username",
    };
  }
  return {
    available: true as const,
    premium: true,
  };
}
