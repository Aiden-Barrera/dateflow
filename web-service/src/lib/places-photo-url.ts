export function normalizeProxiedPhotoUrl(photoUrl: string): string {
  if (photoUrl.startsWith("/")) {
    return photoUrl;
  }

  try {
    const parsed = new URL(photoUrl);

    if (parsed.pathname === "/api/places/photos") {
      return `${parsed.pathname}${parsed.search}`;
    }
  } catch {
    return photoUrl;
  }

  return photoUrl;
}
