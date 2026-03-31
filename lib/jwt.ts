import { jwtVerify, JWTPayload, SignJWT } from "jose";

function getJwtSecrets(): Uint8Array[] {
  const candidates = [
    process.env.JWT_SECRET,
    process.env.AUTH_SECRET,
    process.env.NEXTAUTH_SECRET,
  ]
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value));

  if (candidates.length === 0) {
    throw new Error(
      "JWT secret is missing. Set JWT_SECRET (or AUTH_SECRET/NEXTAUTH_SECRET)."
    );
  }

  return candidates.map((value) => new TextEncoder().encode(value));
}

export async function signAuthToken(payload: JWTPayload): Promise<string> {
  const [primarySecret] = getJwtSecrets();
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("1d")
    .sign(primarySecret);
}

export async function verifyAuthToken(token: string): Promise<JWTPayload> {
  const secrets = getJwtSecrets();
  let lastError: unknown;

  for (const secret of secrets) {
    try {
      const { payload } = await jwtVerify(token, secret, {
        algorithms: ["HS256"],
      });
      return payload;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError ?? new Error("JWT verification failed.");
}
