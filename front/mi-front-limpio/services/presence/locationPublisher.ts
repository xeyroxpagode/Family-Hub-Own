import { clearPendingLocation, replacePendingLocation, type PendingLocation } from './locationQueue';

const apiUrl = () => process.env.EXPO_PUBLIC_API_URL?.replace(/\/+$/, '') ?? '';

export async function publishLocation(accessToken: string, location: PendingLocation) {
  const baseUrl = apiUrl();
  if (!baseUrl) throw new Error('No encontramos la URL segura del servidor.');

  try {
    const response = await fetch(`${baseUrl}/api/presence/location`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(location),
    });
    if (!response.ok) throw new Error('No pudimos actualizar la ubicacion.');
    await clearPendingLocation();
  } catch (error) {
    await replacePendingLocation(location);
    throw error;
  }
}


