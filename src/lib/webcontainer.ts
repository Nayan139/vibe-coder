import type { DirectoryNode, FileSystemTree, WebContainer } from "@webcontainer/api";

type WebContainerModule = typeof import("@webcontainer/api");

let wcInstance: WebContainer | null = null;
let wcBootPromise: Promise<WebContainer> | null = null;
let activeServerProcess: Awaited<ReturnType<WebContainer["spawn"]>> | null = null;
const installedDepsFingerprintByCwd = new Map<string, string>();

function splitCommand(cmd: string): { bin: string; args: string[] } {
  const tokens = cmd.trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) {
    throw new Error("Command is empty.");
  }
  return { bin: tokens[0], args: tokens.slice(1) };
}

function hasPathUnder(filePaths: string[], cwd: string, relativePrefix: string): boolean {
  const normalizedCwd = cwd === "/" ? "" : cwd.replace(/^\//, "");
  const prefix = normalizedCwd ? `${normalizedCwd}/${relativePrefix}` : relativePrefix;
  return filePaths.some((p) => p === prefix || p.startsWith(`${prefix}/`));
}

function looksLikeNextAppRoot(filePaths: string[], cwd: string): boolean {
  return (
    hasPathUnder(filePaths, cwd, "app") ||
    hasPathUnder(filePaths, cwd, "pages") ||
    hasPathUnder(filePaths, cwd, "src/app") ||
    hasPathUnder(filePaths, cwd, "src/pages")
  );
}

function looksLikeNextAppRootFromAny(
  mountedPaths: string[],
  repoTreePaths: string[],
  cwd: string
): boolean {
  return looksLikeNextAppRoot(mountedPaths, cwd) || looksLikeNextAppRoot(repoTreePaths, cwd);
}

function resolveProjectCwd(filePaths: string[]): string {
  const packageJsonPaths = filePaths.filter(
    (p) => p.endsWith("/package.json") || p === "package.json"
  );
  if (packageJsonPaths.length === 0) {
    throw new Error(
      "No package.json found in mounted files. Load project root files (or select no files so whole-project mode can fetch them) before starting Live Preview."
    );
  }

  const candidateCwds = packageJsonPaths.map((path) => {
    if (path === "package.json") return "/";
    const dir = path.split("/").slice(0, -1).join("/");
    return dir ? `/${dir}` : "/";
  });

  const nextCandidates = candidateCwds.filter((cwd) => looksLikeNextAppRoot(filePaths, cwd));
  if (nextCandidates.length > 0) {
    // If multiple Next apps exist, pick the shallowest one.
    return [...nextCandidates].sort((a, b) => a.split("/").length - b.split("/").length)[0];
  }

  // Fallback: pick the shallowest package root.
  return [...candidateCwds].sort((a, b) => a.split("/").length - b.split("/").length)[0];
}

async function readFileOrEmpty(wc: WebContainer, path: string): Promise<string> {
  try {
    return await wc.fs.readFile(path, "utf-8");
  } catch {
    return "";
  }
}

async function existsDir(wc: WebContainer, path: string): Promise<boolean> {
  try {
    await wc.fs.readdir(path);
    return true;
  } catch {
    return false;
  }
}

async function getDepsFingerprint(wc: WebContainer, cwd: string): Promise<string> {
  const packageJson = await readFileOrEmpty(wc, `${cwd}/package.json`);
  const packageLock = await readFileOrEmpty(wc, `${cwd}/package-lock.json`);
  const npmrc = await readFileOrEmpty(wc, `${cwd}/.npmrc`);
  return `${packageJson}\n---\n${packageLock}\n---\n${npmrc}`;
}

function getInstallCommand(
  install: { bin: string; args: string[] },
  hasPackageLock: boolean
): { bin: string; args: string[] } {
  if (install.bin !== "npm") return install;

  const hasSubCommand = install.args[0] === "install" || install.args[0] === "i" || install.args[0] === "ci";
  if (!hasSubCommand) return install;

  const preferredSubCommand = hasPackageLock ? "ci" : "install";
  return {
    bin: "npm",
    args: [preferredSubCommand, "--prefer-offline", "--no-audit", "--progress=false"],
  };
}

async function getWebContainerModule(): Promise<WebContainerModule> {
  return import("@webcontainer/api");
}

export async function getWebContainer(): Promise<WebContainer> {
  if (typeof window === "undefined") {
    throw new Error("WebContainer can only run in the browser.");
  }

  if (wcInstance) return wcInstance;
  if (wcBootPromise) return wcBootPromise;

  wcBootPromise = (async () => {
    const { WebContainer } = await getWebContainerModule();
    try {
      wcInstance = await WebContainer.boot();
      return wcInstance;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes("Unable to create more instances")) {
        throw new Error(
          "WebContainer instance limit reached. Reuse is now guarded, but a stale browser instance is currently active. Refresh this page once, then start Live Preview again."
        );
      }
      throw error;
    } finally {
      wcBootPromise = null;
    }
  })();

  return wcBootPromise;
}

export function teardownWebContainer() {
  if (activeServerProcess) {
    activeServerProcess.kill();
    activeServerProcess = null;
  }
  if (wcInstance) {
    wcInstance.teardown();
    wcInstance = null;
  }
}

function getOrCreateDirectoryNode(tree: FileSystemTree, part: string): DirectoryNode {
  const node = tree[part];
  if (node && "directory" in node) {
    return node;
  }

  const created: DirectoryNode = { directory: {} };
  tree[part] = created;
  return created;
}

function buildFsTree(files: Record<string, string>): FileSystemTree {
  const tree: FileSystemTree = {};

  for (const [filePath, content] of Object.entries(files)) {
    const parts = filePath.split("/").filter(Boolean);
    if (parts.length === 0) continue;

    let cursor: FileSystemTree = tree;
    for (let i = 0; i < parts.length - 1; i += 1) {
      const part = parts[i];
      const directoryNode = getOrCreateDirectoryNode(cursor, part);
      cursor = directoryNode.directory;
    }

    cursor[parts[parts.length - 1]] = { file: { contents: content } };
  }

  return tree;
}

export async function mountProjectFiles(files: Record<string, string>): Promise<WebContainer> {
  const wc = await getWebContainer();
  await wc.mount(buildFsTree(files));
  return wc;
}

export async function startDevServer(
  wc: WebContainer,
  installCmd: string,
  startCmd: string,
  mountedFilePaths: string[],
  repoTreePaths: string[] = [],
  onReady: (url: string) => void,
  onLog: (line: string) => void,
  onPhase?: (phase: "installing" | "starting") => void
) {
  const rootCandidatePaths = repoTreePaths.length > 0 ? repoTreePaths : mountedFilePaths;
  const cwd = resolveProjectCwd(rootCandidatePaths);
  onLog(`Using project root: ${cwd}`);
  if (!looksLikeNextAppRootFromAny(mountedFilePaths, repoTreePaths, cwd)) {
    throw new Error(
      `The selected project root (${cwd}) does not include app/pages files in selected repo tree or mounted context. Load more files (including app/, pages/, src/app/, or src/pages/) and retry Live Preview.`
    );
  }

  const depsFingerprint = await getDepsFingerprint(wc, cwd);
  const cachedFingerprint = installedDepsFingerprintByCwd.get(cwd);
  const hasNodeModules = await existsDir(wc, `${cwd}/node_modules`);
  const shouldInstall = !(hasNodeModules && cachedFingerprint === depsFingerprint);

  if (shouldInstall) {
    const install = splitCommand(installCmd);
    const hasPackageLock = (await readFileOrEmpty(wc, `${cwd}/package-lock.json`)).length > 0;
    const optimizedInstall = getInstallCommand(install, hasPackageLock);
    onPhase?.("installing");
    onLog(`Running install: ${optimizedInstall.bin} ${optimizedInstall.args.join(" ")}`);
    const installProcess = await wc.spawn(optimizedInstall.bin, optimizedInstall.args, { cwd });
    installProcess.output.pipeTo(new WritableStream({ write: (line) => onLog(String(line)) }));
    const installExit = await installProcess.exit;
    if (installExit !== 0) {
      throw new Error(`Install failed (exit ${installExit}).`);
    }
    installedDepsFingerprintByCwd.set(cwd, depsFingerprint);
  } else {
    onLog("Dependencies unchanged and node_modules exists. Skipping install.");
  }

  if (activeServerProcess) {
    activeServerProcess.kill();
    activeServerProcess = null;
  }

  const start = splitCommand(startCmd);
  onPhase?.("starting");
  const serverProcess = await wc.spawn(start.bin, start.args, { cwd });
  serverProcess.output.pipeTo(new WritableStream({ write: (line) => onLog(String(line)) }));
  activeServerProcess = serverProcess;

  wc.on("server-ready", (_port, url) => {
    onReady(url);
  });
}

export async function updateFileInContainer(filePath: string, content: string) {
  const wc = await getWebContainer();
  await wc.fs.writeFile(filePath, content);
}
