import { NextResponse } from 'next/server';
export function notImplemented(feature: string) {
  // Scaffold endpoints fail explicitly instead of returning fabricated success.
  return NextResponse.json(
    { error: { code: 'NOT_IMPLEMENTED', message: `${feature} is not implemented yet.` } },
    { status: 501 },
  );
}
