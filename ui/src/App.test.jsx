import { render, screen } from '@testing-library/react';
import App from './App';

test('renders File Organizer app', () => {
  render(<App />);
  const linkElements = screen.getAllByText(/file organizer/i);
  expect(linkElements.length).toBeGreaterThan(0);
  expect(linkElements[0]).toBeInTheDocument();
});
