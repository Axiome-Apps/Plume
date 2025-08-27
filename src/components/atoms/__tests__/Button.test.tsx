import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from '../Button';

describe('Button Component', () => {
  describe('rendering', () => {
    it('should render button with text', () => {
      render(<Button>Click me</Button>);
      
      const button = screen.getByRole('button', { name: /click me/i });
      expect(button).toBeInTheDocument();
    });

    it('should render button with custom className', () => {
      render(<Button className="custom-class">Test</Button>);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('custom-class');
    });

    it('should render primary variant by default', () => {
      render(<Button>Test</Button>);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-blue-600');
    });

    it('should render secondary variant correctly', () => {
      render(<Button variant="secondary">Test</Button>);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-gray-600');
    });

    it('should render danger variant correctly', () => {
      render(<Button variant="danger">Test</Button>);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-red-600');
    });
  });

  describe('sizes', () => {
    it('should render medium size by default', () => {
      render(<Button>Test</Button>);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('px-4', 'py-2', 'text-sm');
    });

    it('should render small size correctly', () => {
      render(<Button size="sm">Test</Button>);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('px-3', 'py-1.5', 'text-xs');
    });

    it('should render large size correctly', () => {
      render(<Button size="lg">Test</Button>);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('px-6', 'py-3', 'text-base');
    });
  });

  describe('states', () => {
    it('should be disabled when disabled prop is true', () => {
      render(<Button disabled>Test</Button>);
      
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
      expect(button).toHaveClass('opacity-50', 'cursor-not-allowed');
    });

    it('should show loading state', () => {
      render(<Button loading>Test</Button>);
      
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
      expect(button).toHaveClass('opacity-75');
      
      // Should contain loading spinner
      const spinner = button.querySelector('svg');
      expect(spinner).toBeInTheDocument();
    });

    it('should not show button text when loading', () => {
      render(<Button loading>Test</Button>);
      
      expect(screen.queryByText('Test')).not.toBeInTheDocument();
    });
  });

  describe('interactions', () => {
    it('should call onClick when clicked', () => {
      const handleClick = jest.fn();
      render(<Button onClick={handleClick}>Test</Button>);
      
      const button = screen.getByRole('button');
      fireEvent.click(button);
      
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('should not call onClick when disabled', () => {
      const handleClick = jest.fn();
      render(<Button disabled onClick={handleClick}>Test</Button>);
      
      const button = screen.getByRole('button');
      fireEvent.click(button);
      
      expect(handleClick).not.toHaveBeenCalled();
    });

    it('should not call onClick when loading', () => {
      const handleClick = jest.fn();
      render(<Button loading onClick={handleClick}>Test</Button>);
      
      const button = screen.getByRole('button');
      fireEvent.click(button);
      
      expect(handleClick).not.toHaveBeenCalled();
    });

    it('should have correct cursor styles on hover', () => {
      render(<Button>Test</Button>);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('cursor-pointer');
    });
  });

  describe('accessibility', () => {
    it('should support custom aria-label', () => {
      render(<Button aria-label="Custom label">Test</Button>);
      
      const button = screen.getByRole('button', { name: /custom label/i });
      expect(button).toBeInTheDocument();
    });

    it('should be focusable', () => {
      render(<Button>Test</Button>);
      
      const button = screen.getByRole('button');
      button.focus();
      
      expect(button).toHaveFocus();
    });

    it('should not be focusable when disabled', () => {
      render(<Button disabled>Test</Button>);
      
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('disabled');
    });

    it('should have correct ARIA attributes when loading', () => {
      render(<Button loading>Test</Button>);
      
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-disabled', 'true');
    });
  });

  describe('custom props', () => {
    it('should pass through additional props', () => {
      render(<Button data-testid="custom-button" title="Custom title">Test</Button>);
      
      const button = screen.getByTestId('custom-button');
      expect(button).toHaveAttribute('title', 'Custom title');
    });

    it('should support form submission', () => {
      render(<Button type="submit">Submit</Button>);
      
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('type', 'submit');
    });

    it('should support ref forwarding', () => {
      const ref = { current: null };
      render(<Button ref={ref}>Test</Button>);
      
      expect(ref.current).toBeInstanceOf(HTMLButtonElement);
    });
  });

  describe('edge cases', () => {
    it('should handle empty children gracefully', () => {
      render(<Button></Button>);
      
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
      expect(button).toBeEmptyDOMElement();
    });

    it('should handle multiple children', () => {
      render(
        <Button>
          <span>Icon</span>
          Text
        </Button>
      );
      
      const button = screen.getByRole('button');
      expect(button).toHaveTextContent('IconText');
    });

    it('should merge className props correctly', () => {
      render(<Button className="custom-1 custom-2">Test</Button>);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('custom-1', 'custom-2');
      // Should also have default classes
      expect(button).toHaveClass('bg-blue-600');
    });
  });
});