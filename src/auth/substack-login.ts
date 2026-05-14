import { insertTextIntoActiveElement } from "../browser/editor.js";
import type { StagehandSession } from "../browser/stagehand.js";

export interface SubstackLoginResult {
  status: "attempted";
  emailInserted: boolean;
  passwordInserted: boolean;
  finalUrl: string;
  note?: string | undefined;
}

export async function performSubstackLogin(
  session: StagehandSession,
  credentials: { email: string; password: string },
): Promise<SubstackLoginResult> {
  await session.stagehand.act("Click the Sign in button or link.", {
    timeout: 60000,
  });

  await session.stagehand.act("Focus the email address input field for signing in.", {
    timeout: 60000,
  });
  const emailResult = await insertTextIntoActiveElement(session.page, credentials.email);

  if (!emailResult.ok) {
    throw new Error(`Could not insert Substack email: ${emailResult.reason ?? "unknown error"}`);
  }

  await session.stagehand.act("Continue to the next login step.", {
    timeout: 60000,
  });

  await session.stagehand.act("Focus the password input field if one is shown.", {
    timeout: 60000,
  });
  const passwordResult = await insertTextIntoActiveElement(session.page, credentials.password);

  if (!passwordResult.ok) {
    return {
      status: "attempted",
      emailInserted: true,
      passwordInserted: false,
      finalUrl: session.page.url(),
      note: "Email was inserted, but no password field was available. Complete magic-link or verification flow manually.",
    };
  }

  await session.stagehand.act("Submit the sign in form.", { timeout: 60000 });

  return {
    status: "attempted",
    emailInserted: true,
    passwordInserted: true,
    finalUrl: session.page.url(),
  };
}
