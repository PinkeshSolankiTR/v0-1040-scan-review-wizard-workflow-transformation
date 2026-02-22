import { supersededA } from '@/lib/mock-data/demo-a'
import { supersededB } from '@/lib/mock-data/demo-b'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const binderId = searchParams.get('binderId') ?? 'demo-a'
  const data = binderId === 'demo-b' ? supersededB : supersededA
  return Response.json(data)
}
