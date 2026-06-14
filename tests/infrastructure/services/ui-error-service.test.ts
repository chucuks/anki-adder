
import { describe, it, expect, vi } from 'vitest';
import { UIErrorService, UIError } from '../../../src/infrastructure/services/ui-error-service';

describe('UIErrorService', () => {
  it('should notify subscribers when an error is handled', () => {
    const service = new UIErrorService();
    const listener = vi.fn();
    service.subscribe(listener);

    const testError = new Error('Test message');
    service.handleError(testError);

    expect(listener).toHaveBeenCalled();
    const reportedError: UIError = listener.mock.calls[0][0];
    expect(reportedError.message).toBe('Test message');
    expect(reportedError.severity).toBe('error');
    expect(reportedError.originalError).toBe(testError);
  });

  it('should use provided message instead of error message', () => {
    const service = new UIErrorService();
    const listener = vi.fn();
    service.subscribe(listener);

    service.handleError(new Error('Ignore me'), 'Use this');

    expect(listener.mock.calls[0][0].message).toBe('Use this');
  });

  it('should handle non-Error objects', () => {
    const service = new UIErrorService();
    const listener = vi.fn();
    service.subscribe(listener);

    service.handleError('string error');
    expect(listener.mock.calls[0][0].message).toBe('string error');
  });

  it('should allow multiple subscribers', () => {
    const service = new UIErrorService();
    const l1 = vi.fn();
    const l2 = vi.fn();
    service.subscribe(l1);
    service.subscribe(l2);

    service.handleError('err');
    expect(l1).toHaveBeenCalled();
    expect(l2).toHaveBeenCalled();
  });

  it('should allow unsubscribing', () => {
    const service = new UIErrorService();
    const listener = vi.fn();
    const unsubscribe = service.subscribe(listener);

    unsubscribe();
    service.handleError('err');

    expect(listener).not.toHaveBeenCalled();
  });

  it('should support different severities', () => {
    const service = new UIErrorService();
    const listener = vi.fn();
    service.subscribe(listener);

    service.handleError('warn', undefined, 'warning');
    expect(listener.mock.calls[0][0].severity).toBe('warning');
  });
});
