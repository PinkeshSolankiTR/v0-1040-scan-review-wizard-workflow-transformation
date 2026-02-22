import { nfrA } from '@/lib/mock-data/demo-a'
import { nfrB } from '@/lib/mock-data/demo-b'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const binderId = searchParams.get('binderId') ?? 'demo-a'
  const data = binderId === 'demo-b' ? nfrB : nfrA
  return Response.json(data)
}
