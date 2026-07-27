import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import RouteAnnouncer from './RouteAnnouncer.jsx';

describe('RouteAnnouncer', () => {
  it('announces and focuses the primary page heading', async () => {
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      callback();
      return 1;
    });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});

    render(
      <MemoryRouter initialEntries={['/directory/members']}>
        <main><h1>Professional members</h1></main>
        <RouteAnnouncer />
      </MemoryRouter>,
    );

    expect(await screen.findByText('Professional members page loaded')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Professional members' })).toHaveFocus();
  });
});
