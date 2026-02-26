import { binderA } from '@/lib/mock-data/demo-a'

export async function GET() {
  return Response.json(binderA)
}
