import { auth, currentUser } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// POST: create session or append messages
export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const clerkUser = await currentUser()
  const userEmail = clerkUser?.emailAddresses?.[0]?.emailAddress ?? null

  const body = await req.json()
  const { sessionId, role, content } = body

  if (!role || !content) {
    return NextResponse.json({ error: 'role and content are required' }, { status: 400 })
  }

  // Create or reuse session
  let session
  if (sessionId) {
    session = await db.chatSession.findUnique({ where: { id: sessionId } })
    if (!session || session.userId !== userId) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }
  } else {
    session = await db.chatSession.create({
      data: { userId, userEmail },
    })
  }

  // Add message
  const message = await db.chatMessage.create({
    data: {
      sessionId: session.id,
      role,
      content,
    },
  })

  // Touch updatedAt
  await db.chatSession.update({
    where: { id: session.id },
    data: { updatedAt: new Date() },
  })

  return NextResponse.json({ sessionId: session.id, messageId: message.id }, { status: 201 })
}

// GET: list sessions (admin only, used by chat-logs page)
export async function GET(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '50'), 100)
  const offset = parseInt(searchParams.get('offset') ?? '0')

  const [sessions, total] = await Promise.all([
    db.chatSession.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
      include: {
        messages: { orderBy: { createdAt: 'asc' } },
        _count: { select: { messages: true } },
      },
    }),
    db.chatSession.count(),
  ])

  return NextResponse.json({ sessions, total })
}
