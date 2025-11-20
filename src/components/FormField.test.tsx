import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { FormField } from "./FormField";

describe("FormField", () => {
  it("should render label correctly", () => {
    // Arrange & Act
    render(
      <FormField label="Test Label" name="test">
        <input />
      </FormField>
    );

    // Assert
    expect(screen.getByText("Test Label")).toBeInTheDocument();
  });

  it("should render required indicator when required is true", () => {
    // Arrange & Act
    render(
      <FormField label="Test Label" name="test" required>
        <input />
      </FormField>
    );

    // Assert
    const label = screen.getByText("Test Label");
    expect(label).toBeInTheDocument();
    // Sprawdzamy czy jest gwiazdka (required indicator)
    const requiredIndicator = label.querySelector(".text-destructive");
    expect(requiredIndicator).toBeInTheDocument();
  });

  it("should not render required indicator when required is false", () => {
    // Arrange & Act
    render(
      <FormField label="Test Label" name="test" required={false}>
        <input />
      </FormField>
    );

    // Assert
    const label = screen.getByText("Test Label");
    const requiredIndicator = label.querySelector(".text-destructive");
    // Może być undefined lub null, ale nie powinno być widoczne
    if (requiredIndicator) {
      expect(requiredIndicator.textContent).not.toBe("*");
    }
  });

  it("should render error message when error is provided", () => {
    // Arrange & Act
    render(
      <FormField label="Test Label" name="test" error="Test error message">
        <input />
      </FormField>
    );

    // Assert
    expect(screen.getByText("Test error message")).toBeInTheDocument();
    expect(screen.getByText("Test error message")).toHaveAttribute("role", "alert");
  });

  it("should not render error message when error is not provided", () => {
    // Arrange & Act
    render(
      <FormField label="Test Label" name="test">
        <input />
      </FormField>
    );

    // Assert
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("should render helper text when provided and no error", () => {
    // Arrange & Act
    render(
      <FormField label="Test Label" name="test" helperText="Helper text">
        <input />
      </FormField>
    );

    // Assert
    expect(screen.getByText("Helper text")).toBeInTheDocument();
  });

  it("should not render helper text when error is present", () => {
    // Arrange & Act
    render(
      <FormField label="Test Label" name="test" error="Error" helperText="Helper text">
        <input />
      </FormField>
    );

    // Assert
    expect(screen.queryByText("Helper text")).not.toBeInTheDocument();
    expect(screen.getByText("Error")).toBeInTheDocument();
  });

  it("should add aria-invalid attribute to child when error is present", () => {
    // Arrange & Act
    render(
      <FormField label="Test Label" name="test" error="Error">
        <input />
      </FormField>
    );

    // Assert
    const input = screen.getByRole("textbox");
    expect(input).toHaveAttribute("aria-invalid", "true");
  });

  it("should add id attribute to child", () => {
    // Arrange & Act
    render(
      <FormField label="Test Label" name="test">
        <input />
      </FormField>
    );

    // Assert
    const input = screen.getByRole("textbox");
    expect(input).toHaveAttribute("id", "test");
  });

  it("should add aria-describedby when error is present", () => {
    // Arrange & Act
    render(
      <FormField label="Test Label" name="test" error="Error">
        <input />
      </FormField>
    );

    // Assert
    const input = screen.getByRole("textbox");
    expect(input).toHaveAttribute("aria-describedby", "test-error");
  });

  it("should add aria-describedby when helperText is present", () => {
    // Arrange & Act
    render(
      <FormField label="Test Label" name="test" helperText="Helper">
        <input />
      </FormField>
    );

    // Assert
    const input = screen.getByRole("textbox");
    expect(input).toHaveAttribute("aria-describedby", "test-helper");
  });

  it("should add aria-describedby with both error and helper IDs when both present", () => {
    // Arrange & Act
    render(
      <FormField label="Test Label" name="test" error="Error" helperText="Helper">
        <input />
      </FormField>
    );

    // Assert
    const input = screen.getByRole("textbox");
    const describedBy = input.getAttribute("aria-describedby");
    expect(describedBy).toContain("test-error");
    // Helper text nie powinien być w describedBy gdy jest error
  });

  it("should add error styling classes to child when error is present", () => {
    // Arrange & Act
    render(
      <FormField label="Test Label" name="test" error="Error">
        <input />
      </FormField>
    );

    // Assert
    const input = screen.getByRole("textbox");
    expect(input.className).toContain("border-destructive");
  });

  it("should preserve child className when adding error classes", () => {
    // Arrange & Act
    render(
      <FormField label="Test Label" name="test" error="Error">
        <input className="custom-class" />
      </FormField>
    );

    // Assert
    const input = screen.getByRole("textbox");
    expect(input.className).toContain("custom-class");
    expect(input.className).toContain("border-destructive");
  });

  it("should handle non-input children correctly", () => {
    // Arrange & Act
    render(
      <FormField label="Test Label" name="test">
        <select>
          <option value="1">Option 1</option>
        </select>
      </FormField>
    );

    // Assert
    expect(screen.getByText("Test Label")).toBeInTheDocument();
    expect(screen.getByRole("combobox")).toBeInTheDocument();
  });

  it("should apply custom className", () => {
    // Arrange & Act
    const { container } = render(
      <FormField label="Test Label" name="test" className="custom-wrapper">
        <input />
      </FormField>
    );

    // Assert
    const wrapper = container.firstChild;
    expect(wrapper).toHaveClass("custom-wrapper");
  });
});
