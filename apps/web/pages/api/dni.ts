import type { NextApiRequest, NextApiResponse } from "next";

import checkDNI from "@calcom/lib/server/checkDNI";

type Response = {
  available: boolean;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse<Response>): Promise<void> {
  const result = await checkDNI(req.body.DNI);
  console.log("API HANDLER DATA", result);
  return res.status(200).json(result);
}
