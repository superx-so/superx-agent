import { readFileSync } from "fs";
import path from "path";
import { SuperXAPI, ApiError, printJson, note } from "../api";
import { getConfig } from "../config";

/** Magic-byte sniff for the supported image types. */
function sniffImageType(bytes: Buffer): string | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  if (bytes.length >= 4 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return "image/png";
  }
  if (bytes.length >= 4 && bytes.toString("latin1", 0, 4) === "GIF8") {
    return "image/gif";
  }
  if (bytes.length >= 12 && bytes.toString("latin1", 0, 4) === "RIFF" && bytes.toString("latin1", 8, 12) === "WEBP") {
    return "image/webp";
  }
  return null;
}

const EXT_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

/**
 * media:upload <file> — presign via POST /v1/media, PUT the bytes to R2,
 * print { object_key, url, file_type, size }. Magic bytes decide the type;
 * the extension is only a fallback.
 */
export async function mediaUpload(argv: { file: string }): Promise<void> {
  let buffer: Buffer;
  try {
    buffer = readFileSync(argv.file);
  } catch (err: any) {
    note(`Error: could not read ${argv.file} (${err?.message || err})`);
    process.exit(1);
    return;
  }

  const fileType = sniffImageType(buffer) || EXT_TYPES[path.extname(argv.file).toLowerCase()];
  if (!fileType) {
    note("Error: unsupported file type. Supported images: JPG, PNG, WEBP, GIF.");
    process.exit(1);
    return;
  }

  const filename = path.basename(argv.file);
  const api = new SuperXAPI(getConfig());
  const created = await api.createMediaUpload({
    filename,
    file_type: fileType,
    size: buffer.length,
  });
  const data = created?.data || {};
  if (!data.upload_url || !data.object_key) {
    note("Error: the API did not return an upload URL.");
    process.exit(1);
    return;
  }

  note(`Uploading ${filename} (${fileType}, ${buffer.length} bytes)...`);
  let putResponse: Response;
  try {
    putResponse = await fetch(data.upload_url, {
      method: "PUT",
      // The presigned URL signs the Content-Type; it must match file_type.
      headers: { "Content-Type": fileType },
      body: buffer as any,
    });
  } catch (err: any) {
    throw new ApiError(0, "network_error", `Upload failed (${err?.message || err})`);
  }
  if (!putResponse.ok) {
    throw new ApiError(putResponse.status, "upload_failed", `The storage upload returned HTTP ${putResponse.status}.`);
  }

  printJson({
    object_key: data.object_key,
    url: data.url,
    file_type: fileType,
    size: buffer.length,
  });
}
