/* eslint-disable import/no-unresolved */
/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import LoginPage from './page';
import { AuthContext } from '../../context/AuthContext';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

describe('LoginPage interactions', () => {
  const renderPage = () => {
    const auth = { token: null, isAuthenticated: false, login: vi.fn(), logout: vi.fn() };
    render(
      <AuthContext.Provider value={auth}>
        <LoginPage />
      </AuthContext.Provider>
    );
  };

  it('toggles password visibility', async () => {
    renderPage();
    const passwordInput = screen.getByPlaceholderText('Password');
    const toggleButton = screen.getByLabelText(/password/i);
    expect(passwordInput).toHaveAttribute('type', 'password');
    await userEvent.click(toggleButton);
    expect(passwordInput).toHaveAttribute('type', 'text');
  });

  it('focuses email and password inputs', async () => {
    renderPage();
    const emailInput = screen.getByPlaceholderText('Email');
    await userEvent.click(emailInput);
    expect(emailInput).toHaveFocus();
    const passwordInput = screen.getByPlaceholderText('Password');
    await userEvent.click(passwordInput);
    expect(passwordInput).toHaveFocus();
  });

  it('renders input icons', () => {
    renderPage();
    expect(screen.getByTestId('email-icon')).toBeInTheDocument();
    expect(screen.getByTestId('password-icon')).toBeInTheDocument();
  });
});
