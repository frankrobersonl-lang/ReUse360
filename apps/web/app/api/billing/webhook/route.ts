export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { db } from '@/lib/db'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

const PLAN_MAP: Record<string, string> = {
  [process.env.STRIPE_PRICE_ESSENTIAL!]:    'ESSENTIAL',
  [process.env.STRIPE_PRICE_PROFESSIONAL!]: 'PROFESSIONAL',
  [process.env.STRIPE_PRICE_ENTERPRISE!]:   'ENTERPRISE',
}

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig  = req.headers.get('stripe-signature')!

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err: any) {
    console.error('Webhook signature error:', err.message)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  try {
    switch (event.type) {

      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const orgId   = session.metadata?.orgId
        const plan    = session.metadata?.plan
        if (!orgId || !plan) break
        await db.organization.update({
          where: { id: orgId },
          data:  {
            plan: plan as any,
            stripeSubscriptionId: session.subscription as string,
            trialEndsAt: null
          }
        })
        console.log(`✅ Org ${orgId} upgraded to ${plan}`)
        break
      }

      case 'customer.subscription.updated': {
        const sub      = event.data.object as Stripe.Subscription
        const priceId  = sub.items.data[0]?.price.id
        const plan     = PLAN_MAP[priceId] ?? 'ESSENTIAL'
        const org      = await db.organization.findFirst({
          where: { stripeSubscriptionId: sub.id }
        })
        if (!org) break
        await db.organization.update({
          where: { id: org.id },
          data:  { plan: plan as any }
        })
        console.log(`✅ Org ${org.id} plan updated to ${plan}`)
        break
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription
        const org = await db.organization.findFirst({
          where: { stripeSubscriptionId: sub.id }
        })
        if (!org) break
        await db.organization.update({
          where: { id: org.id },
          data:  { plan: 'TRIAL', stripeSubscriptionId: null }
        })
        console.log(`⚠️ Org ${org.id} subscription cancelled — reverted to TRIAL`)
        break
      }
    }
  } catch (err) {
    console.error('Webhook handler error:', err)
    return NextResponse.json({ error: 'Handler failed' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
