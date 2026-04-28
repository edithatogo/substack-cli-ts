import { homedir } from "node:os";
import { join, resolve } from "node:path";

const STATE_DIR_NAME = ".substack-cli";

export function stateDir(): string {
  if (process.env.SUBSTACK_CLI_STATE_DIR) {
    return resolve(process.env.SUBSTACK_CLI_STATE_DIR);
  }

  return resolve(process.cwd(), STATE_DIR_NAME);
}

export function configFilePath(): string {
  return join(stateDir(), "config.json");
}

export function sessionFilePath(): string {
  return join(stateDir(), "session.json");
}

export function draftMappingsFilePath(): string {
  return join(stateDir(), "draft-mappings.json");
}

export function cacheDir(): string {
  return join(stateDir(), "stagehand-cache");
}

export function localBrowserProfileDir(): string {
  return join(stateDir(), "chrome-profile");
}

export function fallbackHomeStateDir(): string {
  return join(homedir(), STATE_DIR_NAME);
}
