CREATE TABLE "cartridges" (
	"id" serial PRIMARY KEY,
	"brand" text NOT NULL,
	"model" text NOT NULL,
	"color" text DEFAULT 'N/A' NOT NULL,
	"barcode" text,
	"printers" text DEFAULT '' NOT NULL,
	"quantity" integer DEFAULT 0 NOT NULL,
	"min_threshold" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
