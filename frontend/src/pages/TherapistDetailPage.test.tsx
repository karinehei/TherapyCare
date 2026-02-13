import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { TherapistDetailPage } from "./TherapistDetailPage";

vi.mock("@/api/client", () => ({
  api: {
    get: vi.fn().mockResolvedValue({
      id: 1,
      user: 1,
      user_email: "jane@example.com",
      display_name: "Dr. Jane Smith",
      bio: "Licensed therapist.",
      specialties: ["Anxiety", "Depression"],
      languages: ["English"],
      city: "San Francisco",
      remote_available: true,
      price_min: 100,
      price_max: 150,
      created_at: "2024-01-01T00:00:00Z",
      availability_slots: [
        { id: 1, weekday: 0, start_time: "09:00:00", end_time: "17:00:00", timezone: "America/Los_Angeles" },
      ],
      location: null,
      clinic: null,
      updated_at: "2024-01-01T00:00:00Z",
    }),
  },
}));

// Mock auth
vi.mock("@/auth/AuthContext", () => ({
  useAuth: () => ({ user: null }),
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
      <MemoryRouter initialEntries={["/therapists/1"]}>
        <Routes>
          <Route path="/therapists/:id" element={children} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe("TherapistDetailPage", () => {
  it("renders therapist info when loaded", async () => {
    render(
      <Wrapper>
        <TherapistDetailPage />
      </Wrapper>
    );

    expect(await screen.findByText("Dr. Jane Smith")).toBeInTheDocument();
    expect(screen.getByText(/Licensed therapist/)).toBeInTheDocument();
    expect(screen.getByText(/Anxiety/)).toBeInTheDocument();
    expect(screen.getByText(/Depression/)).toBeInTheDocument();
    expect(screen.getByText(/English/)).toBeInTheDocument();
    expect(screen.getByText(/San Francisco/)).toBeInTheDocument();
    expect(screen.getByText(/Yes/)).toBeInTheDocument();
    expect(screen.getByText(/100/)).toBeInTheDocument();
  });

  it("shows Request appointment button", async () => {
    render(
      <Wrapper>
        <TherapistDetailPage />
      </Wrapper>
    );

    expect(await screen.findByRole("link", { name: /login to request appointment/i })).toBeInTheDocument();
  });

  it("shows availability section", async () => {
    render(
      <Wrapper>
        <TherapistDetailPage />
      </Wrapper>
    );

    expect(await screen.findByText("Availability")).toBeInTheDocument();
    expect(screen.getByText(/Mon/)).toBeInTheDocument();
    expect(screen.getByText(/09:00/)).toBeInTheDocument();
  });
});
