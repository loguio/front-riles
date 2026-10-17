import React from "react";
import { render, screen } from "@testing-library/react-native";
import { Badge } from "./Badge";

describe("Badge", () => {
  it("renders its label with RNTL", () => {
    render(<Badge label="Zone 3" variant="status" />);
    expect(screen.getByText("Zone 3")).toBeTruthy();
  });
});
