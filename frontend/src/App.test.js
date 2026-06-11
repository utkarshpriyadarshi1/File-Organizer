import { render, screen } from '@testing-library/react';
import App from './App';

test('renders e-Abhilekh app', () => {
  render(<App />);
  const linkElement = screen.getByText(/e-Abhilekh/i);
  expect(linkElement).toBeInTheDocument();
});
