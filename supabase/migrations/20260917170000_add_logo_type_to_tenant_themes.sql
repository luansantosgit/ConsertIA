-- Migration: add logo_type column to tenant_themes
-- Allows distinguishing between icon-only logos and full logos (icon + name)

ALTER TABLE tenant_themes
  ADD COLUMN IF NOT EXISTS logo_type TEXT NOT NULL DEFAULT 'icon'
    CHECK (logo_type IN ('icon', 'full'));
