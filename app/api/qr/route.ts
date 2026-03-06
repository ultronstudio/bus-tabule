import { NextResponse } from 'next/server'
import QRCode from 'qrcode'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const base = "https://tabule.novybydzov.cz"
    const url = [...searchParams].length
      ? `${base}?${searchParams.toString()}`
      : base

    const qr = await QRCode.toBuffer(url, {
      errorCorrectionLevel: 'H',   // NEJVYŠŠÍ ochrana
      type: 'png',
      width: 320,                  // větší QR
      margin: 4,                   // quiet zone (nutné pro čitelnost)
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    })

    return new NextResponse(qr, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=86400'
      }
    })

  } catch (e) {
    return NextResponse.json({ error: "QR generation failed" }, { status: 500 })
  }
}