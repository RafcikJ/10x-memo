/**
 * Example Unit Test
 * This file demonstrates how to write unit tests with Vitest and Testing Library
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Example: Testing a simple component
describe('Example Unit Tests', () => {
  // Basic test structure
  it('should run a basic test', () => {
    expect(true).toBe(true);
  });

  // Testing numbers and strings
  it('should perform basic assertions', () => {
    expect(2 + 2).toBe(4);
    expect('hello').toContain('ell');
    expect([1, 2, 3]).toHaveLength(3);
    expect({ name: 'Test' }).toHaveProperty('name');
  });

  // Testing async code
  it('should handle async operations', async () => {
    const asyncFunction = async () => {
      return new Promise((resolve) => {
        setTimeout(() => resolve('done'), 100);
      });
    };

    const result = await asyncFunction();
    expect(result).toBe('done');
  });

  // Testing with mocks
  it('should work with mock functions', () => {
    const mockFn = vi.fn((x: number) => x * 2);
    
    const result = mockFn(5);
    
    expect(result).toBe(10);
    expect(mockFn).toHaveBeenCalledWith(5);
    expect(mockFn).toHaveBeenCalledTimes(1);
  });
});

// Example: Testing React components
describe('React Component Tests', () => {
  // Simple component for testing
  const TestButton = ({ onClick, children }: { onClick: () => void; children: React.ReactNode }) => {
    return (
      <button onClick={onClick} type="button">
        {children}
      </button>
    );
  };

  it('should render component', () => {
    const mockClick = vi.fn();
    render(<TestButton onClick={mockClick}>Click me</TestButton>);
    
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('should handle click events', async () => {
    const mockClick = vi.fn();
    render(<TestButton onClick={mockClick}>Click me</TestButton>);
    
    const button = screen.getByText('Click me');
    await userEvent.click(button);
    
    expect(mockClick).toHaveBeenCalledTimes(1);
  });

  it('should handle multiple interactions', async () => {
    const user = userEvent.setup();
    const mockClick = vi.fn();
    
    render(<TestButton onClick={mockClick}>Click me</TestButton>);
    
    const button = screen.getByRole('button');
    
    await user.click(button);
    await user.click(button);
    
    expect(mockClick).toHaveBeenCalledTimes(2);
  });
});

// Example: Testing with waitFor
describe('Async Component Tests', () => {
  const AsyncComponent = () => {
    const [loading, setLoading] = React.useState(true);
    const [data, setData] = React.useState('');

    React.useEffect(() => {
      setTimeout(() => {
        setData('Loaded!');
        setLoading(false);
      }, 100);
    }, []);

    if (loading) return <div>Loading...</div>;
    return <div>{data}</div>;
  };

  it('should handle async rendering', async () => {
    render(<AsyncComponent />);
    
    expect(screen.getByText('Loading...')).toBeInTheDocument();
    
    await waitFor(() => {
      expect(screen.getByText('Loaded!')).toBeInTheDocument();
    });
  });
});

// Import React for JSX
import React from 'react';
