import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { HomePage } from "./HomePage";

vi.mock("@/api/client", () => ({
  api: {
    get: vi.fn().mockResolvedValue({
      count: 0,
      next: null,
      previous: null,
      results: [],
    }),
  },
}));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        {children}
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe("HomePage", () => {
  it("renders search page with filters", () => {
    render(
      <Wrapper>
        <HomePage />
      </Wrapper>
    );

    expect(screen.getByRole("heading", { name: /find a therapist/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/name or specialty/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/specialty/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/language/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/remote only/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/^city$/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /clear filters/i })).toBeInTheDocument();
  });

  it("has link to login", () => {
    render(
      <Wrapper>
        <HomePage />
      </Wrapper>
    );

    expect(screen.getByRole("link", { name: /login/i })).toHaveAttribute("href", "/login");
  });
});
