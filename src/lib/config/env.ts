/**
 * Centralized environment variable access.
 * All process.env reads go through this module so missing values
 * surface as clear errors rather than silent undefined propagation.
 */

export function getGithubToken(): string {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    throw new Error(
      "GITHUB_TOKEN is not set. " +
        "Copy .env.example to .env.local and add your GitHub personal access token."
    );
  }
  return token;
}
