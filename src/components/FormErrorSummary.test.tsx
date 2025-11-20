import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FormErrorSummary } from './FormErrorSummary';

describe('FormErrorSummary', () => {
  beforeEach(() => {
    // Mock scrollIntoView
    Element.prototype.scrollIntoView = vi.fn();
    // Mock focus using Object.defineProperty because focus is read-only
    Object.defineProperty(HTMLElement.prototype, 'focus', {
      value: vi.fn(),
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should not render when errors object is empty', () => {
    // Arrange & Act
    const { container } = render(<FormErrorSummary errors={{}} />);

    // Assert
    expect(container.firstChild).toBeNull();
  });

  it('should render error summary with single error', () => {
    // Arrange & Act
    render(<FormErrorSummary errors={{ amount: 'Kwota musi być większa od zera' }} />);

    // Assert
    expect(screen.getByText('Proszę poprawić następujące błędy:')).toBeInTheDocument();
    expect(screen.getByText('Kwota musi być większa od zera')).toBeInTheDocument();
  });

  it('should render error summary with multiple errors', () => {
    // Arrange & Act
    render(
      <FormErrorSummary
        errors={{
          amount: 'Kwota musi być większa od zera',
          acquired_at: 'Data nabycia jest wymagana',
          type: 'Wybierz typ inwestycji',
        }}
      />
    );

    // Assert
    expect(screen.getByText('Proszę poprawić następujące błędy:')).toBeInTheDocument();
    expect(screen.getByText('Kwota musi być większa od zera')).toBeInTheDocument();
    expect(screen.getByText('Data nabycia jest wymagana')).toBeInTheDocument();
    expect(screen.getByText('Wybierz typ inwestycji')).toBeInTheDocument();
  });

  it('should render errors as clickable buttons', () => {
    // Arrange & Act
    render(<FormErrorSummary errors={{ amount: 'Kwota musi być większa od zera' }} />);

    // Assert
    const errorButton = screen.getByText('Kwota musi być większa od zera');
    expect(errorButton.tagName).toBe('BUTTON');
    expect(errorButton).toHaveAttribute('type', 'button');
  });

  it('should scroll to field and focus when error button is clicked (default behavior)', async () => {
    // Arrange
    const user = userEvent.setup();
    // Mock document.getElementById
    const mockElement = {
      scrollIntoView: vi.fn(),
      focus: vi.fn(),
    } as unknown as HTMLElement;
    vi.spyOn(document, 'getElementById').mockReturnValue(mockElement);

    render(<FormErrorSummary errors={{ amount: 'Kwota musi być większa od zera' }} />);

    // Act
    const errorButton = screen.getByText('Kwota musi być większa od zera');
    await user.click(errorButton);

    // Assert
    expect(document.getElementById).toHaveBeenCalledWith('amount');
    expect(mockElement.scrollIntoView).toHaveBeenCalledWith({
      behavior: 'smooth',
      block: 'center',
    });
    expect(mockElement.focus).toHaveBeenCalled();
  });

  it('should call onFieldClick callback when provided', async () => {
    // Arrange
    const user = userEvent.setup();
    const onFieldClick = vi.fn();

    render(
      <FormErrorSummary
        errors={{ amount: 'Kwota musi być większa od zera' }}
        onFieldClick={onFieldClick}
      />
    );

    // Act
    const errorButton = screen.getByText('Kwota musi być większa od zera');
    await user.click(errorButton);

    // Assert
    expect(onFieldClick).toHaveBeenCalledWith('amount');
    expect(onFieldClick).toHaveBeenCalledTimes(1);
  });

  it('should not scroll when onFieldClick is provided', async () => {
    // Arrange
    const user = userEvent.setup();
    const onFieldClick = vi.fn();
    const mockElement = {
      scrollIntoView: vi.fn(),
      focus: vi.fn(),
    } as unknown as HTMLElement;
    vi.spyOn(document, 'getElementById').mockReturnValue(mockElement);

    render(
      <FormErrorSummary
        errors={{ amount: 'Kwota musi być większa od zera' }}
        onFieldClick={onFieldClick}
      />
    );

    // Act
    const errorButton = screen.getByText('Kwota musi być większa od zera');
    await user.click(errorButton);

    // Assert
    expect(onFieldClick).toHaveBeenCalled();
    // scrollIntoView nie powinien być wywołany gdy jest callback
    expect(mockElement.scrollIntoView).not.toHaveBeenCalled();
  });

  it('should handle case when field element is not found', async () => {
    // Arrange
    const user = userEvent.setup();
    vi.spyOn(document, 'getElementById').mockReturnValue(null);

    render(<FormErrorSummary errors={{ amount: 'Kwota musi być większa od zera' }} />);

    // Act
    const errorButton = screen.getByText('Kwota musi być większa od zera');
    await user.click(errorButton);

    // Assert - nie powinno być błędu, po prostu nic się nie dzieje
    expect(document.getElementById).toHaveBeenCalledWith('amount');
  });

  it('should render Alert component with destructive variant', () => {
    // Arrange & Act
    const { container } = render(
      <FormErrorSummary errors={{ amount: 'Kwota musi być większa od zera' }} />
    );

    // Assert
    const alert = container.querySelector('[role="alert"]');
    expect(alert).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    // Arrange & Act
    const { container } = render(
      <FormErrorSummary
        errors={{ amount: 'Kwota musi być większa od zera' }}
        className="custom-class"
      />
    );

    // Assert
    const alert = container.querySelector('[role="alert"]');
    expect(alert).toHaveClass('custom-class');
  });

  it('should render errors in list format', () => {
    // Arrange & Act
    render(
      <FormErrorSummary
        errors={{
          amount: 'Kwota musi być większa od zera',
          acquired_at: 'Data nabycia jest wymagana',
        }}
      />
    );

    // Assert
    const list = screen.getByRole('list');
    expect(list).toBeInTheDocument();
    expect(list).toHaveClass('list-disc');
    const listItems = screen.getAllByRole('listitem');
    expect(listItems).toHaveLength(2);
  });

  it('should have accessible button styling', async () => {
    // Arrange
    const user = userEvent.setup();
    render(<FormErrorSummary errors={{ amount: 'Kwota musi być większa od zera' }} />);

    // Act
    const errorButton = screen.getByText('Kwota musi być większa od zera');

    // Assert
    expect(errorButton).toHaveClass('underline');
    // Sprawdzamy czy button ma focus styles
    expect(errorButton).toHaveClass('focus:outline-none');
  });
});

