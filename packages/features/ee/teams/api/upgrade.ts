import type { NextApiRequest, NextApiResponse } from "next";

import { upgradeTeam } from "@calcom/app-store/stripepayment/lib/team-billing";
import { getSession } from "@calcom/lib/auth";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET") {
    const session = await getSession({ req, res });

    if (!session) {
      res.status(401).json({ message: "You must be logged in to do this" });
      return;
    }

    await upgradeTeam(session.user.id, Number(req.query.team));

    // redirect to team screen
    res.redirect(302, `${process.env.NEXT_PUBLIC_WEBAPP_URL}/settings/teams/${req.query.team}?upgraded=true`);
  }
}
