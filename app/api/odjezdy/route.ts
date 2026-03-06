import { NextResponse } from 'next/server'
import * as cheerio from 'cheerio'

export async function GET() {
  try {

    const url = "https://idos.cz/vlakyautobusymhdvse/odjezdy/vysledky/?f=Nov%C3%BD%20Byd%C5%BEov,,Termin%C3%A1l%20HD&fc=200003"

    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0"
      },
      cache: "no-store"
    })

    const html = await response.text()
    const $ = cheerio.load(html)

    const odjezdy: any[] = []

    $(".dep-row-first").each((i, el) => {

      const row = $(el)

      // CÍL
      const kam = row.find("td").eq(0).find("h3").text().trim()

      // LINKA
      const linkaRaw = row.find(".code h3").text().trim()
      const linka = linkaRaw.replace("Bus", "").trim()

      // ČAS
      const cas = row
        .find("td")
        .eq(2)
        .find("h3 span")
        .first()
        .text()
        .trim()

      // NÁSTUPIŠTĚ
      const nastupiste = row
        .find('span[title="nástupiště"]')
        .text()
        .trim() || "-"

      // ZPOŽDĚNÍ
      const delayRow = row.next(".dep-row-second")
      const zpozdeniRaw = delayRow.find(".cell-delay").text().trim()

      const zpozdeni = zpozdeniRaw
        ? zpozdeniRaw.replace(/[^\d]/g, "")
        : "0"

      if (cas && kam) {
        odjezdy.push({
          linka,
          kam,
          cas,
          nastupiste,
          zpozdeni: `${zpozdeni} min`
        })
      }

    })

    odjezdy.sort((a, b) => a.cas.localeCompare(b.cas))

    return NextResponse.json({
      stanice: "Nový Bydžov, Terminál HD",
      aktualizovano: new Date().toISOString(),
      pocet_spoju: odjezdy.length,
      data: odjezdy
    })

  } catch (err) {
    return NextResponse.json(
      { error: "Chyba při parsování dat" },
      { status: 500 }
    )
  }
}