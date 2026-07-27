import { render, screen } from '@testing-library/react';
import { HelmetProvider } from 'react-helmet-async';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import FaqPage from './FaqPage.jsx';

describe('FaqPage', () => {
  it('renders controlled workflow answers', () => {
    render(
      <HelmetProvider>
        <MemoryRouter>
          <FaqPage />
        </MemoryRouter>
      </HelmetProvider>,
    );

    expect(
      screen.getByRole('heading', {
        name: 'Clear answers before you create an applicant account',
      }),
    ).toBeInTheDocument();

    expect(
      screen.getByRole('button', {
        name: 'Does creating an account make me an approved member or accredited provider?',
      }),
    ).toHaveAttribute('aria-expanded', 'true');
  });
});
