export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'

export async function POST(req: NextRequest) {
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const user = await db.user.findUnique({
      where: { clerkId: userId },
      include: { org: true }
    })
    if (!user?.org?.stripeCustomerId) {
      return NextResponse.json({ error: 'No billing account found' }, { status: 404 })
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: user.org.stripeCustomerId,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/admin/billing`
    })

    return NextResponse.json({ url: session.url })
  } catch (err: any) {
    console.error('Portal error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
