import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ page: string }> }
) {
  const { page } = await params
  const pageNum = parseInt(page, 10)

  if (isNaN(pageNum) || pageNum < 1 || pageNum > 48) {
    return NextResponse.json({ error: 'Invalid page number' }, { status: 400 })
  }

  // We'll use pdf.js to render the page server-side
  // For now, redirect to a client-side render approach
  return NextResponse.json({
    page: pageNum,
    message: 'Use the PdfPageViewer component to render this page client-side'
  })
}
