import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import FileUpload from '../FileUpload';

// Mock des fonctions console pour éviter les logs pendant les tests
const originalConsole = globalThis.console;
beforeAll(() => {
  globalThis.console = {
    ...originalConsole,
    log: jest.fn(),
    error: jest.fn(),
  };
});

afterAll(() => {
  globalThis.console = originalConsole;
});

describe('FileUpload', () => {
  const mockOnFilesSelected = jest.fn();

  beforeEach(() => {
    mockOnFilesSelected.mockClear();
  });

  it('renders file upload button', () => {
    render(<FileUpload onFilesSelected={mockOnFilesSelected} />);
    expect(screen.getByText('Ou cliquez pour parcourir')).toBeInTheDocument();
  });

  it('accepts custom accept prop', () => {
    render(
      <FileUpload 
        onFilesSelected={mockOnFilesSelected} 
        accept=".jpg,.png" 
      />
    );
    
    const input = screen.getByRole('button').parentElement?.querySelector('input');
    expect(input).toHaveAttribute('accept', '.jpg,.png');
  });

  it('has default accept for images', () => {
    render(<FileUpload onFilesSelected={mockOnFilesSelected} />);
    const input = screen.getByRole('button').parentElement?.querySelector('input');
    expect(input).toHaveAttribute('accept', 'image/*');
  });

  it('calls onFilesSelected when files are selected', () => {
    render(<FileUpload onFilesSelected={mockOnFilesSelected} />);
    
    const input = screen.getByRole('button').parentElement?.querySelector('input') as HTMLInputElement;
    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    
    Object.defineProperty(input, 'files', {
      value: [file],
      writable: false,
    });
    
    fireEvent.change(input);
    expect(mockOnFilesSelected).toHaveBeenCalledWith([file]);
  });

  it('handles empty file selection', () => {
    render(<FileUpload onFilesSelected={mockOnFilesSelected} />);
    
    const input = screen.getByRole('button').parentElement?.querySelector('input') as HTMLInputElement;
    
    Object.defineProperty(input, 'files', {
      value: null,
      writable: false,
    });
    
    fireEvent.change(input);
    expect(mockOnFilesSelected).not.toHaveBeenCalled();
  });
});