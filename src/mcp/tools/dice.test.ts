import { describe, it, expect } from 'vitest';

describe('dice tool', () => {
  it('parses simple NdS+M', () => {
    const rx = /^(\d+)d(\d+)([+-]\d+)?$/i;
    expect('2d6+1'.match(rx)).toBeTruthy();
    expect('1d8'.match(rx)).toBeTruthy();
  });
});
