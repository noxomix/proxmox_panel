import { describe, expect, test } from 'bun:test';
import { generateId, generateRandomId } from '../utils/uuid.js';

describe('UUID Utils', () => {
  test('generateId should return UUID v7', () => {
    const id = generateId();
    
    // UUID v7 format: xxxxxxxx-xxxx-7xxx-xxxx-xxxxxxxxxxxx
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  });

  test('generateRandomId should return UUID v4', () => {
    const id = generateRandomId();
    
    // UUID v4 format: xxxxxxxx-xxxx-4xxx-xxxx-xxxxxxxxxxxx
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  });

  test('UUID v7 should be time-ordered', () => {
    const id1 = generateId();
    const id2 = generateId();
    
    // UUID v7 is lexicographically sortable by time
    expect(id1 < id2).toBe(true);
  });
});