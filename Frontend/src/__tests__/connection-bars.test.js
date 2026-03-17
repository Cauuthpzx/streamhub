import { describe, it, expect } from 'vitest'

describe('ConnectionBars logic', () => {
  const barColors = {
    excellent: ['bg-green-400', 'bg-green-400', 'bg-green-400'],
    good: ['bg-yellow-400', 'bg-yellow-400', 'bg-gray-400'],
    poor: ['bg-red-400', 'bg-gray-400', 'bg-gray-400'],
    lost: ['bg-gray-400', 'bg-gray-400', 'bg-gray-400'],
    unknown: ['bg-gray-400', 'bg-gray-400', 'bg-gray-400'],
  }

  it('excellent shows all green bars', () => {
    expect(barColors['excellent']).toEqual(['bg-green-400', 'bg-green-400', 'bg-green-400'])
  })

  it('good shows 2 yellow + 1 gray', () => {
    expect(barColors['good']).toEqual(['bg-yellow-400', 'bg-yellow-400', 'bg-gray-400'])
  })

  it('poor shows 1 red + 2 gray', () => {
    expect(barColors['poor']).toEqual(['bg-red-400', 'bg-gray-400', 'bg-gray-400'])
  })

  it('lost shows all gray', () => {
    expect(barColors['lost']).toEqual(['bg-gray-400', 'bg-gray-400', 'bg-gray-400'])
  })

  it('unknown fallback shows all gray', () => {
    expect(barColors['unknown']).toEqual(['bg-gray-400', 'bg-gray-400', 'bg-gray-400'])
  })

  it('undefined quality falls back to unknown pattern', () => {
    const quality = undefined
    const colors = barColors[quality] || barColors.unknown
    expect(colors).toEqual(['bg-gray-400', 'bg-gray-400', 'bg-gray-400'])
  })
})
