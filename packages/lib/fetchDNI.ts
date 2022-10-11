type ResponseDNIApi = {
  available: boolean;
};

export async function fetchDNI(DNI: string) {
  const response = await fetch("/api/dni", {
    method: "POST",
    body: JSON.stringify({
      DNI: DNI.trim(),
    }),
    headers: {
      "Content-Type": "application/json",
    },
  });
  const data = (await response.json()) as ResponseDNIApi;
  console.log("FETCHDNI DATA", response, data);
  return { response, data };
}
