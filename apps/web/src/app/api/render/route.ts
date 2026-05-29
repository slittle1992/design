import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * Proxies a Gemini 2.5 Flash Image ("Nano Banana") edit call. The client
 * sends the source backyard photo as a data URL plus the design context;
 * the server holds the API key and prompts the model to replace the lawn
 * area with the proposed turf install while keeping the house, sky, fence,
 * and trees intact.
 */
export async function POST(req: Request) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    return NextResponse.json(
      { error: 'GEMINI_API_KEY not configured. Add it in Vercel project env vars.' },
      { status: 500 },
    );
  }

  let body: {
    photoDataUrl?: string;
    turfName?: string;
    rockSqFt?: number;
    netSqFt?: number;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body.photoDataUrl) {
    return NextResponse.json({ error: 'photoDataUrl required' }, { status: 400 });
  }

  // Strip the "data:image/jpeg;base64," header.
  const match = body.photoDataUrl.match(/^data:(image\/[^;]+);base64,(.+)$/);
  if (!match) {
    return NextResponse.json({ error: 'photoDataUrl must be a base64 image' }, { status: 400 });
  }
  const mimeType = match[1]!;
  const base64 = match[2]!;

  const prompt = [
    `You are editing a photograph of a residential backyard.`,
    `Replace the existing lawn / grass / dead grass / dirt area with freshly installed artificial turf:`,
    `- Turf SKU: ${body.turfName ?? 'premium residential turf'}, vibrant green, realistic pile, neatly edged.`,
    body.rockSqFt && body.rockSqFt > 0
      ? `- Place decorative tan/grey landscape rock along the borders where appropriate (~${body.rockSqFt} sq ft total).`
      : '',
    `Keep absolutely unchanged: the house, roofline, windows, sky, clouds, trees, fences, patio, pool, walkways, and any furniture or AC units.`,
    `Lighting and shadows on the new turf must match the existing scene.`,
    `Do not add people, pets, vehicles, watermarks, or text.`,
    `Output a single photorealistic image at the same aspect ratio as the input.`,
  ]
    .filter(Boolean)
    .join('\n');

  // Gemini 2.5 Flash Image (Nano Banana) endpoint
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${key}`;

  const upstream = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }, { inlineData: { mimeType, data: base64 } }],
        },
      ],
      generationConfig: {
        responseModalities: ['IMAGE'],
      },
    }),
  });

  if (!upstream.ok) {
    const text = await upstream.text();
    return NextResponse.json(
      { error: `Gemini error ${upstream.status}: ${text.slice(0, 500)}` },
      { status: 502 },
    );
  }

  const data = await upstream.json();
  const parts = data?.candidates?.[0]?.content?.parts ?? [];
  const imagePart = parts.find((p: { inlineData?: { data: string } }) => p.inlineData?.data);

  if (!imagePart?.inlineData?.data) {
    return NextResponse.json({ error: 'Gemini returned no image' }, { status: 502 });
  }

  return NextResponse.json({
    imageDataUrl: `data:${imagePart.inlineData.mimeType ?? 'image/png'};base64,${imagePart.inlineData.data}`,
  });
}
