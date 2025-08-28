import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import Button from '../Button';

describe('Button', () => {
  it('renders button with children', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button').textContent).toBe('Click me');
  });

  it('handles click events', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click me</Button>);

    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('applies variant styles', () => {
    render(<Button variant="secondary">Secondary</Button>);
    const button = screen.getByRole('button');
    expect(button.classList.contains('border-slate-300')).toBe(true);
  });

  it('applies size styles', () => {
    render(<Button size="lg">Large</Button>);
    const button = screen.getByRole('button');
    expect(button.classList.contains('px-6')).toBe(true);
    expect(button.classList.contains('py-3')).toBe(true);
    expect(button.classList.contains('text-lg')).toBe(true);
  });

  it('is disabled when disabled prop is true', () => {
    render(<Button disabled>Disabled</Button>);
    const button = screen.getByRole('button');
    expect((button as HTMLButtonElement).disabled).toBe(true);
  });

  it('applies custom className', () => {
    render(<Button className="custom-class">Custom</Button>);
    const button = screen.getByRole('button');
    expect(button.classList.contains('custom-class')).toBe(true);
  });
});
