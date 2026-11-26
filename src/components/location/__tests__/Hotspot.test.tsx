import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Hotspot } from '../Hotspot';
import { DEFAULT_HOTSPOT_RADIUS } from '../../../constants/config';
import type { Hotspot as HotspotType, Sample } from '../../../types';

const sample = { id: 's1', name: 'Kat', audioUrl: '/a.mp3', duration: 2, icon: 'Cat', color: '#94A3B8' } as unknown as Sample;

function renderWith(radius?: number) {
  const hotspot: HotspotType = { id: 'h1', x: 50, y: 50, sampleId: 's1', visualHint: 'pulse', ...(radius !== undefined ? { radius } : {}) };
  render(<Hotspot hotspot={hotspot} sample={sample} disabled={false} onCollect={() => {}} onHoverStart={() => {}} onHoverEnd={() => {}} />);
  return screen.getByRole('button').style.width;
}

describe('Hotspot-grootte', () => {
  it('zonder radius: de standaardmaat', () => {
    expect(renderWith()).toBe(`${DEFAULT_HOTSPOT_RADIUS * 2}%`);
  });

  it('een kleinere radius maakt het rondje kleiner (drukke platen)', () => {
    expect(renderWith(2.75)).toBe('5.5%');
  });

  it('een grotere radius wordt genegeerd (oude manifesten, bv. winterspelen radius 8)', () => {
    expect(renderWith(8)).toBe(`${DEFAULT_HOTSPOT_RADIUS * 2}%`);
  });
});
