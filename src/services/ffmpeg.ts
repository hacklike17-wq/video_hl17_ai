import { spawn } from "node:child_process";
import { writeFile, mkdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

/** Chạy 1 lệnh và trả stdout. Throws nếu exit code != 0. */
function run(cmd: string, args: string[]): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    p.stdout.on("data", (d) => (stdout += d.toString()));
    p.stderr.on("data", (d) => (stderr += d.toString()));
    p.on("error", reject);
    p.on("close", (code) => {
      if (code === 0) resolve({ stdout, stderr });
      else reject(new Error(`${cmd} exit ${code}: ${stderr.slice(-500)}`));
    });
  });
}

export async function probeDurationSec(filePath: string): Promise<number> {
  const { stdout } = await run("ffprobe", [
    "-v",
    "error",
    "-show_entries",
    "format=duration",
    "-of",
    "default=noprint_wrappers=1:nokey=1",
    filePath,
  ]);
  const n = parseFloat(stdout.trim());
  if (!Number.isFinite(n)) throw new Error(`ffprobe duration NaN cho ${filePath}`);
  return n;
}

export async function downloadTo(url: string, dest: string): Promise<void> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download fail ${res.status} ${url.slice(0, 80)}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await writeFile(dest, buf);
}

export async function makeWorkDir(prefix = "asm"): Promise<string> {
  const dir = join(tmpdir(), `${prefix}-${randomUUID()}`);
  await mkdir(dir, { recursive: true });
  return dir;
}

export async function cleanupDir(dir: string): Promise<void> {
  await rm(dir, { recursive: true, force: true });
}

/**
 * Ghép nhiều b-roll MP4 thành 1 video portrait 1080x1920, mux với voice MP3.
 * Output dài bằng audio (cắt phần video thừa), b-rolls được normalize về cùng resolution
 * trước khi concat.
 */
export async function assembleVideo(opts: {
  voicePath: string;
  brollPaths: string[];
  outputPath: string;
  width?: number;
  height?: number;
  fps?: number;
}): Promise<void> {
  const w = opts.width ?? 1080;
  const h = opts.height ?? 1920;
  const fps = opts.fps ?? 30;
  if (opts.brollPaths.length === 0) throw new Error("Không có b-roll để ghép");

  // Build filter_complex: scale + pad + setsar + fps cho mỗi input, rồi concat
  const inputs: string[] = [];
  opts.brollPaths.forEach((p) => {
    inputs.push("-i", p);
  });
  inputs.push("-i", opts.voicePath);

  const filters: string[] = [];
  for (let i = 0; i < opts.brollPaths.length; i++) {
    filters.push(
      `[${i}:v]scale=${w}:${h}:force_original_aspect_ratio=increase,crop=${w}:${h},setsar=1,fps=${fps}[v${i}]`,
    );
  }
  const concatInputs = opts.brollPaths.map((_, i) => `[v${i}]`).join("");
  filters.push(`${concatInputs}concat=n=${opts.brollPaths.length}:v=1:a=0[outv]`);
  const filterComplex = filters.join(";");

  const audioStreamIndex = opts.brollPaths.length; // last -i is voice
  const args = [
    "-y",
    ...inputs,
    "-filter_complex",
    filterComplex,
    "-map",
    "[outv]",
    "-map",
    `${audioStreamIndex}:a`,
    "-c:v",
    "libx264",
    "-preset",
    "veryfast",
    "-crf",
    "23",
    "-c:a",
    "aac",
    "-b:a",
    "128k",
    "-shortest",
    "-pix_fmt",
    "yuv420p",
    "-movflags",
    "+faststart",
    opts.outputPath,
  ];

  await run("ffmpeg", args);
}
