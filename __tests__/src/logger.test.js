import { logger } from '../../src/logger.js';
import axios from 'axios';

// Mock axios
jest.mock('axios');

describe('logger', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('log function', () => {
    it('should log info messages to console', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      logger.info('Test info message');
      expect(consoleSpy).toHaveBeenCalledWith('[INFO] Test info message');
      consoleSpy.mockRestore();
    });

    it('should log warn messages to console', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      logger.warn('Test warn message');
      expect(consoleSpy).toHaveBeenCalledWith('[WARN] Test warn message');
      consoleSpy.mockRestore();
    });

    it('should log error messages to console with error object', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const testError = new Error('Test error');
      logger.error('Test error message', testError);
      expect(consoleSpy).toHaveBeenCalledWith('[ERROR] Test error message');
      expect(consoleSpy).toHaveBeenCalledWith(testError);
      consoleSpy.mockRestore();
    });

    it('should log debug messages to console', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      logger.debug('Test debug message');
      expect(consoleSpy).toHaveBeenCalledWith('[DEBUG] Test debug message');
      consoleSpy.mockRestore();
    });

    it('should not send logs to Stoat in test environment', () => {
      process.env.NODE_ENV = 'test';
      logger.info('Test message');
      expect(axios.post).not.toHaveBeenCalled();
    });
  });
});