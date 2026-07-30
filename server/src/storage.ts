import { createClient } from '@supabase/supabase-js';

const ROOM_PHOTOS_BUCKET = 'room-photos';

let client: ReturnType<typeof createClient> | null = null;

function getClient() {
  if (client) return client;
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set to upload files.');
  }
  client = createClient(url, serviceRoleKey);
  return client;
}

export async function uploadRoomPhoto(filename: string, buffer: Buffer, contentType: string): Promise<string> {
  const supabase = getClient();
  const { error } = await supabase.storage.from(ROOM_PHOTOS_BUCKET).upload(filename, buffer, {
    contentType,
    upsert: false,
  });
  if (error) throw new Error(`Failed to upload photo: ${error.message}`);

  const { data } = supabase.storage.from(ROOM_PHOTOS_BUCKET).getPublicUrl(filename);
  return data.publicUrl;
}

export async function deleteRoomPhoto(filename: string): Promise<void> {
  const supabase = getClient();
  await supabase.storage.from(ROOM_PHOTOS_BUCKET).remove([filename]);
}

export function extractRoomPhotoFilename(photoUrl: string): string {
  return photoUrl.substring(photoUrl.lastIndexOf('/') + 1);
}
