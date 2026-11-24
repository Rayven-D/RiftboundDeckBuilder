import { tileOwnership } from './ownership';

describe('tileOwnership', () => {
  it.each([
    [3, 3, 'full', 1, '3 of 3 available'],
    [1, 3, 'partial', 1 / 3, '1 of 3 available'],
    [2, 3, 'partial', 2 / 3, '2 of 3 available'],
    [1, 2, 'partial', 0.5, '1 of 2 available'],
    [0, 2, 'none', 0, '0 of 2 available'],
  ] as const)('%i of %i is %s', (allocated, required, state, fill, label) => {
    const o = tileOwnership(allocated, required);
    expect(o.state).toBe(state);
    expect(o.fill).toBe(fill);
    expect(o.label).toBe(label);
  });

  it('caps copies above required on the tile face', () => {
    expect(tileOwnership(5, 3)).toMatchObject({
      allocated: 3,
      state: 'full',
      label: '3 of 3 available',
    });
  });

  it('treats negative counts as none', () => {
    expect(tileOwnership(-1, 2).state).toBe('none');
  });

  it('rejects a non-positive requirement', () => {
    expect(() => tileOwnership(0, 0)).toThrow(RangeError);
  });
});
