import { SuperXAPI, printJson, note } from "../api";
import { getConfig } from "../config";

export async function tagsList(): Promise<void> {
  const api = new SuperXAPI(getConfig());
  printJson(await api.listTags());
}

export async function tagsCreate(argv: { name: string; color?: string }): Promise<void> {
  const body: Record<string, unknown> = { name: argv.name };
  if (argv.color) body.color = argv.color;
  const api = new SuperXAPI(getConfig());
  printJson(await api.createTag(body));
}

export async function tagsUpdate(argv: {
  id: string;
  name?: string;
  color?: string;
}): Promise<void> {
  if (argv.name === undefined && argv.color === undefined) {
    note("Provide --name and/or --color.");
    process.exit(1);
  }
  const body: Record<string, unknown> = {};
  if (argv.name !== undefined) body.name = argv.name;
  if (argv.color !== undefined) body.color = argv.color;
  const api = new SuperXAPI(getConfig());
  printJson(await api.updateTag(argv.id, body));
}

export async function tagsDelete(argv: { id: string }): Promise<void> {
  const api = new SuperXAPI(getConfig());
  await api.deleteTag(argv.id);
  printJson({ id: argv.id, deleted: true });
}
