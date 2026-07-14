import React from "react";
import { render, screen } from "@testing-library/react";
import { FormField } from "./form-field";
import { Input } from "./input";
import { Textarea } from "./textarea";
import "@testing-library/jest-dom";

describe("FormField", () => {
  it("renders a label associated with the input", () => {
    render(
      <FormField label="Email">
        <Input type="email" placeholder="you@example.com" />
      </FormField>
    );

    const label = screen.getByText("Email");
    const input = screen.getByPlaceholderText("you@example.com");

    expect(label.tagName).toBe("LABEL");
    expect(label).toHaveAttribute("for", input.id);
  });

  it("injects aria-describedby and aria-invalid on error", () => {
    render(
      <FormField label="Email" error="Invalid email address">
        <Input type="email" />
      </FormField>
    );

    const input = screen.getByRole("textbox");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAttribute("aria-describedby");

    const errorMsg = screen.getByRole("alert");
    expect(errorMsg).toHaveTextContent("Invalid email address");
  });

  it("renders hint text when provided", () => {
    render(
      <FormField label="Username" hint="Must be at least 3 characters">
        <Input />
      </FormField>
    );

    expect(screen.getByText("Must be at least 3 characters")).toBeInTheDocument();
  });

  it("shows a visual required indicator", () => {
    render(
      <FormField label="Password" required>
        <Input type="password" />
      </FormField>
    );

    // Visual asterisk
    const asterisk = screen.getByText("*");
    expect(asterisk).toBeInTheDocument();
    expect(asterisk).toHaveAttribute("aria-hidden", "true");

    // Screen-reader only "(required)" text
    expect(screen.getByText("(required)")).toBeInTheDocument();
  });

  it("sets input as required when required prop is true", () => {
    render(
      <FormField label="Email" required>
        <Input />
      </FormField>
    );

    const input = screen.getByRole("textbox");
    expect(input).toBeRequired();
  });

  it("hides the label visually with sr-only when hideLabel is true", () => {
    render(
      <FormField label="Search" hideLabel>
        <Input />
      </FormField>
    );

    const label = screen.getByText("Search");
    expect(label.className).toContain("sr-only");
  });

  it("works with Textarea component", () => {
    render(
      <FormField label="Bio" hint="Tell us about yourself">
        <Textarea />
      </FormField>
    );

    const textarea = screen.getByRole("textbox");
    expect(textarea.tagName).toBe("TEXTAREA");
  });

  it("accepts a custom id", () => {
    render(
      <FormField label="Name" id="custom-id">
        <Input />
      </FormField>
    );

    const input = screen.getByRole("textbox");
    expect(input.id).toBe("custom-id");
  });
});
