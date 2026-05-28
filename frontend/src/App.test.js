import { render, screen } from '@testing-library/react';
import App from './App';

test('renders FBOSS Client app', () => {
  render(<App />);
  const linkElement = screen.getByText(/FBOSS Client/i);
  expect(linkElement).toBeInTheDocument();
});
