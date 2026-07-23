import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import StatusBadge from '../components/StatusBadge';

describe('StatusBadge', () => {
  it('renders status text replacing underscores', () => {
    render(<StatusBadge status="checked_in" />);
    expect(screen.getByText('checked in')).toBeInTheDocument();
  });

  it('renders simple status text', () => {
    render(<StatusBadge status="available" />);
    expect(screen.getByText('available')).toBeInTheDocument();
  });
});
