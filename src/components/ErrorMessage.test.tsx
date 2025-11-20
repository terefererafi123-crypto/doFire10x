import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ErrorMessage } from './ErrorMessage';

describe('ErrorMessage', () => {
  it('should render inline variant by default', () => {
    // Arrange & Act
    render(<ErrorMessage message="Test error message" />);

    // Assert
    const errorElement = screen.getByText('Test error message');
    expect(errorElement).toBeInTheDocument();
    expect(errorElement.tagName).toBe('P');
    expect(errorElement).toHaveAttribute('role', 'alert');
  });

  it('should render inline variant explicitly', () => {
    // Arrange & Act
    render(<ErrorMessage message="Test error message" variant="inline" />);

    // Assert
    const errorElement = screen.getByText('Test error message');
    expect(errorElement).toBeInTheDocument();
    expect(errorElement.tagName).toBe('P');
    expect(errorElement).toHaveClass('text-destructive');
  });

  it('should render banner variant', () => {
    // Arrange & Act
    render(<ErrorMessage message="Test error message" variant="banner" />);

    // Assert
    const errorElement = screen.getByText('Test error message');
    expect(errorElement).toBeInTheDocument();
    expect(errorElement.tagName).toBe('DIV');
    expect(errorElement).toHaveAttribute('role', 'alert');
    expect(errorElement).toHaveClass('bg-destructive/10');
  });

  it('should render AlertCircle icon in banner variant', () => {
    // Arrange & Act
    render(<ErrorMessage message="Test error message" variant="banner" />);

    // Assert
    // Sprawdzamy czy ikona jest renderowana (lucide-react renderuje jako SVG)
    const errorElement = screen.getByText('Test error message').parentElement;
    expect(errorElement).toBeInTheDocument();
    // Ikona powinna być w kontenerze
    const icon = errorElement?.querySelector('svg');
    expect(icon).toBeInTheDocument();
  });

  it('should not render icon in inline variant', () => {
    // Arrange & Act
    const { container } = render(<ErrorMessage message="Test error message" variant="inline" />);

    // Assert
    // W inline variant nie powinno być ikony
    const svg = container.querySelector('svg');
    expect(svg).not.toBeInTheDocument();
  });

  it('should apply custom className', () => {
    // Arrange & Act
    render(<ErrorMessage message="Test error message" className="custom-class" />);

    // Assert
    const errorElement = screen.getByText('Test error message');
    expect(errorElement).toHaveClass('custom-class');
  });

  it('should apply id attribute when provided', () => {
    // Arrange & Act
    render(<ErrorMessage message="Test error message" id="test-error-id" />);

    // Assert
    const errorElement = screen.getByText('Test error message');
    expect(errorElement).toHaveAttribute('id', 'test-error-id');
  });

  it('should have aria-live="polite" in inline variant', () => {
    // Arrange & Act
    render(<ErrorMessage message="Test error message" variant="inline" />);

    // Assert
    const errorElement = screen.getByText('Test error message');
    expect(errorElement).toHaveAttribute('aria-live', 'polite');
  });

  it('should have AlertCircle with aria-hidden in banner variant', () => {
    // Arrange & Act
    const { container } = render(<ErrorMessage message="Test error message" variant="banner" />);

    // Assert
    const icon = container.querySelector('svg');
    expect(icon).toBeInTheDocument();
    // Ikona powinna mieć aria-hidden="true"
    const iconParent = icon?.parentElement;
    expect(iconParent).toHaveAttribute('aria-hidden', 'true');
  });
});

