/**
 * Example Service Unit Test
 * This demonstrates testing service layer logic
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Example service to test
class ExampleService {
  async fetchData(id: string): Promise<{ id: string; data: string }> {
    const response = await fetch(`/api/data/${id}`);
    if (!response.ok) {
      throw new Error('Failed to fetch data');
    }
    return response.json();
  }

  processData(input: string): string {
    return input.toUpperCase();
  }

  validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}

describe('ExampleService', () => {
  let service: ExampleService;

  beforeEach(() => {
    service = new ExampleService();
    vi.clearAllMocks();
  });

  describe('fetchData', () => {
    it('should fetch data successfully', async () => {
      // Mock fetch
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ id: '123', data: 'test data' }),
      });

      const result = await service.fetchData('123');

      expect(result).toEqual({ id: '123', data: 'test data' });
      expect(fetch).toHaveBeenCalledWith('/api/data/123');
    });

    it('should throw error on failed fetch', async () => {
      // Mock failed fetch
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
      });

      await expect(service.fetchData('123')).rejects.toThrow('Failed to fetch data');
    });

    it('should handle network errors', async () => {
      // Mock network error
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      await expect(service.fetchData('123')).rejects.toThrow('Network error');
    });
  });

  describe('processData', () => {
    it('should convert string to uppercase', () => {
      const result = service.processData('hello');
      expect(result).toBe('HELLO');
    });

    it('should handle empty string', () => {
      const result = service.processData('');
      expect(result).toBe('');
    });

    it('should handle already uppercase string', () => {
      const result = service.processData('HELLO');
      expect(result).toBe('HELLO');
    });
  });

  describe('validateEmail', () => {
    it('should validate correct email', () => {
      expect(service.validateEmail('test@example.com')).toBe(true);
      expect(service.validateEmail('user.name@domain.co.uk')).toBe(true);
    });

    it('should reject invalid email', () => {
      expect(service.validateEmail('invalid')).toBe(false);
      expect(service.validateEmail('test@')).toBe(false);
      expect(service.validateEmail('@example.com')).toBe(false);
      expect(service.validateEmail('test@example')).toBe(false);
    });

    it('should handle empty string', () => {
      expect(service.validateEmail('')).toBe(false);
    });
  });
});
