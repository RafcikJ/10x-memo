/**
 * Example Component Test
 * This demonstrates testing actual project components
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

// Example: Testing Button component from your project
describe('Button Component', () => {
  // Import actual Button component
  // import { Button } from '@/components/ui/button';
  
  // For now, using a mock component
  const Button = ({ children, onClick, variant = 'default' }: any) => (
    <button onClick={onClick} className={`btn-${variant}`}>
      {children}
    </button>
  );

  it('should render with text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('should handle click events', async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();
    
    render(<Button onClick={handleClick}>Click me</Button>);
    
    await user.click(screen.getByText('Click me'));
    
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('should apply variant classes', () => {
    render(<Button variant="primary">Click me</Button>);
    const button = screen.getByText('Click me');
    expect(button).toHaveClass('btn-primary');
  });

  it('should be accessible', () => {
    render(<Button>Accessible Button</Button>);
    const button = screen.getByRole('button', { name: 'Accessible Button' });
    expect(button).toBeInTheDocument();
  });
});

// Example: Testing form components
describe('Form Components', () => {
  const TestForm = () => {
    const [value, setValue] = React.useState('');
    
    return (
      <form onSubmit={(e) => e.preventDefault()}>
        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Enter email"
        />
        <button type="submit">Submit</button>
      </form>
    );
  };

  it('should handle input changes', async () => {
    const user = userEvent.setup();
    render(<TestForm />);
    
    const input = screen.getByLabelText('Email');
    await user.type(input, 'test@example.com');
    
    expect(input).toHaveValue('test@example.com');
  });

  it('should submit form', async () => {
    const user = userEvent.setup();
    render(<TestForm />);
    
    const input = screen.getByLabelText('Email');
    const button = screen.getByRole('button', { name: 'Submit' });
    
    await user.type(input, 'test@example.com');
    await user.click(button);
    
    // Add assertions for form submission
    expect(input).toHaveValue('test@example.com');
  });
});

// Example: Testing component with props
describe('Component with Props', () => {
  interface CardProps {
    title: string;
    description?: string;
    onDelete?: () => void;
  }

  const Card = ({ title, description, onDelete }: CardProps) => (
    <div className="card">
      <h3>{title}</h3>
      {description && <p>{description}</p>}
      {onDelete && (
        <button onClick={onDelete} aria-label="Delete">
          Delete
        </button>
      )}
    </div>
  );

  it('should render with required props', () => {
    render(<Card title="Test Card" />);
    expect(screen.getByText('Test Card')).toBeInTheDocument();
  });

  it('should render optional description', () => {
    render(<Card title="Test Card" description="Test description" />);
    expect(screen.getByText('Test description')).toBeInTheDocument();
  });

  it('should not render description when not provided', () => {
    render(<Card title="Test Card" />);
    expect(screen.queryByText('Test description')).not.toBeInTheDocument();
  });

  it('should call onDelete when delete button clicked', async () => {
    const handleDelete = vi.fn();
    const user = userEvent.setup();
    
    render(<Card title="Test Card" onDelete={handleDelete} />);
    
    const deleteButton = screen.getByLabelText('Delete');
    await user.click(deleteButton);
    
    expect(handleDelete).toHaveBeenCalledTimes(1);
  });
});

// Example: Testing async components
describe('Async Component', () => {
  const AsyncDataComponent = () => {
    const [data, setData] = React.useState<string | null>(null);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState<string | null>(null);

    React.useEffect(() => {
      fetch('/api/data')
        .then((res) => res.json())
        .then((json) => {
          setData(json.message);
          setLoading(false);
        })
        .catch((err) => {
          setError(err.message);
          setLoading(false);
        });
    }, []);

    if (loading) return <div>Loading...</div>;
    if (error) return <div>Error: {error}</div>;
    return <div>Data: {data}</div>;
  };

  it('should show loading state', () => {
    render(<AsyncDataComponent />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('should load and display data', async () => {
    // Mock fetch
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ message: 'Hello World' }),
    });

    render(<AsyncDataComponent />);
    
    expect(screen.getByText('Loading...')).toBeInTheDocument();
    
    const dataElement = await screen.findByText('Data: Hello World');
    expect(dataElement).toBeInTheDocument();
  });

  it('should handle errors', async () => {
    // Mock fetch error
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

    render(<AsyncDataComponent />);
    
    const errorElement = await screen.findByText(/Error: Network error/);
    expect(errorElement).toBeInTheDocument();
  });
});
