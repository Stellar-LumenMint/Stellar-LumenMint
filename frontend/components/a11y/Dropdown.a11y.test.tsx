import React from "react";
import { render, fireEvent } from "@testing-library/react";
import { axe, toHaveNoViolations } from "jest-axe";
import { Dropdown, DropdownTrigger, DropdownMenu, DropdownItem, DropdownSeparator } from "../ui/dropdown";
import "@testing-library/jest-dom";

expect.extend(toHaveNoViolations);

function TestDropdown() {
  return (
    <Dropdown>
      <DropdownTrigger>Options</DropdownTrigger>
      <DropdownMenu>
        <DropdownItem>Profile</DropdownItem>
        <DropdownItem>Settings</DropdownItem>
        <DropdownSeparator />
        <DropdownItem>Logout</DropdownItem>
      </DropdownMenu>
    </Dropdown>
  );
}

describe("Dropdown accessibility (axe-core)", () => {
  it("has no violations when closed", async () => {
    const { container } = render(<TestDropdown />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("has no violations when open", async () => {
    const { container } = render(<TestDropdown />);
    fireEvent.click(container.querySelector("button")!);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
