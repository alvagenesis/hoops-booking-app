import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AuthPage from '../../pages/AuthPage';
import { AuthProvider } from '../../context/AuthContext';
import { BrowserRouter } from 'react-router-dom';

// Mock Supabase to null (demo mode)
vi.mock('../../lib/supabase', () => ({ supabase: null }));

function renderAuthPage() {
  return render(
    <BrowserRouter>
      <AuthProvider>
        <AuthPage />
      </AuthProvider>
    </BrowserRouter>
  );
}

describe('AuthPage', () => {
  it('renders registration form by default', () => {
    renderAuthPage();
    expect(screen.getByText('Create an Account')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('John')).toBeInTheDocument(); // First Name
    expect(screen.getByPlaceholderText('Doe')).toBeInTheDocument(); // Last Name
  });

  it('switches to login form', async () => {
    const user = userEvent.setup();
    renderAuthPage();
    await user.click(screen.getByText('Log in'));
    expect(screen.getByText('Welcome Back')).toBeInTheDocument();
    expect(screen.queryByPlaceholderText('John')).not.toBeInTheDocument();
  });

  it('switches back to registration form', async () => {
    const user = userEvent.setup();
    renderAuthPage();
    await user.click(screen.getByText('Log in'));
    await user.click(screen.getByText('Sign up'));
    expect(screen.getByText('Create an Account')).toBeInTheDocument();
  });

  it('shows email and password fields in both modes', async () => {
    const user = userEvent.setup();
    renderAuthPage();
    expect(screen.getByPlaceholderText('john@example.com')).toBeInTheDocument();

    await user.click(screen.getByText('Log in'));
    expect(screen.getByPlaceholderText('john@example.com')).toBeInTheDocument();
  });

  it('shows Google and Facebook social login buttons', () => {
    renderAuthPage();
    expect(screen.getByText('Google')).toBeInTheDocument();
    expect(screen.getByText('Facebook')).toBeInTheDocument();
  });
});
