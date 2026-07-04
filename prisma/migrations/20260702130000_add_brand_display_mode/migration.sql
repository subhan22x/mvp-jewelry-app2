-- Let owners choose whether the design wizard header shows their logo, business name, or neither.
ALTER TABLE "Account" ADD COLUMN IF NOT EXISTS "brandDisplayMode" TEXT NOT NULL DEFAULT 'logo';
