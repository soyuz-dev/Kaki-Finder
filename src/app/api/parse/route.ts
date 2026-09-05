import { parseRequest } from '@/features/parser/parse-request';
import { parseInputSchema } from '@/lib/validation/community';
import { apiError, jsonResponse, readInput } from '@/lib/api/http';
export async function POST(request: Request) {
  try {
    const { text } = await readInput(request, parseInputSchema);
    return jsonResponse(parseRequest(text));
  } catch (error) { return apiError(error); }
}
