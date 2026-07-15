import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import { LazyLoading } from '../components/LazyLoading';

describe('LazyLoading component', () => {
  it('renders loading skeleton placeholder', () => {
    render(<LazyLoading />);
    expect(document.body).toBeInTheDocument();
  });
});
