import { render, screen } from '@testing-library/react';
import App from './App';

test('renders e-abhilekh app', () => {
  render(<App />);
  const linkElement = screen.getByText(/e-abhilekh/i);
  expect(linkElement).toBeInTheDocument();
});
