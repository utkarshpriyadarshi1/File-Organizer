import { render, screen } from '@testing-library/react';
import App from './App';

test('renders File Organizer app', () => {
  render(<App />);
  const linkElement = screen.getByText(/file organizer/i);
  expect(linkElement).toBeInTheDocument();
});
