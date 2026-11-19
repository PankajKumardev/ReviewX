import { execFile } from "node:child_process";
import path from "node:path";

export const runtime = "nodejs";

const maxFileSize = 20 * 1024;
const projectFolder = path.resolve(process.cwd(), "..");

export async function POST(request: Request) {
  if (request.headers.get("content-type") !== "application/octet-stream") {
    return new Response("Use the upload form to send a file.", { status: 415 });
  }

  const chunks: Uint8Array[] = [];
  let size = 0;
  const reader = request.body?.getReader();
  if (reader) {
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > maxFileSize) {
          await reader.cancel();
          return new Response("Choose a file of 20 KB or less.", { status: 413 });
        }
        chunks.push(value);
      }
    } catch {
      return new Response("The upload could not be read.", { status: 400 });
    } finally {
      reader.releaseLock();
    }
  }

  const file = Buffer.concat(chunks);
  if (!file.toString("utf8").trim()) {
    return new Response("The file is empty.", { status: 400 });
  }

  try {
    const review = await runJava(file);
    return new Response(review, {
      headers: { "Content-Type": "application/json; charset=utf-8" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "The review failed.";
    return new Response(message, { status: 502 });
  }
}

function runJava(file: Buffer) {
  return new Promise<string>((resolve, reject) => {
    // Give Java the upload on stdin and collect its reply from stdout.
    const classpath = ["out", path.join("lib", "gson.jar")].join(path.delimiter);
    const child = execFile("java", ["-cp", classpath, "reviewx.Main"], {
      cwd: projectFolder,
      timeout: 50_000,
    }, (error, stdout, stderr) => {
      if (!error) {
        resolve(stdout);
        return;
      }

      if (error.code === "ENOENT" || stderr.includes("Could not find or load main class")) {
        reject(new Error("Start ReviewX with ./run.sh so Java is ready."));
        return;
      }

      reject(new Error(stderr.trim() || "The Java review could not finish. Try again."));
    });
    child.stdin?.on("error", () => {
      // execFile reports the process failure in its callback if Java exits early.
    });
    child.stdin?.end(file);
  });
}
