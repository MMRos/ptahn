import { render, screen } from '@testing-library/react';
import App from './App';

test('renders Ptah logo/brand', () => {
  render(<App />);
  const logoElement = screen.getByText(/Ptah/i);
  expect(logoElement).toBeInTheDocument();
});

