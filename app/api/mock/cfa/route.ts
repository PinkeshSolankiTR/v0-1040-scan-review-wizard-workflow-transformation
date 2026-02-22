import { cfaA } from '@/lib/mock-data/demo-a'
import { cfaB } from '@/lib/mock-data/demo-b'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const binderId = searchParams.get('binderId') ?? 'demo-a'
  const data = binderId === 'demo-b' ? cfaB : cfaA
  return Response.json(data)
}
