import fs from "node:fs/promises";
import path from "node:path";
import { exec, execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const execAsync = promisify(exec);

type NdviInput = { June: number; July: number; Aug: number; Sept: number; Oct: number };

function computeFeatures(ndvi: NdviInput) {
  const growthRate = (ndvi.Oct - ndvi.June) / 4;
  const ndviRange = Math.max(ndvi.June, ndvi.July, ndvi.Aug, ndvi.Sept, ndvi.Oct) - Math.min(ndvi.June, ndvi.July, ndvi.Aug, ndvi.Sept, ndvi.Oct);
  return { growthRate, ndviRange };
}

async function firstExistingPath(candidates: string[]): Promise<string | null> {
  for (const candidate of candidates) {
    try {
      await fs.access(candidate);
      return candidate;
    } catch {
      // Try next candidate.
    }
  }
  return null;
}

async function findFileRecursively(root: string, fileName: string): Promise<string | null> {
  const stack = [root];
  while (stack.length > 0) {
    const current = stack.pop() as string;
    let entries: Awaited<ReturnType<typeof fs.readdir>>;
    try {
      entries = await fs.readdir(current, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (entry.name === "node_modules" || entry.name.startsWith(".git")) continue;
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(full);
      } else if (entry.isFile() && entry.name === fileName) {
        return full;
      }
    }
  }
  return null;
}

async function runInferenceWithPython(args: string[], cwd: string): Promise<string> {
  const candidates = [
    process.env.PYTHON_BIN,
    path.join(cwd, ".venv", "bin", "python"),
    path.join(cwd, "venv", "bin", "python"),
    path.join(cwd, "env", "bin", "python"),
    "/opt/homebrew/bin/python3",
    "/usr/local/bin/python3",
    "/usr/bin/python3",
    "python3",
    "python",
  ].filter(Boolean) as string[];

  const pythonBins: string[] = [];
  for (const candidate of candidates) {
    if (candidate.includes("/")) {
      try {
        await fs.access(candidate);
        pythonBins.push(candidate);
      } catch {
        // Ignore missing absolute path candidate.
      }
    } else {
      pythonBins.push(candidate);
    }
  }

  let lastError: unknown;
  for (const bin of pythonBins) {
    try {
      const { stdout } = await execFileAsync(bin, args, { cwd, timeout: 15000 });
      return stdout;
    } catch (error) {
      lastError = error;
    }
  }

  // Fallback: execute via interactive login zsh so pyenv/conda/homebrew paths resolve.
  const shellEscape = (value: string) => `'${value.replace(/'/g, `'\\''`)}'`;
  const scriptAndArgs = args.map(shellEscape).join(" ");
  const pythonCmds = [
    process.env.PYTHON_CMD,
    "python3",
    "python",
    "/opt/homebrew/bin/python3",
    "/usr/local/bin/python3",
    "/usr/bin/python3",
  ].filter(Boolean) as string[];

  for (const cmd of pythonCmds) {
    try {
      const command = `${cmd} ${scriptAndArgs}`;
      const { stdout } = await execAsync(`/bin/zsh -lic ${shellEscape(command)}`, {
        cwd,
        timeout: 20000,
      });
      return stdout;
    } catch (error) {
      lastError = error;
    }
  }

  if (lastError instanceof Error) {
    throw new Error(`No usable Python interpreter found. Last error: ${lastError.message}`);
  }
  throw new Error("No usable Python interpreter found.");
}

export async function inferWithPickleModel(ndvi: NdviInput): Promise<{
  prediction: "Healthy" | "Moderate" | "Stressed";
  confidence: number | null;
  growthRate: number;
  ndviRange: number;
}> {
  const projectRoot = path.join(process.cwd(), "..");
  const recursiveModelPath = await findFileRecursively(projectRoot, "crop_health_model.pkl");
  const recursiveEncoderPath = await findFileRecursively(projectRoot, "label_encoder.pkl");

  const modelPath = await firstExistingPath([
    process.env.CROP_MODEL_PATH || "",
    path.join(projectRoot, "model", "crop_health_model.pkl"),
    path.join(projectRoot, "crop_health_model.pkl"),
    path.join(projectRoot, "src", "crop_health_model.pkl"),
    recursiveModelPath || "",
  ].filter(Boolean));

  if (!modelPath) {
    throw new Error("Pickle model file was not found. Set CROP_MODEL_PATH or place crop_health_model.pkl in model/.");
  }

  const encoderPath = await firstExistingPath([
    process.env.CROP_LABEL_ENCODER_PATH || "",
    path.join(projectRoot, "model", "label_encoder.pkl"),
    path.join(projectRoot, "label_encoder.pkl"),
    path.join(projectRoot, "src", "label_encoder.pkl"),
    recursiveEncoderPath || "",
  ].filter(Boolean));

  const scriptPath = path.join(projectRoot, "src", "predict_with_pickle.py");
  const datasetPath = path.join(projectRoot, "data", "crop_dataset.csv");
  const { growthRate, ndviRange } = computeFeatures(ndvi);

  const args = [
    scriptPath,
    "--model-path",
    modelPath,
    "--dataset-path",
    datasetPath,
    "--june",
    String(ndvi.June),
    "--july",
    String(ndvi.July),
    "--aug",
    String(ndvi.Aug),
    "--sept",
    String(ndvi.Sept),
    "--oct",
    String(ndvi.Oct),
    "--growth-rate",
    String(growthRate),
    "--ndvi-range",
    String(ndviRange),
  ];

  if (encoderPath) {
    args.push("--encoder-path", encoderPath);
  }

  const stdout = await runInferenceWithPython(args, projectRoot);
  const lines = stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const jsonLine = [...lines].reverse().find((line) => line.startsWith("{") && line.endsWith("}"));
  if (!jsonLine) {
    throw new Error(`Python output did not contain JSON. Raw output: ${stdout}`);
  }

  const parsed = JSON.parse(jsonLine) as { prediction?: string; confidence?: number | null; error?: string };
  if (parsed.error) {
    throw new Error(parsed.error);
  }
  if (!parsed.prediction) {
    throw new Error("Python inference returned no prediction.");
  }
  return {
    prediction: parsed.prediction as "Healthy" | "Moderate" | "Stressed",
    confidence: parsed.confidence ?? null,
    growthRate,
    ndviRange,
  };
}
