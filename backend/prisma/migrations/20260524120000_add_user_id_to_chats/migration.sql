-- AlterTable: add user_id column (nullable initially for backfill)
ALTER TABLE chats ADD COLUMN user_id TEXT;

-- Backfill: assign each chat the user_id of its search space owner
UPDATE chats SET user_id = (SELECT user_id FROM searchspaces WHERE searchspaces.id = chats.search_space_id);

-- Make user_id NOT NULL after backfill
ALTER TABLE chats ALTER COLUMN user_id SET NOT NULL;

-- Create index on user_id
CREATE INDEX chats_user_id_idx ON chats(user_id);

-- Add foreign key constraint
ALTER TABLE chats ADD CONSTRAINT chats_user_id_fkey FOREIGN KEY (user_id) REFERENCES "user"(id) ON DELETE CASCADE ON UPDATE CASCADE;
