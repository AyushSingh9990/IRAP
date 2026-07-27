import { render, screen } from '@testing-library/react';
import { HelmetProvider } from 'react-helmet-async';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import HomePage from './HomePage.jsx';

vi.mock('../../api/articleApi.js', () => ({
  listPublishedArticles: vi.fn().mockResolvedValue({
    data: { articles: [] },
    meta: { page: 1, pages: 1, total: 0 },
  }),
}));

vi.mock('../../api/siteApi.js', () => ({
  getPublicContentPage: vi.fn().mockResolvedValue({
    data: { page: null },
  }),
}));

describe('HomePage', () => {
  it('renders the public homepage and registry search', async () => {
    render(
      <HelmetProvider>
        <MemoryRouter>
          <HomePage />
        </MemoryRouter>
      </HelmetProvider>,
    );

    expect(
      screen.getByRole('heading', {
        name: 'Professional recognition with transparent public status',
      }),
    ).toBeInTheDocument();

    expect(
      screen.getByRole('form', { name: 'Registry search' }),
    ).toBeInTheDocument();

    expect(
      await screen.findByText('No articles have been published'),
    ).toBeInTheDocument();
  });
});
