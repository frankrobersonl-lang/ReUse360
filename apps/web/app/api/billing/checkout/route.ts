import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

const PRICE_MAP: Record<string, string> = {
  ESSENTIAL:     process.env.STRIPE_PRICE_ESSENTIAL!,
  PROFESSIONAL:  process.env.STRIPE_PRICE_PROFESSIONAL!,
  ENTERPRISE:    process.env.STRIPE_PRICE_ENTERPRISE!,
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { plan } = await req.json()
    const priceId = PRICE_MAP[plan]
    if (!priceId) return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })

    const user = await db.user.findUnique({
      where: { clerkId: userId },
      include: { org: true }
    })
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    // Create or retrieve Stripe customer
    let customerId = user.org.stripeCustomerId
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.org.name,
        metadata: { orgId: user.org.id, orgSlug: user.org.slug }
      })
      customerId = customer.id
      await db.organization.update({
        where: { id: user.org.id },
        data: { stripeCustomerId: customerId }
      })
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/admin/billing?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/admin/billing?cancelled=true`,
      metadata: { orgId: user.org.id, plan }
    })

    return NextResponse.json({ url: session.url })
  } catch (err: any) {
    console.error('Checkout error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
