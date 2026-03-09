import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Mock data — will be replaced with Beacon AMI + PCU GIS integration
const MOCK_PARCELS: Record<string, ParcelResult> = {
  '123456': {
    parcelId: '123456',
    ownerName: 'Margaret R. Sullivan',
    address: '1421 Bayshore Blvd, Safety Harbor, FL 34695',
    accountNumber: 'PCU-2024-008841',
    waterSource: 'Reclaimed',
    lastViolationDate: '2026-02-14',
    violationCount: 2,
    citationStatus: 'Warning Issued',
    irrigationDay: 'Saturday',
    wateringZone: 'EVEN',
  },
  '789012': {
    parcelId: '789012',
    ownerName: 'David & Karen Mitchell',
    address: '3050 Gulf-to-Bay Blvd, Clearwater, FL 33759',
    accountNumber: 'PCU-2024-014223',
    waterSource: 'Potable',
    lastViolationDate: '2026-01-28',
    violationCount: 4,
    citationStatus: '2nd Citation — $386.00',
    irrigationDay: 'Wednesday',
    wateringZone: 'ODD',
  },
  '345678': {
    parcelId: '345678',
    ownerName: 'Sunrise Lakes HOA',
    address: '7800 Ulmerton Rd, Largo, FL 33771',
    accountNumber: 'PCU-2024-021090',
    waterSource: 'Reclaimed',
    lastViolationDate: null,
    violationCount: 0,
    citationStatus: 'No Citations',
    irrigationDay: 'Thursday',
    wateringZone: 'EVEN',
  },
  '901234': {
    parcelId: '901234',
    ownerName: 'James T. Kowalski',
    address: '440 4th Ave N, St. Petersburg, FL 33701',
    accountNumber: 'PCU-2024-005517',
    waterSource: 'Potable',
    lastViolationDate: '2026-03-01',
    violationCount: 1,
    citationStatus: '1st Citation — $193.00',
    irrigationDay: 'Saturday',
    wateringZone: 'EVEN',
  },
  '567890': {
    parcelId: '567890',
    ownerName: 'Patricia A. Gonzalez',
    address: '2215 Drew St, Clearwater, FL 33765',
    accountNumber: 'PCU-2024-018376',
    waterSource: 'Well/Lake',
    lastViolationDate: '2025-12-10',
    violationCount: 3,
    citationStatus: 'Warning Issued',
    irrigationDay: 'Wednesday',
    wateringZone: 'ODD',
  },
}

interface ParcelResult {
  parcelId: string
  ownerName: string
  address: string
  accountNumber: string
  waterSource: string
  lastViolationDate: string | null
  violationCount: number
  citationStatus: string
  irrigationDay: string
  wateringZone: string
}

function searchMockParcels(query: string): ParcelResult | null {
  const q = query.toLowerCase().trim()

  // Direct parcel ID match
  if (MOCK_PARCELS[q]) return MOCK_PARCELS[q]

  // Address substring match
  for (const parcel of Object.values(MOCK_PARCELS)) {
    if (parcel.address.toLowerCase().includes(q)) return parcel
  }

  // Owner name match
  for (const parcel of Object.values(MOCK_PARCELS)) {
    if (parcel.ownerName.toLowerCase().includes(q)) return parcel
  }

  // Account number match
  for (const parcel of Object.values(MOCK_PARCELS)) {
    if (parcel.accountNumber.toLowerCase().includes(q)) return parcel
  }

  return null
}

export async function GET(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const query = searchParams.get('q') ?? searchParams.get('address') ?? searchParams.get('parcelId') ?? ''

  if (!query.trim()) {
    return NextResponse.json({ error: 'Query parameter required' }, { status: 400 })
  }

  // TODO: Replace with real Beacon AMI + PCU GIS lookup
  const result = searchMockParcels(query)

  if (!result) {
    return NextResponse.json({ result: null, message: 'No matching parcel found' })
  }

  // Log the lookup
  await db.parcelLookup.create({
    data: {
      officerId: userId,
      query: query.trim(),
      resultData: JSON.stringify(result),
    },
  })

  return NextResponse.json({ result })
}
