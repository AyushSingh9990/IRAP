import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ErrorBoundary from './ErrorBoundary.jsx';

function BrokenComponent() {
  throw new Error('test render failure');
}

let consoleError;
let preventWindowError;

beforeEach(() => {
  consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
  preventWindowError = (event) => event.preventDefault();
  window.addEventListener('error', preventWindowError);
});

afterEach(() => {
  window.removeEventListener('error', preventWindowError);
  consoleError.mockRestore();
});

describe('ErrorBoundary', () => {
  it('renders a safe recovery screen when a child fails', () => {
    render(
      <ErrorBoundary>
        <BrokenComponent />
      </ErrorBoundary>,
    );

    expect(
      screen.getByRole('heading', { name: 'Something went wrong' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Reload application' }),
    ).toBeInTheDocument();
  });
});
