import type { Config, Context } from "@netlify/functions";
import { asc, eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { cartridges } from "../../db/schema.js";

type CartridgeInput = {
  brand?: unknown;
  model?: unknown;
  color?: unknown;
  barcode?: unknown;
  printers?: unknown;
  quantity?: unknown;
  minThreshold?: unknown;
};

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function asInt(value: unknown, fallback: number): number {
  const n = Math.trunc(Number(value));
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

function buildValues(input: CartridgeInput) {
  const values: Record<string, unknown> = {};
  if (input.brand !== undefined) values.brand = asString(input.brand);
  if (input.model !== undefined) values.model = asString(input.model);
  if (input.color !== undefined) values.color = asString(input.color) || "N/A";
  if (input.barcode !== undefined) {
    const barcode = asString(input.barcode);
    values.barcode = barcode.length ? barcode : null;
  }
  if (input.printers !== undefined) values.printers = asString(input.printers);
  if (input.quantity !== undefined) values.quantity = asInt(input.quantity, 0);
  if (input.minThreshold !== undefined) values.minThreshold = asInt(input.minThreshold, 1);
  return values;
}

function parseId(raw: string | undefined): number | null {
  if (!raw) return null;
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export default async (req: Request, context: Context) => {
  const id = parseId(context.params?.id);

  try {
    if (req.method === "GET") {
      const rows = await db.select().from(cartridges).orderBy(asc(cartridges.brand), asc(cartridges.model));
      return Response.json(rows);
    }

    if (req.method === "POST") {
      const input = (await req.json()) as CartridgeInput;
      const values = buildValues(input);
      if (!values.brand || !values.model) {
        return Response.json({ error: "brand and model are required" }, { status: 400 });
      }
      const [row] = await db
        .insert(cartridges)
        .values({
          brand: values.brand as string,
          model: values.model as string,
          color: (values.color as string) ?? "N/A",
          barcode: (values.barcode as string | null) ?? null,
          printers: (values.printers as string) ?? "",
          quantity: (values.quantity as number) ?? 0,
          minThreshold: (values.minThreshold as number) ?? 1,
        })
        .returning();
      return Response.json(row, { status: 201 });
    }

    if (req.method === "PATCH" || req.method === "PUT") {
      if (!id) return Response.json({ error: "invalid id" }, { status: 400 });
      const input = (await req.json()) as CartridgeInput;
      const values = { ...buildValues(input), updatedAt: new Date() };
      const [row] = await db.update(cartridges).set(values).where(eq(cartridges.id, id)).returning();
      if (!row) return Response.json({ error: "not found" }, { status: 404 });
      return Response.json(row);
    }

    if (req.method === "DELETE") {
      if (!id) return Response.json({ error: "invalid id" }, { status: 400 });
      const [row] = await db.delete(cartridges).where(eq(cartridges.id, id)).returning();
      if (!row) return Response.json({ error: "not found" }, { status: 404 });
      return Response.json({ deleted: row.id });
    }

    return new Response("Method not allowed", { status: 405, headers: { Allow: "GET, POST, PATCH, PUT, DELETE" } });
  } catch (error) {
    console.error("cartridges function error", error);
    const message = error instanceof Error ? error.message : "unexpected error";
    return Response.json({ error: message }, { status: 500 });
  }
};

export const config: Config = {
  path: ["/api/cartridges", "/api/cartridges/:id"],
};
