import { app, authentication } from "@microsoft/teams-js";

export async function tryGetTeamsSsoToken(): Promise<string | null> {
  try {
    await app.initialize();
    await app.getContext();
    const token = await authentication.getAuthToken();
    return token || null;
  } catch {
    return null;
  }
}
