import { ConfidentialClientApplication } from "@azure/msal-node";
import { env } from "../config/env";
import { forbidden } from "../utils/errors";

type GraphMe = {
  id: string;
  displayName?: string;
  mail?: string;
  userPrincipalName?: string;
};

type GraphTeam = { id: string; displayName?: string };

function decodeJwtPayload(token: string): any {
  try {
    const [, payload] = token.split(".");
    if (!payload) return {};
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(Buffer.from(normalized, "base64").toString("utf8"));
  } catch {
    return {};
  }
}

function assertTeamsConfig() {
  if (!env.microsoft.clientId || !env.microsoft.tenantId || !env.microsoft.clientSecret) {
    throw forbidden("Microsoft Teams SSO is not configured. Set MS_CLIENT_ID, MS_TENANT_ID, and MS_CLIENT_SECRET.");
  }
}

async function graphGet<T>(path: string, accessToken: string): Promise<T> {
  const response = await fetch(`https://graph.microsoft.com/v1.0${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw forbidden(`Microsoft Graph request failed: ${response.status} ${body.slice(0, 200)}`);
  }
  return response.json() as Promise<T>;
}

export async function authenticateTeamsSso(teamsSsoToken: string) {
  assertTeamsConfig();
  const cca = new ConfidentialClientApplication({
    auth: {
      clientId: env.microsoft.clientId,
      authority: `https://login.microsoftonline.com/${env.microsoft.tenantId}`,
      clientSecret: env.microsoft.clientSecret
    }
  });

  const result = await cca.acquireTokenOnBehalfOf({
    oboAssertion: teamsSsoToken,
    scopes: ["User.Read", "Team.ReadBasic.All"]
  });

  if (!result?.accessToken) throw forbidden("Could not exchange Teams SSO token for Microsoft Graph token");

  const me = await graphGet<GraphMe>("/me?$select=id,displayName,mail,userPrincipalName", result.accessToken);
  const teamsResponse = await graphGet<{ value: GraphTeam[] }>("/me/joinedTeams?$select=id,displayName", result.accessToken);
  const tokenClaims = decodeJwtPayload(teamsSsoToken);
  const tenantId = tokenClaims.tid || env.microsoft.tenantId;
  const email = (me.mail || me.userPrincipalName || "").toLowerCase();
  if (!email) throw forbidden("Microsoft account email could not be resolved");

  return {
    microsoftUserId: me.id,
    displayName: me.displayName || email,
    email,
    tenantId,
    teamIds: (teamsResponse.value || []).map(team => team.id),
    graphTeams: teamsResponse.value || []
  };
}
