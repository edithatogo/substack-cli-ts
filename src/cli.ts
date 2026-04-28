#!/usr/bin/env node
import { Command } from "commander";
import { runLocalLogin } from "./auth/local-login.js";
import {
  clearSession,
  createStoredSession,
  loadSession,
  saveSession,
} from "./auth/session-store.js";
import { performSubstackLogin } from "./auth/substack-login.js";
import { createLocalBrowserSession } from "./browser/local-browser.js";
import { createStagehandSession } from "./browser/stagehand.js";
import { captureLocalDiagnostics } from "./browser/diagnostics.js";
import {
  compareDraftCaptureArtifacts,
  observeDraftTraffic,
  writeDraftCaptureFixture,
} from "./browser/draft-capture.js";
import {
  configFilePath,
  draftMappingsFilePath,
  localBrowserProfileDir,
  sessionFilePath,
  stateDir,
} from "./config/paths.js";
import {
  loadConfig,
  loadEffectiveConfig,
  requirePublicationUrl,
  requireSubstackCredentials,
  updateConfig,
} from "./config/store.js";
import {
  printPreparedPost,
  runBrowserWorkflow,
} from "./publish/browser-workflow.js";
import { runDoctor } from "./doctor/doctor.js";
import { prepublishPost } from "./publish/prepublish.js";
import { preparePost } from "./publish/prepare.js";
import { resolveTransport } from "./publish/transport.js";
import { reviewDraftCaptureArtifact } from "./browser/draft-capture.js";
import {
  resolveApiAuthMaterial,
  summarizeApiAuthMaterial,
  validateApiAuthMaterial,
  type ApiAuthSource,
} from "./substack-api/auth.js";
import {
  findDraftMapping,
  loadDraftMappings,
  saveDraftMapping,
} from "./substack-api/draft-mappings.js";
import { planCreateDraft } from "./substack-api/draft-write.js";
import { buildSubstackDraftPayload } from "./substack-api/payload.js";
import { readApiInventory } from "./substack-api/read-model.js";
import {
  captureFixture,
  compareFixture,
  validateSchemaFile,
} from "./schema/fixtures.js";
import { summarizeMediaManifest } from "./parser/media.js";
import { redact, redactUrl } from "./util/redact.js";

const program = new Command();

program
  .name("substack-cli")
  .description(
    "Publish local Markdown files to a user-owned Substack publication.",
  )
  .version("0.1.0");

program
  .command("inspect")
  .description(
    "Parse a Markdown file and print the generated Tiptap/ProseMirror payload.",
  )
  .argument("<file>", "Markdown file to inspect")
  .action(async (file: string) => {
    const prepared = await preparePost(file, { mode: "draft" });
    printPreparedPost(prepared);
  });

program
  .command("doctor")
  .description(
    "Check local configuration, transport readiness, and ignored runtime files.",
  )
  .action(async () => {
    const report = await runDoctor();
    console.log(JSON.stringify(report, null, 2));

    if (report.status === "error") {
      process.exitCode = 1;
    }
  });

program
  .command("prepublish")
  .description(
    "Validate the final publish or schedule payload without opening the browser.",
  )
  .argument("<file>", "Markdown file to validate")
  .option("--mode <mode>", "publish or schedule", "publish")
  .option("--at <iso-date>", "ISO timestamp for scheduled publication")
  .action(
    async (
      file: string,
      options: {
        mode: "publish" | "schedule";
        at?: string;
      },
    ) => {
      const prepared = await preparePost(
        file,
        options.at
          ? {
              mode: options.mode,
              scheduleAt: options.at,
            }
          : {
              mode: options.mode,
            },
      );
      const report = prepublishPost(prepared);
      console.log(JSON.stringify(report, null, 2));

      if (report.status === "blocked") {
        process.exitCode = 1;
      }
    },
  );

program
  .command("draft")
  .description("Create or update a Substack draft from Markdown.")
  .argument("<file>", "Markdown file to draft")
  .option(
    "--dry-run",
    "Print the generated payload without opening a browser",
    false,
  )
  .option("--session-id <id>", "Browserbase session ID to resume")
  .option(
    "--experimental-inject-state",
    "Use experimental editor-state injection",
    false,
  )
  .option("--transport <transport>", "browser, api, or auto", "auto")
  .action(
    async (
      file: string,
      options: {
        dryRun: boolean;
        sessionId?: string;
        experimentalInjectState: boolean;
        transport: "browser" | "api" | "auto";
      },
    ) => {
      resolveTransport(options.transport);
      const prepared = await preparePost(file, { mode: "draft" });
      await runBrowserWorkflow(prepared, options);
    },
  );

program
  .command("publish")
  .description("Publish a Markdown file after explicit confirmation.")
  .argument("<file>", "Markdown file to publish")
  .option(
    "--dry-run",
    "Print the generated payload without opening a browser",
    false,
  )
  .option("--yes", "Confirm publishing without an interactive prompt", false)
  .option("--session-id <id>", "Browserbase session ID to resume")
  .option(
    "--experimental-inject-state",
    "Use experimental editor-state injection",
    false,
  )
  .option("--transport <transport>", "browser, api, or auto", "auto")
  .action(
    async (
      file: string,
      options: {
        dryRun: boolean;
        yes: boolean;
        sessionId?: string;
        experimentalInjectState: boolean;
        transport: "browser" | "api" | "auto";
      },
    ) => {
      resolveTransport(options.transport);
      const prepared = await preparePost(file, { mode: "publish" });
      const report = prepublishPost(prepared);
      if (report.status === "blocked") {
        console.log(JSON.stringify(report, null, 2));
        process.exitCode = 1;
        return;
      }
      await runBrowserWorkflow(prepared, options);
    },
  );

program
  .command("schedule")
  .description("Schedule a Markdown file for future publication.")
  .argument("<file>", "Markdown file to schedule")
  .requiredOption("--at <iso-date>", "ISO timestamp for scheduled publication")
  .option(
    "--dry-run",
    "Print the generated payload without opening a browser",
    false,
  )
  .option("--yes", "Confirm scheduling without an interactive prompt", false)
  .option("--session-id <id>", "Browserbase session ID to resume")
  .option(
    "--experimental-inject-state",
    "Use experimental editor-state injection",
    false,
  )
  .option("--transport <transport>", "browser, api, or auto", "auto")
  .action(
    async (
      file: string,
      options: {
        at: string;
        dryRun: boolean;
        yes: boolean;
        sessionId?: string;
        experimentalInjectState: boolean;
        transport: "browser" | "api" | "auto";
      },
    ) => {
      resolveTransport(options.transport);
      const prepared = await preparePost(file, {
        mode: "schedule",
        scheduleAt: options.at,
      });
      const report = prepublishPost(prepared);
      if (report.status === "blocked") {
        console.log(JSON.stringify(report, null, 2));
        process.exitCode = 1;
        return;
      }
      await runBrowserWorkflow(prepared, options);
    },
  );

const schema = program
  .command("schema")
  .description("Validate and capture ProseMirror schema fixtures.");

schema
  .command("validate")
  .description("Validate a ProseMirror JSON file or captured fixture.")
  .argument("<file>", "JSON file to validate")
  .action(async (file: string) => {
    const summary = await validateSchemaFile(file);
    console.log(JSON.stringify(summary, null, 2));
  });

schema
  .command("capture")
  .description(
    "Capture the generated payload for a Markdown file as a schema fixture.",
  )
  .argument("<markdown-file>", "Markdown file to parse")
  .requiredOption("--out <file>", "Fixture JSON output path")
  .action(async (file: string, options: { out: string }) => {
    const fixture = await captureFixture(file, options.out);
    console.log(
      JSON.stringify(
        {
          status: "fixture-written",
          outputFile: options.out,
          summary: fixture.summary,
        },
        null,
        2,
      ),
    );
  });

schema
  .command("compare")
  .description(
    "Compare a Markdown file's current generated document with a saved fixture.",
  )
  .argument("<markdown-file>", "Markdown file to parse")
  .argument("<fixture-file>", "Fixture JSON file")
  .action(async (markdownFile: string, fixtureFile: string) => {
    const result = await compareFixture(markdownFile, fixtureFile);
    console.log(JSON.stringify(result, null, 2));

    if (!result.equal) {
      process.exitCode = 1;
    }
  });

const api = program
  .command("api")
  .description("Read-only internal API probes and future API transport tools.");

const apiAuth = api
  .command("auth")
  .description("Inspect API authentication material without exposing secrets.");

apiAuth
  .command("status")
  .description(
    "Extract local or environment cookie material and print a redacted summary.",
  )
  .option("--source <source>", "auto, env, or local-profile", "auto")
  .option("--no-validate", "Skip read-only Substack validation probes")
  .action(
    async (options: { source: "auto" | ApiAuthSource; validate: boolean }) => {
      const effective = await loadEffectiveConfig();
      const material = await resolveApiAuthMaterial(effective, options.source);
      const summary = summarizeApiAuthMaterial(material);
      const validation = options.validate
        ? await validateApiAuthMaterial(material)
        : null;

      console.log(JSON.stringify({ ...summary, validation }, null, 2));

      if (!summary.hasLikelySessionCookie || validation?.status !== "ok") {
        process.exitCode = 1;
      }
    },
  );

api
  .command("payload")
  .description(
    "Build the write-compatible Substack draft payload for a Markdown file.",
  )
  .argument("<file>", "Markdown file to convert")
  .action(async (file: string) => {
    const prepared = await preparePost(file, { mode: "draft" });
    const payload = buildSubstackDraftPayload(prepared.post);
    console.log(JSON.stringify(payload, null, 2));
  });

api
  .command("media")
  .description("Inspect the parsed media manifest for a Markdown file.")
  .argument("<file>", "Markdown file to inspect")
  .action(async (file: string) => {
    const prepared = await preparePost(file, { mode: "draft" });
    console.log(
      JSON.stringify(
        {
          filePath: prepared.post.filePath,
          media: {
            ...prepared.post.media,
            assets: summarizeMediaManifest(prepared.post.media),
          },
        },
        null,
        2,
      ),
    );
  });

api
  .command("inventory")
  .description(
    "Read user and publication inventory through read-only API probes.",
  )
  .option("--source <source>", "auto, env, or local-profile", "auto")
  .option(
    "--post-limit <limit>",
    "Maximum number of recent posts to include",
    parseInteger,
    10,
  )
  .action(
    async (options: { source: "auto" | ApiAuthSource; postLimit: number }) => {
      const effective = await loadEffectiveConfig();
      const material = await resolveApiAuthMaterial(effective, options.source);
      const inventory = await readApiInventory(material, fetch, {
        postLimit: options.postLimit,
      });

      console.log(JSON.stringify(inventory, null, 2));

      if (inventory.status !== "ok") {
        process.exitCode = 1;
      }
    },
  );

const apiDraft = api
  .command("draft")
  .description("Plan future internal API draft create/update operations.");

apiDraft
  .command("create")
  .description(
    "Build and validate a draft creation request without publishing content.",
  )
  .argument("<file>", "Markdown file to convert")
  .option(
    "--live",
    "Attempt the live write request after endpoint contract confirmation",
    false,
  )
  .action(async (file: string, options: { live: boolean }) => {
    if (options.live) {
      throw new Error(
        "Live API draft creation is not enabled until the draft endpoint contract is confirmed.",
      );
    }

    const effective = await loadEffectiveConfig();
    const publicationUrl = requirePublicationUrl(effective);
    const prepared = await preparePost(file, { mode: "draft" });
    const existingDraft = await findDraftMapping(
      prepared.post.filePath,
      publicationUrl,
    );
    const plan = planCreateDraft(prepared.post, publicationUrl, existingDraft);
    console.log(JSON.stringify(plan, null, 2));
  });

apiDraft
  .command("mappings")
  .description("List local source-file to Substack draft mappings.")
  .action(async () => {
    const mappings = await loadDraftMappings();
    console.log(
      JSON.stringify(
        {
          mappingsFile: draftMappingsFilePath(),
          mappings,
        },
        null,
        2,
      ),
    );
  });

apiDraft
  .command("observe")
  .description(
    "Watch local browser traffic while manually creating or saving a draft.",
  )
  .argument(
    "[url]",
    "Publication URL to open before observation, defaults to the configured publication",
  )
  .option(
    "--timeout-seconds <seconds>",
    "How long to observe network traffic before stopping",
    parseInteger,
    180,
  )
  .action(
    async (
      url: string | undefined,
      options: {
        timeoutSeconds: number;
      },
    ) => {
      const effective = await loadEffectiveConfig();
      const publicationUrl = url ?? requirePublicationUrl(effective);
      const browser = await createLocalBrowserSession();

      try {
        const summary = await observeDraftTraffic(browser.page, {
          timeoutMs: options.timeoutSeconds * 1000,
          publicationUrl,
        });

        console.log(JSON.stringify(summary, null, 2));
      } finally {
        await browser.close();
      }
    },
  );

apiDraft
  .command("review")
  .description("Review a saved draft capture artifact and print a summary.")
  .argument("<file>", "Draft capture JSON file to review")
  .action(async (file: string) => {
    const review = await reviewDraftCaptureArtifact(file);
    console.log(JSON.stringify(review, null, 2));
  });

apiDraft
  .command("compare")
  .description("Compare two saved draft capture artifacts.")
  .argument("<expected-file>", "Expected draft capture JSON file")
  .argument("<actual-file>", "Actual draft capture JSON file")
  .action(async (expectedFile: string, actualFile: string) => {
    const comparison = await compareDraftCaptureArtifacts(
      expectedFile,
      actualFile,
    );

    console.log(JSON.stringify(comparison, null, 2));

    if (!comparison.equal) {
      process.exitCode = 1;
    }
  });

apiDraft
  .command("fixture")
  .description(
    "Write a normalized draft capture fixture from a saved artifact.",
  )
  .argument("<file>", "Draft capture JSON file to normalize")
  .requiredOption("--out <file>", "Fixture JSON output path")
  .action(async (file: string, options: { out: string }) => {
    const review = await writeDraftCaptureFixture(file, options.out);

    console.log(
      JSON.stringify(
        {
          status: "fixture-written",
          outputFile: options.out,
          summary: review,
        },
        null,
        2,
      ),
    );
  });

apiDraft
  .command("link")
  .description("Record a local source-file to Substack draft mapping.")
  .argument("<file>", "Markdown source file")
  .requiredOption("--draft-id <id>", "Substack draft ID")
  .option("--draft-url <url>", "Substack draft editor URL")
  .option("--title <title>", "Draft title to store")
  .option("--slug <slug>", "Draft slug to store")
  .action(
    async (
      file: string,
      options: {
        draftId: string;
        draftUrl?: string;
        title?: string;
        slug?: string;
      },
    ) => {
      const effective = await loadEffectiveConfig();
      const prepared = await preparePost(file, { mode: "draft" });
      const mapping = await saveDraftMapping({
        sourceFile: prepared.post.filePath,
        publicationUrl: requirePublicationUrl(effective),
        draftId: options.draftId,
        draftUrl: options.draftUrl,
        title:
          options.title ??
          planCreateDraft(prepared.post, requirePublicationUrl(effective))
            .payload.title,
        slug: options.slug ?? prepared.post.metadata.slug,
      });

      console.log(JSON.stringify(mapping, null, 2));
    },
  );

const config = program
  .command("config")
  .description("Manage non-secret local configuration.");

config
  .command("show")
  .description("Show effective CLI configuration without exposing secrets.")
  .action(async () => {
    const [local, effective, session] = await Promise.all([
      loadConfig(),
      loadEffectiveConfig(),
      loadSession(),
    ]);

    console.log(
      JSON.stringify(
        {
          stateDir: stateDir(),
          configFile: configFilePath(),
          sessionFile: sessionFilePath(),
          draftMappingsFile: draftMappingsFilePath(),
          localBrowserProfileDir: localBrowserProfileDir(),
          local,
          effective: {
            publicationUrl: effective.publicationUrl ?? null,
            browserRuntime: effective.browserRuntime,
            defaultMode: effective.defaultMode,
            browserbaseApiKey: redact(effective.browserbaseApiKey),
            browserbaseProjectId: redact(effective.browserbaseProjectId),
            stagehandModel: effective.stagehandModel,
            substackEmail: redact(effective.substackEmail),
            substackPasswordConfigured: Boolean(effective.substackPassword),
          },
          session: session
            ? {
                browserbaseSessionId: redact(session.browserbaseSessionId),
                publicationUrl: session.publicationUrl,
                updatedAt: session.updatedAt,
                browserbaseSessionUrl: redactUrl(session.browserbaseSessionUrl),
                browserbaseDebugUrl: redactUrl(session.browserbaseDebugUrl),
              }
            : null,
        },
        null,
        2,
      ),
    );
  });

config
  .command("set-publication")
  .description("Set the default Substack publication URL.")
  .argument(
    "<url>",
    "Publication URL, for example https://example.substack.com",
  )
  .action(async (url: string) => {
    const next = await updateConfig({ publicationUrl: url });
    console.log(JSON.stringify(next, null, 2));
  });

config
  .command("set-runtime")
  .description("Set the browser runtime.")
  .argument("<runtime>", "browserbase, local, or camoufox")
  .action(async (runtime: "browserbase" | "local" | "camoufox") => {
    const next = await updateConfig({ browserRuntime: runtime });
    console.log(JSON.stringify(next, null, 2));
  });

const auth = program
  .command("auth")
  .description("Manage authenticated browser sessions.");

auth
  .command("status")
  .description("Show configured publication and browser environment status.")
  .action(async () => {
    const [effective, session] = await Promise.all([
      loadEffectiveConfig(),
      loadSession(),
    ]);
    console.log(
      JSON.stringify(
        {
          publicationUrl: effective.publicationUrl ?? null,
          browserRuntime: effective.browserRuntime,
          browserbaseConfigured:
            effective.browserRuntime === "browserbase"
              ? Boolean(
                  effective.browserbaseApiKey && effective.browserbaseProjectId,
                )
              : null,
          stagehandModel: effective.stagehandModel,
          substackLoginConfigured: Boolean(
            effective.substackEmail && effective.substackPassword,
          ),
          session: session
            ? {
                browserbaseSessionId: redact(session.browserbaseSessionId),
                publicationUrl: session.publicationUrl,
                updatedAt: session.updatedAt,
                browserbaseSessionUrl: redactUrl(session.browserbaseSessionUrl),
                browserbaseDebugUrl: redactUrl(session.browserbaseDebugUrl),
              }
            : null,
        },
        null,
        2,
      ),
    );
  });

auth
  .command("login")
  .description(
    "Start or resume a Browserbase session for manual Substack login.",
  )
  .option("--session-id <id>", "Existing Browserbase session ID to resume")
  .option(
    "--auto-login",
    "Attempt Substack login using SUBSTACK_EMAIL and SUBSTACK_PASSWORD",
    false,
  )
  .option(
    "--pause-before-password",
    "For local auto-login, stop after opening and focusing the password field",
    false,
  )
  .option(
    "--wait-seconds <seconds>",
    "Keep the session open for manual login before closing",
    parseInteger,
    0,
  )
  .action(
    async (options: {
      sessionId?: string;
      autoLogin: boolean;
      pauseBeforePassword: boolean;
      waitSeconds: number;
    }) => {
      const stored = await loadSession();
      const effective = await loadEffectiveConfig();

      if (effective.browserRuntime === "local") {
        const result = await runLocalLogin({
          publicationUrl: requirePublicationUrl(effective),
          credentials: options.autoLogin
            ? requireSubstackCredentials(effective)
            : undefined,
          waitSeconds: options.waitSeconds,
          pauseBeforePassword: options.pauseBeforePassword,
        });

        console.log(JSON.stringify(result, null, 2));
        return;
      }

      const session = await createStagehandSession({
        config: effective,
        browserbaseSessionId: options.sessionId ?? stored?.browserbaseSessionId,
        keepAlive: true,
      });

      try {
        await session.page.goto(session.publicationUrl, {
          waitUntil: "domcontentloaded",
          timeoutMs: 60000,
        });

        if (session.browserbaseSessionId) {
          await saveSession(
            createStoredSession({
              browserbaseSessionId: session.browserbaseSessionId,
              publicationUrl: session.publicationUrl,
              browserbaseSessionUrl: session.browserbaseSessionUrl,
              browserbaseDebugUrl: session.browserbaseDebugUrl,
            }),
          );
        }

        const autoLoginResult = options.autoLogin
          ? await performSubstackLogin(
              session,
              requireSubstackCredentials(effective),
            )
          : null;

        console.log(
          JSON.stringify(
            {
              status: "session-started",
              publicationUrl: session.publicationUrl,
              browserbaseSessionId: redact(session.browserbaseSessionId),
              browserbaseSessionUrl: session.browserbaseSessionUrl ?? null,
              browserbaseDebugUrl: session.browserbaseDebugUrl ?? null,
              autoLogin: autoLoginResult,
              note: "Use the Browserbase session URL to complete login manually if needed.",
            },
            null,
            2,
          ),
        );

        if (options.waitSeconds > 0) {
          await new Promise((resolve) =>
            setTimeout(resolve, options.waitSeconds * 1000),
          );
        }
      } finally {
        await session.close();
      }
    },
  );

auth
  .command("logout")
  .description("Forget the locally stored Browserbase session ID.")
  .action(async () => {
    await clearSession();
    console.log(JSON.stringify({ status: "session-cleared" }, null, 2));
  });

const debug = program.command("debug").description("Diagnostic helpers.");

debug
  .command("local-page")
  .description(
    "Inspect visible links, buttons, and editor fields from the local browser profile.",
  )
  .argument("[url]", "URL to inspect")
  .action(async (url?: string) => {
    const effective = await loadEffectiveConfig();
    const diagnostics = await captureLocalDiagnostics(
      url ?? requirePublicationUrl(effective),
    );
    console.log(JSON.stringify(diagnostics, null, 2));
  });

function parseInteger(value: string): number {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`Expected a non-negative integer, received ${value}`);
  }

  return parsed;
}

program.parseAsync().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Error: ${message}`);
  process.exitCode = 1;
});
