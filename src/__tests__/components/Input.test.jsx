import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Input from '../../components/ui/Input';
import { User } from 'lucide-react';

describe('Input', () => {
  it('renders with a label', () => {
    render(<Input label="Email" />);
    expect(screen.getByText('Email')).toBeInTheDocument();
  });

  it('renders without a label', () => {
    const { container } = render(<Input placeholder="Enter text" />);
    expect(container.querySelector('label')).toBeNull();
  });

  it('renders a placeholder', () => {
    render(<Input placeholder="Type here" />);
    expect(screen.getByPlaceholderText('Type here')).toBeInTheDocument();
  });

  it('renders with an icon', () => {
    const { container } = render(<Input icon={User} />);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('accepts user input', async () => {
    const user = userEvent.setup();
    render(<Input placeholder="Name" />);
    const input = screen.getByPlaceholderText('Name');
    await user.type(input, 'John');
    expect(input).toHaveValue('John');
  });
});
